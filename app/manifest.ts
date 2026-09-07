import type {MetadataRoute} from 'next';

/**
 * Enough to install the site from a browser. Deliberately no service worker:
 * a cached page showing yesterday's date is worse than no page at all for a
 * site whose whole purpose is telling you what day it is.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'يومك الآن · Your Day Now',
    short_name: 'يومك الآن',
    description: 'التاريخ الهجري والميلادي، الوقت الآن، ومواقيت الصلاة.',
    lang: 'ar',
    dir: 'rtl',
    start_url: '/ar',
    scope: '/',
    display: 'standalone',
    background_color: '#091412',
    theme_color: '#091412',
    icons: [
      {src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml'},
      {src: '/icon-192.png', sizes: '192x192', type: 'image/png'},
      {src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
    ],
  };
}
