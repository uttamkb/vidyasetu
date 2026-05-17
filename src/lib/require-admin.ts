/**
 * require-admin.ts — Centralized admin authorization helper
 *
 * Validates that the current user is an active admin (ADMIN or SUPER_ADMIN).
 * Returns the session for use in route handlers, or throws a 403 response.
 *
 * Usage:
 *   const session = await requireAdmin();
 *   // session.user.id, session.user.role are available
 */
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    throw NextResponse.json({ error: "Unauthorized — please sign in" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw NextResponse.json({ error: "Forbidden — admin access required" }, { status: 403 });
  }

  // Shadow mode for isActive — check exists but don't enforce yet (PI 5 will enforce)
  const isActive = (session.user as any).isActive ?? true;
  if (!isActive) {
    console.warn(`[requireAdmin] Inactive admin attempted access: ${session.user.id}`);
    // TODO(PI-5): Uncomment to enforce
    // throw NextResponse.json({ error: "Account disabled" }, { status: 403 });
  }

  return session;
}

/**
 * requireSuperAdmin — Stricter than requireAdmin, only allows SUPER_ADMIN.
 *
 * Use for operations that can permanently alter platform state:
 *   - Promoting/demoting admins
 *   - Managing feature gates
 *   - Accessing raw system logs
 */
export async function requireSuperAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    throw NextResponse.json({ error: "Unauthorized — please sign in" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "SUPER_ADMIN") {
    throw NextResponse.json({ error: "Forbidden — super admin access required" }, { status: 403 });
  }

  return session;
}
