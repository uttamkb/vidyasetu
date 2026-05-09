/**
 * Content Curator Service — 7-Section NCERT Smart Notes Pipeline
 *
 * Uses Gemini Pro to auto-generate a comprehensive content pack for any topic:
 *   1. Core Concepts — extracted from NCERT textbook
 *   2. Micro-Topics — bite-sized sub-concepts for focused study
 *   3. Detailed Explanations — with NCERT page/section references
 *   4. Worked Examples — step-by-step problem solutions
 *   5. Common Misconceptions — what students get wrong and why
 *   6. Quick Revision Sheet — formulas, key terms, mnemonics
 *   7. Adaptive Practice — easy/medium/hard questions
 *
 * Called by:
 *   - Inngest `seedTopicContent` (monthly pre-seeding)
 *   - JIT in `GET /api/study-materials` (on-demand when student clicks)
 */

import { prisma } from "@/lib/db";
import { genAI, callGemini } from "@/lib/gemini";
import { QuestionType, BloomLevel } from "@prisma/client";

// ─────────────────────────────────────────────────────────
// Dedicated model cascade for content generation (16K tokens)
// ─────────────────────────────────────────────────────────

const contentGenConfig = {
  responseMimeType: "application/json",
  temperature: 0.4,
  maxOutputTokens: 16384,
};

const contentGenModels = [
  genAI.getGenerativeModel({ model: "gemini-2.5-pro", generationConfig: contentGenConfig }),
  genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview", generationConfig: contentGenConfig }),
  genAI.getGenerativeModel({ model: "gemini-pro-latest", generationConfig: contentGenConfig }),
];

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface ContentPack {
  /** Section 1: Core concepts extracted from NCERT */
  coreConcepts: Array<{ concept: string; explanation: string }>;
  /** Section 2: Micro-topics — bite-sized sub-concepts */
  microTopics: Array<{ title: string; summary: string }>;
  /** Section 3: Detailed explanations with NCERT references */
  explanations: Array<{ topic: string; detail: string; ncertReference?: string }>;
  /** Section 4: Worked examples with step-by-step solutions */
  examples: Array<{ title: string; problem: string; solution: string }>;
  /** Section 5: Common misconceptions */
  misconceptions: Array<{ wrong: string; correct: string; why: string }>;
  /** Section 6: Quick revision sheet */
  revisionSheet: {
    keyFormulas: string[];
    keyDates?: string[];
    keyTerms: string[];
    mnemonics: string[];
  };
  /** Section 7: Adaptive practice questions (easy/medium/hard) */
  selfAssessmentQuestions: Array<{
    question: string;
    answer: string;
    type: "MCQ" | "SHORT_ANSWER";
    options?: string[];
    difficulty: "easy" | "medium" | "hard";
  }>;
  /** Supporting fields */
  keyTakeaways: string[];
  terminology: Array<{ term: string; definition: string }>;
  youtubeSearchQueries: string[];
}

// ─────────────────────────────────────────────────────────
// Main: Generate Content Pack for a Topic
// ─────────────────────────────────────────────────────────

export async function generateTopicContentPack(topicId: string): Promise<ContentPack> {
  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: topicId },
    include: {
      chapter: {
        include: { subject: true },
      },
      subtopics: true,
    },
  });

  const chapter = topic.chapter;
  const subject = chapter.subject;
  const subtopicNames = topic.subtopics.map((s) => s.name).join(", ");

  const prompt = `
You are an expert NCERT academic notes curator for CBSE Class ${subject.grade} ${subject.name}.
Generate comprehensive, exam-focused smart notes for:

Subject: ${subject.name}
Chapter: ${chapter.name}
Topic: ${topic.name}
${subtopicNames ? `Subtopics: ${subtopicNames}` : ""}

CRITICAL CONSTRAINTS:
1. Content MUST be strictly based on the NCERT textbook for Class ${subject.grade} ${subject.name} (2024-2025 edition).
2. Do NOT include content from reference books (R.D. Sharma, S. Chand, etc.), coaching materials, or higher-grade syllabi.
3. Explanations MUST BE BITE-SIZED and EXAM-FOCUSED. Think "Netflix for studying", not "PDF textbook".
4. Do NOT make notes "long". Use short sentences, bullet points, and high-impact phrasing.
5. All questions must be answerable using ONLY the NCERT textbook content.
6. Include NCERT section/page references where possible (e.g., "Section 2.3" or "Activity 4.1").

Generate ALL 7 sections below. Return a JSON object in this EXACT format:

{
  "coreConcepts": [
    { "concept": "Concept Name", "explanation": "Punchy, 1-2 sentence explanation." }
  ],
  "microTopics": [
    { "title": "Bite-sized sub-concept title", "summary": "Extremely brief, focused summary." }
  ],
  "explanations": [
    { "topic": "Sub-topic heading", "detail": "Short, bulleted explanation. No wall of text.", "ncertReference": "Section 2.3 / Activity 4.1" }
  ],
  "examples": [
    { "title": "Example title", "problem": "Short problem statement.", "solution": "Clear, step-by-step solution." }
  ],
  "misconceptions": [
    { "wrong": "Common mistake", "correct": "Correct fact", "why": "1-sentence reason" }
  ],
  "revisionSheet": {
    "keyFormulas": ["Formula 1", "Formula 2"],
    "keyDates": ["Date/event if applicable (History/Civics)"],
    "keyTerms": ["Term: short definition"],
    "mnemonics": ["Memory aid or trick"]
  },
  "selfAssessmentQuestions": [
    { "type": "MCQ", "question": "Short easy question?", "options": ["A", "B", "C", "D"], "answer": "Correct option", "difficulty": "easy" },
    { "type": "MCQ", "question": "Short medium question?", "options": ["A", "B", "C", "D"], "answer": "Correct option", "difficulty": "medium" },
    { "type": "SHORT_ANSWER", "question": "Short hard question?", "answer": "Brief model answer.", "difficulty": "hard" }
  ],
  "keyTakeaways": ["Punchy point 1", "Punchy point 2"],
  "terminology": [
    { "term": "Term", "definition": "One-line definition." }
  ],
  "youtubeSearchQueries": [
    "NCERT Class ${subject.grade} ${subject.name} ${topic.name} animation 5 minutes"
  ]
}

IMPORTANT:
- STRICT LENGTH LIMIT: Absolute maximum of 2 most critical items per section. Pick ONLY the highest yield, most frequently tested concepts.
- EXTREMELY BITE-SIZED: Keep explanations under 15 words. Use punchy phrasing. No fluff.
- VISUAL & ENGAGING: Liberally use emojis (⚠️ for mistakes, 💡 for tips, 🔥 for hot topics).
- Focus on what the student MUST know to pass, omitting edge cases.
- Generate exactly 3 self-assessment questions (1 easy, 1 medium, 1 hard).
- For Math/Science: prioritize formulas. For Humanities: prioritize timelines and themes.

Return ONLY the JSON object.
`;

  const fallback: ContentPack = {
    coreConcepts: [],
    microTopics: [],
    explanations: [],
    examples: [],
    misconceptions: [],
    revisionSheet: { keyFormulas: [], keyTerms: [], mnemonics: [] },
    selfAssessmentQuestions: [],
    keyTakeaways: [`Study notes for ${topic.name}`],
    terminology: [],
    youtubeSearchQueries: [
      `NCERT Class ${subject.grade} ${subject.name} ${topic.name}`,
    ],
  };

  const pack = await callGemini<ContentPack>(contentGenModels, prompt, fallback);

  return pack;
}

// ─────────────────────────────────────────────────────────
// Save Content Pack to Database
// ─────────────────────────────────────────────────────────

export async function saveContentPack(topicId: string, pack: ContentPack) {
  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: topicId },
    include: { chapter: { include: { subject: true } } },
  });

  const chapter = topic.chapter;
  const subject = chapter.subject;

  // ── Build 7-section markdown ──────────────────────────

  const sections: string[] = [];

  sections.push(`## ${topic.name} — NCERT Smart Notes`);

  // Section 1: Core Concepts
  if (pack.coreConcepts.length > 0) {
    sections.push(`### 📚 Core Concepts`);
    sections.push(pack.coreConcepts.map((c) => `* **${c.concept}**: ${c.explanation}`).join("\n"));
  }

  // Section 2: Micro-Topics
  if (pack.microTopics && pack.microTopics.length > 0) {
    sections.push(`### 🔬 Micro-Topics`);
    sections.push(pack.microTopics.map((m) => `* **${m.title}**: ${m.summary}`).join("\n"));
  }

  // Section 3: Detailed Explanations
  if (pack.explanations && pack.explanations.length > 0) {
    sections.push(`### 📖 Deep Dives`);
    for (const e of pack.explanations) {
      const ref = e.ncertReference ? ` *(${e.ncertReference})*` : "";
      sections.push(`**${e.topic}**${ref}\n\n> ${e.detail}\n`);
    }
  }

  // Section 4: Worked Examples
  if (pack.examples && pack.examples.length > 0) {
    sections.push(`### 🎯 How to Solve`);
    for (const ex of pack.examples) {
      sections.push(`**${ex.title}**\n* ❓ **Q:** ${ex.problem}\n* ✅ **A:** ${ex.solution}\n`);
    }
  }

  // Section 5: Common Misconceptions
  if (pack.misconceptions && pack.misconceptions.length > 0) {
    sections.push(`### 🛑 Common Mistakes`);
    for (const m of pack.misconceptions) {
      sections.push(`* ❌ **Don't say:** ${m.wrong}\n* ✅ **Do say:** ${m.correct}\n* 💡 **Why?** ${m.why}\n`);
    }
  }

  // Section 6: Quick Revision Sheet
  const rev = pack.revisionSheet;
  if (rev) {
    sections.push(`### ⚡ Cheat Sheet`);
    if (rev.keyFormulas && rev.keyFormulas.length > 0) {
      sections.push(`**📐 Formulas:**\n${rev.keyFormulas.map((f) => `* \`${f}\``).join("\n")}\n`);
    }
    if (rev.keyDates && rev.keyDates.length > 0) {
      sections.push(`**📅 Dates:**\n${rev.keyDates.map((d) => `* ${d}`).join("\n")}\n`);
    }
    if (rev.keyTerms && rev.keyTerms.length > 0) {
      sections.push(`**🗝️ Terms:**\n${rev.keyTerms.map((t) => `* ${t}`).join("\n")}\n`);
    }
    if (rev.mnemonics && rev.mnemonics.length > 0) {
      sections.push(`**🧠 Memory Hacks:**\n${rev.mnemonics.map((m) => `* ${m}`).join("\n")}\n`);
    }
  }

  // Key Takeaways
  if (pack.keyTakeaways.length > 0) {
    sections.push(`### 🚀 In a Nutshell`);
    sections.push(pack.keyTakeaways.map((t) => `* ${t}`).join("\n"));
  }

  // Terminology
  if (pack.terminology.length > 0) {
    sections.push(`### 🗣️ Vocabulary`);
    sections.push(pack.terminology.map((t) => `* **${t.term}**: ${t.definition}`).join("\n"));
  }

  // Section 7: Practice Questions
  if (pack.selfAssessmentQuestions.length > 0) {
    sections.push(`### 🧪 Practice Questions`);
    const grouped = { easy: [] as string[], medium: [] as string[], hard: [] as string[] };
    pack.selfAssessmentQuestions.forEach((q, i) => {
      const diff = q.difficulty || "medium";
      const label = diff === "easy" ? "🟢 Easy" : diff === "medium" ? "🟡 Medium" : "🔴 Hard";
      grouped[diff].push(`${i + 1}. [${label}] ${q.question}\n   * **Answer:** ${q.answer}`);
    });
    for (const level of ["easy", "medium", "hard"] as const) {
      if (grouped[level].length > 0) {
        sections.push(grouped[level].join("\n"));
      }
    }
  }

  const summaryContent = sections.join("\n\n");

  // ── Persist to database ───────────────────────────────

  await prisma.studyMaterial.upsert({
    where: {
      id: `ai-notes-${topicId}`,
    },
    create: {
      id: `ai-notes-${topicId}`,
      title: `${topic.name} — NCERT Smart Notes`,
      description: `Comprehensive AI-generated notes with concepts, examples, misconceptions, and practice for ${topic.name}`,
      type: "PLATFORM_CONTENT",
      content: summaryContent,
      subjectId: subject.id,
      chapterId: chapter.id,
      topicId,
      isAIGenerated: true,
      aiGeneratedAt: new Date(),
      isPublished: true,
    },
    update: {
      title: `${topic.name} — NCERT Smart Notes`,
      description: `Comprehensive AI-generated notes with concepts, examples, misconceptions, and practice for ${topic.name}`,
      content: summaryContent,
      aiGeneratedAt: new Date(),
      isPublished: true,
    },
  });

  // Save YouTube Reference Link
  if (pack.youtubeSearchQueries && pack.youtubeSearchQueries.length > 0) {
    const query = pack.youtubeSearchQueries[0];
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    await prisma.studyMaterial.upsert({
      where: {
        id: `ai-video-ref-${topicId}`,
      },
      create: {
        id: `ai-video-ref-${topicId}`,
        title: `Video Tutorials: ${topic.name}`,
        description: `Recommended video search for ${topic.name}`,
        type: "VIDEO",
        youtubeUrl: searchUrl,
        subjectId: subject.id,
        chapterId: chapter.id,
        topicId,
        isAIGenerated: true,
        aiGeneratedAt: new Date(),
        isPublished: true,
      },
      update: {
        youtubeUrl: searchUrl,
        aiGeneratedAt: new Date(),
      }
    });
  }

  // Seed questions into the question bank (with difficulty mapping)
  const subtopics = await prisma.subtopic.findMany({
    where: { topicId },
    take: 1,
  });

  if (subtopics.length > 0 && pack.selfAssessmentQuestions.length > 0) {
    const subtopic = subtopics[0];
    const difficultyMap = { easy: 1, medium: 3, hard: 5 };
    const bloomMap = {
      easy: BloomLevel.REMEMBER,
      medium: BloomLevel.UNDERSTAND,
      hard: BloomLevel.APPLY,
    };

    for (const sq of pack.selfAssessmentQuestions) {
      const diff = sq.difficulty || "medium";
      await prisma.question.create({
        data: {
          subtopicId: subtopic.id,
          type: sq.type as QuestionType,
          bloomLevel: bloomMap[diff],
          difficulty: difficultyMap[diff],
          content: {
            question: sq.question,
            options: sq.options,
            correctAnswer: sq.answer,
            explanation: `Refer to ${topic.name} notes for explanation.`,
            maxMarks: sq.type === "MCQ" ? 1 : 3,
          },
          source: "ai_generated",
          verifiedByHuman: false,
        },
      });
    }
  }

  return {
    youtubeSearchQueries: pack.youtubeSearchQueries,
    materialId: `ai-notes-${topicId}`,
    questionsAdded: pack.selfAssessmentQuestions.length,
  };
}
