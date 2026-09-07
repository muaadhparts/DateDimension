import {normalise, type CityCoordinates} from './coordinates.ts';
import {countryCode} from './countries.ts';
import {PrayerDataUnavailable} from './types.ts';

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const TIMEOUT_MS = 8000;
const MAX_MEMO = 500;

/**
 * City coordinates never change, so one lookup per unknown city is enough for
 * the life of the process. Bounded so the memo cannot become a memory leak.
 */
const memo = new Map<string, CityCoordinates>();

type GeocodingResult = {
  latitude?: number; longitude?: number; timezone?: string;
  country?: string; country_code?: string; population?: number;
};

/** The geocoder answers with the country's current official name, which is not
 * always what people type ("Türkiye" for "Turkey"), so match on the ISO code
 * first and only then on the name itself. */
function matchesCountry(result: GeocodingResult, typed: string): boolean {
  const wanted = normalise(typed);
  if (!wanted) return true;
  const code = countryCode(typed);
  if (code && result.country_code && code === result.country_code.toUpperCase()) return true;
  const name = normalise(result.country ?? '');
  return name === wanted || name.includes(wanted) || wanted.includes(name);
}

function remember(key: string, value: CityCoordinates): CityCoordinates {
  if (memo.size >= MAX_MEMO) memo.delete(memo.keys().next().value as string);
  memo.set(key, value);
  return value;
}

/**
 * Resolves a free-text city into coordinates. Only the lookup is remote; the
 * prayer times themselves are always computed locally from what it returns.
 */
export async function geocodeCity(city: string, country: string): Promise<CityCoordinates> {
  if (process.env.PRAYERS_ALLOW_REMOTE === 'false') throw new PrayerDataUnavailable('Unknown location');

  const key = `${normalise(city)}|${normalise(country)}`;
  const cached = memo.get(key);
  if (cached) return cached;

  const query = new URLSearchParams({name: city, count: '10', format: 'json'});
  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}?${query}`, {signal: AbortSignal.timeout(TIMEOUT_MS)});
  } catch {
    throw new PrayerDataUnavailable();
  }
  if (!response.ok) throw new PrayerDataUnavailable();

  const body = (await response.json()) as {results?: GeocodingResult[]};
  const results = body.results ?? [];
  const match = results.find((result) => matchesCountry(result, country));

  if (!match?.latitude || !match.longitude || !match.timezone) {
    throw new PrayerDataUnavailable('Unknown location');
  }
  return remember(key, {lat: match.latitude, lon: match.longitude, zone: match.timezone});
}
