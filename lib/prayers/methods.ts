import {CalculationMethod, Madhab} from 'adhan';
import type {MethodId, School} from './types.ts';

type Parameters = ReturnType<typeof CalculationMethod.MuslimWorldLeague>;

/**
 * The eight AlAdhan method ids the UI offers, mapped to adhan's own parameter
 * builders. The labels are the ones the selector already showed, so the visible
 * text does not change with the switch to local computation.
 */
export const METHODS: Record<
  MethodId,
  {id: number; name: string; nameAr: string; build: () => Parameters}
> = {
  '1': {
    id: 1,
    name: 'University of Islamic Sciences, Karachi',
    nameAr: 'جامعة كراتشي',
    build: CalculationMethod.Karachi,
  },
  '2': {
    id: 2,
    name: 'Islamic Society of North America (ISNA)',
    nameAr: 'أمريكا الشمالية – ISNA',
    build: CalculationMethod.NorthAmerica,
  },
  '3': {
    id: 3,
    name: 'Muslim World League',
    nameAr: 'رابطة العالم الإسلامي',
    build: CalculationMethod.MuslimWorldLeague,
  },
  '4': {
    id: 4,
    name: 'Umm Al-Qura University, Makkah',
    nameAr: 'أم القرى – مكة',
    build: CalculationMethod.UmmAlQura,
  },
  '5': {
    id: 5,
    name: 'Egyptian General Authority of Survey',
    nameAr: 'الهيئة المصرية للمساحة',
    build: CalculationMethod.Egyptian,
  },
  '11': {
    id: 11,
    name: 'Majlis Ugama Islam Singapura, Singapore',
    nameAr: 'مجلس سنغافورة الإسلامي',
    build: CalculationMethod.Singapore,
  },
  '13': {
    id: 13,
    name: 'Diyanet İşleri Başkanlığı, Turkey',
    nameAr: 'رئاسة الشؤون الدينية التركية',
    build: CalculationMethod.Turkey,
  },
  '16': {id: 16, name: 'Dubai', nameAr: 'دبي', build: CalculationMethod.Dubai},
};

/**
 * Who publishes each method, for the comparison table. The angles themselves
 * are read from the library rather than restated here, so the table cannot
 * drift from the numbers actually used in the calculation.
 */
export const METHOD_AUTHORITIES: Record<MethodId, {ar: string; en: string}> = {
  '1': {ar: 'باكستان والهند وبنغلاديش وأفغانستان', en: 'Pakistan, India, Bangladesh, Afghanistan'},
  '2': {ar: 'أمريكا الشمالية', en: 'North America'},
  '3': {
    ar: 'أوروبا والشرق الأقصى وأجزاء من أمريكا',
    en: 'Europe, the Far East, parts of the Americas',
  },
  '4': {ar: 'السعودية', en: 'Saudi Arabia'},
  '5': {
    ar: 'مصر وسوريا والعراق ولبنان وأجزاء من أفريقيا',
    en: 'Egypt, Syria, Iraq, Lebanon, parts of Africa',
  },
  '11': {ar: 'سنغافورة وماليزيا وإندونيسيا', en: 'Singapore, Malaysia, Indonesia'},
  '13': {ar: 'تركيا', en: 'Türkiye'},
  '16': {ar: 'الإمارات', en: 'United Arab Emirates'},
};

export type MethodSummary = {
  id: MethodId;
  name: string;
  nameAr: string;
  /** Degrees below the horizon that define Fajr. */
  fajrAngle: number;
  /** Either an angle for Isha, or a fixed interval after Maghrib in minutes. */
  ishaAngle: number | null;
  ishaInterval: number | null;
  authority: {ar: string; en: string};
};

/** Reads each method's real parameters out of the library. */
export function methodSummaries(): MethodSummary[] {
  return (Object.keys(METHODS) as MethodId[]).map((id) => {
    const params = METHODS[id].build();
    const interval = params.ishaInterval > 0 ? params.ishaInterval : null;
    return {
      id,
      name: METHODS[id].name,
      nameAr: METHODS[id].nameAr,
      fajrAngle: params.fajrAngle,
      ishaAngle: interval ? null : params.ishaAngle,
      ishaInterval: interval,
      authority: METHOD_AUTHORITIES[id],
    };
  });
}

export const MADHAB: Record<School, (typeof Madhab)[keyof typeof Madhab]> = {
  '0': Madhab.Shafi,
  '1': Madhab.Hanafi,
};
