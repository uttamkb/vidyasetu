import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireSubscription, incrementUsage } from "./require-subscription";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userAIUsage: {
      aggregate: vi.fn(),
    },
  },
}));

// Mock redis
vi.mock("./redis", () => ({
  isRedisAvailable: vi.fn(() => false),
  getRedis: vi.fn(),
}));

import { prisma } from "@/lib/db";

const mockPrisma = prisma as unknown as { 
  user: { findUnique: ReturnType<typeof vi.fn> },
  userAIUsage: { aggregate: ReturnType<typeof vi.fn> }
};

describe("requireSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for budget check (within budget)
    mockPrisma.userAIUsage.aggregate.mockResolvedValue({
      _sum: { actualCostUsd: 0 }
    });
  });

  it("blocks when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await requireSubscription("u1", "ASSIGNMENT_GENERATION");
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("USER_NOT_FOUND");
  });

  it("blocks when account is disabled", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      isActive: false,
      subscriptionPlan: "FREE",
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: null,
    });
    const result = await requireSubscription("u1", "ASSIGNMENT_GENERATION");
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("ACCOUNT_DISABLED");
  });

  it("blocks when subscription expired", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      isActive: true,
      subscriptionPlan: "PRO",
      subscriptionStatus: "EXPIRED",
      subscriptionExpiresAt: new Date("2024-01-01"),
    });
    const result = await requireSubscription("u1", "ASSIGNMENT_GENERATION");
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("SUBSCRIPTION_EXPIRED");
  });

  it("allows active FREE user within limits", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      isActive: true,
      subscriptionPlan: "FREE",
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: null,
    });
    const result = await requireSubscription("u1", "ASSIGNMENT_GENERATION");
    expect(result.allowed).toBe(true);
    expect(result.code).toBe("OK");
  });

  it("allows active PRO user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      isActive: true,
      subscriptionPlan: "PRO",
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: new Date("2099-12-31"),
    });
    const result = await requireSubscription("u1", "ASSIGNMENT_GENERATION");
    expect(result.allowed).toBe(true);
    expect(result.code).toBe("OK");
  });

  it("returns shadowMode=false by default (enforcement ON)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      isActive: true,
      subscriptionPlan: "FREE",
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: null,
    });
    const result = await requireSubscription("u1", "ASSIGNMENT_GENERATION");
    expect(result.shadowMode).toBe(false);
  });

  it("returns shadowMode=true when FEATURE_GATES_ENABLED=shadow", async () => {
    vi.stubEnv("FEATURE_GATES_ENABLED", "shadow");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      isActive: true,
      subscriptionPlan: "FREE",
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: null,
    });
    const result = await requireSubscription("u1", "ASSIGNMENT_GENERATION");
    expect(result.shadowMode).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe("incrementUsage", () => {
  it("returns silently when Redis unavailable", async () => {
    await expect(incrementUsage("u1", "ASSIGNMENT_GENERATION")).resolves.toBeUndefined();
  });
});
