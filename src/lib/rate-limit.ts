import { checkDistributedRateLimit } from "./redis";

/**
 * rate-limit.ts — Rate limiter for AI endpoints
 *
 * Attempts distributed rate limiting via Redis (Upstash) first.
 * Falls back to in-memory Map if Redis is unavailable.
 *
 * Default: 60 requests per 60 seconds per user (tuned for classroom concurrency bursts)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store — reset on server restart (fallback for single-instance or dev)
const store = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

function checkInMemoryRateLimit(
  userId: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now > entry.resetAt) {
    store.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetInMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetInMs: entry.resetAt - now };
}

/**
 * Check whether a userId is within their rate limit.
 * Tries distributed Redis first, falls back to in-memory.
 *
 * @param userId    - the authenticated user's ID
 * @param limit     - max requests per window (default: 60)
 * @param windowMs  - window size in ms (default: 60_000 = 1 minute)
 */
export async function checkRateLimit(
  userId: string,
  limit = 60,
  windowMs = 60_000
): Promise<RateLimitResult> {
  // Try distributed rate limiting first
  const distributed = await checkDistributedRateLimit(
    userId,
    limit,
    Math.ceil(windowMs / 1000)
  );

  // If distributed check returned "unavailable" (Redis not configured),
  // fall back to in-memory
  if (!distributed) {
    return checkInMemoryRateLimit(userId, limit, windowMs);
  }

  return distributed;
}
