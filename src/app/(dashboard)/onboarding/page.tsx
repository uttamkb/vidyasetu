"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { CheckCircle2, ChevronRight, GraduationCap, AlertCircle, MapPin } from "lucide-react";

// Complete list of Indian states + UTs
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // UTs
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const SUBJECTS = [
  { id: "math", name: "Mathematics" },
  { id: "science", name: "Science" },
  { id: "sst", name: "Social Science" },
  { id: "english", name: "English" },
  { id: "hindi", name: "Hindi" },
];

const TOTAL_STEPS = 4;

const STEP_LABELS = ["Location", "Challenges", "Goals", "Schedule"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Location
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [school, setSchool] = useState("");

  // Step 2: Challenges
  const [hardestSubjects, setHardestSubjects] = useState<string[]>([]);

  // Step 3: Goals
  const [targetScore, setTargetScore] = useState(85);

  // Step 4: Schedule
  const [studyTimePreference, setStudyTimePreference] = useState("Evening (6 PM - 9 PM)");

  const toggleSubject = (name: string) => {
    setHardestSubjects(prev =>
      prev.includes(name)
        ? prev.filter(s => s !== name)
        : [...prev, name]
    );
  };

  const canProceed = () => {
    if (step === 1) return state.trim().length > 0;
    if (step === 2) return hardestSubjects.length > 0;
    return true;
  };

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: state.trim(),
          district: district.trim() || undefined,
          school: school.trim() || undefined,
          hardestSubjects,
          targetScore,
          studyTimePreference,
        }),
      });

      if (res.ok) {
        router.push("/dashboard?onboarded=true");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Failed to save your preferences. Check your connection.");
    } finally {
      setSaving(false);
    }
  };

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="mb-8 text-center">
        <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Welcome to VidyaSetu</h1>
        <p className="text-muted-foreground mt-2">
          Let&apos;s personalize your learning journey in just {TOTAL_STEPS} quick steps.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex justify-between mb-8 relative">
        {STEP_LABELS.map((label, i) => {
          const s = i + 1;
          return (
            <div key={s} className="flex flex-col items-center z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                step > s
                  ? "bg-primary border-primary text-primary-foreground"
                  : step === s
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-background border-muted text-muted-foreground"
              }`}>
                {step > s ? <CheckCircle2 className="h-6 w-6" /> : s}
              </div>
              <span className="text-xs mt-2 font-medium hidden sm:block">{label}</span>
            </div>
          );
        })}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-muted -z-0" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-300 -z-0"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <Card className="shadow-lg border-primary/20">
        <CardHeader>
          {step === 1 && (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle>Where are you studying from?</CardTitle>
              </div>
              <CardDescription>
                This helps us rank you against students in your state, district, and school.
              </CardDescription>
            </>
          )}
          {step === 2 && (
            <>
              <CardTitle>Which subjects do you find hardest?</CardTitle>
              <CardDescription>We'll prioritize these in your daily practice.</CardDescription>
            </>
          )}
          {step === 3 && (
            <>
              <CardTitle>What's your target score?</CardTitle>
              <CardDescription>Aim high! We'll help you get there step by step.</CardDescription>
            </>
          )}
          {step === 4 && (
            <>
              <CardTitle>When do you usually study?</CardTitle>
              <CardDescription>We'll send you helpful reminders at the right time.</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="py-6">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-6 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Step 1 — Location */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="state">
                  State <span className="text-destructive">*</span>
                </Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select your state or UT" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">District <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="district"
                  placeholder="e.g. Bhubaneswar, Patna, Pune…"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school">School Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="school"
                  placeholder="e.g. Delhi Public School, Kendriya Vidyalaya…"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  Adding your school lets you compete in school-level rankings.
                </p>
              </div>
            </div>
          )}

          {/* Step 2 — Hardest Subjects */}
          {step === 2 && (
            <div className="flex flex-wrap gap-3">
              {SUBJECTS.map((subject) => (
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

          {/* Step 3 — Target Score */}
          {step === 3 && (
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

          {/* Step 4 — Schedule */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="study-time">Study Time Preference</Label>
                <Select value={studyTimePreference} onValueChange={setStudyTimePreference}>
                  <SelectTrigger id="study-time">
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

          {step < TOTAL_STEPS ? (
            <Button
              onClick={() => setStep(prev => prev + 1)}
              disabled={!canProceed()}
            >
              Next Step <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={saving}>
              {saving ? "Creating your profile…" : "Finish Onboarding"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
