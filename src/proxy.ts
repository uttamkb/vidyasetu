/**
 * middleware.ts — Route protection and onboarding guard
 *
 * Uses auth.edge.ts (Edge-safe, no Prisma) to validate JWT session.
 * Protected routes redirect to /login if unauthenticated.
 * Authenticated but un-onboarded users are redirected to /onboarding.
 */
import { auth } from "@/lib/auth.edge";
import { NextResponse } from "next/server";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/assignments",
  "/progress",
  "/study-materials",
  "/profile",
  "/onboarding",
  "/admin",
];

const ONBOARDING_ROUTE = "/onboarding";
const LOGIN_ROUTE = "/login";
const ADMIN_ROUTE_PREFIX = "/admin";

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isOnboarded = req.auth?.user?.isOnboarded ?? false;
  const role = req.auth?.user?.role ?? "STUDENT";

  const isProtected = PROTECTED_ROUTES.some((route) =>
    nextUrl.pathname.startsWith(route)
  );
  const isOnboardingPage = nextUrl.pathname.startsWith(ONBOARDING_ROUTE);
  const isAdminRoute = nextUrl.pathname.startsWith(ADMIN_ROUTE_PREFIX);
  const isDashboardRoute = isProtected && !isOnboardingPage && !isAdminRoute;

  // Not logged in → redirect to login
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL(LOGIN_ROUTE, nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in but not onboarded → redirect to onboarding (except if already there)
  // We exclude isAdminRoute from this check so admins don't get forced to onboard if they don't want to,
  // but typically we'll just check if it's a student route. Let's keep it simple:
  if (isLoggedIn && !isOnboarded && isDashboardRoute) {
    return NextResponse.redirect(new URL(ONBOARDING_ROUTE, nextUrl));
  }

  // Admin guard
  if (isLoggedIn && isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Logged in and onboarded → don't stay on onboarding page
  if (isLoggedIn && isOnboarded && isOnboardingPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  // Match all routes except static files and Next.js internals
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
