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

// Evaluated answer shape stored in Submission.answers Json field
interface EvaluatedAnswer {
  questionIndex: number;
  userAnswer: string | number | null;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  feedback: string;
  correction: string;
  explanation: string;
  markingBreakdown?: Array<{
    component: string;
    marks: number;
    maxMarks: number;
    status: 'FULL' | 'PARTIAL' | 'NONE';
    reason?: string;
  }>;
}

async function getSubmission(id: string, userId: string) {
  const submission = await prisma.submission.findFirst({
    where: { id, userId },
    include: {
      assignment: {
        include: { subject: true, chapter: true },
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

  // Handle AI-generated vs Standard assignments
  const questionPointers = submission.assignment.questions as any[];
  const questionIds = questionPointers.map(q => q.questionId).filter(Boolean);

  // Fetch actual question content from DB
  const dbQuestions = await prisma.question.findMany({
    where: { id: { in: questionIds } }
  });
  const qMap = Object.fromEntries(dbQuestions.map(q => [q.id, q]));

  // Map back to ordered list
  const fullQuestions = questionPointers.map(p => {
    const q = qMap[p.questionId];
    if (!q) return null;
    return {
      ...q,
      content: q.content as any,
      orderIndex: p.orderIndex
    };
  }).filter(Boolean) as any[];

  const answers = submission.answers as unknown as EvaluatedAnswer[];
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
          {fullQuestions.map((question: any, index: number) => {
            const answer = answers.find((a: any) => a.questionId === question.id || a.questionIndex === index);
            const score = answer ? answer.marksAwarded : 0;
            const maxMarks = question.content.maxMarks || 1;

            const isCorrect = score === maxMarks;
            const isPartial = score > 0 && score < maxMarks;

            // For MCQs, find the selected option text and its label
            let studentOptionText = "";
            let studentLabel = "";
            
            if (question.type === "MCQ" && question.content.options && answer?.userAnswer) {
              const rawAns = String(answer.userAnswer);
              const options = question.content.options as string[];
              
              // Case 1: Answer is already a label (Old Style)
              if (rawAns.length === 1 && rawAns.toUpperCase() >= "A" && rawAns.toUpperCase() <= "D") {
                studentLabel = rawAns.toUpperCase();
                const optIdx = studentLabel.charCodeAt(0) - 65;
                studentOptionText = options[optIdx] || "";
              } 
              // Case 2: Answer is the full text (New Style)
              else {
                studentOptionText = rawAns;
                const optIdx = options.findIndex(opt => opt.trim().toLowerCase() === rawAns.trim().toLowerCase());
                if (optIdx !== -1) {
                  studentLabel = String.fromCharCode(65 + optIdx);
                }
              }
            }

            return (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 leading-tight">
                        Q{index + 1}. {question.content.question}
                      </CardTitle>
                      <CardDescription className="mt-1 font-medium text-slate-500">
                        {question.type === "MCQ"
                          ? "Multiple Choice"
                          : question.type === "SHORT_ANSWER"
                          ? "Short Answer"
                          : "Long Answer"}{" "}
                        | {maxMarks} marks
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
                      <span className={`font-bold ${getScoreColor((score / maxMarks) * 100)}`}>
                        {score}/{maxMarks}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 print:bg-white print:border-slate-200">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Your Answer</p>
                      <p className="text-sm font-bold text-slate-900">
                        {answer?.userAnswer 
                          ? (studentLabel ? `${studentLabel}. ${studentOptionText}` : String(answer.userAnswer)) 
                          : "Not answered"}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-green-50 border border-green-100 print:bg-white print:border-slate-200">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-green-700 mb-1">Correct Answer</p>
                      <p className="text-sm font-bold text-green-900">{question.content.correctAnswer}</p>
                    </div>
                  </div>
                  {answer?.feedback && (
                    <>
                      <Separator />
                      <div className="bg-muted/50 p-4 rounded-xl border border-primary/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-primary flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Examiner's Feedback
                          </p>
                        </div>
                        
                        <p className="text-sm italic text-muted-foreground">"{answer.feedback}"</p>

                        {/* Step-wise Breakdown */}
                        {answer.markingBreakdown && answer.markingBreakdown.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60">Marking Breakdown</p>
                            <div className="grid gap-2">
                              {answer.markingBreakdown.map((step, si) => (
                                <div key={si} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/50 text-xs">
                                  <div className="flex items-center gap-2">
                                    {step.status === 'FULL' ? (
                                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    ) : step.status === 'PARTIAL' ? (
                                      <AlertCircle className="h-3 w-3 text-yellow-500" />
                                    ) : (
                                      <XCircle className="h-3 w-3 text-red-500" />
                                    )}
                                    <span className="font-medium">{step.component}</span>
                                    {step.reason && <span className="text-muted-foreground hidden md:inline">— {step.reason}</span>}
                                  </div>
                                  <Badge variant="outline" className="font-mono text-[10px]">
                                    {step.marks}/{step.maxMarks}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4 mt-2">
                          {answer.correction && (
                            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200/50 print:border-slate-300 print:bg-white">
                              <p className="text-[11px] uppercase tracking-wider font-black text-amber-700 mb-2">Teacher's Correction</p>
                              <p className="text-sm leading-relaxed text-slate-900 font-medium">{answer.correction}</p>
                            </div>
                          )}
                          {answer.explanation && (
                            <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200/50 print:border-slate-300 print:bg-white">
                              <p className="text-[11px] uppercase tracking-wider font-black text-blue-700 mb-2">Conceptual Explanation</p>
                              <p className="text-sm leading-relaxed text-slate-900 font-medium">{answer.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
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
