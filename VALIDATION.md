# Verification record

Commit: `3e08a831c8238b79ff8f8bcfcb4dd50c9ccfbd85` · Date: 2026-09-07 · Node: 22.19.0 · Verified by: local run plus GitHub Actions

## Automated checks

- `npm run typecheck` — passes.
- `npm run lint` — passes, 0 errors and 0 warnings.
- `npm run test:unit` — passes, 13 assertions across Hijri conversion, prayer computation, query validation and the cache policy.
- `npm run build` — passes.
- `npm run test:integration` — passes, 4 assertions across routing, rendered metadata, the sitemap and API validation.
- CI runs all of the above on every push and pull request; deployment is gated on it.

## Verified by hand

- Prayer times computed here were compared against api.aladhan.com over 128 combinations (8 cities x 8 methods x 2 dates). Worst divergence: 4 minutes, mostly on Asr; most within 1 minute. The high-latitude case that had been 32 minutes off is resolved by the twilight-angle rule.
- Every route was opened in Chrome in both languages: the clock ticks after hydration, the timezone picker expands to the full IANA list and switching zones moves the whole page, the month tables render, and the prayer search returns times for a city that is not one of the curated eight.
- Cloudflare serves pages from its edge cache (`cf-cache-status: HIT`), while `/api/` and RSC navigations bypass it.
- `/api/health` reports the deployed commit; the deploy workflow polls it before reporting success.

## Not verified

- Real-browser rendering across browsers and devices, and field Core Web Vitals. Lab measurements only.
- Google indexing, ranking and Rich Results. No Search Console property is claimed.
- The prayer computation is a calculation, not a mosque timetable. Local observation and congregation times may differ, as the site itself states.

## Known trade-offs

- The Content-Security-Policy is a static policy rather than a per-request nonce. A nonce cannot be cached, and cached HTML is worth more here than the marginal hardening.
