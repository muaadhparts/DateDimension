import {normalise} from './coordinates.ts';

/**
 * Country names people actually type, resolved to ISO 3166-1 alpha-2 codes, so
 * a free-text search can be matched against the geocoder's country_code rather
 * than against its display name. "Turkey" and "Türkiye" are the same country;
 * "Egypt" and "مصر" are too.
 */
const ALIASES: Record<string, string> = {
  turkey: 'TR',
  turkiye: 'TR',
  uk: 'GB',
  'united kingdom': 'GB',
  britain: 'GB',
  'great britain': 'GB',
  england: 'GB',
  usa: 'US',
  us: 'US',
  america: 'US',
  'united states': 'US',
  'united states of america': 'US',
  uae: 'AE',
  emirates: 'AE',
  'united arab emirates': 'AE',
  ksa: 'SA',
  'saudi arabia': 'SA',
  saudi: 'SA',
  holland: 'NL',
  netherlands: 'NL',
  'ivory coast': 'CI',
  burma: 'MM',
  'czech republic': 'CZ',
  swaziland: 'SZ',
  'south korea': 'KR',
  'north korea': 'KP',
  russia: 'RU',
  syria: 'SY',
  iran: 'IR',
};

let byName: Map<string, string> | undefined;

function buildIndex(): Map<string, string> {
  const index = new Map<string, string>();
  for (const [name, code] of Object.entries(ALIASES)) index.set(normalise(name), code);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const locale of ['en', 'ar']) {
    let display: Intl.DisplayNames;
    try {
      display = new Intl.DisplayNames([locale], {type: 'region'});
    } catch {
      continue;
    }
    for (const first of letters) {
      for (const second of letters) {
        const code = first + second;
        let name: string | undefined;
        try {
          name = display.of(code);
        } catch {
          continue;
        }
        // Unknown codes come back unchanged.
        if (!name || name === code) continue;
        const key = normalise(name);
        if (!index.has(key)) index.set(key, code);
      }
    }
  }
  return index;
}

/** ISO code for a typed country name, or undefined when it is not recognised. */
export function countryCode(country: string): string | undefined {
  byName ??= buildIndex();
  const key = normalise(country);
  if (!key) return undefined;
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase();
  return byName.get(key);
}
