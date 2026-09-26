import {mapLoaderUrl} from '@/lib/national-address';

/**
 * Where the page loads Google's map from. Asked for at run time, after the page
 * has rendered, so the cached HTML never holds the key.
 */
export function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'ar';
  const loaderUrl = mapLoaderUrl(lang);
  const headers = {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'};
  return loaderUrl
    ? Response.json({data: {loaderUrl}}, {headers})
    : Response.json({error: 'not_configured'}, {status: 503, headers});
}
