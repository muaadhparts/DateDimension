import tzLookup from '@photostructure/tz-lookup';
import {loadServerEnv} from '../server-env.ts';
import {normalise, type CityCoordinates} from './coordinates.ts';
import {PrayerDataUnavailable} from './types.ts';

const ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const TIMEOUT_MS = 8000;

type Component = {long_name: string; short_name: string; types: string[]};
type Result = {
  formatted_address?: string;
  address_components?: Component[];
  geometry?: {location?: {lat?: number; lng?: number}};
};

export type ResolvedPlace = CityCoordinates & {
  /** What to show the visitor, in their own language where Google has it. */
  city: string;
  country: string;
};

/**
 * Google Geocoding, used only where it earns its cost: turning the visitor's
 * own coordinates into a place name, and resolving a typed city that the
 * curated list does not cover. The key is server-side only — the browser never
 * sees it, and this endpoint is the only thing that can spend it.
 */
function apiKey(): string | null {
  loadServerEnv();
  return process.env.GOOGLE_MAPS_API_KEY?.trim() || null;
}

export const googleGeocodingAvailable = () => apiKey() !== null;

/**
 * The IANA zone for a point, resolved from a bundled boundary table rather than
 * Google's Time Zone API: same answer, no second billable call, works offline.
 */
function zoneFor(lat: number, lon: number): string {
  try {
    return tzLookup(lat, lon);
  } catch {
    return 'UTC';
  }
}

function pick(components: Component[], ...types: string[]): string | null {
  for (const type of types) {
    const found = components.find((component) => component.types.includes(type));
    if (found) return found.long_name;
  }
  return null;
}

async function call(params: URLSearchParams, language: string): Promise<Result[]> {
  const key = apiKey();
  if (!key) throw new PrayerDataUnavailable('Geocoding is not configured');

  params.set('key', key);
  params.set('language', language);

  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}?${params}`, {signal: AbortSignal.timeout(TIMEOUT_MS)});
  } catch {
    throw new PrayerDataUnavailable();
  }
  if (!response.ok) throw new PrayerDataUnavailable();

  const body = (await response.json()) as {status?: string; results?: Result[]};
  // ZERO_RESULTS is a valid answer meaning "no such place", not an outage.
  if (body.status === 'ZERO_RESULTS') return [];
  if (body.status !== 'OK' || !body.results) throw new PrayerDataUnavailable();
  return body.results;
}

/** Coordinates to a place name. Requires the visitor to have granted location. */
export async function reverseGeocode(
  lat: number,
  lon: number,
  language: 'ar' | 'en' = 'en',
): Promise<ResolvedPlace | null> {
  const results = await call(
    new URLSearchParams({
      latlng: `${lat},${lon}`,
      result_type: 'locality|administrative_area_level_1|country',
    }),
    language,
  );
  for (const result of results) {
    const components = result.address_components ?? [];
    const city = pick(
      components,
      'locality',
      'postal_town',
      'administrative_area_level_2',
      'administrative_area_level_1',
    );
    const country = pick(components, 'country');
    if (city && country) return {city, country, lat, lon, zone: zoneFor(lat, lon)};
  }
  return null;
}

/** A typed city to coordinates, for places the curated list does not cover. */
export async function geocodePlace(
  city: string,
  country: string,
  language: 'ar' | 'en' = 'en',
): Promise<ResolvedPlace | null> {
  const query = normalise(country) ? `${city}, ${country}` : city;
  const results = await call(new URLSearchParams({address: query}), language);
  const first = results[0];
  const lat = first?.geometry?.location?.lat;
  const lon = first?.geometry?.location?.lng;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;

  const components = first.address_components ?? [];
  return {
    city: pick(components, 'locality', 'postal_town', 'administrative_area_level_1') ?? city,
    country: pick(components, 'country') ?? country,
    lat,
    lon,
    zone: zoneFor(lat, lon),
  };
}
