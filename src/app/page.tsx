import Link from "next/link";
import { GraduationCap, BookOpen, ClipboardList, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">VidyaSetu</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:underline">
              Login
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Your Learning Journey Starts Here
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              VidyaSetu is your personal learning companion for Class 9 & 10. Track assignments, study materials, and progress — all in one place.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                href="/dashboard"
                className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/login"
                className="rounded-full border px-6 py-3 text-sm font-medium hover:bg-muted"
              >
                Login
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container pb-24">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border bg-card p-6">
              <ClipboardList className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold">Assignments</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Weekly assignments with MCQs, short answers, and long answers to test your knowledge.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <BookOpen className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold">Study Materials</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Access curated notes, videos, PDFs, and practice materials for every subject.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <BarChart3 className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold">Progress Tracking</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Visualize your performance with analytics, streaks, and subject-wise insights.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} VidyaSetu. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
