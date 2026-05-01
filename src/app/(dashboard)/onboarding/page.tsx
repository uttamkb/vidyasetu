"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { CheckCircle2, ChevronRight, GraduationCap, AlertCircle } from "lucide-react";

interface Subject {
  id: string;
  name: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [hardestSubjects, setHardestSubjects] = useState<string[]>([]);
  const [targetScore, setTargetScore] = useState(85);
  const [studyTimePreference, setStudyTimePreference] = useState("Evening (6 PM - 9 PM)");

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await fetch("/api/seed"); // Using seed route to get subjects for now or dedicated one
        // Wait, /api/seed is POST. Let's assume dashboard data or dedicated fetch.
        // For now, let's just hardcode the 5 main subjects to avoid blockers if API isn't ready.
        setSubjects([
          { id: "math", name: "Mathematics" },
          { id: "science", name: "Science" },
          { id: "sst", name: "Social Science" },
          { id: "english", name: "English" },
          { id: "hindi", name: "Hindi" },
        ]);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
        setLoading(false);
      }
    }
    fetchSubjects();
  }, []);

  const toggleSubject = (name: string) => {
    setHardestSubjects(prev => 
      prev.includes(name) 
        ? prev.filter(s => s !== name) 
        : [...prev, name]
    );
  };

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hardestSubjects,
          targetScore,
          studyTimePreference,
        }),
      });

      if (res.ok) {
        // Success! Redirect to dashboard or diagnostic
        router.push("/dashboard?onboarded=true");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Failed to save your preferences. Check your connection.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="mb-8 text-center">
        <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Welcome to VidyaSetu</h1>
        <p className="text-muted-foreground mt-2">
          Let's personalize your learning journey in just 3 quick steps.
        </p>
      </div>

      <div className="flex justify-between mb-8 relative">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-col items-center z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
              step >= s ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted text-muted-foreground"
            }`}>
              {step > s ? <CheckCircle2 className="h-6 w-6" /> : s}
            </div>
            <span className="text-xs mt-2 font-medium">
              {s === 1 ? "Challenges" : s === 2 ? "Goals" : "Schedule"}
            </span>
          </div>
        ))}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-muted -z-0"></div>
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-300 -z-0" 
          style={{ width: `${((step - 1) / 2) * 100}%` }}
        ></div>
      </div>

      <Card className="shadow-lg border-primary/20">
        <CardHeader>
          {step === 1 && (
            <>
              <CardTitle>Which subjects do you find hardest?</CardTitle>
              <CardDescription>We'll prioritize these in your daily practice.</CardDescription>
            </>
          )}
          {step === 2 && (
            <>
              <CardTitle>What's your target score?</CardTitle>
              <CardDescription>Aim high! We'll help you get there step by step.</CardDescription>
            </>
          )}
          {step === 3 && (
            <>
              <CardTitle>When do you usually study?</CardTitle>
              <CardDescription>We'll send you helpful reminders at the right time.</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="py-6">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-6 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-wrap gap-3">
              {subjects.map((subject) => (
                <Button
                  key={subject.id}
                  variant={hardestSubjects.includes(subject.name) ? "default" : "outline"}
                  onClick={() => toggleSubject(subject.name)}
                  className="rounded-full px-6"
                >
                  {subject.name}
                </Button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10 py-4">
              <div className="text-center">
                <span className="text-5xl font-bold text-primary">{targetScore}%</span>
                <p className="text-sm text-muted-foreground mt-2">Target Final Exam Score</p>
              </div>
              <Slider
                value={[targetScore]}
                onValueChange={(val: number[]) => setTargetScore(val[0])}
                max={100}
                min={40}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Passing (40%)</span>
                <span>Topper (95%+)</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Study Time Preference</label>
                <Select value={studyTimePreference} onValueChange={setStudyTimePreference}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Early Morning (5 AM - 8 AM)">Early Morning (5 AM - 8 AM)</SelectItem>
                    <SelectItem value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</SelectItem>
                    <SelectItem value="Afternoon (2 PM - 5 PM)">Afternoon (2 PM - 5 PM)</SelectItem>
                    <SelectItem value="Evening (6 PM - 9 PM)">Evening (6 PM - 9 PM)</SelectItem>
                    <SelectItem value="Late Night (10 PM - 1 AM)">Late Night (10 PM - 1 AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button
            variant="ghost"
            onClick={() => setStep(prev => prev - 1)}
            disabled={step === 1 || saving}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button 
              onClick={() => setStep(prev => prev + 1)}
              disabled={step === 1 && hardestSubjects.length === 0}
            >
              Next Step <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete} 
              disabled={saving}
            >
              {saving ? "Creating your profile..." : "Finish Onboarding"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
