'use client';
import {hijri, fromHijri, hijriNames, hijriEnglish} from '@/lib/calendar';
import {formatDate} from '@/lib/day';
import type {Lang} from '@/lib/i18n';

export default function Occasions({ar, date}: {ar: boolean; date: Date}) {
  const t = (a: string, b: string) => (ar ? a : b);
  const h = hijri(date);
  const events: [[number, number], string, string][] = [
    [[9, 1], 'بداية رمضان', 'Ramadan begins'],
    [[10, 1], 'عيد الفطر', 'Eid al-Fitr'],
    [[12, 9], 'يوم عرفة', 'Day of Arafah'],
    [[12, 10], 'عيد الأضحى', 'Eid al-Adha'],
    [[1, 1], 'رأس السنة الهجرية', 'Islamic New Year'],
    [[1, 10], 'عاشوراء', 'Ashura'],
    [[3, 12], 'المولد النبوي', 'Mawlid (observed in some countries)'],
  ];
  const list = events
    .map(([md, a, b]) => {
      let y = h.year;
      let d = fromHijri(y, md[0], md[1]);
      if (d < date) {
        y++;
        d = fromHijri(y, md[0], md[1]);
      }
      return {
        a,
        b,
        d,
        y,
        m: md[0],
        day: md[1],
        remaining: Math.round((d.getTime() - date.getTime()) / 86400000),
      };
    })
    .sort((a, b) => a.d.getTime() - b.d.getTime());

  // The same events for the coming years. fromHijri is a binary search, so this
  // is 35 conversions — cheap on the server, and the page is cached anyway.
  const lang: Lang = ar ? 'ar' : 'en';
  const years = [0, 1, 2, 3, 4].map((offset) => h.year + offset);
  const outlook = events.map(([md, arabic, latin]) => ({
    name: ar ? arabic : latin,
    dates: years.map((year) => {
      try {
        return fromHijri(year, md[0], md[1]);
      } catch {
        // Outside the 1356-1500 AH range the converter supports.
        return null;
      }
    }),
  }));
  return (
    <>
      <div className="events">
        {list.map((e) => (
          <section className="panel event" key={e.a}>
            <div className="event-num">{e.day}</div>
            <div>
              <span className="tag">
                {e.remaining === 0
                  ? t('اليوم', 'Today')
                  : t(`بعد ${e.remaining} يوماً`, `In ${e.remaining} days`)}
              </span>
              <h2 style={{margin: '8px 0'}}>{ar ? e.a : e.b}</h2>
              <p>
                {e.day} {ar ? hijriNames[e.m - 1] : hijriEnglish[e.m - 1]} {e.y}
              </p>
              <span className="sub">
                {new Intl.DateTimeFormat(ar ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', {
                  dateStyle: 'long',
                  timeZone: 'UTC',
                }).format(e.d)}
              </span>
            </div>
          </section>
        ))}
      </div>
      <section className="section panel">
        <div className="section-top">
          <h2>{t('المناسبات في السنوات القادمة', 'These occasions in the coming years')}</h2>
          <span className="sub">
            {years[0]}–{years[years.length - 1]} {t('هـ', 'AH')}
          </span>
        </div>
        <p className="note">
          {t(
            'تواريخ حسابية وفق أم القرى. بداية الشهر تُعلن بالرؤية في كثير من البلدان، فقد يتقدم التاريخ أو يتأخر يوماً واحداً.',
            'Calculated with Umm al-Qura. Many countries announce the month by sighting, so a date can move by a day either way.',
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
                <th>{t('المناسبة', 'Occasion')}</th>
                {years.map((year) => (
                  <th key={year} style={{direction: 'ltr'}}>
                    {year} {t('هـ', 'AH')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outlook.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  {row.dates.map((date, index) => (
                    <td key={years[index]} className="sub">
                      {date
                        ? formatDate(lang, date, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="note">
        {t(
          'التواريخ محسوبة وفق أم القرى، وقد تختلف بحسب رؤية الهلال والبلد. عرض المناسبة لا يعني أنها عطلة رسمية في جميع الدول. تبدأ الليلة الهجرية عند غروب اليوم السابق؛ العد التنازلي هنا لأيام التقويم، وليس لحظة بدء المناسبة شرعاً.',
          'Dates use Umm al-Qura and can vary by local moon sighting. Inclusion does not mean a public holiday in every country. The Hijri night begins at the preceding sunset; these countdowns count calendar days rather than the religious start instant.',
        )}
      </p>
    </>
  );
}
