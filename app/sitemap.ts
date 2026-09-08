import type {MetadataRoute} from 'next';
import {cities} from '@/lib/calendar';
import {LANGS} from '@/lib/i18n';
import {SURAHS} from '@/lib/quran';
import {ROUTE_KEYS} from '@/lib/routes';
import {SITE_URL} from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...ROUTE_KEYS,
    ...cities.map((city) => `prayer-times/${city.slug}`),
    ...SURAHS.map((surah) => `quran/${surah.number}`),
  ];

  return LANGS.flatMap((lang) =>
    paths.map((path) => ({url: `${SITE_URL}/${lang}${path ? '/' + path : ''}`})),
  );
}
