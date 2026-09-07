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

export const MADHAB: Record<School, (typeof Madhab)[keyof typeof Madhab]> = {
  '0': Madhab.Shafi,
  '1': Madhab.Hanafi,
};
