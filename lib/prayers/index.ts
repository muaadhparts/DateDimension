import {computePrayerTimes} from './compute.ts';
import {coordinatesForQuery, coordinatesForSlug} from './coordinates.ts';
import {geocodeCity} from './geocode.ts';
import {
  InvalidPrayerRequest, METHOD_IDS, SCHOOLS,
  type MethodId, type PrayerData, type PrayerRequest, type School,
} from './types.ts';

export {InvalidPrayerRequest, PrayerDataUnavailable} from './types.ts';
export type {PrayerData, PrayerName, PrayerRequest} from './types.ts';
export {coordinatesForSlug} from './coordinates.ts';

const isMethod = (value: string): value is MethodId => (METHOD_IDS as readonly string[]).includes(value);
const isSchool = (value: string): value is School => (SCHOOLS as readonly string[]).includes(value);

/** Parses and validates a query string. Every rejection is an InvalidPrayerRequest. */
export function parsePrayerQuery(params: URLSearchParams): PrayerRequest {
  const date = params.get('date') || '';
  const parsed = new Date(date + 'T00:00:00Z');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date ||
    parsed.getUTCFullYear() < 1900 ||
    parsed.getUTCFullYear() > 2100
  ) {
    throw new InvalidPrayerRequest('date');
  }

  const method = params.get('method') || '3';
  const school = params.get('school') || '0';
  if (!isMethod(method) || !isSchool(school)) throw new InvalidPrayerRequest('method');

  if (params.has('lat') && params.has('lon')) {
    const lat = Number(params.get('lat'));
    const lon = Number(params.get('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new InvalidPrayerRequest('coordinates');
    }
    const zone = params.get('tz')?.trim() || undefined;
    return {date, method, school, location: {kind: 'coords', lat, lon, zone}};
  }

  const city = params.get('city')?.trim() || '';
  const country = params.get('country')?.trim() || '';
  if (!city || !country || city.length > 100 || country.length > 80) {
    throw new InvalidPrayerRequest('location');
  }
  return {date, method, school, location: {kind: 'query', city, country}};
}

function isSupportedZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', {timeZone: zone}).format();
    return true;
  } catch {
    return false;
  }
}

/** Prayer times for a request. Only an unknown free-text city needs the network. */
export async function getPrayerTimes(request: PrayerRequest): Promise<PrayerData> {
  const {date, method, school, location} = request;

  if (location.kind === 'coords') {
    const zone = location.zone && isSupportedZone(location.zone) ? location.zone : 'UTC';
    return computePrayerTimes({date, lat: location.lat, lon: location.lon, zone, method, school});
  }

  const known = coordinatesForQuery(location.city, location.country);
  const coords = known ?? (await geocodeCity(location.city, location.country));
  return computePrayerTimes({date, ...coords, method, school});
}

/** Prayer times for one of the curated city routes. Never touches the network. */
export function getCityPrayerTimes(slug: string, date: string, method: MethodId = '3', school: School = '0'): PrayerData | null {
  const coords = coordinatesForSlug(slug);
  if (!coords) return null;
  return computePrayerTimes({date, ...coords, method, school});
}

/** Back-compatible entry point for the existing API route. */
export async function getPrayers(params: URLSearchParams): Promise<PrayerData> {
  return getPrayerTimes(parsePrayerQuery(params));
}
