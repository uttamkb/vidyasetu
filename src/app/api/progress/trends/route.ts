import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/progress/trends — weekly improvement trend for the last 8 weeks
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Fetch last 8 weeks of evaluated submissions
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const submissions = await prisma.submission.findMany({
      where: {
        userId,
        status: "EVALUATED",
        submittedAt: { gte: eightWeeksAgo },
      },
      select: {
        percentageScore: true,
        submittedAt: true,
        assignment: { select: { subject: { select: { name: true } } } },
      },
      orderBy: { submittedAt: "asc" },
    });

    // Group by ISO week (Monday-based)
    type WeekBucket = {
      weekLabel: string;
      weekStart: string; // ISO date string
      scores: number[];
      count: number;
    };

    const weekMap = new Map<string, WeekBucket>();

    for (const sub of submissions) {
      const date = new Date(sub.submittedAt);
      // Get the Monday of the submission's week
      const day = date.getDay(); // 0=Sun, 1=Mon...
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);

      const key = monday.toISOString().split("T")[0]; // "2026-04-21"

      if (!weekMap.has(key)) {
        // Human-readable label like "Apr 21"
        const label = monday.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
        weekMap.set(key, { weekLabel: label, weekStart: key, scores: [], count: 0 });
      }
      const bucket = weekMap.get(key)!;
      bucket.scores.push(sub.percentageScore);
      bucket.count += 1;
    }

    // Sort by date, then compute weekly averages and rolling delta
    const weeks = Array.from(weekMap.values()).sort((a, b) =>
      a.weekStart.localeCompare(b.weekStart)
    );

    const trends = weeks.map((w, idx) => {
      const avg = w.scores.reduce((a, b) => a + b, 0) / w.scores.length;
      const prevAvg =
        idx > 0
          ? weeks[idx - 1].scores.reduce((a, b) => a + b, 0) / weeks[idx - 1].scores.length
          : null;
      const delta = prevAvg !== null ? Math.round((avg - prevAvg) * 10) / 10 : null;

      return {
        week: w.weekLabel,
        weekStart: w.weekStart,
        avgScore: Math.round(avg * 10) / 10,
        submissionCount: w.count,
        delta, // positive = improvement, negative = decline, null = first week
      };
    });

    // Overall improvement: compare first vs last week avg
    const overallDelta =
      trends.length >= 2
        ? Math.round((trends[trends.length - 1].avgScore - trends[0].avgScore) * 10) / 10
        : null;

    return NextResponse.json({
      trends,
      overallDelta,
      weeksWithData: trends.length,
    });
  } catch (err) {
    console.error("[GET /api/progress/trends]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
