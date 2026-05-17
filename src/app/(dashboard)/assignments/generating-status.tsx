"use client";

import { useState, useEffect } from "react";

const MESSAGES = [
  "Analyzing your weak areas...",
  "Curating high-yield questions...",
  "Applying Socratic methodology...",
  "Aligning with NCERT standards...",
  "Gemini is brainstorming...",
  "Designing your mastery path...",
  "Preparing feedback engine...",
];

export function GeneratingStatus() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="animate-in fade-in slide-in-from-bottom-1 duration-500" key={index}>
      {MESSAGES[index]}
    </span>
  );
}
