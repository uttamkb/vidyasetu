import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackAIUsage, trackCacheHit, calculateAICost, getCacheHitRate } from "./usage-tracker";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    userAIUsage: {
      upsert: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

const mockPrisma = prisma as unknown as {
  userAIUsage: {
    upsert: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
};

describe("usage-tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("trackAIUsage", () => {
    it("creates new usage record on first call", async () => {
      mockPrisma.userAIUsage.upsert.mockResolvedValue({});

      await trackAIUsage({
        userId: "u1",
        modelName: "gemini-2.5-pro",
        type: "EVALUATION",
        estimatedTokens: 100,
        tokensInput: 80,
        tokensOutput: 20,
        actualCostUsd: 0.05,
      });

      expect(mockPrisma.userAIUsage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId_date_modelName_type: expect.objectContaining({
              userId: "u1",
              modelName: "gemini-2.5-pro",
              type: "EVALUATION",
            }),
          }),
          create: expect.objectContaining({
            userId: "u1",
            modelName: "gemini-2.5-pro",
            type: "EVALUATION",
            callCount: 1,
            estimatedTokens: 100,
            tokensInput: 80,
            tokensOutput: 20,
            actualCostUsd: 0.05,
          }),
        })
      );
    });

    it("increments existing usage record", async () => {
      mockPrisma.userAIUsage.upsert.mockResolvedValue({});

      await trackAIUsage({
        userId: "u1",
        modelName: "gemini-2.5-pro",
        type: "EVALUATION",
        estimatedTokens: 50,
      });

      expect(mockPrisma.userAIUsage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            callCount: { increment: 1 },
            estimatedTokens: { increment: 50 },
          }),
        })
      );
    });

    it("fails silently on generic database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockPrisma.userAIUsage.upsert.mockRejectedValue(new Error("DB error"));

      await trackAIUsage({ userId: "u1", modelName: "gemini-2.5-pro", type: "EVALUATION" });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("silently warns on P2003 foreign key violation (deleted user)", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fkError = Object.assign(new Error("FK violation"), { code: "P2003" });
      mockPrisma.userAIUsage.upsert.mockRejectedValue(fkError);

      await trackAIUsage({ userId: "deleted-user", modelName: "gemini-2.5-flash", type: "GENERATION" });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("deleted-user"));
      warnSpy.mockRestore();
    });

    it("auto-calculates cost when actualCostUsd is 0", async () => {
      mockPrisma.userAIUsage.upsert.mockResolvedValue({});

      await trackAIUsage({
        userId: "u1",
        modelName: "gemini-2.5-pro",
        type: "EVALUATION",
        tokensInput: 1_000_000,
        tokensOutput: 1_000_000,
      });

      // gemini-2.5-pro: $1.25/M input + $5.00/M output = $6.25
      expect(mockPrisma.userAIUsage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            actualCostUsd: expect.closeTo(6.25, 2),
          }),
        })
      );
    });
  });

  describe("trackCacheHit", () => {
    it("upserts a cache record with modelName='cache'", async () => {
      mockPrisma.userAIUsage.upsert.mockResolvedValue({});

      await trackCacheHit("u1", "GENERATION", 500);

      expect(mockPrisma.userAIUsage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId_date_modelName_type: expect.objectContaining({
              userId: "u1",
              modelName: "cache",
              type: "GENERATION",
            }),
          }),
          create: expect.objectContaining({
            cacheHit: true,
            estimatedTokens: 500,
          }),
        })
      );
    });

    it("silently warns on P2003 error for cache hit", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fkError = Object.assign(new Error("FK"), { code: "P2003" });
      mockPrisma.userAIUsage.upsert.mockRejectedValue(fkError);

      await trackCacheHit("ghost-user", "EVALUATION");

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("ghost-user"));
      warnSpy.mockRestore();
    });

    it("fails silently on generic DB error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockPrisma.userAIUsage.upsert.mockRejectedValue(new Error("network timeout"));

      await trackCacheHit("u1", "TRANSCRIPTION");

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("calculateAICost", () => {
    it("calculates cost for gemini-2.5-pro ($1.25/$5.00 per 1M)", () => {
      const cost = calculateAICost("gemini-2.5-pro", 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(6.25, 5);
    });

    it("calculates cost for gemini-2.5-flash ($0.15/$0.60 per 1M)", () => {
      const cost = calculateAICost("gemini-2.5-flash", 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(0.75, 5);
    });

    it("calculates cost for gemini-2.0-flash-lite ($0.075/$0.30 per 1M)", () => {
      const cost = calculateAICost("gemini-2.0-flash-lite", 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(0.375, 5);
    });

    it("defaults to flash rates for unknown model names", () => {
      const known = calculateAICost("gemini-1.5-flash", 1_000_000, 1_000_000);
      const unknown = calculateAICost("some-future-model", 1_000_000, 1_000_000);
      expect(unknown).toBeCloseTo(known, 5);
    });

    it("returns 0 when both token counts are 0", () => {
      expect(calculateAICost("gemini-2.5-pro", 0, 0)).toBe(0);
    });

    it("is proportional: doubling tokens doubles cost", () => {
      const cost1 = calculateAICost("gemini-2.5-pro", 500_000, 500_000);
      const cost2 = calculateAICost("gemini-2.5-pro", 1_000_000, 1_000_000);
      expect(cost2).toBeCloseTo(cost1 * 2, 5);
    });
  });

  describe("getCacheHitRate", () => {
    it("returns hit rate as fraction of cache to total calls", async () => {
      mockPrisma.userAIUsage.aggregate
        .mockResolvedValueOnce({ _sum: { callCount: 3 } }) // cache hits
        .mockResolvedValueOnce({ _sum: { callCount: 10 } }); // total

      const rate = await getCacheHitRate("u1", "GENERATION");
      expect(rate).toBeCloseTo(0.3, 5);
    });

    it("returns null when total calls is 0", async () => {
      mockPrisma.userAIUsage.aggregate
        .mockResolvedValueOnce({ _sum: { callCount: 0 } })
        .mockResolvedValueOnce({ _sum: { callCount: 0 } });

      const rate = await getCacheHitRate("u1", "GENERATION");
      expect(rate).toBeNull();
    });

    it("returns null when aggregate returns null callCount", async () => {
      mockPrisma.userAIUsage.aggregate
        .mockResolvedValueOnce({ _sum: { callCount: null } })
        .mockResolvedValueOnce({ _sum: { callCount: null } });

      const rate = await getCacheHitRate("u1", "EVALUATION");
      expect(rate).toBeNull();
    });

    it("returns null and logs error on DB failure", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockPrisma.userAIUsage.aggregate.mockRejectedValue(new Error("DB down"));

      const rate = await getCacheHitRate("u1", "GENERATION");
      expect(rate).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
