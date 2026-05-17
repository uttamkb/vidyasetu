import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Crown } from "lucide-react";

export default async function AdminManagementPage() {
  const session = await auth();
  const role = session?.user?.role;

  // Only SUPER_ADMIN can access
  if (role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      disabledAt: true,
      disableReason: true,
      createdAt: true,
      totalAssignmentsGenerated: true,
      totalSubmissions: true,
      totalAICalls: true,
      lastActiveAt: true,
    },
  });

  const superAdminCount = admins.filter((a) => a.role === "SUPER_ADMIN").length;
  const adminCount = admins.filter((a) => a.role === "ADMIN").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-red-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Management</h1>
          <p className="text-muted-foreground mt-1">
            SUPER_ADMIN only. View and manage admin accounts.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{superAdminCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Regular Admins</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Activity</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">
                      {admin.name || "—"}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {admin.email}
                    </td>
                    <td className="p-4 align-middle">
                      <Badge
                        variant={admin.role === "SUPER_ADMIN" ? "default" : "secondary"}
                        className={admin.role === "SUPER_ADMIN" ? "bg-amber-500 hover:bg-amber-600" : ""}
                      >
                        {admin.role}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle">
                      <Badge variant={admin.isActive ? "default" : "destructive"}>
                        {admin.isActive ? "Active" : "Disabled"}
                      </Badge>
                      {admin.disabledAt && (
                        <p className="text-xs text-red-600 mt-1">
                          {new Date(admin.disabledAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground text-xs">
                      <div>Assignments: {admin.totalAssignmentsGenerated}</div>
                      <div>Submissions: {admin.totalSubmissions}</div>
                      <div>AI Calls: {admin.totalAICalls}</div>
                      {admin.lastActiveAt && (
                        <div className="mt-1 text-amber-600">
                          Last active: {new Date(admin.lastActiveAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground text-xs">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      No admin accounts found.
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
