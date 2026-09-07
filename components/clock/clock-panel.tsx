'use client';
import {useMemo, useState} from 'react';
import {useNow, useSupportedZones} from '@/lib/clock-store';
import {cities} from '@/lib/calendar';

const CITY_ZONES = [...new Set(cities.map((c) => c.zone))];

const timeFormatters = new Map<string, Intl.DateTimeFormat>();
function clockFace(zone: string) {
  let formatter = timeFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    timeFormatters.set(zone, formatter);
  }
  return formatter;
}

/** The only component that re-renders every second. */
export default function ClockPanel({
  ar,
  zone,
  onZoneChange,
  ZonePicker,
}: {
  ar: boolean;
  zone: string;
  onZoneChange: (zone: string) => void;
  ZonePicker: (props: {
    value: string;
    onChange: (v: string) => void;
    items: [string, string][];
    label: string;
  }) => React.ReactElement;
}) {
  const t = (a: string, b: string) => (ar ? a : b);
  const now = useNow();
  const [status, setStatus] = useState('');

  // Rendered on the server and until the first client tick, so the HTML holds
  // no wall-clock time and can be cached.
  const reading = now === 0 ? '--:--:--' : clockFace(zone).format(new Date(now));
  const [hr, mi, se] = now === 0 ? [0, 0, 0] : reading.split(':').map(Number);

  const supported = useSupportedZones(CITY_ZONES);
  const zones = useMemo(
    () =>
      [...new Set([zone, ...supported])].map(
        (z) => [z, z.replaceAll('_', ' ')] as [string, string],
      ),
    [zone, supported],
  );

  const useDeviceZone = () => {
    onZoneChange(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setStatus(t('تم استخدام المنطقة الزمنية لجهازك', 'Using your device time zone'));
  };

  return (
    <section className="panel clock-panel">
      <div className="dial" role="img" aria-label={t('ساعة العقارب', 'Analog clock')}>
        <span className="hand hour" style={{transform: `rotate(${hr * 30 + mi / 2}deg)`}} />
        <span className="hand minute" style={{transform: `rotate(${mi * 6 + se / 10}deg)`}} />
        <span className="hand second" style={{transform: `rotate(${se * 6}deg)`}} />
        <span className="pin" />
      </div>
      <div className="digital" aria-label={t('الوقت الحالي', 'Current time')}>
        {reading}
      </div>
      <p className="sub">{t('الوقت الآن · نظام 24 ساعة', 'Current time · 24-hour clock')}</p>
      <div style={{width: '100%', maxWidth: 260}}>
        <ZonePicker
          value={zone}
          onChange={onZoneChange}
          label={t('المنطقة الزمنية', 'Time zone')}
          items={zones}
        />
      </div>
      <button className="sub" style={{marginTop: 10}} onClick={useDeviceZone}>
        {t('استخدم توقيت جهازي', 'Use my device time zone')}
      </button>
      <div className="status sub" role="status">
        {status}
      </div>
    </section>
  );
}
