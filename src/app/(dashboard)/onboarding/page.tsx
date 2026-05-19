"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

import { INDIAN_STATES, SUBJECTS } from "@/lib/constants";
import { LocationAutocomplete } from "@/components/onboarding/location-autocomplete";

const TOTAL_STEPS = 4;

const STEP_LABELS = ["Location", "Challenges", "Goals", "Schedule"];

export default function OnboardingPage() {
  const { update: updateSession } = useSession();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Profile & Location
  const [grade, setGrade] = useState("9");
  const [board, setBoard] = useState("CBSE");
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
    if (step === 1) {
      return !!grade && !!board && !!state;
    }
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
          grade,
          board,
          state: state.trim(),
          district: district.trim() || undefined,
          school: school.trim() || undefined,
          hardestSubjects,
          targetScore,
          studyTimePreference,
        }),
      });

      if (res.ok) {
        // Update the JWT token so middleware sees isOnboarded=true immediately
        await updateSession({ isOnboarded: true });
        window.location.href = "/dashboard";
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

          {/* Step 1 — Profile & Location */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Class/Grade</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger id="grade">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">Class 8</SelectItem>
                      <SelectItem value="9">Class 9</SelectItem>
                      <SelectItem value="10">Class 10</SelectItem>
                      <SelectItem value="11">Class 11</SelectItem>
                      <SelectItem value="12">Class 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="board">Education Board</Label>
                  <Select value={board} onValueChange={setBoard}>
                    <SelectTrigger id="board">
                      <SelectValue placeholder="Select board" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CBSE">CBSE</SelectItem>
                      <SelectItem value="ICSE">ICSE</SelectItem>
                      <SelectItem value="State Board">State Board</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                <LocationAutocomplete
                  id="district"
                  type="district"
                  state={state}
                  placeholder="e.g. Bhubaneswar, Patna, Pune…"
                  value={district}
                  onChange={setDistrict}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school">School Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <LocationAutocomplete
                  id="school"
                  type="school"
                  placeholder="e.g. Delhi Public School, Kendriya Vidyalaya…"
                  value={school}
                  onChange={setSchool}
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

        <CardFooter className="flex flex-col gap-3 border-t pt-6">
          <div className="flex justify-between w-full">
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
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
