import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, Sparkles, BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getRecommendations } from "@/services/recommendation-engine";
import { RetryWeakTopicsButton } from "./retry-button";
import { PrintButton } from "@/components/print-button";

// Legacy question shape stored in Assignment.questions Json field
interface LegacyQuestion {
  question: string;
  type: "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER";
  correctAnswer: string;
  marks: number;
  keywords?: string[];
}

// Legacy answer shape stored in Submission.answers Json field
interface LegacyAnswer {
  questionIndex: number;
  answer: string;
}

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
  const [submission, recommendations] = await Promise.all([
    getSubmission(id, session.user.id),
    getRecommendations(session.user.id, 3),
  ]);

  if (!submission) {
    notFound();
  }

  const questions = submission.assignment.questions as unknown as LegacyQuestion[];
  const answers = submission.answers as unknown as LegacyAnswer[];
  const percentage = Math.round((submission.totalScore / submission.maxMarks) * 100);

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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/assignments" className="print:hidden">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Submission Result</h1>
            <p className="text-muted-foreground">{submission.assignment.title}</p>
          </div>
        </div>
        <PrintButton />
      </div>

      {/* Score Overview */}
      <Card className="bg-gradient-to-r from-primary/5 to-blue-500/5">
        <CardContent className="py-8">
          <div className="text-center">
            <p className={`text-5xl font-bold ${getScoreColor(percentage)}`}>
              {submission.totalScore}/{submission.maxMarks}
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
            <Badge variant="outline">{submission.assignment.type}</Badge>
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
          {questions.map((question: any, index: number) => {
            const answer = answers.find((a: any) => a.questionIndex === index);
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
                        {question.keywords.map((keyword: string, i: number) => (
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

      {/* AI Feedback */}
      {submission.aiFeedback && (
        <Card>
          <CardHeader>
            <CardTitle>AI Feedback Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap font-sans">{submission.aiFeedback}</pre>
          </CardContent>
        </Card>
      )}

      {/* Your Learning Path */}
      <Card className="border-amber-400/20 bg-gradient-to-br from-amber-500/5 to-transparent print:hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Your Learning Path — What to Study Next</CardTitle>
          </div>
          <CardDescription>
            Based on your mastery data, focus on these topics to improve your score.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.length === 0 ? (
            <div className="flex items-center gap-3 py-4 text-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="font-medium text-sm">Great work — no weak areas found!</p>
                <p className="text-xs text-muted-foreground">
                  Complete more assignments to get personalised recommendations.
                </p>
              </div>
            </div>
          ) : (
            recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/50"
              >
                <div
                  className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    rec.priority === "HIGH"
                      ? "bg-rose-500"
                      : rec.priority === "MEDIUM"
                      ? "bg-amber-400"
                      : "bg-blue-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rec.subtopicName}</p>
                  <p className="text-xs text-muted-foreground">
                    {rec.subjectName} · {rec.chapterName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                </div>
                {rec.type === "STUDY_MATERIAL" ? (
                  <Link href="/study-materials" className="shrink-0">
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                      <BookOpen className="h-3 w-3 mr-1" /> Study
                    </Badge>
                  </Link>
                ) : (
                  <div className="shrink-0">
                    <RetryWeakTopicsButton
                      subtopicId={rec.subtopicId}
                      subtopicName={rec.subtopicName}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pb-8 print:hidden">
        <Link href="/assignments">
          <Button variant="outline">Back to Assignments</Button>
        </Link>
        <Link href="/dashboard">
          <Button className="gap-2">
            Go to Dashboard <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
