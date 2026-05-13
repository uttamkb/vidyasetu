import { inngest } from "./client";
import { generateAssignmentAIContent } from "@/services/assignment-generator";

/**
 * Background job to generate AI questions for an assignment.
 */
export const generateAssignmentJob = inngest.createFunction(
  { 
    id: "generate-assignment",
    // Concurrency limit to prevent hitting Gemini Flash rate limits
    concurrency: {
      limit: 20,
    },
    retries: 2,
  },
  { event: "app/assignment.generate" },
  async ({ event, step }) => {
    const { assignmentId, userId, aiQCount, input } = event.data;

    if (!assignmentId) throw new Error("Missing assignmentId");

    await step.run("generate-ai-content", async () => {
      return await generateAssignmentAIContent(assignmentId, userId, aiQCount, input);
    });

    return { success: true, assignmentId };
  }
);
