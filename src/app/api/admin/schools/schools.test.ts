/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { PUT, DELETE } from "./[id]/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    school: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    question: {
      count: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
  },
}));

describe("Schools API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/schools", () => {
    it("returns 403 when session is null or role is STUDENT", async () => {
      (auth as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/admin/schools");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("returns list of schools successfully when authorized", async () => {
      (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });
      const mockSchools = [
        { id: "s-1", name: "Vydehi School", state: "Karnataka", district: "Bangalore", board: "CBSE" }
      ];
      (prisma.school.findMany as any).mockResolvedValue(mockSchools);

      const req = new NextRequest("http://localhost/api/admin/schools");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockSchools);
    });
  });

  describe("POST /api/admin/schools", () => {
    it("returns 400 if school name is missing", async () => {
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
      const req = new NextRequest("http://localhost/api/admin/schools", {
        method: "POST",
        body: JSON.stringify({ state: "Karnataka" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("School name is required");
    });

    it("creates a school successfully", async () => {
      (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });
      const createdSchool = { id: "s-2", name: "DPS Bangalore", state: "Karnataka", district: "Bangalore", board: "CBSE" };
      (prisma.school.create as any).mockResolvedValue(createdSchool);

      const req = new NextRequest("http://localhost/api/admin/schools", {
        method: "POST",
        body: JSON.stringify({ name: "DPS Bangalore", state: "Karnataka", district: "Bangalore", board: "CBSE" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(createdSchool);
    });
  });

  describe("PUT /api/admin/schools/[id]", () => {
    it("updates school successfully", async () => {
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
      const updatedSchool = { id: "s-1", name: "Vydehi Academy", state: "Karnataka", district: "Bangalore", board: "CBSE" };
      (prisma.school.update as any).mockResolvedValue(updatedSchool);

      const req = new NextRequest("http://localhost/api/admin/schools/s-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Vydehi Academy", state: "Karnataka", district: "Bangalore", board: "CBSE" }),
      });
      const res = await PUT(req, { params: Promise.resolve({ id: "s-1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(updatedSchool);
    });
  });

  describe("DELETE /api/admin/schools/[id]", () => {
    it("returns 409 conflict when school has linked questions", async () => {
      (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });
      (prisma.question.count as any).mockResolvedValue(5);
      (prisma.user.count as any).mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/schools/s-1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "s-1" }) });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("5 question(s)");
    });

    it("returns 409 conflict when school has linked users", async () => {
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
      (prisma.question.count as any).mockResolvedValue(0);
      (prisma.user.count as any).mockResolvedValue(2);

      const req = new NextRequest("http://localhost/api/admin/schools/s-1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "s-1" }) });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("2 user(s)");
    });

    it("deletes school successfully when safe", async () => {
      (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });
      (prisma.question.count as any).mockResolvedValue(0);
      (prisma.user.count as any).mockResolvedValue(0);
      (prisma.school.delete as any).mockResolvedValue({ id: "s-1" });

      const req = new NextRequest("http://localhost/api/admin/schools/s-1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "s-1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
