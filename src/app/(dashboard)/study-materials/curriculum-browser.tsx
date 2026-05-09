"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Video,
  FileText,
  Lightbulb,
  Dumbbell,
  ExternalLink,
  Search,
  ChevronRight,
  ChevronDown,
  Play,
  FileDown,
  BookMarked,
  Sparkles,
  ArrowLeft,
  Loader2,
  Printer,
  PrinterIcon,
  X,
} from "lucide-react";
import { extractYouTubeId, youTubeThumbnailUrl } from "@/lib/youtube";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface TopicSummary {
  id: string;
  name: string;
  orderIndex: number;
  avgMastery: number;
  subtopicCount: number;
  materialCount: number;
  materialsByType: Record<string, number>;
}

interface ChapterSummary {
  id: string;
  name: string;
  orderIndex: number;
  topicCount: number;
  subtopicCount: number;
  practisedSubtopics: number;
  topics: TopicSummary[];
}

interface SubjectSummary {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  grade: string;
  board: string;
}

interface StudyMaterial {
  id: string;
  title: string;
  description: string | null;
  type: string;
  youtubeUrl: string | null;
  thumbnailUrl: string | null;
  fileUrl: string | null;
  content: string | null;
  isAIGenerated: boolean;
  subject: { id: string; name: string; color: string };
  chapter: { id: string; name: string } | null;
  topic: { id: string; name: string } | null;
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
const TYPE_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  VIDEO: {
    icon: <Video className="h-3.5 w-3.5" />,
    label: "Video",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  PDF: {
    icon: <FileText className="h-3.5 w-3.5" />,
    label: "PDF",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  NOTES: {
    icon: <BookOpen className="h-3.5 w-3.5" />,
    label: "Notes",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  WORKSHEET: {
    icon: <Dumbbell className="h-3.5 w-3.5" />,
    label: "Worksheet",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  PLATFORM_CONTENT: {
    icon: <Sparkles className="h-3.5 w-3.5" />,
    label: "AI Notes",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

function masteryBadgeClass(score: number): string {
  if (score >= 70) return "bg-emerald-500/15 text-emerald-600 border-emerald-500/20";
  if (score >= 40) return "bg-amber-500/15 text-amber-600 border-amber-500/20";
  if (score > 0) return "bg-rose-500/15 text-rose-600 border-rose-500/20";
  return "bg-muted text-muted-foreground border-border";
}

function masteryDot(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-400";
  if (score > 0) return "bg-rose-500";
  return "bg-muted-foreground/30";
}

// ─────────────────────────────────────────
// Material Card
// ─────────────────────────────────────────
function MaterialCard({ material, onReadInline }: {
  material: StudyMaterial;
  onReadInline: (m: StudyMaterial) => void;
}) {
  const meta = TYPE_META[material.type] ?? TYPE_META["NOTES"];

  // Derive thumbnail from YouTube URL when not stored in DB
  const thumbnailSrc =
    material.thumbnailUrl ??
    (material.youtubeUrl
      ? (() => {
          const id = extractYouTubeId(material.youtubeUrl!);
          return id ? youTubeThumbnailUrl(id, "hqdefault") : null;
        })()
      : null);

  return (
    <Card className="group hover:shadow-premium transition-all duration-300 border-border/50 hover:-translate-y-1 bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* YouTube thumbnail */}
      {material.type === "VIDEO" && thumbnailSrc && (
        <div className="relative overflow-hidden aspect-video bg-muted border-b border-border/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailSrc}
            alt={material.title}
            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>
        </div>
      )}

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.color}`}
          >
            {meta.icon}
            {meta.label}
          </span>
          {material.isAIGenerated && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
              <Sparkles className="h-3 w-3" />
              AI
            </div>
          )}
        </div>
        <CardTitle className="text-sm mt-3 font-heading font-bold leading-snug group-hover:text-primary transition-colors">
          {material.title}
        </CardTitle>
        {material.description && (
          <CardDescription className="text-xs line-clamp-2 mt-1">{material.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        {/* Actions */}
        <div className="flex gap-2 mt-2">
          {material.type === "VIDEO" && material.youtubeUrl && (
            <a href={material.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" className="w-full gap-1.5 font-bold shadow-sm">
                <Play className="h-3.5 w-3.5" /> Watch
              </Button>
            </a>
          )}
          {material.type === "PDF" && material.fileUrl && (
            <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" variant="outline" className="w-full gap-1.5 font-bold border-border/50">
                <FileDown className="h-3.5 w-3.5" /> PDF
              </Button>
            </a>
          )}
          {material.type === "WORKSHEET" && material.fileUrl && (
            <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" variant="outline" className="w-full gap-1.5 font-bold border-border/50">
                <Dumbbell className="h-3.5 w-3.5" /> Practice
              </Button>
            </a>
          )}
          {(material.type === "NOTES" || material.type === "PLATFORM_CONTENT") && material.content && (
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 gap-1.5 font-bold bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10"
              onClick={() => onReadInline(material)}
            >
              <BookOpen className="h-3.5 w-3.5" /> Read Notes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────
// Simple Markdown Renderer (Internal)
// ─────────────────────────────────────────
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const rendered = [];

  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#1d1d1f] dark:text-white font-black">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-primary font-medium italic">$1</em>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      rendered.push(<div key={`gap-${i}`} className="h-3 print:h-2" />);
      continue;
    }

    if (line.startsWith("## ")) {
      rendered.push(
        <h2 key={i} className="text-2xl font-heading font-black mt-10 mb-5 text-[#1d1d1f] dark:text-white border-b border-slate-200/50 dark:border-slate-800 pb-2 print:break-after-avoid">
          {line.replace("## ", "")}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      rendered.push(
        <h3 key={i} className="text-lg font-heading font-bold mt-8 mb-4 text-primary flex items-center gap-2 print:break-after-avoid">
          <div className="w-2 h-2 rounded-full bg-primary print:hidden" />
          {line.replace("### ", "")}
        </h3>
      );
    } else if (line.startsWith("* **")) {
      const match = line.match(/\* \*\*(.*?)\*\*: (.*)/);
      if (match) {
        rendered.push(
          <div key={i} className="mb-4 pl-4 border-l-[3px] border-primary/40 py-1 bg-primary/5 rounded-r-md print:break-inside-avoid print:bg-transparent print:border-black/20">
            <span className="font-bold text-[#1d1d1f] dark:text-white block md:inline">{match[1]}:</span>
            <span className="ml-0 md:ml-2 text-[#1d1d1f]/90 dark:text-slate-200 font-medium">{match[2]}</span>
          </div>
        );
      } else {
        rendered.push(<p key={i} className="mb-4 text-[#1d1d1f]/90 dark:text-slate-200 text-base leading-relaxed font-medium print:break-inside-avoid">{line}</p>);
      }
    } else if (line.startsWith("* ") || line.startsWith("- ")) {
      rendered.push(
        <li 
          key={i} 
          className="ml-6 mb-3 list-disc text-[#1d1d1f]/90 dark:text-slate-200 text-base leading-relaxed font-medium marker:text-primary print:break-inside-avoid print:marker:text-black/50"
          dangerouslySetInnerHTML={{ __html: formatText(line.replace(/^[* -] /, "")) }}
        />
      );
    } else if (/^\d+\./.test(line)) {
      rendered.push(
        <p 
          key={i} 
          className="ml-2 mb-4 text-[#1d1d1f]/90 dark:text-slate-200 text-base leading-relaxed font-medium print:break-inside-avoid"
          dangerouslySetInnerHTML={{ __html: formatText(line) }}
        />
      );
    } else {
      rendered.push(
        <p 
          key={i} 
          className="mb-4 text-[#1d1d1f]/90 dark:text-slate-200 text-base leading-relaxed font-medium print:break-inside-avoid"
          dangerouslySetInnerHTML={{ __html: formatText(line) }}
        />
      );
    }
  }

  return <div className="academic-notes">{rendered}</div>;
}

// ─────────────────────────────────────────
// Inline Notes Reader Modal
// ─────────────────────────────────────────
function NotesReader({ material, onClose }: { material: StudyMaterial; onClose: () => void }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-auto print:relative print:block print:overflow-visible print:bg-transparent print:backdrop-blur-none print:p-0">
      <Card className="bg-[#fdfcf8] dark:bg-slate-950 border-slate-200/50 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-3xl mt-8 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden print:bg-white print:border-none print:shadow-none print:m-0 print:max-w-none print:overflow-visible">
        <div className="sticky top-0 z-10 bg-[#fdfcf8]/90 dark:bg-slate-950/90 backdrop-blur-md px-6 py-4 border-b border-slate-200/50 dark:border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookMarked className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg leading-none">{material.title}</h2>
              {material.topic && (
                <p className="text-xs text-muted-foreground mt-1">
                  {material.topic.name} • {material.subject.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:flex gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="px-8 py-8 print-content">
          {/* Header for print only */}
          <div className="hidden print-only mb-8 border-b-2 border-black pb-4">
            <h1 className="text-3xl font-bold">{material.title}</h1>
            <p className="text-sm mt-2">
              Subject: {material.subject.name} | Topic: {material.topic?.name}
            </p>
            <p className="text-xs text-gray-500 mt-1 italic">Generated by VidyaSetu AI Assistant</p>
          </div>

          <div className="max-w-none">
            {material.content ? (
              <SimpleMarkdown content={material.content} />
            ) : (
              <p className="text-muted-foreground italic">No content available for this material.</p>
            )}
          </div>
          
          <div className="mt-12 pt-6 border-t border-dashed text-center hidden print-only">
            <p className="text-xs text-gray-400">© VidyaSetu — Empowering Academic Excellence</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────
// Topic Detail Panel (right side)
// ─────────────────────────────────────────
function TopicDetailPanel({
  topic,
  subjectId,
  onBack,
}: {
  topic: TopicSummary;
  subjectId: string;
  onBack: () => void;
}) {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string>("ALL");
  const [inlineNote, setInlineNote] = useState<StudyMaterial | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/study-materials?topicId=${topic.id}`)
      .then((r) => r.json())
      .then((d) => setMaterials(d.materials ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [topic.id]);

  const types = Array.from(new Set(materials.map((m) => m.type)));

  const filtered = materials.filter((m) => {
    const matchType = activeType === "ALL" || m.type === activeType;
    const matchSearch =
      search.length === 0 ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.description ?? "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <>
      {inlineNote && <NotesReader material={inlineNote} onClose={() => setInlineNote(null)} />}
      <div className="space-y-4 print:hidden">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg truncate">{topic.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className={`text-xs ${masteryBadgeClass(topic.avgMastery)}`}>
                {topic.avgMastery > 0 ? `${topic.avgMastery}% mastery` : "Not started"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {topic.subtopicCount} subtopics · {materials.length} materials
              </span>
            </div>
          </div>
        </div>

        {/* Search + type filter */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search materials…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          {types.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setActiveType("ALL")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  activeType === "ALL"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent border-border hover:bg-accent"
                }`}
              >
                All
              </button>
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    activeType === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent border-border hover:bg-accent"
                  }`}
                >
                  {TYPE_META[t]?.label ?? t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Materials grid */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No materials for this topic yet.</p>
            <p className="text-xs mt-1">Ask your admin to add or generate AI content.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((m) => (
              <MaterialCard key={m.id} material={m} onReadInline={setInlineNote} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────
// Sidebar Chapter Tree
// ─────────────────────────────────────────
function ChapterTree({
  chapters,
  selectedTopicId,
  onTopicSelect,
}: {
  chapters: ChapterSummary[];
  selectedTopicId: string | null;
  onTopicSelect: (topic: TopicSummary) => void;
}) {
  const [openChapters, setOpenChapters] = useState<Set<string>>(
    new Set(chapters.slice(0, 1).map((c) => c.id))
  );

  const toggleChapter = (id: string) =>
    setOpenChapters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-1">
      {chapters.map((chapter) => {
        const isOpen = openChapters.has(chapter.id);
        return (
          <div key={chapter.id}>
            <button
              onClick={() => toggleChapter(chapter.id)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors text-sm font-medium text-left"
            >
              <span className="flex items-center gap-2 min-w-0">
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{chapter.name}</span>
              </span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {chapter.topicCount}
              </span>
            </button>

            {isOpen && (
              <div className="ml-4 border-l border-border/50 pl-2 space-y-0.5 mt-0.5 mb-1">
                {chapter.topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => onTopicSelect(topic)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-left ${
                      selectedTopicId === topic.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent/40 text-foreground/80"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${masteryDot(topic.avgMastery)}`} />
                      <span className="truncate">{topic.name}</span>
                    </span>
                    {topic.materialCount > 0 && (
                      <span className="text-xs bg-muted rounded-full px-1.5 shrink-0">
                        {topic.materialCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────
// Main Curriculum Browser
// ─────────────────────────────────────────
interface CurriculumBrowserProps {
  subjects: SubjectSummary[];
}

export function CurriculumBrowser({ subjects }: CurriculumBrowserProps) {
  const [activeSubjectId, setActiveSubjectId] = useState<string>(subjects[0]?.id ?? "");
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicSummary | null>(null);

  useEffect(() => {
    if (!activeSubjectId) return;

    const fetchChapters = async () => {
      setLoadingChapters(true);
      setSelectedTopic(null);
      try {
        const res = await fetch(`/api/curriculum/${activeSubjectId}/chapters`);
        const data = await res.json();
        setChapters(data.chapters ?? []);
      } catch {
        setChapters([]);
      } finally {
        setLoadingChapters(false);
      }
    };

    fetchChapters();
  }, [activeSubjectId]);

  const activeSubject = subjects.find((s) => s.id === activeSubjectId);

  if (subjects.length === 0) {
    return (
      <Card className="py-20 text-center">
        <CardContent>
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">No curriculum loaded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight">Study Materials</h1>
        <p className="text-muted-foreground mt-1">
          Browse the CBSE curriculum tree and access videos, notes, and worksheets per topic.
        </p>
      </div>

      {/* Subject tabs */}
      <div className="flex gap-2 flex-wrap print:hidden">
        {subjects.map((subject) => (
          <button
            key={subject.id}
            onClick={() => setActiveSubjectId(subject.id)}
            className={`px-6 py-2 rounded-full text-sm font-bold border transition-all duration-300 ${
              activeSubjectId === subject.id
                ? "bg-primary text-primary-foreground border-primary shadow-premium scale-105"
                : "bg-card border-border/50 hover:bg-accent text-muted-foreground"
            }`}
          >
            {subject.name}
          </button>
        ))}
      </div>

      {/* Main two-column layout */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start print:block">
        {/* Sidebar */}
        <Card className="sticky top-24 border-border/50 shadow-premium overflow-hidden print:hidden">
          <div className="h-1 w-full bg-primary/20" />
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-heading font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              {activeSubject?.name} Curriculum
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            {loadingChapters ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground animate-pulse">Loading structure...</p>
              </div>
            ) : chapters.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground italic px-4">No chapters found for this subject.</p>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-2 pb-4 scrollbar-thin">
                <ChapterTree
                  chapters={chapters}
                  selectedTopicId={selectedTopic?.id ?? null}
                  onTopicSelect={setSelectedTopic}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main content */}
        <div className="min-h-[500px] print:min-h-0">
          {selectedTopic ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <TopicDetailPanel
                topic={selectedTopic}
                subjectId={activeSubjectId}
                onBack={() => setSelectedTopic(null)}
              />
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center py-32 text-center border-dashed bg-muted/20 border-muted-foreground/20 print:hidden">
              <div className="p-4 rounded-full bg-primary/5 mb-4">
                <Sparkles className="h-10 w-10 text-primary/40" />
              </div>
              <p className="font-heading font-bold text-lg text-muted-foreground">Ready to start studying?</p>
              <p className="text-sm text-muted-foreground/60 mt-2 max-w-xs px-4">
                Select a topic from the sidebar to view detailed AI-curated notes, videos, and practice materials.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
