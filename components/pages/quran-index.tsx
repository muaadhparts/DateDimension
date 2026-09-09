'use client';
import AppLink from '@/components/layout/app-link';
import {useMemo, useState} from 'react';
import {Search} from 'lucide-react';
import {SEARCHABLE, TOTAL_VERSES} from '@/lib/quran';
import {bareName, foldArabic} from '@/lib/quran/text';
import type {Lang} from '@/lib/i18n';

/**
 * All 114 surahs in mushaf order, filtered as you type. The whole list is 114
 * rows, so it is rendered once and filtered in place rather than fetched —
 * search stays instant and works with no JavaScript budget to speak of.
 */
export default function QuranIndex({lang, href}: {lang: Lang; href: (path?: string) => string}) {
  const ar = lang === 'ar';
  const t = (a: string, b: string) => (ar ? a : b);
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const folded = foldArabic(query);
    const latin = query
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (!folded && !latin) return SEARCHABLE;
    return SEARCHABLE.filter(
      (surah) =>
        (folded && surah.search.includes(folded)) || (latin && surah.search.includes(latin)),
    );
  }, [query]);

  return (
    <>
      <section className="panel">
        <div className="form">
          <div className="field grow">
            <label htmlFor="surah-search">{t('ابحث عن سورة', 'Find a surah')}</label>
            <input
              id="surah-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('الفاتحة · 18 · Kahf', 'Al-Kahf · 18 · الكهف')}
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>
          <span className="tag">
            <Search size={15} aria-hidden="true" />
            {matches.length === SEARCHABLE.length
              ? t(`114 سورة · ${TOTAL_VERSES} آية`, `114 surahs · ${TOTAL_VERSES} verses`)
              : t(`${matches.length} نتيجة`, `${matches.length} found`)}
          </span>
        </div>
        <p className="note">
          {t(
            'اكتب اسم السورة بالعربية أو بالإنجليزية أو رقمها. التشكيل والهمزات لا تؤثر على البحث.',
            'Type the name in Arabic or English, or the number. Diacritics and hamza forms do not affect the search.',
          )}
        </p>
        <p className="note">
          <AppLink href={href('mushaf/1')}>
            {t('أو تصفّح المصحف صفحة بصفحة', 'Or read the mushaf page by page')}
          </AppLink>
        </p>
      </section>

      {matches.length === 0 ? (
        <section className="panel empty" aria-live="polite">
          <p>{t('لا توجد سورة بهذا الاسم.', 'No surah matches that.')}</p>
        </section>
      ) : (
        <div className="surah-grid" aria-live="polite">
          {matches.map((surah) => (
            <AppLink key={surah.number} className="surah-card" href={href(`quran/${surah.number}`)}>
              <span className="surah-number" aria-hidden="true">
                {surah.number}
              </span>
              <span className="grow">
                <b lang="ar">{bareName(surah)}</b>
                <span className="sub">{surah.englishName}</span>
              </span>
              <span className="sub surah-meta">
                {t(`${surah.verses} آية`, `${surah.verses} verses`)}
                <span className="muted">
                  {surah.revelationType === 'Meccan' ? t('مكية', 'Meccan') : t('مدنية', 'Medinan')}
                </span>
              </span>
            </AppLink>
          ))}
        </div>
      )}
    </>
  );
}
