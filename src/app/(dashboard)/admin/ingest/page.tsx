"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, CheckCircle2, AlertCircle, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AIDocumentExtraction } from "@/types/ai-schemas";

export default function AdminIngestPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Form State
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("9");
  const [selectedExamType, setSelectedExamType] = useState("UNIT_TEST");
  const [file, setFile] = useState<File | null>(null);

  // Extraction Result
  const [extraction, setExtraction] = useState<AIDocumentExtraction | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [schoolsRes, subjectsRes] = await Promise.all([
          fetch("/api/admin/schools"), // I need to create this API
          fetch("/api/subjects"), // Existing API?
        ]);
        const schoolsData = await schoolsRes.json();
        const subjectsData = await subjectsRes.json();
        setSchools(schoolsData);
        setSubjects(subjectsData);
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedSchool || !selectedSubject) {
      toast.error("Please fill all fields and select a file.");
      return;
    }

    setIsExtracting(true);
    setExtraction(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("schoolId", selectedSchool);
    formData.append("subjectId", selectedSubject);
    formData.append("grade", selectedGrade);

    try {
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Extraction failed");

      const data = await res.json();
      setExtraction(data.extraction);
      toast.success("Extraction complete! Please review the questions below.");
    } catch (error) {
      toast.error("AI failed to extract questions. Please check the file format.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCommit = async () => {
    if (!extraction) return;

    setIsCommitting(true);
    try {
      const res = await fetch("/api/admin/ingest/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: selectedSchool,
          subjectId: selectedSubject,
          grade: selectedGrade,
          examType: selectedExamType,
          extraction,
        }),
      });

      if (!res.ok) throw new Error("Commit failed");

      toast.success("Questions successfully added to the bank!");
      setExtraction(null);
      setFile(null);
    } catch (error) {
      toast.error("Failed to commit questions to the database.");
    } finally {
      setIsCommitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Content Ingestion</h1>
        <p className="text-slate-500 mt-2">Upload school assessments to enrich the question bank and optimize AI generation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <Card className="lg:col-span-1 shadow-premium h-fit">
          <CardHeader>
            <CardTitle>Source Document</CardTitle>
            <CardDescription>Select a school assessment file (PDF/Image)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="space-y-2">
                <Label>School</Label>
                <Select onValueChange={setSelectedSchool} value={selectedSchool}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select School" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Select onValueChange={setSelectedSubject} value={selectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>{subject.name} (G{subject.grade})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9">Grade 9</SelectItem>
                      <SelectItem value="10">Grade 10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select onValueChange={setSelectedExamType} value={selectedExamType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNIT_TEST">Unit Test</SelectItem>
                      <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                      <SelectItem value="FINAL">Final Exam</SelectItem>
                      <SelectItem value="WORKSHEET">Worksheet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Document File</Label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => document.getElementById("file-upload")?.click()}>
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 font-medium">
                    {file ? file.name : "Click to upload PDF/Image"}
                  </p>
                  <Input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept="application/pdf,image/*"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isExtracting}>
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Document...
                  </>
                ) : (
                  "Extract Questions"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Audit Grid */}
        <div className="lg:col-span-2 space-y-6">
          {extraction ? (
            <Card className="shadow-premium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Staging Grid</CardTitle>
                  <CardDescription>Review and correct extracted data before committing.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setExtraction(null)}>Discard</Button>
                  <Button onClick={handleCommit} disabled={isCommitting}>
                    {isCommitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Commit to Bank
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Blueprint Section */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">AI Blueprint Summary</h3>
                  <p className="text-sm text-slate-600 mb-4 italic">"{extraction.blueprint.stylisticContext}"</p>
                  <div className="flex gap-4">
                    {extraction.blueprint.sections.map((s, i) => (
                      <Badge key={i} variant="secondary" className="bg-white border-slate-200">
                        Section {s.name}: {s.count} {s.type} ({s.marksPerQuestion}M)
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Questions Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[400px]">Question Content</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Subtopic</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extraction.questions.map((q, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium align-top">
                            <div className="line-clamp-2 text-sm">{q.content.question}</div>
                            <div className="text-xs text-slate-400 mt-1">Ans: {q.content.correctAnswer}</div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline" className="text-[10px] uppercase">{q.type}</Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="text-xs font-semibold">{q.suggestedSubtopicName}</div>
                          </TableCell>
                          <TableCell className="align-top text-center">
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className={`h-1.5 w-3 rounded-full mr-0.5 ${i < q.difficulty ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right align-top">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8"><Edit3 className="h-4 w-4 text-slate-400" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No extraction data to review.</p>
              <p className="text-slate-400 text-sm">Upload a document on the left to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
