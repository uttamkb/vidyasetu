"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, AlertTriangle } from "lucide-react";

interface WeakArea {
  subtopic: string;
  topic: string;
  chapter: string;
  subject: string;
  score: number;
}

interface FocusAreasProps {
  weakAreas: WeakArea[];
  subjectAverages: { subjectName: string; averageMastery: number }[];
}

export function FocusAreas({ weakAreas, subjectAverages }: FocusAreasProps) {
  if (!subjectAverages || subjectAverages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Focus Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete your diagnostic test to get personalized focus recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const lowestSubject = [...subjectAverages].sort((a, b) => a.averageMastery - b.averageMastery)[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Focus Areas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lowestSubject && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium">
                Focus on {lowestSubject.subjectName}
              </p>
              <p className="text-xs text-muted-foreground">
                Your weakest subject at {lowestSubject.averageMastery}% mastery
              </p>
            </div>
          </div>
        )}

        {weakAreas && weakAreas.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Top Weak Spots
            </p>
            {weakAreas.slice(0, 3).map((area, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{area.subtopic}</span>
                  <span className="text-muted-foreground">{area.score}%</span>
                </div>
                <Progress value={area.score} className="h-1" />
                <p className="text-[10px] text-muted-foreground">
                  {area.subject} · {area.chapter}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Subject Mastery
          </p>
          {subjectAverages.map((s) => (
            <div key={s.subjectName} className="flex items-center gap-3">
              <span className="text-xs w-20">{s.subjectName}</span>
              <Progress value={s.averageMastery} className="flex-1 h-1.5" />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {s.averageMastery}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
