import { prisma } from "@/lib/db";

export type AIModelType = "gemini-2.5-pro" | "gemini-3.1-pro-preview" | "gemini-2.5-flash" | "gemini-2.0-flash-lite" | "gemini-flash-latest" | "gemini-pro-latest";
export type AICallType = "EVALUATION" | "GENERATION" | "CONTENT_SEED" | "TRANSCRIPTION";

/**
 * Tracks AI usage for a specific user.
 * Increments the call count and estimated tokens for the current day.
 */
export async function trackAIUsage(params: {
  userId: string;
  modelName: string;
  type: AICallType;
  estimatedTokens?: number;
}) {
  const { userId, modelName, type, estimatedTokens = 0 } = params;

  // Normalize date to start of day (midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    await prisma.userAIUsage.upsert({
      where: {
        userId_date_modelName_type: {
          userId,
          date: today,
          modelName,
          type,
        },
      },
      update: {
        callCount: { increment: 1 },
        estimatedTokens: { increment: estimatedTokens },
      },
      create: {
        userId,
        date: today,
        modelName,
        type,
        callCount: 1,
        estimatedTokens,
      },
    });
  } catch (error) {
    // Fail silently to prevent AI features from breaking due to logging issues
    console.error("[usage-tracker] Failed to log AI usage:", error);
  }
}
