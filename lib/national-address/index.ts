import {googleMapsKey} from '../google-key.ts';
import {
  addressQuery,
  parseResult,
  pickResult,
  type AddressFields,
  type GeocodeResult,
  type Lang,
  type NationalAddress,
} from './core.ts';

/** Server side: the Google calls. The pure parsing lives in core.ts. */
export * from './core.ts';

export class AddressLookupUnavailable extends Error {}

const ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const TIMEOUT_MS = 8000;

export const addressLookupAvailable = () => googleMapsKey() !== null;

// Google permits caching geocoding results for up to 30 days. Only answers are
// kept, never failures, and the map is bounded so it cannot grow without limit.
const CACHE_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_MAX = 2000;
const cache = new Map<string, {results: GeocodeResult[]; until: number}>();

async function geocode(params: Record<string, string>, lang: Lang): Promise<GeocodeResult[]> {
  const key = googleMapsKey();
  if (!key) throw new AddressLookupUnavailable('Geocoding is not configured');

  const query = new URLSearchParams({...params, language: lang});
  const id = query.toString();
  const hit = cache.get(id);
  if (hit && hit.until > Date.now()) return hit.results;

  query.set('key', key);
  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}?${query}`, {signal: AbortSignal.timeout(TIMEOUT_MS)});
  } catch {
    throw new AddressLookupUnavailable('Geocoding request failed');
  }
  if (!response.ok) throw new AddressLookupUnavailable(`Geocoding HTTP ${response.status}`);
  const body = (await response.json()) as {status?: string; results?: GeocodeResult[]};
  if (body.status !== 'OK' && body.status !== 'ZERO_RESULTS') {
    throw new AddressLookupUnavailable(`Geocoding status ${body.status}`);
  }
  const results = body.results ?? [];

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(id, {results, until: Date.now() + CACHE_MS});
  return results;
}

export async function lookupShortCode(code: string, lang: Lang): Promise<NationalAddress | null> {
  const results = await geocode({address: code, region: 'sa'}, lang);
  const found = pickResult(results, {code});
  return found ? parseResult(found) : null;
}

export async function lookupFields(
  fields: AddressFields,
  lang: Lang,
): Promise<NationalAddress | null> {
  const results = await geocode(
    {address: addressQuery(fields, lang), region: 'sa', components: 'country:SA'},
    lang,
  );
  const found = pickResult(results, {building: fields.building});
  return found ? parseResult(found) : null;
}

export async function lookupPoint(
  lat: number,
  lon: number,
  lang: Lang,
): Promise<NationalAddress | null> {
  // Five decimals is about a metre: finer than any building, coarse enough
  // that the same click twice shares a cache entry.
  const results = await geocode({latlng: `${lat.toFixed(5)},${lon.toFixed(5)}`}, lang);
  const found = pickResult(results) ?? results[0];
  return found ? parseResult(found) : null;
}

/** The Maps JavaScript loader for the page's map. The key is in it by design. */
export function mapLoaderUrl(lang: Lang): string | null {
  const key = googleMapsKey();
  if (!key) return null;
  return (
    'https://maps.googleapis.com/maps/api/js?' +
    new URLSearchParams({
      key,
      language: lang,
      region: 'SA',
      loading: 'async',
      callback: '__nationalAddressMap',
      v: 'weekly',
    })
  );
}
