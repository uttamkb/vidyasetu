import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Manual Upsert: Find first, then create or return
    // This avoids the requirement for a Unique constraint in the schema
    let submission = await prisma.submission.findFirst({
      where: {
        userId: session.user.id,
        assignmentId: id,
      },
    });

    if (!submission) {
      submission = await prisma.submission.create({
        data: {
          userId: session.user.id,
          assignmentId: id,
          status: "IN_PROGRESS",
          maxMarks: assignment.maxMarks,
          answers: [],
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      startTime: submission.submittedAt
    });
  } catch (error) {
    console.error("[POST /api/assignments/[id]/start] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
