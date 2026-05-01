import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProgressCharts } from "./progress-charts";
import { ProgressData } from "@/types/progress";

async function getProgressData(userId: string): Promise<ProgressData> {
  const [submissions, subjects] = await Promise.all([
    prisma.submission.findMany({
      where: { userId },
      include: { assignment: { include: { subject: true } } },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.subject.findMany(),
  ]);

  // Weekly scores
  const weeklyMap = new Map<number, { total: number; count: number; completed: number }>();
  submissions.forEach((s) => {
    const week = s.assignment.weekNumber;
    const existing = weeklyMap.get(week) || { total: 0, count: 0, completed: 0 };
    existing.total += (s.score / s.maxMarks) * 100;
    existing.count += 1;
    existing.completed += 1;
    weeklyMap.set(week, existing);
  });

  const weeklyData = Array.from(weeklyMap.entries()).map(([week, data]) => ({
    week: `Week ${week}`,
    score: Math.round(data.total / data.count),
    completed: data.completed,
  }));

  // Subject-wise performance (using new Subject model but zeroing out assignment counts)
  const subjectData = subjects.map((subject) => {
    return {
      name: subject.name,
      completed: 0,
      total: 0,
      average: 0,
      color: subject.color.replace("bg-", "").replace("-500", ""),
    };
  });

  // Status distribution
  const totalAssignments = await prisma.assignment.count();
  const submittedCount = submissions.filter((s) => s.status === "SUBMITTED").length;
  const inProgressCount = submissions.filter((s) => s.status === "IN_PROGRESS").length;
  const notStartedCount = totalAssignments - submittedCount - inProgressCount;

  const statusData = [
    { name: "Submitted", value: submittedCount, color: "#22c55e" },
    { name: "In Progress", value: inProgressCount, color: "#eab308" },
    { name: "Not Started", value: Math.max(0, notStartedCount), color: "#9ca3af" },
  ].filter((d) => d.value > 0);

  // Overall stats
  const allScores = submissions.map((s) => (s.score / s.maxMarks) * 100);
  const overallAverage = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  const defaultSubject = { name: "N/A", average: 0, completed: 0, total: 0, color: "" };
  const bestSubject = subjectData.length > 0 
    ? subjectData.reduce((best, current) => current.average > best.average ? current : best, subjectData[0])
    : defaultSubject;

  const weakestSubject = subjectData.length > 0
    ? subjectData.reduce((weak, current) => current.average < weak.average ? current : weak, subjectData[0])
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

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await getProgressData(session.user.id);

  return <ProgressCharts data={data} />;
}
