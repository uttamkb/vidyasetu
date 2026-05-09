import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
    leaderboardEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("Leaderboard API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthorized", async () => {
    (auth as any).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/leaderboard");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns leaderboard for school scope", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.user.findUniqueOrThrow as any).mockResolvedValue({
      state: "CA",
      district: "SF",
      school: "High School",
      leaderboardOptIn: true,
    });
    
    (prisma.user.findMany as any).mockResolvedValue([
      { id: "user-1", name: "Alice", school: "High School" },
      { id: "user-2", name: "Bob", school: "High School" },
    ]);

    (prisma.leaderboardEntry.findMany as any).mockResolvedValue([
      { userId: "user-2", totalScore: 90, submissionCount: 5 },
      { userId: "user-1", totalScore: 80, submissionCount: 3 },
    ]);

    const req = new NextRequest("http://localhost/api/leaderboard?scope=school");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.leaderboard.length).toBe(2);
    expect(data.leaderboard[0].name).toBe("Bob"); // User 2 is first
    expect(data.leaderboard[0].rank).toBe(1);
    expect(data.leaderboard[1].name).toBe("Alice"); // User 1 is second
    expect(data.leaderboard[1].isCurrentUser).toBe(true);
    expect(data.myRank.rank).toBe(2);
  });
});
