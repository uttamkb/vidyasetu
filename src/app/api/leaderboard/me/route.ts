import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/leaderboard/me — student's own rank across all scopes and periods
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        state: true,
        district: true,
        school: true,
        leaderboardOptIn: true,
        xp: true,
        level: true,
      },
    });

    if (!user.leaderboardOptIn) {
      return NextResponse.json({
        optedIn: false,
        message: "Enable leaderboard participation in your profile to see your ranks.",
        ranks: null,
      });
    }

    // Get this week + this month period keys
    const now = new Date();
    const weekPeriod = getWeekPeriod(now);
    const monthPeriod = getMonthPeriod(now);

    // Fetch all leaderboard entries for this user
    const myEntries = await prisma.leaderboardEntry.findMany({
      where: {
        userId,
        period: { in: [weekPeriod, monthPeriod, "ALL"] },
      },
    });

    const entryMap = Object.fromEntries(
      myEntries.map((e) => [`${e.periodType}:${e.period}`, e])
    );

    // Helper: compute rank within scope
    async function computeRank(
      periodType: "WEEKLY" | "MONTHLY" | "ALL_TIME",
      period: string,
      scopeFilter: Record<string, unknown>
    ): Promise<{ rank: number | null; totalInScope: number; myScore: number | null }> {
      const myEntry = entryMap[`${periodType}:${period}`];
      if (!myEntry) return { rank: null, totalInScope: 0, myScore: null };

      const [aboveCount, totalCount] = await Promise.all([
        prisma.leaderboardEntry.count({
          where: {
            periodType,
            period,
            totalScore: { gt: myEntry.totalScore },
            user: { leaderboardOptIn: true, ...scopeFilter },
          },
        }),
        prisma.leaderboardEntry.count({
          where: {
            periodType,
            period,
            user: { leaderboardOptIn: true, ...scopeFilter },
          },
        }),
      ]);

      return {
        rank: aboveCount + 1,
        totalInScope: totalCount,
        myScore: Math.round(myEntry.totalScore * 10) / 10,
      };
    }

    const stateFilter = user.state ? { state: user.state } : {};
    const districtFilter = user.district ? { district: user.district } : {};
    const schoolFilter = user.school ? { school: user.school } : {};

    // Compute all ranks in parallel
    const [
      weeklyAll,
      weeklyState,
      weeklyDistrict,
      weeklySchool,
      monthlyAll,
      monthlyState,
      allTimeAll,
      allTimeState,
    ] = await Promise.all([
      computeRank("WEEKLY", weekPeriod, {}),
      computeRank("WEEKLY", weekPeriod, stateFilter),
      computeRank("WEEKLY", weekPeriod, districtFilter),
      computeRank("WEEKLY", weekPeriod, schoolFilter),
      computeRank("MONTHLY", monthPeriod, {}),
      computeRank("MONTHLY", monthPeriod, stateFilter),
      computeRank("ALL_TIME", "ALL", {}),
      computeRank("ALL_TIME", "ALL", stateFilter),
    ]);

    return NextResponse.json({
      optedIn: true,
      location: {
        state: user.state,
        district: user.district,
        school: user.school,
      },
      xp: user.xp,
      level: user.level,
      ranks: {
        weekly: {
          period: weekPeriod,
          overall: weeklyAll,
          state: weeklyState,
          district: weeklyDistrict,
          school: weeklySchool,
        },
        monthly: {
          period: monthPeriod,
          overall: monthlyAll,
          state: monthlyState,
        },
        allTime: {
          period: "ALL",
          overall: allTimeAll,
          state: allTimeState,
        },
      },
    });
  } catch (err) {
    console.error("[GET /api/leaderboard/me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getWeekPeriod(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1);
  const year = d.getFullYear();
  const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getMonthPeriod(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
