const rateLimit = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory rate limiter for API routes.
 * For production at scale, use Redis-based rate limiting (e.g., @upstash/ratelimit).
 * 
 * @param key - Unique identifier (e.g., userId + endpoint)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { allowed: boolean, remaining: number, retryAfter?: number }
 */
export function checkRateLimit(
    key: string,
    maxRequests: number = 10,
    windowMs: number = 60_000
): { allowed: boolean; remaining: number; retryAfter?: number } {
    const now = Date.now();
    const record = rateLimit.get(key);

    // Clean up expired entries periodically (every 100 checks)
    if (Math.random() < 0.01) {
        for (const [k, v] of rateLimit.entries()) {
            if (v.resetAt < now) rateLimit.delete(k);
        }
    }

    if (!record || record.resetAt < now) {
        rateLimit.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1 };
    }

    if (record.count >= maxRequests) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);
        return { allowed: false, remaining: 0, retryAfter };
    }

    record.count++;
    return { allowed: true, remaining: maxRequests - record.count };
}
