import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdmin, requireSuperAdmin } from "./require-admin";
import { NextResponse } from "next/server";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 401 when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toBeInstanceOf(NextResponse);
  });

  it("throws 401 when user has no id", async () => {
    mockAuth.mockResolvedValue({ user: {} });

    await expect(requireAdmin()).rejects.toBeInstanceOf(NextResponse);
  });

  it("throws 403 when user is STUDENT", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });

    await expect(requireAdmin()).rejects.toBeInstanceOf(NextResponse);
  });

  it("returns session when user is ADMIN", async () => {
    const session = { user: { id: "u1", role: "ADMIN" } };
    mockAuth.mockResolvedValue(session);

    const result = await requireAdmin();
    expect(result).toEqual(session);
  });

  it("returns session when user is SUPER_ADMIN", async () => {
    const session = { user: { id: "u1", role: "SUPER_ADMIN" } };
    mockAuth.mockResolvedValue(session);

    const result = await requireAdmin();
    expect(result).toEqual(session);
  });

  it("logs warning for inactive admin (shadow mode)", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const session = { user: { id: "u1", role: "ADMIN", isActive: false } };
    mockAuth.mockResolvedValue(session);

    await requireAdmin();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Inactive admin attempted access")
    );
    consoleSpy.mockRestore();
  });
});

describe("requireSuperAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 401 when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireSuperAdmin()).rejects.toBeInstanceOf(NextResponse);
  });

  it("throws 403 when user is ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(requireSuperAdmin()).rejects.toBeInstanceOf(NextResponse);
  });

  it("returns session when user is SUPER_ADMIN", async () => {
    const session = { user: { id: "u1", role: "SUPER_ADMIN" } };
    mockAuth.mockResolvedValue(session);

    const result = await requireSuperAdmin();
    expect(result).toEqual(session);
  });
});
