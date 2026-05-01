import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isOnboarded = req.auth?.user?.isOnboarded;

  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard") ||
                          nextUrl.pathname.startsWith("/assignments") ||
                          nextUrl.pathname.startsWith("/progress") ||
                          nextUrl.pathname.startsWith("/study-materials") ||
                          nextUrl.pathname.startsWith("/profile");

  const isOnboardingPage = nextUrl.pathname === "/onboarding";

  if (isLoggedIn && !isOnboarded && !isOnboardingPage && isDashboardRoute) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  if (isLoggedIn && isOnboarded && isOnboardingPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
