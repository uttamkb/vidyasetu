import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: vi.fn(() => Promise.resolve({ user: { id: "admin-1", role: "ADMIN" } })),
}));

import { prisma } from "@/lib/db";
const mockPrisma = prisma as unknown as {
  user: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
};

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated user list", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "u1",
        name: "Test User",
        email: "test@example.com",
        role: "STUDENT",
        isActive: true,
        subscriptionPlan: "FREE",
        subscriptionStatus: "ACTIVE",
        totalAssignmentsGenerated: 5,
        totalSubmissions: 10,
        totalAICalls: 20,
        lastActiveAt: new Date(),
      },
    ]);
    mockPrisma.user.count.mockResolvedValue(1);

    const req = new NextRequest("http://localhost/api/admin/users?page=1&limit=20");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.users).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
    expect(json.pagination.page).toBe(1);
  });

  it("filters by subscription plan", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/admin/users?plan=PRO");
    const res = await GET(req);
    await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ subscriptionPlan: "PRO" }),
      })
    );
  });
});
