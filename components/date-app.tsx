'use client';
import {useState} from 'react';
import AppShell from '@/components/layout/app-shell';
import TodayPage from '@/components/pages/today';
import ConverterPage from '@/components/pages/converter';
import PrayersPage from '@/components/pages/prayers';
import OccasionsPage from '@/components/pages/occasions';
import MonthsPage from '@/components/pages/months';
import AboutPage from '@/components/pages/about';
import {useCivilDate, useStoredZone, storeZone} from '@/lib/clock-store';
import {cities} from '@/lib/calendar';
import {dayView} from '@/lib/day';
import type {Lang} from '@/lib/i18n';
import type {PrayerData, Timetable} from '@/lib/prayers';

type Props = {
  lang: Lang;
  page: string;
  /** Civil date in the page's canonical zone, so the HTML holds no timestamp. */
  initialDate: string;
  citySlug?: string;
  initialPrayer?: PrayerData | null;
  /** The whole month for a city route, computed on the server. */
  initialTimetable?: Timetable | null;
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
}: Props) {
  const routeZone = cities.find((c) => c.slug === citySlug)?.zone || 'Asia/Riyadh';
  const storedZone = useStoredZone();
  const [chosenZone, setChosenZone] = useState<string | null>(null);
  const zone = chosenZone ?? (citySlug ? routeZone : (storedZone ?? routeZone));
  const setTimezone = (value: string) => {
    setChosenZone(value);
    storeZone(value);
  };

  const [status, setStatus] = useState('');
  const today = useCivilDate(zone, initialDate);
  const view = dayView(lang, today);
  const href = (path = '') => `/${lang}${path ? '/' + path : ''}`;

  return (
    <AppShell lang={lang} page={page} citySlug={citySlug} zone={zone} year={view.year}>
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
        />
      )}
      {page === 'occasions' && <OccasionsPage ar={view.ar} date={view.date} />}
      {page === 'months' && <MonthsPage view={view} />}
      {page === 'about' && <AboutPage view={view} />}
    </AppShell>
  );
}
