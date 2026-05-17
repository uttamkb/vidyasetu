import { auth } from "@/lib/auth";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { forceLogout } from "@/lib/auth-actions";
import Link from "next/link";
import { Suspense } from "react";
import {
  BookOpen,
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileText,
  LogOut,
  Sparkles,
  Activity,
  ToggleLeft,
  Undo2,
  School,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VidyaSetuLogo } from "@/components/ui/logo";

const navItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard, color: "text-blue-500", superAdminOnly: false },
  { title: "Schools", href: "/admin/schools", icon: School, color: "text-amber-600", superAdminOnly: false },
  { title: "Users", href: "/admin/users", icon: Users, color: "text-purple-500", superAdminOnly: false },
  { title: "System Health", href: "/admin/system", icon: Activity, color: "text-rose-500", superAdminOnly: false },
  { title: "Feature Gates", href: "/admin/gates", icon: ToggleLeft, superAdminOnly: true, color: "text-amber-500" },
  { title: "Seeder", href: "/admin/seeder", icon: Sparkles, color: "text-emerald-500", superAdminOnly: false },
  { title: "Curriculum", href: "/admin/curriculum", icon: BookOpen, color: "text-indigo-500", superAdminOnly: false },
  { title: "Content", href: "/admin/content", icon: FileText, color: "text-sky-500", superAdminOnly: false },
  { title: "Question Bank", href: "/admin/question-bank", icon: Layers, color: "text-violet-500", superAdminOnly: false },
] as const;

async function AdminShell({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await auth();

  // Redundant check in case middleware misses it — allow both ADMIN and SUPER_ADMIN
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 w-64 border-r bg-background flex flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-6 group">
          <VidyaSetuLogo className="h-6 w-6 group-hover:scale-110 transition-transform" />
          <span className="font-heading font-black text-lg tracking-tight">VidyaSetu Admin</span>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-4 text-sm font-medium">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              // Hide superAdminOnly items from regular admins
              if (item.superAdminOnly && role !== "SUPER_ADMIN") return null;
              return (
                <Link
                  key={index}
                  href={item.href as any}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground font-semibold transition-all hover:text-foreground hover:bg-muted"
                >
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t p-4 pb-32 space-y-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Link href="/dashboard">
            <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground border-dashed">
              <Undo2 className="h-4 w-4" />
              Exit Admin
            </Button>
          </Link>
          <form action={forceLogout} className="w-full">
            <Button type="submit" variant="ghost" className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Admin Panel...</div>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
