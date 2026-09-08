import {locationFromRequest} from '@/lib/location';
import {reverseGeocode, googleGeocodingAvailable, InvalidPrayerRequest} from '@/lib/prayers';
import {clientKey, createRateLimiter} from '@/lib/rate-limit';
import {log} from '@/lib/log';

// Reverse geocoding is billable, so this is tighter than the prayer endpoint.
const rateLimit = createRateLimiter({limit: 12, windowMs: 60_000});

/**
 * Where the visitor probably is.
 *
 * With no parameters it answers from Cloudflare's connection-level headers,
 * which cost nothing and need no permission. With coordinates — which only the
 * browser can supply, and only after the visitor allows it — it resolves a
 * real place name.
 *
 * Never cached: the answer is different for every caller.
 */
export async function GET(request: Request) {
  const noStore = {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'};
  const url = new URL(request.url);
  const language = url.searchParams.get('lang') === 'ar' ? 'ar' : 'en';

  const hasCoordinates = url.searchParams.has('lat') && url.searchParams.has('lon');
  if (!hasCoordinates) {
    return Response.json({data: locationFromRequest(request)}, {headers: noStore});
  }

  const allowance = rateLimit(clientKey(request));
  if (!allowance.allowed) {
    return Response.json(
      {error: 'Too many requests'},
      {status: 429, headers: {...noStore, 'Retry-After': String(allowance.retryAfterSeconds)}},
    );
  }

  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({error: 'Invalid coordinates'}, {status: 400, headers: noStore});
  }

  if (!googleGeocodingAvailable()) {
    // The coordinates still work for prayer times; only the name is missing.
    return Response.json(
      {
        data: {
          city: null,
          country: null,
          countryCode: null,
          lat,
          lon,
          timezone: null,
          source: 'none',
        },
      },
      {headers: noStore},
    );
  }

  try {
    const place = await reverseGeocode(lat, lon, language);
    return Response.json(
      {
        data: place
          ? {
              city: place.city,
              country: place.country,
              countryCode: null,
              lat: place.lat,
              lon: place.lon,
              timezone: place.zone,
              source: 'device',
            }
          : {
              city: null,
              country: null,
              countryCode: null,
              lat,
              lon,
              timezone: null,
              source: 'none',
            },
      },
      {headers: noStore},
    );
  } catch (error) {
    if (error instanceof InvalidPrayerRequest) {
      return Response.json({error: 'Invalid coordinates'}, {status: 400, headers: noStore});
    }
    // Never log the coordinates themselves.
    log('warn', 'reverse_geocode_failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return Response.json({error: 'Location lookup unavailable'}, {status: 503, headers: noStore});
  }
}
