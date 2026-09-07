'use client';
import {fromHijri, hijri, hijriEnglish, hijriNames} from '@/lib/calendar';
import {formatDate} from '@/lib/day';
import type {Lang} from '@/lib/i18n';

// Arabic weekday names all begin with the same letter, so the initials are the
// distinguishing letter rather than the first character.
const WEEKDAYS = {
  ar: [
    ['ح', 'الأحد'],
    ['ن', 'الاثنين'],
    ['ث', 'الثلاثاء'],
    ['ر', 'الأربعاء'],
    ['خ', 'الخميس'],
    ['ج', 'الجمعة'],
    ['س', 'السبت'],
  ],
  en: [
    ['Su', 'Sunday'],
    ['Mo', 'Monday'],
    ['Tu', 'Tuesday'],
    ['We', 'Wednesday'],
    ['Th', 'Thursday'],
    ['Fr', 'Friday'],
    ['Sa', 'Saturday'],
  ],
} as const;

/**
 * The current Hijri month laid out as a calendar, with each day's Gregorian
 * number underneath — the drift between the two is the thing people are
 * actually trying to see when they convert a date.
 */
export default function HijriMonthGrid({ar, today}: {ar: boolean; today: Date}) {
  const t = (a: string, b: string) => (ar ? a : b);
  const lang: Lang = ar ? 'ar' : 'en';
  const current = hijri(today);

  let start: Date;
  let length: number;
  try {
    start = fromHijri(current.year, current.month, 1);
    const next =
      current.month === 12
        ? fromHijri(current.year + 1, 1, 1)
        : fromHijri(current.year, current.month + 1, 1);
    length = Math.round((next.getTime() - start.getTime()) / 86_400_000);
  } catch {
    // Outside the supported Hijri range; the converter above still works.
    return null;
  }

  const leading = start.getUTCDay();
  const days = Array.from({length}, (_, index) => new Date(start.getTime() + index * 86_400_000));
  const todayKey = today.toISOString().slice(0, 10);

  return (
    <section className="section panel">
      <div className="section-top">
        <h2>
          {ar ? hijriNames[current.month - 1] : hijriEnglish[current.month - 1]} {current.year}{' '}
          {t('هـ', 'AH')}
        </h2>
        <span className="sub">
          {length} {t('يوماً', 'days')} · {formatDate(lang, start, {day: 'numeric', month: 'long'})}{' '}
          – {formatDate(lang, days[length - 1], {day: 'numeric', month: 'long', year: 'numeric'})}
        </span>
      </div>
      <div className="calendar" style={{marginTop: 18}}>
        {WEEKDAYS[ar ? 'ar' : 'en'].map(([initial, name]) => (
          <span key={name} className="muted">
            <abbr title={name} style={{textDecoration: 'none'}}>
              {initial}
            </abbr>
          </span>
        ))}
        {Array.from({length: leading}, (_, index) => (
          <span key={`pad-${index}`} />
        ))}
        {days.map((date, index) => {
          const isToday = date.toISOString().slice(0, 10) === todayKey;
          return (
            <span
              key={date.toISOString()}
              className={isToday ? 'selected' : ''}
              aria-current={isToday ? 'date' : undefined}
            >
              {index + 1}
              <small className="muted" style={{display: 'block', fontSize: 11}}>
                {date.getUTCDate()}
              </small>
            </span>
          );
        })}
      </div>
      <p className="note">
        {t(
          'الرقم الكبير هجري والصغير ميلادي. الشهر الهجري 29 أو 30 يوماً، فيتقدم على الميلادي نحو أحد عشر يوماً كل سنة.',
          'The large number is Hijri, the small one Gregorian. A Hijri month is 29 or 30 days, which is why it moves about eleven days earlier each year.',
        )}
      </p>
    </section>
  );
}
