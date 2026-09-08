import type {MetadataRoute} from 'next';
import {cities} from '@/lib/calendar';
import {LANGS} from '@/lib/i18n';
import {SURAHS, MUSHAF_PAGES} from '@/lib/quran';
import {ROUTE_KEYS} from '@/lib/routes';
import {SITE_URL} from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    // Bare /mushaf only opens page 1, which is canonical at its own address.
    ...ROUTE_KEYS.filter((key) => key !== 'mushaf'),
    ...cities.map((city) => `prayer-times/${city.slug}`),
    ...SURAHS.map((surah) => `quran/${surah.number}`),
    ...Array.from({length: MUSHAF_PAGES}, (_, index) => `mushaf/${index + 1}`),
  ];

  return LANGS.flatMap((lang) =>
    paths.map((path) => ({url: `${SITE_URL}/${lang}${path ? '/' + path : ''}`})),
  );
}
