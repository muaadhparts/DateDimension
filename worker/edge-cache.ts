import {cities} from '../lib/calendar.ts';
import {secondsUntilFirstMidnight, secondsUntilMidnight} from '../lib/time.ts';

/** Zones shown on the home page's world clocks; its copy expires at the first of them. */
const WORLD_ZONES = ['Asia/Riyadh', 'Europe/London', 'America/New_York', 'Asia/Jakarta'];
const DEFAULT_ZONE = 'Asia/Riyadh';
const MAX_AGE = 3600;

export type CachePolicy = {sMaxAge: number; staleWhileRevalidate: number};

/**
 * How long a shared cache may keep a response.
 *
 * Everything the HTML contains is a function of the calendar day — the clock is
 * filled in by the browser — so a copy is valid until midnight in the zone the
 * page is about, capped so a deploy is never more than an hour from taking
 * effect. Pages with no date at all get a flat day.
 */
export function policyFor(pathname: string, now: Date = new Date()): CachePolicy | null {
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml') {
    return {sMaxAge: 3600, staleWhileRevalidate: 86_400};
  }

  const [, lang, page, city] = pathname.split('/');
  if (lang !== 'ar' && lang !== 'en') return null;
  // Pages with no date in them: the text does not change, so the only reason
  // to expire a copy is a deployment — which is why these are capped like the
  // rest rather than held for a day. A long stale-while-revalidate means a
  // visitor still never waits for the origin.
  if (page === 'about' || page === 'quran' || page === 'mushaf')
    return {sMaxAge: MAX_AGE, staleWhileRevalidate: 86_400};

  let seconds: number;
  if (page === 'prayer-times') {
    const zone = cities.find((c) => c.slug === city)?.zone ?? DEFAULT_ZONE;
    seconds = secondsUntilMidnight(zone, now);
  } else if (!page) {
    seconds = secondsUntilFirstMidnight(WORLD_ZONES, now);
  } else {
    seconds = secondsUntilMidnight(DEFAULT_ZONE, now);
  }

  return {sMaxAge: Math.max(60, Math.min(MAX_AGE, seconds)), staleWhileRevalidate: 300};
}

/** RSC navigations return a different body for the same URL, so they are never cached. */
export function isRscRequest(request: Request): boolean {
  return request.headers.get('RSC') === '1' || request.headers.get('Next-Router-Prefetch') === '1';
}

/**
 * Replaces whatever the framework produced with our own policy. It has to be an
 * override: vinext answers `no-store` on a cache miss, which would leave every
 * cold page uncacheable at the edge.
 */
export function applyEdgeCache(
  pathname: string,
  response: Response,
  now: Date = new Date(),
): Response {
  if (response.status !== 200) return response;
  if (
    !response.headers.get('content-type')?.startsWith('text/html') &&
    !pathname.endsWith('.xml') &&
    pathname !== '/robots.txt'
  ) {
    return response;
  }
  const policy = policyFor(pathname, now);
  if (!policy) return response;

  const headers = new Headers(response.headers);
  headers.set(
    'Cache-Control',
    `public, max-age=0, s-maxage=${policy.sMaxAge}, stale-while-revalidate=${policy.staleWhileRevalidate}`,
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
