/* eslint-disable @typescript-eslint/no-explicit-any */
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
    question: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("GET /api/admin/question-bank", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when role is student", async () => {
    (auth as any).mockResolvedValue({ user: { role: "STUDENT" } });
    const req = new NextRequest("http://localhost/api/admin/question-bank");
    const res = await GET(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when session is null", async () => {
    (auth as any).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/admin/question-bank");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns questions and metrics successfully when authorized", async () => {
    (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });
    (prisma.question.findMany as any).mockResolvedValue([
      { id: "q-1", content: { question: "What is friction?" }, source: "curated" }
    ]);
    (prisma.question.count as any)
      .mockResolvedValueOnce(1) // total count
      .mockResolvedValueOnce(1) // curated count
      .mockResolvedValueOnce(0) // ai count
      .mockResolvedValueOnce(0); // school specific count

    const req = new NextRequest("http://localhost/api/admin/question-bank?page=1&limit=10");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.questions.length).toBe(1);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.totalCount).toBe(1);
    expect(data.metrics.curatedCount).toBe(1);
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 10,
    }));
  });

  it("correctly filters search query", async () => {
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
    (prisma.question.findMany as any).mockResolvedValue([]);
    (prisma.question.count as any).mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/admin/question-bank?search=inertia&schoolId=sch-123&bloomLevel=APPLY&difficulty=3&source=ai_generated&subjectId=sub-abc");
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isArchived: false,
        content: {
          path: ["question"],
          string_contains: "inertia",
        },
        schoolId: "sch-123",
        bloomLevel: "APPLY",
        difficulty: 3,
        source: "ai_generated",
        subtopic: {
          topic: {
            chapter: {
              subject: {
                id: "sub-abc",
              },
            },
          },
        },
      }),
    }));
  });

  it("correctly filters by target grade", async () => {
    (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });
    (prisma.question.findMany as any).mockResolvedValue([]);
    (prisma.question.count as any).mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/admin/question-bank?grade=9");
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isArchived: false,
        subtopic: {
          topic: {
            chapter: {
              subject: {
                grade: "9",
              },
            },
          },
        },
      }),
    }));
  });

  it("returns 400 when invalid query parameters are supplied", async () => {
    (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });
    const req = new NextRequest("http://localhost/api/admin/question-bank?difficulty=invalid_value");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.fieldErrors.difficulty).toBeDefined();
  });
});
