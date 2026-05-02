import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/assignments — list assignments for the current user
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const type = searchParams.get("type");

  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { grade: true, board: true },
    });

    const assignments = await prisma.assignment.findMany({
      where: {
        targetGrade: user.grade,
        targetBoard: user.board,
        ...(subjectId ? { subjectId } : {}),
        ...(type ? { type: type as never } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, color: true, icon: true } },
        chapter: { select: { id: true, name: true } },
        submissions: {
          where: { userId: session.user.id },
          select: { id: true, status: true, totalScore: true, percentageScore: true, submittedAt: true },
          orderBy: { submittedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const enriched = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      difficulty: a.difficulty,
      maxMarks: a.maxMarks,
      timeLimit: a.timeLimit,
      isAIGenerated: a.isAIGenerated,
      subject: a.subject,
      chapter: a.chapter,
      questionCount: Array.isArray(a.questions) ? (a.questions as unknown[]).length : 0,
      dueDate: a.dueDate,
      createdAt: a.createdAt,
      // Student's submission status
      submission: a.submissions[0] ?? null,
      status: a.submissions[0]
        ? a.submissions[0].status
        : "NOT_STARTED",
    }));

    return NextResponse.json({ assignments: enriched });
  } catch (err) {
    console.error("[GET /api/assignments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
