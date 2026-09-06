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
Node >=22.13. `npm ci`, `npm run dev`, `npm run build`.
The project uses React, TypeScript, Vinext and Cloudflare Workers. `npm run build` produces `dist/server/index.js` and client assets. Preserve the Sites Vite build plugin and generated hosting metadata for Sites deployments.

## Self-hosted deployment (Laravel Forge)
`next.config.ts` sets `output: "standalone"`, which only adds `dist/standalone/` to the same build; `dist/server/index.js` and `dist/client` are unchanged, so Cloudflare Sites deployments keep working. The standalone bundle carries its own `node_modules` and is started on plain Node with `node dist/standalone/server.js`.

On Forge the release is built with `npm ci && npm run build`, the build-only `node_modules` is then removed, and a daemon runs `dist/standalone/server.js` on `127.0.0.1:3200` behind the site's nginx reverse proxy. `PORT`, `HOST`, `SITE_URL` and `PUBLIC_INDEXING` come from the daemon environment, since the standalone server reads them at runtime, not at build time.

## Public launch
The delivered preview is private by default and therefore intentionally not indexable. On the public production host configure `SITE_URL` with the final HTTPS domain and `PUBLIC_INDEXING=true`, then rebuild/deploy. Confirm the public host has no login gate, verify `/robots.txt`, `/sitemap.xml`, canonicals and hreflang use the final domain, and check representative routes with Google Search Console URL Inspection. Submit the sitemap after verifying domain ownership. No Search Console ownership is assumed or fabricated.

Do not enable indexing on both a preview and a public mirror. Keep a single canonical production origin. The GitHub repository itself is not a public website deployment.

## Data and limitations
Date conversion is local via ICU/Intl (`islamic-umalqura`). Dates can differ from local moon sighting. Clock accuracy follows the device clock; it is not NTP-synchronized. Prayer data comes from https://aladhan.com/prayer-times-api via a validated same-origin endpoint with bounded timeouts and explicit failure states. Location search depends on provider geocoding; verify returned time zone. Polar times may be absent. No official mosque congregation/Eid timetable or country-specific public-holiday database is asserted.

## Checks
`node --experimental-strip-types --test tests/calendar.test.mjs` tests conversion, month boundaries and time-zone day rollover. `npx tsc --noEmit` checks types. Build and deployment results are documented in the handoff. This repository does not claim measured field Core Web Vitals, official Rich Results validation or guaranteed Google ranking.

## Google guidance applied
- https://developers.google.com/search/docs/essentials
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/essentials/spam-policies
- https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data

Google does not guarantee crawling, indexing or rankings even when requirements are met. Structured data describes visible content; no invented FAQ rich-result eligibility, reviews, ratings or keyword-stuffed pages are included.
