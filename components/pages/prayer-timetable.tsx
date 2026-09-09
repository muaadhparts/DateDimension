'use client';
import {hijriEnglish, hijriNames, english, months as arabicMonths} from '@/lib/calendar';
import type {Timetable} from '@/lib/prayers';

const COLUMNS: [keyof Timetable['rows'][number]['timings'], string, string][] = [
  ['Fajr', 'الفجر', 'Fajr'],
  ['Sunrise', 'الشروق', 'Sunrise'],
  ['Dhuhr', 'الظهر', 'Dhuhr'],
  ['Asr', 'العصر', 'Asr'],
  ['Maghrib', 'المغرب', 'Maghrib'],
  ['Isha', 'العشاء', 'Isha'],
];

/**
 * The month's timetable for one city. Server-rendered from a local
 * computation, so it costs no request and is in the HTML before JavaScript.
 */
export default function PrayerTimetable({
  timetable,
  cityName,
  ar,
  today,
  coordinates,
}: {
  timetable: Timetable;
  cityName: string;
  ar: boolean;
  today: string;
  coordinates?: {lat: number; lon: number};
}) {
  const t = (a: string, b: string) => (ar ? a : b);
  const monthName = ar ? arabicMonths[timetable.month - 1] : english[timetable.month - 1];

  // A month usually spans two Hijri months; name both rather than just the first.
  const hijriSpan = [...new Set(timetable.rows.map((row) => row.hijri.month))].map((month) =>
    ar ? hijriNames[month - 1] : hijriEnglish[month - 1],
  );

  return (
    <section className="section panel">
      <div className="section-top">
        <h2>
          {t(
            `مواقيت الصلاة في ${cityName} خلال ${monthName}`,
            `Prayer times in ${cityName} through ${monthName}`,
          )}
        </h2>
        <span className="sub">
          {hijriSpan.join(t(' و', ' / '))} {timetable.rows[0].hijri.year} {t('هـ', 'AH')}
        </span>
      </div>
      {coordinates && (
        <p className="sub" style={{marginTop: 6}}>
          {t('الإحداثيات المستخدمة في الحساب', 'The coordinates used in the calculation')}:{' '}
          <span style={{direction: 'ltr', display: 'inline-block'}}>
            {coordinates.lat.toFixed(4)}, {coordinates.lon.toFixed(4)}
          </span>{' '}
          · {timetable.zone}
        </p>
      )}
      <p className="note">
        {t(
          'الجدول محسوب لكامل الشهر بنفس الطريقة والمذهب المختارين أعلاه. الأوقات بتوقيت المدينة نفسها.',
          'The whole month, calculated with the method and school selected above. Times are in the city’s own zone.',
        )}
      </p>
      <div
        className="table-wrap"
        tabIndex={0}
        role="region"
        aria-label={t('جدول قابل للتمرير أفقيًا', 'Horizontally scrollable table')}
      >
        <table>
          <thead>
            <tr>
              <th>{t('اليوم', 'Day')}</th>
              <th>{t('هجري', 'Hijri')}</th>
              {COLUMNS.map(([key, arabic, latin]) => (
                <th key={key}>{ar ? arabic : latin}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timetable.rows.map((row) => (
              <tr key={row.date} className={row.date === today ? 'current' : ''}>
                <td>{row.day}</td>
                <td className="sub">{row.hijri.day}</td>
                {COLUMNS.map(([key]) => (
                  <td key={key} style={{direction: 'ltr'}}>
                    {row.timings[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
