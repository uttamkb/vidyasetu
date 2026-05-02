"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, Palette } from "lucide-react";
import { DrawingCanvas } from "@/components/drawing-canvas";

/**
 * QuestionPointer — new schema shape stored in Assignment.questions Json field.
 * Points to a Question row in the questions table.
 */
export interface QuestionPointer {
  questionId: string;
  orderIndex: number;
}

export default function AssignmentForm({
  assignmentId,
  fullQuestions,
  timeLimit,
}: {
  assignmentId: string;
  fullQuestions: Array<{ pointer: QuestionPointer, question: any }>;
  maxMarks: number;
  timeLimit: number | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showCanvas, setShowCanvas] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(timeLimit ? timeLimit * 60 : null);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const answersArray = Object.entries(answers).map(([index, answer]) => {
      const parsedIndex = parseInt(index);
      const qPointer = fullQuestions[parsedIndex]?.pointer;
      return {
        questionId: qPointer?.questionId || qPointer?.id,
        questionIndex: parsedIndex,
        userAnswer: answer,
      };
    });

    try {
      const res = await fetch(`/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, answers: answersArray }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/submissions/${data.submissionId}`);
      } else {
        alert("Failed to submit assignment");
        setSubmitting(false);
      }
    } catch {
      alert("Error submitting assignment");
      setSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    handleSubmit();
  };

  const handleStart = async () => {
    setStarted(true);
    await fetch(`/api/assignments/${assignmentId}/start`, { method: "POST" });
  };

  const handleTimeUpRef = useRef(handleTimeUp);
  handleTimeUpRef.current = handleTimeUp;

  useEffect(() => {
    if (!timeLeft || !started) return;
    if (timeLeft <= 0) {
      handleTimeUpRef.current();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, started]);

  if (!started) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ready to Start?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p>This assignment contains <strong>{fullQuestions.length}</strong> questions.</p>
            {timeLimit && (
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="h-4 w-4" />
                <span>Time limit: {timeLimit} minutes</span>
              </div>
            )}
          </div>
          <Button onClick={handleStart} className="w-full bg-primary hover:bg-primary/90 shadow-premium" size="lg">
            Start Assignment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {timeLeft !== null && (
        <div className="sticky top-4 z-40 glass rounded-xl p-4 flex items-center justify-between border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Time Remaining</p>
              <span className="font-mono text-xl font-black tabular-nums leading-none">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          {timeLeft < 300 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-600 rounded-full animate-pulse">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Closing Soon</span>
            </div>
          )}
        </div>
      )}

      {fullQuestions.map((item, index) => {
        const qData = item.question?.content;
        return (
        <Card key={item.pointer.questionId} className="border-none shadow-premium overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary/50 to-transparent" />
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-base font-medium">
                Question {index + 1}
              </CardTitle>
              <Badge variant="outline">ID: {item.pointer.questionId.slice(0, 8)}&hellip;</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {qData ? (
              <div className="mb-4">
                <p className="text-sm font-medium mb-4">{qData.question}</p>
                {qData.options && qData.options.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {qData.options.map((opt: string, i: number) => {
                      const optionLetter = String.fromCharCode(65 + i);
                      const isSelected = answers[index] === optionLetter || answers[index] === opt;
                      return (
                        <div
                          key={i}
                          onClick={() => setAnswers((prev) => ({ ...prev, [index]: optionLetter }))}
                          className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                          }`}
                        >
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium ${
                            isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"
                          }`}>
                            {optionLetter}
                          </div>
                          <span className="text-sm">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {showCanvas[index] ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Drawing Pad</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCanvas((prev) => ({ ...prev, [index]: false }))}
                          >
                            Close Canvas
                          </Button>
                        </div>
                        <DrawingCanvas 
                          initialDataUrl={answers[index]?.startsWith("data:image") ? answers[index] : undefined}
                          onDrawEnd={(dataUrl) => setAnswers((prev) => ({ ...prev, [index]: dataUrl }))} 
                        />
                      </div>
                    ) : (
                      <>
                        {answers[index]?.startsWith("data:image") ? (
                          <div className="space-y-2">
                            <img src={answers[index]} alt="Drawing" className="max-h-32 border rounded" />
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => setShowCanvas((prev) => ({ ...prev, [index]: true }))}>
                                <Palette className="h-4 w-4 mr-2" /> Edit Drawing
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setAnswers((prev) => { const next = {...prev}; delete next[index]; return next; })}>
                                Clear Answer
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <textarea
                              className="w-full border rounded-md p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                              placeholder="Type your explanation or steps here..."
                              value={answers[index] ?? ""}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [index]: e.target.value }))
                              }
                              rows={4}
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCanvas((prev) => ({ ...prev, [index]: true }))}
                              >
                                <Palette className="h-4 w-4 mr-2" /> Open Drawing Pad
                              </Button>
                              <p className="text-xs text-muted-foreground">
                                Use the drawing pad for graphs, geometry, or complex math notation.
                              </p>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
               <p className="text-sm text-red-500 mb-3">Error loading question content.</p>
            )}
          </CardContent>
        </Card>
      )})}

      <div className="flex items-center justify-between pb-8">
        <p className="text-sm text-muted-foreground">
          Answered: {Object.keys(answers).length}/{fullQuestions.length}
        </p>
        <Button
          onClick={handleSubmit}
          disabled={submitting || Object.keys(answers).length === 0}
          size="lg"
        >
          {submitting ? "Submitting..." : "Submit Assignment"}
        </Button>
      </div>
    </div>
  );
}
