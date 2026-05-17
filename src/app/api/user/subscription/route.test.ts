import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("Subscription API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates user plan to PRO and sets expiry", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.user.update as any).mockResolvedValue({
      subscriptionPlan: "PRO",
      subscriptionStatus: "ACTIVE",
    });

    const req = new NextRequest("http://localhost/api/user/subscription", {
      method: "PATCH",
      body: JSON.stringify({ plan: "PRO" }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.plan).toBe("PRO");
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user-1" },
      data: expect.objectContaining({
        subscriptionPlan: "PRO",
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: expect.any(Date),
      }),
    }));
  });

  it("returns 401 if unauthorized", async () => {
    (auth as any).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/user/subscription", {
      method: "PATCH",
      body: JSON.stringify({ plan: "PRO" }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid plan", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });

    const req = new NextRequest("http://localhost/api/user/subscription", {
      method: "PATCH",
      body: JSON.stringify({ plan: "ULTIMATE" }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
