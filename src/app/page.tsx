"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Target, 
  Brain, 
  CheckCircle2,
  Sparkles,
  Zap,
  Star,
  Users,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VidyaSetuLogo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const SLIDES = [
  { id: "hero", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "pricing", label: "Pricing" },
  { id: "cta", label: "Get Started" }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(timer);
  }, [currentSlide]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 selection:bg-blue-100 font-sans text-slate-900 overflow-hidden">
      {/* Navigation */}
      <header className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setCurrentSlide(0)}>
            <VidyaSetuLogo className="h-9 w-9 text-[#1A56DB]" />
            <span className="font-heading font-black text-2xl tracking-tighter text-[#1A56DB]">VidyaSetu</span>
          </div>
          <nav className="hidden md:flex items-center gap-10">
            {SLIDES.slice(1, 3).map((slide, idx) => (
              <button 
                key={slide.id}
                onClick={() => setCurrentSlide(idx + 1)}
                className={cn(
                  "text-sm font-bold transition-colors",
                  currentSlide === idx + 1 ? "text-[#1A56DB]" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {slide.label}
              </button>
            ))}
            <Link href="/login" className="text-sm font-bold text-slate-500 hover:text-slate-900">Login</Link>
            <Link href="/dashboard">
              <Button variant="outline" className="rounded-full px-6 border-[#1A56DB] text-[#1A56DB] hover:bg-blue-50 font-bold">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Carousel Container */}
      <main className="flex-1 relative">
        <div 
          className="h-full flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {/* SLIDE 0: Hero */}
          <div className="w-full h-full flex-shrink-0">
            <section className="h-full flex items-center bg-white px-6">
              <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-[#1A56DB] text-xs font-black uppercase tracking-widest border border-blue-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI-Powered Exam Mastery
                  </div>
                  <h1 className="text-[3rem] font-[800] font-sans tracking-tight leading-[1.2] text-slate-900">
                    Score Better in <br />
                    Your Boards with <br />
                    <span className="text-[#1A56DB]">Precision AI.</span>
                  </h1>
                  <p className="text-[0.95rem] leading-[1.6] text-slate-600 max-w-lg">
                    VidyaSetu evaluates your handwritten answers just like a senior CBSE examiner. Get step-wise marking and feedback that bridges your learning gaps.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button 
                      size="xl" 
                      onClick={nextSlide}
                      className="rounded-xl px-10 text-lg font-bold bg-[#F97316] hover:bg-[#EA580C] text-white shadow-lg shadow-orange-200 group hover:-translate-y-[1px] transition-all duration-200 ease-out"
                    >
                      Explore Features
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Link href="/login">
                      <Button variant="ghost" size="xl" className="rounded-xl px-8 text-lg font-bold text-slate-600 hover:bg-slate-100 border border-slate-200">
                        Student Login
                      </Button>
                    </Link>
                  </div>
                  {/* Trust Signals Mini */}
                  <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#1A56DB]" />
                      <span className="text-sm font-bold">10k+ Students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-bold">CBSE 2026 Aligned</span>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-600/5 blur-[100px] rounded-full -z-10" />
                  <DashboardMockup />
                </div>
              </div>
            </section>
          </div>

          {/* SLIDE 1: Features */}
          <div className="w-full h-full flex-shrink-0">
            <section className="h-full flex items-center bg-slate-50 px-6">
              <div className="max-w-7xl mx-auto w-full">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                  <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tight text-slate-900">
                    Engineered for <span className="text-[#1A56DB]">Academic Excellence.</span>
                  </h2>
                  <p className="text-lg text-slate-600">
                    We combine cognitive science with powerful AI to transform how you prepare for exams.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { icon: Target, title: "Precision Audit", color: "text-rose-600", bg: "bg-rose-600/10", how: "Board trend analysis." },
                    { icon: CheckCircle2, title: "Step-Wise Marking", color: "text-[#1A56DB]", bg: "bg-[#1A56DB]/10", how: "CBSE examiner rubrics." },
                    { icon: Brain, title: "HOTS Coaching", color: "text-purple-600", bg: "bg-purple-600/10", how: "Logic-based frameworks." },
                    { icon: Sparkles, title: "Growth Feedback", color: "text-emerald-600", bg: "bg-emerald-600/10", how: "Roadmap to 100% scores." }
                  ].map((feature, i) => (
                    <div key={i} className="group p-7 rounded-2xl bg-white border border-[rgba(226,232,240,0.8)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", feature.bg)}>
                        <feature.icon className={cn("h-7 w-7", feature.color)} />
                      </div>
                      <h3 className="text-[1.25rem] font-sans font-[700] mb-3 text-slate-900">{feature.title}</h3>
                      <p className="text-[0.95rem] leading-[1.6] text-slate-600 mb-6">Expert guidance to bridge your specific learning gaps.</p>
                      <p className="text-[10px] font-black uppercase text-[#1A56DB]">{feature.how}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-16 text-center">
                   <Button variant="outline" size="lg" onClick={nextSlide} className="rounded-full gap-2">
                     See Pricing <ChevronRightIcon className="h-4 w-4" />
                   </Button>
                </div>
              </div>
            </section>
          </div>

          {/* SLIDE 2: Pricing */}
          <div className="w-full h-full flex-shrink-0">
            <section className="h-full flex items-center bg-white px-6">
              <div className="max-w-7xl mx-auto w-full">
                <div className="text-center mb-16 space-y-4">
                  <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tight text-slate-900">Simple, Honest Pricing</h2>
                  <p className="text-lg text-slate-600">Choose the plan that fits your ambition.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  <PricingCard 
                    tier="Free Starter" 
                    price="₹0" 
                    items={["3 AI Assignments / day", "10 AI Evaluations / day", "Basic Performance Tips"]}
                  />
                  <PricingCard 
                    tier="Elite" 
                    price="₹499" 
                    featured 
                    items={["50 AI Assignments / day", "100 AI Evaluations / day", "Detailed Step-Wise Marking", "School-Level Ranking"]}
                  />
                  <PricingCard 
                    tier="School Partner" 
                    price="Custom" 
                    items={["Admin Dashboard", "Bulk Student Onboarding", "Institutional Analytics"]}
                    ctaText="Contact Sales"
                  />
                </div>
                <div className="mt-12 text-center">
                   <Button variant="ghost" size="lg" onClick={nextSlide} className="rounded-full gap-2">
                     Get Started <ArrowRight className="h-4 w-4" />
                   </Button>
                </div>
              </div>
            </section>
          </div>

          {/* SLIDE 3: CTA */}
          <div className="w-full h-full flex-shrink-0">
            <section className="h-full flex items-center bg-[#1A56DB] px-6 text-white text-center">
              <div className="max-w-4xl mx-auto w-full space-y-12">
                <h2 className="text-[3rem] font-[800] leading-[1.2] tracking-tight text-[#FFFFFF]">Ready to score <br /> your best ever?</h2>
                <p className="text-[0.95rem] leading-[1.6] text-[#E0E7FF] max-w-2xl mx-auto">Join thousands of students who are already using VidyaSetu to bridge their learning gaps with AI.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <Link href="/dashboard">
                    <Button size="xl" className="rounded-xl px-12 h-16 text-xl font-bold bg-[#F97316] hover:bg-[#EA580C] text-white shadow-2xl hover:-translate-y-[1px] transition-all duration-200 ease-out">
                      Get Started for Free
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="xl" 
                    onClick={() => setCurrentSlide(0)}
                    className="rounded-xl px-12 h-16 text-xl font-bold border-white/20 text-white hover:bg-white/10"
                  >
                    Back to Top
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Carousel Controls */}
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          {currentSlide > 0 && (
            <button 
              onClick={prevSlide}
              className="h-12 w-12 rounded-full bg-white/80 backdrop-blur shadow-lg border border-slate-200 flex items-center justify-center hover:bg-white transition-colors pointer-events-auto"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
        </div>
        <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
          {currentSlide < SLIDES.length - 1 && (
            <button 
              onClick={nextSlide}
              className="h-12 w-12 rounded-full bg-[#1A56DB] text-white shadow-lg flex items-center justify-center hover:bg-[#1545B0] transition-colors pointer-events-auto"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                currentSlide === i ? "w-8 bg-[#1A56DB]" : "w-2 bg-slate-200 hover:bg-slate-300"
              )}
            />
          ))}
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="h-16 bg-white border-t border-slate-200 flex-shrink-0 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-widest">
          <p>© 2026 VidyaSetu Systems</p>
          <div className="flex gap-8">
            <Link href="#" className="hover:text-slate-900">Privacy</Link>
            <Link href="#" className="hover:text-slate-900">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({ tier, price, items, featured = false, ctaText }: { tier: string, price: string, items: string[], featured?: boolean, ctaText?: string }) {
  return (
    <div className={cn(
      "p-7 rounded-[2rem] bg-white flex flex-col justify-between",
      featured ? "border-[2px] border-[#1E40AF] shadow-xl scale-105 z-10" : "border border-[rgba(226,232,240,0.8)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]"
    )}>
      <div>
        <div className={cn(
          "inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md mb-6",
          featured ? "bg-blue-100 text-[#1A56DB]" : "bg-slate-100 text-slate-600"
        )}>{tier}</div>
        <div className="text-4xl font-black text-slate-900 mb-8">{price} <span className="text-lg text-slate-400 font-normal">/mo</span></div>
        <ul className="space-y-3 mb-8">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs font-bold text-slate-600">
              <CheckCircle2 className={cn("h-4 w-4 mt-0.5", featured ? "text-[#1A56DB]" : "text-slate-300")} />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <Link href="/login" className="w-full">
        <Button className={cn(
          "w-full rounded-xl h-12 font-bold transition-colors",
          featured ? "bg-[#1A56DB] hover:bg-[#1545B0] text-white" : "bg-transparent border border-[rgba(226,232,240,0.8)] hover:bg-slate-50 text-slate-600 shadow-sm"
        )}>
          {ctaText || (featured ? "Go Pro" : "Get Started")}
        </Button>
      </Link>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="rounded-3xl border border-slate-200 shadow-2xl overflow-hidden bg-white aspect-[4/3] flex flex-col font-sans text-slate-900">
      {/* Header */}
      <div className="h-10 bg-slate-900 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">VidyaSetu Student Portal</div>
        <div className="h-6 w-6 rounded-full bg-slate-700" />
      </div>
      
      {/* App Content */}
      <div className="flex-1 p-6 grid grid-cols-12 gap-6 bg-slate-50/50">
        <div className="col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="text-xs font-black text-slate-900">Physics: Laws of Motion</div>
            <div className="h-6 w-16 bg-blue-50 text-blue-600 rounded text-[10px] font-black flex items-center justify-center">
              BOARD READY
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <p className="text-[10px] leading-relaxed text-slate-600 italic">
              Student Answer: The force applied to an object is equal to the mass of the object multiplied by its acceleration (F = ma)...
            </p>
            <div className="h-2 w-full bg-slate-100 rounded-full" />
            <div className="h-2 w-3/4 bg-slate-100 rounded-full" />
            <div className="h-2 w-1/2 bg-slate-100 rounded-full" />
          </div>
          <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
            <div className="text-[9px] font-bold text-slate-400">Submission ID: VS-2024-05</div>
            <div className="text-[9px] font-black text-[#1A56DB]">VIEW FULL SCAN</div>
          </div>
        </div>
        <div className="col-span-5 space-y-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">AI Score Card</div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-[#1A56DB] flex items-center justify-center text-sm font-black text-[#1A56DB]">8/10</div>
              <div className="space-y-1">
                <div className="h-1.5 w-12 bg-slate-100 rounded-full" />
                <div className="h-1.5 w-8 bg-slate-100 rounded-full" />
              </div>
            </div>
          </div>
          <div className="p-5 bg-[#1A56DB] rounded-2xl shadow-lg text-white">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span className="text-[10px] font-black tracking-widest uppercase">Board-Level Tip</span>
            </div>
            <p className="text-[10px] leading-relaxed font-bold opacity-90">
              Your derivation is perfect, but ensure you mention the units (Newtons) in the final step to secure 10/10 marks.
            </p>
            <div className="mt-4 h-1 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full w-4/5 bg-amber-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
