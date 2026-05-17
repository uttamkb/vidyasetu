import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "./route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { inngest } from "@/inngest/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    task: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  },
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

describe("Assignments Scan API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST", () => {
    it("returns 401 if unauthorized", async () => {
      (auth as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/assignments/scan", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("creates a task and sends Inngest event if authorized", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.task.create).mockResolvedValue({ id: "task-123" } as any);

      const req = new NextRequest("http://localhost/api/assignments/scan", {
        method: "POST",
        body: JSON.stringify({
          assignmentId: "d3b07384-d113-4ec5-a587-0b16f3388f6d",
          images: ["data:image/png;base64,abcdef"],
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({ success: true, taskId: "task-123" });
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: { type: "TRANSCRIPTION", status: "PENDING" },
      });
      expect(inngest.send).toHaveBeenCalledWith({
        name: "app/transcription.process",
        data: {
          taskId: "task-123",
          assignmentId: "d3b07384-d113-4ec5-a587-0b16f3388f6d",
          images: ["data:image/png;base64,abcdef"],
          userId: "user-1",
        },
      });
    });
  });

  describe("GET", () => {
    it("returns task status for pending tasks", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.task.findUniqueOrThrow).mockResolvedValue({
        id: "task-123",
        status: "PROCESSING",
      } as any);

      const req = new NextRequest("http://localhost/api/assignments/scan?taskId=task-123");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({ status: "PROCESSING" });
    });

    it("returns extracted answers when task is completed", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.task.findUniqueOrThrow).mockResolvedValue({
        id: "task-123",
        status: "COMPLETED",
        payload: { extractedAnswers: { q1: "My Answer" } },
      } as any);

      const req = new NextRequest("http://localhost/api/assignments/scan?taskId=task-123");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({
        status: "COMPLETED",
        extractedAnswers: { q1: "My Answer" },
        confidenceScores: {},
        uncertainWords: {},
      });
    });

    it("returns error details when task is failed", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.task.findUniqueOrThrow).mockResolvedValue({
        id: "task-123",
        status: "FAILED",
        error: "Corrupted PDF",
      } as any);

      const req = new NextRequest("http://localhost/api/assignments/scan?taskId=task-123");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({
        status: "FAILED",
        error: "Corrupted PDF",
      });
    });
  });
});
