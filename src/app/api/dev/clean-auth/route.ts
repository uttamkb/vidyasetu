/**
 * /api/dev/clean-auth — Development-only route to wipe auth tables.
 * Protected: only works when NODE_ENV === "development".
 * Usage: visit http://localhost:3000/api/dev/clean-auth in your browser.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "accounts", "sessions", "users" CASCADE`
    );

    const response = NextResponse.json({
      success: true,
      message: "All users, accounts, and sessions have been removed. You can now sign in fresh.",
    });

    // Clear the auth cookies to prevent ghost session crashes (OAuthAccountNotLinked / Configuration 500)
    response.cookies.delete("authjs.session-token");
    response.cookies.delete("__Secure-authjs.session-token");
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");

    return response;
  } catch (error) {
    console.error("[clean-auth] Failed:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
