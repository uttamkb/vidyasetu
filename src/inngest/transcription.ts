import { inngest } from "./client";
import { prisma } from "@/lib/db";
import { transcribeExamPaper } from "@/services/transcription-engine";
import { toJson } from "@/lib/prisma-json";

/**
 * Background job to process handwritten scan transcription.
 */
export const processTranscriptionJob = inngest.createFunction(
  {
    id: "process-transcription",
    concurrency: {
      limit: 2,
      key: "event.data.userId",
    },
    retries: 2,
  },
  { event: "app/transcription.process" },
  async ({ event, step }) => {
    const { taskId, assignmentId, images } = event.data;

    if (!taskId) throw new Error("Missing taskId");
    if (!assignmentId) throw new Error("Missing assignmentId");
    if (!images || !Array.isArray(images)) throw new Error("Missing images array");

    // 1. Update Task Status to PROCESSING
    await step.run("update-task-processing", async () => {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "PROCESSING" }
      });
    });

    // 2. Fetch assignment questions context
    const fullQuestions = await step.run("fetch-assignment-questions", async () => {
      const assignment = await prisma.assignment.findUniqueOrThrow({
        where: { id: assignmentId },
        select: { questions: true },
      });

      const questions = (assignment.questions as any[]) || [];
      const questionIds = questions.map((q) => q.questionId).filter(Boolean);

      const fetchedQuestions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
      });

      return questions.map((pointer) => {
        const q = fetchedQuestions.find((fq) => fq.id === pointer.questionId);
        return q || pointer;
      });
    });

    // 3. Perform AI transcription
    const result = await step.run("execute-ocr-transcription", async () => {
      try {
        const ocrResult = await transcribeExamPaper(assignmentId, images, fullQuestions);
        return { success: true, data: ocrResult };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    });

    // 4. Update Task with result
    await step.run("save-task-result", async () => {
      if (result.success && "data" in result && result.data) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: "COMPLETED",
            payload: toJson({
              extractedAnswers: result.data.extractedAnswers,
              confidenceScores: result.data.confidenceScores || {},
              uncertainWords: result.data.uncertainWords || {},
            })
          }
        });
      } else {
        const errorMsg = "error" in result ? result.error : "Unknown transcription error";
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: "FAILED",
            error: errorMsg
          }
        });
      }
    });

    return { taskId, success: result.success };
  }
);
