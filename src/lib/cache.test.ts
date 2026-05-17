import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cacheGet, cacheSet, withCache, cacheInvalidate, cacheClear, cacheStats } from "./cache";

// Redis unavailable in unit tests — all tests exercise in-memory path
vi.mock("./redis", () => ({
  isRedisAvailable: vi.fn().mockReturnValue(false),
  getRedis: vi.fn().mockResolvedValue(null),
}));

describe("cache", () => {
  beforeEach(() => {
    cacheClear();
  });

  afterEach(() => {
    cacheClear();
  });

  it("returns null for missing key", async () => {
    const result = await cacheGet("missing");
    expect(result).toBeNull();
  });

  it("stores and retrieves values", async () => {
    await cacheSet("key1", { data: "value" });
    const result = await cacheGet("key1");
    expect(result).toEqual({ data: "value" });
  });

  it("returns null for an entry with negative TTL (already expired)", async () => {
    await cacheSet("k-expired", "some-value", -1);
    const result = await cacheGet("k-expired");
    expect(result).toBeNull();
  });

  it("cleans up expired entry from memory on get", async () => {
    await cacheSet("k-cleanup", "val", -1);
    await cacheGet("k-cleanup");
    expect(cacheStats().memoryEntries).toBe(0);
  });

  it("withCache returns cached value on hit", async () => {
    const generator = vi.fn().mockResolvedValue("generated");

    // First call — cache miss
    const result1 = await withCache("test", ["a", 1], generator);
    expect(result1.value).toBe("generated");
    expect(result1.fromCache).toBe(false);
    expect(generator).toHaveBeenCalledTimes(1);

    // Second call — cache hit
    const result2 = await withCache("test", ["a", 1], generator);
    expect(result2.value).toBe("generated");
    expect(result2.fromCache).toBe(true);
    expect(generator).toHaveBeenCalledTimes(1);
  });

  it("withCache re-calls generator when TTL has expired", async () => {
    const gen = vi.fn()
      .mockResolvedValueOnce("old-value")
      .mockResolvedValueOnce("new-value");

    await withCache("ns", ["ttl-key"], gen, -1);
    const { value, fromCache } = await withCache("ns", ["ttl-key"], gen, 60_000);

    expect(value).toBe("new-value");
    expect(fromCache).toBe(false);
    expect(gen).toHaveBeenCalledTimes(2);
  });

  it("withCache handles different namespaces independently", async () => {
    const gen1 = vi.fn().mockResolvedValue("val1");
    const gen2 = vi.fn().mockResolvedValue("val2");

    await withCache("ns1", ["key"], gen1);
    await withCache("ns2", ["key"], gen2);

    expect(gen1).toHaveBeenCalledTimes(1);
    expect(gen2).toHaveBeenCalledTimes(1);
  });

  it("cacheStats reports memory entries", async () => {
    expect(cacheStats().memoryEntries).toBe(0);
    await cacheSet("key", "value");
    expect(cacheStats().memoryEntries).toBe(1);
  });

  it("cacheStats reports redisAvailable as false in test environment", () => {
    expect(cacheStats().redisAvailable).toBe(false);
  });

  it("cacheClear removes all entries", async () => {
    await cacheSet("key1", "value1");
    await cacheSet("key2", "value2");
    cacheClear();
    expect(await cacheGet("key1")).toBeNull();
    expect(await cacheGet("key2")).toBeNull();
  });

  it("cacheInvalidate removes entries matching namespace prefix", async () => {
    await cacheSet("content:abc", "val1", 60_000);
    await cacheSet("content:def", "val2", 60_000);
    await cacheSet("other:abc", "val3", 60_000);

    await cacheInvalidate("content");

    expect(await cacheGet("content:abc")).toBeNull();
    expect(await cacheGet("content:def")).toBeNull();
    expect(await cacheGet("other:abc")).toBe("val3");
  });

  it("cacheInvalidate is a no-op when no keys match namespace", async () => {
    await cacheSet("topics:x", "value", 60_000);
    await cacheInvalidate("no-match");
    expect(await cacheGet("topics:x")).toBe("value");
  });

  it("expires entries after TTL elapses", async () => {
    await cacheSet("expire", "value", 10);
    expect(await cacheGet("expire")).toBe("value");

    await new Promise((r) => setTimeout(r, 50));
    expect(await cacheGet("expire")).toBeNull();
  });
});
