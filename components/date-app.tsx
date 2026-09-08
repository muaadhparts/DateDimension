'use client';
import {useState} from 'react';
import AppShell from '@/components/layout/app-shell';
import TodayPage from '@/components/pages/today';
import ConverterPage from '@/components/pages/converter';
import PrayersPage from '@/components/pages/prayers';
import OccasionsPage from '@/components/pages/occasions';
import MonthsPage from '@/components/pages/months';
import {lazy, Suspense} from 'react';
// The surah list is 114 rows of metadata; only the Quran pages should carry it.
const QuranIndex = lazy(() => import('@/components/pages/quran-index'));
const SurahPage = lazy(() => import('@/components/pages/surah-page'));
const MushafPageView = lazy(() => import('@/components/pages/mushaf-page'));
import AboutPage from '@/components/pages/about';
import {useCivilDate, usePreferredZone, storeZone} from '@/lib/clock-store';
import {cities} from '@/lib/calendar';
import {dayView} from '@/lib/day';
import type {Lang} from '@/lib/i18n';
import type {MethodSummary, PrayerData, Timetable} from '@/lib/prayers';
import type {Surah} from '@/lib/quran/types';
import type {MushafPage} from '@/lib/quran';
import {bareName} from '@/lib/quran/text';

type Props = {
  lang: Lang;
  page: string;
  /** Civil date in the page's canonical zone, so the HTML holds no timestamp. */
  initialDate: string;
  citySlug?: string;
  initialPrayer?: PrayerData | null;
  /** The whole month for a city route, computed on the server. */
  initialTimetable?: Timetable | null;
  /** Method parameters read from the calculation library on the server. */
  methodDetails?: MethodSummary[];
  /** Loaded on the server for a /quran/{number} route. */
  surah?: Surah | null;
  /** Loaded on the server for a /mushaf/{number} route. */
  mushaf?: MushafPage | null;
};

/**
 * Chooses the page and owns the two pieces of state the pages share: which
 * time zone the visitor is looking at, and the status line the copy button
 * writes to.
 */
export default function DateApp({
  lang,
  page,
  initialDate,
  citySlug,
  initialPrayer,
  initialTimetable,
  methodDetails = [],
  surah,
  mushaf,
}: Props) {
  const routeZone = cities.find((c) => c.slug === citySlug)?.zone || 'Asia/Riyadh';
  // A city route is about that city, so its zone wins. Everywhere else the
  // visitor's own zone is the right answer, and the route zone is only what
  // the cached HTML had to say before the browser could correct it.
  const preferredZone = usePreferredZone();
  const [chosenZone, setChosenZone] = useState<string | null>(null);
  const zone = chosenZone ?? (citySlug ? routeZone : (preferredZone ?? routeZone));
  const setTimezone = (value: string) => {
    setChosenZone(value);
    storeZone(value);
  };

  const [status, setStatus] = useState('');
  const today = useCivilDate(zone, initialDate);
  const view = dayView(lang, today);
  const href = (path = '') => `/${lang}${path ? '/' + path : ''}`;

  return (
    <AppShell
      lang={lang}
      page={page}
      citySlug={citySlug}
      subject={
        surah
          ? {name: view.ar ? bareName(surah) : surah.englishName, segment: String(surah.number)}
          : mushaf
            ? {
                name: view.ar ? `صفحة ${mushaf.page}` : `Page ${mushaf.page}`,
                segment: String(mushaf.page),
              }
            : null
      }
      zone={zone}
      year={view.year}
    >
      {page === '' && (
        <TodayPage
          view={view}
          zone={zone}
          onZoneChange={setTimezone}
          status={status}
          onStatus={setStatus}
          href={href}
        />
      )}
      {page === 'converter' && <ConverterPage ar={view.ar} date={view.date} />}
      {page === 'prayer-times' && (
        <PrayersPage
          ar={view.ar}
          lang={lang}
          date={view.date}
          citySlug={citySlug}
          initial={initialPrayer}
          timetable={initialTimetable}
          methodDetails={methodDetails}
        />
      )}
      {page === 'quran' && (
        <Suspense fallback={<section className="panel empty" aria-busy="true" />}>
          {surah ? (
            <SurahPage surah={surah} lang={lang} href={href} />
          ) : (
            <QuranIndex lang={lang} href={href} />
          )}
        </Suspense>
      )}
      {page === 'mushaf' && mushaf && (
        <Suspense fallback={<section className="panel empty" aria-busy="true" />}>
          <MushafPageView page={mushaf} lang={lang} href={href} />
        </Suspense>
      )}
      {page === 'occasions' && <OccasionsPage ar={view.ar} date={view.date} />}
      {page === 'months' && <MonthsPage view={view} />}
      {page === 'about' && <AboutPage view={view} />}
    </AppShell>
  );
}
