import { google } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Ensure API key is available
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const genAI = new google.GenerativeAI(apiKey);

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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `You are an expert curriculum designer for the CBSE (Central Board of Secondary Education) / NCERT syllabus in India.
Your task is to generate the standard chapter and topic structure for:
Grade: ${subject.grade}
Subject: ${subject.name}
Board: ${subject.board || "CBSE"}

Create a highly accurate and comprehensive list of Chapters, and within each Chapter, the key Topics covered according to the latest syllabus.

Return the result STRICTLY as a JSON object matching this schema:
{
  "chapters": [
    {
      "name": "Chapter Title",
      "description": "Brief description of chapter",
      "topics": [
        { "name": "Topic Title", "description": "Brief description of topic" }
      ]
    }
  ]
}

Ensure the output is pure JSON. Do not include markdown formatting or backticks.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(cleanedText);

      const validatedData = curriculumSchema.parse(parsedData);

      // Save to database
      for (let i = 0; i < validatedData.chapters.length; i++) {
        const chapterData = validatedData.chapters[i];
        
        await prisma.chapter.create({
          data: {
            subjectId: subject.id,
            name: chapterData.name,
            description: chapterData.description,
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
