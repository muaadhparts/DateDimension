import {cities} from '../calendar.ts';

export type CityCoordinates = {lat: number; lon: number; zone: string};

/**
 * Coordinates for the eight curated city routes, so their prayer times need no
 * network call at all. Keyed by the slug that already drives routing.
 */
const COORDINATES: Record<string, CityCoordinates> = {
  riyadh: {lat: 24.7136, lon: 46.6753, zone: 'Asia/Riyadh'},
  makkah: {lat: 21.3891, lon: 39.8579, zone: 'Asia/Riyadh'},
  cairo: {lat: 30.0444, lon: 31.2357, zone: 'Africa/Cairo'},
  dubai: {lat: 25.2048, lon: 55.2708, zone: 'Asia/Dubai'},
  sanaa: {lat: 15.3694, lon: 44.191, zone: 'Asia/Aden'},
  london: {lat: 51.5074, lon: -0.1278, zone: 'Europe/London'},
  'new-york': {lat: 40.7128, lon: -74.006, zone: 'America/New_York'},
  jakarta: {lat: -6.2088, lon: 106.8456, zone: 'Asia/Jakarta'},
};

export function coordinatesForSlug(slug: string): CityCoordinates | undefined {
  return COORDINATES[slug];
}

/** Normalised 'city|country' keys for the curated cities, for free-text search. */
export function normalise(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ـً-ْ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const BY_NAME = new Map<string, CityCoordinates>();
for (const city of cities) {
  const coords = COORDINATES[city.slug];
  if (!coords) continue;
  for (const name of [city.en, city.ar, city.slug]) {
    BY_NAME.set(`${normalise(name)}|${normalise(city.country)}`, coords);
    BY_NAME.set(normalise(name), coords);
  }
}

/** Curated lookup for a free-text city/country pair. Undefined means "ask the geocoder". */
export function coordinatesForQuery(city: string, country: string): CityCoordinates | undefined {
  return BY_NAME.get(`${normalise(city)}|${normalise(country)}`) ?? BY_NAME.get(normalise(city));
}
