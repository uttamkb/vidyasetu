"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MathRenderer } from "@/components/math-renderer";
import { 
  BookOpen, 
  Sparkles, 
  Award, 
  AlertTriangle, 
  ChevronRight, 
  Flame, 
  Compass, 
  CheckCircle2, 
  XCircle,
  Lightbulb,
  Bookmark,
  Printer,
  Zap,
  Check
} from "lucide-react";
import { type ContentPack } from "@/services/content-curator";

interface PremiumNotesRendererProps {
  pack: ContentPack;
}

export function PremiumNotesRenderer({ pack }: PremiumNotesRendererProps) {
  const [activeSection, setActiveSection] = useState<string>("concepts");
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});

  const toggleReveal = (index: number) => {
    setRevealedAnswers(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSelectOption = (qIdx: number, opt: string) => {
    setSelectedOptions(prev => ({ ...prev, [qIdx]: opt }));
  };

  const sections = [
    { id: "concepts", label: "Concepts Overview", icon: BookOpen, color: "text-blue-500 bg-blue-50" },
    { id: "deep-dive", label: "Explanations", icon: Compass, color: "text-purple-500 bg-purple-50" },
    { id: "examples", label: "Board Examples", icon: Award, color: "text-amber-500 bg-amber-50" },
    { id: "mistakes", label: "Common Pitfalls", icon: AlertTriangle, color: "text-rose-500 bg-rose-50" },
    { id: "cheat-sheet", label: "Quick Formulas", icon: Flame, color: "text-orange-500 bg-orange-50" },
    { id: "practice", label: "Practice Sheets", icon: Sparkles, color: "text-violet-500 bg-violet-50" },
    { id: "did-you-know", label: "Did You Know?", icon: Zap, color: "text-emerald-500 bg-emerald-50" }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* ─────────────────────────────────────────────────────────────
          SECTION NAVIGATION SIDEBAR
          ───────────────────────────────────────────────────────────── */}
      <div className="lg:col-span-1 space-y-4 print:hidden">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mastery sections</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handlePrint}
            className="h-7 px-2 text-[10px] font-bold text-slate-500 hover:text-slate-800"
          >
            <Printer className="h-3 w-3 mr-1" /> Print Notes
          </Button>
        </div>
        <div className="flex flex-col gap-1 bg-slate-50/50 dark:bg-slate-900/30 border p-2 rounded-xl">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isActive 
                    ? "bg-white shadow-sm border border-slate-200/60 text-blue-600 font-bold" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                }`}
              >
                <div className={`p-1.5 rounded-md ${sec.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs">{sec.label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto text-blue-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CONTENT RENDER AREA
          ───────────────────────────────────────────────────────────── */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Concept Flow Section */}
        {activeSection === "concepts" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                Concepts Flow & Framework
              </h2>
              <p className="text-xs text-muted-foreground">
                High-level breakdown of the core curriculum units with strict NCERT boundary alignment.
              </p>
            </div>

            <div className="grid gap-5">
              {pack.coreConcepts.map((item, index) => (
                <Card key={index} className="overflow-hidden border border-slate-200/60 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-950 dark:to-slate-900/30">
                  <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                  <CardHeader className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-black shrink-0">
                        {index + 1}
                      </div>
                      <CardTitle className="text-sm font-heading font-black text-slate-800 dark:text-slate-100">
                        {item.concept}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0">
                    <MathRenderer content={item.explanation} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium" />
                  </CardContent>
                </Card>
              ))}
              {pack.coreConcepts.length === 0 && (
                <div className="p-10 text-center text-slate-500 text-xs italic">
                  No concept summary loaded for this topic.
                </div>
              )}
            </div>

            {/* Glossary (Terminology) */}
            {pack.terminology && pack.terminology.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">NCERT Official Definitions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pack.terminology.map((term, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg space-y-1">
                      <div className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <Bookmark className="h-3.5 w-3.5 text-blue-500" />
                        {term.term}
                      </div>
                      <MathRenderer content={term.definition} className="text-[11px] text-slate-600 dark:text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deep Dives Section */}
        {activeSection === "deep-dive" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="h-5 w-5 text-purple-500" />
                Conceptual Deep Dives
              </h2>
              <p className="text-xs text-muted-foreground">
                Detailed breakdowns complete with target page references to the official NCERT syllabus.
              </p>
            </div>

            <div className="space-y-5">
              {pack.explanations.map((item, index) => (
                <Card key={index} className="overflow-hidden border border-slate-200/60 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-950 dark:to-slate-900/30">
                  <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 flex flex-row items-center justify-between px-5 pt-4">
                    <CardTitle className="text-sm font-heading font-black text-slate-800 dark:text-slate-100">
                      {item.topic}
                    </CardTitle>
                    {item.ncertReference && (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 font-extrabold text-[10px] uppercase tracking-wider py-0.5 px-2">
                        {item.ncertReference}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="px-5 pt-4 pb-5">
                    <MathRenderer content={item.detail} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium space-y-2" />
                  </CardContent>
                </Card>
              ))}
              {pack.explanations.length === 0 && (
                <div className="p-10 text-center text-slate-500 text-xs italic">
                  No detailed explanations generated for this topic.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Board Worked Examples */}
        {activeSection === "examples" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Board Worked Examples
              </h2>
              <p className="text-xs text-muted-foreground">
                Step-by-step master solutions aligned with CBSE scoring rubrics and analytical curves.
              </p>
            </div>

            <div className="space-y-6">
              {pack.examples.map((item, index) => (
                <Card key={index} className="overflow-hidden border border-slate-200/60 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-950 dark:to-slate-900/30">
                  <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500" />
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 flex flex-row items-center justify-between px-5 pt-4">
                    <CardTitle className="text-sm font-heading font-black text-amber-800 dark:text-amber-400 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Example {index + 1}: {item.title}
                    </CardTitle>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-extrabold text-[10px] uppercase tracking-wider py-0.5 px-2">
                      Score Booster
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-2">
                      <div className="text-[10px] font-black uppercase text-amber-600 tracking-wider flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        The Problem
                      </div>
                      <div className="bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-800 dark:text-slate-200 font-medium shadow-inner leading-relaxed">
                        <MathRenderer content={item.problem} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Model Solution
                      </div>
                      <div className="relative pl-6 border-l-2 border-emerald-500/30 dark:border-emerald-500/20 py-1 space-y-4">
                        <div className="absolute top-1 -left-[5px] h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950" />
                        <div className="bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 dark:border-emerald-500/10 rounded-xl p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans shadow-sm">
                          <MathRenderer content={item.solution} className="space-y-2 font-medium" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pack.examples.length === 0 && (
                <div className="p-10 text-center text-slate-500 text-xs italic">
                  No examples loaded.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Common Pitfalls Section */}
        {activeSection === "mistakes" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                CBSE Marking Safeguards
              </h2>
              <p className="text-xs text-muted-foreground">
                Understand where board examiners typically deduct points and how to present answers correctly.
              </p>
            </div>

            <div className="grid gap-5">
              {pack.misconceptions.map((item, index) => (
                <Card key={index} className="overflow-hidden border border-slate-200/60 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-950 dark:to-slate-900/30">
                  <div className="h-1 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-100 dark:border-slate-800/60">
                      {/* Incorrect Block */}
                      <div className="p-5 bg-rose-50/20 dark:bg-rose-950/5 border-r border-slate-100 dark:border-slate-800/60 flex flex-col gap-2">
                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1.5 tracking-wider">
                          <XCircle className="h-4 w-4 shrink-0" /> Common Misconception
                        </span>
                        <div className="text-xs font-semibold text-rose-950 dark:text-rose-200 leading-relaxed">
                          <MathRenderer content={item.wrong} />
                        </div>
                      </div>
                      
                      {/* Correct Block */}
                      <div className="p-5 bg-emerald-50/20 dark:bg-emerald-950/5 flex flex-col gap-2">
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5 tracking-wider">
                          <CheckCircle2 className="h-4 w-4 shrink-0" /> Recommended Correction
                        </span>
                        <div className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 leading-relaxed">
                          <MathRenderer content={item.correct} />
                        </div>
                      </div>
                    </div>
                    {/* Why explanation card */}
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-2.5 px-5">
                      <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                        <span className="font-bold text-slate-800 dark:text-slate-200 not-italic mr-1.5">Underlying Concept:</span>
                        <MathRenderer content={item.why} className="inline" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pack.misconceptions.length === 0 && (
                <div className="p-10 text-center text-slate-500 text-xs italic">
                  Excellent! No pitfalls documented.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cheat Sheet (Quick Formulas & Mnemonics) */}
        {activeSection === "cheat-sheet" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
                Revision Cheat Sheet
              </h2>
              <p className="text-xs text-muted-foreground">
                Consolidated formulas, target terms, and memory shortcuts for last-minute recall.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Formula Panel */}
              {pack.revisionSheet.keyFormulas && pack.revisionSheet.keyFormulas.length > 0 && (
                <Card className="overflow-hidden border border-orange-200/60 dark:border-orange-900/30 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-gradient-to-br from-white to-orange-50/10 dark:from-slate-950 dark:to-orange-950/5">
                  <div className="h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
                  <CardHeader className="py-4 px-5 border-b border-orange-100/50 dark:border-orange-950/20">
                    <CardTitle className="text-xs font-black uppercase text-orange-800 dark:text-orange-400 tracking-widest flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      📐 Equations & Physical Laws
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3.5">
                    {pack.revisionSheet.keyFormulas.map((f, i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 border border-orange-100 dark:border-orange-900/40 rounded-xl p-4 text-xs font-mono font-medium shadow-sm hover:scale-[1.01] transition-transform">
                        <MathRenderer content={f} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Memory Shortcuts Mnemonics */}
              {pack.revisionSheet.mnemonics && pack.revisionSheet.mnemonics.length > 0 && (
                <Card className="overflow-hidden border border-indigo-200/60 dark:border-indigo-900/30 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-gradient-to-br from-white to-indigo-50/10 dark:from-slate-950 dark:to-indigo-950/5">
                  <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                  <CardHeader className="py-4 px-5 border-b border-indigo-100/50 dark:border-indigo-950/20">
                    <CardTitle className="text-xs font-black uppercase text-indigo-800 dark:text-indigo-400 tracking-widest flex items-center gap-2">
                      <Compass className="h-4 w-4 text-indigo-500" />
                      🧠 Mnemonics & Memory Hacks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3.5">
                    {pack.revisionSheet.mnemonics.map((m, i) => (
                      <div key={i} className="bg-indigo-50/30 dark:bg-slate-900 border border-indigo-100/60 dark:border-indigo-900/40 rounded-xl p-4 text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-semibold shadow-sm italic flex items-start gap-3 hover:scale-[1.01] transition-transform">
                        <Lightbulb className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                        <MathRenderer content={m} className="not-italic" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* In a nutshell summary takeaways */}
            {pack.keyTakeaways && pack.keyTakeaways.length > 0 && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="py-3 bg-slate-50 border-b">
                  <CardTitle className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    🚀 Key Takeaways Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  {pack.keyTakeaways.map((takeaway, index) => (
                    <div key={index} className="flex gap-2.5 items-start text-xs text-slate-700">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <MathRenderer content={takeaway} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Practice Questions Section */}
        {activeSection === "practice" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                Adaptive Practice Sheets
              </h2>
              <p className="text-xs text-muted-foreground">
                Self-evaluation questions with interactive option selection, answer validation, and score calculation.
              </p>
            </div>

            {/* Assessment Performance Scoreboard Panel */}
            {pack.selfAssessmentQuestions && pack.selfAssessmentQuestions.length > 0 && (
              <Card className="overflow-hidden border border-violet-200/60 dark:border-violet-900/30 shadow-sm rounded-xl bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-transparent">
                <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-5">
                  <div className="space-y-1.5 text-center md:text-left">
                    <div className="text-xs font-black uppercase text-violet-800 dark:text-violet-400 tracking-wider">
                      Practice Progress Dashboard
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {Object.keys(selectedOptions).length} <span className="text-xs text-slate-400 font-medium">of {pack.selfAssessmentQuestions.length} Answered</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 justify-center md:justify-start">
                      <Check className="h-3.5 w-3.5 text-emerald-500" /> Correct Answers: {
                        pack.selfAssessmentQuestions.reduce((acc, qItem, index) => {
                          const selected = selectedOptions[index];
                          return selected && selected === qItem.answer ? acc + 1 : acc;
                        }, 0)
                      }
                    </div>
                  </div>
                  <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
                    <svg className="absolute h-20 w-20 transform -rotate-90">
                      <circle cx="40" cy="40" r="34" className="stroke-slate-200 dark:stroke-slate-800 fill-none" strokeWidth="6" />
                      <circle cx="40" cy="40" r="34" className="stroke-violet-500 fill-none transition-all duration-500" strokeWidth="6"
                        strokeDasharray={2 * Math.PI * 34}
                        strokeDashoffset={2 * Math.PI * 34 * (1 - (pack.selfAssessmentQuestions.length > 0 ? Object.keys(selectedOptions).length / pack.selfAssessmentQuestions.length : 0))}
                      />
                    </svg>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {Math.round(pack.selfAssessmentQuestions.length > 0 ? (Object.keys(selectedOptions).length / pack.selfAssessmentQuestions.length) * 100 : 0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-5">
              {pack.selfAssessmentQuestions.map((qItem, index) => {
                const isRevealed = !!revealedAnswers[index];
                const selectedOpt = selectedOptions[index];
                const getDiffColor = (diff: string) => {
                  if (diff === "easy") return "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
                  if (diff === "medium") return "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
                  return "bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30";
                };

                return (
                  <Card key={index} className="overflow-hidden border border-slate-200/60 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-950 dark:to-slate-900/30">
                    <div className="h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500" />
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 flex flex-row items-center justify-between px-5 pt-4">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-xs text-slate-400">Q{index + 1}.</span>
                        <Badge className={`${getDiffColor(qItem.difficulty)} border font-extrabold text-[10px] uppercase tracking-wider px-2`}>
                          {qItem.difficulty}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider py-0.5 px-2">
                        {qItem.type}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                        <MathRenderer content={qItem.question} />
                      </div>

                      {/* Options for MCQ */}
                      {qItem.type === "MCQ" && qItem.options && qItem.options.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {qItem.options.map((opt, oIdx) => {
                            const isSelected = selectedOpt === opt;
                            const isCorrectAnswer = opt === qItem.answer;
                            
                            let optStyle = "border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/20";
                            if (isSelected) {
                              if (isRevealed) {
                                optStyle = isCorrectAnswer 
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold ring-2 ring-emerald-500/20"
                                  : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400 font-bold ring-2 ring-rose-500/20";
                              } else {
                                optStyle = "bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-400 font-bold ring-2 ring-violet-500/20";
                              }
                            } else if (isRevealed && isCorrectAnswer) {
                              optStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold";
                            }

                            return (
                              <button 
                                key={oIdx} 
                                onClick={() => handleSelectOption(index, opt)}
                                className={`border rounded-xl p-3 flex gap-2.5 items-center text-left hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-all ${optStyle}`}
                              >
                                <span className="font-black text-slate-400 shrink-0">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                <span className="font-medium">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Tap to Reveal Answer */}
                      <div className="pt-2 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleReveal(index)}
                            className="h-8 font-black text-[10px] text-blue-600 dark:text-blue-400 border-dashed border-blue-200 dark:border-blue-900/50 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 uppercase tracking-wider"
                          >
                            {isRevealed ? "Hide Model Answer" : "Tap to Reveal Answer"}
                          </Button>
                        </div>
                        
                        {isRevealed && (
                          <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl space-y-1.5 shadow-sm">
                            <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest flex items-center gap-1">
                              <Check className="h-3 w-3" /> Correct Model Answer
                            </span>
                            <div className="text-xs text-emerald-950 dark:text-emerald-200 font-semibold leading-relaxed">
                              <MathRenderer content={qItem.answer} />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {pack.selfAssessmentQuestions.length === 0 && (
                <div className="p-10 text-center text-slate-500 text-xs italic bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed">
                  No practice sheet compiled.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Did You Know? Section */}
        {activeSection === "did-you-know" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-500 animate-pulse" />
                Did You Know? Real-world Gems
              </h2>
              <p className="text-xs text-muted-foreground">
                Fascinating real-world connections, historical context, and science/math curiosities.
              </p>
            </div>

            <div className="grid gap-4 grid-cols-1">
              {pack.keyTakeaways && pack.keyTakeaways.map((takeaway, index) => (
                <Card key={index} className="overflow-hidden border border-emerald-200/60 dark:border-emerald-900/30 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-gradient-to-br from-white to-emerald-50/10 dark:from-slate-950 dark:to-emerald-950/5">
                  <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 shrink-0 mt-0.5 shadow-sm">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Fact #{index + 1}</span>
                      <MathRenderer content={takeaway} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!pack.keyTakeaways || pack.keyTakeaways.length === 0) && (
                <div className="p-10 text-center text-slate-500 text-xs italic bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed">
                  No curiosities loaded for this topic yet.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
