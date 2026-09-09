/** Pinned Hafs/KFQC artwork. Text data in data/quran is never transformed. */
export const ARTWORK_REVISION = 'b91d39e1065b57bdda3e94aca8ecf3575e50e1e6';
export const ARTWORK_SOURCE = `https://github.com/quranpedia/quran-svg/tree/${ARTWORK_REVISION}/mushafs/hafs/kfqc`;
export function artworkUrl(page: number) {
  return `/api/mushaf/${String(page).padStart(3, '0')}.svg?v=${ARTWORK_REVISION}`;
}

const MAX_BYTES = 2_000_000;
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
let cacheBytes = 0;

/** Fixed upstream, bounded memory/response size, coalesced concurrent requests. */
export async function getArtwork(file: string, fetcher: typeof fetch = fetch): Promise<string> {
  if (
    !/^\d{3}\.svg$/.test(file) ||
    Number(file.slice(0, 3)) < 1 ||
    Number(file.slice(0, 3)) > 604
  ) {
    throw new RangeError('Invalid mushaf page');
  }
  const cached = cache.get(file);
  if (cached) return cached;
  const active = pending.get(file);
  if (active) return active;
  if (pending.size >= 6) throw new Error('Mushaf artwork busy');
  const task = (async () => {
    const response = await fetcher(
      `https://raw.githubusercontent.com/quranpedia/quran-svg/${ARTWORK_REVISION}/mushafs/hafs/kfqc/svg/${file}`,
      {signal: AbortSignal.timeout(12_000), redirect: 'error'},
    );
    if (!response.ok || !response.body) throw new Error('Mushaf artwork unavailable');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    let svg = '';
    try {
      for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new Error('Mushaf artwork too large');
        svg += decoder.decode(value, {stream: true});
      }
      svg += decoder.decode();
    } finally {
      await reader.cancel();
    }
    if (
      !/<svg\s/.test(svg) ||
      !/viewBox=["'][^"']+["']/.test(svg) ||
      !svg.trimEnd().endsWith('</svg>')
    ) {
      throw new Error('Invalid mushaf artwork');
    }
    // SVG is served only as an image, never inserted as HTML. Reject active content too.
    if (/<(?:script|foreignObject)\b|\bon\w+\s*=|(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg)) {
      throw new Error('Unsupported active artwork');
    }
    while (cache.size && cacheBytes + svg.length * 2 > 8_000_000) {
      const oldest = cache.keys().next().value!;
      cacheBytes -= cache.get(oldest)!.length * 2;
      cache.delete(oldest);
    }
    cache.set(file, svg);
    cacheBytes += svg.length * 2;
    return svg;
  })();
  pending.set(file, task);
  try {
    return await task;
  } finally {
    pending.delete(file);
  }
}
