"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, AlertCircle } from "lucide-react";

interface Question {
  question: string;
  options?: string[];
  correctAnswer: string;
  type: "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER";
  marks: number;
  keywords?: string[];
}

export default function AssignmentForm({
  assignmentId,
  questions,
  timeLimit,
}: {
  assignmentId: string;
  questions: Question[];
  maxMarks: number;
  timeLimit: number | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, string>>({});
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

    const answersArray = Object.entries(answers).map(([index, answer]) => ({
      questionIndex: parseInt(index),
      answer,
    }));

    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersArray }),
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

  const handleTimeUp = useCallback(() => {
    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = async () => {
    setStarted(true);
    await fetch(`/api/assignments/${assignmentId}/start`, { method: "POST" });
  };

  useEffect(() => {
    if (!timeLeft || !started) return;
    if (timeLeft <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleTimeUp();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, started, handleTimeUp]);

  if (!started) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ready to Start?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p>This assignment contains:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{questions.filter((q) => q.type === "MCQ").length} Multiple Choice Questions</li>
              <li>{questions.filter((q) => q.type === "SHORT_ANSWER").length} Short Answer Questions</li>
              <li>{questions.filter((q) => q.type === "LONG_ANSWER").length} Long Answer Questions</li>
            </ul>
            {timeLimit && (
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="h-4 w-4" />
                <span>Time limit: {timeLimit} minutes</span>
              </div>
            )}
          </div>
          <Button onClick={handleStart} className="w-full" size="lg">
            Start Assignment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {timeLeft !== null && (
        <div className="sticky top-16 z-40 bg-background border rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="font-mono font-bold">
              {formatTime(timeLeft)}
            </span>
          </div>
          {timeLeft < 300 && (
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Less than 5 minutes!</span>
            </div>
          )}
        </div>
      )}

      {questions.map((question, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-base font-medium">
                Q{index + 1}. {question.question}
              </CardTitle>
              <Badge variant="secondary">{question.marks} marks</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {question.type === "MCQ" && question.options ? (
              <RadioGroup
                value={answers[index] || ""}
                onValueChange={(value) =>
                  setAnswers((prev) => ({ ...prev, [index]: value }))
                }
              >
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`q${index}-opt${optIndex}`} />
                      <Label htmlFor={`q${index}-opt${optIndex}`}>{option}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            ) : (
              <Textarea
                placeholder="Type your answer here..."
                value={answers[index] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [index]: e.target.value }))
                }
                rows={question.type === "LONG_ANSWER" ? 6 : 3}
              />
            )}
          </CardContent>
        </Card>
      ))}

      <Separator />

      <div className="flex items-center justify-between pb-8">
        <p className="text-sm text-muted-foreground">
          Answered: {Object.keys(answers).length}/{questions.length}
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
