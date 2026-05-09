import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

/**
 * Server-side onboarding guard.
 * 
 * Call this at the top of any server component page that requires the user
 * to have completed onboarding. Reads directly from the database — not the
 * JWT token — to avoid stale session issues.
 *
 * Usage:
 *   import { requireOnboarded } from "@/lib/require-onboarded";
 *   export default async function MyPage() {
 *     await requireOnboarded();
 *     // ... rest of page
 *   }
 */
export async function requireOnboarded(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isOnboarded: true },
  });

  if (!dbUser?.isOnboarded) {
    redirect("/onboarding");
  }
}
