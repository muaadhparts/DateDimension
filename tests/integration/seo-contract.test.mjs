import assert from 'node:assert/strict';
import test from 'node:test';

// The module reads these once, at import time, so they have to be set first.
process.env.SITE_URL = 'https://yourdaynow.online';
process.env.PUBLIC_INDEXING = 'true';

const {default: worker} = await import('../../dist/server/index.js');

const ORIGIN = 'https://yourdaynow.online';
const request = (path, headers = {accept: 'text/html'}) =>
  worker.fetch(
    new Request(ORIGIN + path, {headers}),
    {ASSETS: {fetch: async () => new Response('', {status: 404})}},
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
const html = async (path) => (await request(path)).text();

test('Canonical, hreflang and x-default carry the real origin and point at each other', async () => {
  for (const [path, other] of [
    ['/ar', '/en'],
    ['/en', '/ar'],
    ['/ar/converter', '/en/converter'],
    ['/en/prayer-times/london', '/ar/prayer-times/london'],
  ]) {
    const body = await html(path);
    assert.match(body, new RegExp(`rel="canonical" href="${ORIGIN}${path}"`), `${path} canonical`);
    assert.match(
      body,
      new RegExp(`hrefLang="${path.startsWith('/ar') ? 'ar' : 'en'}" href="${ORIGIN}${path}"`),
    );
    assert.match(body, new RegExp(`href="${ORIGIN}${other}"`), `${path} points at ${other}`);
    // x-default sends unknown languages to Arabic, the site's default.
    assert.match(body, new RegExp(`hrefLang="x-default" href="${ORIGIN}/ar`));
    assert.ok(!body.includes('chatgpt.site'), `${path} must not leak the preview host`);
  }
});

test('Indexable pages say so, and the JSON-LD graph is valid and escaped', async () => {
  const body = await html('/ar');
  assert.match(body, /name="robots" content="index, follow"/);

  const block = body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  assert.ok(block, 'the page carries a JSON-LD block');
  assert.ok(!block[1].includes('<'), 'no raw < inside the JSON-LD');
  const graph = JSON.parse(block[1])['@graph'];
  assert.deepEqual(
    graph.map((node) => node['@type']),
    ['WebSite', 'WebPage'],
    'the home page has no breadcrumb',
  );
  assert.equal(graph[0]['@id'], `${ORIGIN}/#website`);

  const inner = JSON.parse(
    (await html('/en/prayer-times/makkah')).match(
      /<script type="application\/ld\+json">(.*?)<\/script>/s,
    )[1],
  );
  assert.deepEqual(
    inner['@graph'].map((node) => node['@type']),
    ['WebSite', 'WebPage', 'BreadcrumbList'],
    'inner pages carry a breadcrumb',
  );
});

test('robots.txt allows crawling and keeps the API out of it', async () => {
  const body = await (await request('/robots.txt', {})).text();
  assert.match(body, /Allow: \//);
  assert.match(body, /Disallow: \/api\//);
  assert.ok(
    !/Disallow: \/$/m.test(body),
    'the whole site must not be disallowed when indexing is on',
  );
  assert.match(body, new RegExp(`Sitemap: ${ORIGIN}/sitemap.xml`));
});

test('The sitemap lists exactly the routes that exist, on the real origin', async () => {
  const body = await (await request('/sitemap.xml', {})).text();
  const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  assert.equal(urls.length, 28);
  assert.equal(new Set(urls).size, 28, 'no duplicates');
  assert.ok(
    urls.every((url) => url.startsWith(`${ORIGIN}/`)),
    'every URL uses the real origin',
  );
  assert.ok(!urls.some((url) => url.endsWith('/')), 'no trailing slashes');

  for (const lang of ['ar', 'en']) {
    assert.equal(
      urls.filter((url) => url.startsWith(`${ORIGIN}/${lang}`)).length,
      14,
      `${lang} has 14 URLs`,
    );
    for (const path of ['', '/converter', '/prayer-times', '/occasions', '/months', '/about']) {
      assert.ok(urls.includes(`${ORIGIN}/${lang}${path}`), `${lang}${path} is listed`);
    }
    for (const city of [
      'riyadh',
      'makkah',
      'cairo',
      'dubai',
      'sanaa',
      'london',
      'new-york',
      'jakarta',
    ]) {
      assert.ok(
        urls.includes(`${ORIGIN}/${lang}/prayer-times/${city}`),
        `${lang} ${city} is listed`,
      );
    }
  }
});

test('A city page renders its prayer times server-side, with no provider call', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('rendering a city page must not call out');
  };
  try {
    const body = await html('/en/prayer-times/riyadh');
    assert.match(body, /Prayer times in Riyadh today/);
    assert.match(body, /Asia\/Riyadh/);
    const times = [...body.matchAll(/<b>(\d{2}:\d{2})<\/b>/g)].map((match) => match[1]);
    assert.equal(times.length, 6, 'six prayers are rendered before JavaScript');
    const minutes = times.map((value) => {
      const [h, m] = value.split(':').map(Number);
      return h * 60 + m;
    });
    for (let i = 1; i < minutes.length; i++) {
      assert.ok(minutes[i] > minutes[i - 1], 'prayer times are in order');
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('The health endpoint reports what is running', async () => {
  const response = await request('/api/health', {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex');
  const body = await response.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.configOk, true);
  assert.equal(body.siteUrl, ORIGIN);
  assert.equal(body.indexable, true);
  assert.match(body.commit, /^[0-9a-f]{40}$|^unknown$/);
});

test('The prayer API distinguishes a bad request from an unavailable provider', async () => {
  const invalid = await request(
    '/api/prayers?date=2026-02-31&city=Riyadh&country=Saudi%20Arabia',
    {},
  );
  assert.equal(invalid.status, 400);
  assert.equal(invalid.headers.get('cache-control'), 'no-store');
  assert.equal(invalid.headers.get('x-robots-tag'), 'noindex');
  assert.equal((await invalid.json()).error, 'Invalid search parameters');

  const ok = await request('/api/prayers?date=2026-09-07&city=Riyadh&country=Saudi%20Arabia', {});
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('cache-control'), /s-maxage=/, 'a shared cache may keep the answer');
  const body = await ok.json();
  assert.equal(body.data.meta.source, 'local');
  assert.equal(body.data.meta.timezone, 'Asia/Riyadh');

  // An unknown city needs the geocoder; with the network refused it must be a
  // 503, not a 400, so the client can tell "try again" from "fix your input".
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('network refused');
  };
  try {
    const unavailable = await request(
      '/api/prayers?date=2026-09-07&city=Zzz%20Nowhere&country=Atlantis',
      {},
    );
    assert.equal(unavailable.status, 503);
    assert.equal((await unavailable.json()).error, 'Prayer data unavailable');
  } finally {
    globalThis.fetch = realFetch;
  }
});
