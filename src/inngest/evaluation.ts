import { inngest } from "./client";
import { evaluateSubmission } from "@/services/evaluation-engine";

/**
 * Background job to evaluate a student's submission.
 * Triggered after the submission is created in the database.
 * Uses concurrency control to stay within AI rate limits.
 */
export const evaluateSubmissionJob = inngest.createFunction(
  { 
    id: "evaluate-submission",
    // Throttle to 15 concurrent evaluations to protect Gemini Pro quotas
    concurrency: {
      limit: 15,
    },
    // Automatic retries for transient AI errors (503, 429, etc.)
    retries: 3,
  },
  { event: "app/submission.evaluate" },
  async ({ event, step }) => {
    const { submissionId } = event.data;

    if (!submissionId) {
      throw new Error("Missing submissionId in event data");
    }

    const result = await step.run("evaluate-submission-logic", async () => {
      return await evaluateSubmission(submissionId);
    });

    return { 
      success: true, 
      submissionId, 
      totalScore: (result as any).totalScore 
    };
  }
);
