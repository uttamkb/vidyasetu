import { prisma } from "@/lib/db";
import { callGemini } from "@/lib/gemini";
import { AIDocumentExtractionSchema, type AIDocumentExtraction } from "@/types/ai-schemas";
import { buildDocumentExtractionPrompt } from "@/prompts/document-extraction";
import { toJson } from "@/lib/prisma-json";
import { QuestionType, BloomLevel } from "@prisma/client";

/**
 * Sends a PDF or Image to Gemini 1.5/2.5 Pro for question extraction and pattern analysis.
 */
export async function extractQuestionsFromBuffer(
  buffer: Buffer,
  mimeType: string,
  context: { schoolName: string; subjectName: string; grade: string }
): Promise<AIDocumentExtraction> {
  const promptText = buildDocumentExtractionPrompt(context);
  
  const multimodalPrompt = [
    promptText,
    {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType
      }
    }
  ];

  const result = await callGemini(
    "PRO", // Using Pro models for high-fidelity extraction
    multimodalPrompt,
    { 
      blueprint: { totalMarks: 0, sections: [], stylisticContext: "Failed to extract context" }, 
      questions: [] 
    },
    AIDocumentExtractionSchema,
    { userId: "admin", type: "TRANSCRIPTION" }
  );

  return result;
}

/**
 * Commits the admin-verified questions and patterns to the database.
 */
export async function commitIngestedContent({
  schoolId,
  subjectId,
  grade,
  examType,
  extraction,
}: {
  schoolId: string;
  subjectId: string;
  grade: string;
  examType: string;
  extraction: AIDocumentExtraction;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the SourceDocument record (Ephemeral mode: text only)
    const sourceDoc = await tx.sourceDocument.create({
      data: {
        schoolId,
        subjectId,
        grade,
        type: examType,
        title: `${examType} - ${new Date().toLocaleDateString()}`,
        textContent: extraction.blueprint.stylisticContext, // We save the context as textContent
        status: "ANALYZED",
      },
    });

    // 2. Upsert the SchoolExamPattern
    await tx.schoolExamPattern.upsert({
      where: {
        schoolId_grade_subjectId_examType: {
          schoolId,
          grade,
          subjectId,
          examType,
        },
      },
      update: {
        blueprint: toJson(extraction.blueprint),
        aiPromptContext: extraction.blueprint.stylisticContext,
      },
      create: {
        schoolId,
        grade,
        subjectId,
        examType,
        blueprint: toJson(extraction.blueprint),
        aiPromptContext: extraction.blueprint.stylisticContext,
      },
    });

    // 3. Batch Create Questions
    // We assume the Admin UI has already validated/mapped the subtopicIds for these questions.
    // In this MVP, we map by name if possible, otherwise we default to a subject-level bucket.
    const questionsToCreate = await Promise.all(
      extraction.questions.map(async (q) => {
        // Attempt fuzzy match for subtopic if ID wasn't provided in the payload
        let subtopicId = (q as { subtopicId?: string }).subtopicId;
        
        if (!subtopicId) {
          const matchedSubtopic = await tx.subtopic.findFirst({
            where: {
              name: { contains: q.suggestedSubtopicName, mode: "insensitive" },
              topic: { chapter: { subjectId } },
            },
          });
          subtopicId = matchedSubtopic?.id;
        }

        if (!subtopicId) {
          console.warn(`[ContentIngestor] Could not map subtopic for: ${q.suggestedSubtopicName}`);
          return null;
        }

        return {
          subtopicId,
          schoolId,
          sourceDocumentId: sourceDoc.id,
          type: q.type as QuestionType,
          bloomLevel: q.bloomLevel as BloomLevel,
          difficulty: q.difficulty,
          content: toJson(q.content),
          verifiedByHuman: true,
          source: "ai_extracted",
        };
      })
    );

    const validQuestions = questionsToCreate.filter((q): q is NonNullable<typeof q> => q !== null);

    if (validQuestions.length > 0) {
      await tx.question.createMany({
        data: validQuestions,
      });
    }

    return {
      sourceDocumentId: sourceDoc.id,
      questionCount: validQuestions.length,
    };
  });
}
