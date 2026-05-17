import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, GraduationCap, Layers } from "lucide-react";
import { CurriculumClient } from "./curriculum-client";
import { connection } from "next/server";

export default async function CurriculumPage({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  await connection();
  const { grade = "9" } = await searchParams;
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  // Fetch curriculum tree for the selected grade
  const subjects = await prisma.subject.findMany({
    where: { grade },
    orderBy: { orderIndex: "asc" },
    include: {
      chapters: {
        orderBy: { orderIndex: "asc" },
        include: {
          topics: {
            orderBy: { orderIndex: "asc" },
            include: {
              _count: {
                select: {
                  studyMaterials: true,
                  subtopics: true,
                }
              }
            }
          }
        }
      }
    }
  });

  const totalSubjects = subjects.length;
  const totalChapters = subjects.reduce((acc, s: any) => acc + s.chapters.length, 0);
  const totalTopics = subjects.reduce((acc, s: any) => {
    return acc + s.chapters.reduce((ac: number, c: any) => ac + c.topics.length, 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Curriculum Tree</h1>
        <p className="text-muted-foreground mt-1">Manage subjects, chapters, and topics. Use AI to auto-generate content.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            <GraduationCap className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubjects}</div>
            <p className="text-xs text-muted-foreground">Total subjects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chapters</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChapters}</div>
            <p className="text-xs text-muted-foreground">Total chapters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Topics</CardTitle>
            <Layers className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTopics}</div>
            <p className="text-xs text-muted-foreground">Total topics</p>
          </CardContent>
        </Card>
      </div>

      <CurriculumClient initialSubjects={subjects as any} currentGrade={grade} />
    </div>
  );
}
