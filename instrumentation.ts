import {log} from '@/lib/log';

/**
 * vinext calls this lazily, on the first request rather than at process start,
 * so the boot line appears with the first traffic.
 */
export async function register(): Promise<void> {
  const timeZone = process.env.TZ;
  log('info', 'boot', {
    builtAt: process.env.APP_BUILT_AT,
    runtime: process.versions?.node ? 'node' : 'workers',
    siteUrl: process.env.SITE_URL ?? null,
    indexable: process.env.PUBLIC_INDEXING === 'true',
    timeZone: timeZone ?? null,
  });
  if (timeZone && timeZone !== 'UTC') {
    log('warn', 'non_utc_timezone', {
      timeZone,
      detail: 'prayer times are computed at UTC noon, so this is safe, but logs will be confusing',
    });
  }
}

/** Replaces the silence that used to swallow every server-side failure. */
export async function onRequestError(
  error: unknown,
  request: {path?: string; method?: string},
  context: {routerKind?: string; routePath?: string; renderSource?: string},
): Promise<void> {
  log('error', 'request_error', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack?.split('\n').slice(0, 8).join('\n') : undefined,
    path: request.path,
    method: request.method,
    ...context,
  });
}
