/**
 * The Saudi National Address, through Google Geocoding.
 *
 * Google carries the short address (four letters and the four-digit building
 * number, e.g. QBWA4294) as the `premise` component of a building, beside the
 * street number, the additional number (`postal_code_suffix`), the district,
 * city and postal code. That one fact serves every direction:
 *
 * - short address → fields: geocode the code itself.
 * - fields → short address: geocode the written address and read `premise`.
 * - map point → both: reverse geocode and take the first building that has one.
 *
 * Verified against QBWA4294 (4294 King Fahd Rd, 6309, Al Muntazah, Buraydah
 * 52381), ROOFTOP in all three directions.
 */

export type Lang = 'ar' | 'en';

export type AddressFields = {
  building: string;
  street: string;
  additional: string;
  district: string;
  city: string;
  postalCode: string;
};

export type NationalAddress = AddressFields & {
  shortCode: string | null;
  region: string;
  formatted: string;
  lat: number | null;
  lon: number | null;
};

type Component = {long_name: string; short_name: string; types: string[]};
export type GeocodeResult = {
  formatted_address?: string;
  types?: string[];
  address_components?: Component[];
  geometry?: {location?: {lat?: number; lng?: number}; location_type?: string};
};

export const SHORT_CODE = /^[A-Z]{4}[0-9]{4}$/;
export const FIELD_KEYS = [
  'building',
  'street',
  'additional',
  'district',
  'city',
  'postalCode',
] as const satisfies readonly (keyof AddressFields)[];

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
/** ٠١٢ and ۰۱۲ to 012, which is how phones often type numbers in Arabic. */
export function latinDigits(value: string): string {
  return value.replace(ARABIC_DIGITS, (d) => String(((d.charCodeAt(0) - 0x0660) % 0x90) % 10));
}

/** `qbwa 4294`, `QBWA-4294`, `QBWA٤٢٩٤` → `QBWA4294`; anything else → null. */
export function normaliseShortCode(input: string): string | null {
  const code = latinDigits(input)
    .toUpperCase()
    .replace(/[\s\-_.]/g, '');
  return SHORT_CODE.test(code) ? code : null;
}

const digitsOnly = (value: string) => latinDigits(value).replace(/\D/g, '');

/** Trims every field and keeps only digits in the numeric ones. */
export function cleanFields(input: Partial<Record<keyof AddressFields, unknown>>): AddressFields {
  const text = (value: unknown, max: number) =>
    (typeof value === 'string' ? value : '').replace(/\s+/g, ' ').trim().slice(0, max);
  return {
    building: digitsOnly(text(input.building, 10)).slice(0, 4),
    street: text(input.street, 120),
    additional: digitsOnly(text(input.additional, 10)).slice(0, 4),
    district: text(input.district, 120),
    city: text(input.city, 80),
    postalCode: digitsOnly(text(input.postalCode, 10)).slice(0, 5),
  };
}

/**
 * What a lookup from fields needs. The building number always — the four
 * digits of the short address are the building number. Then either the postal
 * code, which is searched by numbers alone (see searchByNumbers), or a street
 * with a city to find it in. The numbers are what people copy reliably; names
 * are often misspelt, so they are never required.
 */
export function fieldsProblem(fields: AddressFields): keyof AddressFields | null {
  if (fields.building.length !== 4) return 'building';
  if (fields.postalCode.length === 5) return null;
  if (!fields.street) return 'postalCode';
  if (!fields.city) return 'city';
  return null;
}

/** Whether the cheap one-call lookup by written address can be tried. */
export const hasWrittenAddress = (fields: AddressFields) =>
  !!fields.street && (!!fields.city || fields.postalCode.length === 5);

/** The written address Google is asked to find. */
export function addressQuery(fields: AddressFields, lang: Lang): string {
  const district =
    fields.district && lang === 'ar' && !/^حي\s/.test(fields.district)
      ? `حي ${fields.district}`
      : fields.district;
  const place = [fields.city, fields.postalCode].filter(Boolean).join(' ');
  return [
    [fields.building, fields.street].filter(Boolean).join(' '),
    district,
    place,
    lang === 'ar' ? 'السعودية' : 'Saudi Arabia',
  ]
    .filter(Boolean)
    .join(lang === 'ar' ? '، ' : ', ');
}

function component(components: Component[], ...types: string[]): string {
  for (const type of types) {
    const found = components.find((c) => c.types.includes(type));
    if (found) return found.long_name;
  }
  return '';
}

/** The short address on a result, if it has a real one. */
export function shortCodeOf(result: GeocodeResult): string | null {
  const premise = component(result.address_components ?? [], 'premise').toUpperCase();
  return SHORT_CODE.test(premise) ? premise : null;
}

export function parseResult(result: GeocodeResult): NationalAddress {
  const components = result.address_components ?? [];
  // The district arrives as sublocality / neighborhood, or — in Saudi data —
  // as a bare `political` component with no other type.
  const district =
    component(components, 'sublocality_level_1', 'sublocality', 'neighborhood') ||
    components.find((c) => c.types.length === 1 && c.types[0] === 'political')?.long_name ||
    '';
  const suffix = component(components, 'postal_code_suffix');
  const subpremise = component(components, 'subpremise');
  const lat = result.geometry?.location?.lat;
  const lon = result.geometry?.location?.lng;
  return {
    shortCode: shortCodeOf(result),
    // Some buildings carry the short address but no street number; its last
    // four digits are the building number.
    building: component(components, 'street_number') || shortCodeOf(result)?.slice(4) || '',
    street: component(components, 'route'),
    additional: suffix || (/^\d{4}$/.test(subpremise) ? subpremise : ''),
    district,
    city: component(components, 'locality', 'administrative_area_level_2'),
    region: component(components, 'administrative_area_level_1'),
    postalCode: component(components, 'postal_code'),
    formatted: result.formatted_address ?? '',
    lat: typeof lat === 'number' ? lat : null,
    lon: typeof lon === 'number' ? lon : null,
  };
}

/**
 * The result that answers the question. With a code, only that building. With
 * a building number, a building whose short address ends in it — the four
 * digits of a short address are the building number. Otherwise the first
 * building that has a short address at all.
 */
export function pickResult(
  results: GeocodeResult[],
  want: {code?: string; building?: string} = {},
): GeocodeResult | undefined {
  const coded = results.filter((r) => shortCodeOf(r) !== null);
  if (want.code) return coded.find((r) => shortCodeOf(r) === want.code);
  if (want.building) {
    const exact = coded.find((r) => shortCodeOf(r)!.endsWith(want.building!));
    if (exact) return exact;
  }
  return coded[0];
}

/** Numeric fields the visitor typed that the found building disagrees with. */
export function mismatches(typed: AddressFields, found: NationalAddress): (keyof AddressFields)[] {
  return (['building', 'additional', 'postalCode'] as const).filter(
    (key) => typed[key] !== '' && found[key] !== '' && typed[key] !== found[key],
  );
}

/** Whether a found building agrees with every number the visitor typed. */
export function matchesNumbers(typed: AddressFields, found: NationalAddress): boolean {
  return (
    found.shortCode?.slice(4) === typed.building &&
    (typed.postalCode === '' || found.postalCode === typed.postalCode) &&
    (typed.additional === '' || found.additional === typed.additional)
  );
}

// ---- Free input for the decode box: codes, links, coordinates, plus codes ----

export type LatLon = {lat: number; lon: number};

/** A short address anywhere in the text, e.g. inside a pasted message. */
export function findShortCode(text: string): string | null {
  const match = latinDigits(text)
    .toUpperCase()
    .match(/(?:^|[^A-Z0-9])([A-Z]{4})[\s-]?([0-9]{4})(?![0-9])/);
  return match ? match[1] + match[2] : null;
}

const inRange = (lat: number, lon: number) =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

/**
 * Saudi Arabia lies between 16° and 33° N and 34° and 56° E, so a pair that is
 * only valid the other way round — which is how right-to-left text often
 * pastes it — is swapped.
 */
function ordered(a: number, b: number): LatLon | null {
  const saudi = (lat: number, lon: number) => lat >= 15 && lat <= 34 && lon >= 33 && lon <= 57;
  if (saudi(b, a) && !saudi(a, b)) return {lat: b, lon: a};
  return inRange(a, b) ? {lat: a, lon: b} : null;
}

/** 26°20'49.0"N 43°57'02.6"E, in either order and with any quote marks. */
function degreesMinutesSeconds(text: string): LatLon | null {
  const parts = [
    ...text.matchAll(
      /(\d{1,3})\s*°\s*(\d{1,2})\s*['′’]\s*(\d{1,2}(?:\.\d+)?)\s*(?:["″”]|'')?\s*([NSEW])/gi,
    ),
  ];
  let lat: number | null = null;
  let lon: number | null = null;
  for (const [, d, m, sec, hemi] of parts) {
    const value = Number(d) + Number(m) / 60 + Number(sec) / 3600;
    const h = hemi.toUpperCase();
    if (h === 'N' || h === 'S') lat = h === 'S' ? -value : value;
    else lon = h === 'W' ? -value : value;
  }
  return lat !== null && lon !== null && inRange(lat, lon) ? {lat, lon} : null;
}

/** Decimal coordinates such as `26.346944, 43.950722`, or DMS. */
export function parseCoordinates(text: string): LatLon | null {
  const latin = latinDigits(text).replace(/٫/g, '.');
  const decimal = latin.match(/(-?\d{1,3}\.\d{3,})\s*[,،؛;\s]\s*(-?\d{1,3}\.\d{3,})/);
  if (decimal) {
    const pair = ordered(Number(decimal[1]), Number(decimal[2]));
    if (pair) return pair;
  }
  return degreesMinutesSeconds(latin);
}

/** A plus code (8XW2+P7X, 7HR58XW2+P7X) somewhere in the text. */
export const PLUS_CODE = /[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i;

export const findUrl = (text: string): string | null =>
  text.match(/https?:\/\/[^\s<>"'،]+/i)?.[0] ?? null;

/** Only Google's own map hosts are ever fetched, so a pasted link cannot aim the server elsewhere. */
export function isGoogleMapsUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname.toLowerCase();
  return (
    host === 'maps.app.goo.gl' ||
    host === 'goo.gl' ||
    host === 'g.co' ||
    host === 'maps.google.com' ||
    /^(www\.)?google\.[a-z.]{2,6}$/.test(host)
  );
}

/**
 * The place a Google Maps URL points at. `!3d…!4d…` is the pin itself and wins
 * over `@lat,lng`, which is only where the view was centred — for a shared
 * place the two can be kilometres apart.
 */
export function coordinatesFromMapsUrl(value: string): LatLon | null {
  const text = decodeURIComponent(value.replace(/\+/g, ' '));
  const pin = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pin) return ordered(Number(pin[1]), Number(pin[2]));
  const query = text.match(/[?&](?:q|query|ll|destination|center)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (query) return ordered(Number(query[1]), Number(query[2]));
  const view = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (view) return ordered(Number(view[1]), Number(view[2]));
  return null;
}

/** The place name in a /maps/place/NAME/ URL, for when there are no coordinates. */
export function placeNameFromMapsUrl(value: string): string | null {
  const match = value.match(/\/maps\/place\/([^/@?]+)/);
  if (!match) return null;
  const name = decodeURIComponent(match[1].replace(/\+/g, ' '))
    // Invisible format characters, such as the direction marks Google appends.
    .replace(/\p{Cf}/gu, '')
    .trim();
  return name || null;
}
