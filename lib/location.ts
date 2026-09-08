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
export type DetectedLocation = {
  city: string | null;
  country: string | null;
  countryCode: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string | null;
  source: 'edge' | 'none';
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

  return {
    city,
    country: null,
    countryCode: header('cf-ipcountry'),
    lat,
    lon,
    timezone: header('cf-iptimezone'),
    source: city || (lat !== null && lon !== null) ? 'edge' : 'none',
  };
}
