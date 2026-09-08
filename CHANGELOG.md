# Changelog

The site deploys continuously from `main`: a push runs CI, and only a green
build triggers the Forge deploy hook, which then polls the site until it reports
the new commit. So the authoritative answer to "what is live right now?" is not
this file — it is `GET https://yourdaynow.online/api/health`, which returns the
running commit, the build time and the resolved `SITE_URL`.

This file records what changed and, where it is not obvious, why.

## 2026-09-08

### The Quran, and the mushaf

- **114 surahs, served from this repository.** The Uthmani script from the
  Tanzil project, reproduced unmodified and attributed on every page, with the
  Basmala printed above a surah as every mushaf does. `/{lang}/quran` lists them
  in mushaf order and filters as you type, folding diacritics, hamza forms and
  script so `الكهف`, `كهف`, `الكَهْف`, `kahf` and `18` all find the same surah.
  `data/quran` is in `.prettierignore`: reformatting scripture to satisfy a
  linter would be a modification of the text.
- **The mushaf itself, at `/{lang}/mushaf/{1-604}`.** `scripts/build-mushaf-pages.mjs`
  regroups the surah files by the page each verse is printed on in the Madani
  edition. The unit is a _block_, not a surah, because a page can end one surah
  and begin the next — page 604 carries three. A unit test walks all 604 pages
  and asserts they say exactly what the surah files say: 6236 verses, each once,
  in order.
- **A surah is read a page at a time.** `/{lang}/quran/{1-114}` shows one printed
  page, with its Madani page number at the foot, the surah name and juz as a
  running head, and buttons that turn. Every page of the surah stays in the HTML
  and only the one being read is shown, because the page's own title claims the
  whole surah and that has to be true.
- **Set in Amiri Quran** (SIL OFL), self-hosted as a 45 KB subset because the
  Content-Security-Policy allows fonts from this origin only.

### The visitor, instead of a default

- **The clock and date follow the visitor's own device zone** unless they have
  chosen one, which is remembered in their browser and wins. The HTML cannot
  carry anyone's zone — it is one cached copy shared by everyone — so the
  correction happens in the browser after hydration, the way the clock already
  filled itself in.
- **The prayer page opens on the visitor's own place.** It asks `/api/location`
  once and recomputes for what it learns: coordinates where Cloudflare's visitor
  location headers are enabled, otherwise the curated city for the country. The
  result says it is an estimate from the connection and the form stays editable,
  because that is what it is.
- **`GOOGLE_MAPS_API_KEY`** names the place behind a granted position and covers
  cities the free geocoder misses. Server-side only; the browser never receives
  it and the repository never contains it.

### Fixed

- **The mushaf font was 404ing in production.** The router treated a request as
  a file when its _first_ path segment contained a dot, so `/favicon.svg` passed
  but `/fonts/amiri-quran-arabic.woff2` was rewritten to `/ar/fonts/…` and
  answered with the app's 404 page. The test is now the last segment, which is
  the general form of the rule.
- **Deployments took up to a day to appear.** The Quran, mushaf and about pages
  were cached for 86400s, contradicting the promise in `worker/edge-cache.ts`
  that a deploy lands within an hour. They are capped like every other page now,
  with a long `stale-while-revalidate` so no visitor waits for the origin, and
  the worker's cache key carries the build id so a deployment orphans stored
  copies instead of waiting them out.

## 2026-09-07

The site worked but could not be developed: the whole interface was one 30 KB
file whose longest line was 6934 characters, every response was `no-store`, and
prayer times were fetched from a third party inside the render path.

### Speed and independence

- **Language comes from the `[lang]` route segment**, not from a request header.
  A single `headers()` call in the root layout was marking the whole tree
  dynamic, which is what forced `no-store` on every page — not `force-dynamic`.
- **No timestamp in the HTML.** The server passes a civil date; the clock renders
  `--:--:--` and fills in from `lib/clock-store.ts` after hydration. This is what
  makes a page cacheable: it is a function of the day, not of the moment.
- **A shared-cache lifetime that ends at local midnight**, applied in
  `worker/index.ts` so it holds on both deployments, and capped at an hour so a
  deploy lands. RSC navigations are excluded, because Cloudflare honours `Vary`
  only for `Accept-Encoding` and a cached HTML body would be served in place of
  an RSC payload.
- **Prayer times are computed here** with `adhan`, not fetched. The eight city
  routes need no network at all. The twilight-angle high-latitude rule and the
  120-minute Umm al-Qura Ramadan Isha interval are deliberate, and documented on
  the about page. Verified against api.aladhan.com over 128 combinations: worst
  divergence 4 minutes, mostly on Asr.
- **Deployment is gated on CI** and the deploy workflow polls `/api/health` until
  the site reports the deployed commit. Forge quick deploy is off.

### Weight

- **Tailwind and the 62 unused shadcn components are gone.** Outside
  `components/ui/**` the project used no Tailwind class at all, so deleting the
  components left the framework with zero consumers: CSS went from 131 KB to
  about 12 KB with no extra build step.
- The Radix dropdown became a native `<select>` and the table component became a
  plain table, both already styled by `app/globals.css`.
- 17 unused production dependencies removed, `npm audit` re-enabled, Dependabot
  added.

### Maintainability

- The single-file interface became a shell, a page per route and a dispatcher.
- `lib/routes.ts` holds one row per page — nav label, headings, metadata,
  description, intro — so adding a page is a row and a file, and the navigation,
  breadcrumb, sitemap and route validation follow automatically.
- Prettier, a sub-minute `npm run check`, and a single formatting commit recorded
  in `.git-blame-ignore-revs`.
- Structured logging, `instrumentation.ts`, `/api/health`, rate limits on both
  API routes, and the security headers in `next.config.ts` so they apply to both
  deployments.

### Content

- Every city page carries the whole month's timetable, a comparison of the eight
  calculation methods, a Hijri month calendar, and five years of occasion dates.
- An icon set, a manifest, real social cards, and JSON-LD that describes only
  what a page actually shows.
