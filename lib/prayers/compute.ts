import {Coordinates, HighLatitudeRule, PrayerTimes, SunnahTimes} from 'adhan';
import {hijri} from '../calendar.ts';
import {METHODS, MADHAB} from './methods.ts';
import {clockTime, readableDate} from './format.ts';
import type {MethodId, PrayerData, School} from './types.ts';

/**
 * Prayer times computed in-process, with no third party in the request path.
 *
 * Two deliberate deviations from adhan's defaults, both to match the tables the
 * official authorities publish:
 *
 * - HighLatitudeRule.TwilightAngle, because adhan's `recommended` rule put
 *   London's Fajr up to 32 minutes away from the published time, while the
 *   twilight-angle rule matches it to the minute.
 * - Umm al-Qura uses a 120-minute Isha interval during Ramadan, which is what
 *   the Saudi timetable does and what adhan does not do on its own.
 *
 * Times still differ from AlAdhan by up to about 4 minutes for Asr and for the
 * provider-tuned Dubai method; adhan uses higher-precision solar positions.
 */
export function computePrayerTimes(options: {
  date: string;
  lat: number;
  lon: number;
  zone: string;
  method: MethodId;
  school: School;
}): PrayerData {
  const {date, lat, lon, zone, method, school} = options;
  const [year, month, day] = date.split('-').map(Number);

  // Noon UTC, so a host in any time zone still resolves the intended civil day.
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const coordinates = new Coordinates(lat, lon);

  const params = METHODS[method].build();
  params.madhab = MADHAB[school];
  params.highLatitudeRule = HighLatitudeRule.TwilightAngle;
  if (method === '4' && hijri(noon).month === 9) params.ishaInterval = 120;

  const times = new PrayerTimes(coordinates, noon, params);
  const sunnah = new SunnahTimes(times);
  const imsak = new Date(times.fajr.getTime() - 10 * 60_000);
  const lastThird = sunnah.lastThirdOfTheNight;
  const midnight = sunnah.middleOfTheNight;
  const firstThird = new Date(midnight.getTime() - (lastThird.getTime() - midnight.getTime()));

  return {
    timings: {
      Fajr: clockTime(times.fajr, zone),
      Sunrise: clockTime(times.sunrise, zone),
      Dhuhr: clockTime(times.dhuhr, zone),
      Asr: clockTime(times.asr, zone),
      Sunset: clockTime(times.sunset, zone),
      Maghrib: clockTime(times.maghrib, zone),
      Isha: clockTime(times.isha, zone),
      Imsak: clockTime(imsak, zone),
      Midnight: clockTime(midnight, zone),
      Firstthird: clockTime(firstThird, zone),
      Lastthird: clockTime(lastThird, zone),
    },
    date: {readable: readableDate(date), gregorian: {date: date.split('-').reverse().join('-')}},
    meta: {
      timezone: zone,
      latitude: lat,
      longitude: lon,
      method: {id: METHODS[method].id, name: METHODS[method].name, nameAr: METHODS[method].nameAr},
      school,
      source: 'local',
    },
  };
}
