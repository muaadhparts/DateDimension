'use client';
import {Clock3, Globe2} from 'lucide-react';
import {cities} from '@/lib/calendar';
import {NAV_ROUTES, routeFor} from '@/lib/routes';
import {pick, type Lang} from '@/lib/i18n';

/**
 * Header, navigation, breadcrumb, intro and footer. Every label and heading
 * comes from lib/routes.ts, so adding a page does not mean editing this file.
 */
export default function AppShell({
  lang,
  page,
  citySlug,
  subject,
  zone,
  year,
  children,
}: {
  lang: Lang;
  page: string;
  citySlug?: string;
  /** What this page is about, when it is about one thing: a city, a surah. */
  subject?: {name: string; segment: string} | null;
  zone: string;
  year: number;
  children: React.ReactNode;
}) {
  const ar = lang === 'ar';
  const t = (a: string, b: string) => (ar ? a : b);
  const href = (path = '') => `/${lang}${path ? '/' + path : ''}`;
  const route = routeFor(page);
  const city = citySlug ? cities.find((c) => c.slug === citySlug) : undefined;
  const named = subject ?? (city ? {name: ar ? city.ar : city.en, segment: city.slug} : null);
  const title = route ? pick(lang, route.title) : '';

  return (
    <div lang={lang} dir={ar ? 'rtl' : 'ltr'} className="shell">
      <a className="skip" href="#main">
        {t('انتقل إلى المحتوى', 'Skip to content')}
      </a>
      <header>
        <a className="brand" href={href()}>
          <Clock3 size={29} />
          <span>
            {t('يومك الآن', 'Your Day Now')}
            <span className="sub" style={{display: 'block', fontSize: 11, letterSpacing: 3}}>
              YOUR DAY NOW
            </span>
          </span>
        </a>
        <nav aria-label={t('التنقل الرئيسي', 'Main navigation')}>
          {NAV_ROUTES.map((r) => (
            <a
              key={r.key}
              className={page === r.key ? 'active' : ''}
              aria-current={page === r.key ? 'page' : undefined}
              href={href(r.key)}
            >
              {pick(lang, r.nav)}
            </a>
          ))}
        </nav>
        <a
          className="language"
          href={`/${ar ? 'en' : 'ar'}${page ? '/' + page : ''}${named ? '/' + named.segment : ''}`}
          hrefLang={ar ? 'en' : 'ar'}
        >
          {ar ? 'English' : 'العربية'}
        </a>
      </header>
      <main id="main">
        {page && (
          <div className="breadcrumb">
            <a href={href()}>{t('الرئيسية', 'Home')}</a> /{' '}
            {named ? <a href={href(page)}>{title}</a> : title}
            {named ? ` / ${named.name}` : ''}
          </div>
        )}
        <div className="intro">
          <div>
            <div className="eyebrow">{t('كل يوم، على توقيتك', 'EVERY DAY, IN YOUR TIME')}</div>
            <h1>
              {title}
              {named ? ' · ' + named.name : ''}
            </h1>
            <p>{route ? pick(lang, route.intro) : ''}</p>
          </div>
          {page === '' && (
            <span className="tag">
              <Globe2 size={14} />
              {zone}
            </span>
          )}
        </div>
        {children}
      </main>
      <footer className="footer">
        <span>
          © {year} {t('يومك الآن · كل لحظة أوضح', 'Your Day Now · A clearer sense of time')}
        </span>
        <div>
          <a href={href('about')}>{t('المصادر والخصوصية', 'Sources & privacy')}</a>
          <span> · </span>
          <a href={href('converter')}>{t('تحويل التاريخ', 'Date converter')}</a>
        </div>
      </footer>
    </div>
  );
}
