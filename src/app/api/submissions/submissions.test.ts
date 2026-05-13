import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { evaluateSubmission } from "@/services/evaluation-engine";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    assignment: {
      findUniqueOrThrow: vi.fn(),
    },
    submission: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/services/evaluation-engine", () => ({
  evaluateSubmission: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, resetInMs: 0 })),
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

vi.mock("@/lib/prisma-json", () => ({
  toJson: vi.fn((val) => val),
}));

describe("Submissions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/submissions", () => {
    const mockBody = {
      assignmentId: "00000000-0000-0000-0000-000000000000",
      answers: [{ questionIndex: 0, userAnswer: "A" }],
    };

    it("returns 401 if unauthorized", async () => {
      (auth as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/submissions", {
        method: "POST",
        body: JSON.stringify(mockBody),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("creates a submission and triggers background evaluation", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });
      (prisma.assignment.findUniqueOrThrow as any).mockResolvedValue({ id: "asgn-1", maxMarks: 10 });
      (prisma.submission.findFirst as any).mockResolvedValue(null);
      (prisma.submission.create as any).mockResolvedValue({ id: "sub-1" });

      const req = new NextRequest("http://localhost/api/submissions", {
        method: "POST",
        body: JSON.stringify(mockBody),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("SUBMITTED");
      expect(data.message).toContain("Grading in progress");
      
      // Verification: evaluateSubmission NOT called directly, but Inngest event sent
      expect(evaluateSubmission).not.toHaveBeenCalled();
      const { inngest } = await import("@/inngest/client");
      expect(inngest.send).toHaveBeenCalledWith(expect.objectContaining({
        name: "app/submission.evaluate",
        data: expect.objectContaining({ submissionId: "sub-1" })
      }));
    });
  });

  describe("GET /api/submissions", () => {
    it("returns list of submissions", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });
      (prisma.submission.findMany as any).mockResolvedValue([
        { id: "sub-1", assignment: { title: "Test" }, totalScore: 10, maxMarks: 10, percentageScore: 100, status: "EVALUATED" }
      ]);

      const req = new NextRequest("http://localhost/api/submissions");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.submissions.length).toBe(1);
    });
  });
});
