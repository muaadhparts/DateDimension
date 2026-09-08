/**
 * The Basmala exactly as the source writes it, in escapes so that no editor,
 * copy-paste or transcription can silently drop a shadda. A test asserts it
 * still equals the first verse of Al-Fatiha.
 */
export const BASMALA =
  '\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064e\u0647\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650';

/** Name and search helpers that carry no data, so importing one costs nothing. */

/** The Arabic name without the leading "سورة". */
export function bareName(surah: {name: string}): string {
  return surah.name.replace(/^سُورَةُ\s*/, '').trim();
}

// Written as escapes on purpose: the literal form of this class spans
// ؚ-ٰ, which swallows every Arabic letter and folds any word to an
// empty string. Only marks belong here.
const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** Folds a query or a name so that "الفاتحه" matches "ٱلْفَاتِحَةِ". */
export function foldArabic(value: string): string {
  return value
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
}
