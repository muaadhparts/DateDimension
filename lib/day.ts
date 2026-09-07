import {hijri, fromHijri} from './calendar.ts';
import {localeOf, type Lang} from './i18n.ts';

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Cached, because the clock used to build a new formatter on every tick. */
export function formatDate(lang: Lang, date: Date, options: Intl.DateTimeFormatOptions = {dateStyle: 'long'}): string {
  const key = lang + JSON.stringify(options);
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(localeOf(lang), {...options, timeZone: 'UTC'});
    formatters.set(key, formatter);
  }
  return formatter.format(date);
}

export type DayView = {
  lang: Lang;
  ar: boolean;
  /** 'YYYY-MM-DD' in the page's zone. */
  today: string;
  /** UTC midnight of that civil day, which is what every calculation uses. */
  date: Date;
  hijri: {year: number; month: number; day: number};
  /** Length of the current Hijri month, 29 or 30. */
  hijriDays: number;
  month: number;
  year: number;
  day: number;
  monthDays: number;
  format: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
};

/**
 * Everything the pages derive from "which day is it", computed once instead of
 * in each component. The Hijri month length falls back to 30 only if the
 * conversion is out of the supported range.
 */
export function dayView(lang: Lang, today: string): DayView {
  const date = new Date(today + 'T00:00:00Z');
  const h = hijri(date);
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();

  let hijriDays = 30;
  try {
    const next = fromHijri(h.month === 12 ? h.year + 1 : h.year, h.month === 12 ? 1 : h.month + 1, 1);
    hijriDays = (next.getTime() - fromHijri(h.year, h.month, 1).getTime()) / 86_400_000;
  } catch {
    /* outside 1356–1500 AH: keep the conventional 30 */
  }

  return {
    lang,
    ar: lang === 'ar',
    today,
    date,
    hijri: h,
    hijriDays,
    month,
    year,
    day: date.getUTCDate(),
    monthDays: new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
    format: (value, options) => formatDate(lang, value, options),
  };
}
