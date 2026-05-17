"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, Sparkles, Video, FileText, BookOpen, Dumbbell } from "lucide-react";

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

export function UploadContentForm() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Selection State
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  
  const [type, setType] = useState("VIDEO");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [strategy, setStrategy] = useState("STANDARD");
  const [quantity, setQuantity] = useState("10");

  // Derived Lists for Cascading Selects
  const subjects = Array.from(
    new Map(topics.map((t) => [t.chapter.subject.id, t.chapter.subject])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const chapters = selectedSubjectId
    ? Array.from(
        new Map(
          topics
            .filter((t) => t.chapter.subject.id === selectedSubjectId)
            .map((t) => [t.chapter.id, t.chapter])
        ).values()
      ).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const filteredTopics = selectedChapterId
    ? topics
        .filter((t) => t.chapter.id === selectedChapterId)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Fetch topics and schools on mount
  useEffect(() => {
    fetch("/api/admin/curriculum/topics")
      .then(res => res.json())
      .then(data => setTopics(data.topics))
      .catch(err => console.error("Error loading topics:", err))
      .finally(() => setLoadingTopics(false));

    fetch("/api/admin/schools")
      .then(res => res.json())
      .then(data => setSchools(data))
      .catch(err => console.error("Error loading schools:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId || !title) {
      toast.error("Please fill in the required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = type === "QUESTIONS" ? "/api/admin/seeder/questions" : "/api/admin/content";
      const payload = type === "QUESTIONS" 
        ? { topicId: selectedTopicId, strategy, quantity: parseInt(quantity) }
        : {
            topicId: selectedTopicId,
            type,
            title,
            description,
            url: type === "VIDEO" || type === "PDF" || type === "WORKSHEET" ? url : null,
            content: type === "NOTES" ? content : null,
            schoolId: schoolId || null,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Operation failed");
      
      const data = await res.json();
      toast.success(type === "QUESTIONS" 
        ? `Successfully seeded ${data.count} questions into the bank!` 
        : "Content uploaded successfully!"
      );
      // Reset form
      setTitle("");
      setDescription("");
      setUrl("");
      setContent("");
      setSchoolId("");
    } catch (error) {
      toast.error("Failed to upload content.");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select 
                value={selectedSubjectId} 
                onValueChange={(val) => {
                  setSelectedSubjectId(val);
                  setSelectedChapterId("");
                  setSelectedTopicId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingTopics ? "Loading..." : "Select Subject"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chapter</Label>
              <Select 
                value={selectedChapterId} 
                onValueChange={(val) => {
                  setSelectedChapterId(val);
                  setSelectedTopicId("");
                }}
                disabled={!selectedSubjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedSubjectId ? "Select subject first" : "Select Chapter"} />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Topic</Label>
              <Select 
                value={selectedTopicId} 
                onValueChange={setSelectedTopicId}
                disabled={!selectedChapterId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedChapterId ? "Select chapter first" : "Select Topic"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredTopics.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Material Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "VIDEO", icon: Video, label: "Video" },
                { id: "NOTES", icon: BookOpen, label: "Notes" },
                { id: "PDF", icon: FileText, label: "PDF" },
                { id: "WORKSHEET", icon: Dumbbell, label: "Worksheet" },
                { id: "QUESTIONS", icon: Sparkles, label: "Seed Bank" },
              ].map(item => (
                <Button
                  key={item.id}
                  type="button"
                  variant={type === item.id ? "default" : "outline"}
                  className="justify-start gap-2 h-10 font-bold"
                  onClick={() => setType(item.id)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              placeholder="e.g. Introduction to Thermodynamics" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea 
              id="description" 
              placeholder="A brief overview of what this material covers..." 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="school">Specific School (Optional)</Label>
            <select
              id="school"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Global (All Schools)</option>
              {schools.map((sch) => (
                <option key={sch.id} value={sch.id}>
                  {sch.name}
                </option>
              ))}
            </select>
          </div>

          {type === "QUESTIONS" && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <h4 className="text-xs font-black uppercase tracking-widest">AI Sourcing Strategy</h4>
              </div>
              
              <div className="space-y-2">
                <Label>Question Distribution Pattern</Label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard Balanced (CBSE Pattern)</SelectItem>
                    <SelectItem value="EXAM_EXCELLENCE">
                      Exam Excellence (35% NCERT, 40% RD Sharma, 15% Comp, 10% HOTS)
                    </SelectItem>
                    <SelectItem value="COMPETENCY_FOCUS">Competency-Based Focus (50% Case/Assertion)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground italic">
                  Exam Excellence is recommended for maximum board exam relevance.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Quantity to Seed</Label>
                <Input 
                  type="number" 
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)} 
                  min="1" 
                  max="50"
                  className="bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content Specifics */}
        <div className="space-y-4 border-l pl-6">
          {type === "NOTES" ? (
            <div className="space-y-2 h-full flex flex-col">
              <Label htmlFor="content">Markdown Content</Label>
              <Textarea 
                id="content" 
                placeholder="# Heading\n\nWrite your notes here using Markdown..." 
                value={content}
                onChange={e => setContent(e.target.value)}
                className="flex-1 min-h-[300px] font-mono text-sm"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">
                  {type === "VIDEO" ? "YouTube URL" : "File URL (PDF/Direct Link)"}
                </Label>
                <div className="flex gap-2">
                  <Input 
                    id="url" 
                    placeholder={type === "VIDEO" ? "https://youtube.com/watch?v=..." : "https://example.com/file.pdf"} 
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                  />
                  {type === "VIDEO" && (
                    <Button type="button" variant="secondary" size="icon" className="shrink-0" title="Fetch Metadata with AI">
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {type === "VIDEO" && (
                  <p className="text-[10px] text-muted-foreground italic">
                    Paste a YouTube link and click the magic wand to auto-fill title/description.
                  </p>
                )}
              </div>
              
              <div className="p-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                <Upload className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-xs">Drag and drop file upload coming soon.</p>
                <p className="text-[10px] mt-1">Currently supporting URL-based links.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button disabled={submitting} size="lg" className="px-10 font-bold gap-2">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : type === "QUESTIONS" ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {type === "QUESTIONS" ? "Seed Question Bank" : "Publish Material"}
        </Button>
      </div>
    </form>
  );
}
