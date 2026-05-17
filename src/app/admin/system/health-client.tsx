"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Zap, Server, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServiceStatus {
  name: string;
  status: string;
  latencyMs: number;
  error?: string;
}

export function HealthClient() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/health-check");
      if (!res.ok) {
        setError(`Health check failed: ${res.status} ${res.statusText}`);
        return;
      }
      const data = await res.json();
      const mapped: ServiceStatus[] = [
        { name: "DATABASE", ...data.database },
        { name: "GEMINI_API", ...data.gemini },
        { name: "INNGEST", ...data.inngest },
      ];
      setServices(mapped);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      console.error("Health check failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load — defer to avoid sync setState warning
    const timer = setTimeout(fetchHealth, 0);
    return () => clearTimeout(timer);
  }, [fetchHealth]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      HEALTHY: "bg-green-100 text-green-800",
      DEGRADED: "bg-yellow-100 text-yellow-800",
      DOWN: "bg-red-100 text-red-800",
    };
    return <Badge className={variants[status] ?? "bg-gray-100"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground mt-1">
            Real-time status
            {lastUpdated && <span className="ml-2 text-xs">Updated: {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh (30s)
          </label>
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 text-blue-500 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          <p className="font-medium">Error fetching health status</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {services.map((svc) => (
          <Card key={svc.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {svc.name === "DATABASE" && <Database className="h-5 w-5 text-blue-500" />}
                {svc.name === "GEMINI_API" && <Zap className="h-5 w-5 text-amber-500" />}
                {svc.name === "INNGEST" && <Server className="h-5 w-5 text-purple-500" />}
                {svc.name.replace("_", " ")}
              </CardTitle>
              {statusBadge(svc.status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{svc.latencyMs !== undefined ? `${svc.latencyMs}ms` : "N/A"}</div>
              <p className="text-xs text-muted-foreground mt-1">Latency</p>
              {svc.error && <p className="text-xs text-red-600 mt-2 truncate">{svc.error}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
