'use client';
import type {MethodSummary} from '@/lib/prayers';

/**
 * What the calculation method selector actually changes. The angles come from
 * the library the times are computed with, so the table cannot drift from the
 * numbers in use.
 */
export default function MethodGuide({methods, ar}: {methods: MethodSummary[]; ar: boolean}) {
  const t = (a: string, b: string) => (ar ? a : b);

  return (
    <section className="section panel">
      <h2>{t('ما الذي تغيّره طريقة الحساب؟', 'What does the calculation method change?')}</h2>
      <p className="article">
        {t(
          'الظهر والعصر والمغرب تُحسب من موضع الشمس نفسه، فلا تكاد تختلف بين الطرق. الاختلاف كله في الفجر والعشاء: متى يُعدّ الشفق قد بدأ وانتهى. تحدد كل جهة زاوية انخفاض الشمس تحت الأفق التي تعتمدها، فتتقدم المواقيت أو تتأخر بدقائق.',
          'Dhuhr, Asr and Maghrib follow the sun’s position and barely differ between methods. The disagreement is about Fajr and Isha: when twilight is judged to begin and end. Each authority sets the angle of the sun below the horizon it accepts, which moves those two times by minutes.',
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
              <th>{t('الطريقة', 'Method')}</th>
              <th>{t('زاوية الفجر', 'Fajr angle')}</th>
              <th>{t('العشاء', 'Isha')}</th>
              <th>{t('تُستخدم في', 'Used in')}</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((method) => (
              <tr key={method.id}>
                <td>{ar ? method.nameAr : method.name}</td>
                <td style={{direction: 'ltr'}}>{method.fajrAngle}°</td>
                <td style={{direction: 'ltr'}}>
                  {method.ishaInterval
                    ? t(
                        `${method.ishaInterval} دقيقة بعد المغرب`,
                        `${method.ishaInterval} min after Maghrib`,
                      )
                    : `${method.ishaAngle}°`}
                </td>
                <td className="sub">{ar ? method.authority.ar : method.authority.en}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note article">
        {t(
          'أم القرى لا تستخدم زاوية للعشاء بل فاصلاً ثابتاً بعد المغرب، ويصير 120 دقيقة في رمضان كما في الجدول الرسمي. وفي خطوط العرض العالية، حيث لا يغيب الشفق تماماً في الصيف، تُقدَّر مواقيت الفجر والعشاء بقاعدة الزاوية.',
          'Umm al-Qura sets Isha as a fixed interval after Maghrib rather than an angle, and stretches it to 120 minutes during Ramadan as the official timetable does. At high latitudes, where twilight does not fully end in summer, Fajr and Isha are estimated with the twilight-angle rule.',
        )}
      </p>

      <h2 style={{marginTop: 30}}>{t('لماذا للعصر وقتان؟', 'Why are there two times for Asr?')}</h2>
      <p className="article">
        {t(
          'العصر يبدأ حين يبلغ ظل الشيء طولاً معيناً. عند الجمهور — الشافعي والمالكي والحنبلي — يكون ذلك حين يصير ظل الشيء مثله زائداً ظل الزوال. وعند الحنفية حين يصير مثليه، فيتأخر العصر نحو ساعة في العادة. الخيار أعلاه يغيّر وقت العصر وحده ولا يمس بقية المواقيت.',
          'Asr begins when an object’s shadow reaches a set length. For the majority — Shafi, Maliki and Hanbali — that is when the shadow equals the object plus its noon shadow. The Hanafi school waits until it is twice the object, which typically puts Asr about an hour later. The selector above changes Asr alone; the other times are unaffected.',
        )}
      </p>
    </section>
  );
}
