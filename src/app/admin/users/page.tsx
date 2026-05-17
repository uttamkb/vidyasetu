/**
 * Admin Users Page — Read-Only User Management
 *
 * Displays paginated, filterable list of all users.
 * Admin-only. No edit functionality yet (PI 4 will add writes).
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, Filter } from "lucide-react";
import Link from "next/link";
import { EditUserModal } from "./edit-user-modal";

interface UsersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    role?: string;
    isActive?: string;
    plan?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  await connection();
  const session = await auth();

  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }
  const isSuperAdmin = role === "SUPER_ADMIN";

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const limit = 20;
  const skip = (page - 1) * limit;
  const search = params.search?.toLowerCase().trim();
  const roleFilter = params.role;
  const isActiveFilter = params.isActive;
  const planFilter = params.plan;

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }
  if (roleFilter && ["STUDENT", "ADMIN", "SUPER_ADMIN"].includes(roleFilter)) {
    where.role = roleFilter;
  }
  if (isActiveFilter !== undefined) {
    where.isActive = isActiveFilter === "true";
  }
  if (planFilter && ["FREE", "PRO"].includes(planFilter)) {
    where.subscriptionPlan = planFilter;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        totalAssignmentsGenerated: true,
        totalSubmissions: true,
        totalAICalls: true,
        lastActiveAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Fetch AI costs for the current set of users
  const userIds = users.map(u => u.id);
  const costData = await prisma.userAIUsage.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds } },
    _sum: { actualCostUsd: true }
  });

  const costMap = new Map(costData.map(c => [c.userId, c._sum.actualCostUsd || 0]));

  const totalPages = Math.ceil(total / limit);

  const roleBadge = (role: string) => {
    const variants: Record<string, string> = {
      STUDENT: "bg-blue-100 text-blue-800",
      ADMIN: "bg-purple-100 text-purple-800",
      SUPER_ADMIN: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={variants[role] ?? "bg-gray-100 text-gray-800"}>
        {role.replace("_", " ")}
      </Badge>
    );
  };

  const statusBadge = (isActive: boolean) => (
    <Badge className={isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
      {isActive ? "Active" : "Disabled"}
    </Badge>
  );

  const planBadge = (plan: string | null, totalCost: number) => {
    const isPro = plan === "PRO";
    const monthlyRevenue = isPro ? 10 : 0; // Assume $10 for PRO
    const margin = monthlyRevenue - totalCost;
    
    return (
      <div className="flex flex-col gap-1">
        <Badge className={isPro ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-800"}>
          {plan ?? "FREE"}
        </Badge>
        <div className={`text-[10px] font-bold ${margin < 0 ? 'text-red-600' : 'text-green-600'}`}>
          {margin < 0 ? 'Loss' : 'Profit'}: ${Math.abs(margin).toFixed(2)}
        </div>
      </div>
    );
  };

  const buildQuery = (overrides: Record<string, string>) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (roleFilter) q.set("role", roleFilter);
    if (isActiveFilter !== undefined) q.set("isActive", isActiveFilter);
    if (planFilter) q.set("plan", planFilter);
    Object.entries(overrides).forEach(([k, v]) => q.set(k, v));
    return q.toString();
  };

  const totalSystemCost = await prisma.userAIUsage.aggregate({
    _sum: { actualCostUsd: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">
            {total.toLocaleString()} total users • Page {page} of {totalPages}
          </p>
        </div>
        <Card className="min-w-[200px] border-amber-300 bg-amber-100/50">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-xs font-bold text-amber-900 uppercase tracking-wider">Total AI Spend</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="text-2xl font-black text-amber-950">
              ${(totalSystemCost._sum.actualCostUsd || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-amber-900 font-bold">Accumulated platform cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-blue-500" />
                <Input
                  name="search"
                  placeholder="Search by email or name..."
                  defaultValue={search ?? ""}
                  className="pl-9"
                />
              </div>
            </div>
            <select name="role" defaultValue={roleFilter ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All Roles</option>
              <option value="STUDENT">Student</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <select name="isActive" defaultValue={isActiveFilter ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </select>
            <select name="plan" defaultValue={planFilter ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All Plans</option>
              <option value="FREE">Free</option>
              <option value="PRO">Pro</option>
            </select>
            <button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Filter
            </button>
            {(search || roleFilter || isActiveFilter || planFilter) && (
              <Link href="/admin/users" className="h-9 px-4 rounded-md border border-input text-sm font-medium hover:bg-muted flex items-center">
                Clear
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">User</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Plan</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Activity</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground whitespace-nowrap">AI Cost</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {users.map((user) => (
                  <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {user.name || "Unnamed"}
                        </span>
                        <EditUserModal
                          user={{
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role,
                            isActive: user.isActive,
                            subscriptionPlan: user.subscriptionPlan,
                            subscriptionStatus: user.subscriptionStatus,
                          }}
                          isSuperAdmin={isSuperAdmin}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </td>
                    <td className="p-4 align-middle">{roleBadge(user.role)}</td>
                    <td className="p-4 align-middle">{statusBadge(user.isActive ?? true)}</td>
                    <td className="p-4 align-middle">{planBadge(user.subscriptionPlan, costMap.get(user.id) || 0)}</td>
                    <td className="p-4 align-middle">
                      <div className="text-xs space-y-0.5">
                        <div>{user.totalAssignmentsGenerated} assignments</div>
                        <div>{user.totalSubmissions} submissions</div>
                        <div>{user.totalAICalls} AI calls</div>
                      </div>
                    </td>
                    <td className="p-4 align-middle text-right font-mono font-bold">
                      ${(costMap.get(user.id) || 0).toFixed(2)}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground text-xs">
                      {user.createdAt.toLocaleDateString()}
                      {user.lastActiveAt && (
                        <div className="text-green-600">Active {user.lastActiveAt.toLocaleDateString()}</div>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      No users found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/users?${buildQuery({ page: String(page - 1) })}`}
                className="px-3 py-1.5 rounded-md border border-input text-sm hover:bg-muted"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/users?${buildQuery({ page: String(page + 1) })}`}
                className="px-3 py-1.5 rounded-md border border-input text-sm hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
