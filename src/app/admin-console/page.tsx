import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Activity, DollarSign, Users } from "lucide-react";

export default async function AdminConsole() {
  const session = await auth();
  
  // Strict admin check
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch usage stats
  const usageStats = await prisma.userAIUsage.findMany({
    orderBy: { date: 'desc' },
    take: 50,
    include: { user: { select: { name: true, email: true } } }
  });

  // Aggregate stats
  const totalCalls = usageStats.reduce((sum, s) => sum + s.callCount, 0);
  const totalTokens = usageStats.reduce((sum, s) => sum + s.estimatedTokens, 0);
  const uniqueUsers = new Set(usageStats.map(s => s.userId)).size;

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Admin Console</h1>
        <p className="text-muted-foreground mt-2">Monitoring AI performance and cost burn.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AI Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all models</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Tokens</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalTokens / 1000).toFixed(1)}k</div>
            <p className="text-xs text-muted-foreground">Input + Output</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active AI Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">Unique students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ${((totalTokens / 1_000_000) * 15).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Blended Gemini rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent AI Interactions</CardTitle>
          <CardDescription>Detailed breakdown of model usage by user.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">User</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Model</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Calls</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tokens</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Last Used</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {usageStats.map((log) => (
                  <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">
                      {log.user.name || "Unknown"}
                      <div className="text-xs text-muted-foreground font-normal">{log.user.email}</div>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {log.modelName}
                      </span>
                    </td>
                    <td className="p-4 align-middle font-mono text-xs">{log.type}</td>
                    <td className="p-4 align-middle">{log.callCount}</td>
                    <td className="p-4 align-middle">{(log.estimatedTokens / 1000).toFixed(1)}k</td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {log.updatedAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {usageStats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      No AI usage logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
