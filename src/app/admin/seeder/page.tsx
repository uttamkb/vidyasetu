"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import Link from "next/link";

export default function AdminSeederPage() {
  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Background AI Engine</h1>
        <p className="text-slate-500 mt-1">Autonomous content curriculum and seeding workflows</p>
      </div>

      <Card className="border-slate-200/60 shadow-md">
        <CardHeader>
          <CardTitle>Inngest Workflows Active</CardTitle>
          <CardDescription>
            The legacy polling-based task seeder has been deprecated. All background AI content 
            generation (including monthly curriculum scans and concurrent topic seeding) is now 
            reliably managed by Inngest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 flex flex-col items-center justify-center space-y-4 text-center">
            <Activity className="w-12 h-12 text-blue-500 mb-2" />
            <div>
              <h3 className="font-semibold text-lg text-slate-900">View Live Execution Dashboard</h3>
              <p className="text-slate-500 max-w-md mt-1">
                Monitor concurrency, view logs, and manually trigger events using the local Inngest Dev Server.
              </p>
            </div>
            <Link href="http://localhost:8288" target="_blank">
              <Button className="mt-4" size="lg">
                Open Inngest Dev UI
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

