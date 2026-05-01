import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GuidedTour } from "@/components/guided-tour";
import {
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Flame,
  Clock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

async function getDashboardData(userId: string) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [user, totalAssignments, submissions, userSubmissions, subjects] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { hardestSubjects: true, targetScore: true, board: true },
    }),
    prisma.assignment.count(),
    prisma.submission.count({
      where: { userId, submittedAt: { gte: startOfWeek } },
    }),
    prisma.submission.findMany({
      where: { userId },
      include: { assignment: { include: { subject: true } } },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
    prisma.subject.findMany(),
  ]);

  const pendingAssignments = totalAssignments - (await prisma.submission.count({
    where: { userId, status: "SUBMITTED" },
  }));

  const scores = userSubmissions.map((s) => (s.score / s.maxMarks) * 100);
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Calculate study streak from submission history
  const studyStreak = (() => {
    if (userSubmissions.length === 0) return 0;
    const sorted = [...userSubmissions].sort((a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let checkDate = new Date(today);
    for (const sub of sorted) {
      const subDate = new Date(sub.submittedAt);
      subDate.setHours(0, 0, 0, 0);
      const diff = Math.floor((checkDate.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0 || diff === streak) {
        streak = diff + 1;
        checkDate = subDate;
      } else if (diff < 0) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  })();

  return {
    totalAssignments,
    pendingAssignments: Math.max(0, pendingAssignments),
    submissionsThisWeek: submissions,
    averageScore,
    studyStreak,
    recentSubmissions: userSubmissions,
    targetScore: user?.targetScore ?? 85,
    subjects: subjects
      .sort((a, b) => {
        const aHard = user?.hardestSubjects.includes(a.name) ? 1 : 0;
        const bHard = user?.hardestSubjects.includes(b.name) ? 1 : 0;
        return bHard - aHard; // Hardest first
      })
      .map((s) => {
        return {
          id: s.id,
          name: s.name,
          color: s.color,
          completed: 0,
          total: 0,
          progress: 0,
          isHardest: user?.hardestSubjects.includes(s.name),
        };
      }),
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await getDashboardData(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name || "Student"}! Here’s your weekly overview.
        </p>
      </div>

      {/* Weekly Overview */}
      <Card id="tour-weekly-overview" className="bg-gradient-to-r from-primary/10 to-blue-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Weekly Overview</CardTitle>
          <CardDescription>Week 1 of your CBSE Class 9 journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalAssignments}</p>
                <p className="text-xs text-muted-foreground">Total Assignments</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.pendingAssignments}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.submissionsThisWeek}</p>
                <p className="text-xs text-muted-foreground">Submitted This Week</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Flame className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.studyStreak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div id="tour-quick-stats" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageScore}%</div>
            <Progress value={data.averageScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalAssignments > 0
                ? Math.round(
                    ((data.totalAssignments - data.pendingAssignments) / data.totalAssignments) * 100
                  )
                : 0}
              %
            </div>
            <Progress
              value={
                data.totalAssignments > 0
                  ? ((data.totalAssignments - data.pendingAssignments) / data.totalAssignments) * 100
                  : 0
              }
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.studyStreak} days</div>
            <p className="text-xs text-muted-foreground mt-1">Keep it up!</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Progress */}
      <div id="tour-subject-progress">
        <h2 className="text-xl font-semibold mb-4">Subject Progress</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.subjects.map((subject) => (
            <Card key={subject.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${subject.color}`} />
                    <span className="font-medium">{subject.name}</span>
                  </div>
                  <Badge variant="secondary">{subject.completed}/{subject.total}</Badge>
                </div>
                <Progress value={subject.progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {subject.progress}% complete
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div id="tour-recent-activity">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <Link
            href="/assignments"
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {data.recentSubmissions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No submissions yet. Start your first assignment!</p>
              <Link href="/assignments">
                <Badge className="mt-4 cursor-pointer">Go to Assignments</Badge>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.recentSubmissions.map((submission) => (
              <Card key={submission.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        submission.score / submission.maxMarks >= 0.7
                          ? "bg-green-500"
                          : submission.score / submission.maxMarks >= 0.4
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    />
                    <div>
                      <p className="font-medium">{submission.assignment.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {submission.assignment.subject.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {submission.score}/{submission.maxMarks}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((submission.score / submission.maxMarks) * 100)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <GuidedTour />
    </div>
  );
}
