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
          'المواقيت تُحسب داخل هذا الموقع بمكتبة adhan مفتوحة المصدر، بلا خدمة خارجية في مسار الطلب. تختار طريقة الحساب ومذهب العصر، وتُطبَّق قاعدة زاوية الشفق في خطوط العرض العالية، وفاصل العشاء 120 دقيقة لأم القرى في رمضان كما في الجدول السعودي. الفروق عن الجداول الأخرى تصل إلى نحو أربع دقائق، غالبًا في العصر، لاختلاف الحسابات الفلكية. المدن غير المدرجة تُحدَّد إحداثياتها مرة واحدة عبر Open-Meteo ثم تُحسب هنا.',
          'Times are computed in this site with the open-source adhan library, with no external service in the request path. You choose the calculation method and Asr convention; the twilight-angle rule applies at high latitudes, and Umm al-Qura uses the 120-minute Ramadan Isha interval as the Saudi timetable does. Differences from other timetables reach about four minutes, usually on Asr, because the astronomical models differ. A city outside the listed ones is geocoded once through Open-Meteo and then calculated here.',
        )}
      </p>
      <a href="https://github.com/batoulapps/adhan-js">
        adhan-js · {t('مكتبة الحساب', 'The calculation library')}
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
          'نحفظ اختيار المنطقة الزمنية في متصفحك فقط. البحث عن مدينة غير مدرجة يرسل اسمها إلى خدمة Open-Meteo لتحديد الإحداثيات مرة واحدة؛ لا تُرسل إحداثيات موقعك إلى أي طرف خارجي ولا تُسجَّل. لا يحوي الموقع إعلانات ولا تتبعاً.',
          'Your time-zone preference is saved only in your browser. Searching for a city outside the listed ones sends its name to Open-Meteo once, to resolve coordinates; your own coordinates are never sent to a third party and never logged. The site carries no ads and no tracking.',
        )}
      </p>
    </section>
  );
}
