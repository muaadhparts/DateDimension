type Level = 'debug' | 'info' | 'warn' | 'error';

/** Coordinates are the one genuinely sensitive value this app handles. */
const REDACT = /^(lat|lon|latitude|longitude)$/i;

/**
 * One JSON object per line through console, which is all both runtimes offer:
 * Cloudflare collects it in Workers Logs, and the Forge daemon writes it to the
 * supervisor log. No transport, no dependency, nothing async.
 */
export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    commit: process.env.APP_COMMIT,
    ...fields,
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** A URL safe to log: path kept, coordinates dropped. */
export function safePath(url: URL): string {
  const params = new URLSearchParams(url.search);
  for (const key of [...params.keys()]) if (REDACT.test(key)) params.set(key, '[redacted]');
  const query = params.toString();
  return url.pathname + (query ? `?${query}` : '');
}
