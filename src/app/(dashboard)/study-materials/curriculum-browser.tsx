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
    <Card className="group hover:shadow-md transition-shadow border-border/60">
      {/* YouTube thumbnail */}
      {material.type === "VIDEO" && thumbnailSrc && (
        <div className="relative overflow-hidden rounded-t-lg aspect-video bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailSrc}
            alt={material.title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="h-10 w-10 text-white drop-shadow" />
          </div>
        </div>
      )}

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}
          >
            {meta.icon}
            {meta.label}
          </span>
          {material.isAIGenerated && (
            <Badge variant="outline" className="text-xs border-amber-400/40 text-amber-600">
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </Badge>
          )}
        </div>
        <CardTitle className="text-sm mt-2 leading-snug">{material.title}</CardTitle>
        {material.description && (
          <CardDescription className="text-xs line-clamp-2">{material.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Actions */}
        <div className="flex gap-2 mt-2">
          {material.type === "VIDEO" && material.youtubeUrl && (
            <a href={material.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" className="w-full gap-1.5">
                <Play className="h-3.5 w-3.5" /> Watch
              </Button>
            </a>
          )}
          {material.type === "PDF" && material.fileUrl && (
            <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" variant="outline" className="w-full gap-1.5">
                <FileDown className="h-3.5 w-3.5" /> Download PDF
              </Button>
            </a>
          )}
          {material.type === "WORKSHEET" && material.fileUrl && (
            <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" variant="outline" className="w-full gap-1.5">
                <FileDown className="h-3.5 w-3.5" /> Download
              </Button>
            </a>
          )}
          {(material.type === "NOTES" || material.type === "PLATFORM_CONTENT") && material.content && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => onReadInline(material)}
            >
              <BookMarked className="h-3.5 w-3.5" /> Read Notes
            </Button>
          )}
          {material.type === "NOTES" && !material.content && material.fileUrl && (
            <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" variant="outline" className="w-full gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────
// Inline Notes Reader Modal
// ─────────────────────────────────────────
function NotesReader({ material, onClose }: { material: StudyMaterial; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-auto">
      <div className="bg-card border rounded-xl shadow-xl w-full max-w-2xl mt-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-lg">{material.title}</h2>
            {material.topic && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {material.topic.name}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Close
          </Button>
        </div>
        <ScrollArea className="max-h-[70vh]">
          <div className="px-6 py-5 prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {material.content}
            </pre>
          </div>
        </ScrollArea>
      </div>
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
      <div className="space-y-4">
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Study Materials</h1>
        <p className="text-muted-foreground mt-1">
          Browse the CBSE curriculum tree and access videos, notes, and worksheets per topic.
        </p>
      </div>

      {/* Subject tabs */}
      <div className="flex gap-2 flex-wrap">
        {subjects.map((subject) => (
          <button
            key={subject.id}
            onClick={() => setActiveSubjectId(subject.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeSubjectId === subject.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent border-border hover:bg-accent"
            }`}
          >
            {subject.name}
          </button>
        ))}
      </div>

      {/* Main two-column layout */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Sidebar */}
        <Card className="sticky top-20">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {activeSubject?.name} Chapters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            {loadingChapters ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : chapters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No chapters found.</p>
            ) : (
              <ScrollArea className="max-h-[60vh]">
                <ChapterTree
                  chapters={chapters}
                  selectedTopicId={selectedTopic?.id ?? null}
                  onTopicSelect={setSelectedTopic}
                />
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Main content */}
        <div>
          {selectedTopic ? (
            <TopicDetailPanel
              topic={selectedTopic}
              subjectId={activeSubjectId}
              onBack={() => setSelectedTopic(null)}
            />
          ) : (
            <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
              <BookOpen className="h-12 w-12 mb-4 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">Select a topic from the sidebar</p>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
                Click on any chapter to expand it, then select a topic to see its study materials.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
