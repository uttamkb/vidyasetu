"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface TaskStats {
  PENDING?: number;
  PROCESSING?: number;
  COMPLETED?: number;
  FAILED?: number;
}

interface Task {
  id: string;
  status: string;
  payload: { topicName: string; topicId: string };
  error?: string;
  updatedAt: string;
}

export default function AdminSeederPage() {
  const [stats, setStats] = useState<TaskStats>({});
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastWorkerResult, setLastWorkerResult] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seed");
      const data = await res.json();
      setStats(data.stats);
      setRecentTasks(data.recentTasks);
    } catch (error) {
      console.error("Failed to fetch status", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const initiateSeeding = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const data = await res.json();
      alert(data.message);
      fetchStatus();
    } catch (error) {
      alert("Failed to initiate seeding");
    } finally {
      setLoading(false);
    }
  };

  const runWorker = useCallback(async () => {
    if (!isSeeding) return;
    try {
      const res = await fetch("/api/admin/seed/worker", { method: "POST" });
      const data = await res.json();
      if (data.message === "No pending seeding tasks.") {
        setIsSeeding(false);
        setLastWorkerResult("Finished all tasks.");
      } else if (data.success) {
        setLastWorkerResult(`Seeded: ${data.topicName}`);
        // Run again immediately for speed
        runWorker();
      } else {
        setLastWorkerResult(`Error: ${data.error}`);
        // Pause briefly on error to avoid spamming
        setTimeout(runWorker, 2000);
      }
    } catch (error) {
      setLastWorkerResult("Worker request failed");
      setTimeout(runWorker, 5000);
    }
  }, [isSeeding]);

  useEffect(() => {
    if (isSeeding) {
      runWorker();
    }
  }, [isSeeding, runWorker]);

  const pendingCount = stats.PENDING || 0;
  const completedCount = stats.COMPLETED || 0;
  const failedCount = stats.FAILED || 0;
  const totalCount = pendingCount + completedCount + failedCount + (stats.PROCESSING || 0);
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Material Seeder</h1>
          <p className="text-slate-500 mt-1">Background AI seeding for academic topics (CBSE Class 9/10)</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={initiateSeeding} disabled={loading}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Scan for Missing Topics
          </Button>
          <Button 
            onClick={() => setIsSeeding(!isSeeding)} 
            variant={isSeeding ? "destructive" : "default"}
            disabled={pendingCount === 0 && !isSeeding}
          >
            {isSeeding ? (
              <><Pause className="w-4 h-4 mr-2" /> Stop Seeding</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Start Background Seeding</>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-50/50 border-slate-200/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Topics</CardDescription>
            <CardTitle className="text-2xl">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-blue-50/30 border-blue-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-600">Pending</CardDescription>
            <CardTitle className="text-2xl text-blue-700">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-green-50/30 border-green-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-600">Completed</CardDescription>
            <CardTitle className="text-2xl text-green-700">{completedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-red-50/30 border-red-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-600">Failed</CardDescription>
            <CardTitle className="text-2xl text-red-700">{failedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-slate-200/60 shadow-md overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-200/60">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Overall Progress</CardTitle>
              <CardDescription>Generated {completedCount} of {totalCount} study packs</CardDescription>
            </div>
            {isSeeding && (
              <div className="flex items-center text-sm text-blue-600 font-medium">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI is curating content...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{Math.round(progress)}% Complete</span>
              <span className="font-medium">{lastWorkerResult || "Idle"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 shadow-md">
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
          <CardDescription>The last 10 operations performed by the seeder</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/30">
                  <div className="flex items-center gap-4">
                    {task.status === "COMPLETED" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : task.status === "FAILED" ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    )}
                    <div>
                      <p className="font-medium">{task.payload.topicName}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(task.updatedAt).toLocaleTimeString()} • {task.status}
                      </p>
                      {task.error && <p className="text-xs text-red-500 mt-1">{task.error}</p>}
                    </div>
                  </div>
                  <Badge variant={
                    task.status === "COMPLETED" ? "default" : 
                    task.status === "FAILED" ? "destructive" : 
                    "secondary"
                  }>
                    {task.status}
                  </Badge>
                </div>
              ))}
              {recentTasks.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  No tasks found. Click "Scan for Missing Topics" to begin.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
