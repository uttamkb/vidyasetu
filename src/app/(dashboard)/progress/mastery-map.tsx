"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, BookOpen, ChevronDown, ChevronRight } from "lucide-react";

// ─────────────────────────────────────────
// Types (matches /api/progress/mastery shape)
// ─────────────────────────────────────────
interface SubtopicMastery {
  id: string;
  name: string;
  difficulty: number;
  masteryScore: number;
  lastPracticed: string | null;
  totalAttempts: number;
  correctAttempts: number;
  status: "mastered" | "learning" | "weak" | "not_started";
}

interface TopicMastery {
  id: string;
  name: string;
  orderIndex: number;
  avgMastery: number;
  subtopics: SubtopicMastery[];
}

interface ChapterMastery {
  id: string;
  name: string;
  orderIndex: number;
  avgMastery: number;
  topics: TopicMastery[];
}

interface SubjectMastery {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  chapters: ChapterMastery[];
}

// ─────────────────────────────────────────
// Trend data types
// ─────────────────────────────────────────
interface TrendPoint {
  week: string;
  weekStart: string;
  avgScore: number;
  submissionCount: number;
  delta: number | null;
}

// ─────────────────────────────────────────
// Colour helpers
// ─────────────────────────────────────────
const STATUS_COLORS = {
  mastered: "bg-emerald-500 hover:bg-emerald-400",
  learning: "bg-amber-400 hover:bg-amber-300",
  weak: "bg-rose-500 hover:bg-rose-400",
  not_started: "bg-muted hover:bg-muted/70",
};

const STATUS_LABEL = {
  mastered: "Mastered",
  learning: "Learning",
  weak: "Needs Work",
  not_started: "Not Started",
};

function masteryColor(score: number) {
  if (score >= 70) return "text-emerald-500";
  if (score >= 40) return "text-amber-500";
  if (score > 0) return "text-rose-500";
  return "text-muted-foreground";
}

// ─────────────────────────────────────────
// Subtopic cell
// ─────────────────────────────────────────
function SubtopicCell({ sub }: { sub: SubtopicMastery }) {
  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          render={
            <div
              className={`w-7 h-7 rounded-md cursor-default transition-colors ${STATUS_COLORS[sub.status]}`}
              aria-label={`${sub.name}: ${sub.masteryScore}%`}
            />
          }
        />
        <TooltipContent side="top" className="max-w-[220px]">
          <p className="font-semibold text-xs truncate">{sub.name}</p>
          <p className="text-xs text-muted-foreground">{STATUS_LABEL[sub.status]}</p>
          <p className="text-xs">{sub.masteryScore}% mastery · {sub.totalAttempts} attempts</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─────────────────────────────────────────
// Chapter row (expandable topics)
// ─────────────────────────────────────────
function ChapterRow({ chapter }: { chapter: ChapterMastery }) {
  const [open, setOpen] = useState(false);
  const allSubtopics = chapter.topics.flatMap((t) => t.subtopics);

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden shadow-sm hover:shadow-premium transition-all duration-300">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card/60 backdrop-blur-sm hover:bg-accent/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{chapter.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Minimap strip */}
          <div className="hidden sm:flex gap-0.5">
            {allSubtopics.slice(0, 12).map((st) => (
              <div
                key={st.id}
                className={`w-2 h-4 rounded-sm ${STATUS_COLORS[st.status].split(" ")[0]}`}
              />
            ))}
            {allSubtopics.length > 12 && (
              <span className="text-xs text-muted-foreground ml-1">+{allSubtopics.length - 12}</span>
            )}
          </div>
          <span className={`text-sm font-bold tabular-nums ${masteryColor(chapter.avgMastery)}`}>
            {chapter.avgMastery}%
          </span>
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 bg-muted/20 space-y-3">
          {chapter.topics.map((topic) => (
            <div key={topic.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{topic.name}</span>
                <span className={`text-xs font-bold ${masteryColor(topic.avgMastery)}`}>
                  {topic.avgMastery}%
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {topic.subtopics.map((st) => (
                  <SubtopicCell key={st.id} sub={st} />
                ))}
                {topic.subtopics.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No subtopics yet</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Mastery Map
// ─────────────────────────────────────────
export function MasteryMap({ masteryMap }: { masteryMap: SubjectMastery[] }) {
  const [activeSubjectId, setActiveSubjectId] = useState<string>(masteryMap[0]?.id ?? "");
  const activeSubject = masteryMap.find((s) => s.id === activeSubjectId);

  // Flatten all subtopics for strength/weakness analysis
  const allSubtopics = masteryMap
    .flatMap((s) => s.chapters.flatMap((c) => c.topics.flatMap((t) => t.subtopics)))
    .filter((st) => st.totalAttempts > 0);

  const strong = [...allSubtopics].sort((a, b) => b.masteryScore - a.masteryScore).slice(0, 3);
  const weak = [...allSubtopics].sort((a, b) => a.masteryScore - b.masteryScore).slice(0, 3);

  if (masteryMap.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Complete assignments to build your mastery map.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <Card className="border-none shadow-premium bg-gradient-to-br from-primary/5 via-blue-500/5 to-transparent overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary to-indigo-500" />
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-heading font-bold">Topic Mastery Map</CardTitle>
          <CardDescription>Click a chapter to expand subtopics. Each cell = one subtopic.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Subject tabs */}
          <div className="flex gap-2 flex-wrap mb-4">
            {masteryMap.map((subject) => (
              <button
                key={subject.id}
                onClick={() => setActiveSubjectId(subject.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  activeSubjectId === subject.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent border-border hover:bg-accent"
                }`}
              >
                {subject.name}
              </button>
            ))}
          </div>

          {/* Legend pills */}
          <div className="flex flex-wrap gap-3 mb-5">
            {(["mastered", "learning", "weak", "not_started"] as const).map((status) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${STATUS_COLORS[status].split(" ")[0]}`} />
                <span className="text-xs text-muted-foreground">{STATUS_LABEL[status]}</span>
              </div>
            ))}
          </div>

          {/* Chapters */}
          <div className="space-y-2">
            {activeSubject?.chapters.map((chapter) => (
              <ChapterRow key={chapter.id} chapter={chapter} />
            ))}
            {(activeSubject?.chapters.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No chapters found for this subject.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Strength / Weakness panels */}
      {allSubtopics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-premium border-border/50 transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-lg font-heading font-bold">Your Strengths</CardTitle>
              </div>
              <CardDescription>Top 3 mastered subtopics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {strong.map((st, i) => (
                <div key={st.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm w-5 text-right">{i + 1}.</span>
                    <span className="text-sm font-medium truncate max-w-[200px]">{st.name}</span>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 shrink-0">
                    {st.masteryScore}%
                  </Badge>
                </div>
              ))}
              {strong.length === 0 && (
                <p className="text-sm text-muted-foreground">Keep practicing to see your strengths!</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-premium border-border/50 transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-rose-500" />
                <CardTitle className="text-lg font-heading font-bold">Focus Areas</CardTitle>
              </div>
              <CardDescription>Subtopics that need the most attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {weak.map((st, i) => (
                <div key={st.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm w-5 text-right">{i + 1}.</span>
                    <span className="text-sm font-medium truncate max-w-[200px]">{st.name}</span>
                  </div>
                  <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/20 shrink-0">
                    {st.masteryScore}%
                  </Badge>
                </div>
              ))}
              {weak.length === 0 && (
                <p className="text-sm text-muted-foreground">Complete more assignments to see focus areas.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Trend Chart (client, uses Recharts)
// ─────────────────────────────────────────
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export function TrendChart({
  trends,
  overallDelta,
}: {
  trends: TrendPoint[];
  overallDelta: number | null;
}) {
  const hasData = trends.length > 0;

  const DeltaIcon = overallDelta === null ? Minus : overallDelta > 0 ? TrendingUp : TrendingDown;
  const deltaColor =
    overallDelta === null
      ? "text-muted-foreground"
      : overallDelta > 0
      ? "text-emerald-500"
      : "text-rose-500";

  return (
    <Card className="shadow-premium border-border/50 transition-all hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-heading font-bold">Improvement Trend</CardTitle>
            <CardDescription>Weekly average score over the last 8 weeks</CardDescription>
          </div>
          {overallDelta !== null && (
            <div className={`flex items-center gap-1 ${deltaColor} font-semibold`}>
              <DeltaIcon className="h-4 w-4" />
              <span className="text-sm">
                {overallDelta > 0 ? "+" : ""}
                {overallDelta}% overall
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trends} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <RechartsTooltip
                formatter={(value: any, _: any, props: any) => {
                  const delta = props?.payload?.delta;
                  const deltaStr =
                    delta !== null && delta !== undefined
                      ? ` (${delta > 0 ? "+" : ""}${delta}% vs prev week)`
                      : "";
                  return [`${value}%${deltaStr}`, "Avg Score"];
                }}
              />
              {/* Reference at 40% (passing) */}
              <ReferenceLine y={40} stroke="#f97316" strokeDasharray="4 4" label={{ value: "Pass", position: "insideLeft", fontSize: 10, fill: "#f97316" }} />
              <Line
                type="monotone"
                dataKey="avgScore"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
            <TrendingUp className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No submissions yet — your trend will appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
