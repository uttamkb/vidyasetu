import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { EditProfileModal } from "./edit-profile-modal";
import { SkillRadarChart } from "@/components/skill-radar-chart";
import {
  User,
  Mail,
  GraduationCap,
  Calendar,
  Award,
  BookOpen,
  Flame,
  Globe,
  Target,
} from "lucide-react";

async function getProfileData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      submissions: {
        include: { assignment: { include: { subject: true } } },
      },
    },
  });

  if (!user) return null;

  const totalSubmissions = user.submissions.length;
  const completedSubmissions = user.submissions.filter((s) => s.status === "SUBMITTED").length;
  const scores = user.submissions.map((s) => (s.score / s.maxMarks) * 100);
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
    : 0;

  // Calculate badges
  const badges = [];
  if (completedSubmissions >= 1) badges.push({ name: "First Submission", icon: "📝" });
  if (scores.some((s: number) => s === 100)) badges.push({ name: "Perfect Score", icon: "⭐" });
  if (averageScore >= 80) badges.push({ name: "Top Performer", icon: "🏆" });
  if (completedSubmissions >= 5) badges.push({ name: "All Subjects Done", icon: "📚" });

  return {
    user,
    stats: {
      totalSubmissions,
      completedSubmissions,
      averageScore,
      studyStreak: 3, // Placeholder
    },
    badges,
  };
}

async function getMasteryData(userId: string) {
  const masteryData = await prisma.userMastery.findMany({
    where: { userId },
    include: {
      subtopic: {
        include: {
          topic: {
            include: {
              chapter: {
                include: {
                  subject: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const subjectMap = new Map<string, { name: string; total: number; count: number }>();

  for (const m of masteryData) {
    const subject = m.subtopic.topic.chapter.subject;
    const existing = subjectMap.get(subject.id);
    if (existing) {
      existing.total += m.masteryScore;
      existing.count += 1;
    } else {
      subjectMap.set(subject.id, { name: subject.name, total: m.masteryScore, count: 1 });
    }
  }

  return Array.from(subjectMap.entries()).map(([id, data]) => ({
    subjectId: id,
    subjectName: data.name,
    averageMastery: Math.round(data.total / data.count),
  }));
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await getProfileData(session.user.id);
  if (!data) redirect("/login");

  const masteryData = await getMasteryData(session.user.id);

  const { user, stats, badges } = data;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account and view achievements.</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.image || ""} alt={user.name || ""} />
                <AvatarFallback className="text-2xl">
                  {user.name?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{user.name || "Student"}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">Class {user.grade}</Badge>
                  <Badge variant="outline">{user.board}</Badge>
                </div>
              </div>
            </div>
            
            <EditProfileModal user={{
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              grade: user.grade,
              board: user.board,
            }} />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedSubmissions}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
            <p className="text-xs text-muted-foreground">Overall</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studyStreak} days</div>
            <p className="text-xs text-muted-foreground">Keep it up!</p>
          </CardContent>
        </Card>
      </div>

      {/* Skill Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Skill Map
          </CardTitle>
          <CardDescription>Subject-wise mastery based on your diagnostic test</CardDescription>
        </CardHeader>
        <CardContent>
          <SkillRadarChart data={masteryData} />
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements
          </CardTitle>
          <CardDescription>Badges earned through your learning journey</CardDescription>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No badges yet. Complete assignments to earn achievements!
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.name}
                  className="flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2"
                >
                  <span className="text-lg">{badge.icon}</span>
                  <span className="text-sm font-medium">{badge.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-sm text-muted-foreground">{user.name || "Not set"}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Grade</p>
              <p className="text-sm text-muted-foreground">Class {user.grade}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Board</p>
              <p className="text-sm text-muted-foreground">{user.board}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Joined</p>
              <p className="text-sm text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
