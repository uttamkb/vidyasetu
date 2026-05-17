import { inngest } from "./client";
import { captureAIFeedback } from "@/services/self-learning-service";

/**
 * Self-Learning Workflow: Triggered when a human corrects an AI output.
 */
export const processAIFeedback = inngest.createFunction(
  { id: "process-ai-feedback", concurrency: 2 },
  { event: "app/ai.feedback" },
  async ({ event, step }) => {
    const { feedback } = event.data;

    await step.run("log-validation", async () => {
      return await captureAIFeedback(feedback);
    });

    if (!feedback.isCorrect) {
      await step.run("analyze-failure", async () => {
        // Here we could trigger a meta-AI task to summarize WHY the AI failed
        // (e.g., "Poor handwriting quality", "Calculation error in exponents")
        console.log(`[Self-Learning] AI failed on ${feedback.type} for target ${feedback.targetId}`);
        return { analyzed: true };
      });
    }

    return { status: "processed" };
  }
);
