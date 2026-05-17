"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, Palette, Printer, Camera, Upload, ArrowRight, Eye, FileText } from "lucide-react";
import { DrawingCanvas } from "@/components/drawing-canvas";
import { Question } from "@prisma/client";
import { AITutorDialog } from "./ai-tutor-dialog";
import { MathRenderer } from "@/components/math-renderer";

/**
 * QuestionPointer — new schema shape stored in Assignment.questions Json field.
 * Points to a Question row in the questions table.
 */
export interface QuestionPointer {
  questionId: string;
  orderIndex: number;
}

interface QuestionContent {
  question: string;
  options?: string[];
  maxMarks?: number;
  marks?: number;
}

const PrintPaper = ({ 
  fullQuestions, 
  assignmentId,
  title,
  subjectName
}: { 
  fullQuestions: Array<{ pointer: QuestionPointer, question: Question }>, 
  assignmentId: string,
  title?: string,
  subjectName?: string
}) => (
  <div className="hidden print:block space-y-4 p-6 bg-white text-slate-950 font-serif w-full max-w-4xl mx-auto">
    {/* Clean Academic Header */}
    <div className="border-b-2 border-slate-950 pb-4 mb-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{subjectName || "Subject"}</span>
             <span className="w-1 h-1 bg-slate-200 rounded-full" />
             <Badge variant="outline" className="text-[7px] border-slate-200 text-slate-400 font-bold px-1.5 py-0 leading-none">FLEX-SOLVE V2.1</Badge>
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">{title || "Assignment Worksheet"}</h1>
          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-2">PAPER ID: {assignmentId.slice(0, 8)}...</p>
        </div>
      </div>
    </div>

    {/* Student Best Practices Guide - More Compact */}
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Camera className="h-3 w-3 text-slate-950" />
        <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-950">Solving & Scanning Guide</h4>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-1">
          <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-200 pb-0.5 mb-1">Step 1: Solving</p>
          <ul className="text-[9px] space-y-0.5 text-slate-700 font-medium leading-tight">
            <li>• Use <span className="font-bold">Dark Blue/Black ink</span>.</li>
            <li>• Mark answers with <span className="font-bold">Q1, Q2, etc.</span></li>
          </ul>
        </div>
        <div className="space-y-1">
          <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-200 pb-0.5 mb-1">Step 2: Scanning</p>
          <ul className="text-[9px] space-y-0.5 text-slate-700 font-medium leading-tight">
            <li>• Hold camera <span className="font-bold">parallel</span> to paper.</li>
            <li>• Capture the <span className="font-bold">entire page</span> frame.</li>
          </ul>
        </div>
      </div>
    </div>
    
    {/* Question List - Compacted */}
    <div className="space-y-6 pb-10">
      {fullQuestions.map((item, index) => {
        const qContent = item.question?.content as unknown as QuestionContent;
        const isMCQ = !!qContent?.options;
        return (
          <div key={item.pointer.questionId} className="print-break-inside-avoid border-b border-slate-50 pb-4 last:border-0">
            <div className="flex items-start gap-4 mb-2">
              <div className="font-black text-lg text-slate-950 min-w-[30px]">
                {index + 1}.
              </div>
              <div className="flex-1">
                <MathRenderer content={qContent?.question || ""} className="font-bold text-sm leading-tight mb-2 text-slate-900" />
                <div className="inline-flex items-center px-1.5 py-0 bg-slate-100 text-[8px] font-black text-slate-500 uppercase tracking-widest rounded">
                  {qContent?.maxMarks || qContent?.marks || 1} Marks
                </div>
              </div>
            </div>

            {isMCQ && (
              <div className="ml-12 grid grid-cols-2 gap-x-8 gap-y-1.5">
                {qContent?.options?.map((opt: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="font-bold text-slate-400">({String.fromCharCode(65 + i)})</span>
                    <MathRenderer content={opt} className="text-slate-700 font-medium" />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
    
    {/* Clean Footer */}
    <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-[8px] font-bold text-slate-300 uppercase tracking-widest">
      <span>NCERT STANDARD AI-ASSISTED</span>
      <span>VIDYASETU V2.1</span>
    </div>
  </div>
);

function HighlightedAnswer({ text }: { text: string }) {
  if (!text || !text.includes("<mark>")) return null;
  
  return (
    <div className="mb-3 p-4 bg-amber-50/50 border-2 border-amber-200/50 rounded-2xl">
      <div className="flex items-center gap-2 mb-3 text-amber-700 text-[10px] font-black uppercase tracking-widest">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        Review Required: AI is uncertain about these parts
      </div>
      <div 
        className="text-sm leading-relaxed font-medium text-slate-700"
        dangerouslySetInnerHTML={{ 
          __html: text
            .replace(/<mark>/g, '<span class="bg-amber-200/60 text-amber-950 px-1 rounded-md border-b-2 border-amber-400 font-bold">')
            .replace(/<\/mark>/g, '</span>') 
        }} 
      />
    </div>
  );
}

const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      resolve(pdfjs);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.head.appendChild(script);
  });
};

const convertPdfToImages = async (file: File): Promise<string[]> => {
  const pdfjs = await loadPdfJs();
  if (!pdfjs) return [];
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const imageUrls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // Good resolution for OCR
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    
    await page.render({
      canvasContext: ctx!,
      viewport: viewport
    }).promise;

    // Compress to 0.7 JPEG quality
    const base64 = canvas.toDataURL("image/jpeg", 0.7);
    imageUrls.push(base64);
  }

  return imageUrls;
};

export default function AssignmentForm({
  assignmentId,
  fullQuestions,
  maxMarks,
  timeLimit,
  title,
  subjectName,
}: {
  assignmentId: string;
  fullQuestions: Array<{ pointer: QuestionPointer, question: Question }>;
  maxMarks: number;
  timeLimit: number | null;
  title?: string;
  subjectName?: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({}); // Changed to questionId-based mapping
  const [showCanvas, setShowCanvas] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(timeLimit ? timeLimit * 60 : null);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);

  // Client-side image compression to stay within Cloud Run/Next.js limits
  const compressImage = async (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        if (img.width < 800 && img.height < 600) {
          alert(`Image quality too low: ${img.width}x${img.height}. Please upload a clear photo with at least 800x600 resolution for accurate CBSE text recognition.`);
          resolve("");
          return;
        }

        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Using 0.7 quality for a good balance of size and legibility
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  // New States for Offline Flow
  const [isOfflineFlow, setIsOfflineFlow] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [scanImages, setScanImages] = useState<string[]>([]);
  const [originalAIAnswers, setOriginalAIAnswers] = useState<Record<string, string>>({});
  const [confidenceScores, setConfidenceScores] = useState<Record<string, number>>({});
  const [uncertainWords, setUncertainWords] = useState<Record<string, string[]>>({});
  const [scanError, setScanError] = useState<string | null>(null);
  const [transcribeProgress, setTranscribeProgress] = useState("Initializing transcription pipeline...");
  const scanPollerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const answersArray = fullQuestions.map((item, index) => {
      return {
        questionId: item.pointer.questionId,
        questionIndex: index,
        userAnswer: answers[item.pointer.questionId] || "",
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
        if (typeof window !== "undefined") {
          localStorage.removeItem(`draft_answers_${assignmentId}`);
        }
        
        // Capture AI validation feedback for any changed answers
        const corrections: Array<{ questionId: string; aiOutput: string; humanCorrection: string }> = [];
        Object.entries(answers).forEach(([qId, val]) => {
          const orig = originalAIAnswers[qId] || "";
          if (orig.trim() && orig.trim() !== val.trim()) {
            corrections.push({ questionId: qId, aiOutput: orig, humanCorrection: val });
          }
        });

        if (corrections.length > 0) {
          fetch("/api/self-learning/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "TRANSCRIPTION", corrections }),
          }).catch((err) => console.error("Failed to send AI transcription feedback:", err));
        }

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

  const handlePageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setScanError(null);

    // 15MB Pre-flight check
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        setScanError(`File "${file.name}" exceeds the maximum 15MB upload limit. Please upload a compressed version.`);
        return;
      }
    }

    setTranscribing(true);
    setTranscribeProgress("Compressing and preprocessing document pages...");
    
    try {
      const processedImages: string[] = [];

      for (const file of files) {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const pdfImages = await convertPdfToImages(file);
          processedImages.push(...pdfImages);
        } else if (file.type.startsWith("image/")) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          const compressed = await compressImage(base64);
          if (compressed) {
            processedImages.push(compressed);
          }
        }
      }

      if (processedImages.length === 0) {
        setScanError("No valid images or PDF pages found. Please ensure files are not corrupted.");
        setTranscribing(false);
        return;
      }

      setScanImages(processedImages);
      setTranscribeProgress(`Uploading ${processedImages.length} prepared page(s) to AI pipeline...`);

      // 2. Call Scan API
      const res = await fetch('/api/assignments/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, images: processedImages }),
      });
      
      const triggerData = await res.json();
      if (!triggerData.success || !triggerData.taskId) {
        setScanError("Failed to queue transcription background job. Please try again.");
        setTranscribing(false);
        return;
      }

      const taskId = triggerData.taskId;
      let attempts = 0;
      const MAX_ATTEMPTS = 60; // Max 3 minutes
      
      scanPollerRef.current = setInterval(async () => {
        attempts++;
        
        // Granular visual progress progression
        if (attempts <= 2) {
          setTranscribeProgress("Initializing transcription engine...");
        } else if (attempts <= 6) {
          setTranscribeProgress(`Transcribing Page 1 of ${processedImages.length} with advanced OCR...`);
        } else if (attempts <= 12 && processedImages.length >= 2) {
          setTranscribeProgress(`Transcribing Page 2 of ${processedImages.length}...`);
        } else if (attempts <= 18 && processedImages.length >= 3) {
          setTranscribeProgress(`Transcribing Page 3 of ${processedImages.length}...`);
        } else {
          setTranscribeProgress("Mapping transcribed handwriting blocks to question IDs...");
        }

        if (attempts > MAX_ATTEMPTS) {
          if (scanPollerRef.current) clearInterval(scanPollerRef.current);
          setScanError("Transcription took too long. Please ensure sheets are well-lit and upload again.");
          setTranscribing(false);
          return;
        }

        try {
          const statusRes = await fetch(`/api/assignments/scan?taskId=${taskId}`);
          const statusData = await statusRes.json();

          if (statusData.status === "COMPLETED") {
            if (scanPollerRef.current) clearInterval(scanPollerRef.current);
            setAnswers(prev => ({ ...prev, ...statusData.extractedAnswers }));
            setOriginalAIAnswers(statusData.extractedAnswers || {});
            setConfidenceScores(statusData.confidenceScores || {});
            setUncertainWords(statusData.uncertainWords || {});
            setNeedsVerification(true);
            setTranscribing(false);
          } else if (statusData.status === "FAILED") {
            if (scanPollerRef.current) clearInterval(scanPollerRef.current);
            setScanError(`Transcription failed: ${statusData.error || "Please capture your sheets under better lighting and try again."}`);
            setTranscribing(false);
          }
        } catch (err) {
          console.error("Error polling scan status:", err);
        }
      }, 3000);
    } catch (err) {
      console.error("[handlePageScan] Error:", err);
      setScanError(err instanceof Error ? err.message : "Failed to process scan. The file might be too large or corrupted.");
      setTranscribing(false);
    }
  };

  const handleStart = async (mode: "online" | "offline") => {
    if (mode === "offline") {
      setIsOfflineFlow(true);
      window.print();
    }
    setStarted(true);
    await fetch(`/api/assignments/${assignmentId}/start`, { method: "POST" });
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (!timeLeft || !started || isOfflineFlow) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, started, isOfflineFlow]);

  // Handle auto-submit on time up
  useEffect(() => {
    if (timeLeft === 0 && !isOfflineFlow && started) {
      handleSubmit();
    }
  }, [timeLeft, isOfflineFlow, started]);

  // Load draft answers from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`draft_answers_${assignmentId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            setAnswers(parsed);
          }
        } catch (err) {
          console.error("Failed to parse draft answers from localStorage:", err);
        }
      }
    }
  }, [assignmentId]);

  // Save draft answers to localStorage when answers change
  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(answers).length > 0) {
      localStorage.setItem(`draft_answers_${assignmentId}`, JSON.stringify(answers));
    }
  }, [answers, assignmentId]);

  // Clean up active scan poller on unmount
  useEffect(() => {
    return () => {
      if (scanPollerRef.current) {
        clearInterval(scanPollerRef.current);
      }
    };
  }, []);

  const handleFileUpload = (questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      let content = reader.result as string;
      // Compress if it's an image
      if (file.type.startsWith('image/')) {
        content = await compressImage(content);
      }
      setAnswers((prev) => ({ ...prev, [questionId]: content }));
    };
    reader.readAsDataURL(file);
  };

  // Verification Screen
  if (needsVerification) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {/* Left Side: Original Scan Viewer */}
        <Card className="no-print border-primary/20 shadow-2xl flex flex-col h-[85vh]">
          <CardHeader className="bg-primary/5 border-b pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Original Answer Sheets
            </CardTitle>
            <CardDescription>
              Refer to your uploaded papers on the left to verify the text on the right.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-6 bg-muted/20 space-y-6 flex flex-col items-center justify-start">
            {scanImages.length > 0 ? (
              scanImages.map((img, idx) => (
                <div key={idx} className="relative group border shadow-md rounded-xl bg-white p-2 w-full max-w-md">
                  <div className="absolute top-3 left-3 bg-black/60 text-white font-bold text-xs px-2.5 py-1 rounded-full backdrop-blur-sm z-10">
                    Page {idx + 1}
                  </div>
                  <img
                    src={img}
                    alt={`Scanned page ${idx + 1}`}
                    className="w-full h-auto rounded-lg object-contain select-none"
                  />
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground my-auto space-y-2">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 animate-pulse" />
                <p className="font-semibold text-sm">No page scans found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Side: Verification Editor */}
        <Card className="no-print border-primary/20 shadow-2xl flex flex-col h-[85vh]">
          <CardHeader className="bg-primary/5 pb-6 border-b">
            <CardTitle className="text-xl flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Verify Extracted Answers
            </CardTitle>
            <CardDescription>
              Check the text below and fix any typos before final evaluation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-6 p-6">
            {fullQuestions.map((item, index) => {
              const qId = item.pointer.questionId;
              const confidence = confidenceScores[qId];
              const smudges = uncertainWords[qId] || [];

              let confidenceBadge = null;
              if (typeof confidence === 'number') {
                if (confidence >= 85) {
                  confidenceBadge = (
                    <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 border-emerald-500/20 text-[10px] font-bold">
                      Confidence: {confidence}%
                    </Badge>
                  );
                } else if (confidence >= 60) {
                  confidenceBadge = (
                    <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 border-amber-500/20 text-[10px] font-bold">
                      Confidence: {confidence}%
                    </Badge>
                  );
                } else {
                  confidenceBadge = (
                    <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/15 border-destructive/20 text-[10px] font-bold animate-pulse">
                      Needs Review ({confidence}%)
                    </Badge>
                  );
                }
              }

              return (
                <div key={qId} className="space-y-3 p-5 border-2 rounded-xl bg-muted/30 transition-colors hover:bg-muted/50">
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-primary">Question {index + 1}</p>
                      {confidenceBadge}
                    </div>
                    <Badge variant="outline" className="text-[10px]">{item.question?.type || "SUBJECTIVE"}</Badge>
                  </div>
                  <MathRenderer 
                    content={(item.question?.content as any)?.question || ""} 
                    className="text-xs font-medium text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-3" 
                  />
                  <textarea
                    className="w-full border-2 rounded-lg p-4 text-sm font-medium focus:ring-2 focus:ring-primary/50 transition-all shadow-inner"
                    value={answers[qId] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [qId]: e.target.value }))}
                    rows={3}
                    placeholder="AI could not read this answer. Please type it manually..."
                  />
                  {smudges.length > 0 && (
                    <div className="flex items-start gap-2 text-xs font-medium text-amber-700 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                      <span className="mt-0.5">⚠️</span>
                      <span>
                        Uncertain words detected: <strong className="underline">{smudges.join(", ")}</strong>. Please verify their spelling in your answer.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
          <div className="p-6 border-t bg-muted/10 flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => {
                if (confirm("Are you sure you want to discard this scan and upload new files? This will reset the verification screen.")) {
                  setNeedsVerification(false);
                  setOriginalAIAnswers({});
                  setConfidenceScores({});
                  setUncertainWords({});
                }
              }} 
              className="py-8 px-6 font-bold border-2 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-all text-sm uppercase tracking-wider"
              disabled={submitting}
            >
              Re-Scan
            </Button>
            <Button onClick={handleSubmit} className="flex-1 py-8 text-xl font-black shadow-premium group" disabled={submitting}>
              {submitting ? "Analyzing Answers..." : "Confirm & Get Result"}
              <ArrowRight className="h-6 w-6 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Start Screen
  if (!started) {
    return (
      <>
        <PrintPaper 
          fullQuestions={fullQuestions} 
          assignmentId={assignmentId} 
          title={title}
          subjectName={subjectName}
        />

        {/* Start Screen Card */}
        <Card className="no-print border-none shadow-2xl overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-primary via-amber-400 to-primary" />
          <CardHeader className="text-center pb-2 pt-8">
            <CardTitle className="text-3xl font-black">Choose Practice Mode</CardTitle>
            <CardDescription className="text-base">
              Select how you want to solve these {fullQuestions.length} questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Online Path */}
              <div 
                onClick={() => handleStart("online")}
                className="group relative p-6 border-2 rounded-2xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Palette className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Practice Online</h3>
                    <p className="text-sm text-muted-foreground">Solve using drawing pad and interactive tools.</p>
                  </div>
                </div>
              </div>

              {/* Offline Path */}
              <div 
                onClick={() => handleStart("offline")}
                className="group relative p-6 border-2 border-amber-200 bg-amber-50/30 rounded-2xl cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all"
              >
                <div className="absolute -top-3 right-4">
                   <Badge className="bg-amber-400 text-amber-950 font-black border-none px-3 py-1">RECOMMENDED</Badge>
                </div>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Printer className="h-8 w-8 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Practice on Paper</h3>
                    <p className="text-sm text-muted-foreground">Print worksheet. Solve on any paper. Scan to grade.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
               <Clock className="h-4 w-4" />
               <span>Time limit: {timeLimit || "Unlimited"} minutes</span>
               <span>•</span>
               <span>Goal: {fullQuestions.length} Correct Answers</span>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  // Active Test (Online or Scan Phase)
  return (
    <div className="space-y-4">
      <PrintPaper 
        fullQuestions={fullQuestions} 
        assignmentId={assignmentId} 
        title={title}
        subjectName={subjectName}
      />
      {/* Print Styles */}
      <style jsx global>{`
        @page {
          size: A4;
          margin: 15mm 15mm 20mm 15mm;
        }
        @media print {
          /* Hide all dashboard chrome */
          nav, aside, footer, header, .no-print, button, .sticky, .badge, [role="navigation"], [role="banner"], .glass { 
            display: none !important; 
          }
          
          body { 
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            color: black !important;
            width: 100% !important;
          }

          main, .container { 
            margin: 0 !important; 
            padding: 0 !important; 
            max-width: 100% !important;
            width: 100% !important;
          }

          .card { border: none !important; box-shadow: none !important; margin: 0 !important; }
          .card-content { padding: 0 !important; }
          
          /* CRITICAL: Force questions to stay together */
          .print-break-inside-avoid { 
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            /* Webkit/Blink hack: inline-block or table forces strict block preservation */
            display: inline-block !important;
            width: 100% !important;
            position: relative !important;
            margin-bottom: 2rem !important;
            clear: both !important;
          }
          
          /* Prevent header overlap */
          .print-header {
            margin-bottom: 3rem !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>

      {/* Timer (Online Mode Only) */}
      {!isOfflineFlow && timeLeft !== null && (
        <div className="sticky top-4 z-40 glass rounded-xl p-4 flex items-center justify-between border-primary/10 no-print shadow-xl">
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

      {/* Offline Instructions / Upload Flow */}
      {isOfflineFlow ? (
        <Card className="no-print border-amber-200 bg-amber-50/20 shadow-lg overflow-hidden">
           <div className="h-1.5 w-full bg-amber-400" />
           <CardHeader>
              <CardTitle className="flex items-center gap-3">
                 <Printer className="h-6 w-6 text-amber-600" />
                 Active Offline Practice Session
              </CardTitle>
              <CardDescription>
                You should be writing your answers on the printed paper. When you are done, scan your pages below.
              </CardDescription>
           </CardHeader>
           <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-amber-300 rounded-2xl bg-white/50">
                  {scanError ? (
                     <div className="flex flex-col items-center space-y-4 max-w-md text-center px-6">
                        <div className="p-3 bg-red-100 rounded-full text-red-600">
                           <AlertCircle className="h-8 w-8 animate-bounce" />
                        </div>
                        <h4 className="font-bold text-lg text-red-900">Scan Analysis Unsuccessful</h4>
                        <p className="text-sm text-red-600 leading-relaxed">
                           {scanError}
                        </p>
                        <div className="flex gap-3 pt-2">
                           <Button 
                             onClick={() => setScanError(null)} 
                             variant="outline" 
                             className="border-red-200 text-red-700 hover:bg-red-50 font-bold"
                           >
                             Capture Again
                           </Button>
                           <Button 
                             onClick={() => {
                               setScanError(null);
                               setIsOfflineFlow(false);
                               setStarted(false);
                             }} 
                             variant="secondary"
                             className="font-bold"
                           >
                             Choose Mode
                           </Button>
                        </div>
                     </div>
                  ) : transcribing ? (
                     <div className="flex flex-col items-center space-y-4">
                        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        <p className="font-bold text-amber-900">Analyzing your paper with AI...</p>
                        <p className="text-xs text-amber-600 font-medium px-4 text-center animate-pulse">{transcribeProgress}</p>
                     </div>
                 ) : (
                    <>
                       <div className="p-4 bg-amber-100 rounded-full mb-4">
                          <Camera className="h-10 w-10 text-amber-600" />
                       </div>
                       <h4 className="text-xl font-black text-amber-900 mb-2">Scan Your Answers</h4>
                        <p className="text-sm text-amber-700 text-center max-w-sm mb-6">
                          Take clear photos or upload a PDF of all your answer sheets. Ensure question numbers (e.g., Q1, Ans 2) are clearly visible.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <Button 
                              variant="outline"
                              onClick={() => window.print()}
                              className="border-amber-200 text-amber-700 hover:bg-amber-50 font-bold px-8 py-6 rounded-xl"
                            >
                               <Printer className="h-5 w-5 mr-2" /> Print Paper
                            </Button>

                            <div className="relative">
                               <input
                                 type="file"
                                 multiple
                                 accept="image/*,.pdf,application/pdf"
                                 capture="environment"
                                 className="absolute inset-0 opacity-0 cursor-pointer"
                                 onChange={handlePageScan}
                               />
                               <Button className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-6 rounded-xl shadow-lg">
                                  <Upload className="h-5 w-5 mr-2" /> Upload Pages / PDF
                               </Button>
                            </div>
                         </div>
                    </>
                 )}
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-amber-700">
                 <p>Tip: Ensure good lighting for higher transcription accuracy.</p>
                 <Button variant="ghost" size="sm" onClick={() => setIsOfflineFlow(false)}>Switch to Online Mode</Button>
              </div>
           </CardContent>
        </Card>
      ) : (
        /* Online Question Cards */
        <>
          {fullQuestions.map((item, index) => {
            const qData = item.question?.content as unknown as QuestionContent;
            const qId = item.pointer.questionId;
            return (
              <Card key={qId} className="border-none shadow-premium overflow-hidden no-print">
                <div className="h-1 w-full bg-gradient-to-r from-primary/50 to-transparent" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-medium">
                        Question {index + 1}
                      </CardTitle>
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-bold">
                        {qData?.maxMarks || qData?.marks || 1} { (qData?.maxMarks || qData?.marks || 1) === 1 ? 'Mark' : 'Marks' }
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">ID: {qId.slice(0, 8)}&hellip;</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {qData ? (
                    <div className="mb-4">
                      <MathRenderer content={qData.question} className="text-sm font-medium mb-4 leading-relaxed" />
                      {qData.options && qData.options.length > 0 ? (
                        <div className="space-y-2 mb-3">
                          {qData.options.map((opt: string, i: number) => {
                            const optionLetter = String.fromCharCode(65 + i);
                            const isSelected = answers[qId] === optionLetter || answers[qId] === opt;
                            return (
                              <div
                                key={i}
                                onClick={() => setAnswers((prev) => ({ ...prev, [qId]: optionLetter }))}
                                className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                                  isSelected ? "bg-primary/10 border-primary shadow-sm" : "hover:bg-muted/50 border-transparent bg-muted/30"
                                }`}
                              >
                                <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-black transition-colors ${
                                  isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-muted"
                                }`}>
                                  {optionLetter}
                                </div>
                                <MathRenderer content={opt} className="text-sm font-medium" />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {showCanvas[index] ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold">Drawing Pad</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowCanvas((prev) => ({ ...prev, [index]: false }))}
                                >
                                  Close Canvas
                                </Button>
                              </div>
                              <DrawingCanvas 
                                initialDataUrl={answers[qId]?.startsWith("data:image") ? answers[qId] : undefined}
                                onDrawEnd={(dataUrl) => setAnswers((prev) => ({ ...prev, [qId]: dataUrl }))} 
                              />
                            </div>
                          ) : (
                            <>
                              {answers[qId]?.startsWith("data:image") ? (
                                <div className="space-y-3">
                                  <div className="relative group max-w-sm rounded-xl overflow-hidden border-2 border-primary/20 shadow-md">
                                    <img src={answers[qId]} alt="Answer Draft" className="w-full object-contain" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                       <Button variant="secondary" size="sm" onClick={() => setAnswers((prev) => { const next = {...prev}; delete next[qId]; return next; })}>
                                          Replace Answer
                                       </Button>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setShowCanvas((prev) => ({ ...prev, [index]: true }))}>
                                      <Palette className="h-4 w-4 mr-2" /> Edit Drawing
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <HighlightedAnswer text={answers[qId] ?? ""} />
                                  <textarea
                                    className="w-full border-2 border-muted bg-muted/10 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium leading-relaxed"
                                    placeholder="Type your explanation, formula steps, or reasoning here..."
                                    value={answers[qId] ?? ""}
                                    onChange={(e) =>
                                      setAnswers((prev) => ({ ...prev, [qId]: e.target.value }))
                                    }
                                    rows={5}
                                  />
                                  {answers[qId]?.includes("<mark>") && (
                                    <div className="flex justify-end -mt-10 mr-4 relative z-10">
                                       <Button 
                                         variant="secondary" 
                                         size="xs" 
                                         className="h-7 text-[10px] font-bold bg-white/80 backdrop-blur shadow-sm hover:bg-white"
                                         onClick={() => setAnswers(prev => ({ ...prev, [qId]: prev[qId].replace(/<\/?mark>/g, "") }))}
                                       >
                                         Clear AI Tags
                                       </Button>
                                    </div>
                                  )}
                                   <div className="flex flex-wrap items-center gap-3">
                                     <Button
                                       type="button"
                                       variant="outline"
                                       size="sm"
                                       className="rounded-lg h-9 border-primary/30 text-primary hover:bg-primary/5"
                                       onClick={() => setShowCanvas((prev) => ({ ...prev, [index]: true }))}
                                     >
                                       <Palette className="h-4 w-4 mr-2" /> Open Drawing Pad
                                     </Button>
                                     
                                     <div className="relative">
                                       <input
                                         type="file"
                                         accept="image/*,.pdf,application/pdf"
                                         capture="environment"
                                         className="absolute inset-0 opacity-0 cursor-pointer"
                                         onChange={(e) => handleFileUpload(qId, e)}
                                       />
                                       <Button
                                         type="button"
                                         variant="outline"
                                         size="sm"
                                         className="rounded-lg h-9"
                                       >
                                         <Camera className="h-4 w-4 mr-2" /> Photo or PDF
                                       </Button>
                                     </div>

                                     <AITutorDialog 
                                       questionId={qId} 
                                       questionText={qData.question} 
                                     />
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
            );
          })}

          <div className="flex items-center justify-between py-10 no-print">
            <div className="flex items-center gap-2">
               <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center font-black text-primary">
                  {Math.round((Object.keys(answers).length / fullQuestions.length) * 100)}%
               </div>
               <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Progress</p>
                  <p className="text-sm font-bold">{Object.keys(answers).length} of {fullQuestions.length} Answered</p>
               </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || Object.keys(answers).length === 0}
              size="lg"
              className="px-10 py-7 text-xl font-black shadow-premium group"
            >
              {submitting ? "Evaluating..." : "Finish Assignment"}
              <ArrowRight className="h-6 w-6 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
