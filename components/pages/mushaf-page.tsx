'use client';
import AppLink from '@/components/layout/app-link';
import {useRouter} from 'next/navigation';
import QuranArtwork from '@/components/quran-artwork';
import {useState} from 'react';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import {BASMALA, bareName} from '@/lib/quran/text';
import type {MushafPage} from '@/lib/quran';
import type {Lang} from '@/lib/i18n';

const TOTAL = 604;

/**
 * One page of the mushaf, carrying exactly the verses printed on it — including
 * the pages where one surah ends and the next begins.
 */
export default function MushafPageView({
  page,
  lang,
  href,
}: {
  page: MushafPage;
  lang: Lang;
  href: (path?: string) => string;
}) {
  const router = useRouter();
  const ar = lang === 'ar';
  const t = (a: string, b: string) => (ar ? a : b);
  const Back = ar ? ArrowRight : ArrowLeft;
  const Forward = ar ? ArrowLeft : ArrowRight;
  const [jump, setJump] = useState(String(page.page));

  return (
    <>
      <section className="panel mushaf mushaf-sheet">
        <p className="mushaf-page-top" dir={ar ? 'rtl' : 'ltr'}>
          <span lang={ar ? 'ar' : undefined}>
            {ar ? bareName(page.blocks[0]) : page.blocks[0].englishName}
          </span>
          <span className="sub">{t(`الجزء ${page.juz}`, `Juz ${page.juz}`)}</span>
        </p>
        <QuranArtwork key={page.page} page={page.page} ar={ar} />
        <details className="quran-text">
          <summary>{t('النص القرآني للقراءة والنسخ', 'Quran text for reading and copying')}</summary>
        <div lang="ar" dir="rtl">
          {page.blocks.map((block) => (
            <div key={`${block.surah}-${block.verses[0].number}`}>
              {block.basmala && (
                <>
                  <p className="mushaf-surah-head">{bareName(block)}</p>
                  <p className="basmala">{BASMALA}</p>
                </>
              )}
              <p className="verses">
                {block.verses.map((verse) => (
                  <span key={verse.number} className="verse">
                    {verse.text}
                    <span className="verse-number" aria-label={`آية ${verse.number}`}>
                      {'۝'}
                      {verse.number.toLocaleString('ar-EG')}
                    </span>{' '}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
        </details>
        <p className="mushaf-page-number" lang="ar">
          {page.page.toLocaleString('ar-EG')}
        </p>
      </section>

      <nav className="page-nav" aria-label={t('التنقل بين صفحات المصحف', 'Mushaf page navigation')}>
        {page.page > 1 ? (
          <AppLink href={href(`mushaf/${page.page - 1}`)} rel="prev">
            <Back size={18} aria-hidden="true" />
            {t(`الصفحة ${page.page - 1}`, `Page ${page.page - 1}`)}
          </AppLink>
        ) : (
          <span />
        )}
        <AppLink className="tag" href={href('quran')}>
          {t('فهرس السور', 'Surah index')}
        </AppLink>
        {page.page < TOTAL ? (
          <AppLink href={href(`mushaf/${page.page + 1}`)} rel="next">
            {t(`الصفحة ${page.page + 1}`, `Page ${page.page + 1}`)}
            <Forward size={18} aria-hidden="true" />
          </AppLink>
        ) : (
          <span />
        )}
      </nav>

      <form
        className="page-jump"
        onSubmit={(event) => {
          event.preventDefault();
          const wanted = Number(jump);
          if (Number.isInteger(wanted) && wanted >= 1 && wanted <= TOTAL) {
            router.push(href(`mushaf/${wanted}`));
          }
        }}
      >
        <label htmlFor="page-jump">{t('اذهب إلى صفحة', 'Go to page')}</label>
        <input
          id="page-jump"
          type="number"
          min={1}
          max={TOTAL}
          value={jump}
          onChange={(event) => setJump(event.target.value)}
          inputMode="numeric"
          required
        />
        <button className="btn secondary">{t('انتقل', 'Go')}</button>
        <span className="sub">{t(`من ${TOTAL} صفحة`, `of ${TOTAL} pages`)}</span>
      </form>

      <p className="note">
        {t(
          'ترقيم الصفحات بحسب مصحف المدينة المنورة. النص بالرسم العثماني من مشروع تنزيل (tanzil.net)، منقول دون تعديل.',
          'Page numbers follow the Madani mushaf. Uthmani script from the Tanzil project (tanzil.net), reproduced without modification.',
        )}
      </p>
    </>
  );
}
