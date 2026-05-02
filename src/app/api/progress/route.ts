import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/progress — overall student progress stats
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Submissions summary
    const submissions = await prisma.submission.findMany({
      where: { userId, status: "EVALUATED" },
      include: {
        assignment: { select: { subject: { select: { id: true, name: true, color: true } } } },
      },
      orderBy: { submittedAt: "desc" },
      take: 50,
    });

    const totalSubmissions = submissions.length;
    const avgScore =
      totalSubmissions > 0
        ? submissions.reduce((sum, s) => sum + s.percentageScore, 0) / totalSubmissions
        : 0;

    // Subject-wise performance
    const subjectScoreMap: Record<string, { name: string; color: string; scores: number[] }> = {};
    for (const s of submissions) {
      const sub = s.assignment.subject;
      if (!subjectScoreMap[sub.id]) {
        subjectScoreMap[sub.id] = { name: sub.name, color: sub.color, scores: [] };
      }
      subjectScoreMap[sub.id].scores.push(s.percentageScore);
    }

    const subjectPerformance = Object.entries(subjectScoreMap).map(([id, data]) => ({
      subjectId: id,
      subjectName: data.name,
      color: data.color,
      avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      count: data.scores.length,
    }));

    // Mastery summary
    const masteryRows = await prisma.userMastery.findMany({
      where: { userId },
      select: { masteryScore: true },
    });

    const masteredCount = masteryRows.filter((m) => m.masteryScore >= 70).length;
    const inProgressCount = masteryRows.filter((m) => m.masteryScore >= 40 && m.masteryScore < 70).length;
    const weakCount = masteryRows.filter((m) => m.masteryScore < 40).length;

    // Streak
    const streak = await prisma.studyStreak.findUnique({
      where: { userId },
      select: { currentStreak: true, longestStreak: true },
    });

    // Level & XP
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });

    return NextResponse.json({
      overview: {
        totalSubmissions,
        avgScore: Math.round(avgScore * 10) / 10,
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        xp: user?.xp ?? 0,
        level: user?.level ?? "Beginner",
      },
      subjectPerformance,
      mastery: {
        total: masteryRows.length,
        mastered: masteredCount,
        inProgress: inProgressCount,
        weak: weakCount,
        coveragePercent:
          masteryRows.length > 0
            ? Math.round((masteredCount / masteryRows.length) * 100)
            : 0,
      },
    });
  } catch (err) {
    console.error("[GET /api/progress]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
