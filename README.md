# Your Day Now | يومك الآن

Bilingual Arabic/English date and time information site. Responsive RTL/LTR interface with a lightweight interactive clock, server-rendered content and focused routes.

## Features
- Live clock and date in IANA time zones; local preference persistence.
- Gregorian and Umm al-Qura Hijri date conversion (1356–1500 AH), validated by round trips.
- Gregorian month names in common Arabic, Levantine/Iraqi and Maghreb variants, plus English. Hijri names are deliberately separate: Muharram is not January.
- Worldwide prayer search by full city/country or consented geolocation, date, method and Asr convention. Eight curated city routes offer direct search landing pages without mass-generated doorway pages.
- Upcoming Islamic calendar occasions with explicit local-observation limitations. Eid prayer is never fabricated from sunrise.
- Unique server-rendered metadata, canonical URLs, reciprocal hreflang, sitemap, robots, WebSite/WebPage/BreadcrumbList JSON-LD, valid 404s and root redirect.

## Run
Node 22.19 (pinned in `.nvmrc`). `npm ci`, `npm run dev`, `npm run build`.
On Windows, `npm run dev` and `npm start` need Git Bash or WSL: they set environment variables with POSIX syntax.
The project uses React, TypeScript, Vinext and Cloudflare Workers. All styling is hand-written CSS in `app/globals.css`; there is no CSS framework. `npm run build` produces `dist/server/index.js` and client assets. Preserve the Sites Vite build plugin and generated hosting metadata for Sites deployments.

## Environment
- `SITE_URL` — the canonical origin every canonical URL, hreflang alternate, sitemap entry and JSON-LD id is built from. Set in the Forge daemon environment and in `vite.config.ts` for the Cloudflare build.
- `PUBLIC_INDEXING` — search engines may index the site only when this is exactly `true`.
- `PORT`, `HOST` — where the standalone server listens.
- `PRAYERS_ALLOW_REMOTE=false` — turns off the geocoding fallback, so only the curated cities and explicit coordinates resolve.

`GET /api/health` reports the running commit, the build time, the resolved `SITE_URL` and whether it came from the environment or a fallback.

## Caching
Pages are cached by Cloudflare using the `s-maxage` the application computes: a copy stays valid until midnight in the zone the page is about, capped at an hour. Everything time-dependent — the clock, the world clocks — is rendered in the browser, so nothing in the HTML goes stale before then. RSC navigations and `/api/` are never cached.

## Self-hosted deployment (Laravel Forge)
`next.config.ts` sets `output: "standalone"`, which only adds `dist/standalone/` to the same build; `dist/server/index.js` and `dist/client` are unchanged, so Cloudflare Sites deployments keep working. The standalone bundle carries its own `node_modules` and is started on plain Node with `node dist/standalone/server.js`.

On Forge the release is built with `npm ci && npm run build`, the build-only `node_modules` is then removed, and a daemon runs `dist/standalone/server.js` on `127.0.0.1:3200` behind the site's nginx reverse proxy. `PORT`, `HOST`, `SITE_URL` and `PUBLIC_INDEXING` come from the daemon environment, since the standalone server reads them at runtime, not at build time.

## Public launch
The delivered preview is private by default and therefore intentionally not indexable. On the public production host configure `SITE_URL` with the final HTTPS domain and `PUBLIC_INDEXING=true`, then rebuild/deploy. Confirm the public host has no login gate, verify `/robots.txt`, `/sitemap.xml`, canonicals and hreflang use the final domain, and check representative routes with Google Search Console URL Inspection. Submit the sitemap after verifying domain ownership. No Search Console ownership is assumed or fabricated.

Do not enable indexing on both a preview and a public mirror. Keep a single canonical production origin. The GitHub repository itself is not a public website deployment.

## Data and limitations
Date conversion is local via ICU/Intl (`islamic-umalqura`). Dates can differ from local moon sighting. Clock accuracy follows the device clock; it is not NTP-synchronized. Prayer times are computed in this application with the `adhan` library, not fetched from a provider: the eight city routes need no network at all. Two settings are chosen to match published timetables — the twilight-angle rule at high latitudes, and the 120-minute Umm al-Qura Isha interval during Ramadan — and results still differ from AlAdhan by up to about four minutes, mostly on Asr, because the two use different solar models. A free-text city that is not one of the eight is geocoded once through Open-Meteo (coordinates only, memoised) and then computed here as well; verify the returned time zone. Polar times may be absent. No official mosque congregation/Eid timetable or country-specific public-holiday database is asserted.

## Checks
- `npm run typecheck`, `npm run lint`, `npm run test:unit` — no build, a few seconds. Run these before pushing.
- `npm test` — the above plus a production build and the integration suite, which drives the built worker.
- `tests/unit/` covers Hijri conversion, prayer computation against recorded reference times, query validation and the cache policy. `tests/integration/` covers routing, rendered metadata and the sitemap.
- CI runs all of it on every push and pull request (`.github/workflows/ci.yml`). The site is deployed only after CI is green (`.github/workflows/deploy.yml`), and the deployment is confirmed by polling `/api/health` for the commit it stamped.

Not covered: real-browser rendering, field Core Web Vitals, Rich Results validation and Google indexing. This repository claims none of them.

## Google guidance applied
- https://developers.google.com/search/docs/essentials
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/essentials/spam-policies
- https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data

Google does not guarantee crawling, indexing or rankings even when requirements are met. Structured data describes visible content; no invented FAQ rich-result eligibility, reviews, ratings or keyword-stuffed pages are included.
