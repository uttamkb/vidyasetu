/**
 * cache.ts — Multi-tier caching with Redis L1 + in-memory L2 fallback
 *
 * Provides cache-first lookups with automatic fallback to generation.
 * Cache keys are deterministic hashes of input parameters.
 *
 * Tiers:
 *   L1: Redis (distributed, survives deploys) — optional
 *   L2: In-memory Map (fast, resets on deploy) — always available
 *   L3: Database (persistent, for content packs) — optional
 *
 * All tiers are best-effort. Cache misses always fall back to generation.
 */

import { createHash } from "crypto";
import { getRedis, isRedisAvailable } from "./redis";

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // timestamp ms
}

// L2: In-memory cache (resets on deploy)
const memoryCache = new Map<string, CacheEntry<any>>();

// Default TTL: 7 days for content, 1 hour for evaluations
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EVALUATION_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashKey(...parts: (string | number | boolean | undefined)[]): string {
  const normalized = parts.map((p) => (p === undefined ? "__undef__" : String(p))).join("::");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

function isExpired(entry: CacheEntry<any>): boolean {
  return Date.now() > entry.expiresAt;
}

/**
 * Get from cache (L1 → L2)
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  // L1: Redis
  if (isRedisAvailable()) {
    try {
      const redis = await getRedis();
      if (redis) {
        const raw = await redis.get(`cache:${key}`);
        if (raw) {
          const parsed = JSON.parse(raw) as CacheEntry<T>;
          if (!isExpired(parsed)) {
            return parsed.value;
          }
          // Expired — remove from Redis
          await redis.del(`cache:${key}`);
        }
      }
    } catch (err) {
      console.error("[cache] Redis L1 get failed:", err);
    }
  }

  // L2: Memory
  const mem = memoryCache.get(key);
  if (mem && !isExpired(mem)) {
    return mem.value;
  }
  if (mem) {
    memoryCache.delete(key); // Clean up expired
  }

  return null;
}

/**
 * Set in cache (L1 + L2)
 */
export async function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): Promise<void> {
  const entry: CacheEntry<T> = { value, expiresAt: Date.now() + ttlMs };

  // L2: Always set in memory
  memoryCache.set(key, entry);

  // L1: Set in Redis if available
  if (isRedisAvailable()) {
    try {
      const redis = await getRedis();
      if (redis) {
        await redis.set(`cache:${key}`, JSON.stringify(entry), { ex: Math.ceil(ttlMs / 1000) });
      }
    } catch (err) {
      console.error("[cache] Redis L1 set failed:", err);
    }
  }
}

/**
 * Cache-first wrapper — tries cache, falls back to generator, stores result
 *
 * Usage:
 *   const result = await withCache("content", [topicId, version], () => generateContent(topicId));
 */
export async function withCache<T>(
  namespace: string,
  keyParts: (string | number | boolean | undefined)[],
  generator: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<{ value: T; fromCache: boolean }> {
  const key = `${namespace}:${hashKey(...keyParts)}`;

  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return { value: cached, fromCache: true };
  }

  const generated = await generator();
  await cacheSet(key, generated, ttlMs);
  return { value: generated, fromCache: false };
}

/**
 * Invalidate cache entries by namespace prefix
 */
export async function cacheInvalidate(namespace: string): Promise<void> {
  // L2: Memory
  for (const [key] of memoryCache) {
    if (key.startsWith(`${namespace}:`)) {
      memoryCache.delete(key);
    }
  }

  // L1: Redis (scan and delete)
  if (isRedisAvailable()) {
    try {
      const redis = await getRedis();
      if (redis) {
        // Note: Redis scan not implemented in our simple interface
        // For production, use Redis SCAN + DEL or Redis KeyDB
        console.log("[cache] Redis invalidation for", namespace, "— manual cleanup needed");
      }
    } catch (err) {
      console.error("[cache] Redis invalidation failed:", err);
    }
  }
}

/**
 * Clear all memory cache entries (useful for tests)
 */
export function cacheClear(): void {
  memoryCache.clear();
}

/**
 * Get cache statistics (for observability)
 */
export function cacheStats(): { memoryEntries: number; redisAvailable: boolean } {
  return {
    memoryEntries: memoryCache.size,
    redisAvailable: isRedisAvailable(),
  };
}
