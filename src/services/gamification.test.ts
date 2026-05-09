import { describe, it, expect, vi, beforeEach } from "vitest";
import { gamificationService, type GamificationEvent } from "./gamification";
import { prisma } from "@/lib/db";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    badge: {
      findMany: vi.fn(),
    },
    userBadge: {
      createMany: vi.fn(),
    },
    studyStreak: {
      findUnique: vi.fn(),
    },
    submission: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

describe("gamification-service", () => {
  const mockUserId = "user-123";
  const mockUser = {
    id: mockUserId,
    xp: 100,
    level: "Beginner",
    userBadges: [{ badgeId: "badge-already-earned" }],
  };

  const mockBadges = [
    { id: "b1", name: "First Timer", points: 100, condition: JSON.stringify({ type: "first_submission" }) },
    { id: "b2", name: "Genius", points: 200, condition: JSON.stringify({ type: "perfect_score" }) },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("earns a badge and gains XP on first submission", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue(mockBadges);

    const event: GamificationEvent = {
      userId: mockUserId,
      type: "SUBMISSION",
      data: { totalScore: 5, maxMarks: 10 }
    };

    const newlyEarned = await gamificationService.processEvent(event);

    expect(newlyEarned.length).toBe(1);
    expect(newlyEarned[0].id).toBe("b1");
    // XP: 100 (existing) + 50 (submission) + 100 (badge) = 250
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: mockUserId },
      data: { xp: 250, level: "Beginner" }
    }));
  });

  it("awards perfect score bonus XP and badge", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue(mockBadges);

    const event: GamificationEvent = {
      userId: mockUserId,
      type: "SUBMISSION",
      data: { totalScore: 10, maxMarks: 10 }
    };

    const newlyEarned = await gamificationService.processEvent(event);

    expect(newlyEarned.length).toBe(2); // First Timer + Genius
    // XP: 100 (existing) + 50 (sub) + 50 (perf) + 100 (b1) + 200 (b2) = 500
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { xp: 500, level: "Scholar" } // Level jumps to Scholar at 500 XP
    }));
  });

  it("calculates level thresholds correctly", () => {
    // @ts-ignore - accessing private method for testing
    expect(gamificationService.calculateLevel(0)).toBe("Beginner");
    // @ts-ignore
    expect(gamificationService.calculateLevel(500)).toBe("Scholar");
    // @ts-ignore
    expect(gamificationService.calculateLevel(2000)).toBe("Topper");
    // @ts-ignore
    expect(gamificationService.calculateLevel(5000)).toBe("Board Ready");
  });
});
