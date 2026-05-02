import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProgressCharts } from "./progress-charts";
import { MasteryMap, TrendChart } from "./mastery-map";
import { ProgressData } from "@/types/progress";
import { Separator } from "@/components/ui/separator";

// ─────────────────────────────────────────
// Data fetchers (server-side)
// ─────────────────────────────────────────

async function getProgressData(userId: string): Promise<ProgressData> {
  const [submissions, subjects] = await Promise.all([
    prisma.submission.findMany({
      where: { userId },
      include: { assignment: { include: { subject: true } } },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.subject.findMany(),
  ]);

  // Weekly scores (index-based proxy)
  const weeklyMap = new Map<number, { total: number; count: number; completed: number }>();
  submissions.forEach((s, idx) => {
    const week = idx + 1;
    const existing = weeklyMap.get(week) || { total: 0, count: 0, completed: 0 };
    existing.total += (s.totalScore / s.maxMarks) * 100;
    existing.count += 1;
    existing.completed += 1;
    weeklyMap.set(week, existing);
  });

  const weeklyData = Array.from(weeklyMap.entries()).map(([week, data]) => ({
    week: `Week ${week}`,
    score: Math.round(data.total / data.count),
    completed: data.completed,
  }));

  const subjectData = subjects.map((subject) => ({
    name: subject.name,
    completed: 0,
    total: 0,
    average: 0,
    color: subject.color.replace("bg-", "").replace("-500", ""),
  }));

  const totalAssignments = await prisma.assignment.count();
  const submittedCount = submissions.filter((s) => s.status === "SUBMITTED").length;
  const inProgressCount = submissions.filter((s) => s.status === "IN_PROGRESS").length;
  const notStartedCount = totalAssignments - submittedCount - inProgressCount;

  const statusData = [
    { name: "Submitted", value: submittedCount, color: "#22c55e" },
    { name: "In Progress", value: inProgressCount, color: "#eab308" },
    { name: "Not Started", value: Math.max(0, notStartedCount), color: "#9ca3af" },
  ].filter((d) => d.value > 0);

  const allScores = submissions.map((s) => (s.totalScore / s.maxMarks) * 100);
  const overallAverage =
    allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

  const defaultSubject = { name: "N/A", average: 0, completed: 0, total: 0, color: "" };
  const bestSubject =
    subjectData.length > 0
      ? subjectData.reduce((best, cur) => (cur.average > best.average ? cur : best), subjectData[0])
      : defaultSubject;
  const weakestSubject =
    subjectData.length > 0
      ? subjectData.reduce((weak, cur) => (cur.average < weak.average ? cur : weak), subjectData[0])
      : defaultSubject;

  return {
    weeklyData,
    subjectData,
    statusData,
    overallAverage,
    bestSubject,
    weakestSubject,
    submittedCount,
    totalAssignments,
  };
}

async function getMasteryMap(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { grade: true, board: true },
  });

  const subjects = await prisma.subject.findMany({
    where: { grade: user.grade, board: user.board },
    include: {
      chapters: {
        include: {
          topics: {
            include: {
              subtopics: {
                include: {
                  userMastery: {
                    where: { userId },
                    select: {
                      masteryScore: true,
                      lastPracticed: true,
                      totalAttempts: true,
                      correctAttempts: true,
                    },
                  },
                },
                orderBy: { orderIndex: "asc" },
              },
            },
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { orderIndex: "asc" },
  });

  return subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    color: subject.color,
    icon: subject.icon,
    chapters: subject.chapters.map((chapter) => {
      const allSubtopics = chapter.topics.flatMap((t) => t.subtopics);
      const chapterAvg =
        allSubtopics.length > 0
          ? allSubtopics.reduce((sum, st) => sum + (st.userMastery[0]?.masteryScore ?? 0), 0) /
            allSubtopics.length
          : 0;

      return {
        id: chapter.id,
        name: chapter.name,
        orderIndex: chapter.orderIndex,
        avgMastery: Math.round(chapterAvg),
        topics: chapter.topics.map((topic) => {
          const topicScores = topic.subtopics.map((st) => st.userMastery[0]?.masteryScore ?? 0);
          const topicAvg =
            topicScores.length > 0
              ? topicScores.reduce((a, b) => a + b, 0) / topicScores.length
              : 0;

          return {
            id: topic.id,
            name: topic.name,
            orderIndex: topic.orderIndex,
            avgMastery: Math.round(topicAvg),
            subtopics: topic.subtopics.map((st) => ({
              id: st.id,
              name: st.name,
              difficulty: st.difficulty,
              masteryScore: Math.round(st.userMastery[0]?.masteryScore ?? 0),
              lastPracticed: st.userMastery[0]?.lastPracticed?.toISOString() ?? null,
              totalAttempts: st.userMastery[0]?.totalAttempts ?? 0,
              correctAttempts: st.userMastery[0]?.correctAttempts ?? 0,
              status: (
                (st.userMastery[0]?.masteryScore ?? 0) >= 70
                  ? "mastered"
                  : (st.userMastery[0]?.masteryScore ?? 0) >= 40
                  ? "learning"
                  : st.userMastery[0]
                  ? "weak"
                  : "not_started"
              ) as "mastered" | "learning" | "weak" | "not_started",
            })),
          };
        }),
      };
    }),
  }));
}

async function getTrends(userId: string) {
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const submissions = await prisma.submission.findMany({
    where: {
      userId,
      status: "EVALUATED",
      submittedAt: { gte: eightWeeksAgo },
    },
    select: { percentageScore: true, submittedAt: true },
    orderBy: { submittedAt: "asc" },
  });

  type WeekBucket = { weekLabel: string; weekStart: string; scores: number[]; count: number };
  const weekMap = new Map<string, WeekBucket>();

  for (const sub of submissions) {
    const date = new Date(sub.submittedAt);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().split("T")[0];

    if (!weekMap.has(key)) {
      const label = monday.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      weekMap.set(key, { weekLabel: label, weekStart: key, scores: [], count: 0 });
    }
    const bucket = weekMap.get(key)!;
    bucket.scores.push(sub.percentageScore);
    bucket.count += 1;
  }

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
      delta,
    };
  });

  const overallDelta =
    trends.length >= 2
      ? Math.round((trends[trends.length - 1].avgScore - trends[0].avgScore) * 10) / 10
      : null;

  return { trends, overallDelta };
}

// ─────────────────────────────────────────
// Page
// ─────────────────────────────────────────

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [progressData, masteryMap, trendData] = await Promise.all([
    getProgressData(userId),
    getMasteryMap(userId),
    getTrends(userId),
  ]);

  return (
    <div className="space-y-10">
      {/* Section 1 — Overview charts */}
      <ProgressCharts data={progressData} />

      <Separator />

      {/* Section 2 — Improvement Trend */}
      <TrendChart trends={trendData.trends} overallDelta={trendData.overallDelta} />

      <Separator />

      {/* Section 3 — Mastery Map + Strength/Weakness */}
      <MasteryMap masteryMap={masteryMap} />
    </div>
  );
}
