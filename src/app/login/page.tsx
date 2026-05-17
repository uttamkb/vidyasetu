"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, GraduationCap } from "lucide-react";
import { forceLogout } from "@/lib/auth-actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? "Sign in failed. Please try again." : null
  );

  // Strategic Fix: Self-heal ghost sessions
  // If the database is wiped but the browser still has a JWT, NextAuth throws these errors.
  // We use a Server Action to force-clear cookies because client-side signOut() often fails with MissingCSRF.
  useEffect(() => {
    const errType = searchParams.get("error");
    const isGhostError = [
      "OAuthAccountNotLinked",
      "Configuration",
      "MissingCSRF",
      "AccessDenied"
    ].includes(errType || "");

    if (isGhostError) {
      console.warn(`[Login] Detected ${errType}. Triggering force logout...`);
      forceLogout();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">VidyaSetu</h1>
          <p className="text-muted-foreground mt-2">Your Personal AI Tutor for CBSE Mastery</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welcome Student!</CardTitle>
            <CardDescription>
              Sign in to access your assignments, study materials, and track your progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              onClick={async () => {
                console.log("Google Login clicked!");
                setIsLoading(true);
                try {
                  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
                  await signIn("google", { callbackUrl });
                } catch (err) {
                  console.error("Error during Google signIn:", err);
                  setError("Google sign in failed.");
                  setIsLoading(false);
                }
              }}
              className="w-full"
              size="lg"
              variant="outline"
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              </svg>
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2">
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span>Access weekly assignments, instant evaluation, and progress tracking with our free tier</span>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Built with ❤️ for CBSE Students
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="w-full max-w-md flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
