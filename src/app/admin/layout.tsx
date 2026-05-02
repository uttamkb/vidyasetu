import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  LayoutDashboard,
  Users,
  Settings,
  ShieldCheck,
  FileText,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VidyaSetuLogo } from "@/components/ui/logo";

const navItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Seeder", href: "/admin/seeder", icon: Sparkles },
  { title: "Curriculum", href: "/admin/curriculum", icon: BookOpen },
  { title: "Content", href: "/admin/content", icon: FileText },
  { title: "Students", href: "/admin/students", icon: Users },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Redundant check in case middleware misses it
  if (session?.user?.role !== "ADMIN") {
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
              return (
                <Link
                  key={index}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t p-4">
          <Link href="/dashboard">
            <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Exit Admin
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
