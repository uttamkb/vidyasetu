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
    },
    subject: {
      findMany: vi.fn(),
    },
  },
}));

describe("Mastery Progress API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthorized", async () => {
    (auth as any).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/progress/mastery");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns full mastery map for authorized user", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.user.findUniqueOrThrow as any).mockResolvedValue({ grade: "9", board: "CBSE" });
    (prisma.subject.findMany as any).mockResolvedValue([
      {
        id: "sub-1",
        name: "Science",
        chapters: [
          {
            id: "ch-1",
            name: "Laws of Motion",
            topics: [
              {
                id: "t-1",
                name: "Inertia",
                subtopics: [
                  {
                    id: "st-1",
                    name: "Concept of Inertia",
                    userMastery: [{ masteryScore: 80, lastPracticed: new Date(), totalAttempts: 5, correctAttempts: 4 }]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);

    const req = new NextRequest("http://localhost/api/progress/mastery");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.masteryMap.length).toBe(1);
    expect(data.masteryMap[0].chapters[0].avgMastery).toBe(80);
    expect(data.masteryMap[0].chapters[0].topics[0].subtopics[0].status).toBe("mastered");
  });
});
