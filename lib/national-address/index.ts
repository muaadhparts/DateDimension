import {googleMapsKey} from '../google-key.ts';
import {
  addressQuery,
  coordinatesFromMapsUrl,
  findShortCode,
  findUrl,
  hasWrittenAddress,
  isGoogleMapsUrl,
  matchesNumbers,
  parseCoordinates,
  parseResult,
  pickResult,
  placeNameFromMapsUrl,
  shortCodeOf,
  type AddressFields,
  type GeocodeResult,
  type Lang,
  type LatLon,
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

/**
 * A ceiling on Google calls per UTC day for this process. The key is shared
 * with partsassistant.com, and on 2026-09-26 its daily Geocoding quota ran out
 * and took both sites' lookups down; this page must never be what does that.
 */
const DAILY_BUDGET = Number(process.env.NATIONAL_ADDRESS_DAILY_CALLS) || 3000;
let spent = {day: '', calls: 0};
function spend(): void {
  const day = new Date().toISOString().slice(0, 10);
  if (spent.day !== day) spent = {day, calls: 0};
  if (spent.calls >= DAILY_BUDGET) throw new AddressLookupUnavailable('Daily budget spent');
  spent.calls++;
}

async function geocode(params: Record<string, string>, lang: Lang): Promise<GeocodeResult[]> {
  const key = googleMapsKey();
  if (!key) throw new AddressLookupUnavailable('Geocoding is not configured');

  const query = new URLSearchParams({...params, language: lang});
  const id = query.toString();
  const hit = cache.get(id);
  if (hit && hit.until > Date.now()) return hit.results;
  spend();

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

/**
 * Fields to a building. With a street, one call on the written address. When
 * that is not possible or finds nothing, the numbers alone: see searchByNumbers.
 */
export async function lookupFields(
  fields: AddressFields,
  lang: Lang,
): Promise<NationalAddress | null> {
  if (hasWrittenAddress(fields)) {
    const results = await geocode(
      {address: addressQuery(fields, lang), region: 'sa', components: 'country:SA'},
      lang,
    );
    const found = pickResult(results, {building: fields.building});
    const address = found ? parseResult(found) : null;
    // A building found by name is kept only if it is the one the numbers say.
    if (address && (fields.postalCode.length !== 5 || matchesNumbers(fields, address))) {
      return address;
    }
  }
  return fields.postalCode.length === 5 ? searchByNumbers(fields, lang) : null;
}

type Box = {northeast: {lat: number; lng: number}; southwest: {lat: number; lng: number}};

// Letter prefixes seen inside a postal code, kept as long as the geocoding cache.
const prefixCache = new Map<string, {prefixes: string[]; until: number}>();
const MAX_CANDIDATES = 10;

/**
 * The short address from the building number and postal code alone.
 *
 * Google cannot find a building from its numbers, but a short address is four
 * letters for the area plus the building number. So: take the postal code's
 * extent, reverse geocode a 3×3 grid across it to learn which letter prefixes
 * are in use there, then try each prefix with the building number and keep the
 * one whose postal code (and additional number, when given) match. About ten
 * calls the first time for a postal code, then only the candidates.
 *
 * Checked live: 4294 / 6309 / 52381 and 2889 / 7214 / 52382 both list QBWA
 * among the grid's prefixes.
 */
export async function searchByNumbers(
  fields: AddressFields,
  lang: Lang,
): Promise<NationalAddress | null> {
  for (const prefix of await prefixesFor(fields.postalCode, lang)) {
    const candidate = await lookupShortCode(prefix + fields.building, lang);
    if (candidate && matchesNumbers(fields, candidate)) return candidate;
  }
  return null;
}

async function prefixesFor(postalCode: string, lang: Lang): Promise<string[]> {
  const hit = prefixCache.get(postalCode);
  if (hit && hit.until > Date.now()) return hit.prefixes;

  const [area] = await geocode({components: `postal_code:${postalCode}|country:SA`}, lang);
  const geometry = area?.geometry as {bounds?: Box; viewport?: Box} | undefined;
  const box = geometry?.bounds ?? geometry?.viewport;
  if (!box) return [];

  const counts = new Map<string, number>();
  const steps = [0.2, 0.5, 0.8];
  for (const fy of steps) {
    for (const fx of steps) {
      const lat = box.southwest.lat + (box.northeast.lat - box.southwest.lat) * fy;
      const lon = box.southwest.lng + (box.northeast.lng - box.southwest.lng) * fx;
      const results = await geocode({latlng: `${lat.toFixed(5)},${lon.toFixed(5)}`}, lang);
      for (const result of results) {
        const code = shortCodeOf(result);
        if (code) counts.set(code.slice(0, 4), (counts.get(code.slice(0, 4)) ?? 0) + 1);
      }
    }
  }
  const prefixes = [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([prefix]) => prefix)
    .slice(0, MAX_CANDIDATES);
  prefixCache.set(postalCode, {prefixes, until: Date.now() + CACHE_MS});
  return prefixes;
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

/** A place picked from the search suggestions, by its Google place id. */
export async function lookupPlace(placeId: string, lang: Lang): Promise<NationalAddress | null> {
  return fromResults(await geocode({place_id: placeId}, lang), lang);
}

/**
 * A geocoded place is often a shop or a plus-code square rather than a
 * building; when it carries no short address, the building at its point does.
 */
async function fromResults(results: GeocodeResult[], lang: Lang): Promise<NationalAddress | null> {
  const coded = pickResult(results);
  if (coded) return parseResult(coded);
  const at = results[0]?.geometry?.location;
  if (typeof at?.lat !== 'number' || typeof at?.lng !== 'number') return null;
  return lookupPoint(at.lat, at.lng, lang);
}

const LINK_HOPS = 5;

/** Follows a shared Google Maps link to its final URL, never leaving Google. */
async function expandMapsLink(link: string): Promise<string | null> {
  let url = link;
  for (let hop = 0; hop < LINK_HOPS; hop++) {
    if (!isGoogleMapsUrl(url)) return null;
    if (coordinatesFromMapsUrl(url) || placeNameFromMapsUrl(url)) return url;
    let response: Response;
    try {
      response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS)});
    } catch {
      throw new AddressLookupUnavailable('Link could not be followed');
    }
    const next = response.headers.get('location');
    if (!next) return url;
    url = new URL(next, url).href;
  }
  return null;
}

export type ResolvedInput = {address: NationalAddress | null; point: LatLon | null};

/**
 * Whatever people paste into the decode box: a shared Google Maps link, a
 * short address, decimal or degree coordinates, a plus code with its town, or
 * a written address.
 */
export async function resolveInput(text: string, lang: Lang): Promise<ResolvedInput> {
  const link = findUrl(text);
  if (link) {
    const expanded = isGoogleMapsUrl(link) ? await expandMapsLink(link) : null;
    const point = expanded ? coordinatesFromMapsUrl(expanded) : null;
    if (point) return {address: await lookupPoint(point.lat, point.lon, lang), point};
    const name = expanded ? placeNameFromMapsUrl(expanded) : null;
    if (!name) return {address: null, point: null};
    const results = await geocode({address: name, region: 'sa'}, lang);
    return {address: await fromResults(results, lang), point: null};
  }

  const code = findShortCode(text);
  if (code) {
    const address = await lookupShortCode(code, lang);
    if (address) return {address, point: null};
  }

  const point = parseCoordinates(text);
  if (point) return {address: await lookupPoint(point.lat, point.lon, lang), point};

  // Plus codes and written addresses are both Google's to resolve.
  const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!cleaned) return {address: null, point: null};
  const results = await geocode({address: cleaned, region: 'sa'}, lang);
  return {address: await fromResults(results, lang), point: null};
}

export type Suggestion = {id: string; main: string; secondary: string};

const PLACES_AUTOCOMPLETE = 'https://places.googleapis.com/v1/places:autocomplete';

type PlacesBody = {
  suggestions?: {
    placePrediction?: {
      placeId?: string;
      text?: {text?: string};
      structuredFormat?: {mainText?: {text?: string}; secondaryText?: {text?: string}};
    };
  }[];
};

/** Place suggestions for the map's search box, limited to Saudi Arabia. */
export async function suggestPlaces(
  input: string,
  lang: Lang,
  sessionToken: string,
): Promise<Suggestion[]> {
  const key = googleMapsKey();
  if (!key) throw new AddressLookupUnavailable('Places is not configured');
  spend();
  let response: Response;
  try {
    response = await fetch(PLACES_AUTOCOMPLETE, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Goog-Api-Key': key},
      body: JSON.stringify({
        input,
        languageCode: lang,
        includedRegionCodes: ['sa'],
        ...(sessionToken ? {sessionToken} : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AddressLookupUnavailable('Places request failed');
  }
  if (!response.ok) throw new AddressLookupUnavailable(`Places HTTP ${response.status}`);
  const body = (await response.json()) as PlacesBody;
  return (body.suggestions ?? []).flatMap(({placePrediction: p}) =>
    p?.placeId
      ? [
          {
            id: p.placeId,
            main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
            secondary: p.structuredFormat?.secondaryText?.text ?? '',
          },
        ]
      : [],
  );
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
