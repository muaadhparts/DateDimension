import index from '../../data/quran/index.json' with {type: 'json'};
import type {Surah, SurahSummary} from './types.ts';
import {foldArabic} from './text.ts';

export type {Surah, SurahSummary, Verse} from './types.ts';
export {bareName, foldArabic} from './text.ts';

/**
 * The Quran, served from this repository rather than from an API.
 *
 * Text: the Uthmani script from Tanzil (tanzil.net). Their terms require it to
 * be reproduced unmodified and with attribution, which is why the pages credit
 * the source and why nothing here rewrites a verse — the only separation made
 * is printing the Basmala above a surah, as every mushaf does.
 */
export const SURAHS = index as SurahSummary[];

export const TOTAL_VERSES = SURAHS.reduce((total, surah) => total + surah.verses, 0);

export function surahSummary(number: number): SurahSummary | undefined {
  return SURAHS.find((surah) => surah.number === number);
}

/** Loaded one surah at a time, so a page never carries the other 113. */
export async function loadSurah(number: number): Promise<Surah | null> {
  if (!Number.isInteger(number) || number < 1 || number > 114) return null;
  try {
    const loaded = await import(`../../data/quran/${number}.json`, {with: {type: 'json'}});
    return (loaded.default ?? loaded) as Surah;
  } catch {
    return null;
  }
}

export type SearchableSurah = SurahSummary & {search: string};

/** Precomputed once so filtering 114 rows on every keystroke stays free. */
export const SEARCHABLE: SearchableSurah[] = SURAHS.map((surah) => ({
  ...surah,
  search: [
    String(surah.number),
    foldArabic(surah.name),
    surah.englishName.toLowerCase().replace(/[^a-z0-9]/g, ''),
    surah.englishNameTranslation.toLowerCase(),
  ].join(' '),
}));
