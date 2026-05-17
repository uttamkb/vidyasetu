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
  Printer
} from "lucide-react";
import { type ContentPack } from "@/services/content-curator";

interface PremiumNotesRendererProps {
  pack: ContentPack;
}

export function PremiumNotesRenderer({ pack }: PremiumNotesRendererProps) {
  const [activeSection, setActiveSection] = useState<string>("concepts");
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const toggleReveal = (index: number) => {
    setRevealedAnswers(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const sections = [
    { id: "concepts", label: "Concepts Overview", icon: BookOpen, color: "text-blue-500 bg-blue-50" },
    { id: "deep-dive", label: "Explanations", icon: Compass, color: "text-purple-500 bg-purple-50" },
    { id: "examples", label: "Board Examples", icon: Award, color: "text-amber-500 bg-amber-50" },
    { id: "mistakes", label: "Common Pitfalls", icon: AlertTriangle, color: "text-rose-500 bg-rose-50" },
    { id: "cheat-sheet", label: "Quick Formulas", icon: Flame, color: "text-orange-500 bg-orange-50" },
    { id: "practice", label: "Practice Sheets", icon: Sparkles, color: "text-violet-500 bg-violet-50" }
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

            <div className="grid gap-4">
              {pack.coreConcepts.map((item, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500 shadow-sm border-slate-200">
                  <CardHeader className="py-3 bg-slate-50/50">
                    <CardTitle className="text-sm font-heading font-black text-slate-800">
                      Concept {index + 1}: {item.concept}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 pb-4">
                    <MathRenderer content={item.explanation} className="text-xs text-slate-700 leading-relaxed" />
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

            <div className="space-y-4">
              {pack.explanations.map((item, index) => (
                <Card key={index} className="shadow-sm border-slate-200 bg-white">
                  <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-heading font-black text-slate-800">
                      {item.topic}
                    </CardTitle>
                    {item.ncertReference && (
                      <Badge className="bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px]">
                        {item.ncertReference}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4 pb-5">
                    <MathRenderer content={item.detail} className="text-xs text-slate-700 leading-relaxed space-y-2" />
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

            <div className="space-y-4">
              {pack.examples.map((item, index) => (
                <Card key={index} className="shadow-sm border-slate-200 overflow-hidden">
                  <CardHeader className="bg-amber-50/30 border-b py-3.5">
                    <CardTitle className="text-sm font-heading font-black text-amber-900">
                      Example {index + 1}: {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase text-amber-600">Question Problem</div>
                      <div className="bg-slate-50 border rounded-lg p-3.5 text-xs text-slate-800 font-medium">
                        <MathRenderer content={item.problem} />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase text-emerald-600">Derivation & Solution Steps</div>
                      <div className="bg-emerald-50/20 border border-emerald-100 rounded-lg p-4 text-xs text-slate-700 leading-relaxed font-sans">
                        <MathRenderer content={item.solution} />
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

            <div className="grid gap-4">
              {pack.misconceptions.map((item, index) => (
                <Card key={index} className="shadow-sm border-slate-200 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 border-b">
                      {/* Incorrect Block */}
                      <div className="p-5 bg-rose-50/30 border-r border-slate-100 flex flex-col gap-2">
                        <span className="text-[10px] font-black text-rose-600 uppercase flex items-center gap-1">
                          <XCircle className="h-4 w-4" /> Common Misconception
                        </span>
                        <div className="text-xs font-semibold text-rose-950">
                          <MathRenderer content={item.wrong} />
                        </div>
                      </div>
                      
                      {/* Correct Block */}
                      <div className="p-5 bg-emerald-50/30 flex flex-col gap-2">
                        <span className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Recommended Correction
                        </span>
                        <div className="text-xs font-semibold text-emerald-950">
                          <MathRenderer content={item.correct} />
                        </div>
                      </div>
                    </div>
                    {/* Why explanation card */}
                    <div className="p-4 bg-slate-50/60 flex items-start gap-2.5">
                      <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-slate-600 leading-relaxed italic">
                        <span className="font-bold text-slate-800 not-italic mr-1">Underlying Concept:</span>
                        <MathRenderer content={item.why} />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Formula Panel */}
              {pack.revisionSheet.keyFormulas && pack.revisionSheet.keyFormulas.length > 0 && (
                <Card className="border-orange-100 bg-orange-50/20 shadow-sm">
                  <CardHeader className="py-3 border-b border-orange-100">
                    <CardTitle className="text-xs font-black uppercase text-orange-800 tracking-wider">
                      📐 Equations & PHYSICAL Laws
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {pack.revisionSheet.keyFormulas.map((f, i) => (
                      <div key={i} className="bg-white border rounded px-3 py-2 text-xs font-mono font-medium shadow-sm">
                        <MathRenderer content={f} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Memory Shortcuts Mnemonics */}
              {pack.revisionSheet.mnemonics && pack.revisionSheet.mnemonics.length > 0 && (
                <Card className="border-indigo-100 bg-indigo-50/20 shadow-sm">
                  <CardHeader className="py-3 border-b border-indigo-100">
                    <CardTitle className="text-xs font-black uppercase text-indigo-800 tracking-wider">
                      🧠 Mnemonics & Memory Hacks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {pack.revisionSheet.mnemonics.map((m, i) => (
                      <div key={i} className="bg-white border rounded px-3.5 py-3 text-xs leading-relaxed text-slate-800 font-semibold shadow-sm italic flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-indigo-500 shrink-0" />
                        <MathRenderer content={m} />
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
                <Sparkles className="h-5 w-5 text-violet-500 animate-pulse" />
                Adaptive Practice Sheets
              </h2>
              <p className="text-xs text-muted-foreground">
                Self-evaluation questions to test your current comprehension curves.
              </p>
            </div>

            <div className="space-y-4">
              {pack.selfAssessmentQuestions.map((qItem, index) => {
                const isRevealed = !!revealedAnswers[index];
                const getDiffColor = (diff: string) => {
                  if (diff === "easy") return "bg-emerald-50 text-emerald-700 border-emerald-200";
                  if (diff === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
                  return "bg-rose-50 text-rose-700 border-rose-200";
                };

                return (
                  <Card key={index} className="shadow-sm border-slate-200 bg-white">
                    <CardHeader className="pb-3 border-b flex flex-row items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-xs text-slate-400">Q{index + 1}.</span>
                        <Badge className={`${getDiffColor(qItem.difficulty)} border font-bold text-[10px] uppercase`}>
                          {qItem.difficulty}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="font-semibold text-[10px] text-slate-500">
                        {qItem.type}
                      </Badge>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="text-xs font-semibold text-slate-800 leading-relaxed">
                        <MathRenderer content={qItem.question} />
                      </div>

                      {/* Options for MCQ */}
                      {qItem.type === "MCQ" && qItem.options && qItem.options.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {qItem.options.map((opt, oIdx) => (
                            <div 
                              key={oIdx} 
                              className={`border rounded p-2.5 flex gap-2 items-center bg-slate-50/50 ${
                                isRevealed && opt === qItem.answer
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold"
                                  : "border-slate-200 text-slate-700"
                              }`}
                            >
                              <span className="font-bold text-slate-400">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tap to Reveal Answer */}
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleReveal(index)}
                          className="h-8 font-bold text-[11px] text-blue-600 border-dashed border-blue-200 hover:bg-blue-50/40"
                        >
                          {isRevealed ? "Hide Model Answer" : "Tap to Reveal Answer"}
                        </Button>
                        
                        {isRevealed && (
                          <div className="mt-3 p-3 bg-emerald-50/30 border border-emerald-100 rounded-lg space-y-1">
                            <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Correct Model Answer</span>
                            <div className="text-xs text-emerald-950 font-semibold leading-relaxed">
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
                <div className="p-10 text-center text-slate-500 text-xs italic">
                  No practice sheet compiled.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
