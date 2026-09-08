/**
 * Where the visitor is, without asking them.
 *
 * Two sources, in order of precision:
 *
 * 1. Cloudflare's visitor location headers, which cost nothing and need no
 *    permission prompt. They are city-level and derived from the connection,
 *    so they can be wrong behind a VPN — good enough to pre-fill a form, not
 *    good enough to present as fact.
 * 2. The browser's own geolocation, which the visitor has to allow, and which
 *    is then turned into a place name by the geocoder.
 */
/**
 * The curated city to open on for a visitor from each country. Only where the
 * site already has a city for that country — this is a better default than
 * Riyadh for everyone, not a claim about where the visitor actually is.
 */
const CITY_BY_COUNTRY: Record<string, string> = {
  SA: 'riyadh',
  YE: 'sanaa',
  EG: 'cairo',
  AE: 'dubai',
  GB: 'london',
  US: 'new-york',
  ID: 'jakarta',
};

export type DetectedLocation = {
  city: string | null;
  country: string | null;
  countryCode: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string | null;
  /** A curated city slug matching the visitor's country, when there is one. */
  citySlug: string | null;
  source: 'edge' | 'country' | 'none';
};

const number = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Cloudflare sets these when the zone's visitor location headers are enabled. */
export function locationFromRequest(request: Request): DetectedLocation {
  const header = (name: string) => request.headers.get(name)?.trim() || null;
  const city = header('cf-ipcity');
  const lat = number(header('cf-iplatitude'));
  const lon = number(header('cf-iplongitude'));

  const countryCode = header('cf-ipcountry');
  const citySlug = countryCode ? (CITY_BY_COUNTRY[countryCode.toUpperCase()] ?? null) : null;
  const precise = Boolean(city) || (lat !== null && lon !== null);

  return {
    city,
    country: null,
    countryCode,
    lat,
    lon,
    timezone: header('cf-iptimezone'),
    citySlug,
    // 'country' means: we know the country, not the city. The city headers are
    // a zone setting; without them this is the best that costs nothing.
    source: precise ? 'edge' : citySlug ? 'country' : 'none',
  };
}
