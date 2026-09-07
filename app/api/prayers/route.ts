import {getPrayers, InvalidPrayerRequest} from '@/lib/prayers';
import {log, safePath} from '@/lib/log';
import {clientKey, createRateLimiter} from '@/lib/rate-limit';

// Generous for a person changing a city or a date, tight enough that nobody
// can use this endpoint as their own geocoding relay.
const rateLimit = createRateLimiter({limit: 30, windowMs: 60_000});

export async function GET(request: Request) {
  const allowance = rateLimit(clientKey(request));
  if (!allowance.allowed) {
    return Response.json(
      {error: 'Too many requests'},
      {
        status: 429,
        headers: {
          'Retry-After': String(allowance.retryAfterSeconds),
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex',
        },
      },
    );
  }

  try {
    const data = await getPrayers(new URL(request.url).searchParams);
    // Times for a given place and day never change, so a shared cache can hold
    // them; the response carries no visitor-specific data.
    return Response.json(
      {data},
      {
        headers: {'Cache-Control': 'public, max-age=300, s-maxage=3600', 'X-Robots-Tag': 'noindex'},
      },
    );
  } catch (error) {
    const invalid = error instanceof InvalidPrayerRequest;
    if (!invalid) {
      log('error', 'prayer_request_failed', {
        message: error instanceof Error ? error.message : String(error),
        path: safePath(new URL(request.url)),
      });
    }
    return Response.json(
      {error: invalid ? 'Invalid search parameters' : 'Prayer data unavailable'},
      {
        status: invalid ? 400 : 503,
        headers: {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'},
      },
    );
  }
}
