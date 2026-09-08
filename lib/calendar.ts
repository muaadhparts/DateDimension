export const hijriNames = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];
export const hijriEnglish = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Ula',
  'Jumada al-Akhirah',
  'Rajab',
  'Sha’ban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qadah',
  'Dhu al-Hijjah',
];
export const months = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];
export const levant = [
  'كانون الثاني',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين الأول',
  'تشرين الثاني',
  'كانون الأول',
];
export const maghreb = [
  'جانفي',
  'فيفري',
  'مارس',
  'أفريل',
  'ماي',
  'جوان',
  'جويلية',
  'أوت',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];
export const english = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const hf = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});
export function hijri(d: Date) {
  const p = hf.formatToParts(d);
  return {
    year: Number(p.find((x) => x.type === 'year')?.value),
    month: Number(p.find((x) => x.type === 'month')?.value),
    day: Number(p.find((x) => x.type === 'day')?.value),
  };
}
export function fromHijri(year: number, month: number, day: number) {
  if (
    !Number.isInteger(year) ||
    year < 1356 ||
    year > 1500 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 30
  )
    throw Error('range');
  let lo = Date.UTC(1937, 0, 1) / 86400000,
    hi = Date.UTC(2078, 0, 1) / 86400000;
  const target = year * 10000 + month * 100 + day;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const d = new Date(mid * 86400000);
    const h = hijri(d);
    const n = h.year * 10000 + h.month * 100 + h.day;
    if (n === target) return d;
    if (n < target) lo = mid + 1;
    else hi = mid - 1;
  }
  throw Error('invalid');
}
export function dateInZone(d: Date, zone: string) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  return new Date(
    Date.UTC(
      Number(p.find((x) => x.type === 'year')?.value),
      Number(p.find((x) => x.type === 'month')?.value) - 1,
      Number(p.find((x) => x.type === 'day')?.value),
    ),
  );
}
export const cities = [
  {slug: 'riyadh', ar: 'الرياض', en: 'Riyadh', country: 'Saudi Arabia', zone: 'Asia/Riyadh'},
  {slug: 'makkah', ar: 'مكة المكرمة', en: 'Makkah', country: 'Saudi Arabia', zone: 'Asia/Riyadh'},
  {slug: 'cairo', ar: 'القاهرة', en: 'Cairo', country: 'Egypt', zone: 'Africa/Cairo'},
  {slug: 'dubai', ar: 'دبي', en: 'Dubai', country: 'United Arab Emirates', zone: 'Asia/Dubai'},
  {slug: 'sanaa', ar: 'صنعاء', en: 'Sanaa', country: 'Yemen', zone: 'Asia/Aden'},
  {slug: 'london', ar: 'لندن', en: 'London', country: 'United Kingdom', zone: 'Europe/London'},
  {
    slug: 'new-york',
    ar: 'نيويورك',
    en: 'New York',
    country: 'United States',
    zone: 'America/New_York',
  },
  {slug: 'jakarta', ar: 'جاكرتا', en: 'Jakarta', country: 'Indonesia', zone: 'Asia/Jakarta'},
];
