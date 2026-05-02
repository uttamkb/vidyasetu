import Link from "next/link";
import { BookOpen, ClipboardList, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VidyaSetuLogo } from "@/components/ui/logo";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/10">
      {/* Header */}
      <header className="w-full border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="group-hover:scale-110 transition-transform">
              <VidyaSetuLogo className="h-10 w-10" />
            </div>
            <span className="font-heading font-black text-2xl tracking-tight">VidyaSetu</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-semibold hover:text-primary transition-colors">
              Login
            </Link>
            <Link href="/dashboard">
              <Button className="rounded-full px-6 shadow-premium hover:shadow-lg transition-all">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
          </div>
          
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Personal AI Tutor
            </div>
            <h1 className="text-5xl font-heading font-black tracking-tighter sm:text-7xl md:text-8xl mb-8 leading-[0.9]">
              Your Learning <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-600 to-indigo-600">
                Journey Starts Here
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed mb-12">
              VidyaSetu is your premium personal learning companion for CBSE Class 9. 
              Track assignments, study materials, and progress — all powered by AI.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/dashboard">
                <Button size="xl" className="rounded-full px-8 text-lg font-bold shadow-premium group">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="xl" className="rounded-full px-8 text-lg font-bold">
                  Student Login
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: ClipboardList, title: "Assignments", desc: "Weekly assignments with AI-powered feedback for MCQ and subjective questions." },
              { icon: BookOpen, title: "Study Materials", desc: "Access curated notes, videos, and PDFs perfectly aligned with the CBSE curriculum." },
              { icon: BarChart3, title: "Progress Insights", desc: "Deep analytics into your strengths and weaknesses to help you improve every day." }
            ].map((f, i) => (
              <div key={i} className="group relative rounded-3xl border bg-card p-8 shadow-sm hover:shadow-premium transition-all duration-500 hover:-translate-y-1">
                <div className="p-3 bg-primary/5 rounded-2xl w-fit mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-heading font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6 group">
            <VidyaSetuLogo className="h-6 w-6 group-hover:scale-110 transition-transform" />
            <span className="font-heading font-black text-lg">VidyaSetu</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 VidyaSetu. Built for the future of Indian education.
          </p>
        </div>
      </footer>
    </div>
  );
}
