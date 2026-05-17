"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Target, 
  Sparkles, 
  Trophy, 
  Scan, 
  FileText, 
  Brain,
  Rocket,
  PenTool,
  UploadCloud,
  CheckCircle2,
  Map as MapIcon,
  ChevronRight
} from "lucide-react";

export default function PlaybookPage() {
  const [activeTab, setActiveTab] = useState("getting-started");

  const menuItems = [
    { id: "getting-started", label: "Getting Started", icon: Rocket },
    { id: "assignments", label: "Taking Assignments", icon: PenTool },
    { id: "submissions", label: "Submitting Work", icon: UploadCloud },
    { id: "learning-hub", label: "Learning Hub & AI", icon: Brain },
    { id: "progress", label: "Tracking Progress", icon: MapIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-12 border-b border-slate-200 pb-8">
        <Badge variant="outline" className="px-4 py-1 text-primary font-bold border-primary/20 bg-primary/5 mb-4">
          Student Manual
        </Badge>
        <h1 className="text-4xl font-heading font-black tracking-tight text-slate-900 mb-3">
          How to Use VidyaSetu
        </h1>
        <p className="text-lg text-slate-500 max-w-3xl">
          Everything you need to know to navigate your personalized learning journey, master subjects, and track your progress.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0 md:sticky md:top-24 space-y-1">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4 px-3">Contents</h3>
          <nav className="flex flex-col space-y-1">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? "bg-primary/10 text-primary font-bold" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-slate-400"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full min-h-[500px]">
          {activeTab === "getting-started" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-3xl font-heading font-black mb-2">Getting Started</h2>
                <p className="text-slate-500">Welcome to VidyaSetu! Here is how to kick off your learning journey.</p>
              </div>

              <div className="grid gap-6">
                <Card className="border-none shadow-sm bg-blue-50/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Target className="w-32 h-32" />
                  </div>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</div>
                      <CardTitle className="text-xl">Initial Diagnostic Test</CardTitle>
                    </div>
                    <CardDescription className="text-base text-slate-700">
                      When you first log in, you will be prompted to take a short diagnostic test. This helps the AI understand your current knowledge level across different subjects. It&apos;s not graded, so just do your best!
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border-none shadow-sm bg-purple-50/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <MapIcon className="w-32 h-32" />
                  </div>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</div>
                      <CardTitle className="text-xl">Explore Your Dashboard</CardTitle>
                    </div>
                    <CardDescription className="text-base text-slate-700">
                      Your dashboard is your home base. Here you will see your daily recommended tasks, pending assignments, and your current learning streak. Make it a habit to check your dashboard daily.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "assignments" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-3xl font-heading font-black mb-2">Taking Assignments</h2>
                <p className="text-slate-500">Practice makes perfect. Learn how to generate and take assignments.</p>
              </div>

              <div className="space-y-6">
                <Card className="shadow-sm border-slate-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Two Types of Assignments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border border-slate-100 bg-slate-50">
                        <h4 className="font-bold text-slate-900 mb-1">1. School Assignments</h4>
                        <p className="text-sm text-slate-600">These are officially assigned by your teachers based on your school&apos;s curriculum. They will appear automatically in your &quot;Pending&quot; queue.</p>
                      </div>
                      <div className="p-4 rounded-lg border border-slate-100 bg-slate-50">
                        <h4 className="font-bold text-slate-900 mb-1">2. Custom Practice</h4>
                        <p className="text-sm text-slate-600">You can generate your own practice sessions anytime! Go to the Curriculum page, select a topic, and click &quot;Generate Practice&quot;.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PenTool className="h-5 w-5 text-emerald-500" />
                      How to take a test online
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      <li className="flex gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <div>
                          <strong className="block text-slate-900">Start the Timer</strong>
                          <span className="text-sm text-slate-600">Click &quot;Start Assignment&quot;. If it has a time limit, the timer will begin immediately.</span>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <div>
                          <strong className="block text-slate-900">Answer Questions</strong>
                          <span className="text-sm text-slate-600">For MCQs, just click the option. For short/long answers, type your response into the text box provided.</span>
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "submissions" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-3xl font-heading font-black mb-2">Submitting Work</h2>
                <p className="text-slate-500">We support both fully digital and pen-and-paper workflows.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="shadow-sm border-slate-200 h-full">
                  <CardHeader>
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mb-3">
                      <UploadCloud className="h-5 w-5 text-indigo-500" />
                    </div>
                    <CardTitle>Digital Submission</CardTitle>
                    <CardDescription>Fastest way to get AI feedback.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600 space-y-3">
                    <p>Simply type your answers directly into the platform during the assignment.</p>
                    <p>When you reach the end, click <strong>&quot;Submit Assignment&quot;</strong>. Our AI Evaluation Engine will instantly grade your work, highlight mistakes, and provide model answers.</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 h-full">
                  <CardHeader>
                    <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center mb-3">
                      <Scan className="h-5 w-5 text-rose-500" />
                    </div>
                    <CardTitle>Offline Scan (Pen & Paper)</CardTitle>
                    <CardDescription>For traditional written practice.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600 space-y-3">
                    <ol className="list-decimal pl-4 space-y-2">
                      <li>Write your answers on physical paper.</li>
                      <li>In the assignment view, switch to the <strong>&quot;Upload Scan&quot;</strong> tab.</li>
                      <li>Take clear photos of your answer sheets.</li>
                      <li>Upload the images. Our AI will read your handwriting and evaluate your answers just like digital text!</li>
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "learning-hub" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-3xl font-heading font-black mb-2">Learning Hub & AI</h2>
                <p className="text-slate-500">Don&apos;t just test yourself—learn and understand deeply.</p>
              </div>

              <div className="space-y-6">
                <Card className="border-none bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-white p-3 rounded-xl shadow-sm">
                        <Brain className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Socratic AI Tutor</h3>
                        <p className="text-slate-700 text-sm leading-relaxed mb-4">
                          Got a tough question? The AI Tutor won&apos;t just hand you the answer. It uses a &quot;Socratic&quot; teaching method—asking you guiding questions, giving you small hints, and helping you arrive at the solution yourself. 
                        </p>
                        <ul className="text-sm text-slate-600 space-y-1 list-disc pl-4">
                          <li>Click the &quot;AI Tutor&quot; button on any study material or question.</li>
                          <li>Ask for a hint or explain what you don&apos;t understand.</li>
                          <li>Work through the logic step-by-step with the AI.</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="p-5 pb-2">
                      <BookOpen className="h-5 w-5 text-emerald-500 mb-2" />
                      <CardTitle className="text-lg">Smart Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 text-sm text-slate-600">
                      Access concise, AI-curated revision notes for every chapter. Perfect for quick reviews before a test. Look for the &quot;Study Materials&quot; section in any curriculum topic.
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="p-5 pb-2">
                      <Sparkles className="h-5 w-5 text-amber-500 mb-2" />
                      <CardTitle className="text-lg">Curated Videos</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 text-sm text-slate-600">
                      We automatically find the best educational YouTube videos (like Physics Wallah, Khan Academy) for specific topics so you don&apos;t have to search.
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === "progress" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-3xl font-heading font-black mb-2">Tracking Progress</h2>
                <p className="text-slate-500">Visualize your journey from a beginner to a master.</p>
              </div>

              <Card className="border-none shadow-sm bg-slate-50">
                <CardContent className="p-6 md:p-8 space-y-8">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-16 h-16 shrink-0 bg-white shadow-sm rounded-2xl flex items-center justify-center">
                      <MapIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">The Mastery Map</h3>
                      <p className="text-slate-600 text-sm leading-relaxed mb-4">
                        Instead of just showing grades, VidyaSetu breaks down every subject into micro-topics (like &quot;Rational Numbers&quot; or &quot;Newton&apos;s First Law&quot;). 
                        As you correctly answer questions in assignments, the AI updates your Mastery Map.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Badge variant="outline" className="bg-white border-rose-200 text-rose-700">0-30% (Needs Work)</Badge>
                        <Badge variant="outline" className="bg-white border-amber-200 text-amber-700">30-70% (Learning)</Badge>
                        <Badge variant="outline" className="bg-white border-emerald-200 text-emerald-700">70-100% (Mastered)</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200 w-full" />

                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-16 h-16 shrink-0 bg-white shadow-sm rounded-2xl flex items-center justify-center">
                      <Trophy className="h-8 w-8 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Leaderboard & Streaks</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Stay motivated by maintaining a daily learning streak! You can also check the Leaderboard to see how your XP compares to other students in your school or district. Every assignment submitted earns you XP.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="pt-6 flex justify-center">
                <a href="/dashboard">
                  <Button size="lg" className="rounded-full px-8 font-bold gap-2">
                    Start Learning <ChevronRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
