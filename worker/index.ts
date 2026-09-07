/** Cloudflare Worker entry point. Also bundled into the standalone Node server. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// First path segments the app itself owns. Anything else is rewritten under the
// default language so it renders a real 404 inside a lang-aware <html> element.
const PASSTHROUGH = new Set([
  "ar", "en", "api", "assets", "_vinext", "__vinext",
  "robots.txt", "sitemap.xml", "favicon.svg", "favicon.ico",
]);

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    if (url.pathname === "/") {
      return new Response(null, {
        status: 308,
        headers: { location: "/ar", "cache-control": "public, max-age=86400" },
      });
    }

    const segment = url.pathname.split("/")[1];
    const outgoing = segment && !PASSTHROUGH.has(segment)
      ? new Request(new URL(`/ar${url.pathname}${url.search}`, url), request)
      : request;

    return handler.fetch(outgoing, env, ctx);
  },
};

export default worker;
