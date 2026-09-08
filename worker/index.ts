/** Cloudflare Worker entry point. Also bundled into the standalone Node server. */
import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
} from 'vinext/server/image-optimization';
import handler from 'vinext/server/app-router-entry';
import {applyEdgeCache, isRscRequest, policyFor} from './edge-cache.ts';

interface Env {
  ASSETS: {fetch(request: Request): Promise<Response>};
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: {format: string; quality: number}): Promise<{response(): Response}>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Path prefixes the app itself owns. Anything else that looks like a page is
// rewritten under the default language so it renders a real 404 inside a
// lang-aware <html> element.
const PASSTHROUGH = new Set(['ar', 'en', 'api', 'assets', '_vinext', '__vinext']);

// A request for a file is left alone. The test is the last segment, not the
// first: /favicon.svg is a file and so is /fonts/amiri-quran-arabic.woff2,
// and testing only the first segment sent the second one to /ar/fonts/… — the
// mushaf shipped without its font because of exactly that.
const isFile = (pathname: string) => pathname.slice(pathname.lastIndexOf('/') + 1).includes('.');

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/_vinext/image') {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(
        request,
        {
          fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, {width, format, quality}) => {
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? {width} : {})
              .output({format, quality});
            return result.response();
          },
        },
        allowedWidths,
      );
    }

    if (url.pathname === '/') {
      return new Response(null, {
        status: 308,
        headers: {location: '/ar', 'cache-control': 'public, max-age=86400'},
      });
    }

    const segment = url.pathname.split('/')[1];
    const outgoing =
      segment && !PASSTHROUGH.has(segment) && !isFile(url.pathname)
        ? new Request(new URL(`/ar${url.pathname}${url.search}`, url), request)
        : request;

    // Cloudflare does not store a Worker's own responses, so ask it to. The key
    // drops the query string and every header: these pages vary on neither, and
    // RSC navigations are excluded because they answer with a different body.
    const edge =
      typeof caches !== 'undefined' ? (caches as unknown as {default?: Cache}).default : undefined;
    const cacheable =
      request.method === 'GET' && !isRscRequest(request) && policyFor(url.pathname) !== null;

    if (edge && cacheable) {
      // The build is part of the key, so a deployment orphans every stored
      // copy instead of serving yesterday's HTML until it expires. Purging by
      // API would need a token permission this account does not grant.
      const key = new Request(
        new URL(`${url.pathname}?b=${process.env.APP_COMMIT ?? 'dev'}`, url).toString(),
        {method: 'GET'},
      );
      const hit = await edge.match(key);
      if (hit) return hit;

      const fresh = applyEdgeCache(url.pathname, await handler.fetch(outgoing, env, ctx));
      if (fresh.status === 200) ctx.waitUntil(edge.put(key, fresh.clone()));
      return fresh;
    }

    const response = await handler.fetch(outgoing, env, ctx);
    return cacheable ? applyEdgeCache(url.pathname, response) : response;
  },
};

export default worker;
