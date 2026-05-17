"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Loader2, Activity } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean | null;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  disabledAt?: string | null;
  disabledBy?: string | null;
  disableReason?: string | null;
}

interface ActivityDay {
  date: string;
  assignments: number;
  submissions: number;
  aiCalls: number;
}

interface EditUserModalProps {
  user: User;
  isSuperAdmin: boolean;
}

export function EditUserModal({ user, isSuperAdmin }: EditUserModalProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [form, setForm] = useState({
    name: user.name || "",
    role: user.role,
    isActive: user.isActive ?? true,
    subscriptionPlan: user.subscriptionPlan || "FREE",
    subscriptionStatus: user.subscriptionStatus || "ACTIVE",
    disableReason: user.disableReason || "",
  });

  const aggregateActivity = useCallback((raw: {
    recentSubmissions: { submittedAt: string }[];
    recentAssignments: { createdAt: string }[];
    aiUsage: { date: string; callCount: number }[];
  }): ActivityDay[] => {
    const map = new Map<string, { assignments: number; submissions: number; aiCalls: number }>();

    // Last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      map.set(key, { assignments: 0, submissions: 0, aiCalls: 0 });
    }

    raw.recentSubmissions?.forEach((s) => {
      const key = s.submittedAt.split("T")[0];
      if (map.has(key)) {
        map.set(key, { ...map.get(key)!, submissions: map.get(key)!.submissions + 1 });
      }
    });

    raw.recentAssignments?.forEach((a) => {
      const key = a.createdAt.split("T")[0];
      if (map.has(key)) {
        map.set(key, { ...map.get(key)!, assignments: map.get(key)!.assignments + 1 });
      }
    });

    raw.aiUsage?.forEach((u) => {
      const key = u.date.split("T")[0];
      if (map.has(key)) {
        map.set(key, { ...map.get(key)!, aiCalls: map.get(key)!.aiCalls + (u.callCount || 0) });
      }
    });

    return Array.from(map.entries()).map(([date, vals]) => ({
      date: date.slice(5), // MM-DD
      ...vals,
    }));
  }, []);

  useEffect(() => {
    if (!open || !user.id) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoadingActivity(true);
      fetch(`/api/admin/users/${user.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && data.activity) {
            setActivity(aggregateActivity(data.activity));
          }
        })
        .catch(console.error)
        .finally(() => {
          if (!cancelled) setLoadingActivity(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, user.id, aggregateActivity]);

  const maxVal = Math.max(1, ...activity.map((d) => d.assignments + d.submissions + d.aiCalls));

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (!form.isActive && !body.disableReason) {
        body.disableReason = "Disabled by admin";
      }
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setOpen(false);
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update user");
      }
    } catch {
      alert("Error updating user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User — {user.email}</DialogTitle>
        </DialogHeader>

        {/* Audit trail */}
        {user.disabledAt && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            <p className="font-medium">Account disabled</p>
            <p className="text-xs mt-1">
              {user.disabledAt ? new Date(user.disabledAt).toLocaleString() : ""}
              {user.disableReason ? ` — ${user.disableReason}` : ""}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label>Role {isSuperAdmin ? "" : "(Super admin only)"}</Label>
            <select
              value={form.role}
              disabled={!isSuperAdmin}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="STUDENT">Student</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <select
              value={form.isActive ? "true" : "false"}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          {!form.isActive && (
            <div className="space-y-1">
              <Label>Disable Reason</Label>
              <Input
                value={form.disableReason}
                placeholder="Why is this user being disabled?"
                onChange={(e) => setForm({ ...form, disableReason: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>Plan</Label>
            <select
              value={form.subscriptionPlan}
              onChange={(e) => setForm({ ...form, subscriptionPlan: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="FREE">Free</option>
              <option value="PRO">Pro</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label>Subscription Status</Label>
            <select
              value={form.subscriptionStatus}
              onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        {/* Activity Timeline Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Last 30 Days Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                Loading activity...
              </div>
            ) : activity.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                No activity data
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Assignments</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Submissions</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> AI Calls</span>
                </div>
                <div className="flex items-end gap-1 h-32 overflow-x-auto">
                  {activity.map((day) => {
                    const total = day.assignments + day.submissions + day.aiCalls;
                    const h = total === 0 ? 4 : Math.max(4, (total / maxVal) * 100);
                    return (
                      <div key={day.date} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ width: 20 }}>
                        <div className="flex flex-col-reverse w-full rounded-sm overflow-hidden" style={{ height: `${h}%`, minHeight: 4 }}>
                          {day.aiCalls > 0 && (
                            <div className="w-full bg-purple-500" style={{ height: `${Math.max(1, (day.aiCalls / total) * 100)}%` }} />
                          )}
                          {day.submissions > 0 && (
                            <div className="w-full bg-green-500" style={{ height: `${Math.max(1, (day.submissions / total) * 100)}%` }} />
                          )}
                          {day.assignments > 0 && (
                            <div className="w-full bg-blue-500" style={{ height: `${Math.max(1, (day.assignments / total) * 100)}%` }} />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground rotate-0">{day.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
