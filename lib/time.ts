const elapsedFormatters = new Map<string, Intl.DateTimeFormat>();

function elapsedFormatter(zone: string): Intl.DateTimeFormat {
  let found = elapsedFormatters.get(zone);
  if (!found) {
    found = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
    elapsedFormatters.set(zone, found);
  }
  return found;
}

const DAY = 86_400;

/**
 * Seconds until the next local midnight in `zone`. Page content is a function
 * of the calendar day, so this is exactly how long a cached copy stays right.
 * Unknown zones fall back to a whole day rather than throwing.
 */
export function secondsUntilMidnight(zone: string, now: Date = new Date()): number {
  let parts: string[];
  try {
    parts = elapsedFormatter(zone).format(now).split(':');
  } catch {
    return DAY;
  }
  const [hours, minutes, seconds] = parts.map(Number);
  if (![hours, minutes, seconds].every(Number.isFinite)) return DAY;
  return DAY - (hours * 3600 + minutes * 60 + seconds);
}

/** The soonest midnight across several zones, for pages that show more than one. */
export function secondsUntilFirstMidnight(zones: readonly string[], now: Date = new Date()): number {
  if (zones.length === 0) return DAY;
  return Math.min(...zones.map((zone) => secondsUntilMidnight(zone, now)));
}
