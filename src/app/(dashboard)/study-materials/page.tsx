import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Video, FileText, Dumbbell, Bookmark, ExternalLink, Search } from "lucide-react";
import Link from "next/link";

async function getStudyMaterials() {
  const materials = await prisma.studyMaterial.findMany({
    include: { subject: true },
    orderBy: { createdAt: "desc" },
  });
  return materials;
}

async function getSubjects() {
  return prisma.subject.findMany();
}

const typeIcons: Record<string, React.ReactNode> = {
  NOTES: <BookOpen className="h-4 w-4" />,
  VIDEO: <Video className="h-4 w-4" />,
  PDF: <FileText className="h-4 w-4" />,
  PRACTICE: <Dumbbell className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  NOTES: "bg-blue-100 text-blue-800",
  VIDEO: "bg-red-100 text-red-800",
  PDF: "bg-green-100 text-green-800",
  PRACTICE: "bg-purple-100 text-purple-800",
};

export default async function StudyMaterialsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [materials, subjects] = await Promise.all([
    getStudyMaterials(),
    getSubjects(),
  ]);

  const materialsBySubject = subjects.map((subject: any) => ({
    ...subject,
    materials: materials.filter((m: any) => m.subjectId === subject.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Study Materials</h1>
        <p className="text-muted-foreground">
          Curated notes, videos, and practice papers for CBSE Class 9.
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          {subjects.map((subject: any) => (
            <TabsTrigger key={subject.id} value={subject.id}>
              {subject.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {materials.map((material: any) => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        </TabsContent>

        {materialsBySubject.map((subject: any) => (
          <TabsContent key={subject.id} value={subject.id} className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subject.materials.length === 0 ? (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  No materials available for this subject yet.
                </p>
              ) : (
                subject.materials.map((material: any) => (
                  <MaterialCard key={material.id} material={material} />
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function MaterialCard({ material }: { material: any }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge className={typeColors[material.type] || "bg-gray-100"}>
            <span className="flex items-center gap-1">
              {typeIcons[material.type]}
              {material.type}
            </span>
          </Badge>
          {material.bookmarked && <Bookmark className="h-4 w-4 text-primary" />}
        </div>
        <CardTitle className="text-lg mt-2">{material.title}</CardTitle>
        <CardDescription>{material.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-3 h-3 rounded-full ${material.subject.color}`} />
          <span className="text-sm">{material.subject.name}</span>
        </div>
        <div className="text-sm text-muted-foreground mb-4">
          Topic: {material.topic}
        </div>
        <div className="mt-auto pt-4 border-t">
          <a href={material.url || "#"} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full">
              Open Material
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
