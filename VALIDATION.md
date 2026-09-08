# Verification record

Commit: `4de9c7ec5f3857242576027563a645a1763903a2` · Date: 2026-09-08 ·
Node 22.19.0 · Verified by a local run, GitHub Actions, and checks against the
live site.

`GET /api/health` reports the commit actually running, which is the only
trustworthy answer to what is deployed. This file records what was checked at
the commit above.

## Automated checks

Run by `npm run check` locally and by CI on every push and pull request;
deployment is gated on all of it.

- `npm run format:check` — passes.
- `npm run lint` — passes, 0 errors and 0 warnings.
- `npm run typecheck` — passes.
- `npm run test:unit` — 35 tests pass, across Hijri conversion, prayer
  computation, query validation, the cache policy, rate limiting, visitor
  location, the zone resolver and the Quran data.
- `npm run build` — passes; the Cloudflare Worker and the standalone Node
  server are produced from the same entry point.
- `npm run test:integration` — 18 tests pass against the built worker, covering
  canonical URLs and hreflang, the JSON-LD graph, robots and the sitemap,
  server-rendered prayer times with the network disabled, mushaf and surah
  rendering, static-file routing, the health endpoint, both API routes and the
  404 shapes.

Two of those tests exist because the thing they check was broken in production
and not locally: `/fonts/amiri-quran-arabic.woff2` reaching the asset store
rather than the language rewrite, and two requests carrying different Cloudflare
location headers returning byte-identical HTML.

## Verified by hand

- **Prayer times** computed here were compared against api.aladhan.com over 128
  combinations (8 cities × 8 methods × 2 dates). Worst divergence 4 minutes,
  mostly on Asr; most within 1 minute. The high-latitude case that had been 32
  minutes off is resolved by the twilight-angle rule.
- **The Quran text** was checked against the page data independently of the
  code: 6236 verses across 604 pages, each verse appearing once and in mushaf
  order, page 1 holding Al-Fatiha whole, page 2 opening Al-Baqarah with its
  Basmala, page 604 carrying the last three surahs each with its own heading.
  The shipped Basmala constant is asserted equal to Al-Fatiha's first verse,
  character for character, so a dropped shadda cannot ship.
- **Every route opened in Chrome in both languages.** The clock ticks after
  hydration, the zone picker expands to the full IANA list, month tables render,
  the prayer search returns times for a city outside the curated eight, mushaf
  pages 1, 2, 50, 300 and 604 render with the page number and working
  navigation, and a surah turns page by page.
- **On the live site:** `document.fonts.check('30px "Amiri Quran"')` returns true
  and `.verses` computes to the Amiri Quran family, so the mushaf is set in the
  intended face rather than falling back.
- **Visitor location** was exercised against a local build with Cloudflare
  headers simulated: a visitor from Egypt opens on Cairo's times, a visitor with
  Tokyo coordinates opens on Tokyo's in `Asia/Tokyo`, and with no headers at all
  nothing changes.
- **Cloudflare serves pages from its edge cache** (`cf-cache-status: HIT`) while
  `/api/` and RSC navigations bypass it.

## Not verified

- Real-browser rendering across browsers and devices, and field Core Web Vitals.
  Lab measurements only.
- Google indexing, ranking and Rich Results. No Search Console property is
  claimed.
- The prayer computation is a calculation, not a mosque timetable. Local
  observation and congregation times may differ, as the site itself states.
- City-level visitor detection in production. The zone's "Add visitor location
  headers" managed transform is not enabled, so only `cf-ipcountry` arrives and
  only the country branch runs. The coordinate branch is covered by tests and by
  a simulated local run, not by live traffic.

## Known trade-offs

- The Content-Security-Policy is a static policy rather than a per-request
  nonce. A nonce cannot be cached, and cached HTML is worth more here than the
  marginal hardening.
- A surah page keeps every one of its pages in the HTML and hides all but the
  one being read. Paginating by URL instead would have meant roughly 717
  near-duplicate addresses competing with the mushaf pages.
- Cached copies stored before 2026-09-08 07:16 carry the old 86400-second
  lifetime and will serve until they expire. Purging by API needs a Cache Purge
  permission this account's tokens do not have; the build id in the worker's
  cache key is what prevents this recurring.
