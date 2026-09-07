const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(zone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = zone + JSON.stringify(options);
  let found = formatters.get(key);
  if (!found) {
    found = new Intl.DateTimeFormat('en-GB', {timeZone: zone, ...options});
    formatters.set(key, found);
  }
  return found;
}

/** 'HH:mm' in the location's own zone, or '—' for a prayer that does not occur. */
export function clockTime(instant: Date, zone: string): string {
  if (Number.isNaN(instant.getTime())) return '—';
  return formatter(zone, {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(instant);
}

/** '07 Sep 2026', matching the readable date the UI already displays. */
export function readableDate(date: string): string {
  const parsed = new Date(date + 'T12:00:00Z');
  return formatter('UTC', {day: '2-digit', month: 'short', year: 'numeric'}).format(parsed);
}

/** '07-09-2026', the day-first form AlAdhan uses. */
export function dayFirst(date: string): string {
  return date.split('-').reverse().join('-');
}
