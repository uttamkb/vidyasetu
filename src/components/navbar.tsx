"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  GraduationCap,
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  BarChart3,
  Trophy,
  User,
  LogOut,
  Menu,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { VidyaSetuLogo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-500", glow: "group-hover:text-blue-400" },
  { href: "/assignments", label: "Assignments", icon: ClipboardList, color: "text-orange-500", glow: "group-hover:text-orange-400" },
  { href: "/study-materials", label: "Study Materials", icon: BookOpen, color: "text-emerald-500", glow: "group-hover:text-emerald-400" },
  { href: "/progress", label: "Progress", icon: BarChart3, color: "text-purple-500", glow: "group-hover:text-purple-400" },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, color: "text-amber-500", glow: "group-hover:text-amber-400" },
  { href: "/playbook", label: "Playbook", icon: BookOpen, color: "text-rose-500", glow: "group-hover:text-rose-400" },
  { href: "/profile", label: "Profile", icon: User, color: "text-cyan-500", glow: "group-hover:text-cyan-400" },
];

interface NavbarUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function Navbar({ user: initialUser }: { user: NavbarUser }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const user = session?.user || initialUser;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200/50 dark:border-neutral-800/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 print:hidden">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center">
        <div className="mr-4 flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "mr-2 lg:hidden")}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="flex items-center gap-2 mb-6 group">
                <div className="group-hover:scale-110 transition-transform">
                  <VidyaSetuLogo className="h-8 w-8" />
                </div>
                <span className="font-heading font-black text-xl tracking-tight">VidyaSetu</span>
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 group ${
                        pathname === item.href
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold"
                          : "hover:bg-muted text-foreground font-semibold"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg transition-colors ${pathname === item.href ? "bg-white/20" : "bg-muted group-hover:bg-background"}`}>
                        <Icon className={`h-4 w-4 ${pathname === item.href ? "text-white" : item.color}`} />
                      </div>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>

          <Link href="/dashboard" className="flex items-center gap-2 mr-4 group">
            <div className="group-hover:scale-110 transition-transform">
              <VidyaSetuLogo className="h-8 w-8" />
            </div>
            <span className="hidden font-heading font-black text-xl tracking-tight lg:inline-block">VidyaSetu</span>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-300 group ${
                  pathname === item.href
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-bold scale-105"
                    : "text-foreground font-semibold hover:bg-muted hover:scale-102"
                }`}
              >
                <div className={`transition-all duration-300 ${pathname === item.href ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : `group-hover:scale-110 ${item.glow}`}`}>
                  <Icon className={`h-4.5 w-4.5 ${pathname === item.href ? "text-white" : item.color}`} />
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all p-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-xs shadow-inner">
                    {user?.name?.charAt(0) || "S"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-[10px]">
                    {user?.name?.charAt(0) || "S"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-heading font-black">{user?.name || "Student"}</p>
                  <p className="text-xs text-foreground/70 font-medium">{user?.email || ""}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/profile" className="cursor-pointer flex items-center w-full">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
