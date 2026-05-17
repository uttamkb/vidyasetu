/**
 * redis.ts — Redis client wrapper for Upstash Redis (optional)
 *
 * If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set,
 * uses Upstash Redis for distributed rate limiting and caching.
 * Otherwise, all operations return "unavailable" and callers fall back
 * to in-memory or database-backed implementations.
 */

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<string | null>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

let redisInstance: RedisClient | null = null;
let redisStatus: "available" | "unavailable" = "unavailable";

import { createRequire } from "module";

async function createRedisClient(): Promise<RedisClient | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    // We use createRequire + string joining to bypass Turbopack's static analysis.
    // This prevents the "Module not found" error for optional packages.
    const myRequire = createRequire(import.meta.url);
    const pkg = ["@", "upstash", "/", "redis"].join("");
    const { Redis } = myRequire(pkg);
    const client = new Redis({ url, token });

    // Test connectivity
    await client.ping();
    redisStatus = "available";
    console.log("[redis] Upstash Redis connected.");
    return client as unknown as RedisClient;
  } catch (err) {
    // Package not installed OR connection failed — both are fine, use fallback
    const msg = (err as Error).message || "";
    if (msg.includes("Cannot find module") || msg.includes("@upstash/redis")) {
      console.log("[redis] @upstash/redis not installed. Using in-memory fallback.");
    } else {
      console.warn("[redis] Failed to connect to Upstash Redis. Using in-memory fallback.", msg);
    }
    redisStatus = "unavailable";
    return null;
  }
}

export async function getRedis(): Promise<RedisClient | null> {
  if (redisInstance) return redisInstance;
  redisInstance = await createRedisClient();
  return redisInstance;
}

export function isRedisAvailable(): boolean {
  return redisStatus === "available";
}

/**
 * Helper for distributed rate limiting using Redis.
 * Returns remaining requests and reset time.
 */
export async function checkDistributedRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetInMs: number } | null> {
  try {
    const redis = await getRedis();
    if (!redis) {
      return null; // Signal caller to use in-memory fallback
    }

    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
    const redisKey = `ratelimit:${key}:${windowStart}`;

    const current = await redis.incr(redisKey);
    if (current === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    const remaining = Math.max(0, limit - current);
    const resetInMs = (windowStart + windowSeconds) * 1000 - Date.now();

    return {
      allowed: current <= limit,
      remaining,
      resetInMs: Math.max(0, resetInMs),
    };
  } catch (err) {
    console.warn("[redis] Distributed rate limit check failed. Falling back to in-memory.", (err as Error).message);
    return null;
  }
}
