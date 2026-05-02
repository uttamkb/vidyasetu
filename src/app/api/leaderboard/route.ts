import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/leaderboard?period=weekly&scope=school
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const periodType = (searchParams.get("period") ?? "weekly").toUpperCase() as
    | "WEEKLY"
    | "MONTHLY"
    | "ALL_TIME";
  const scope = searchParams.get("scope") ?? "all"; // all | state | district | school

  const period = periodType === "WEEKLY"
    ? getWeekPeriod(new Date())
    : periodType === "MONTHLY"
    ? getMonthPeriod(new Date())
    : "ALL";

  try {
    // Get student's location for scoped leaderboard
    const currentUser = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { state: true, district: true, school: true, leaderboardOptIn: true },
    });

    // Build user filter based on scope
    let userFilter: Record<string, unknown> = { leaderboardOptIn: true };
    if (scope === "state" && currentUser.state) {
      userFilter = { ...userFilter, state: currentUser.state };
    } else if (scope === "district" && currentUser.district) {
      userFilter = { ...userFilter, district: currentUser.district };
    } else if (scope === "school" && currentUser.school) {
      userFilter = { ...userFilter, school: currentUser.school };
    }

    // Get opted-in users for this scope
    const eligibleUsers = await prisma.user.findMany({
      where: userFilter,
      select: { id: true, name: true, image: true, school: true, district: true, state: true },
    });

    const eligibleUserIds = eligibleUsers.map((u) => u.id);
    const userInfoMap = Object.fromEntries(eligibleUsers.map((u) => [u.id, u]));

    // Get leaderboard entries for eligible users
    const entries = await prisma.leaderboardEntry.findMany({
      where: {
        userId: { in: eligibleUserIds },
        period,
        periodType,
      },
      orderBy: { totalScore: "desc" },
      take: 50,
    });

    // Rank them
    const ranked = entries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      name: userInfoMap[entry.userId]?.name ?? "Student",
      image: userInfoMap[entry.userId]?.image ?? null,
      school: userInfoMap[entry.userId]?.school ?? null,
      district: userInfoMap[entry.userId]?.district ?? null,
      state: userInfoMap[entry.userId]?.state ?? null,
      avgScore: Math.round(entry.totalScore * 10) / 10,
      submissionCount: entry.submissionCount,
      isCurrentUser: entry.userId === session.user.id,
    }));

    // Find current user's rank even if not in top 50
    let myRank = ranked.find((r) => r.isCurrentUser) ?? null;
    if (!myRank && currentUser.leaderboardOptIn) {
      const myEntry = await prisma.leaderboardEntry.findUnique({
        where: {
          userId_period_periodType: {
            userId: session.user.id,
            period,
            periodType,
          },
        },
      });
      if (myEntry) {
        const myPosition = await prisma.leaderboardEntry.count({
          where: {
            userId: { in: eligibleUserIds },
            period,
            periodType,
            totalScore: { gt: myEntry.totalScore },
          },
        });
        myRank = {
          rank: myPosition + 1,
          userId: session.user.id,
          name: "You",
          image: null,
          school: currentUser.school,
          district: currentUser.district,
          state: currentUser.state,
          avgScore: Math.round(myEntry.totalScore * 10) / 10,
          submissionCount: myEntry.submissionCount,
          isCurrentUser: true,
        };
      }
    }

    return NextResponse.json({
      leaderboard: ranked,
      myRank,
      meta: {
        period,
        periodType,
        scope,
        totalParticipants: eligibleUserIds.length,
        optedIn: currentUser.leaderboardOptIn,
      },
    });
  } catch (err) {
    console.error("[GET /api/leaderboard]", err);
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
