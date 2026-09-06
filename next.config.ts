import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Adds dist/standalone/server.js for the self-hosted Node deployment on
  // Laravel Forge. dist/server and dist/client are unchanged, so Cloudflare
  // Sites deployments keep using the same worker build.
  output: "standalone",
};

export default nextConfig;
