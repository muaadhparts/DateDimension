'use client';
import {useNow} from '@/lib/clock-store';
import {cities, dateInZone} from '@/lib/calendar';

const SHOWN = ['riyadh', 'london', 'new-york', 'jakarta'];

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = locale + JSON.stringify(options);
  let found = formatters.get(key);
  if (!found) {
    found = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, found);
  }
  return found;
}

/**
 * City names and dates come from the server; only the HH:MM is client-side, so
 * the cached HTML never carries a wall-clock time.
 */
export default function WorldClocks({ar, href, serverDate}: {
  ar: boolean;
  href: (path: string) => string;
  serverDate: string;
}) {
  const now = useNow();
  const locale = ar ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB';
  const shown = cities.filter((c) => SHOWN.includes(c.slug));

  return (
    <div className="world">
      {shown.map((c) => {
        const day = now === 0 ? new Date(serverDate + 'T00:00:00Z') : dateInZone(new Date(now), c.zone);
        return (
          <a key={c.slug} href={href('prayer-times/' + c.slug)}>
            {ar ? c.ar : c.en}
            <b>{now === 0 ? '--:--' : formatter('en-GB', {timeZone: c.zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(now))}</b>
            <span className="sub">{formatter(locale, {day: 'numeric', month: 'short', timeZone: 'UTC'}).format(day)}</span>
          </a>
        );
      })}
    </div>
  );
}
