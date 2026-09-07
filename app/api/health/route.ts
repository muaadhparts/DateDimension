import {SITE_URL, INDEXABLE} from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * Liveness plus the identity of what is running, so a deployment can be
 * confirmed rather than assumed and an uptime check has something to assert on.
 */
export async function GET() {
  const configured = Boolean(process.env.SITE_URL);
  return Response.json(
    {
      status: configured ? 'ok' : 'degraded',
      commit: process.env.APP_COMMIT ?? 'unknown',
      builtAt: process.env.APP_BUILT_AT ?? null,
      runtime: (globalThis as {process?: {versions?: {node?: string}}}).process?.versions?.node
        ? 'node'
        : 'workers',
      siteUrl: SITE_URL,
      indexable: INDEXABLE,
      // False when SITE_URL is missing: the site would still serve, but every
      // canonical URL would come from the fallback rather than the environment.
      configOk: configured,
      now: new Date().toISOString(),
    },
    {headers: {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'}},
  );
}
