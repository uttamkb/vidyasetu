import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Dynamic API Route: /api/admin/schools/[id]

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, state, district, board } = body;

    if (!name) {
      return NextResponse.json({ error: "School name is required" }, { status: 400 });
    }

    const school = await prisma.school.update({
      where: { id },
      data: {
        name,
        state,
        district,
        board: board || "CBSE",
      },
    });

    return NextResponse.json(school);
  } catch (error) {
    console.error(`[PUT /api/admin/schools/[id]] error:`, error);
    return NextResponse.json({ error: "Failed to update school" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Pre-flight: check for dependent records before attempting delete
    const [questionCount, userCount] = await Promise.all([
      prisma.question.count({ where: { schoolId: id } }),
      prisma.user.count({ where: { schoolId: id } }),
    ]);

    if (questionCount > 0 || userCount > 0) {
      return NextResponse.json({
        error: `Cannot delete: this school has ${questionCount} question(s) and ${userCount} user(s) linked to it. Archive or reassign them first.`,
      }, { status: 409 });
    }

    await prisma.school.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "School deleted successfully" });
  } catch (error) {
    console.error(`[DELETE /api/admin/schools/[id]] error:`, error);
    return NextResponse.json({ error: "Failed to delete school" }, { status: 500 });
  }
}
