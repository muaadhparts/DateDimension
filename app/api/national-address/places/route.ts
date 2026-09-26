import {
  AddressLookupUnavailable,
  addressLookupAvailable,
  suggestPlaces,
} from '@/lib/national-address';
import {clientKey, createRateLimiter} from '@/lib/rate-limit';
import {log} from '@/lib/log';

// One request per pause in typing; the page waits before asking.
const rateLimit = createRateLimiter({limit: 40, windowMs: 60_000});
const noStore = {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'};

/** Place suggestions for the map's search box: ?input=…&session=…&lang=ar */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const lang = p.get('lang') === 'en' ? 'en' : 'ar';
  const input = (p.get('input') ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const session = (p.get('session') ?? '').replace(/[^\w-]/g, '').slice(0, 64);
  if (input.length < 2) return Response.json({data: []}, {headers: noStore});
  if (!addressLookupAvailable()) {
    return Response.json({error: 'not_configured'}, {status: 503, headers: noStore});
  }
  const allowance = rateLimit(clientKey(request));
  if (!allowance.allowed) {
    return Response.json(
      {error: 'rate_limited'},
      {status: 429, headers: {...noStore, 'Retry-After': String(allowance.retryAfterSeconds)}},
    );
  }
  try {
    return Response.json({data: await suggestPlaces(input, lang, session)}, {headers: noStore});
  } catch (error) {
    log('warn', 'place_suggestions_failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    const status = error instanceof AddressLookupUnavailable ? 503 : 500;
    return Response.json({error: 'unavailable'}, {status, headers: noStore});
  }
}
