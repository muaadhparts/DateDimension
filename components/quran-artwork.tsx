'use client';
import AppLink from '@/components/layout/app-link';
import {useState} from 'react';
import {ARTWORK_SOURCE, artworkUrl} from '@/lib/quran/artwork';

/** Scale the original printed page as a unit; never reflow or clip its lines. */
export default function QuranArtwork({page, ar}: {page: number; ar: boolean}) {
  const [zoom, setZoom] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const t = (a: string, b: string) => (ar ? a : b);
  return (
    <div className="quran-artwork">
      <div className="reader-tools">
        <span>{t('مصحف المدينة · حفص', 'Madinah mushaf · Hafs')}</span>
        <button type="button" className="btn secondary" aria-pressed={zoom} onClick={() => setZoom(!zoom)}>
          {zoom ? t('ملاءمة الشاشة', 'Fit to screen') : t('تكبير الصفحة', 'Enlarge page')}
        </button>
      </div>
      {state === 'error' ? (
        <div className="artwork-error" role="status">
          <p>{t('تعذّر تحميل صورة المصحف. يمكنك قراءة النص أسفل الصفحة أو إعادة المحاولة.', 'The mushaf image could not load. Read the text below or try again.')}</p>
          <button type="button" className="btn secondary" onClick={() => {setState('loading'); setAttempt(attempt + 1);}}>{t('إعادة المحاولة', 'Retry')}</button>
        </div>
      ) : (
        <div className={`artwork-scroll${zoom ? ' is-enlarged' : ''}`} tabIndex={zoom ? 0 : undefined} role="region" aria-label={t(`صورة صفحة ${page} من المصحف`, `Mushaf page ${page} image`)} aria-busy={state === 'loading'}>
          {state === 'loading' && <span className="artwork-loading" role="status">{t('جارٍ تحميل صفحة المصحف…', 'Loading mushaf page…')}</span>}
          {/* A vector facsimile must keep its original viewBox and glyph positions. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={attempt} src={`${artworkUrl(page)}&retry=${attempt}`} width={345} height={550} alt={t(`صفحة ${page} من مصحف المدينة بالرسم العثماني`, `Page ${page} of the Madinah mushaf in Uthmani script`)} onLoad={() => setState('ready')} onError={() => setState('error')} />
        </div>
      )}
      {zoom && <p className="sub">{t('حرّك الصفحة أفقيًا لقراءة السطر كاملًا.', 'Scroll horizontally to read the full line.')}</p>}
      <p className="artwork-credit"><AppLink href={ARTWORK_SOURCE} target="_blank" rel="noreferrer">{t('صور مصحف مجمع الملك فهد عبر Quranpedia', 'King Fahd Complex mushaf artwork via Quranpedia')}</AppLink></p>
    </div>
  );
}
