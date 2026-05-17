"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, GraduationCap, Sparkles, Activity } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminSeederPage() {
  const [bootstrapping, setBootstrapping] = useState<string | null>(null);

  const handleBootstrap = async (grade: string) => {
    setBootstrapping(grade);
    try {
      const res = await fetch("/api/admin/seeder/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, board: "CBSE" })
      });
      
      if (!res.ok) throw new Error("Bootstrap failed");
      
      toast.success(`Grade ${grade} Bootstrapping started in background!`);
    } catch (error) {
      toast.error(`Failed to start bootstrapping for Grade ${grade}`);
    } finally {
      setBootstrapping(null);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Background AI Engine</h1>
        <p className="text-muted-foreground mt-1 font-medium">Autonomous content curriculum and seeding workflows</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Bootstrap Card */}
        <Card className="border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
              Bootstrap Global Curriculum
            </CardTitle>
            <CardDescription className="text-muted-foreground font-medium">
              Trigger a deep AI scan to find all NCERT subjects, chapters, and topics for a specific grade.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              {["8", "9", "10"].map((grade) => (
                <Button 
                  key={grade}
                  variant="outline" 
                  className="w-full justify-between font-bold h-12 hover:bg-indigo-50/50 border-indigo-100 group transition-all"
                  disabled={!!bootstrapping}
                  onClick={() => handleBootstrap(grade)}
                >
                  <span className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Grade {grade}</span>
                    Scan & Seed CBSE Curriculum
                  </span>
                  {bootstrapping === grade ? (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                  )}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic font-medium">
              Note: This seeds the Subject Tree only. Individual notes and videos are generated JIT when students browse them.
            </p>
          </CardContent>
        </Card>

        {/* Workflow Status Card */}
        <Card className="border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Activity className="w-5 h-5 text-rose-500" />
              Inngest Workflows Active
            </CardTitle>
            <CardDescription className="text-muted-foreground font-medium">
              All background AI content generation is managed by Inngest for maximum reliability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 p-6 rounded-xl border border-border flex flex-col items-center justify-center space-y-4 text-center">
              <div>
                <h3 className="font-bold text-lg text-foreground">View Live Execution Dashboard</h3>
                <p className="text-muted-foreground max-w-md mt-1 text-sm font-medium">
                  Monitor concurrency, view AI logs, and manually trigger events using the local Inngest Dev Server.
                </p>
              </div>
              <Link href="http://localhost:8288" target="_blank">
                <Button className="mt-2 font-bold px-8" size="sm" variant="secondary">
                  Open Inngest Dev UI
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
