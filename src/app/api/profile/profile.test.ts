import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

describe("Profile API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthorized", async () => {
    (auth as any).mockResolvedValue(null);
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "Test", grade: "9", board: "CBSE", state: "Karnataka", leaderboardOptIn: true }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid data", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "" }), // missing fields
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("updates profile successfully", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.user.update as any).mockResolvedValue({
      id: "user-1",
      name: "New Name",
      grade: "10",
      board: "ICSE",
    });

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name", grade: "10", board: "ICSE", state: "Maharashtra", leaderboardOptIn: true }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe("New Name");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "New Name", grade: "10", board: "ICSE", state: "Maharashtra", leaderboardOptIn: true },
    });
  });
});
