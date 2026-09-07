export const LANGS = ['ar', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'ar';

/** A string in both languages: [Arabic, English]. */
export type Bi = readonly [ar: string, en: string];

export const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value);
export const dirOf = (lang: Lang) => (lang === 'ar' ? 'rtl' : 'ltr');
export const localeOf = (lang: Lang) => (lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB');
export const ogLocaleOf = (lang: Lang) => (lang === 'ar' ? 'ar_SA' : 'en_GB');

export const pick = (lang: Lang, [ar, en]: Bi): string => (lang === 'ar' ? ar : en);

/** One `t` per component instead of the four copies this replaces. */
export const translator = (lang: Lang) => (ar: string, en: string) => (lang === 'ar' ? ar : en);

export const BRAND: Bi = ['يومك الآن', 'Your Day Now'];
