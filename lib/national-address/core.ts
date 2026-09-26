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
 * What a lookup from fields needs: the building number, the street it stands
 * on, and a city or postal code to find that street in. A district without a
 * street is not enough — Google then answers with the district's centre, not a
 * building (checked live: `4294 حي المنتزه، بريدة` is APPROXIMATE, while
 * `4294 طريق الملك فهد 52381` is the ROOFTOP of QBWA4294).
 */
export function fieldsProblem(fields: AddressFields): keyof AddressFields | null {
  if (fields.building.length !== 4) return 'building';
  if (!fields.street) return 'street';
  if (!fields.city && fields.postalCode.length !== 5) return 'city';
  return null;
}

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
    building: component(components, 'street_number'),
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
