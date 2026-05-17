"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  HelpCircle, 
  School, 
  Sparkles, 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight,
  Eye,
  Filter,
  RefreshCw,
  MapPin,
  ChevronLeft,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuestionItem {
  id: string;
  type: string;
  bloomLevel: string;
  difficulty: number;
  content: {
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    maxMarks: number;
    keyPoints?: string[];
  };
  source: string;
  verifiedByHuman: boolean;
  schoolId: string | null;
  school?: {
    name: string;
  } | null;
  subtopic: {
    name: string;
    topic: {
      name: string;
      chapter: {
        name: string;
        subject: {
          name: string;
        }
      }
    }
  };
  createdAt: string;
}

export default function QuestionBankDashboard() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedBloom, setSelectedBloom] = useState("");
  const [selectedDiff, setSelectedDiff] = useState("");
  const [selectedSource, setSelectedSource] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Metrics State
  const [metrics, setMetrics] = useState({
    totalCount: 0,
    curatedCount: 0,
    aiGeneratedCount: 0,
    schoolSpecificCount: 0,
  });

  // Modal / Detail State
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);

  // Fetch initial schools & subjects
  useEffect(() => {
    fetch("/api/admin/schools")
      .then((res) => res.json())
      .then((data) => setSchools(data))
      .catch((err) => console.error(err));

    fetch("/api/admin/curriculum/topics")
      .then((res) => res.json())
      .then((data) => {
        const topics = data.topics || [];
        const uniqueSubjects = Array.from(
          new Map(topics.map((t: any) => [t.chapter.subject.id, t.chapter.subject])).values()
        ).sort((a: any, b: any) => a.name.localeCompare(b.name));
        setSubjects(uniqueSubjects as any);
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch questions on filter or page change
  const fetchQuestions = () => {
    setLoading(true);
    const query = new URLSearchParams({
      page: String(page),
      limit: "10",
      search,
      schoolId: selectedSchoolId,
      subjectId: selectedSubjectId,
      grade: selectedGrade,
      bloomLevel: selectedBloom,
      difficulty: selectedDiff,
      source: selectedSource,
    });

    fetch(`/api/admin/question-bank?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data.questions || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      })
      .catch((err) => console.error("Error loading question bank:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
  }, [page, selectedSchoolId, selectedSubjectId, selectedGrade, selectedBloom, selectedDiff, selectedSource]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedSchoolId("");
    setSelectedGrade("");
    setSelectedSubjectId("");
    setSelectedBloom("");
    setSelectedDiff("");
    setSelectedSource("");
    setPage(1);
  };

  // Badge render helpers
  const getBloomBadge = (level: string) => {
    const variants: Record<string, string> = {
      REMEMBER: "bg-blue-50 text-blue-700 border-blue-200",
      UNDERSTAND: "bg-purple-50 text-purple-700 border-purple-200",
      APPLY: "bg-emerald-50 text-emerald-700 border-emerald-200",
      ANALYZE: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return (
      <Badge className={`${variants[level] || "bg-slate-50 text-slate-700"} border font-semibold text-xs`}>
        {level}
      </Badge>
    );
  };

  const getSourceBadge = (src: string) => {
    return src === "curated" ? (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Source-Aligned
      </Badge>
    ) : (
      <Badge className="bg-violet-50 text-violet-700 border border-violet-200 font-bold text-xs gap-1">
        <Sparkles className="h-3 w-3 animate-pulse" />
        AI-Generated
      </Badge>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight text-slate-900 flex items-center gap-2">
          <Layers className="h-8 w-8 text-blue-600" />
          Question Bank Audit
        </h1>
        <p className="text-muted-foreground mt-1">
          Perform quality audits on school-specific assessment pools, align curriculum coverage, and monitor generative growth.
        </p>
      </div>

      {/* Metrics Summary Rows */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Questions</span>
              <div className="text-3xl font-black text-slate-950">{metrics.totalCount}</div>
            </div>
            <div className="h-10 w-10 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center">
              <HelpCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Source-Aligned</span>
              <div className="text-3xl font-black text-emerald-700">{metrics.curatedCount}</div>
            </div>
            <div className="h-10 w-10 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI-Generated</span>
              <div className="text-3xl font-black text-violet-700">{metrics.aiGeneratedCount}</div>
            </div>
            <div className="h-10 w-10 bg-violet-50 text-violet-700 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">School Custom Pool</span>
              <div className="text-3xl font-black text-amber-700">{metrics.schoolSpecificCount}</div>
            </div>
            <div className="h-10 w-10 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center">
              <School className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Workspace */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Fuzzy search inside question body text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
            <Button type="submit" className="bg-blue-600 text-white font-semibold gap-2 shadow hover:bg-blue-700">
              <Filter className="h-4 w-4" />
              Search
            </Button>
          </form>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">School Context</label>
              <select
                value={selectedSchoolId}
                onChange={(e) => { setSelectedSchoolId(e.target.value); setPage(1); }}
                className="w-full h-8 rounded border border-slate-200 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Schools</option>
                {schools.map((sch) => (
                  <option key={sch.id} value={sch.id}>{sch.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Target Grade</label>
              <select
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setSelectedSubjectId("");
                  setPage(1);
                }}
                className="w-full h-8 rounded border border-slate-200 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Grades</option>
                <option value="8">Grade 8</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Syllabus Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => { setSelectedSubjectId(e.target.value); setPage(1); }}
                className="w-full h-8 rounded border border-slate-200 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Subjects</option>
                {(selectedGrade
                  ? subjects.filter((sub: any) => sub.grade === selectedGrade)
                  : subjects
                ).map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {selectedGrade ? sub.name : `${sub.name} (G${sub.grade} - ${sub.board})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Bloom taxonomy</label>
              <select
                value={selectedBloom}
                onChange={(e) => { setSelectedBloom(e.target.value); setPage(1); }}
                className="w-full h-8 rounded border border-slate-200 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Bloom Levels</option>
                <option value="REMEMBER">REMEMBER</option>
                <option value="UNDERSTAND">UNDERSTAND</option>
                <option value="APPLY">APPLY</option>
                <option value="ANALYZE">ANALYZE</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Difficulty Curve</label>
              <select
                value={selectedDiff}
                onChange={(e) => { setSelectedDiff(e.target.value); setPage(1); }}
                className="w-full h-8 rounded border border-slate-200 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Difficulties</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>Level {n}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Sourcing Origin</label>
              <select
                value={selectedSource}
                onChange={(e) => { setSelectedSource(e.target.value); setPage(1); }}
                className="w-full h-8 rounded border border-slate-200 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Origins</option>
                <option value="curated">Source-Aligned</option>
                <option value="ai_generated">AI-Generated</option>
              </select>
            </div>
          </div>

          {(search || selectedSchoolId || selectedGrade || selectedSubjectId || selectedBloom || selectedDiff || selectedSource) && (
            <div className="flex justify-end pt-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFilters}
                className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Results Table */}
      <Card className="shadow-md border-slate-200 overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            {loading ? (
              <div className="p-20 text-center text-slate-500 font-semibold flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                Fetching custom aligned question banks...
              </div>
            ) : (
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/75">
                    <th className="h-12 px-4 text-left align-middle font-semibold text-slate-700">Question Body</th>
                    <th className="h-12 px-4 text-left align-middle font-semibold text-slate-700">Aligned Topic</th>
                    <th className="h-12 px-4 text-left align-middle font-semibold text-slate-700">School Scope</th>
                    <th className="h-12 px-4 text-left align-middle font-semibold text-slate-700">Sourcing Origin</th>
                    <th className="h-12 px-4 text-center align-middle font-semibold text-slate-700">Parameters</th>
                    <th className="h-12 px-4 text-center align-middle font-semibold text-slate-700 w-16">Review</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0 bg-white">
                  {questions.map((q) => (
                    <tr key={q.id} className="border-b transition-colors hover:bg-slate-50/50">
                      <td className="p-4 align-middle max-w-sm">
                        <div className="font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                          {q.content.question}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-1">{q.id}</div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="font-bold text-slate-800 text-xs">
                          {q.subtopic.topic.chapter.subject.name}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-medium leading-tight">
                          {q.subtopic.topic.name} → {q.subtopic.name}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        {q.school ? (
                          <div className="flex items-center gap-1 text-slate-700 font-semibold text-xs bg-slate-100 border rounded-md px-2 py-0.5 w-fit">
                            <MapPin className="h-3 w-3 text-rose-500" />
                            <span className="truncate max-w-[120px]">{q.school.name}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="font-semibold border-slate-200 text-slate-500">
                            Global
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 align-middle">{getSourceBadge(q.source)}</td>
                      <td className="p-4 align-middle text-center">
                        <div className="flex flex-col items-center gap-1">
                          {getBloomBadge(q.bloomLevel)}
                          <div className="flex gap-1.5 text-[10px] font-bold text-slate-500">
                            <span>Diff: {q.difficulty}/5</span>
                            <span>•</span>
                            <span>{q.content.maxMarks}M</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-middle text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedQuestion(q)}
                          className="h-8 w-8 p-0 hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {questions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-16 text-center text-slate-500 font-semibold">
                        No questions registered matching the filter pool.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-500">
            Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, totalCount)} of {totalCount} Questions
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-8 px-2.5 font-bold text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-0.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8 px-2.5 font-bold text-xs"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-0.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ROW EXPAND PREVIEW DIALOG MODAL
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        {selectedQuestion && (
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b pb-3 bg-slate-50/50 -mx-6 px-6 -mt-6 pt-6">
              <DialogTitle className="text-lg font-heading font-black text-slate-900 flex items-center justify-between">
                <span>Auditing Question Details</span>
                <div className="flex items-center gap-1.5">
                  {getSourceBadge(selectedQuestion.source)}
                  {getBloomBadge(selectedQuestion.bloomLevel)}
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Question Text block */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Question Context</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-semibold text-slate-800 leading-relaxed text-sm">
                  {selectedQuestion.content.question}
                </div>
              </div>

              {/* MCQ Options keys */}
              {selectedQuestion.content.options && selectedQuestion.content.options.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Option Answers</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedQuestion.content.options.map((opt, oIdx) => (
                      <div 
                        key={oIdx} 
                        className={`border rounded p-2.5 flex gap-2 items-center ${
                          opt === selectedQuestion.content.correctAnswer 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold" 
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className="font-extrabold uppercase text-slate-400">
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer & Rationale explanation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Correct Target Answer</h4>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2.5 text-xs font-bold text-emerald-800 font-mono">
                    {selectedQuestion.content.correctAnswer}
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Parameters & Marks</h4>
                  <div className="bg-slate-50 border rounded-md p-2.5 text-xs font-bold text-slate-700">
                    Difficulty: Level {selectedQuestion.difficulty}/5 • Value: {selectedQuestion.content.maxMarks} Marks
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 border-t pt-4">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Analysis & Explanation</h4>
                <div className="text-xs text-slate-700 bg-slate-50 border rounded-lg p-3.5 leading-relaxed italic">
                  {selectedQuestion.content.explanation}
                </div>
              </div>

              {/* Syllabus Context */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3.5 text-xs text-blue-900 flex flex-col gap-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  Syllabus Mapping alignment
                </div>
                <div className="font-medium text-blue-800">
                  {selectedQuestion.subtopic.topic.chapter.subject.name} &gt; {selectedQuestion.subtopic.topic.name} &gt; {selectedQuestion.subtopic.name}
                </div>
                {selectedQuestion.school && (
                  <div className="text-[10px] font-bold text-blue-700 mt-1 uppercase tracking-wider flex items-center gap-1">
                    <School className="h-3.5 w-3.5" />
                    Limited Scope: {selectedQuestion.school.name}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button onClick={() => setSelectedQuestion(null)} className="bg-slate-800 text-white font-semibold hover:bg-slate-900">
                Close Audit Preview
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
