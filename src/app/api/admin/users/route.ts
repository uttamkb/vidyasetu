/**
 * GET /api/admin/users
 *
 * Paginated, filterable list of all users.
 * Admin-only. Read-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const search = searchParams.get("search")?.toLowerCase().trim();
  const role = searchParams.get("role");
  const isActive = searchParams.get("isActive");
  const plan = searchParams.get("plan");

  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role && ["STUDENT", "ADMIN", "SUPER_ADMIN"].includes(role)) {
    where.role = role;
  }

  if (isActive !== null && isActive !== undefined) {
    where.isActive = isActive === "true";
  }

  if (plan && ["FREE", "PRO"].includes(plan)) {
    where.subscriptionPlan = plan;
  }

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          subscriptionExpiresAt: true,
          totalAssignmentsGenerated: true,
          totalSubmissions: true,
          totalAICalls: true,
          lastActiveAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/users]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
