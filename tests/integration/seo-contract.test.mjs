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

test('Mushaf image routes preserve SVG, cache successes and expose retryable failures', async () => {
  assert.equal((await request('/api/mushaf/000.svg')).status, 404);
  assert.equal((await request('/api/mushaf/605.svg')).status, 404);
  const realFetch = globalThis.fetch;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 345 550"></svg>';
  try {
    globalThis.fetch = async () => new Response(svg);
    const image = await request('/api/mushaf/604.svg');
    assert.equal(image.status, 200);
    assert.equal(await image.text(), svg);
    assert.match(image.headers.get('content-type'), /image\/svg\+xml/);
    assert.match(image.headers.get('cache-control'), /public/);
    assert.equal(image.headers.get('x-robots-tag'), 'noindex');
    globalThis.fetch = async () => new Response('', {status: 503});
    const failed = await request('/api/mushaf/603.svg');
    assert.equal(failed.status, 503);
    assert.equal(failed.headers.get('cache-control'), 'no-store');
  } finally {
    globalThis.fetch = realFetch;
  }
});

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

  // 7 section pages + 8 cities + 114 surahs + 604 mushaf pages, per language.
  // Bare /mushaf is left out: it only opens page 1, which is listed already.
  assert.equal(urls.length, 1466);
  assert.equal(new Set(urls).size, 1466, 'no duplicates');
  assert.ok(
    urls.every((url) => url.startsWith(`${ORIGIN}/`)),
    'every URL uses the real origin',
  );
  assert.ok(!urls.some((url) => url.endsWith('/')), 'no trailing slashes');

  for (const lang of ['ar', 'en']) {
    assert.equal(
      urls.filter((url) => url.startsWith(`${ORIGIN}/${lang}`)).length,
      733,
      `${lang} has 733 URLs`,
    );
    for (const path of [
      '',
      '/converter',
      '/prayer-times',
      '/quran',
      '/quran/114',
      '/mushaf/1',
      '/mushaf/604',
      '/occasions',
      '/months',
      '/about',
    ]) {
      assert.ok(urls.includes(`${ORIGIN}/${lang}${path}`), `${lang}${path} is listed`);
    }
    assert.ok(!urls.includes(`${ORIGIN}/${lang}/mushaf`), 'bare /mushaf is not listed');
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

test('A mushaf page carries its own verses, and only those', async () => {
  const {loadMushafPage} = await import('../../lib/quran/index.ts');
  const first = await loadMushafPage(1);
  const second = await loadMushafPage(2);
  const body = await html('/ar/mushaf/1');

  for (const verse of first.blocks[0].verses) {
    assert.ok(body.includes(verse.text), `verse ${verse.number} of page 1 is printed`);
  }
  assert.ok(!body.includes(second.blocks[0].verses[0].text), 'and the opening of page 2 is not');
  assert.match(body, /rel="next"/, 'it links to the page after it');
  assert.ok(!body.includes('rel="prev"'), 'page 1 has nothing before it');
  assert.match(body, new RegExp(`<link rel="canonical" href="${ORIGIN}/ar/mushaf/1"`));

  const bare = await request('/ar/mushaf');
  assert.equal(bare.status, 200, 'the mushaf opens on page 1');
  assert.match(
    await bare.text(),
    new RegExp(`<link rel="canonical" href="${ORIGIN}/ar/mushaf/1"`),
    'and points at the numbered address',
  );

  const missing = await request('/ar/mushaf/605', {});
  assert.equal(missing.status, 404, 'there is no page 605');
});

test('The HTML is the same for every visitor, whatever the edge says about them', async () => {
  // One cached copy is served to everyone, so nothing about the caller may
  // reach it. The visitor's own zone and city are applied in the browser.
  const saudi = await request('/ar', {accept: 'text/html', 'cf-ipcountry': 'SA'});
  const japanese = await request('/ar', {
    accept: 'text/html',
    'cf-ipcountry': 'JP',
    'cf-ipcity': 'Tokyo',
    'cf-iptimezone': 'Asia/Tokyo',
    'cf-iplatitude': '35.68',
    'cf-iplongitude': '139.69',
  });
  const first = await saudi.text();
  const second = await japanese.text();
  assert.equal(first, second, 'the page carries nothing about who asked for it');
  assert.ok(!second.includes('Asia/Tokyo'), 'no visitor zone is baked in');
  assert.ok(!second.includes('Tokyo'), 'no visitor city is baked in');

  // The endpoint that does read those headers must never be cached.
  const located = await request('/api/location', {'cf-ipcountry': 'JP'});
  assert.equal(located.headers.get('cache-control'), 'no-store');
  assert.equal((await located.json()).data.countryCode, 'JP');
});

test('A surah page holds all its verses and shows one printed page at a time', async () => {
  // The reading is paginated, but the surah is a whole thing and the page has
  // to say so: every verse stays in the HTML, only one sheet is shown.
  const {loadSurah} = await import('../../lib/quran/index.ts');
  const surah = await loadSurah(2);
  const body = await html('/ar/quran/2');
  for (const verse of [surah.verses[0], surah.verses[5], surah.verses[285]]) {
    assert.ok(body.includes(verse.text), `verse ${verse.number} is in the page`);
  }

  const sheets = body.match(/class="panel mushaf mushaf-sheet"/g) || [];
  const hidden = body.match(/class="panel mushaf mushaf-sheet" hidden=""/g) || [];
  assert.equal(sheets.length, 48, 'one sheet per mushaf page Al-Baqarah is printed on');
  assert.equal(hidden.length, 47, 'all but the one being read are hidden');

  // A surah printed on a single page has nothing to turn.
  const naas = await html('/ar/quran/114');
  assert.equal((naas.match(/class="panel mushaf mushaf-sheet"/g) || []).length, 1);
  assert.ok(!naas.includes('hidden=""'));
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
    // Nested, which is the case the first-segment test missed: the mushaf
    // font shipped 404ing because /fonts/… was rewritten to /ar/fonts/….
    '/fonts/amiri-quran-arabic.woff2',
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

test('The location endpoint answers per caller and is never cached', async () => {
  const plain = await request('/api/location', {});
  assert.equal(plain.status, 200);
  assert.equal(plain.headers.get('cache-control'), 'no-store');
  assert.equal(plain.headers.get('x-robots-tag'), 'noindex');
  assert.equal((await plain.json()).data.source, 'none', 'no edge headers in the test harness');

  const edge = await worker.fetch(
    new Request(ORIGIN + '/api/location', {
      headers: {'cf-ipcity': 'Dubai', 'cf-ipcountry': 'AE', 'cf-iptimezone': 'Asia/Dubai'},
    }),
    {ASSETS: {fetch: async () => new Response('', {status: 404})}},
    {waitUntil() {}, passThroughOnException() {}},
  );
  const detected = (await edge.json()).data;
  assert.equal(detected.city, 'Dubai');
  assert.equal(detected.source, 'edge');

  const invalid = await request('/api/location?lat=91&lon=0', {});
  assert.equal(invalid.status, 400);
});
