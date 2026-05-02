"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Zap, BookOpen, GraduationCap, Brain } from "lucide-react";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Chapter {
  id: string;
  name: string;
}

interface GenerateAIModalProps {
  subjects: Subject[];
}

const ASSIGNMENT_TYPES = [
  { value: "CHAPTER", label: "Chapter Test", icon: BookOpen, description: "Focus on one chapter" },
  { value: "SEMESTER", label: "Semester Exam", icon: GraduationCap, description: "Mix across chapters" },
  { value: "FULL_SYLLABUS", label: "Full Syllabus", icon: Brain, description: "Entire subject coverage" },
  { value: "DIAGNOSTIC", label: "Quick Quiz", icon: Zap, description: "5–10 minute rapid fire" },
];

const DIFFICULTY_LEVELS = [
  { value: "EASY", label: "Easy", color: "text-emerald-600" },
  { value: "MEDIUM", label: "Medium", color: "text-amber-600" },
  { value: "HARD", label: "Hard", color: "text-rose-600" },
  { value: "MIXED", label: "Mixed", color: "text-blue-600" },
];

// ─────────────────────────────────────────
// Modal
// ─────────────────────────────────────────
export function GenerateAIModal({ subjects }: GenerateAIModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [subjectId, setSubjectId] = useState("");
  const [type, setType] = useState("CHAPTER");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [chapterId, setChapterId] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(30);

  // Dynamic chapters
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const needsChapter = type === "CHAPTER";

  useEffect(() => {
    if (!subjectId || !needsChapter) {
      setChapters([]);
      setChapterId("");
      return;
    }
    setLoadingChapters(true);
    fetch(`/api/curriculum/${subjectId}/chapters`)
      .then((r) => r.json())
      .then((d) => setChapters(d.chapters ?? []))
      .catch(console.error)
      .finally(() => setLoadingChapters(false));
  }, [subjectId, needsChapter]);

  // Reset chapter when type changes
  useEffect(() => {
    if (!needsChapter) setChapterId("");
  }, [needsChapter]);

  const canSubmit =
    subjectId.length > 0 &&
    (!needsChapter || chapterId.length > 0);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        subjectId,
        type,
        difficulty,
        questionCount,
        timeLimit,
      };
      if (needsChapter && chapterId) body.chapterId = chapterId;

      const res = await fetch("/api/assignments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Generation failed");
      }

      const { assignment } = await res.json();
      setOpen(false);
      router.push(`/assignments/${assignment.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button id="generate-ai-btn" className="gap-2 shadow-lg">
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Generate AI Assignment
          </DialogTitle>
          <DialogDescription>
            Gemini will create a personalised test tailored to your level in seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Assignment Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Assignment Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {ASSIGNMENT_TYPES.map(({ value, label, icon: Icon, description }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                    type === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40 hover:bg-accent/40"
                  }`}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${type === value ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-xs font-semibold leading-none">{label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject-select">Subject <span className="text-destructive">*</span></Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger id="subject-select">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chapter (only for CHAPTER_TEST) */}
          {needsChapter && (
            <div className="space-y-2">
              <Label htmlFor="chapter-select">Chapter <span className="text-destructive">*</span></Label>
              <Select
                value={chapterId}
                onValueChange={setChapterId}
                disabled={!subjectId || loadingChapters}
              >
                <SelectTrigger id="chapter-select">
                  <SelectValue
                    placeholder={
                      !subjectId
                        ? "Select a subject first"
                        : loadingChapters
                        ? "Loading chapters…"
                        : "Select a chapter"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {chapters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Difficulty */}
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <div className="flex gap-2">
              {DIFFICULTY_LEVELS.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setDifficulty(value)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                    difficulty === value
                      ? `border-primary bg-primary/10 ${color}`
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Questions</Label>
              <Badge variant="outline" className="font-bold">{questionCount}</Badge>
            </div>
            <Slider
              value={[questionCount]}
              onValueChange={([v]) => setQuestionCount(v)}
              min={5}
              max={30}
              step={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 (Quick)</span>
              <span>30 (Full)</span>
            </div>
          </div>

          {/* Time Limit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Time Limit</Label>
              <Badge variant="outline" className="font-bold">{timeLimit} min</Badge>
            </div>
            <Slider
              value={[timeLimit]}
              onValueChange={([v]) => setTimeLimit(v)}
              min={5}
              max={120}
              step={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 min</span>
              <span>2 hours</span>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!canSubmit || loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
