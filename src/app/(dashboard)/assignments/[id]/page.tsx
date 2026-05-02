import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";
import AssignmentForm from "./assignment-form";

async function getAssignment(id: string, userId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      subject: true,
      submissions: {
        where: { userId },
      },
    },
  });

  if (!assignment) return null;

  return {
    ...assignment,
    submission: assignment.submissions[0] || null,
  };
}

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
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
          </div>
        </CardContent>
      </Card>

      {assignment.submission ? (
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
            <Link href={`/submissions/${assignment.submission.id}`}>
              <Button className="w-full">View Detailed Feedback</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <AssignmentForm
          assignmentId={assignment.id}
          fullQuestions={fullQuestions as any}
          maxMarks={assignment.maxMarks}
          timeLimit={assignment.timeLimit}
        />
      )}
    </div>
  );
}
