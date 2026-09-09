import {getArtwork} from '@/lib/quran/artwork';

export async function GET(_request: Request, {params}: {params: Promise<{page: string}>}) {
  try {
    const {page} = await params;
    const svg = await getArtwork(page);
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (error) {
    return new Response('Mushaf image unavailable', {
      status: error instanceof RangeError ? 404 : 503,
      headers: {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'},
    });
  }
}
