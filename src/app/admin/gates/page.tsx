/**
 * Admin Feature Gates Page — SUPER_ADMIN Only
 *
 * Toggle platform features between OFF / SHADOW / ON.
 * Shadow mode = visible to admins only, useful for testing.
 */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllFeatureGates, type FeatureState } from "@/lib/feature-gate";
import { Shield } from "lucide-react";
import { GateToggle } from "./gate-toggle";

export default async function AdminGatesPage() {
  await connection();
  const session = await auth();

  // Strict: SUPER_ADMIN only
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  const gates = getAllFeatureGates();

  const stateBadge = (state: FeatureState) => {
    const variants: Record<string, string> = {
      ON: "bg-green-100 text-green-800",
      SHADOW: "bg-amber-100 text-amber-800",
      OFF: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge className={variants[state] ?? "bg-gray-100 text-gray-800"}>
        {state}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-red-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Gates</h1>
          <p className="text-muted-foreground mt-1">
            SUPER_ADMIN only. Toggle platform features.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {gates.map((gate) => (
          <Card key={gate.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{gate.name}</span>
                    {stateBadge(gate.state)}
                    {gate.state !== gate.defaultState && (
                      <Badge variant="outline" className="text-xs">overridden</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{gate.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Default: {gate.defaultState}
                  </p>
                </div>

                <GateToggle name={gate.name} currentState={gate.state} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

