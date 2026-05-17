import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, BookOpen, ArrowLeft, Sparkles, RotateCcw } from "lucide-react";
import Link from "next/link";
import AssignmentForm from "./assignment-form";
import { GenerationPoller } from "./generation-poller";
import { ArchiveButton } from "../archive-button";

async function getAssignment(id: string, userId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      subject: true,
      submissions: {
        where: { userId },
        orderBy: { submittedAt: 'desc' },
      },
    },
  });

  if (!assignment) return null;

  return {
    ...assignment,
    submission: assignment.submissions[0] || null,
  };
}

export default async function AssignmentDetailPage({ 
  params,
  searchParams, 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const { id } = resolvedParams;
  const isRetest = resolvedSearchParams.retest === "true";
  
  const assignment = await getAssignment(id, session.user.id);

  if (!assignment) {
    notFound();
  }

  // The questions field holds [{questionId, orderIndex}] pointers.
  const questions = (assignment.questions as unknown as Array<{ questionId: string; orderIndex: number }>) || [];

  const questionIds = questions.map((q) => q.questionId);
  const fetchedQuestions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
  });

  // 5-minute stale check
  const isStale = assignment.status === "GENERATING" && 
                 (new Date().getTime() - new Date(assignment.createdAt).getTime()) > 5 * 60 * 1000;
  
  const displayStatus = isStale || assignment.status === "FAILED" ? "FAILED" : assignment.status;

  // Map pointers to their full question data
  const fullQuestions = questions.map((pointer) => {
    const q = fetchedQuestions.find((fq) => fq.id === pointer.questionId);
    return {
      pointer,
      question: q || null,
    };
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/assignments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{assignment.title}</h1>
          <p className="text-muted-foreground">{assignment.description}</p>
        </div>
      </div>


      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>{assignment.subject.name}</span>
            </div>
            <Badge variant="outline">{assignment.type}</Badge>
            {assignment.dueDate && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Due: {new Date(assignment.dueDate).toLocaleDateString("en-IN")}</span>
              </div>
            )}
            <Badge variant="secondary">Max Marks: {assignment.maxMarks}</Badge>
            {assignment.timeLimit && (
              <Badge variant="secondary">Time Limit: {assignment.timeLimit} min</Badge>
            )}
            {displayStatus === "GENERATING" && (
              <Badge variant="default" className="bg-blue-500 animate-pulse">Generating AI Questions...</Badge>
            )}
            {displayStatus === "FAILED" && (
              <Badge variant="destructive">Generation Failed</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {displayStatus === "FAILED" && (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardHeader>
            <CardTitle className="text-rose-700 flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Generation Failed
            </CardTitle>
            <CardDescription>
              We encountered an issue while generating questions for this assignment. 
              This can happen due to AI rate limits or network issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground/70">
              Please delete this assignment and try generating it again. We recommend waiting a few moments before retrying.
            </p>
            <div className="flex gap-3">
              <Link href="/assignments">
                <Button variant="outline">Back to Assignments</Button>
              </Link>
              <ArchiveButton assignmentId={assignment.id} label="Delete & Try Again" />
            </div>
          </CardContent>
        </Card>
      )}

      {displayStatus === "GENERATING" ? (
        <>
          <GenerationPoller assignmentId={assignment.id} />
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-blue-700 flex items-center gap-2">
                <Sparkles className="h-5 w-5 animate-spin" />
                Preparing your assignment...
              </CardTitle>
              <CardDescription>
                We are generating high-quality questions for you. This usually takes 15-30 seconds.
                The page will update once the questions are ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-blue-100 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-blue-100 rounded animate-pulse w-1/2" />
                <div className="h-4 bg-blue-100 rounded animate-pulse w-2/3" />
              </div>
            </CardContent>
          </Card>
        </>
      ) : assignment.submission && !isRetest ? (
        <Card className="bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle>Already Submitted</CardTitle>
            <CardDescription>
              You have already submitted this assignment. View your results below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                {assignment.submission.totalScore}/{assignment.maxMarks}
              </p>
              <p className="text-muted-foreground mt-2">
                {Math.round((assignment.submission.totalScore / assignment.maxMarks) * 100)}% Score
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href={`/submissions/${assignment.submission.id}`}>
                <Button className="w-full">View Detailed Feedback</Button>
              </Link>
              <Link href={`/assignments/${assignment.id}?retest=true`}>
                <Button variant="outline" className="w-full bg-white dark:bg-black text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900 border-green-200 dark:border-green-800">
                  Take Retest
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AssignmentForm
          assignmentId={assignment.id}
          fullQuestions={fullQuestions as any}
          maxMarks={assignment.maxMarks}
          timeLimit={assignment.timeLimit}
          title={assignment.title}
          subjectName={assignment.subject.name}
        />
      )}
    </div>
  );
}
