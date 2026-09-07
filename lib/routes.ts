import type {Bi} from './i18n.ts';

export type RouteKey = '' | 'converter' | 'prayer-times' | 'occasions' | 'months' | 'about';

export type RouteContent = {
  key: RouteKey;
  /** Short label in the header navigation. */
  nav: Bi;
  /** <h1> and breadcrumb. */
  title: Bi;
  /** <title>, before the brand suffix. */
  metaTitle: Bi;
  description: Bi;
  /** The line under the heading. */
  intro: Bi;
  /** Whether /{lang}/{key}/{city} is a valid shape. */
  hasCityPages: boolean;
};

/**
 * One row per page. Adding a page means adding a row here and a branch in the
 * renderer — the navigation, breadcrumb, metadata, sitemap and route validation
 * all read from this list, so none of them can be forgotten.
 */
export const ROUTES: readonly RouteContent[] = [
  {
    key: '',
    nav: ['اليوم', 'Today'],
    title: ['تاريخ اليوم والوقت الآن', 'Today’s date & current time'],
    metaTitle: [
      'تاريخ اليوم هجري وميلادي والوقت الآن',
      'Today’s Hijri and Gregorian date & current time',
    ],
    description: [
      'تاريخ اليوم هجري وميلادي والوقت الآن حسب منطقتك الزمنية، مع اسم الشهر وعدد أيامه والتقويم واختصارات تحويل التاريخ والصلاة.',
      'Today’s Hijri and Gregorian date, live local time, month names, days remaining and calendar, with date conversion and prayer tools.',
    ],
    intro: [
      'لحظتك الحالية، بين تقويمين. كل ما تحتاجه في نظرة.',
      'Your moment, in two calendars. Everything at a glance.',
    ],
    hasCityPages: false,
  },
  {
    key: 'converter',
    nav: ['تحويل التاريخ', 'Converter'],
    title: ['تحويل التاريخ الهجري والميلادي', 'Hijri & Gregorian date converter'],
    metaTitle: ['تحويل التاريخ من هجري إلى ميلادي والعكس', 'Convert Hijri to Gregorian and back'],
    description: [
      'حوّل التاريخ من هجري إلى ميلادي والعكس وفق أم القرى. أدخل اليوم والشهر والسنة لتحصل على النتيجة مباشرة.',
      'Convert Hijri to Gregorian and Gregorian to Hijri using Umm al-Qura. Enter a date for an immediate result.',
    ],
    intro: [
      'من الهجري إلى الميلادي والعكس، وفق تقويم أم القرى.',
      'Convert both ways using the Umm al-Qura calendar.',
    ],
    hasCityPages: false,
  },
  {
    key: 'prayer-times',
    nav: ['مواقيت الصلاة', 'Prayer times'],
    title: ['مواقيت الصلاة اليوم', 'Today’s prayer times'],
    metaTitle: ['مواقيت الصلاة اليوم', 'Today’s prayer times'],
    description: [
      'مواقيت الفجر والشروق والظهر والعصر والمغرب والعشاء حسب المدينة والتاريخ وطريقة الحساب، مع معلومات صلاة العيد.',
      'Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha by city, date and calculation method, with guidance on Eid prayer schedules.',
    ],
    intro: ['اختر مدينتك وتاريخك وطريقة الحساب.', 'Choose your city, date and calculation method.'],
    hasCityPages: true,
  },
  {
    key: 'occasions',
    nav: ['المناسبات', 'Occasions'],
    title: ['المناسبات الإسلامية', 'Islamic occasions'],
    metaTitle: ['المناسبات الإسلامية', 'Islamic occasions'],
    description: [
      'مواعيد رمضان وعيد الفطر ويوم عرفة وعيد الأضحى والمناسبات الإسلامية القادمة وفق أم القرى، مع توضيح اختلاف الرؤية المحلية.',
      'Upcoming Ramadan, Eid al-Fitr, Arafah and Eid al-Adha dates using Umm al-Qura, with local observation caveats.',
    ],
    intro: [
      'تواريخ حسابية للمناسبات القادمة، مع مراعاة الرؤية المحلية.',
      'Calculated dates for upcoming occasions; local observation may differ.',
    ],
    hasCityPages: false,
  },
  {
    key: 'months',
    nav: ['الأشهر', 'Months'],
    title: ['أسماء الأشهر وعدد أيامها', 'Month names & lengths'],
    metaTitle: ['أسماء الأشهر وعدد أيامها', 'Month names and lengths'],
    description: [
      'أسماء الأشهر الميلادية بالعربية والإنجليزية ومسمياتها في الشام والعراق والمغرب العربي، وأسماء الأشهر الهجرية وعدد الأيام.',
      'Gregorian month names in English and Arabic, Levantine and Maghreb variants, plus Hijri months and month lengths.',
    ],
    intro: [
      'المسميات العربية والإقليمية والإنجليزية، في مكان واحد.',
      'Arabic, regional and English names, together.',
    ],
    hasCityPages: false,
  },
  {
    key: 'about',
    nav: ['عن الموقع', 'About'],
    title: ['المصادر ومنهجية الحساب', 'Sources & calculation methods'],
    metaTitle: ['المصادر ومنهجية الحساب', 'Sources and calculation methods'],
    description: [
      'مصادر بيانات يومك الآن، منهجية حساب أم القرى ومواقيت الصلاة، حدود الدقة وسياسة الخصوصية.',
      'Your Day Now data sources, Umm al-Qura and prayer calculation methods, accuracy limitations and privacy.',
    ],
    intro: ['معلومات واضحة عن البيانات وحدود دقتها.', 'Understand the data and its limitations.'],
    hasCityPages: false,
  },
];

export const ROUTE_KEYS = ROUTES.map((route) => route.key);
const byKey = new Map(ROUTES.map((route) => [route.key as string, route]));

export const routeFor = (key: string): RouteContent | undefined => byKey.get(key);
/** Pages shown in the header navigation, in order. */
export const NAV_ROUTES = ROUTES.filter((route) => route.key !== 'about');
