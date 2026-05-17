/**
 * Worksheet Generator Service — Phase 3: Adaptive Practice Sheets
 * 
 * Generates custom, curriculum-aligned practice papers based on:
 * 1. Topic/Subtopic scope.
 * 2. Student Mastery Level (Easy/Medium/Hard mix).
 * 3. Official CBSE Exam Pattern.
 */

import { prisma } from "@/lib/db";
import { genAI, callGemini } from "@/lib/gemini";

export interface WorksheetContent {
  title: string;
  instructions: string[];
  sections: Array<{
    name: string;
    questions: Array<{
      q: string;
      options?: string[];
      marks: number;
      answer: string;
    }>;
  }>;
}

/**
 * Generates a custom worksheet for a student.
 */
export async function generateWorksheet(
  topicId: string,
  masteryLevel: number = 0 // 0-100
): Promise<WorksheetContent> {
  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: topicId },
    include: { chapter: { include: { subject: true } } }
  });

  const subject = topic.chapter.subject;
  
  // Determine difficulty mix based on mastery
  // Low mastery -> More foundation questions
  // High mastery -> More HOTS (Higher Order Thinking Skills) questions
  const difficulty = masteryLevel < 40 ? "Foundation" : masteryLevel < 70 ? "Standard" : "Advanced (HOTS)";

  const prompt = `
You are a Senior CBSE Paper Setter for ${subject.name} Class ${subject.grade}.
Create a premium ${difficulty} Practice Worksheet for the topic: "${topic.name}".

STRUCTURE:
1. Section A: 5 MCQs (1 Mark each).
2. Section B: 3 Short Answer Questions (3 Marks each).
3. Section C: 1 Case Study or Long Answer Question (5 Marks each).

CONTENT GUIDELINES:
- Strictly follow NCERT/CBSE 2024-2025 patterns.
- For ${difficulty} level: ${
    difficulty === "Foundation" 
      ? "Focus on definitions, direct concepts, and simple diagrams." 
      : difficulty === "Standard" 
      ? "Mix of conceptual and application-based questions." 
      : "Focus on deep analysis, complex problem solving, and multi-concept application."
  }
- Ensure questions are original and not word-for-word from textbooks.

Return a JSON object in this EXACT format:
{
  "title": "Topic Name — Practice Worksheet (${difficulty})",
  "instructions": ["All questions are compulsory", "Section A MCQs have only one correct option"],
  "sections": [
    {
      "name": "Section A: Objective Type",
      "questions": [
        { "q": "Question text?", "options": ["A", "B", "C", "D"], "marks": 1, "answer": "Correct Option" }
      ]
    }
  ]
}
`;

  const fallback: WorksheetContent = {
    title: `${topic.name} Worksheet`,
    instructions: ["Follow NCERT guidelines"],
    sections: []
  };

  // Use Pro for high-quality question setting
  return await callGemini<WorksheetContent>(
    "PRO",
    prompt,
    fallback
  );
}

/**
 * Formats a worksheet as a beautiful Markdown/HTML string for printing.
 */
export function formatWorksheetToMarkdown(content: WorksheetContent): string {
  let md = `# ${content.title}\n\n`;
  md += `**Time Allowed:** 45 Minutes | **Maximum Marks:** 20\n\n`;
  
  md += `### 📝 Instructions:\n`;
  content.instructions.forEach(ins => md += `* ${ins}\n`);
  md += `\n---\n\n`;

  content.sections.forEach(section => {
    md += `## ${section.name}\n\n`;
    section.questions.forEach((q, i) => {
      md += `**Q${i + 1}.** ${q.q} *(${q.marks} Mark${q.marks > 1 ? 's' : ''})*\n`;
      if (q.options) {
        q.options.forEach((opt, j) => {
          md += `   ${String.fromCharCode(65 + j)}) ${opt}\n`;
        });
      }
      md += `\n`;
    });
    md += `\n`;
  });

  md += `\n\n---\n\n`;
  md += `### 🔑 Answer Key (Self-Correction Only)\n\n`;
  content.sections.forEach(section => {
    section.questions.forEach((q, i) => {
      md += `* **Q${i + 1}:** ${q.answer}\n`;
    });
  });

  return md;
}
