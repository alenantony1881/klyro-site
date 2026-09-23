import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the caller may retry. Only meaningful when ok === false. */
  retryAfter: number;
}

const BURST = { limit: 8, windowSec: 60 };
const DAILY = { limit: 40, windowSec: 86_400 };

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const upstash = hasUpstash
  ? (() => {
      const redis = Redis.fromEnv();
      return {
        burst: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(BURST.limit, `${BURST.windowSec} s`),
          prefix: "klyro:burst",
          analytics: false,
        }),
        daily: new Ratelimit({
          redis,
          limiter: Ratelimit.fixedWindow(DAILY.limit, `${DAILY.windowSec} s`),
          prefix: "klyro:daily",
          analytics: false,
        }),
      };
    })()
  : null;

// Fallback for local dev and any deploy without Upstash configured. Per-instance
// only — it resets on cold start and does not span serverless instances, so it is
// a speed bump, not a real control. The Anthropic console spend cap is the backstop.
type Bucket = { hits: number[]; dayCount: number; dayStart: number };
const memory = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  const cutoff = now - DAILY.windowSec * 1000;
  const stale: string[] = [];
  memory.forEach((b, key) => {
    if (b.dayStart < cutoff && b.hits.length === 0) stale.push(key);
  });
  stale.forEach((key) => memory.delete(key));
}

function memoryLimit(key: string): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = memory.get(key) ?? { hits: [], dayCount: 0, dayStart: now };
  const burstCutoff = now - BURST.windowSec * 1000;
  bucket.hits = bucket.hits.filter((t) => t > burstCutoff);

  if (now - bucket.dayStart >= DAILY.windowSec * 1000) {
    bucket.dayStart = now;
    bucket.dayCount = 0;
  }

  if (bucket.hits.length >= BURST.limit) {
    memory.set(key, bucket);
    const oldest = bucket.hits[0];
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((oldest + BURST.windowSec * 1000 - now) / 1000)),
    };
  }

  if (bucket.dayCount >= DAILY.limit) {
    memory.set(key, bucket);
    return {
      ok: false,
      retryAfter: Math.max(
        1,
        Math.ceil((bucket.dayStart + DAILY.windowSec * 1000 - now) / 1000),
      ),
    };
  }

  bucket.hits.push(now);
  bucket.dayCount += 1;
  memory.set(key, bucket);
  return { ok: true, retryAfter: 0 };
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  if (!upstash) return memoryLimit(identifier);

  try {
    const [burst, daily] = await Promise.all([
      upstash.burst.limit(identifier),
      upstash.daily.limit(identifier),
    ]);

    if (!burst.success || !daily.success) {
      const reset = !burst.success ? burst.reset : daily.reset;
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
      };
    }
    return { ok: true, retryAfter: 0 };
  } catch (err) {
    // Never let the limiter take the endpoint down.
    console.error("Rate limit backend error, falling back to memory:", err);
    return memoryLimit(identifier);
  }
}

export function clientIdentifier(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "anonymous";
}
