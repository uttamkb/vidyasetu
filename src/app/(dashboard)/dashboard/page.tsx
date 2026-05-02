import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { GuidedTour } from "@/components/guided-tour";
import {
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Flame,
  Clock,
  ArrowRight,
  BookOpen,
  Sparkles,
  Target,
  Trophy,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { getNextUpSummary } from "@/services/recommendation-engine";

// ─────────────────────────────────────────
// Data fetcher
// ─────────────────────────────────────────
async function getDashboardData(userId: string) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [user, totalAssignments, submissionsThisWeek, userSubmissions, subjects, streak, masteryStats] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { hardestSubjects: true, targetScore: true, board: true, name: true, xp: true, level: true },
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
      prisma.studyStreak.findUnique({
        where: { userId },
        select: { currentStreak: true, longestStreak: true, lastStudyDate: true },
      }),
      prisma.userMastery.aggregate({
        where: { userId },
        _count: { id: true },
        _avg: { masteryScore: true },
      }),
    ]);

  const pendingCount = await prisma.submission.count({ where: { userId, status: "SUBMITTED" } });
  const pendingAssignments = Math.max(0, totalAssignments - pendingCount);

  const scores = userSubmissions.map((s) => (s.totalScore / s.maxMarks) * 100);
  const averageScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // This-week's mastered topics (mastery went >= 70 after a submission this week)
  const masteredThisWeek = await prisma.userMastery.count({
    where: { userId, masteryScore: { gte: 70 }, updatedAt: { gte: startOfWeek } },
  });

  return {
    totalAssignments,
    pendingAssignments,
    submissionsThisWeek,
    averageScore,
    studyStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
    recentSubmissions: userSubmissions,
    targetScore: user?.targetScore ?? 85,
    xp: user?.xp ?? 0,
    level: user?.level ?? "Beginner",
    masteredTopicsTotal: masteryStats._count.id,
    avgMastery: Math.round(masteryStats._avg.masteryScore ?? 0),
    masteredThisWeek,
    subjects: subjects
      .sort((a, b) => {
        const aHard = user?.hardestSubjects.includes(a.name) ? 1 : 0;
        const bHard = user?.hardestSubjects.includes(b.name) ? 1 : 0;
        return bHard - aHard;
      })
      .map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        isHardest: user?.hardestSubjects.includes(s.name) ?? false,
      })),
  };
}

// ─────────────────────────────────────────
// Page
// ─────────────────────────────────────────
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [data, nextUp] = await Promise.all([
    getDashboardData(userId),
    getNextUpSummary(userId),
  ]);

  const completionPct =
    data.totalAssignments > 0
      ? Math.round(
          ((data.totalAssignments - data.pendingAssignments) / data.totalAssignments) * 100
        )
      : 0;

  const targetGap = data.targetScore - data.averageScore;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-lg mt-1">
            Welcome back, <span className="font-semibold text-foreground">{session.user.name || "Student"}</span>! Here&apos;s your weekly overview.
          </p>
        </div>
      </div>

      {/* ── Weekly Overview ── */}
      <Card id="tour-weekly-overview" className="border-none shadow-premium bg-gradient-to-br from-primary/10 via-blue-500/5 to-transparent overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary to-indigo-500" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-heading font-bold">Weekly Overview</CardTitle>
              <CardDescription>Your progress snapshot for this week</CardDescription>
            </div>
            <Badge variant="outline" className="font-semibold">
              {data.level} · {data.xp} XP
            </Badge>
          </div>
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
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Flame className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.studyStreak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Quick Stats ── */}
      <div id="tour-quick-stats" className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm hover:shadow-premium transition-all duration-300 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tabular-nums">{data.averageScore}%</div>
            <Progress value={data.averageScore} className="mt-3 h-2" />
            {targetGap > 0 ? (
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                {targetGap}% below your target ({data.targetScore}%)
              </p>
            ) : (
              <p className="text-xs text-emerald-600 mt-2 font-bold">🎉 Target reached!</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-premium transition-all duration-300 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tabular-nums">{completionPct}%</div>
            <Progress value={completionPct} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {data.totalAssignments - data.pendingAssignments} of {data.totalAssignments} done
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-premium transition-all duration-300 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">Study Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.studyStreak} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Best: {data.longestStreak} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Weekly Summary + "Next Up" side-by-side ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Weekly Summary */}
        <Card className="border-primary/20 shadow-premium transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <CardTitle className="text-lg font-heading font-bold">This Week&apos;s Progress</CardTitle>
            </div>
            <CardDescription>What you achieved since Monday</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{data.masteredThisWeek}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Topics mastered this week</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{data.submissionsThisWeek}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tests submitted</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold">{data.avgMastery}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Overall mastery avg</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold text-rose-500">{nextUp.weakAreaCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Weak areas to fix</p>
              </div>
            </div>

            {nextUp.strongAreas.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Your strengths:</p>
                <div className="flex flex-wrap gap-1.5">
                  {nextUp.strongAreas.map((area) => (
                    <Badge
                      key={area.name}
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-700 border-emerald-400/30 text-xs"
                    >
                      ✓ {area.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/progress"
              className="flex items-center justify-between text-sm text-primary hover:underline"
            >
              Full progress report <ChevronRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Next Up — AI Learning Path */}
        <Card className="border-amber-400/20 shadow-premium bg-gradient-to-br from-amber-500/5 to-transparent transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg font-heading font-bold">Next Up — AI Learning Path</CardTitle>
            </div>
            <CardDescription>Personalised based on your mastery data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextUp.recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                <p className="font-medium text-sm">You&apos;re on track!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete more assignments to get personalised recommendations.
                </p>
              </div>
            ) : (
              nextUp.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      rec.priority === "HIGH"
                        ? "bg-rose-500"
                        : rec.priority === "MEDIUM"
                        ? "bg-amber-400"
                        : "bg-blue-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate">
                      {rec.subtopicName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {rec.subjectName} · {rec.chapterName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {rec.type === "STUDY_MATERIAL" ? (
                      <Link href="/study-materials">
                        <Badge
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <BookOpen className="h-3 w-3 mr-1" /> Study
                        </Badge>
                      </Link>
                    ) : (
                      <Link href="/assignments">
                        <Badge
                          variant="outline"
                          className="text-xs bg-rose-500/10 text-rose-700 border-rose-400/30 cursor-pointer hover:bg-rose-500 hover:text-white transition-colors"
                        >
                          <AlertCircle className="h-3 w-3 mr-1" /> Practice
                        </Badge>
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}

            {nextUp.recommendations.length > 0 && (
              <Link
                href="/progress"
                className="flex items-center justify-between text-sm text-primary hover:underline pt-1"
              >
                View full mastery map <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Subject Cards ── */}
      <div id="tour-subject-progress" className="pt-4">
        <h2 className="text-2xl font-heading font-bold mb-4">Subjects</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.subjects.map((subject) => (
            <Link key={subject.id} href="/study-materials">
              <Card className="hover:shadow-premium hover:-translate-y-1 transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm cursor-pointer">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${subject.color}`} />
                    <span className="font-medium">{subject.name}</span>
                    {subject.isHardest && (
                      <Badge variant="outline" className="ml-auto text-xs text-rose-600 border-rose-400/40 bg-rose-500/10">
                        Focus
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Tap to browse study materials →
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div id="tour-recent-activity" className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-heading font-bold">Recent Activity</h2>
          <Link
            href="/assignments"
            className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {data.recentSubmissions.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No submissions yet. Start your first assignment!</p>
              <Link href="/assignments">
                <Badge className="mt-4 cursor-pointer">Go to Assignments</Badge>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.recentSubmissions.map((submission) => {
              const pct = Math.round((submission.totalScore / submission.maxMarks) * 100);
              return (
                <Link key={submission.id} href={`/submissions/${submission.id}`}>
                  <Card className="hover:shadow-premium transition-all duration-300 cursor-pointer border-border/50">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            pct >= 70
                              ? "bg-emerald-500"
                              : pct >= 40
                              ? "bg-amber-400"
                              : "bg-rose-500"
                          }`}
                        />
                        <div>
                          <p className="font-medium text-sm">{submission.assignment.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {submission.assignment.subject.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">
                          {submission.totalScore}/{submission.maxMarks}
                        </p>
                        <p
                          className={`text-xs font-medium ${
                            pct >= 70
                              ? "text-emerald-600"
                              : pct >= 40
                              ? "text-amber-600"
                              : "text-rose-600"
                          }`}
                        >
                          {pct}%
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <GuidedTour />
    </div>
  );
}
