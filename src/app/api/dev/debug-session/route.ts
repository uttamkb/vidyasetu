/**
 * /api/dev/debug-session — Diagnostic route to see current session and user state.
 * Protected: only works when NODE_ENV === "development".
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await auth();
  const headersList = await headers();
  const xPathname = headersList.get("x-pathname");

  let dbUser = null;
  if (session?.user?.id) {
    dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    session: {
      isLoggedIn: !!session,
      user: session?.user || null,
    },
    headers: {
      "x-pathname": xPathname,
      host: headersList.get("host"),
      "user-agent": headersList.get("user-agent"),
    },
    dbUser: dbUser ? {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      isOnboarded: dbUser.isOnboarded,
      isActive: dbUser.isActive,
    } : null,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
    }
  });
}
