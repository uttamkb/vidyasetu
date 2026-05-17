import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

// Mock redis
vi.mock("./redis", () => ({
  isRedisAvailable: vi.fn(() => false),
  getRedis: vi.fn(),
  checkDistributedRateLimit: vi.fn(async () => null),
}));

describe("rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows requests under limit", async () => {
    const result = await checkRateLimit("user1", 5, 60000);
    expect(result.allowed).toBe(true);
  });

  it("blocks requests over limit", async () => {
    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("user2", 5, 60000);
    }
    // 6th request should be blocked
    const result = await checkRateLimit("user2", 5, 60000);
    expect(result.allowed).toBe(false);
  });

  it("resets after window expires", async () => {
    // Hit limit with short window
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("user3", 5, 100);
    }
    const blocked = await checkRateLimit("user3", 5, 100);
    expect(blocked.allowed).toBe(false);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 150));

    const result = await checkRateLimit("user3", 5, 100);
    expect(result.allowed).toBe(true);
  });

  it("tracks different users independently", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("userA", 5, 60000);
    }

    const userA = await checkRateLimit("userA", 5, 60000);
    const userB = await checkRateLimit("userB", 5, 60000);

    expect(userA.allowed).toBe(false);
    expect(userB.allowed).toBe(true);
  });
});
