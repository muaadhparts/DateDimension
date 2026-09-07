'use client';
import {useState} from 'react';
import {ArrowLeftRight} from 'lucide-react';
import SelectField from '@/components/select-field';
import {hijri, fromHijri, hijriNames, hijriEnglish} from '@/lib/calendar';

export default function Converter({ar, date}: {ar: boolean; date: Date}) {
  const t = (a: string, b: string) => (ar ? a : b);
  const [mode, setMode] = useState('g');
  const [g, setG] = useState(date.toISOString().slice(0, 10));
  const hh = hijri(date);
  const [y, setY] = useState(String(hh.year)),
    [m, setM] = useState(String(hh.month)),
    [d, setD] = useState(String(hh.day));
  const [result, setResult] = useState<{g: string; h: string} | null>(null),
    [error, setError] = useState('');
  function convert(e: React.FormEvent) {
    e.preventDefault();
    try {
      let dt: Date;
      if (mode === 'g') {
        dt = new Date(g + 'T00:00:00Z');
        if (!g || !Number.isFinite(dt.getTime()) || dt.toISOString().slice(0, 10) !== g)
          throw Error();
        const hp = hijri(dt);
        if (hp.year < 1356 || hp.year > 1500) throw Error();
      } else {
        dt = fromHijri(Number(y), Number(m), Number(d));
      }
      const h = hijri(dt);
      setResult({
        g: new Intl.DateTimeFormat(ar ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', {
          dateStyle: 'full',
          timeZone: 'UTC',
        }).format(dt),
        h: `${h.day} ${ar ? hijriNames[h.month - 1] : hijriEnglish[h.month - 1]} ${h.year} ${t('هـ', 'AH')}`,
      });
      setError('');
    } catch {
      setResult(null);
      setError(
        t(
          'أدخل تاريخاً صحيحاً ضمن 1356–1500 هـ. بعض الأشهر الهجرية 29 يوماً فقط.',
          'Enter a valid date within 1356–1500 AH. Some Hijri months have only 29 days.',
        ),
      );
    }
  }
  return (
    <>
      <section className="panel">
        <div className="form" style={{marginBottom: 25}}>
          <div className="field">
            <label>{t('اتجاه التحويل', 'Conversion direction')}</label>
            <SelectField
              value={mode}
              onChange={(v) => {
                setMode(v);
                setResult(null);
                setError('');
              }}
              label={t('اتجاه التحويل', 'Conversion direction')}
              items={[
                ['g', t('ميلادي ← هجري', 'Gregorian → Hijri')],
                ['h', t('هجري ← ميلادي', 'Hijri → Gregorian')],
              ]}
            />
          </div>
        </div>
        <form className="form" onSubmit={convert}>
          {mode === 'g' ? (
            <div className="field">
              <label htmlFor="gregorian">{t('التاريخ الميلادي', 'Gregorian date')}</label>
              <input
                id="gregorian"
                type="date"
                value={g}
                onChange={(e) => setG(e.target.value)}
                required
              />
            </div>
          ) : (
            <>
              <div className="field">
                <label htmlFor="hday">{t('اليوم', 'Day')}</label>
                <input
                  id="hday"
                  type="number"
                  min="1"
                  max="30"
                  value={d}
                  onChange={(e) => setD(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>{t('الشهر الهجري', 'Hijri month')}</label>
                <SelectField
                  label={t('الشهر الهجري', 'Hijri month')}
                  value={m}
                  onChange={setM}
                  items={(ar ? hijriNames : hijriEnglish).map((n, i) => [String(i + 1), n])}
                />
              </div>
              <div className="field">
                <label htmlFor="hyear">{t('السنة الهجرية', 'Hijri year')}</label>
                <input
                  id="hyear"
                  type="number"
                  min="1356"
                  max="1500"
                  value={y}
                  onChange={(e) => setY(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          <button className="btn" type="submit">
            <ArrowLeftRight size={18} />
            {t('تحويل التاريخ', 'Convert date')}
          </button>
        </form>
        <div aria-live="polite">
          {error && <p className="error">{error}</p>}
          {result && (
            <div className="result">
              <span className="sub">{t('نتيجة التحويل', 'CONVERSION RESULT')}</span>
              <strong>{mode === 'g' ? result.h : result.g}</strong>
              <p>{mode === 'g' ? result.g : result.h}</p>
            </div>
          )}
        </div>
      </section>
      <section className="section article">
        <h2>{t('كيف يتم التحويل؟', 'How does conversion work?')}</h2>
        <p>
          {t(
            'نستخدم تقويم أم القرى نفسه في الاتجاهين لضمان اتساق النتيجة. اختر اتجاه التحويل، أدخل التاريخ، ثم اضغط تحويل. لا يحتاج الحساب إلى إرسال تاريخك لأي خدمة خارجية.',
            'Both directions use the same Umm al-Qura calendar for consistent results. Choose a direction, enter a date and convert. Your date is calculated locally without being sent to another service.',
          )}
        </p>
        <p>
          {t(
            'التاريخ الحسابي قد يختلف عن الرؤية المحلية. للمستندات الرسمية، راجع التاريخ المعتمد لدى الجهة المعنية.',
            'Calculated dates can differ from local observation. For official documents, verify the date with the relevant authority.',
          )}
        </p>
      </section>
    </>
  );
}
