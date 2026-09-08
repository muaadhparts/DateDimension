'use client';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import {surahSummary, type Surah} from '@/lib/quran';
import {BASMALA, bareName} from '@/lib/quran/text';
import type {Lang} from '@/lib/i18n';

/**
 * One surah, verse by verse.
 *
 * The verses run as continuous text rather than as a list of rows, because
 * that is how a mushaf reads and how the eye follows a sentence that spans
 * several verses. Each verse ends with its number in the Arabic end-of-ayah
 * mark, which is the same signal a printed copy gives.
 */
export default function SurahPage({
  surah,
  lang,
  href,
}: {
  surah: Surah;
  lang: Lang;
  href: (path?: string) => string;
}) {
  const ar = lang === 'ar';
  const t = (a: string, b: string) => (ar ? a : b);
  const previous = surah.number > 1 ? surahSummary(surah.number - 1) : undefined;
  const next = surah.number < 114 ? surahSummary(surah.number + 1) : undefined;
  const Back = ar ? ArrowRight : ArrowLeft;
  const Forward = ar ? ArrowLeft : ArrowRight;

  const pages = [...new Set(surah.verses.map((verse) => verse.page))];
  const juz = [...new Set(surah.verses.map((verse) => verse.juz))];

  return (
    <>
      <section className="panel">
        <div className="stats">
          <div className="stat">
            <span className="sub">{t('رقم السورة', 'Surah number')}</span>
            <b>{surah.number}</b>
            <span className="sub">{t('من 114', 'of 114')}</span>
          </div>
          <div className="stat">
            <span className="sub">{t('عدد الآيات', 'Verses')}</span>
            <b>{surah.verses.length}</b>
            <span className="sub">{surah.englishNameTranslation}</span>
          </div>
          <div className="stat">
            <span className="sub">{t('مكان النزول', 'Revealed in')}</span>
            <b>
              {surah.revelationType === 'Meccan' ? t('مكة', 'Makkah') : t('المدينة', 'Madinah')}
            </b>
            <span className="sub">{t(`الجزء ${juz.join(' و')}`, `Juz ${juz.join(', ')}`)}</span>
          </div>
          <div className="stat">
            <span className="sub">{t('صفحات المصحف', 'Mushaf pages')}</span>
            <b>
              {pages[0]}
              {pages.length > 1 ? `–${pages[pages.length - 1]}` : ''}
            </b>
            <span className="sub">{t('طبعة المدينة', 'Madani print')}</span>
          </div>
        </div>
      </section>

      <section className="panel mushaf" lang="ar" dir="rtl">
        {surah.basmala && <p className="basmala">{BASMALA}</p>}
        <p className="verses">
          {surah.verses.map((verse) => (
            <span key={verse.number} id={`v${verse.number}`} className="verse">
              {verse.text}
              <span className="verse-number" aria-label={`آية ${verse.number}`}>
                {'۝'}
                {verse.number.toLocaleString('ar-EG')}
              </span>{' '}
            </span>
          ))}
        </p>
      </section>

      <nav className="surah-nav" aria-label={t('التنقل بين السور', 'Surah navigation')}>
        {previous ? (
          <a href={href(`quran/${previous.number}`)} rel="prev">
            <Back size={18} aria-hidden="true" />
            <span>
              <span className="sub">{t('السابقة', 'Previous')}</span>
              <b lang="ar">{bareName(previous)}</b>
            </span>
          </a>
        ) : (
          <span />
        )}
        <a className="tag" href={href('quran')}>
          {t('كل السور', 'All surahs')}
        </a>
        {next ? (
          <a href={href(`quran/${next.number}`)} rel="next">
            <span>
              <span className="sub">{t('التالية', 'Next')}</span>
              <b lang="ar">{bareName(next)}</b>
            </span>
            <Forward size={18} aria-hidden="true" />
          </a>
        ) : (
          <span />
        )}
      </nav>

      <p className="note">
        {t(
          'النص بالرسم العثماني من مشروع تنزيل (tanzil.net)، منقول دون تعديل.',
          'Uthmani script from the Tanzil project (tanzil.net), reproduced without modification.',
        )}
      </p>
    </>
  );
}
