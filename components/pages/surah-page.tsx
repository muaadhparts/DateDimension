'use client';
import AppLink from '@/components/layout/app-link';
import QuranArtwork from '@/components/quran-artwork';
import {useLayoutEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import {surahSummary, type Surah, type Verse} from '@/lib/quran';
import {BASMALA, bareName} from '@/lib/quran/text';
import type {Lang} from '@/lib/i18n';

type Spread = {page: number; juz: number; verses: Verse[]};

/**
 * One surah, read the way a mushaf is read: one page at a time.
 *
 * Every page of the surah is in the HTML — a surah is a whole thing and the
 * page should say so — but only the one being read is shown, and the buttons
 * turn between them. Each carries the verses printed on that page of the
 * Madani edition and the number that page has there, so the reader can find
 * the same place in a physical copy.
 *
 * Only this surah's verses appear here. Where a page also holds the end of the
 * surah before it or the start of the one after, that whole page is at
 * /mushaf/{number}, which every sheet links to.
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

  // Consecutive verses that share a page, in order — the printed layout.
  const spreads: Spread[] = [];
  for (const verse of surah.verses) {
    const last = spreads[spreads.length - 1];
    if (last && last.page === verse.page) last.verses.push(verse);
    else spreads.push({page: verse.page, juz: verse.juz, verses: [verse]});
  }
  const juz = [...new Set(surah.verses.map((verse) => verse.juz))];
  const firstPage = spreads[0].page;
  const lastPage = spreads[spreads.length - 1].page;

  const [current, setCurrent] = useState(0);
  const reader = useRef<HTMLDivElement>(null);
  const shouldScroll = useRef(false);
  useLayoutEffect(() => {
    if (!shouldScroll.current) return;
    shouldScroll.current = false;
    reader.current?.scrollIntoView({block: 'start'});
    reader.current?.focus({preventScroll: true});
  }, [current]);
  const turn = (to: number) => {
    setCurrent(to);
    shouldScroll.current = true;
  };

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
              {firstPage}
              {spreads.length > 1 ? `–${lastPage}` : ''}
            </b>
            <span className="sub">
              {t(
                `${spreads.length} صفحة`,
                spreads.length > 1 ? `${spreads.length} pages` : '1 page',
              )}
            </span>
          </div>
        </div>
      </section>

      <div ref={reader} className="quran-reader" tabIndex={-1}>
        <p className="sr-only" role="status">{t(`صفحة ${spreads[current].page} من المصحف`, `Mushaf page ${spreads[current].page}`)}</p>
        {spreads.map((spread, index) => (
          <section
            key={spread.page}
            className="panel mushaf mushaf-sheet"
            hidden={index !== current}
            aria-label={t(`صفحة ${spread.page}`, `Page ${spread.page}`)}
          >
            <p className="mushaf-page-top">
              <span lang={ar ? 'ar' : undefined}>{ar ? bareName(surah) : surah.englishName}</span>
              <span className="sub">{t(`الجزء ${spread.juz}`, `Juz ${spread.juz}`)}</span>
            </p>
            {index === current && <QuranArtwork key={spread.page} page={spread.page} ar={ar} />}
            <details className="quran-text">
              <summary>{t('نص آيات السورة في هذه الصفحة', 'This surah’s verses on this page')}</summary>
            <div lang="ar" dir="rtl">
              {index === 0 && surah.basmala && (
                <>
                  <p className="mushaf-surah-head">{bareName(surah)}</p>
                  <p className="basmala">{BASMALA}</p>
                </>
              )}
              <p className="verses">
                {spread.verses.map((verse) => (
                  <span key={verse.number} id={`v${verse.number}`} className="verse">
                    {verse.text}
                    <span className="verse-number" aria-label={`آية ${verse.number}`}>
                      {'۝'}
                      {verse.number.toLocaleString('ar-EG')}
                    </span>{' '}
                  </span>
                ))}
              </p>
            </div>
            </details>
            <p className="mushaf-page-number" lang="ar">
              {spread.page.toLocaleString('ar-EG')}
            </p>
          </section>
        ))}
      </div>

      <nav className="page-nav" aria-label={t('التنقل بين صفحات السورة', 'Page navigation')}>
        {current > 0 ? (
          <button onClick={() => turn(current - 1)}>
            <Back size={18} aria-hidden="true" />
            {t(`الصفحة ${spreads[current - 1].page}`, `Page ${spreads[current - 1].page}`)}
          </button>
        ) : (
          <span />
        )}
        <AppLink className="tag" href={href(`mushaf/${spreads[current].page}`)}>
          {t(
            `${current + 1} من ${spreads.length} · افتحها في المصحف`,
            `${current + 1} of ${spreads.length} · open in the mushaf`,
          )}
        </AppLink>
        {current < spreads.length - 1 ? (
          <button onClick={() => turn(current + 1)}>
            {t(`الصفحة ${spreads[current + 1].page}`, `Page ${spreads[current + 1].page}`)}
            <Forward size={18} aria-hidden="true" />
          </button>
        ) : (
          <span />
        )}
      </nav>

      <nav className="surah-nav" aria-label={t('التنقل بين السور', 'Surah navigation')}>
        {previous ? (
          <AppLink href={href(`quran/${previous.number}`)} rel="prev">
            <Back size={18} aria-hidden="true" />
            <span>
              <span className="sub">{t('السابقة', 'Previous')}</span>
              <b lang="ar">{bareName(previous)}</b>
            </span>
          </AppLink>
        ) : (
          <span />
        )}
        <AppLink className="tag" href={href('quran')}>
          {t('كل السور', 'All surahs')}
        </AppLink>
        {next ? (
          <AppLink href={href(`quran/${next.number}`)} rel="next">
            <span>
              <span className="sub">{t('التالية', 'Next')}</span>
              <b lang="ar">{bareName(next)}</b>
            </span>
            <Forward size={18} aria-hidden="true" />
          </AppLink>
        ) : (
          <span />
        )}
      </nav>

      <p className="note">
        {t(
          'الصفحات بترقيم مصحف المدينة المنورة، الصورة تعرض صفحة المصحف كاملة، وقد تضم آيات من سورة مجاورة. قسم النص يعرض آيات السورة المختارة وحدها. النص بالرسم العثماني من مشروع تنزيل (tanzil.net)، منقول دون تعديل.',
          'Pages follow the Madani mushaf numbering, the image shows the entire printed page and may include a neighbouring surah. The text section contains only the selected surah’s verses. Uthmani script from the Tanzil project (tanzil.net), reproduced without modification.',
        )}
      </p>
    </>
  );
}
