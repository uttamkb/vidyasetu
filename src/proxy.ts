/**
 * proxy.ts — Route protection, auth guard, and AI rate limiting
 *
 * Uses auth.edge.ts (Edge-safe, no Prisma) to validate JWT session.
 * Protected routes redirect to /login if unauthenticated.
 * Onboarding guard is handled by the (dashboard) layout server component,
 * which reads isOnboarded from the DATABASE (not the stale JWT).
 */
import { auth } from "@/lib/auth.edge";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/assignments",
  "/progress",
  "/study-materials",
  "/profile",
  "/onboarding",
  "/admin",
];

const AI_ROUTES = [
  "/api/assignments/generate",
  "/api/submissions", // Evaluation hits AI
  "/api/study-materials", // Curation hits AI
];

const ONBOARDING_ROUTE = "/onboarding";
const LOGIN_ROUTE = "/login";
const ADMIN_ROUTE_PREFIX = "/admin";

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role ?? "STUDENT";
  const userId = req.auth?.user?.id;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    nextUrl.pathname.startsWith(route)
  );
  const isAiRoute = AI_ROUTES.some((route) => 
    nextUrl.pathname.startsWith(route)
  );
  
  const isOnboardingPage = nextUrl.pathname.startsWith(ONBOARDING_ROUTE);
  const isAdminRoute = nextUrl.pathname.startsWith(ADMIN_ROUTE_PREFIX);

  // AI Rate Limiting logic (must happen for API POST requests)
  if (isAiRoute && req.method === "POST") {
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = checkRateLimit(userId);

    if (!rateLimit.allowed) {
      console.warn(`[middleware] Rate limit exceeded for user: ${userId}`);
      return NextResponse.json(
        { 
          error: "Too many AI requests. Please wait a minute before trying again.",
          retryAfter: Math.ceil(rateLimit.resetInMs / 1000)
        }, 
        { 
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetInMs / 1000).toString(),
            "X-RateLimit-Limit": "30",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          }
        }
      );
    }
    
    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", "30");
    response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
    return response;
  }

  // Not logged in → redirect to login
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL(LOGIN_ROUTE, nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin guard
  if (isLoggedIn && isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Set x-pathname header so server components can detect the current route.
  // This is necessary because layouts don't receive pathname props in App Router.
  const response = NextResponse.next();
  response.headers.set("x-pathname", nextUrl.pathname);
  return response;
});

export default proxy;

export const config = {
  // Match all routes except:
  //  - /api/auth/* (OAuth callbacks must not be intercepted by Edge auth)
  //  - /api/inngest (Inngest dev server discovery probes)
  //  - /api/health (health check endpoint)
  //  - /api/onboarding (must not be intercepted so auth session cookies flow correctly)
  //  - Next.js internals and static assets
  // AI routes (/api/assignments/generate, /api/submissions, /api/study-materials)
  // are intentionally NOT excluded so the rate limiter can protect them.
  matcher: ["/((?!api/auth|api/inngest|api/health|api/onboarding|_next/static|_next/image|favicon.ico).*)"],
};
