"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, 
  ChevronDown, 
  Sparkles, 
  Loader2, 
  BookOpen, 
  Video, 
  FileText,
  AlertCircle,
  CheckCircle2,
  Rocket,
  PlusCircle
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Topic {
  id: string;
  name: string;
  _count: {
    studyMaterials: number;
    subtopics: number;
  };
}

interface Chapter {
  id: string;
  name: string;
  topics: Topic[];
}

interface Subject {
  id: string;
  name: string;
  grade: string;
  board: string;
  chapters: Chapter[];
}

export function CurriculumClient({ initialSubjects, currentGrade }: { initialSubjects: Subject[], currentGrade: string }) {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // Sync subjects when initialSubjects changes (after grade switch)
  useEffect(() => {
    setSubjects(initialSubjects);
  }, [initialSubjects]);

  const handleGradeChange = (grade: string) => {
    router.push(`/admin/curriculum?grade=${grade}`);
  };

  const handleBootstrap = async () => {
    setIsBootstrapping(true);
    const toastId = toast.loading(`Bootstrapping Class ${currentGrade} Curriculum... This uses AI and will take a moment.`);
    
    try {
      const res = await fetch("/api/admin/curriculum/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: currentGrade }),
      });

      if (!res.ok) throw new Error("Bootstrap failed");
      
      const data = await res.json();
      toast.success(`Success! Class ${currentGrade} curriculum structure generated.`, { id: toastId });
      
      // Refresh the page data
      router.refresh();
      
    } catch (error) {
      toast.error("Failed to bootstrap curriculum. Please try again.", { id: toastId });
      console.error(error);
    } finally {
      setIsBootstrapping(false);
    }
  };

  const toggleSubject = (id: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleGenerate = async (topicId: string) => {
    setGeneratingId(topicId);
    try {
      const res = await fetch(`/api/study-materials?topicId=${topicId}&refresh=true`);
      if (!res.ok) throw new Error("Generation failed");
      
      toast.success("AI Content Generated successfully!");
      
      // Refresh the local state for this topic (simplified)
      const data = await res.json();
      const materialCount = data.materials.length;
      
      setSubjects(prev => prev.map(s => ({
        ...s,
        chapters: s.chapters.map(c => ({
          ...c,
          topics: c.topics.map(t => t.id === topicId ? { ...t, _count: { ...t._count, studyMaterials: materialCount } } : t)
        }))
      })));
      
    } catch (error) {
      toast.error("Failed to generate AI content.");
      console.error(error);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={currentGrade} onValueChange={handleGradeChange} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
            <TabsTrigger value="8" className="font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Class 8</TabsTrigger>
            <TabsTrigger value="9" className="font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Class 9</TabsTrigger>
            <TabsTrigger value="10" className="font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Class 10</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {subjects.length > 0 && (
           <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold h-10">
              <PlusCircle className="h-4 w-4" /> Add Subject
           </Button>
        )}
      </div>

      {subjects.length === 0 || subjects.every(s => s.chapters.length === 0) ? (
        <Card className="border-dashed border-2 bg-muted/5 p-12 text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto">
              <Rocket className="h-8 w-8 text-indigo-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Class {currentGrade} Curriculum is {subjects.length > 0 ? "Incomplete" : "Empty"}</h2>
              <p className="text-sm text-muted-foreground">
                {subjects.length > 0 
                  ? "Subjects were created but the AI research was interrupted. Re-run the bootstrapper to generate the NCERT chapters."
                  : "We haven't seeded subjects for Class " + currentGrade + " yet. Use our AI Bootstrapper to automatically research and generate the NCERT structure."}
              </p>
            </div>
            <Button 
              size="lg" 
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold px-8 shadow-lg shadow-indigo-100"
              onClick={handleBootstrap}
              disabled={isBootstrapping}
            >
              {isBootstrapping ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {isBootstrapping ? "Generating Curriculum..." : `Bootstrap Class ${currentGrade} Curriculum`}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {subjects.map(subject => (
            <Card key={subject.id} className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-1.5 w-full bg-indigo-500/10" />
              <CardHeader 
                className="flex flex-row items-center justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleSubject(subject.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                     {subject.name[0]}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black tracking-tight">{subject.name}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] uppercase font-black bg-indigo-50 text-indigo-600 border-none">Grade {subject.grade}</Badge>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400 border-slate-200">{subject.board}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {subject.chapters.length === 0 ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 gap-1.5 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-black uppercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBootstrap();
                      }}
                      disabled={isBootstrapping}
                    >
                      <AlertCircle className="h-3 w-3" /> Fix Subject
                    </Button>
                  ) : (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-black text-slate-900">{subject.chapters.length} Chapters</p>
                      <p className="text-[10px] text-slate-400 font-bold">{subject.chapters.reduce((acc, c) => acc + c.topics.length, 0)} Topics</p>
                    </div>
                  )}
                  {expandedSubjects.has(subject.id) ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </CardHeader>
              
              {expandedSubjects.has(subject.id) && (
                <CardContent className="p-0 border-t border-slate-100">
                  <div className="divide-y divide-slate-100">
                    {subject.chapters.map(chapter => (
                      <div key={chapter.id} className="bg-slate-50/30">
                        <div 
                          className="flex items-center justify-between p-4 pl-10 cursor-pointer hover:bg-slate-100/50"
                          onClick={() => toggleChapter(chapter.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                               {chapter.name.split(' ')[0][0]}
                            </div>
                            <span className="font-bold text-sm text-slate-700">{chapter.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <Badge variant="ghost" className="text-[10px] font-bold text-slate-400">{chapter.topics.length} topics</Badge>
                             {expandedChapters.has(chapter.id) ? (
                                <ChevronDown className="h-4 w-4 text-slate-300" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-300" />
                              )}
                          </div>
                        </div>
                        
                        {expandedChapters.has(chapter.id) && (
                          <div className="pl-16 pr-6 pb-6 space-y-3">
                            {chapter.topics.map(topic => {
                              const hasContent = topic._count.studyMaterials > 0;
                              
                              return (
                                <div key={topic.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-200 transition-colors">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">{topic.name}</span>
                                    <div className="flex gap-4 mt-2">
                                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                        <FileText className={`h-3 w-3 ${hasContent ? 'text-emerald-500' : 'text-amber-500'}`} />
                                        <span className={hasContent ? 'text-emerald-600' : 'text-amber-600'}>{topic._count.studyMaterials} Materials</span>
                                      </div>
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                    <BookOpen className={`h-3 w-3 ${topic._count.subtopics > 0 ? 'text-indigo-500' : 'text-amber-500'}`} />
                                    <span className={topic._count.subtopics > 0 ? 'text-indigo-600' : 'text-amber-600'}>{topic._count.subtopics} Subtopics</span>
                                  </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="gap-2 h-9 px-4 font-black text-[11px] uppercase tracking-wider text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleGenerate(topic.id);
                                      }}
                                      disabled={generatingId === topic.id}
                                    >
                                      {generatingId === topic.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Sparkles className="h-3.5 w-3.5" />
                                      )}
                                      {hasContent ? "Refresh AI" : "Generate"}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
