/**
 * Fixed-window in-memory rate limiter. Good for a single instance; swap the
 * store for Redis/Upstash when running several instances.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) sweep(now);
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  b.count++;
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
}

function sweep(now: number) {
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/** True when `key` has used up its budget, without consuming an attempt. */
export function isRateLimited(key: string, limit: number, now = Date.now()) {
  const b = buckets.get(key);
  return !!b && b.resetAt > now && b.count >= limit;
}

/** Gives back one reserved attempt (e.g. after a successful login). */
export function refundRateLimit(key: string) {
  const b = buckets.get(key);
  if (b && b.count > 0) b.count--;
}

export function resetRateLimits() {
  buckets.clear();
}
