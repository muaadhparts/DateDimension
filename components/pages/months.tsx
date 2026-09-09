'use client';
import {hijriNames, hijriEnglish, months, english, levant, maghreb} from '@/lib/calendar';
import type {DayView} from '@/lib/day';

export default function MonthsPage({view}: {view: DayView}) {
  const {ar, month} = view;
  const t = (a: string, b: string) => (ar ? a : b);

  return (
    <>
      <section className="panel">
        <h2>{t('الأشهر الميلادية', 'Gregorian months')}</h2>
        <p>
          {t(
            'المسميات الشائعة في العالم العربي. قد تختلف التهجئة بين البلدان.',
            'Common names across the Arab world. Spellings vary between countries.',
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
                {[
                  t('الترتيب', 'No.'),
                  t('العربية الشائعة', 'Common Arabic'),
                  t('بلاد الشام والعراق', 'Levant & Iraq'),
                  t('مسميات مغاربية', 'Maghreb variants'),
                  'English',
                  t('عدد الأيام', 'Days'),
                ].map((n) => (
                  <th key={n}>{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((n, i) => (
                <tr key={n} className={month === i ? 'current' : ''}>
                  <td>{i + 1}</td>
                  <td lang="ar">{n}</td>
                  <td lang="ar">{levant[i]}</td>
                  <td lang="ar">{maghreb[i]}</td>
                  <td lang="en">{english[i]}</td>
                  <td>{i === 1 ? '28 / 29' : new Date(Date.UTC(2026, i + 1, 0)).getUTCDate()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel section">
        <h2>{t('الأشهر الهجرية', 'Hijri months')}</h2>
        <p>
          {t(
            'الأشهر الهجرية مستقلة عن الميلادية؛ يتكون الشهر من 29 أو 30 يوماً.',
            'Hijri months are independent of Gregorian months and contain 29 or 30 days.',
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
                <th>#</th>
                <th>{t('الشهر', 'Month')}</th>
                <th>{t('الاسم بالإنجليزية', 'English name')}</th>
              </tr>
            </thead>
            <tbody>
              {hijriNames.map((n, i) => (
                <tr key={n}>
                  <td>{i + 1}</td>
                  <td lang="ar">{n}</td>
                  <td lang="en">{hijriEnglish[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
