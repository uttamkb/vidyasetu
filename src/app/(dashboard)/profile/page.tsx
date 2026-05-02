import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { EditProfileModal } from "./edit-profile-modal";
import { UserProfileData } from "@/types/profile";
import {
  User,
  Mail,
  GraduationCap,
  School,
  Calendar,
  Award,
  BookOpen,
  Flame,
  Globe,
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
  const completedSubmissions = user.submissions.filter((s: any) => s.status === "SUBMITTED").length;
  const scores = user.submissions.map((s: any) => (s.score / s.maxMarks) * 100);
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

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await getProfileData(session.user.id);
  if (!data) redirect("/login");

  const { user, stats, badges } = data;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tight">Profile</h1>
          <p className="text-muted-foreground text-lg mt-1">Manage your account and view achievements.</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="border-none shadow-premium bg-gradient-to-br from-primary/5 via-blue-500/5 to-transparent overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary to-indigo-500" />
        <CardContent className="pt-8">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                <AvatarImage src={user.image || ""} alt={user.name || ""} />
                <AvatarFallback className="text-2xl">
                  {user.name?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-3xl font-heading font-bold">{user.name || "Student"}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-2 mt-3">
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
        <Card className="shadow-sm hover:shadow-premium transition-all duration-300 border-border/50 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tabular-nums">{stats.completedSubmissions}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Completed</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-premium transition-all duration-300 border-border/50 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">Average Score</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tabular-nums">{stats.averageScore}%</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Overall</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-premium transition-all duration-300 border-border/50 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">Study Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tabular-nums">{stats.studyStreak} days</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Keep it up!</p>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <Card className="shadow-premium border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-heading font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
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
      <Card className="shadow-premium border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-heading font-bold">Account Information</CardTitle>
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
