/**
 * Content Curator Service
 *
 * Uses Gemini Pro to auto-generate a content pack for any topic:
 * - Topic summary (2-3 paragraphs, Class 9 appropriate)
 * - Key points (5-8 bullet points)
 * - Common mistakes to avoid
 * - YouTube search queries (admin uses to find best video)
 * - Sample questions (seeded to question bank)
 */

import { prisma } from "@/lib/db";
import { geminiPro, callGemini } from "@/lib/gemini";
import { QuestionType, BloomLevel } from "@prisma/client";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface ContentPack {
  topicSummary: string;
  keyPoints: string[];
  commonMistakes: string[];
  youtubeSearchQueries: string[];
  sampleQuestions: Array<{
    question: string;
    answer: string;
    type: "MCQ" | "SHORT_ANSWER";
    options?: string[];
  }>;
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
You are an expert CBSE Class ${subject.grade} ${subject.name} teacher.
Generate "Smart Notes" for quick reference (not a textbook copy) for:
Subject: ${subject.name}
Chapter: ${chapter.name}
Topic: ${topic.name}

Smart Notes Requirements:
1. **Visual & Concise**: Use bullet points, bold text for terms.
2. **Formula-Heavy**: Include all relevant formulas/equations for this topic.
3. **Example-Led**: Explain concepts using 1-2 small, clear examples.
4. **Exam Keys**: Focus on what frequently appears in board exams.

Return a JSON object in this EXACT format:
{
  "topicSummary": "A 'Cheat Sheet' style summary. Start with a 1-sentence definition, then use markdown for a 'Quick Glance' section with formulas or key laws.",
  
  "keyPoints": [
    "Key Fact/Formula 1: [Short description]",
    "Key Fact/Formula 2: [Short description]",
    "Example: [Brief practical scenario]",
    "Pro-Tip: [Exam-saving advice]"
  ],
  
  "commonMistakes": [
    "Mistake: [What students do wrong] | Fix: [Correct approach]",
    "Common confusion between X and Y"
  ],
  
  "youtubeSearchQueries": [
    "CBSE Class ${subject.grade} ${subject.name} ${topic.name} animation",
    "${topic.name} formulas and examples Class ${subject.grade}"
  ],
  
  "sampleQuestions": [
    {
      "type": "MCQ",
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "answer": "Correct Option"
    }
  ]
}

Return ONLY the JSON object.
`;

  const pack = await callGemini<ContentPack>(geminiPro, prompt, {
    topicSummary: `Study notes for ${topic.name} in ${subject.name}.`,
    keyPoints: [],
    commonMistakes: [],
    youtubeSearchQueries: [
      `CBSE Class ${subject.grade} ${subject.name} ${topic.name}`,
    ],
    sampleQuestions: [],
  });

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

  // 1. Save topic summary as PLATFORM_CONTENT study material
  const keyPointsMd = pack.keyPoints.map((p) => `- ${p}`).join("\n");
  const mistakesMd = pack.commonMistakes.map((m) => `- ${m}`).join("\n");

  const summaryContent = `
## ${topic.name}

${pack.topicSummary}

### Key Points to Remember
${keyPointsMd}

### Common Mistakes to Avoid
${mistakesMd}
`.trim();

  await prisma.studyMaterial.upsert({
    where: {
      id: `ai-notes-${topicId}`, // stable ID for upsert
    },
    create: {
      id: `ai-notes-${topicId}`,
      title: `${topic.name} — Quick Review`,
      description: `Exam-focused smart notes, formulas, and examples for ${topic.name}`,
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
      content: summaryContent,
      aiGeneratedAt: new Date(),
      isPublished: true,
    },
  });

  // 1b. Save YouTube Reference Link automatically
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

  // 2. Seed sample questions into the question bank (if subtopics exist)
  const subtopics = await prisma.subtopic.findMany({
    where: { topicId },
    take: 1,
  });

  if (subtopics.length > 0 && pack.sampleQuestions.length > 0) {
    const subtopic = subtopics[0];

    for (const sq of pack.sampleQuestions) {
      await prisma.question.create({
        data: {
          subtopicId: subtopic.id,
          type: sq.type as QuestionType,
          bloomLevel: BloomLevel.UNDERSTAND,
          difficulty: 2,
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
    questionsAdded: pack.sampleQuestions.length,
  };
}
