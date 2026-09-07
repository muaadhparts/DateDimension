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

const nextConfig: NextConfig = {
  // Adds dist/standalone/server.js for the self-hosted Node deployment on
  // Laravel Forge. dist/server and dist/client are unchanged, so Cloudflare
  // Sites deployments keep using the same worker build.
  output: 'standalone',
  env: {
    APP_COMMIT: commit(),
    APP_BUILT_AT: new Date().toISOString(),
  },
};

export default nextConfig;
