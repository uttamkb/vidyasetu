/**
 * GET /api/admin/users/:id
 *
 * Single user detail with activity timeline.
 * Admin-only. Read-only.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireSuperAdmin } from "@/lib/require-admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        grade: true,
        board: true,
        state: true,
        district: true,
        school: true,
        xp: true,
        level: true,
        leaderboardOptIn: true,
        isOnboarded: true,
        totalAssignmentsGenerated: true,
        totalSubmissions: true,
        totalAICalls: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch recent activity
    const [recentSubmissions, recentAssignments, aiUsage] = await Promise.all([
      prisma.submission.findMany({
        where: { userId: id },
        orderBy: { submittedAt: "desc" },
        take: 5,
        select: {
          id: true,
          assignmentId: true,
          totalScore: true,
          maxMarks: true,
          percentageScore: true,
          status: true,
          submittedAt: true,
        },
      }),
      prisma.assignment.findMany({
        where: { authorId: id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.userAIUsage.findMany({
        where: { userId: id },
        orderBy: { date: "desc" },
        take: 7,
        select: {
          date: true,
          modelName: true,
          type: true,
          callCount: true,
          estimatedTokens: true,
          tokensInput: true,
          tokensOutput: true,
          actualCostUsd: true,
        },
      }),
    ]);

    return NextResponse.json({
      user,
      activity: {
        recentSubmissions,
        recentAssignments,
        aiUsage,
      },
    });
  } catch (error) {
    console.error(`[GET /api/admin/users/${id}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/:id
 *
 * Update user fields. Admin can edit plan/status.
 * Role changes require SUPER_ADMIN.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // All edits require at least admin — capture session for audit trail
  let adminSession;
  try {
    adminSession = await requireAdmin();
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { role, isActive, subscriptionPlan, subscriptionStatus, name, grade, board, disableReason } = body;

    // Role changes require SUPER_ADMIN
    if (role !== undefined) {
      try {
        await requireSuperAdmin();
      } catch (err) {
        if (err instanceof NextResponse) return err;
        return NextResponse.json({ error: "Only super admins can change roles" }, { status: 403 });
      }

      if (!["STUDENT", "ADMIN", "SUPER_ADMIN"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
    }

    // Build update payload — only include provided fields
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) {
      updateData.isActive = isActive;
      // Audit trail for disable/enable
      if (isActive === false) {
        updateData.disabledAt = new Date();
        updateData.disabledBy = adminSession.user.id;
        updateData.disableReason = disableReason || "Disabled by admin";
      } else {
        updateData.disabledAt = null;
        updateData.disabledBy = null;
        updateData.disableReason = null;
      }
    }
    if (subscriptionPlan !== undefined) updateData.subscriptionPlan = subscriptionPlan;
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
    if (name !== undefined) updateData.name = name;
    if (grade !== undefined) updateData.grade = grade;
    if (board !== undefined) updateData.board = board;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        disabledAt: true,
        disabledBy: true,
        disableReason: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error(`[PATCH /api/admin/users/${id}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
