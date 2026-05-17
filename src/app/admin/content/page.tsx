import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Video, Sparkles, FolderOpen } from "lucide-react";
import { ContentFactoryTabs } from "./content-factory-tabs";
import { connection } from "next/server";

export default async function ContentPage() {
  await connection();
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  // Fetch actual counts
  const [notesCount, videoCount, pdfCount] = await Promise.all([
    prisma.studyMaterial.count({ where: { type: "PLATFORM_CONTENT" } }),
    prisma.studyMaterial.count({ where: { type: "VIDEO" } }),
    prisma.studyMaterial.count({ where: { type: { in: ["PDF", "WORKSHEET"] } } }),
  ]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight text-slate-900 flex items-center gap-2">
            <FolderOpen className="h-8 w-8 text-blue-600" />
            Content Factory
          </h1>
          <p className="text-muted-foreground mt-1">
            Build custom curriculum databases, align question banks by institution, and manage resources.
          </p>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-amber-100 bg-amber-50/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-amber-800">AI Smart Notes</CardTitle>
            <Sparkles className="h-4 w-4 text-amber-600 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-950">{notesCount}</div>
            <p className="text-xs text-amber-800/80 font-medium">Concept sheets generated JIT</p>
          </CardContent>
        </Card>
        <Card className="border-blue-100 bg-blue-50/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-blue-800">Lectures & Videos</CardTitle>
            <Video className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-950">{videoCount}</div>
            <p className="text-xs text-blue-800/80 font-medium">YouTube lectures mapped</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 bg-emerald-50/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-800">PDFs & Practice Sheets</CardTitle>
            <FileText className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-950">{pdfCount}</div>
            <p className="text-xs text-emerald-800/80 font-medium">Resource items stored</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Container */}
      <ContentFactoryTabs />
    </div>
  );
}
