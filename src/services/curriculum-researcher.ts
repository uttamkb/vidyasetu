import { prisma } from "@/lib/db";
import { z } from "zod";
import { geminiProModels, callGemini } from "@/lib/gemini";

const curriculumSchema = z.object({
  chapters: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      topics: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        })
      ),
    })
  ),
});

/**
 * Service responsible for automatically researching and generating the CBSE/NCERT curriculum
 * structure (Chapters and Topics) for a given Subject.
 */
export class CurriculumResearcher {
  /**
   * Generates chapters and topics for an empty subject using Gemini AI.
   * @param subjectId The database ID of the Subject.
   */
  static async generateCurriculumStructure(subjectId: string) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { chapters: true },
    });

    if (!subject) {
      throw new Error(`Subject ${subjectId} not found`);
    }

    if (subject.chapters.length > 0) {
      // Already has chapters, do not overwrite.
      return subject.chapters;
    }

    const prompt = `You are an expert curriculum designer with deep knowledge of the CBSE (Central Board of Secondary Education) syllabus and NCERT textbooks published by the National Council of Educational Research and Training, India.

Your task is to generate the EXACT chapter and topic structure from the official NCERT textbook for:

Grade: ${subject.grade}
Subject: ${subject.name}
Board: ${subject.board || "CBSE"}
Syllabus Year: 2024-2025

CRITICAL CONSTRAINTS:
1. Use ONLY chapters and topics from the official NCERT textbook for this subject and grade.
2. Chapter names MUST match the NCERT textbook table of contents exactly.
3. Do NOT add any chapter or topic that is not in the NCERT textbook.
4. Do NOT include content from other boards (ICSE, State Boards) or higher grades.
5. Include ALL chapters from the textbook — do not skip any.

NCERT Textbook Reference:
- Mathematics Class 9: "Mathematics" (NCERT, 15 chapters)
- Science Class 9: "Science" (NCERT, 15 chapters)
- Social Science Class 9: "India and the Contemporary World - I" (History), "Contemporary India - I" (Geography), "Democratic Politics - I" (Civics), "Economics" (NCERT)
- English Class 9: "Beehive" (Prose & Poetry), "Moments" (Supplementary Reader)
- Hindi Class 9: "Kshitij" (Prose & Poetry), "Kritika" (Supplementary Reader)

Return the result STRICTLY as a JSON object matching this schema:
{
  "chapters": [
    {
      "name": "Exact NCERT Chapter Title",
      "description": "One-line description from NCERT syllabus",
      "topics": [
        { "name": "Key Topic Title", "description": "Brief description" }
      ]
    }
  ]
}

Ensure the output is pure JSON. Do not include markdown formatting or backticks.`;

    const fallbackData = { chapters: [] };
    
    try {
      const validatedData = await callGemini(
        geminiProModels,
        prompt,
        fallbackData,
        curriculumSchema
      );

      if (validatedData.chapters.length === 0) {
        throw new Error("Gemini returned empty chapters array after all retries.");
      }

      // Save to database atomically — if any chapter fails, none are persisted.
      // This prevents partial seeding that would make the idempotency check
      // skip this subject forever (it checks subject.chapters.length > 0).
      await prisma.$transaction(
        validatedData.chapters.map((chapterData, i) =>
          prisma.chapter.create({
            data: {
              subjectId: subject.id,
              name: chapterData.name,
              orderIndex: i + 1,
              topics: {
                create: chapterData.topics.map((topic, j) => ({
                  name: topic.name,
                  description: topic.description,
                  orderIndex: j + 1,
                })),
              },
            },
          })
        )
      );

      console.log(`[CurriculumResearcher] Successfully generated curriculum for ${subject.name}`);
      
      return await prisma.chapter.findMany({
        where: { subjectId: subject.id },
        include: { topics: true },
        orderBy: { orderIndex: "asc" },
      });
      
    } catch (error) {
      console.error("[CurriculumResearcher] Error generating curriculum:", error);
      throw error;
    }
  }
}
