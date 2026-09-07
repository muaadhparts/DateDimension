import {hijri} from '../calendar.ts';
import {computePrayerTimes} from './compute.ts';
import {coordinatesForSlug} from './coordinates.ts';
import type {MethodId, PrayerName, School} from './types.ts';

export type TimetableRow = {
  /** 'YYYY-MM-DD'. */
  date: string;
  day: number;
  hijri: {year: number; month: number; day: number};
  timings: Record<PrayerName, string>;
};

export type Timetable = {
  city: string;
  zone: string;
  year: number;
  /** 1-12. */
  month: number;
  method: MethodId;
  school: School;
  rows: TimetableRow[];
};

/**
 * A whole month of prayer times for one city, computed locally. This is only
 * affordable because nothing here calls out: the same page used to cost one
 * request to a third party for a single day.
 */
export function cityMonthTimetable(
  slug: string,
  year: number,
  month: number,
  method: MethodId = '3',
  school: School = '0',
): Timetable | null {
  const coordinates = coordinatesForSlug(slug);
  if (!coordinates) return null;

  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const rows: TimetableRow[] = [];

  for (let day = 1; day <= days; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const {timings} = computePrayerTimes({date, ...coordinates, method, school});
    rows.push({
      date,
      day,
      hijri: hijri(new Date(date + 'T00:00:00Z')),
      timings: timings as Record<PrayerName, string>,
    });
  }

  return {city: slug, zone: coordinates.zone, year, month, method, school, rows};
}
