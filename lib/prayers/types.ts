export const METHOD_IDS = ['1', '2', '3', '4', '5', '11', '13', '16'] as const;
export const SCHOOLS = ['0', '1'] as const;

export type MethodId = (typeof METHOD_IDS)[number];
export type School = (typeof SCHOOLS)[number];
export type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Sunset' | 'Maghrib' | 'Isha';

export type PrayerLocation =
  | {kind: 'coords'; lat: number; lon: number; zone?: string}
  | {kind: 'query'; city: string; country: string};

export type PrayerRequest = {
  /** Civil date in the location's own time zone, 'YYYY-MM-DD'. */
  date: string;
  method: MethodId;
  school: School;
  location: PrayerLocation;
};

/**
 * Shape kept compatible with the AlAdhan response the UI already consumes:
 * data.timings, data.date.readable, data.meta.timezone, data.meta.method.name.
 */
export type PrayerData = {
  timings: Record<PrayerName, string> & Record<string, string>;
  date: {readable: string; gregorian: {date: string}};
  meta: {
    timezone: string;
    latitude: number;
    longitude: number;
    method: {id: number; name: string; nameAr: string};
    school: School;
    /** 'local' when computed in-process, 'aladhan' when the fallback answered. */
    source: 'local' | 'aladhan';
  };
};

/** Thrown for anything the caller can fix; the API maps it to 400. */
export class InvalidPrayerRequest extends Error {
  constructor(message: string) {
    super(`Invalid ${message}`);
    this.name = 'InvalidPrayerRequest';
  }
}

/** Thrown when the times cannot be produced at all; the API maps it to 503. */
export class PrayerDataUnavailable extends Error {
  constructor(message = 'Prayer data unavailable') {
    super(message);
    this.name = 'PrayerDataUnavailable';
  }
}
