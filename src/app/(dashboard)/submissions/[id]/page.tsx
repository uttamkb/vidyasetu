import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

async function getSubmission(id: string, userId: string) {
  const submission = await prisma.submission.findFirst({
    where: { id, userId },
    include: {
      assignment: {
        include: { subject: true },
      },
    },
  });

  return submission;
}

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const submission = await getSubmission(id, session.user.id);

  if (!submission) {
    notFound();
  }

  interface Question {
    question: string;
    type: string;
    marks: number;
    correctAnswer: string;
    keywords?: string[];
  }
  interface Answer {
    questionIndex: number;
    answer: string;
  }
  const questions = submission.assignment.questions as unknown as Question[];
  const answers = submission.answers as unknown as Answer[];
  const percentage = Math.round((submission.score / submission.maxMarks) * 100);

  const getScoreColor = (pct: number) => {
    if (pct >= 70) return "text-green-600";
    if (pct >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (pct: number) => {
    if (pct >= 70) return "bg-green-100 text-green-800";
    if (pct >= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/assignments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submission Result</h1>
          <p className="text-muted-foreground">{submission.assignment.title}</p>
        </div>
      </div>

      {/* Score Overview */}
      <Card className="bg-gradient-to-r from-primary/5 to-blue-500/5">
        <CardContent className="py-8">
          <div className="text-center">
            <p className={`text-5xl font-bold ${getScoreColor(percentage)}`}>
              {submission.score}/{submission.maxMarks}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge className={getScoreBadge(percentage)}>{percentage}%</Badge>
              <span className="text-sm text-muted-foreground">
                {percentage >= 70 ? "Excellent!" : percentage >= 40 ? "Good effort!" : "Keep practicing!"}
              </span>
            </div>
            <Progress value={percentage} className="mt-4 max-w-md mx-auto" />
          </div>
        </CardContent>
      </Card>

      {/* Subject Info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${submission.assignment.subject.color}`} />
              <span>{submission.assignment.subject.name}</span>
            </div>
            <Badge variant="outline">Week {submission.assignment.weekNumber}</Badge>
            <Badge variant="secondary">Max Marks: {submission.maxMarks}</Badge>
            <span className="text-muted-foreground">
              Submitted: {new Date(submission.submittedAt).toLocaleString("en-IN")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Question-wise Breakdown */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Question-wise Breakdown</h2>
        <div className="space-y-4">
          {questions.map((question, index) => {
            const answer = answers.find((a) => a.questionIndex === index);
            let score = 0;
            if (answer) {
              if (question.type === "MCQ") {
                score = answer.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
                  ? question.marks
                  : 0;
              } else {
                // Approximate score from feedback or recalculate
                const answerLower = answer.answer.toLowerCase();
                const keywords = question.keywords || [];
                const matched = keywords.filter((k: string) => answerLower.includes(k.toLowerCase()));
                if (question.type === "SHORT_ANSWER") {
                  score = Math.round((matched.length / keywords.length) * question.marks);
                } else {
                  const ratio = matched.length / keywords.length;
                  if (ratio >= 0.8) score = question.marks;
                  else if (ratio >= 0.5) score = Math.round(question.marks * 0.7);
                  else if (ratio >= 0.3) score = Math.round(question.marks * 0.4);
                  else score = Math.round(question.marks * 0.2);
                }
              }
            }

            const isCorrect = score === question.marks;
            const isPartial = score > 0 && score < question.marks;

            return (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base font-medium">
                        Q{index + 1}. {question.question}
                      </CardTitle>
                      <CardDescription>
                        {question.type === "MCQ"
                          ? "Multiple Choice"
                          : question.type === "SHORT_ANSWER"
                          ? "Short Answer"
                          : "Long Answer"}{" "}
                        | {question.marks} marks
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : isPartial ? (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className={`font-bold ${getScoreColor((score / question.marks) * 100)}`}>
                        {score}/{question.marks}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Your Answer:</p>
                    <p className="text-sm mt-1">{answer?.answer || "Not answered"}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Correct Answer:</p>
                    <p className="text-sm mt-1">{question.correctAnswer}</p>
                  </div>
                  {question.keywords && question.keywords.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Expected Keywords:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {question.keywords.map((keyword, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      {submission.feedback && (
        <Card>
          <CardHeader>
            <CardTitle>Feedback Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap font-sans">{submission.feedback}</pre>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center pb-8">
        <Link href="/assignments">
          <Button variant="outline">Back to Assignments</Button>
        </Link>
      </div>
    </div>
  );
}
