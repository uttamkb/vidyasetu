import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { DistributionChart } from "./dashboard/distribution-chart";

async function getAdminStats() {
  const [studentCount, subjectCount, chapterCount, topicCount, materialCount] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.subject.count(),
    prisma.chapter.count(),
    prisma.topic.count(),
    prisma.studyMaterial.count(),
  ]);

  return {
    studentCount,
    curriculumNodes: subjectCount + chapterCount + topicCount,
    materialCount,
  };
}

export default async function AdminDashboardPage() {
  await connection();
  const session = await auth();

  // Admin guard — allow both ADMIN and SUPER_ADMIN
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  const stats = await getAdminStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Platform overview and quick actions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Curriculum Nodes</CardTitle>
            <BookOpen className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.curriculumNodes}</div>
            <p className="text-xs text-muted-foreground mt-1">Subjects, chapters, topics</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Study Materials</CardTitle>
            <FileText className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.materialCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Videos, PDFs, Notes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DistributionChart />
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link href="/admin/curriculum">
              <Button variant="outline" className="w-full justify-start gap-2 hover:bg-indigo-50/50">
                <BookOpen className="h-4 w-4 text-indigo-500" />
                Manage Curriculum Tree
              </Button>
            </Link>
            <Link href="/admin/content">
              <Button variant="outline" className="w-full justify-start gap-2 hover:bg-sky-50/50">
                <FileText className="h-4 w-4 text-sky-500" />
                Upload Study Materials
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
