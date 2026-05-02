/**
 * rate-limit.ts — In-memory rate limiter for AI endpoints (MVP)
 *
 * Limits requests per userId within a sliding window.
 * For production, replace with @upstash/ratelimit + Redis for
 * distributed rate limiting across multiple server instances.
 *
 * Default: 30 requests per 60 seconds per user (matches architecture.md spec)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store — reset on server restart (acceptable for MVP dev server)
const store = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

/**
 * Check whether a userId is within their rate limit.
 *
 * @param userId    - the authenticated user's ID
 * @param limit     - max requests per window (default: 30)
 * @param windowMs  - window size in ms (default: 60_000 = 1 minute)
 */
export function checkRateLimit(
  userId: string,
  limit = 30,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now > entry.resetAt) {
    // Fresh window
    store.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetInMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetInMs: entry.resetAt - now };
}
