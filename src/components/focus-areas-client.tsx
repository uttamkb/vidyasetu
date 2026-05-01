"use client";

import { useEffect, useState } from "react";
import { FocusAreas } from "./focus-areas";

interface MasteryData {
  subjects: { subjectName: string; averageMastery: number }[];
  weakAreas: { subtopic: string; topic: string; chapter: string; subject: string; score: number }[];
}

export function FocusAreasClient() {
  const [data, setData] = useState<MasteryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mastery")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData({
            subjects: res.subjects,
            weakAreas: res.weakAreas,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-40 animate-pulse bg-muted rounded-lg" />
    );
  }

  return (
    <FocusAreas
      weakAreas={data?.weakAreas || []}
      subjectAverages={data?.subjects || []}
    />
  );
}
