import {getPrayers, InvalidPrayerRequest} from '@/lib/prayers';

export async function GET(request: Request) {
  try {
    const data = await getPrayers(new URL(request.url).searchParams);
    // Times for a given place and day never change, so a shared cache can hold
    // them; the response carries no visitor-specific data.
    return Response.json({data}, {
      headers: {'Cache-Control': 'public, max-age=300, s-maxage=3600', 'X-Robots-Tag': 'noindex'},
    });
  } catch (error) {
    const invalid = error instanceof InvalidPrayerRequest;
    if (!invalid) {
      console.error(JSON.stringify({
        level: 'error', event: 'prayer_request_failed',
        message: error instanceof Error ? error.message : String(error),
      }));
    }
    return Response.json(
      {error: invalid ? 'Invalid search parameters' : 'Prayer data unavailable'},
      {status: invalid ? 400 : 503, headers: {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'}},
    );
  }
}
