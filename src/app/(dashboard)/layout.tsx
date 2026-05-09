import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { connection } from "next/server";
import { Suspense } from "react";
import { OnboardingGuard } from "@/components/onboarding-guard";

async function DashboardShell({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar user={session.user} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OnboardingGuard userId={session.user.id}>
          {children}
        </OnboardingGuard>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading dashboard...</div>}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}

