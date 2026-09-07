type Bucket = {tokens: number; updated: number};

export type RateLimitResult = {allowed: boolean; retryAfterSeconds: number};

export type LimiterOptions = {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Cap on tracked keys, so the limiter cannot itself exhaust memory. */
  maxKeys?: number;
  now?: () => number;
};

/**
 * A token bucket per client, refilled continuously.
 *
 * On the Forge origin this is one long-lived process, so the limit is real. On
 * Cloudflare each isolate keeps its own buckets, which makes it a smoothing
 * measure rather than a guarantee — the edge rate-limiting rule is the right
 * tool there.
 */
export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 5000,
  now = Date.now,
}: LimiterOptions) {
  const buckets = new Map<string, Bucket>();
  const refillPerMs = limit / windowMs;

  return function check(key: string): RateLimitResult {
    const timestamp = now();

    if (buckets.size >= maxKeys) {
      // Drop whatever has been idle longest; Map preserves insertion order.
      for (const [oldest, bucket] of buckets) {
        if (timestamp - bucket.updated > windowMs) buckets.delete(oldest);
        if (buckets.size < maxKeys) break;
      }
      if (buckets.size >= maxKeys) buckets.delete(buckets.keys().next().value as string);
    }

    const bucket = buckets.get(key) ?? {tokens: limit, updated: timestamp};
    const refilled = Math.min(limit, bucket.tokens + (timestamp - bucket.updated) * refillPerMs);

    if (refilled < 1) {
      buckets.set(key, {tokens: refilled, updated: timestamp});
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((1 - refilled) / refillPerMs / 1000)),
      };
    }

    buckets.set(key, {tokens: refilled - 1, updated: timestamp});
    return {allowed: true, retryAfterSeconds: 0};
  };
}

/**
 * The caller's address as seen through Cloudflare. Falls back to the first
 * X-Forwarded-For hop, then to a shared key — a shared key means one busy
 * client can slow others, which is the safe direction to fail.
 */
export function clientKey(request: Request): string {
  const cloudflare = request.headers.get('cf-connecting-ip');
  if (cloudflare) return cloudflare;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}
