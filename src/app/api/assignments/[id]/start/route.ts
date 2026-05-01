import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  try {
    const existing = await prisma.submission.findFirst({
      where: { assignmentId: id, userId },
    });

    if (existing) {
      return NextResponse.json({ success: true, submissionId: existing.id });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const submission = await prisma.submission.create({
      data: {
        userId,
        assignmentId: id,
        answers: [],
        score: 0,
        maxMarks: assignment.maxMarks,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, submissionId: submission.id });
  } catch (error) {
    console.error("Start error:", error);
    return NextResponse.json({ error: "Failed to start assignment" }, { status: 500 });
  }
}
