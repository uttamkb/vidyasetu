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
    assignment: {
      findUniqueOrThrow: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
    },
    submission: {
      findFirst: vi.fn(),
    },
  },
}));

describe("Assignment Detail API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthorized", async () => {
    (auth as any).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/assignments/asgn-1");
    const res = await GET(req, { params: Promise.resolve({ id: "asgn-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns assignment with questions and strips correct answers", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.assignment.findUniqueOrThrow as any).mockResolvedValue({
      id: "asgn-1",
      title: "Test",
      questions: [{ questionId: "q1", orderIndex: 0 }],
      subject: {},
      chapter: {}
    });
    (prisma.question.findMany as any).mockResolvedValue([
      {
        id: "q1",
        content: {
          question: "What is 1+1?",
          correctAnswer: "2",
          maxMarks: 5
        }
      }
    ]);
    (prisma.submission.findFirst as any).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/assignments/asgn-1");
    const res = await GET(req, { params: Promise.resolve({ id: "asgn-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assignment.questions[0].content.question).toBe("What is 1+1?");
    expect(data.assignment.questions[0].content.correctAnswer).toBeUndefined(); // Stripped!
  });

  it("returns 404 if assignment not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.assignment.findUniqueOrThrow as any).mockRejectedValue(new Error("Not found"));

    const req = new NextRequest("http://localhost/api/assignments/asgn-1");
    const res = await GET(req, { params: Promise.resolve({ id: "asgn-1" }) });
    expect(res.status).toBe(404);
  });
});
