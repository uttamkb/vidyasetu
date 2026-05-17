/**
 * GET /api/admin/feature-gates
 * PATCH /api/admin/feature-gates
 *
 * Manage platform feature gates.
 * SUPER_ADMIN only for writes. Admin can read.
 */
import { NextResponse } from "next/server";
import { requireAdmin, requireSuperAdmin } from "@/lib/require-admin";
import { getAllFeatureGates, setFeatureState, type FeatureState } from "@/lib/feature-gate";

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gates = getAllFeatureGates();
    return NextResponse.json({ gates });
  } catch (error) {
    console.error("[GET /api/admin/feature-gates]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, state } = body;

    if (!name || !state) {
      return NextResponse.json(
        { error: "Missing name or state" },
        { status: 400 }
      );
    }

    await setFeatureState(name, state as FeatureState);

    return NextResponse.json({
      message: `Feature ${name} set to ${state}`,
      gate: { name, state },
    });
  } catch (error: any) {
    console.error("[PATCH /api/admin/feature-gates]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
