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
import { callGemini } from "@/lib/gemini";
import { QuestionType, BloomLevel, StudyMaterial } from "@prisma/client";
import { withCache } from "@/lib/cache";
import { trackCacheHit } from "@/services/usage-tracker";

export const LATEST_CONTENT_VERSION = "premium-v1";




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
  youtubeVideos: Array<{ videoId: string; title: string }>;
}

// ─────────────────────────────────────────────────────────
// Main: Generate Content Pack for a Topic
// ─────────────────────────────────────────────────────────

export async function generateTopicContentPack(topicId: string): Promise<ContentPack> {
  // CACHE-FIRST: Check if we have a cached content pack for this topic + version
  const { value: pack, fromCache } = await withCache(
    "content-pack",
    [topicId, LATEST_CONTENT_VERSION],
    async () => {
      return await generateTopicContentPackAI(topicId);
    }
  );

  if (fromCache) {
    console.log(`[content-curator] Cache hit for topic ${topicId}`);
    trackCacheHit("system", "CONTENT_SEED", 16000).catch(() => {});
  } else {
    console.log(`[content-curator] Generated fresh content for topic ${topicId}`);
  }

  return pack;
}

async function generateTopicContentPackAI(topicId: string): Promise<ContentPack> {
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
You are an elite academic notes curator for CBSE Class ${subject.grade} ${subject.name}, equivalent to a premium National Coaching Institute (e.g., Allen, Physics Wallah).
Your goal is to transform standard NCERT curriculum topics into "Coaching-Institute Grade" mastery study materials.

Subject: ${subject.name}
Chapter: ${chapter.name}
Topic: ${topic.name}
${subtopicNames ? `Subtopics: ${subtopicNames}` : ""}

STRICT PEDAGOGICAL BOUNDARIES:
1. **Fidelity to CBSE & NCERT Syllabus**: Focus strictly on topics and definitions included within the official Class ${subject.grade} CBSE textbook. You MUST NOT include advanced topics or concepts from higher-grade JEE/NEET syllabi, as that causes cognitive overload for board students.
2. **Deep Explanations with Relatable Analogies**: Explain abstract ideas using step-by-step reasoning and intuitive real-world examples.
3. **LaTeX Formatting**: For any mathematical equations, formulas, physical laws, or chemical reactions, ALWAYS format them using proper LaTeX syntax enclosed in double dollars ($$) for block math, or single dollars ($) for inline math (e.g. $F = ma$).

Generate ALL 7 sections below. Return a JSON object in this EXACT format:

{
  "coreConcepts": [
    { 
      "concept": "Concept Name", 
      "explanation": "Clear, deep explanation of the concept, step-by-step logic." 
    }
  ],
  "microTopics": [
    { 
      "title": "Bite-sized Sub-concept Heading", 
      "summary": "Coaching-grade concise summary explaining what this sub-concept represents, with active tips." 
    }
  ],
  "explanations": [
    { 
      "topic": "Key Sub-topic Area", 
      "detail": "Detailed conceptual breakdown with a beautiful, illustrative explanation, mathematical derivation steps if any, and high-contrast styling reminders.", 
      "ncertReference": "Page X / Section Y / Activity Z of Class ${subject.grade} NCERT" 
    }
  ],
  "examples": [
    { 
      "title": "Worked Example: [Topic Title]", 
      "problem": "Clear problem statement matching typical Board / NCERT textbook style question.", 
      "solution": "Step-by-step detailed mathematical or logical derivation, showing every middle step, leading to the final clear highlighted solution." 
    }
  ],
  "misconceptions": [
    { 
      "wrong": "Common mistake or misconception students make", 
      "correct": "The scientifically correct statement or step", 
      "why": "Clear pedagogical explanation of WHY the wrong way fails and how the correct way aligns with physics/chemistry/math laws." 
    }
  ],
  "revisionSheet": {
    "keyFormulas": ["Detailed LaTeX formula with definitions of each variable, e.g. $$F = q(E + v \\times B)$$ where F is Force..."],
    "keyDates": ["Dates or chronological timeline events if history/humanities, else empty array"],
    "keyTerms": ["Terminology: Strict NCERT definition"],
    "mnemonics": ["Mnemonic or acronym to easily memorize this specific sequence or law"]
  },
  "selfAssessmentQuestions": [
    { 
      "type": "MCQ", 
      "question": "Clear MCQ testing conceptual application (easy level)?", 
      "options": ["Option A", "Option B", "Option C", "Option D"], 
      "answer": "Correct Option Value", 
      "difficulty": "easy" 
    },
    { 
      "type": "MCQ", 
      "question": "Clear MCQ testing deeper analytical application (medium level)?", 
      "options": ["Option A", "Option B", "Option C", "Option D"], 
      "answer": "Correct Option Value", 
      "difficulty": "medium" 
    },
    { 
      "type": "SHORT_ANSWER", 
      "question": "Typical Board subjective 3-marker question?", 
      "answer": "Complete, structured model answer that examiners look for, highlighted with key points.", 
      "difficulty": "hard" 
    }
  ],
  "keyTakeaways": ["Coaching takeaway 1", "Coaching takeaway 2"],
  "terminology": [
    { "term": "Academic term", "definition": "Direct official board definition." }
  ],
  "youtubeVideos": [
    { "videoId": "dQw4w9WgXcQ", "title": "Introductory topic video" }
  ]
}

Ensure all fields are fully populated with high-quality educational content. Keep youtubeVideos populated with 3-5 real, relevant video IDs. Return ONLY the raw JSON object matching the above structure.
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
    youtubeVideos: [],
  };

  const pack = await callGemini<ContentPack>("PRO", prompt, fallback);

  return pack;
}

/**
 * Checks if the existing study materials are outdated based on the LATEST_CONTENT_VERSION.
 * Content is outdated if:
 * 1. It has no materials
 * 2. It has materials but none contain the current version marker in their description.
 */
export function isContentOutdated(materials: StudyMaterial[]): boolean {
  if (materials.length === 0) return true;

  // Look for the platform notes (primary source of content)
  const mainNotes = materials.find(m => m.type === "PLATFORM_CONTENT");
  if (!mainNotes) return true;

  // Check for version marker in description
  const versionMarker = `[Version: ${LATEST_CONTENT_VERSION}]`;
  return !mainNotes.description?.includes(versionMarker);
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

  // ── Persist to database ───────────────────────────────

  const versionMarker = `[Version: ${LATEST_CONTENT_VERSION}]`;
  const baseDescription = `Comprehensive AI-generated notes with concepts, examples, misconceptions, and practice for ${topic.name}`;
  const versionedDescription = `${baseDescription} ${versionMarker}`;

  // ── Persist to database ───────────────────────────────

  await prisma.studyMaterial.upsert({
    where: {
      id: `ai-notes-${topicId}`,
    },
    create: {
      id: `ai-notes-${topicId}`,
      title: `${topic.name} — NCERT Smart Notes`,
      description: versionedDescription,
      type: "PLATFORM_CONTENT",
      content: JSON.stringify(pack),
      subjectId: subject.id,
      chapterId: chapter.id,
      topicId,
      isAIGenerated: true,
      aiGeneratedAt: new Date(),
      isPublished: true,
    },
    update: {
      title: `${topic.name} — NCERT Smart Notes`,
      description: versionedDescription,
      content: JSON.stringify(pack),
      aiGeneratedAt: new Date(),
      isPublished: true,
    },
  });

  // ── Phase 2: AI-Driven Video Curation ────────────────
  const { curateVideosForTopic, saveCuratedVideos } = await import("./video-curator");
  let videosCreated = 0;
  
  console.log(`[ContentCurator] Triggering Phase 2 Video Curation for ${topic.name}...`);
  try {
    const curatedVideos = await curateVideosForTopic(
      topic.name, 
      subject.grade, 
      subject.name
    );
    
    if (curatedVideos.length > 0) {
      await saveCuratedVideos(topicId, curatedVideos);
      videosCreated = curatedVideos.length;
    } else {
      console.warn(`[ContentCurator] Phase 2 Curation found no high-quality matches. Falling back to search link.`);
    }
  } catch (videoError) {
    console.error(`[ContentCurator] Phase 2 Video Curation failed:`, videoError);
  }
  console.log(`[ContentCurator] Successfully seeded ${videosCreated} verified videos.`);

  // FALLBACK: If no videos could be verified, seed a Search Link so the user isn't left with nothing
  if (videosCreated === 0) {
    console.log(`[ContentCurator] ⚠️ No videos verified. Seeding a Search Fallback.`);
    const searchQuery = `${subject.name} ${topic.name} class ${subject.grade} NCERT`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

    await prisma.studyMaterial.upsert({
      where: { id: `ai-video-search-${topicId}` },
      create: {
        id: `ai-video-search-${topicId}`,
        title: `Watch Videos: ${topic.name}`,
        description: `Search results for ${topic.name} on YouTube. [Version: ${LATEST_CONTENT_VERSION}]`,
        type: "VIDEO",
        youtubeUrl: searchUrl,
        thumbnailUrl: "https://img.youtube.com/vi/search/0.jpg", // Generic search icon placeholder
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

  // Seed questions into the question bank
  await prisma.question.deleteMany({
    where: { source: "ai_generated", subtopic: { topicId } }
  });

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
    materialsCreated: videosCreated + 1,
    materialId: `ai-notes-${topicId}`,
    questionsAdded: pack.selfAssessmentQuestions.length,
  };
}
