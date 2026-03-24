import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting for BloggerSEO API routes.
 *
 * Production: Uses Upstash Redis for distributed rate limiting across serverless instances.
 * Development: Falls back to in-memory rate limiting when Redis env vars are not set.
 *
 * Setup for production:
 * 1. Create a free Upstash Redis database at https://upstash.com
 * 2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your environment
 */

// ─── In-Memory Fallback (Development Only) ───────────────────────────────────────
const memoryRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const record = memoryRateLimit.get(key);

  // Clean up expired entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    for (const [k, v] of memoryRateLimit.entries()) {
      if (v.resetAt < now) memoryRateLimit.delete(k);
    }
  }

  if (!record || record.resetAt < now) {
    memoryRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

// ─── Upstash Redis Rate Limiter (Production) ─────────────────────────────────────
let upstashRatelimit: Ratelimit | null = null;

function getUpstashRatelimit(): Ratelimit | null {
  if (upstashRatelimit) return upstashRatelimit;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return null;
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    upstashRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"), // Default: 10 requests per minute
      analytics: true,
      prefix: "bloggerseo:ratelimit",
    });

    return upstashRatelimit;
  } catch (error) {
    console.error("Failed to initialize Upstash rate limiter:", error);
    return null;
  }
}

// ─── Rate Limit Presets ──────────────────────────────────────────────────────────
export const RATE_LIMITS = {
  // Article generation - expensive operation
  generate: { requests: 5, window: 60_000 },
  // Article writer workflow
  articleWriter: { requests: 10, window: 60_000 },
  // Agent runs - CPU-intensive
  agents: { requests: 3, window: 60_000 },
  // API calls - moderate
  api: { requests: 30, window: 60_000 },
  // Auth operations - strict to prevent brute force
  auth: { requests: 5, window: 300_000 },
  // SEO Autopilot analysis - expensive AI operation
  autopilot: { requests: 3, window: 60_000 },
} as const;

// ─── Main Rate Limit Function ────────────────────────────────────────────────────
/**
 * Check rate limit for a given key.
 * Uses Upstash Redis in production, falls back to in-memory in development.
 *
 * @param key - Unique identifier (e.g., `generate:${userId}`)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { allowed: boolean, remaining: number, retryAfter?: number }
 */
export async function checkRateLimitAsync(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const upstash = getUpstashRatelimit();

  if (upstash) {
    try {
      const result = await upstash.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
      };
    } catch (error) {
      console.error("Upstash rate limit error, falling back to memory:", error);
      // Fall through to memory rate limit
    }
  }

  // Fallback to in-memory (development or if Upstash fails)
  return checkMemoryRateLimit(key, maxRequests, windowMs);
}

/**
 * Synchronous rate limit check (backward compatible).
 * Note: In production with Upstash, this will use memory fallback.
 * For proper production rate limiting, use checkRateLimitAsync().
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; retryAfter?: number } {
  // For sync calls, we can only use the memory implementation
  // Production routes should migrate to checkRateLimitAsync
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return checkMemoryRateLimit(key, maxRequests, windowMs);
  }

  // Log warning in production if using sync method
  if (process.env.NODE_ENV === "production") {
    console.warn(
      `[Rate Limit] Sync rate limit check for "${key}" - consider using checkRateLimitAsync for proper distributed rate limiting`
    );
  }

  return checkMemoryRateLimit(key, maxRequests, windowMs);
}

/**
 * Rate limit middleware helper for API routes.
 * Returns a Response if rate limited, null otherwise.
 */
export async function rateLimitMiddleware(
  identifier: string,
  preset: keyof typeof RATE_LIMITS = "api"
): Promise<Response | null> {
  const { requests, window } = RATE_LIMITS[preset];
  const result = await checkRateLimitAsync(`${preset}:${identifier}`, requests, window);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: `Rate limit exceeded. Try again in ${result.retryAfter}s.`,
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfter || 60),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
