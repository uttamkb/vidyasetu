import { inngest } from "./client";
import { evaluateSubmission } from "@/services/evaluation-engine";
import { getBatchTimeout } from "@/services/model-router";
import { prisma } from "@/lib/db";

/**
 * Background job to evaluate student submissions.
 * Supports Dynamic Batching: Groups up to 50 submissions or waits for a timeout.
 * This protects the single Gemini API key from RPM exhaustion.
 */
export const evaluateSubmissionJob = inngest.createFunction(
  { 
    id: "evaluate-submission",
    // Dynamic Batching: maxSize 50, timeout depends on user tier (conceptually)
    // For now, we use a global 10s timeout as a balance between UX and efficiency.
    batchEvents: {
      maxSize: 50,
      timeout: "2s",
    },
    // Throttle concurrency to protect Gemini Pro RPM (Requests Per Minute) per user
    concurrency: {
      limit: 2,
      key: "events[0].data.userId",
    },
    retries: 3,
  },
  { event: "app/submission.evaluate" },
  async ({ events, step, attempt }) => {
    // Process all submissions in the batch
    const results = await step.run("evaluate-batch-logic", async () => {
      const submissionIds = events.map(e => e.data.submissionId);
      
      console.log(`[Inngest] Processing batch of ${submissionIds.length} submissions. Attempt: ${attempt}`);
      
      const batchResults = [];
      let hasFailedSubmission = false;
      let lastError: Error | null = null;

      for (const submissionId of submissionIds) {
        try {
          // 1. Check if already evaluated to prevent duplicate API token usage
          const sub = await prisma.submission.findUnique({
            where: { id: submissionId },
            select: { status: true }
          });
          
          if (sub?.status === "EVALUATED") {
            batchResults.push({ submissionId, success: true });
            continue;
          }

          const res = await evaluateSubmission(submissionId);
          batchResults.push({ submissionId, success: true, score: (res as any).totalScore });
        } catch (err) {
          console.error(`[Inngest] Failed to evaluate submission ${submissionId}:`, err);
          hasFailedSubmission = true;
          lastError = err instanceof Error ? err : new Error(String(err));
          
          // DLQ (Dead-Letter Queue) integration:
          // If we reached the final attempt (attempt >= 3), do not throw anymore.
          // Save to Dead-Letter Queue (as a FAILED Task) and reset submission to IN_PROGRESS.
          if (attempt >= 3) {
            try {
              await prisma.submission.update({
                where: { id: submissionId },
                data: { status: "IN_PROGRESS" }
              });
              
              await prisma.task.create({
                data: {
                  type: "EVALUATION_FAILED",
                  status: "FAILED",
                  payload: { submissionId },
                  error: lastError.message
                }
              });
              
              console.log(`[Inngest] DLQ: Registered failed task and reset submission ${submissionId}`);
            } catch (dbErr) {
              console.error(`[Inngest] Failed to process DLQ for submission ${submissionId}:`, dbErr);
            }
            batchResults.push({ submissionId, success: false, error: lastError.message });
          }
        }
      }

      // If we have a failed submission and haven't exhausted all retries, throw the error
      // so Inngest retries the batch.
      if (hasFailedSubmission && attempt < 3) {
        throw lastError || new Error("Batch evaluation failed");
      }

      return batchResults;
    });

    return { 
      processed: events.length,
      results 
    };
  }
);
