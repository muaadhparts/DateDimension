'use client';
import AppLink from '@/components/layout/app-link';
import type {DayView} from '@/lib/day';
import {ARTWORK_SOURCE} from '@/lib/quran/artwork';

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
      <AppLink href="https://github.com/batoulapps/adhan-js">
        adhan-js · {t('مكتبة الحساب', 'The calculation library')}
      </AppLink>
      <h2 style={{marginTop: 25}}>{t('المناسبات وصلاة العيد', 'Occasions and Eid prayer')}</h2>
      <p>
        {t(
          'المناسبات المعروضة تواريخ تقويمية وليست تأكيداً لعطلة رسمية. يوم العيد ووقت صلاته يحددهما الإعلان المحلي؛ لا ننشر وقتاً تقديرياً على أنه موعد مسجد معتمد.',
          'Occasion dates are calendar estimates, not confirmation of public holidays. Local authorities determine Eid dates and prayer schedules. We do not present an estimate as an official mosque time.',
        )}
      </p>
      <h2>{t('القرآن الكريم', 'The Quran')}</h2>
      <p>
        {t(
          'النص القرآني بالرسم العثماني من مشروع تنزيل، محفوظ محليًا دون تعديل. صور صفحات مصحف المدينة برواية حفص من مصحف مجمع الملك فهد عبر Quranpedia، وتحافظ على السطور عند تغيير حجم الشاشة. تُحمّل الصور عبر خادم الموقع؛ إذا تعذّر تحميلها يبقى النص متاحًا للقراءة والنسخ.',
          'Unmodified Tanzil Uthmani text is stored locally. Hafs Madinah mushaf page artwork from the King Fahd Complex via Quranpedia preserves printed lines across screen sizes. Images load through this site’s server; if unavailable, the text remains available for reading and copying.',
        )}
      </p>
      <p>
        <AppLink href="https://tanzil.net/docs/Text_License">Tanzil</AppLink> ·{' '}
        <AppLink href={ARTWORK_SOURCE}>Quranpedia</AppLink>
      </p>
      <h2>{t('أين أنت', 'Where you are')}</h2>
      <p>
        {t(
          'الصفحات تُخزَّن نسخة واحدة للجميع، فلا يمكن أن تصل إليك وفيها منطقتك الزمنية. لذلك يقرأها متصفحك بنفسه بعد فتح الصفحة — من إعداد جهازك، بلا إذن ولا طلب شبكة — ويصحّح الساعة والتاريخ. وإن اخترت منطقة من القائمة فاختيارك يسبق إعداد الجهاز ويُحفظ في متصفحك.',
          'Every page is one cached copy shared by all visitors, so it cannot arrive carrying your time zone. Your browser reads it instead once the page opens — from your device settings, with no permission prompt and no network request — and corrects the clock and the date. If you pick a zone from the list, your choice comes before the device setting and is remembered in your browser.',
        )}
      </p>
      <p>
        {t(
          'صفحة المواقيت تسأل مرة واحدة عن الدولة أو المدينة التي يأتي منها اتصالك، وتعرض مواقيت ذلك المكان بدل مكان افتراضي. هذا تقدير من عنوان الاتصال وقد يخطئ خلف VPN، ولذلك يُكتب أنه تقدير ويبقى الحقل قابلاً للتعديل. موقعك الدقيق لا يُقرأ إلا بضغطك «استخدم موقعي» وبإذن المتصفح.',
          'The prayer page asks once which country or city your connection comes from, and shows that place instead of a default one. It is an estimate from your connection and can be wrong behind a VPN, which is why it is labelled as an estimate and the field stays editable. Your precise location is read only when you press “Use my location” and allow it.',
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
