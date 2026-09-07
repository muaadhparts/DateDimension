import type {Bi} from './i18n.ts';

/**
 * The questions answered on the home page. Kept here so the visible <details>
 * and the FAQPage structured data are the same text — marking up an answer the
 * page does not show would be exactly the kind of thing that earns a penalty.
 */
export const HOME_FAQ: readonly {question: Bi; answer: Bi}[] = [
  {
    question: ['لماذا يختلف التاريخ الهجري أحياناً؟', 'Why can the Hijri date differ?'],
    answer: [
      'نعرض تقويم أم القرى الحسابي. إعلان بداية الشهر بالرؤية قد يختلف بيوم بحسب بلدك.',
      'We use the calculated Umm al-Qura calendar. Local moon-sighting announcements can differ by a day.',
    ],
  },
  {
    question: ['هل محرم هو يناير؟', 'Is Muharram the same as January?'],
    answer: [
      'لا. الأشهر الهجرية قمرية وتتحرك عبر فصول السنة الميلادية، فلا توجد مطابقة ثابتة بينهما.',
      'No. Hijri months follow a lunar calendar and move through the Gregorian seasons; there is no fixed correspondence.',
    ],
  },
  {
    question: ['على أي توقيت يظهر اليوم؟', 'Which time zone defines today?'],
    answer: [
      'بحسب المنطقة الزمنية المختارة أعلاه. الساعة تعتمد على دقة وقت جهازك.',
      'The selected time zone above. The live clock depends on your device’s clock accuracy.',
    ],
  },
];
