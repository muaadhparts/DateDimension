'use client';
import AppLink from '@/components/layout/app-link';
import {CalendarDays, Copy, ArrowLeftRight, Moon, ArrowUpLeft, ArrowUpRight} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import ClockPanel from '@/components/clock/clock-panel';
import WorldClocks from '@/components/clock/world-clocks';
import SelectField from '@/components/select-field';
import {hijriNames, hijriEnglish, months, english, levant, maghreb} from '@/lib/calendar';
import type {DayView} from '@/lib/day';
import {HOME_FAQ} from '@/lib/faq';
import {pick} from '@/lib/i18n';

export default function TodayPage({
  view,
  zone,
  onZoneChange,
  status,
  onStatus,
  href,
}: {
  view: DayView;
  zone: string;
  onZoneChange: (zone: string) => void;
  status: string;
  onStatus: (status: string) => void;
  href: (path?: string) => string;
}) {
  const {
    ar,
    date,
    today,
    hijri: h,
    hijriDays: hDays,
    month,
    year,
    day,
    monthDays: days,
    format: fmt,
  } = view;
  const t = (a: string, b: string) => (ar ? a : b);
  const faq = HOME_FAQ.map(
    (entry) => [pick(view.lang, entry.question), pick(view.lang, entry.answer)] as const,
  );
  const setStatus = onStatus;
  const setTimezone = onZoneChange;

  return (
    <>
      <div className="grid">
        <section className="panel today">
          <div className="section-top">
            <span className="tag">
              <CalendarDays size={15} />
              {fmt(date, {weekday: 'long'})}
            </span>
            <span className="sub">{t('تاريخ اليوم', 'TODAY’S DATE')}</span>
          </div>
          <div className="date-columns">
            <div>
              <div className="sub">{t('التاريخ الهجري', 'HIJRI DATE')}</div>
              <div className="day-number">{String(h.day).padStart(2, '0')}</div>
              <div className="date-name">
                {ar ? hijriNames[h.month - 1] : hijriEnglish[h.month - 1]}
              </div>
              <p>
                {h.year} {t('هـ', 'AH')} · {h.day}/{h.month}/{h.year}
              </p>
            </div>
            <div>
              <div className="sub">{t('التاريخ الميلادي', 'GREGORIAN DATE')}</div>
              <div className="day-number">{String(day).padStart(2, '0')}</div>
              <div className="date-name">{ar ? months[month] : english[month]}</div>
              <p>
                {year} {t('م', 'CE')} · {day}/{month + 1}/{year}
              </p>
            </div>
          </div>
          <div className="section-top" style={{margin: 0}}>
            <span className="sub">
              {t('تقويم أم القرى • قد يختلف عن الرؤية', 'Umm al-Qura • observation may differ')}
            </span>
            <button
              className="tag"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${fmt(date)} | ${h.day} ${ar ? hijriNames[h.month - 1] : hijriEnglish[h.month - 1]} ${h.year}`,
                  );
                  setStatus(t('تم نسخ التاريخ', 'Date copied'));
                } catch {
                  setStatus(
                    t(
                      'تعذر النسخ؛ يمكنك تحديد النص ونسخه',
                      'Could not copy; select the date text to copy it',
                    ),
                  );
                }
              }}
            >
              <Copy size={14} />
              {t('نسخ', 'Copy')}
            </button>
          </div>
        </section>
        <ClockPanel ar={ar} zone={zone} onZoneChange={setTimezone} ZonePicker={SelectField} />
      </div>
      <div className="status sub" role="status">
        {status}
      </div>
      <div className="quick">
        {(
          [
            [
              'converter',
              ArrowLeftRight,
              t('حوّل أي تاريخ', 'Convert a date'),
              t('هجري ⇄ ميلادي', 'Hijri ⇄ Gregorian'),
            ],
            [
              'prayer-times',
              Moon,
              t('متى الصلاة القادمة؟', 'When is prayer?'),
              t('مواقيت مدينتك اليوم', 'Today’s times in your city'),
            ],
            [
              'occasions',
              CalendarDays,
              t('المناسبات القادمة', 'Upcoming occasions'),
              t('رمضان والأعياد والمزيد', 'Ramadan, Eid and more'),
            ],
          ] as [string, LucideIcon, string, string][]
        ).map(([p, Icon, a, b]) => (
          <AppLink key={p} href={href(p)}>
            <Icon size={26} />
            <div className="grow">
              <h3>{a}</h3>
              <p>{b}</p>
            </div>
            {ar ? <ArrowUpLeft size={19} /> : <ArrowUpRight size={19} />}
          </AppLink>
        ))}
      </div>
      <section className="section panel">
        <div className="section-top">
          <h2>{t('هذا الشهر، بالتفصيل', 'This month, in detail')}</h2>
          <AppLink href={href('months')}>{t('كل أسماء الأشهر', 'All month names')} ↗</AppLink>
        </div>
        <div className="stats">
          <div className="stat">
            <span className="sub">{t('الشهر الميلادي', 'Gregorian month')}</span>
            <b>{ar ? months[month] : english[month]}</b>
            <span className="sub">
              {ar
                ? `${levant[month]} · ${maghreb[month]} · ${english[month]}`
                : `${months[month]} · ${levant[month]}`}
            </span>
          </div>
          <div className="stat">
            <span className="sub">{t('عدد أيام الشهر', 'Days in month')}</span>
            <b>
              {days} <small>{t('يوماً', 'days')}</small>
            </b>
            <span className="sub">
              {t('المتبقي بعد اليوم', 'Remaining after today')}: {days - day}
            </span>
          </div>
          <div className="stat">
            <span className="sub">{t('الشهر الهجري', 'Hijri month')}</span>
            <b>{ar ? hijriNames[h.month - 1] : hijriEnglish[h.month - 1]}</b>
            <span className="sub">
              {hDays} {t('يوماً · أم القرى', 'days · Umm al-Qura')}
            </span>
          </div>
          <div className="stat">
            <span className="sub">{t('السنة الميلادية', 'Gregorian year')}</span>
            <b>{year}</b>
            <span className="sub">
              {new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1
                ? t('سنة كبيسة · 366 يوماً', 'Leap year · 366 days')
                : t('سنة بسيطة · 365 يوماً', 'Common year · 365 days')}
            </span>
          </div>
        </div>
        <div className="progress" aria-label={t('تقدم الشهر', 'Month progress')}>
          <span style={{width: `${(day / days) * 100}%`}} />
        </div>
      </section>
      <div className="grid section">
        <section className="panel">
          <h2>
            {ar ? months[month] : english[month]} {year}
          </h2>
          <div className="calendar">
            {(ar
              ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']
              : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
            ).map((n, i) => (
              <span className="muted" key={i}>
                {n}
              </span>
            ))}
            {Array.from({length: new Date(Date.UTC(year, month, 1)).getUTCDay()}, (_, i) => (
              <span key={'blank' + i} />
            ))}
            {Array.from({length: days}, (_, i) => (
              <span
                className={day === i + 1 ? 'selected' : ''}
                key={i}
                aria-current={day === i + 1 ? 'date' : undefined}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>{t('إجابات سريعة', 'Quick answers')}</h2>
          {faq.map(([question, answer], index) => (
            <details key={question} open={index === 0}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>
      </div>
      <section className="section">
        <div className="section-top">
          <h2>{t('العالم في هذه اللحظة', 'Around the world, right now')}</h2>
        </div>
        <WorldClocks ar={ar} href={href} serverDate={today} />
      </section>
    </>
  );
}
