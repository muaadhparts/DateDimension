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
    ['WebSite', 'WebPage', 'FAQPage'],
    'the home page carries its FAQ and no breadcrumb',
  );
  assert.equal(graph[0]['@id'], `${ORIGIN}/#website`);

  const inner = JSON.parse(
    (await html('/en/prayer-times/makkah')).match(
      /<script type="application\/ld\+json">(.*?)<\/script>/s,
    )[1],
  );
  assert.deepEqual(
    inner['@graph'].map((node) => node['@type']),
    ['WebSite', 'WebPage', 'Place', 'BreadcrumbList'],
    'a city page carries its place and a breadcrumb',
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

test('Static files reach the asset store instead of being rewritten into a 404', async () => {
  // The unknown-segment rewrite once turned every one of these into the app's
  // 404 page, because only a hardcoded list of filenames was allowed through.
  // The asset binding answers here, so anything still rendering HTML is a
  // request that never got out of the router.
  const assets = {fetch: async () => new Response('asset', {status: 200})};
  const fetchWithAssets = (path) =>
    worker.fetch(new Request(ORIGIN + path), assets, {waitUntil() {}, passThroughOnException() {}});

  for (const path of [
    '/favicon.svg',
    '/favicon.ico',
    '/apple-icon.png',
    '/icon-192.png',
    '/icon-512.png',
    '/og-ar.png',
    '/og-en.png',
  ]) {
    const response = await fetchWithAssets(path);
    assert.equal(response.status, 200, `${path} is served`);
    assert.ok(!(await response.text()).includes('<html'), `${path} must not render the app's 404`);
  }

  const manifest = await request('/manifest.webmanifest', {});
  assert.equal(manifest.status, 200);
  const body = await manifest.json();
  assert.equal(body.start_url, '/ar');
  assert.equal(body.display, 'standalone');
  assert.ok(
    body.icons.some((icon) => icon.purpose === 'maskable'),
    'a maskable icon is declared',
  );
});

test('Social cards point at a real image, in the right locale', async () => {
  for (const [path, lang, locale] of [
    ['/ar', 'ar', 'ar_SA'],
    ['/en', 'en', 'en_GB'],
  ]) {
    const body = await html(path);
    assert.match(body, new RegExp(`property="og:image" content="${ORIGIN}/og-${lang}.png"`));
    assert.match(body, new RegExp(`property="og:locale" content="${locale}"`));
    assert.match(body, /name="twitter:card" content="summary_large_image"/);
    // ar_AR is Argentina, which is what this used to say.
    assert.ok(!body.includes('ar_AR'), 'the Arabic locale must not be ar_AR');
  }
});

test('Structured data only claims what the page shows', async () => {
  const graphOf = (body) =>
    JSON.parse(body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];

  const home = graphOf(await html('/ar'));
  const faq = home.find((node) => node['@type'] === 'FAQPage');
  assert.ok(faq, 'the home page marks up its FAQ');
  assert.equal(faq.mainEntity.length, 3);
  const page = home.find((node) => node['@type'] === 'WebPage');
  assert.match(page.dateModified, /^\d{4}-\d{2}-\d{2}$/, 'the content is recomputed daily');
  assert.equal(page.primaryImageOfPage.url, `${ORIGIN}/og-ar.png`);
  assert.ok(!home.some((node) => node['@type'] === 'Place'), 'no place on a page without one');

  // Each question and answer must appear in the visible markup too.
  const body = await html('/ar');
  for (const question of faq.mainEntity) {
    assert.ok(body.includes(question.name), `the page shows: ${question.name}`);
    assert.ok(body.includes(question.acceptedAnswer.text), 'the page shows the answer');
  }

  const city = graphOf(await html('/en/prayer-times/makkah'));
  const place = city.find((node) => node['@type'] === 'Place');
  assert.ok(place, 'a city page marks up its place');
  assert.equal(place.geo.latitude, 21.3891);
  assert.equal(place.geo.longitude, 39.8579);
  // The coordinates are marked up only because they are on the page.
  const cityBody = await html('/en/prayer-times/makkah');
  assert.ok(cityBody.includes('21.3891'), 'the latitude is visible');
  assert.ok(cityBody.includes('39.8579'), 'the longitude is visible');

  const search = graphOf(await html('/en/prayer-times'));
  assert.ok(!search.some((node) => node['@type'] === 'Place'), 'no place before a city is chosen');
});
