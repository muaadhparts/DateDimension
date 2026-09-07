'use client';
import type {DayView} from '@/lib/day';

export default function AboutPage({view}: {view: DayView}) {
  const {ar} = view;
  const t = (a: string, b: string) => (ar ? a : b);

  return (
    <section className="panel article">
      <h2>{t('عن يومك الآن', 'About Your Day Now')}</h2>
      <p>
        {t(
          'موقع معلومات مجاني يجمع التاريخ والوقت والتحويل ومواقيت الصلاة في أدوات واضحة، دون حساب مستخدم أو إعلانات حالياً.',
          'A free information site combining dates, time, conversion and prayer times in focused tools. No account or ads are currently required.',
        )}
      </p>
      <h2>{t('التاريخ والوقت', 'Date and time')}</h2>
      <p>
        {t(
          'الوقت الحي من ساعة جهازك، وتحويل المناطق الزمنية من قاعدة IANA عبر Intl. التقويم الهجري هو أم القرى عبر ICU؛ يدعم المحول السنوات 1356–1500 هـ. لا يعتمد الموقع على الرؤية الشرعية المحلية.',
          'The live clock uses your device time. IANA time zones are interpreted through Intl. Hijri calculations use ICU’s Umm al-Qura calendar, with conversion supported for 1356–1500 AH. This does not replace local moon-sighting announcements.',
        )}
      </p>
      <h2>{t('مواقيت الصلاة', 'Prayer times')}</h2>
      <p>
        {t(
          'المصدر AlAdhan. يمكنك اختيار طريقة الحساب ومذهب العصر. النتائج حسابية وقد تختلف عن التقويم الرسمي أو موعد الإقامة. في المناطق القطبية قد لا تتوفر بعض الأوقات، ويجب الرجوع إلى المرجعية المحلية.',
          'Data comes from AlAdhan. Select a calculation method and Asr convention. Results are calculated and may differ from official timetables or congregation times. Some times may be unavailable in polar regions; consult local guidance.',
        )}
      </p>
      <a href="https://aladhan.com/prayer-times-api">
        AlAdhan · {t('توثيق المصدر', 'Source documentation')}
      </a>
      <h2 style={{marginTop: 25}}>{t('المناسبات وصلاة العيد', 'Occasions and Eid prayer')}</h2>
      <p>
        {t(
          'المناسبات المعروضة تواريخ تقويمية وليست تأكيداً لعطلة رسمية. يوم العيد ووقت صلاته يحددهما الإعلان المحلي؛ لا ننشر وقتاً تقديرياً على أنه موعد مسجد معتمد.',
          'Occasion dates are calendar estimates, not confirmation of public holidays. Local authorities determine Eid dates and prayer schedules. We do not present an estimate as an official mosque time.',
        )}
      </p>
      <h2>{t('الخصوصية', 'Privacy')}</h2>
      <p>
        {t(
          'نحفظ اختيار المنطقة الزمنية في متصفحك فقط. عند البحث عن الصلاة تُرسل المدينة والدولة، أو الإحداثيات بعد موافقتك على تحديد الموقع، إلى AlAdhan لحساب المواقيت. لا يوجد تتبع إعلاني في التطبيق. وقد تحتفظ جهة الاستضافة بسجلات الطلبات التشغيلية.',
          'Your time-zone preference is saved only in your browser. Prayer searches send the city and country, or coordinates after you grant location permission, to AlAdhan. The app contains no advertising trackers. The hosting provider may retain operational request logs.',
        )}
      </p>
    </section>
  );
}
