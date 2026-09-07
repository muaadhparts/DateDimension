import {execSync} from 'node:child_process';
import type {NextConfig} from 'next';

/**
 * Stamped into both bundles at build time so a running deployment can say which
 * commit it is. Forge builds inside the site's git checkout, GitHub Actions
 * supplies GITHUB_SHA, and neither being available is not fatal.
 */
function commit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', {encoding: 'utf8'}).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * A static policy, not a per-request nonce: a nonce cannot be embedded in
 * cached HTML, and the JSON-LD block is per-page dynamic so hashes would not
 * hold either. It still blocks the realistic attack — an injected external
 * script — and locks down framing, base URIs, objects and form targets.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // The framework inlines its bootstrap, and the page inlines JSON-LD.
  "script-src 'self' 'unsafe-inline'",
  // The clock hands are positioned with inline style attributes.
  "style-src 'self' 'unsafe-inline'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  // Only same-origin: the prayer API and the geocoder are called server-side.
  "connect-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  // Adds dist/standalone/server.js for the self-hosted Node deployment on
  // Laravel Forge. dist/server and dist/client are unchanged, so Cloudflare
  // Sites deployments keep using the same worker build.
  output: 'standalone',
  env: {
    APP_COMMIT: commit(),
    APP_BUILT_AT: new Date().toISOString(),
  },
  // Applied by vinext inside the shared request pipeline, so these reach both
  // the Cloudflare Worker and the standalone Node server from one place.
  // X-Frame-Options is deliberately absent: nginx already sends it on the Forge
  // deployment, and CSP frame-ancestors supersedes it anyway.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {key: 'Content-Security-Policy', value: CSP},
          {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
          // geolocation stays enabled: "use my location" depends on it.
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), camera=(), microphone=(), payment=()',
          },
          {key: 'X-Content-Type-Options', value: 'nosniff'},
          {key: 'Cross-Origin-Opener-Policy', value: 'same-origin'},
          {key: 'Strict-Transport-Security', value: 'max-age=15552000'},
        ],
      },
    ];
  },
};

export default nextConfig;
