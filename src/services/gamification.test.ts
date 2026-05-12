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

  it("handles non-existent user", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const result = await gamificationService.processEvent({ userId: "none", type: "LOGIN" });
    expect(result).toEqual([]);
  });

  it("skips badges with invalid condition JSON", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue([
      { id: "invalid", name: "Broken", points: 10, condition: "not-json" }
    ]);

    const newlyEarned = await gamificationService.processEvent({ userId: mockUserId, type: "LOGIN" });
    expect(newlyEarned).toEqual([]);
  });

  it("awards streak badge", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue([
      { id: "streak-badge", name: "Streak", points: 50, condition: JSON.stringify({ type: "streak", count: 5 }) }
    ]);
    (prisma.studyStreak.findUnique as any).mockResolvedValue({ currentStreak: 5 });

    const newlyEarned = await gamificationService.processEvent({ userId: mockUserId, type: "LOGIN" });
    expect(newlyEarned.length).toBe(1);
    expect(newlyEarned[0].id).toBe("streak-badge");
  });

  it("awards subject mastery badge", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue([
      { id: "mastery", name: "Math Pro", points: 100, condition: JSON.stringify({ type: "subject_mastery", subject: "Math", count: 2, minScore: 80 }) }
    ]);
    
    (prisma.submission.findMany as any).mockResolvedValue([
      { totalScore: 9, maxMarks: 10 }, // 90%
      { totalScore: 8, maxMarks: 10 }, // 80%
      { totalScore: 5, maxMarks: 10 }, // 50%
    ]);

    const newlyEarned = await gamificationService.processEvent({ 
      userId: mockUserId, 
      type: "SUBMISSION", 
      data: { totalScore: 8, maxMarks: 10 } 
    });
    
    expect(newlyEarned.length).toBe(1);
    expect(newlyEarned[0].id).toBe("mastery");
  });

  it("awards all subjects badge", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue([
      { id: "polymath", name: "Polymath", points: 200, condition: JSON.stringify({ type: "all_subjects" }) }
    ]);
    
    (prisma.submission.findMany as any).mockResolvedValue([
      { assignment: { subjectId: "s1" } },
      { assignment: { subjectId: "s2" } },
      { assignment: { subjectId: "s3" } },
      { assignment: { subjectId: "s4" } },
      { assignment: { subjectId: "s5" } },
    ]);

    const newlyEarned = await gamificationService.processEvent({ userId: mockUserId, type: "SUBMISSION" });
    expect(newlyEarned.length).toBe(1);
  });

  it("awards fast completion badge", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue([
      { id: "speed", name: "Speedster", points: 50, condition: JSON.stringify({ type: "fast_completion", maxMinutes: 5 }) }
    ]);

    const newlyEarned = await gamificationService.processEvent({ 
      userId: mockUserId, 
      type: "SUBMISSION", 
      data: { timeTaken: 200 } // < 300 seconds (5 mins)
    });
    expect(newlyEarned.length).toBe(1);
  });

  it("awards night study badge", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue([
      { id: "night", name: "Night Owl", points: 50, condition: JSON.stringify({ type: "night_study", afterHour: 22 }) }
    ]);

    // Mock Date to 11 PM
    const date = new Date(2024, 1, 1, 23);
    vi.useFakeTimers();
    vi.setSystemTime(date);

    const newlyEarned = await gamificationService.processEvent({ userId: mockUserId, type: "LOGIN" });
    expect(newlyEarned.length).toBe(1);
    
    vi.useRealTimers();
  });

  it("awards first login badge", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue([
      { id: "login", name: "Welcome", points: 10, condition: JSON.stringify({ type: "first_login" }) }
    ]);

    const newlyEarned = await gamificationService.processEvent({ userId: mockUserId, type: "LOGIN" });
    expect(newlyEarned.length).toBe(1);
    expect(newlyEarned[0].id).toBe("login");
  });

  it("returns false for perfect_score condition if event is not SUBMISSION", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue([
      { id: "b2", name: "Genius", points: 200, condition: JSON.stringify({ type: "perfect_score" }) }
    ]);

    const newlyEarned = await gamificationService.processEvent({ userId: mockUserId, type: "LOGIN" });
    expect(newlyEarned).toEqual([]);
  });

  it("returns false for unknown badge condition type", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue([
      { id: "unknown", name: "Mystery", points: 10, condition: JSON.stringify({ type: "ghost_mode" }) }
    ]);

    const newlyEarned = await gamificationService.processEvent({ userId: mockUserId, type: "LOGIN" });
    expect(newlyEarned).toEqual([]);
  });

  it("gains XP on session completed", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue([]);

    await gamificationService.processEvent({ userId: mockUserId, type: "SESSION_COMPLETED" });
    
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { xp: 120, level: "Beginner" } // 100 + 20
    }));
  });

  it("returns false for midday study in time-based conditions", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue([
      { id: "night", name: "Night Owl", points: 50, condition: JSON.stringify({ type: "night_study", afterHour: 22 }) }
    ]);

    // Mock Date to 2 PM
    const date = new Date(2024, 1, 1, 14);
    vi.useFakeTimers();
    vi.setSystemTime(date);

    const newlyEarned = await gamificationService.processEvent({ userId: mockUserId, type: "LOGIN" });
    expect(newlyEarned).toEqual([]);
    
    vi.useRealTimers();
  });

  it("awards morning study badge", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.badge.findMany as any).mockResolvedValue([
      { id: "morning", name: "Early Bird", points: 50, condition: JSON.stringify({ type: "morning_study", beforeHour: 6 }) }
    ]);

    // Mock Date to 5 AM
    const date = new Date(2024, 1, 1, 5);
    vi.useFakeTimers();
    vi.setSystemTime(date);

    const newlyEarned = await gamificationService.processEvent({ userId: mockUserId, type: "LOGIN" });
    expect(newlyEarned.length).toBe(1);
    
    vi.useRealTimers();
  });
});

