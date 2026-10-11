/**
 * Sliding-window rate limiter held in memory.
 * Fine for a single server or a quiet portfolio. On serverless platforms each
 * instance has its own memory, so swap the store for Redis (e.g. Upstash) if you
 * need a hard global limit.
 */
const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs, now = Date.now() }: { limit: number; windowMs: number; now?: number },
): RateLimitResult {
  if (hits.size > MAX_KEYS) prune(now, windowMs);

  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    const retryAfterSec = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSec };
  }

  recent.push(now);
  hits.set(key, recent);
  return { ok: true, remaining: limit - recent.length, retryAfterSec: 0 };
}

function prune(now: number, windowMs: number) {
  for (const [k, v] of hits) {
    if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
}

export const __resetRateLimit = () => hits.clear();

/** First hop of x-forwarded-for. Only trust this behind a proxy you control (Vercel, Nginx...). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
