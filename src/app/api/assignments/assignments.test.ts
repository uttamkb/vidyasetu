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
    assignment: {
      findMany: vi.fn(),
    },
  },
}));

describe("Assignments API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthorized", async () => {
    (auth as any).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/assignments");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns list of enriched assignments", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.user.findUniqueOrThrow as any).mockResolvedValue({ grade: "9", board: "CBSE" });
    (prisma.assignment.findMany as any).mockResolvedValue([
      {
        id: "asgn-1",
        title: "Test",
        questions: [{}, {}],
        submissions: [{ status: "EVALUATED", percentageScore: 80 }],
        subject: { name: "Math" },
        chapter: { name: "Ch1" }
      }
    ]);

    const req = new NextRequest("http://localhost/api/assignments");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assignments.length).toBe(1);
    expect(data.assignments[0].questionCount).toBe(2);
    expect(data.assignments[0].status).toBe("EVALUATED");
  });
});
