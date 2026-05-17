"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Loader2, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Edit3, 
  Trash2, 
  Plus, 
  Eye, 
  Settings, 
  ArrowRight,
  RefreshCw,
  Award,
  BookOpen
} from "lucide-react";
import type { AIDocumentExtraction, AIQuestion } from "@/types/ai-schemas";

interface School {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  chapter: {
    id: string;
    name: string;
    subject: {
      id: string;
      name: string;
    }
  }
}

interface Subtopic {
  id: string;
  name: string;
  topic: {
    name: string;
  }
}

export function IngestDocumentWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  // Metadata & Form Options
  const [schools, setSchools] = useState<School[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  
  // Selection State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [schoolId, setSchoolId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [grade, setGrade] = useState("10");
  const [examType, setExamType] = useState("UNIT_TEST");

  // Ingested Data State (Step 2)
  const [extraction, setExtraction] = useState<AIDocumentExtraction | null>(null);
  const [approvedQuestions, setApprovedQuestions] = useState<Record<number, boolean>>({});
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<{ questionCount: number; sourceDocumentId: string } | null>(null);

  // Load registered schools and curriculum options on mount
  useEffect(() => {
    // Fetch schools
    fetch("/api/admin/schools")
      .then((res) => res.json())
      .then((data) => setSchools(data))
      .catch((err) => console.error("Failed to load schools:", err));

    // Fetch subjects from topics API
    fetch("/api/admin/curriculum/topics")
      .then((res) => res.json())
      .then((data) => {
        const topics = data.topics as Topic[];
        const uniqueSubjects = Array.from(
          new Map(topics.map((t) => [t.chapter.subject.id, t.chapter.subject])).values()
        ).sort((a, b) => a.name.localeCompare(b.name));
        setSubjects(uniqueSubjects);
      })
      .catch((err) => console.error("Failed to load curriculum subjects:", err));
  }, []);

  // Fetch subtopics when subject matches
  useEffect(() => {
    if (!subjectId) return;
    fetch("/api/admin/curriculum/topics")
      .then((res) => res.json())
      .then((data) => {
        const topics = data.topics as Topic[];
        // Flatten or match subtopics for this subject
        // Note: For now, we will let fuzzy subtopic match run on backend,
        // but we fetch topics/subtopics to allow manual drop-downs.
      });
  }, [subjectId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds 10MB limit.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleProcessDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !schoolId || !subjectId || !grade) {
      toast.error("Please fill in all context fields and upload a file.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("schoolId", schoolId);
      formData.append("subjectId", subjectId);
      formData.append("grade", grade);

      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Extraction failed");
      }

      const data = await res.json();
      setExtraction(data.extraction);

      // Pre-select all questions by default
      const initialApproved: Record<number, boolean> = {};
      data.extraction.questions.forEach((_: any, index: number) => {
        initialApproved[index] = true;
      });
      setApprovedQuestions(initialApproved);

      toast.success("Document analyzed successfully!");
      setStep(2);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to analyze document. Please try a clearer format.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApprove = (index: number) => {
    setApprovedQuestions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleUpdateQuestion = (index: number, updated: any) => {
    if (!extraction) return;
    const questions = [...extraction.questions];
    questions[index] = updated;
    setExtraction({ ...extraction, questions });
    setEditIndex(null);
    toast.success("Question updated locally!");
  };

  const handleCommitIngested = async () => {
    if (!extraction) return;

    const questionsToCommit = extraction.questions.filter((_, idx) => approvedQuestions[idx]);
    if (questionsToCommit.length === 0) {
      toast.error("Please approve at least one question to commit.");
      return;
    }

    setCommitting(true);
    try {
      const payload = {
        schoolId,
        subjectId,
        grade,
        examType,
        extraction: {
          blueprint: extraction.blueprint,
          questions: questionsToCommit,
        },
      };

      const res = await fetch("/api/admin/ingest/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Commit failed");
      }

      const data = await res.json();
      setImportResult(data.result);
      toast.success(data.message || "Questions successfully ingested!");
      setStep(3);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to commit questions to database.");
    } finally {
      setCommitting(false);
    }
  };

  const handleRestart = () => {
    setSelectedFile(null);
    setExtraction(null);
    setApprovedQuestions({});
    setImportResult(null);
    setStep(1);
  };

  return (
    <div className="space-y-6">
      {/* Wizard Progress Stepper */}
      <div className="flex items-center justify-center max-w-xl mx-auto py-2">
        <div className="flex items-center w-full">
          <div className="flex flex-col items-center">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all ${
              step >= 1 ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" : "bg-slate-200 text-slate-500"
            }`}>
              1
            </div>
            <span className="text-xs font-semibold text-slate-700 mt-1.5">Context & Upload</span>
          </div>
          <div className={`flex-1 h-1 mx-2 rounded transition-all ${step >= 2 ? "bg-indigo-500" : "bg-slate-200"}`} />
          <div className="flex flex-col items-center">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all ${
              step >= 2 ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" : "bg-slate-200 text-slate-500"
            }`}>
              2
            </div>
            <span className="text-xs font-semibold text-slate-700 mt-1.5">Verify AI Extraction</span>
          </div>
          <div className={`flex-1 h-1 mx-2 rounded transition-all ${step >= 3 ? "bg-indigo-500" : "bg-slate-200"}`} />
          <div className="flex flex-col items-center">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all ${
              step >= 3 ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" : "bg-slate-200 text-slate-500"
            }`}>
              3
            </div>
            <span className="text-xs font-semibold text-slate-700 mt-1.5">Success Summary</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STEP 1: Upload & Context Form
          ───────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <Card className="max-w-2xl mx-auto shadow-md border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl font-heading font-bold text-slate-900 flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Upload Assessment Context
            </CardTitle>
            <CardDescription>
              Provide school details and upload a physical exam paper or worksheet to enrich the custom question bank.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProcessDocument} className="space-y-5">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">School Registry Link *</Label>
                <select
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Select Registered School...</option>
                  {schools.map((sch) => (
                    <option key={sch.id} value={sch.id}>
                      {sch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Syllabus Subject *</Label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="">Select Subject...</option>
                    {subjects.filter((sub: any) => sub.grade === grade).map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-semibold">CBSE Target Grade *</Label>
                  <select
                    value={grade}
                    onChange={(e) => {
                      setGrade(e.target.value);
                      setSubjectId("");
                    }}
                    className="w-full h-9 rounded-md border border-slate-200 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-semibold">Exam Level Blueprint *</Label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="UNIT_TEST">Unit Test (Class Test)</option>
                  <option value="HALF_YEARLY">Half Yearly (Mid Term)</option>
                  <option value="FINAL">Final Term (Annurals)</option>
                  <option value="WORKSHEET">Informal Practice Worksheet</option>
                </select>
              </div>

              {/* Drag-and-Drop Zone */}
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Source Document (PDF or Clear Image) *</Label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center bg-slate-50 hover:bg-slate-100/50 hover:border-blue-300 transition-all cursor-pointer relative group">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    required
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      <FileText className="h-6 w-6" />
                    </div>
                    {selectedFile ? (
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-slate-700 text-sm">
                          Drag & drop or <span className="text-blue-600 group-hover:underline">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports PDF, JPG, or PNG files up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 rounded-md shadow hover:opacity-90 transition-opacity"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gemini Pro is extracting questions... (may take 20-30s)
                  </>
                ) : (
                  <>
                    Analyze and Extract Questions
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 2: Review Extracted Blueprint & Questions
          ───────────────────────────────────────────────────────────── */}
      {step === 2 && extraction && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar: Extracted Exam Blueprint & Stylistic Context */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-md border-slate-200">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <CardTitle className="text-lg font-heading font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="h-4.5 w-4.5 text-blue-600" />
                  Exam Blueprint
                </CardTitle>
                <CardDescription>
                  AI-extracted structural specifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-md p-3">
                  <span className="text-sm font-semibold text-blue-800">Total Marks</span>
                  <Badge className="bg-blue-600 text-white font-bold text-sm px-2.5">
                    {extraction.blueprint.totalMarks} Marks
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paper Structure</h4>
                  <div className="divide-y divide-slate-100 bg-slate-50 border rounded-md px-3 py-1 text-sm">
                    {extraction.blueprint.sections.map((sec, idx) => (
                      <div key={idx} className="flex justify-between py-2 items-center">
                        <span className="font-semibold text-slate-800">{sec.name}</span>
                        <div className="text-xs text-slate-500">
                          {sec.count} Qs × {sec.marksPerQuestion}M
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stylistic Nuance</h4>
                  <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-md p-3 italic">
                    {extraction.blueprint.stylisticContext}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleCommitIngested}
              disabled={committing}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3 rounded-lg shadow-md hover:from-emerald-700 hover:to-teal-700 transition-all gap-2"
            >
              {committing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Committing to Registry...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Commit Approved Questions
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleRestart}
              className="w-full text-slate-600 font-semibold border-dashed"
            >
              Discard and Restart
            </Button>
          </div>

          {/* Main Panel: Ingested Questions list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-heading text-slate-900">
                Verify Extracted Questions ({extraction.questions.length})
              </h2>
              <div className="text-xs text-slate-500 font-medium">
                Verify suggested subtopic matching and contents before database sync.
              </div>
            </div>

            {extraction.questions.map((q, idx) => {
              const isApproved = approvedQuestions[idx];
              const isEditing = editIndex === idx;

              return (
                <Card 
                  key={idx} 
                  className={`border shadow-sm transition-all overflow-hidden ${
                    isApproved ? "border-slate-200" : "border-red-100 opacity-60 bg-red-50/10"
                  }`}
                >
                  <div className={`h-1.5 w-full ${isApproved ? "bg-blue-500" : "bg-red-300"}`} />
                  <CardHeader className="pb-2 pt-3 flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-semibold border-slate-300 text-slate-700 bg-slate-50">
                          Question {idx + 1}
                        </Badge>
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-semibold capitalize">
                          {q.type.toLowerCase().replace("_", " ")}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold">
                          Bloom: {q.bloomLevel}
                        </Badge>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-semibold">
                          Difficulty: {q.difficulty}/5
                        </Badge>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold">
                          {q.content.maxMarks} Marks
                        </Badge>
                      </div>

                      {/* Suggested subtopic */}
                      <div className="text-xs font-semibold text-slate-600 mt-1 flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                        Suggested Subtopic:{" "}
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold">
                          {q.suggestedSubtopicName}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        type="button"
                        variant={isApproved ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleApprove(idx)}
                        className={`h-8 font-semibold ${
                          isApproved ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-red-200 text-red-600 hover:bg-red-50"
                        }`}
                      >
                        {isApproved ? "Approved" : "Excluded"}
                      </Button>
                      {!isEditing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditIndex(idx)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-4 w-4 text-slate-500" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4 pt-1">
                    {isEditing ? (
                      /* Question Inline Editor Form */
                      <EditQuestionForm
                        question={q}
                        onSave={(updated) => handleUpdateQuestion(idx, updated)}
                        onCancel={() => setEditIndex(null)}
                      />
                    ) : (
                      /* Question Display View */
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-slate-800 bg-slate-50/50 border rounded-md p-3 leading-relaxed">
                          {q.content.question}
                        </div>

                        {/* MCQ Options */}
                        {q.content.options && q.content.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {q.content.options.map((opt, oIdx) => (
                              <div 
                                key={oIdx} 
                                className={`border rounded p-2 flex gap-2 items-center ${
                                  opt === q.content.correctAnswer 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold" 
                                    : "bg-white border-slate-200 text-slate-700"
                                }`}
                              >
                                <span className="font-extrabold uppercase text-slate-500">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-xs space-y-1.5 border-t pt-2">
                          <div className="flex gap-2">
                            <span className="font-bold text-slate-500">Correct Answer:</span>
                            <span className="text-emerald-700 font-bold font-mono">{q.content.correctAnswer}</span>
                          </div>
                          <div className="text-slate-600 italic">
                            <span className="font-bold text-slate-500 not-italic block mb-0.5">Explanation:</span>
                            {q.content.explanation}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 3: Success Curation Summary
          ───────────────────────────────────────────────────────────── */}
      {step === 3 && importResult && (
        <Card className="max-w-md mx-auto shadow-lg border-emerald-100 text-center py-8 px-6 overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="space-y-6">
            <div className="mx-auto h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
              <Award className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-heading text-slate-900">Ingestion Successful!</h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Successfully processed, verified, and cataloged curriculum questions and institutional pattern parameters.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y py-4 my-2">
              <div>
                <div className="text-3xl font-black text-emerald-600">
                  {importResult.questionCount}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5 uppercase tracking-wider">
                  Questions Saved
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-indigo-600">
                  1
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5 uppercase tracking-wider">
                  Exam Pattern Sync
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <Link href={"/admin/question-bank" as any}>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2">
                  View School Question Bank
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleRestart}
                className="w-full border-dashed gap-1 text-slate-600 font-semibold"
              >
                <RefreshCw className="h-4 w-4" />
                Upload Another Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   INLINE EDITOR SUB-FORM COMPONENT FOR QUESTION EDITS
   ───────────────────────────────────────────────────────────── */
interface EditFormProps {
  question: AIQuestion;
  onSave: (updated: AIQuestion) => void;
  onCancel: () => void;
}

function EditQuestionForm({ question, onSave, onCancel }: EditFormProps) {
  const [qText, setQText] = useState(question.content.question);
  const [ans, setAns] = useState(question.content.correctAnswer);
  const [expl, setExpl] = useState(question.content.explanation);
  const [marks, setMarks] = useState(question.content.maxMarks);
  const [bloom, setBloom] = useState(question.bloomLevel);
  const [diff, setDiff] = useState(question.difficulty);
  const [options, setOptions] = useState<string[]>(question.content.options || []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...question,
      bloomLevel: bloom as any,
      difficulty: diff,
      content: {
        ...question.content,
        question: qText,
        correctAnswer: ans,
        explanation: expl,
        maxMarks: marks,
        options: options.length > 0 ? options : undefined,
      },
    });
  };

  const handleOptionChange = (idx: number, val: string) => {
    const opts = [...options];
    opts[idx] = val;
    setOptions(opts);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 bg-slate-50 border rounded-lg p-4 mt-2">
      <div className="space-y-1">
        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Question Text</Label>
        <Textarea
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          className="min-h-[80px] bg-white border-slate-200"
          required
        />
      </div>

      {options.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">MCQ Options</Label>
          <div className="grid grid-cols-2 gap-3">
            {options.map((opt, oIdx) => (
              <div key={oIdx} className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Option {String.fromCharCode(65 + oIdx)}</span>
                <Input
                  value={opt}
                  onChange={(e) => handleOptionChange(oIdx, e.target.value)}
                  className="bg-white h-8 border-slate-200 text-xs"
                  required
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Correct Answer</Label>
          <Input
            value={ans}
            onChange={(e) => setAns(e.target.value)}
            className="bg-white h-8 border-slate-200 text-xs"
            required
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Max Marks</Label>
          <Input
            type="number"
            value={marks}
            onChange={(e) => setMarks(parseInt(e.target.value) || 1)}
            className="bg-white h-8 border-slate-200 text-xs"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bloom Level</Label>
          <select
            value={bloom}
            onChange={(e) => setBloom(e.target.value as any)}
            className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
          >
            <option value="REMEMBER">REMEMBER</option>
            <option value="UNDERSTAND">UNDERSTAND</option>
            <option value="APPLY">APPLY</option>
            <option value="ANALYZE">ANALYZE</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Difficulty Level (1-5)</Label>
          <select
            value={diff}
            onChange={(e) => setDiff(parseInt(e.target.value) || 1)}
            className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                Difficulty {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Explanation</Label>
        <Textarea
          value={expl}
          onChange={(e) => setExpl(e.target.value)}
          className="min-h-[60px] bg-white border-slate-200 text-xs"
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-8">
          Cancel
        </Button>
        <Button type="submit" size="sm" className="h-8 bg-blue-600 text-white hover:bg-blue-700">
          Save Locally
        </Button>
      </div>
    </form>
  );
}
