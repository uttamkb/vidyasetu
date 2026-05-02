import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { GenerateAIModal } from "./generate-ai-modal";

type AssignmentStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EVALUATED";

interface AssignmentListItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  subject: { id: string; name: string; color: string };
  maxMarks: number;
  dueDate: Date | null;
  timeLimit: number | null;
  status: AssignmentStatus;
  totalScore: number | null;
  percentageScore: number | null;
}

async function getAssignments(userId: string): Promise<AssignmentListItem[]> {
  const assignments = await prisma.assignment.findMany({
    include: {
      subject: true,
      submissions: {
        where: { userId },
        select: { status: true, totalScore: true, percentageScore: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return assignments.map((a) => {
    const submission = a.submissions[0];
    const status: AssignmentStatus = submission
      ? (submission.status as AssignmentStatus)
      : "NOT_STARTED";

    return {
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      subject: a.subject,
      maxMarks: a.maxMarks,
      dueDate: a.dueDate,
      timeLimit: a.timeLimit,
      status,
      totalScore: submission?.totalScore ?? null,
      percentageScore: submission?.percentageScore ?? null,
    };
  });
}

async function getSubjects(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { grade: true, board: true },
  });
  return prisma.subject.findMany({
    where: { grade: user.grade, board: user.board },
    select: { id: true, name: true, color: true },
    orderBy: { orderIndex: "asc" },
  });
}

// ─────────────────────────────────────────
// Status styles
// ─────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  NOT_STARTED: "bg-muted-foreground/40",
  IN_PROGRESS: "bg-amber-400",
  SUBMITTED: "bg-emerald-500",
  EVALUATED: "bg-emerald-500",
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  EVALUATED: "Evaluated",
};

function scoreColor(pct: number) {
  if (pct >= 70) return "text-emerald-600";
  if (pct >= 40) return "text-amber-600";
  return "text-rose-600";
}

// ─────────────────────────────────────────
// Page
// ─────────────────────────────────────────
export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [assignments, subjects] = await Promise.all([
    getAssignments(session.user.id),
    getSubjects(session.user.id),
  ]);

  const pending = assignments.filter((a) => a.status === "NOT_STARTED" || a.status === "IN_PROGRESS");
  const completed = assignments.filter((a) => a.status === "SUBMITTED" || a.status === "EVALUATED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground mt-1">
            {pending.length} pending · {completed.length} completed
          </p>
        </div>
        <GenerateAIModal subjects={subjects} />
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Pending
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pending.map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Completed
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completed.map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {assignments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Plus className="h-12 w-12 mb-4 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No assignments yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-6">
            Generate your first AI-powered test to get started.
          </p>
          <GenerateAIModal subjects={subjects} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Assignment Card
// ─────────────────────────────────────────
function AssignmentCard({ assignment: a }: { assignment: AssignmentListItem }) {
  const pct = a.percentageScore ?? (a.totalScore !== null ? Math.round((a.totalScore / a.maxMarks) * 100) : null);
  const isDone = a.status === "SUBMITTED" || a.status === "EVALUATED";

  return (
    <Card className="flex flex-col hover:shadow-md hover:border-primary/30 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">{a.type.replace("_", " ")}</Badge>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${STATUS_DOT[a.status]}`} />
            <span className="text-xs text-muted-foreground">{STATUS_LABEL[a.status]}</span>
          </div>
        </div>
        <CardTitle className="text-base mt-2 leading-snug">{a.title}</CardTitle>
        {a.description && (
          <CardDescription className="line-clamp-2">{a.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* Subject */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2.5 h-2.5 rounded-full ${a.subject.color}`} />
          <span className="text-sm font-medium">{a.subject.name}</span>
        </div>

        {/* Meta */}
        <div className="space-y-1.5 text-xs text-muted-foreground flex-1">
          {a.timeLimit && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{a.timeLimit} min</span>
            </div>
          )}
          <div>Max marks: {a.maxMarks}</div>
          {a.dueDate && (
            <div>Due: {new Date(a.dueDate).toLocaleDateString("en-IN")}</div>
          )}
        </div>

        {/* Score */}
        {pct !== null && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Score</span>
              <span className={`font-bold ${scoreColor(pct)}`}>
                {a.totalScore}/{a.maxMarks} ({pct}%)
              </span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 pt-4 border-t">
          <Link href={isDone ? `/submissions/${a.id}` : `/assignments/${a.id}`}>
            <Button
              className="w-full gap-2"
              variant={isDone ? "outline" : "default"}
            >
              {isDone ? "View Result" : a.status === "IN_PROGRESS" ? "Continue" : "Start"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
