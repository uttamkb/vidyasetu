import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/progress/history — submission score history (for line chart)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "20");

  try {
    const submissions = await prisma.submission.findMany({
      where: { userId: session.user.id, status: "EVALUATED" },
      include: {
        assignment: {
          select: {
            title: true,
            type: true,
            difficulty: true,
            subject: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { submittedAt: "asc" },
      take: Math.min(limit, 50),
    });

    const history = submissions.map((s, i) => ({
      index: i + 1,
      submissionId: s.id,
      date: s.submittedAt,
      score: s.totalScore,
      maxMarks: s.maxMarks,
      percentage: Math.round(s.percentageScore * 10) / 10,
      subject: s.assignment.subject,
      assignmentTitle: s.assignment.title,
      type: s.assignment.type,
      difficulty: s.assignment.difficulty,
    }));

    // Weekly averages
    const weeklyMap: Record<string, number[]> = {};
    for (const s of submissions) {
      const weekKey = getWeekKey(new Date(s.submittedAt));
      if (!weeklyMap[weekKey]) weeklyMap[weekKey] = [];
      weeklyMap[weekKey].push(s.percentageScore);
    }

    const weeklyTrend = Object.entries(weeklyMap).map(([week, scores]) => ({
      week,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }));

    return NextResponse.json({ history, weeklyTrend });
  } catch (err) {
    console.error("[GET /api/progress/history]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1);
  return `${d.toISOString().split("T")[0]}`;
}
