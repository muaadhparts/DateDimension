import {notFound} from 'next/navigation';
import {isLang, type Lang} from '@/lib/i18n';
import type {Metadata} from 'next';
import DateApp from '@/components/date-app';
import {cities, dateInZone} from '@/lib/calendar';
import {ROUTE_KEYS, routeFor} from '@/lib/routes';
import {SITE_URL, INDEXABLE} from '@/lib/site';
import {
  getCityPrayerTimes,
  cityMonthTimetable,
  methodSummaries,
  coordinatesForSlug,
} from '@/lib/prayers';
import {HOME_FAQ} from '@/lib/faq';
import {surahSummary, loadSurah, loadMushafPage, bareName, MUSHAF_PAGES} from '@/lib/quran';
import {pick} from '@/lib/i18n';
export const revalidate = 60;
type Params = {lang: string; path?: string[]};
function resolve(p: Params) {
  const path = p.path || [];
  const page = path[0] || '';
  const second = path[1];
  const city =
    page === 'prayer-times' && second ? cities.find((c) => c.slug === second) : undefined;
  // Surahs are addressed by number, and only the 114 that exist.
  const surahNumber =
    page === 'quran' && second && /^\d{1,3}$/.test(second) ? Number(second) : undefined;
  const surah = surahNumber ? surahSummary(surahNumber) : undefined;
  // The mushaf opens on page 1 when no page is named, the way a copy opens.
  const asked = second && /^\d{1,3}$/.test(second) ? Number(second) : undefined;
  const mushafPage =
    page !== 'mushaf'
      ? undefined
      : second === undefined
        ? 1
        : asked && asked >= 1 && asked <= MUSHAF_PAGES
          ? asked
          : undefined;

  if (
    !isLang(p.lang) ||
    !ROUTE_KEYS.includes(page as never) ||
    path.length > 2 ||
    (path.length === 2 && !city && !surah && !mushafPage)
  ) {
    notFound();
  }
  return {page, city, surah, mushafPage, path: path.join('/')};
}
export async function generateMetadata({params}: {params: Promise<Params>}): Promise<Metadata> {
  const p = await params;
  const {page, city, surah, mushafPage, path} = resolve(p);
  const ar = p.lang === 'ar';
  if (surah) {
    const name = ar ? bareName(surah) : surah.englishName;
    const where =
      surah.revelationType === 'Meccan' ? (ar ? 'مكية' : 'Meccan') : ar ? 'مدنية' : 'Medinan';
    const surahTitle = ar
      ? `سورة ${name} مكتوبة كاملة بالرسم العثماني`
      : `Surah ${name} in full, in Uthmani script`;
    const surahUrl = `${SITE_URL}/${p.lang}/quran/${surah.number}`;
    const surahDescription = ar
      ? `سورة ${name} كاملة بالرسم العثماني، وهي السورة ${surah.number} في المصحف، ${where}، وعدد آياتها ${surah.verses}. مع التنقل إلى السورة السابقة والتالية.`
      : `Surah ${name} in full in the Uthmani script — number ${surah.number} in the mushaf, ${where}, ${surah.verses} verses — with links to the surahs before and after it.`;
    return {
      title: `${surahTitle} — ${ar ? 'يومك الآن' : 'Your Day Now'}`,
      description: surahDescription,
      alternates: {
        canonical: surahUrl,
        languages: {
          ar: `${SITE_URL}/ar/quran/${surah.number}`,
          en: `${SITE_URL}/en/quran/${surah.number}`,
          'x-default': `${SITE_URL}/ar/quran/${surah.number}`,
        },
      },
      robots: {index: INDEXABLE, follow: true},
      openGraph: {
        title: surahTitle,
        description: surahDescription,
        url: surahUrl,
        siteName: 'Your Day Now',
        locale: ar ? 'ar_SA' : 'en_GB',
        alternateLocale: ar ? 'en_GB' : 'ar_SA',
        type: 'article',
        images: [{url: `${SITE_URL}/og-${p.lang}.png`, width: 1200, height: 630, alt: surahTitle}],
      },
      twitter: {
        card: 'summary_large_image',
        title: surahTitle,
        description: surahDescription,
        images: [`${SITE_URL}/og-${p.lang}.png`],
      },
    };
  }

  if (mushafPage) {
    const loaded = await loadMushafPage(mushafPage);
    const names = (loaded?.blocks || []).map((block) => (ar ? bareName(block) : block.englishName));
    const list = ar ? names.join(' و') : names.join(', ');
    const mushafTitle = ar
      ? `صفحة ${mushafPage} من المصحف بالرسم العثماني`
      : `Page ${mushafPage} of the mushaf, in Uthmani script`;
    // The page is canonical at its numbered address; /mushaf alone opens it.
    const mushafUrl = `${SITE_URL}/${p.lang}/mushaf/${mushafPage}`;
    const mushafDescription = ar
      ? `الصفحة ${mushafPage} من المصحف الشريف بترقيم طبعة المدينة، تحمل آياتها كما هي مطبوعة${list ? ` من ${list}` : ''}، مع الانتقال إلى الصفحة السابقة والتالية.`
      : `Page ${mushafPage} of the mushaf in the Madani numbering, carrying exactly the verses printed on it${list ? ` from ${list}` : ''}, with links to the pages before and after.`;
    return {
      title: `${mushafTitle} — ${ar ? 'يومك الآن' : 'Your Day Now'}`,
      description: mushafDescription,
      alternates: {
        canonical: mushafUrl,
        languages: {
          ar: `${SITE_URL}/ar/mushaf/${mushafPage}`,
          en: `${SITE_URL}/en/mushaf/${mushafPage}`,
          'x-default': `${SITE_URL}/ar/mushaf/${mushafPage}`,
        },
      },
      robots: {index: INDEXABLE, follow: true},
      openGraph: {
        title: mushafTitle,
        description: mushafDescription,
        url: mushafUrl,
        siteName: 'Your Day Now',
        locale: ar ? 'ar_SA' : 'en_GB',
        alternateLocale: ar ? 'en_GB' : 'ar_SA',
        type: 'article',
        images: [{url: `${SITE_URL}/og-${p.lang}.png`, width: 1200, height: 630, alt: mushafTitle}],
      },
      twitter: {
        card: 'summary_large_image',
        title: mushafTitle,
        description: mushafDescription,
        images: [`${SITE_URL}/og-${p.lang}.png`],
      },
    };
  }

  const title =
    (ar
      ? page === ''
        ? 'تاريخ اليوم هجري وميلادي والوقت الآن'
        : page === 'converter'
          ? 'تحويل التاريخ من هجري إلى ميلادي والعكس'
          : city
            ? `مواقيت الصلاة في ${city.ar} اليوم`
            : pick('ar', routeFor(page)!.title)
      : city
        ? `Prayer times in ${city.en} today`
        : pick('en', routeFor(page)!.title)) +
    ' — ' +
    (ar ? 'يومك الآن' : 'Your Day Now');
  const description =
    (city
      ? ar
        ? `مواقيت الصلاة في ${city.ar}. `
        : `Prayer times in ${city.en}, ${city.country}. `
      : '') + pick(p.lang as Lang, routeFor(page)!.description);
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
  const {page, city, surah: surahMeta, mushafPage, path} = resolve(p);
  const now = new Date();
  const zone = city?.zone || 'Asia/Riyadh';
  const surah = surahMeta ? await loadSurah(surahMeta.number) : null;
  const mushaf = mushafPage ? await loadMushafPage(mushafPage) : null;
  if (mushafPage && !mushaf) notFound();
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
    pick(p.lang as Lang, routeFor(page)!.title) +
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
        // The dates and times on every page are recomputed daily, so this is
        // the honest value rather than a fixed publication date.
        dateModified: dateInZone(now, zone).toISOString().slice(0, 10),
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/og-${p.lang}.png`,
          width: 1200,
          height: 630,
        },
      },
      // Only where the page actually shows the answers.
      ...(page === ''
        ? [
            {
              '@type': 'FAQPage',
              '@id': url + '#faq',
              mainEntity: HOME_FAQ.map((entry) => ({
                '@type': 'Question',
                name: pick(p.lang as Lang, entry.question),
                acceptedAnswer: {'@type': 'Answer', text: pick(p.lang as Lang, entry.answer)},
              })),
            },
          ]
        : []),
      // Only where the coordinates are on the page, which is the city routes.
      ...(city && coordinatesForSlug(city.slug)
        ? [
            {
              '@type': 'Place',
              '@id': url + '#place',
              name: p.lang === 'ar' ? city.ar : city.en,
              address: {
                '@type': 'PostalAddress',
                addressLocality: city.en,
                addressCountry: city.country,
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: coordinatesForSlug(city.slug)!.lat,
                longitude: coordinatesForSlug(city.slug)!.lon,
              },
            },
          ]
        : []),
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
        key={`${p.lang}/${page}/${city?.slug ?? surah?.number ?? mushaf?.page ?? ''}`}
        lang={p.lang as Lang}
        page={page}
        initialDate={dateInZone(now, zone).toISOString().slice(0, 10)}
        citySlug={city?.slug}
        initialPrayer={prayer}
        initialTimetable={timetable}
        methodDetails={page === 'prayer-times' ? methodSummaries() : undefined}
        surah={surah}
        mushaf={mushaf}
      />
    </>
  );
}
