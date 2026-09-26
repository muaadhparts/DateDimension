import {
  AddressLookupUnavailable,
  addressLookupAvailable,
  cleanFields,
  fieldsProblem,
  hasWrittenAddress,
  lookupFields,
  lookupPlace,
  lookupPoint,
  lookupShortCode,
  mismatches,
  normaliseShortCode,
  resolveInput,
  type LatLon,
  type NationalAddress,
} from '@/lib/national-address';
import {clientKey, createRateLimiter} from '@/lib/rate-limit';
import {log} from '@/lib/log';

// Every lookup is a billable Google call unless it is already cached.
const rateLimit = createRateLimiter({limit: 20, windowMs: 60_000});
// A search by numbers alone costs up to twenty calls, so it has its own, tighter limit.
const numberSearchLimit = createRateLimiter({limit: 4, windowMs: 60_000});

const noStore = {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'};
const fail = (status: number, error: string, field?: string) =>
  Response.json({error, ...(field ? {field} : {})}, {status, headers: noStore});
const found = (address: NationalAddress | null, extra: Record<string, unknown> = {}) =>
  address ? Response.json({data: address, ...extra}, {headers: noStore}) : fail(404, 'not_found');
const limited = (retryAfterSeconds: number) =>
  Response.json(
    {error: 'rate_limited'},
    {status: 429, headers: {...noStore, 'Retry-After': String(retryAfterSeconds)}},
  );

/**
 * The Saudi National Address in every direction, chosen by the parameters:
 *
 *   ?code=QBWA4294                   short address → fields
 *   ?q=<anything pasted>             link, coordinates, plus code, code or text
 *   ?place=<Google place id>         a picked search suggestion
 *   ?lat=26.34&lon=43.95             map point → fields and short address
 *   ?building=4294&postalCode=52381  fields → short address (street optional)
 *
 * Addresses are never logged or stored beyond the in-memory geocoding cache.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const lang = p.get('lang') === 'en' ? 'en' : 'ar';

  const code = p.has('code') ? normaliseShortCode(p.get('code') ?? '') : undefined;
  if (code === null) return fail(400, 'invalid_code', 'code');

  const query = p.get('q')?.trim().slice(0, 600);
  if (p.has('q') && !query) return fail(400, 'invalid_query', 'q');

  const place = p.get('place') ?? undefined;
  if (place !== undefined && !/^[\w-]{10,300}$/.test(place)) return fail(400, 'invalid_place');

  const point = p.has('lat') || p.has('lon');
  const lat = Number(p.get('lat'));
  const lon = Number(p.get('lon'));
  if (
    point &&
    (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
  ) {
    return fail(400, 'invalid_point');
  }

  const byFields = !code && !query && !place && !point;
  const fields = cleanFields(Object.fromEntries(p));
  const problem = byFields ? fieldsProblem(fields) : null;
  if (problem) return fail(400, 'incomplete_fields', problem);

  if (!addressLookupAvailable()) return fail(503, 'not_configured');

  const allowance = rateLimit(clientKey(request));
  if (!allowance.allowed) return limited(allowance.retryAfterSeconds);
  if (byFields && !hasWrittenAddress(fields)) {
    const search = numberSearchLimit(clientKey(request));
    if (!search.allowed) return limited(search.retryAfterSeconds);
  }

  try {
    if (code) return found(await lookupShortCode(code, lang));
    if (query) {
      const resolved = await resolveInput(query, lang);
      return found(resolved.address, pointExtra(resolved.point));
    }
    if (place) return found(await lookupPlace(place, lang));
    if (point) return found(await lookupPoint(lat, lon, lang));
    const address = await lookupFields(fields, lang);
    return found(address, address ? {mismatches: mismatches(fields, address)} : {});
  } catch (error) {
    log('warn', 'national_address_lookup_failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return fail(error instanceof AddressLookupUnavailable ? 503 : 500, 'unavailable');
  }
}

/** Where a pasted link or coordinate pointed, so the map can show it too. */
const pointExtra = (point: LatLon | null) => (point ? {point} : {});
