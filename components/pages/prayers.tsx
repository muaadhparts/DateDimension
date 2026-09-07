'use client';
import {useState} from 'react';
import {Moon, Sun, Sunrise, Sunset, LocateFixed} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import SelectField from '@/components/select-field';
import {cities} from '@/lib/calendar';
import type {MethodSummary, PrayerData, PrayerName, Timetable} from '@/lib/prayers';
import PrayerTimetable from '@/components/pages/prayer-timetable';
import MethodGuide from '@/components/pages/method-guide';

export default function Prayers({
  ar,
  lang,
  date,
  citySlug,
  initial,
  timetable,
  methodDetails,
}: {
  ar: boolean;
  lang: string;
  date: Date;
  citySlug?: string;
  initial?: PrayerData | null;
  timetable?: Timetable | null;
  methodDetails: MethodSummary[];
}) {
  const t = (a: string, b: string) => (ar ? a : b);
  const preset = cities.find((c) => c.slug === citySlug) || cities[0];
  const [city, setCity] = useState(preset.en),
    [country, setCountry] = useState(preset.country),
    [dt, setDt] = useState(date.toISOString().slice(0, 10)),
    [method, setMethod] = useState('3'),
    [school, setSchool] = useState('0'),
    [data, setData] = useState<PrayerData | null>(initial || null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [location, setLocation] = useState(preset.en + ', ' + preset.country);
  async function search(coords?: GeolocationCoordinates) {
    setBusy(true);
    setError('');
    setData(null);
    try {
      const q = new URLSearchParams({date: dt, method, school});
      if (coords) {
        q.set('lat', String(coords.latitude));
        q.set('lon', String(coords.longitude));
      } else {
        q.set('city', city.trim());
        q.set('country', country.trim());
      }
      const r = await fetch('/api/prayers?' + q, {signal: AbortSignal.timeout(15000)});
      const j = await r.json();
      if (!r.ok || !j.data?.timings) throw Error();
      setData(j.data);
      setLocation(coords ? t('موقعك الحالي', 'Your current location') : city + ', ' + country);
    } catch {
      setError(
        t(
          'تعذر جلب المواقيت. تحقق من اسم المدينة والدولة واتصالك ثم أعد المحاولة.',
          'Could not load prayer times. Check the city, country and connection, then retry.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      setError(t('المتصفح لا يدعم تحديد الموقع', 'Geolocation is not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => search(p.coords),
      () =>
        setError(
          t(
            'تعذر الوصول لموقعك. يمكنك إدخال المدينة والدولة يدوياً.',
            'Location is unavailable. Enter the city and country manually.',
          ),
        ),
      {timeout: 10000},
    );
  }
  const names: [PrayerName, string, string, LucideIcon][] = [
    ['Fajr', 'الفجر', 'Fajr', Moon],
    ['Sunrise', 'الشروق', 'Sunrise', Sunrise],
    ['Dhuhr', 'الظهر', 'Dhuhr', Sun],
    ['Asr', 'العصر', 'Asr', Sun],
    ['Maghrib', 'المغرب', 'Maghrib', Sunset],
    ['Isha', 'العشاء', 'Isha', Moon],
  ];
  return (
    <>
      <section className="panel">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <div className="field">
            <label htmlFor="country">{t('الدولة (الاسم الكامل)', 'Country (full name)')}</label>
            <input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              maxLength={80}
              required
              autoComplete="country-name"
            />
          </div>
          <div className="field">
            <label htmlFor="city">{t('المدينة', 'City')}</label>
            <input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={100}
              required
              autoComplete="address-level2"
            />
          </div>
          <div className="field">
            <label htmlFor="prayer-date">{t('التاريخ', 'Date')}</label>
            <input
              id="prayer-date"
              type="date"
              value={dt}
              onChange={(e) => setDt(e.target.value)}
              required
            />
          </div>
          <button className="btn" disabled={busy}>
            {busy ? t('جارٍ الحساب…', 'Loading…') : t('عرض المواقيت', 'Show times')}
          </button>
        </form>
        <div className="form" style={{marginTop: 18}}>
          <div className="field">
            <label>{t('طريقة الحساب', 'Calculation method')}</label>
            <SelectField
              value={method}
              onChange={setMethod}
              label={t('طريقة الحساب', 'Calculation method')}
              items={methodDetails.map((m) => [m.id, ar ? m.nameAr : m.name])}
            />
          </div>
          <div className="field">
            <label>{t('حساب العصر', 'Asr convention')}</label>
            <SelectField
              value={school}
              onChange={setSchool}
              label={t('حساب العصر', 'Asr convention')}
              items={[
                ['0', t('الشافعي، المالكي، الحنبلي', 'Shafi, Maliki, Hanbali')],
                ['1', t('الحنفي', 'Hanafi')],
              ]}
            />
          </div>
          <button className="btn secondary" disabled={busy} onClick={locate}>
            <LocateFixed size={18} />
            {t('استخدم موقعي', 'Use my location')}
          </button>
        </div>
        <p className="note">
          {t(
            'يدعم البحث المدن والدول حول العالم؛ استخدم الاسم الكامل لتجنب الالتباس، ثم تحقق من المنطقة الزمنية في النتيجة. اضغط عرض المواقيت بعد تعديل الخيارات.',
            'Search cities and countries worldwide. Use full names to avoid ambiguity, then verify the returned time zone. Press Show times after changing options.',
          )}
        </p>
        <div aria-live="polite" aria-busy={busy}>
          {error && <p className="error">{error}</p>}
          {data && (
            <>
              <div className="section-top" style={{marginTop: 25}}>
                <h2>{location}</h2>
                <span className="tag">{data.meta?.timezone}</span>
              </div>
              <p>
                {data.date?.readable} · {data.meta?.method?.name}
              </p>
              <div className="prayers">
                {names.map(([key, a, b, Icon]) => (
                  <div className="prayer" key={key}>
                    <Icon size={23} />
                    <span>{ar ? a : b}</span>
                    <b>
                      {/^\d{2}:\d{2}/.test(data.timings[key]) ? data.timings[key].slice(0, 5) : '—'}
                    </b>
                  </div>
                ))}
              </div>
              <p className="note">
                {t(
                  'الأوقات محسوبة في هذا الموقع بمكتبة adhan حسب المنطقة الزمنية الموضحة. هي مواقيت حسابية وليست مواعيد الإقامة، وقد تختلف بدقائق عن الجداول الرسمية.',
                  'Calculated here with the adhan library, in the time zone shown. These are calculated times, not congregation schedules, and can differ from an official timetable by a few minutes.',
                )}
              </p>
            </>
          )}
        </div>
      </section>
      {timetable && (
        <PrayerTimetable
          timetable={timetable}
          cityName={ar ? preset.ar : preset.en}
          ar={ar}
          today={date.toISOString().slice(0, 10)}
          coordinates={timetable.coordinates}
        />
      )}
      <div className="city-links">
        {cities.map((c) => (
          <a key={c.slug} href={`/${lang}/prayer-times/${c.slug}`}>
            {ar ? c.ar : c.en}
          </a>
        ))}
      </div>
      <MethodGuide methods={methodDetails} ar={ar} />
      <section className="section panel article">
        <h2>
          {t('متى صلاة عيد الفطر وعيد الأضحى؟', 'When are Eid al-Fitr and Eid al-Adha prayers?')}
        </h2>
        <p>
          {t(
            'لا يوجد وقت واحد معتمد لكل مدينة أو دولة؛ تحدد المساجد والجهات المحلية موعد صلاة العيد. مواقيت الشروق أعلاه ليست موعد صلاة العيد. راجع إعلان مسجدك أو وزارة الأوقاف بعد تأكيد يوم العيد.',
            'There is no single official time for every city or country. Mosques and local authorities announce Eid prayer schedules. The sunrise time above is not an Eid prayer time. Check your mosque or religious authority after the Eid date is confirmed.',
          )}
        </p>
        <a className="tag" href={`/${lang}/occasions`}>
          {t('تواريخ الأعياد القادمة', 'Upcoming Eid dates')} ↗
        </a>
      </section>
    </>
  );
}
