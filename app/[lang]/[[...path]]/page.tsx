import {notFound} from 'next/navigation';
import type {Lang} from '@/lib/i18n';
import type {Metadata} from 'next';
import DateApp from '@/components/date-app';
import {cities, routes, titles, dateInZone} from '@/lib/calendar';
import {SITE_URL, INDEXABLE} from '@/lib/site';
import {getCityPrayerTimes, cityMonthTimetable, methodSummaries} from '@/lib/prayers';
export const revalidate = 60;
type Params = {lang: string; path?: string[]};
function resolve(p: Params) {
  const path = p.path || [],
    page = path[0] || '',
    city = path[1] ? cities.find((c) => c.slug === path[1]) : undefined;
  if (
    !['ar', 'en'].includes(p.lang) ||
    !routes.includes(page) ||
    path.length > 2 ||
    (path.length === 2 && (page !== 'prayer-times' || !city))
  )
    notFound();
  return {page, city, path: path.join('/')};
}
export async function generateMetadata({params}: {params: Promise<Params>}): Promise<Metadata> {
  const p = await params;
  const {page, city, path} = resolve(p);
  const ar = p.lang === 'ar';
  const title =
    (ar
      ? page === ''
        ? 'تاريخ اليوم هجري وميلادي والوقت الآن'
        : page === 'converter'
          ? 'تحويل التاريخ من هجري إلى ميلادي والعكس'
          : city
            ? `مواقيت الصلاة في ${city.ar} اليوم`
            : titles[page][0]
      : city
        ? `Prayer times in ${city.en} today`
        : titles[page][1]) +
    ' — ' +
    (ar ? 'يومك الآن' : 'Your Day Now');
  const descriptions: Record<string, [string, string]> = {
    '': [
      'تاريخ اليوم هجري وميلادي والوقت الآن حسب منطقتك الزمنية، مع اسم الشهر وعدد أيامه والتقويم واختصارات تحويل التاريخ والصلاة.',
      'Today’s Hijri and Gregorian date, live local time, month names, days remaining and calendar, with date conversion and prayer tools.',
    ],
    converter: [
      'حوّل التاريخ من هجري إلى ميلادي والعكس وفق أم القرى. أدخل اليوم والشهر والسنة لتحصل على النتيجة مباشرة.',
      'Convert Hijri to Gregorian and Gregorian to Hijri using Umm al-Qura. Enter a date for an immediate result.',
    ],
    'prayer-times': [
      'مواقيت الفجر والشروق والظهر والعصر والمغرب والعشاء حسب المدينة والتاريخ وطريقة الحساب، مع معلومات صلاة العيد.',
      'Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha by city, date and calculation method, with guidance on Eid prayer schedules.',
    ],
    occasions: [
      'مواعيد رمضان وعيد الفطر ويوم عرفة وعيد الأضحى والمناسبات الإسلامية القادمة وفق أم القرى، مع توضيح اختلاف الرؤية المحلية.',
      'Upcoming Ramadan, Eid al-Fitr, Arafah and Eid al-Adha dates using Umm al-Qura, with local observation caveats.',
    ],
    months: [
      'أسماء الأشهر الميلادية بالعربية والإنجليزية ومسمياتها في الشام والعراق والمغرب العربي، وأسماء الأشهر الهجرية وعدد الأيام.',
      'Gregorian month names in English and Arabic, Levantine and Maghreb variants, plus Hijri months and month lengths.',
    ],
    about: [
      'مصادر بيانات يومك الآن، منهجية حساب أم القرى ومواقيت الصلاة، حدود الدقة وسياسة الخصوصية.',
      'Your Day Now data sources, Umm al-Qura and prayer calculation methods, accuracy limitations and privacy.',
    ],
  };
  const description =
    (city
      ? ar
        ? `مواقيت الصلاة في ${city.ar}. `
        : `Prayer times in ${city.en}, ${city.country}. `
      : '') + descriptions[page][ar ? 0 : 1];
  const url = `${SITE_URL}/${p.lang}${path ? '/' + path : ''}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ar: `${SITE_URL}/ar${path ? '/' + path : ''}`,
        en: `${SITE_URL}/en${path ? '/' + path : ''}`,
        'x-default': `${SITE_URL}/ar${path ? '/' + path : ''}`,
      },
    },
    robots: {index: INDEXABLE, follow: true},
    openGraph: {
      title,
      description,
      url,
      siteName: 'Your Day Now',
      // ar_AR is Argentina; the Arabic locale for this site is ar_SA.
      locale: ar ? 'ar_SA' : 'en_GB',
      alternateLocale: ar ? 'en_GB' : 'ar_SA',
      type: 'website',
      images: [{url: `${SITE_URL}/og-${p.lang}.png`, width: 1200, height: 630, alt: title}],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/og-${p.lang}.png`],
    },
  };
}
export default async function Page({params}: {params: Promise<Params>}) {
  const p = await params;
  const {page, city, path} = resolve(p);
  const now = new Date();
  const zone = city?.zone || 'Asia/Riyadh';
  let prayer = null;
  let timetable = null;
  if (page === 'prayer-times') {
    const c = city || cities[0];
    const localDate = dateInZone(now, c.zone).toISOString().slice(0, 10);
    prayer = getCityPrayerTimes(c.slug, localDate);
    // Only the city routes get the month: on the search page the visitor has
    // not chosen a place yet, and a table for a default city would mislead.
    if (city) {
      const [year, month] = localDate.split('-').map(Number);
      timetable = cityMonthTimetable(city.slug, year, month);
    }
  }
  const url = `${SITE_URL}/${p.lang}${path ? '/' + path : ''}`;
  const name =
    titles[page][p.lang === 'ar' ? 0 : 1] +
    (city ? ' · ' + (p.lang === 'ar' ? city.ar : city.en) : '');
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': SITE_URL + '/#website',
        name: 'يومك الآن',
        alternateName: 'Your Day Now',
        url: SITE_URL,
        inLanguage: ['ar', 'en'],
      },
      {
        '@type': 'WebPage',
        '@id': url + '#webpage',
        url,
        name,
        inLanguage: p.lang,
        isPartOf: {'@id': SITE_URL + '/#website'},
      },
      ...(page
        ? [
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: p.lang === 'ar' ? 'الرئيسية' : 'Home',
                  item: SITE_URL + '/' + p.lang,
                },
                {'@type': 'ListItem', position: 2, name, item: url},
              ],
            },
          ]
        : []),
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(structured).replace(/</g, '\\u003c')}}
      />
      <DateApp
        lang={p.lang as Lang}
        page={page}
        initialDate={dateInZone(now, zone).toISOString().slice(0, 10)}
        citySlug={city?.slug}
        initialPrayer={prayer}
        initialTimetable={timetable}
        methodDetails={page === 'prayer-times' ? methodSummaries() : undefined}
      />
    </>
  );
}
