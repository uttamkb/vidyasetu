import { prisma } from "@/lib/db";
import { z } from "zod";
import { callGemini } from "@/lib/gemini";

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

    const isSST = subject.name.toLowerCase().includes("social") || subject.name.toLowerCase().includes("history");
    
    const prompt = `You are an expert curriculum designer for CBSE/NCERT.
Generate the NCERT chapter/topic structure for:
Grade: ${subject.grade}
Subject: ${subject.name}
Board: ${subject.board || "CBSE"}

CONSTRAINTS:
1. Exact NCERT chapter names.
2. ${isSST ? "Max 3 topics per chapter (CRITICAL for SST payload size)" : "Max 5 topics per chapter"}.
3. USE EXTREME BREVITY: Max 2 words per topic name. ${isSST ? "NO topic descriptions." : "Max 1 sentence per description."}
4. Return ONLY a valid JSON object.

{
  "chapters": [
    {
      "name": "Chapter Title",
      "description": "Short summary",
      "topics": [
        { "name": "Topic Name"${isSST ? "" : ', "description": "Short desc"'} }
      ]
    }
  ]
}`;

    const fallbackData = { chapters: [] };
    
    try {
      const validatedData = await callGemini(
        "PRO",
        prompt,
        fallbackData,
        curriculumSchema
      );

      if (!validatedData || validatedData.chapters.length === 0) {
        throw new Error("Gemini returned empty chapters array after all retries.");
      }

      // Save to database atomically with a longer timeout (60s) to handle large curricula
      await prisma.$transaction(async (tx) => {
        for (const [i, chapterData] of validatedData.chapters.entries()) {
          await tx.chapter.create({
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
          });
        }
      }, { timeout: 60000 });

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
