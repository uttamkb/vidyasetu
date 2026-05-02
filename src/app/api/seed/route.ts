/**
 * Seed Route — POST /api/seed
 *
 * Seeds subjects and a starter assignment for each subject.
 * Only for development use. Guarded in production.
 *
 * Note: The legacy studyMaterial fields (url, topic) have been removed from
 * the schema. This seed only creates Subjects + Assignments now.
 */
import { prisma } from "@/lib/db";
import { toJson } from "@/lib/prisma-json";
import { NextResponse } from "next/server";
import type { MaterialType } from "@prisma/client";

if (process.env.NODE_ENV === "production") {
  throw new Error("Seed route must not be used in production.");
}

interface SubjectSeed {
  name: string;
  color: string;
  icon: string;
  grade: string;
  board: string;
}

const subjects: SubjectSeed[] = [
  { name: "Mathematics",    color: "bg-blue-500",   icon: "Calculator",    grade: "9", board: "CBSE" },
  { name: "Science",        color: "bg-green-500",  icon: "FlaskConical",  grade: "9", board: "CBSE" },
  { name: "Social Science", color: "bg-orange-500", icon: "Globe",         grade: "9", board: "CBSE" },
  { name: "English",        color: "bg-purple-500", icon: "BookOpen",      grade: "9", board: "CBSE" },
  { name: "Hindi",          color: "bg-rose-500",   icon: "Pen",           grade: "9", board: "CBSE" },
];

const topicMap: Record<string, string[]> = {
  Mathematics:    ["Number Systems", "Polynomials", "Coordinate Geometry", "Linear Equations", "Triangles"],
  Science:        ["Matter in Our Surroundings", "Atoms & Molecules", "The Fundamental Unit of Life", "Motion", "Gravitation"],
  "Social Science": ["French Revolution", "India - Size & Location", "Physical Features of India", "Democracy", "Constitutional Design"],
  English:        ["Beehive Prose", "Beehive Poetry", "Moments Prose", "Grammar - Tenses", "Writing - Letters"],
  Hindi:          ["Kshitij Prose", "Kshitij Poetry", "Kritika", "Vyakaran - Sandhi", "Nibandh Lekhan"],
};

interface LegacyQuestion {
  question: string;
  options?: string[];
  correctAnswer: string;
  type: "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER";
  marks: number;
  keywords?: string[];
}

function generateQuestions(subjectName: string, week: number): LegacyQuestion[] {
  const topics = topicMap[subjectName] ?? ["General"];
  const topic = topics[(week - 1) % topics.length];
  const questions: LegacyQuestion[] = [];

  for (let i = 0; i < 5; i++) {
    questions.push({
      question: `${subjectName} - ${topic}: MCQ Question ${i + 1} for Week ${week}`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: "Option A",
      type: "MCQ",
      marks: 1,
    });
  }

  for (let i = 0; i < 3; i++) {
    questions.push({
      question: `${subjectName} - ${topic}: Short Answer Question ${i + 1} for Week ${week}`,
      correctAnswer: "Sample correct answer with key points",
      type: "SHORT_ANSWER",
      marks: 3,
      keywords: ["key point 1", "key point 2", "important concept"],
    });
  }

  for (let i = 0; i < 2; i++) {
    questions.push({
      question: `${subjectName} - ${topic}: Long Answer Question ${i + 1} for Week ${week}`,
      correctAnswer: "Detailed sample answer covering all aspects",
      type: "LONG_ANSWER",
      marks: 5,
      keywords: ["introduction", "main points", "conclusion", "examples"],
    });
  }

  return questions;
}

export async function POST() {
  try {
    const createdSubjects: Array<{ id: string; name: string }> = [];

    for (const subject of subjects) {
      const s = await prisma.subject.upsert({
        where: { name_grade_board: { name: subject.name, grade: subject.grade, board: subject.board } },
        update: {},
        create: subject,
        select: { id: true, name: true },
      });
      createdSubjects.push(s);
    }

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + (7 - now.getDay())); // next Sunday
    dueDate.setHours(23, 59, 59, 999);

    for (const subject of createdSubjects) {
      const questions = generateQuestions(subject.name, 1);
      await prisma.assignment.create({
        data: {
          title: `${subject.name} — Week 1 Assignment`,
          description: `Practice assignment for ${subject.name} covering Week 1 topics.`,
          type: "CHAPTER",
          difficulty: "MIXED",
          subjectId: subject.id,
          questions: toJson(questions),    // ← toJson() instead of `as any`
          maxMarks: 25,
          dueDate,
          timeLimit: 60,
          targetGrade: "9",
          targetBoard: "CBSE",
        },
      });
    }

    return NextResponse.json({ success: true, message: `Seeded ${createdSubjects.length} subjects with starter assignments.` });
  } catch (error) {
    console.error("[POST /api/seed]", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
