import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

/**
 * Server-side onboarding guard component.
 *
 * Reads `isOnboarded` from the DATABASE (not the JWT) to avoid stale token issues.
 * The Edge middleware JWT token can be stale because auth.edge.ts has no DB access.
 *
 * Uses the `x-pathname` header set by proxy.ts middleware to detect the current route:
 *   - On non-onboarding pages: if user is NOT onboarded → redirect to /onboarding
 *   - On the onboarding page: if user IS onboarded → redirect to /dashboard
 */
export async function OnboardingGuard({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isOnboarded: true },
  });

  const isOnboarded = dbUser?.isOnboarded ?? false;

  // Detect current pathname from the x-pathname header set by proxy.ts middleware
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isOnOnboardingPage = pathname.startsWith("/onboarding");

  if (!isOnboarded && !isOnOnboardingPage) {
    redirect("/onboarding");
  }

  if (isOnboarded && isOnOnboardingPage) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
