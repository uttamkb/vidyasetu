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
  tokensInput?: number;
  tokensOutput?: number;
  actualCostUsd?: number;
  cacheHit?: boolean;
}) {
  const {
    userId,
    modelName,
    type,
    estimatedTokens = 0,
    tokensInput = 0,
    tokensOutput = 0,
    actualCostUsd = 0,
    cacheHit = false,
  } = params;

  // Normalize date to start of day (midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const costUsd = actualCostUsd > 0 ? actualCostUsd : calculateAICost(modelName, tokensInput, tokensOutput);

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
        tokensInput: { increment: tokensInput },
        tokensOutput: { increment: tokensOutput },
        actualCostUsd: { increment: costUsd },
      },
      create: {
        userId,
        date: today,
        modelName,
        type,
        callCount: 1,
        estimatedTokens,
        tokensInput,
        tokensOutput,
        actualCostUsd: costUsd,
        cacheHit,
      },
    });
  } catch (error: any) {
    // P2003 is Foreign Key violation (user doesn't exist anymore)
    if (error?.code === "P2003") {
      console.warn(`[usage-tracker] Ignoring AI usage for non-existent user: ${userId}`);
      return;
    }
    // Fail silently to prevent AI features from breaking due to logging issues
    console.error("[usage-tracker] Failed to log AI usage:", error);
  }
}

/**
 * Track a cache hit — AI call was avoided because cached result was available.
 * Logs with modelName="cache" so hit rate can be calculated as:
 *   hitRate = cacheHits / (cacheHits + aiCalls)
 */
export async function trackCacheHit(
  userId: string,
  type: AICallType,
  estimatedTokensSaved: number = 0
): Promise<void> {
  try {
    await prisma.userAIUsage.upsert({
      where: {
        userId_date_modelName_type: {
          userId,
          date: new Date(new Date().setHours(0, 0, 0, 0)),
          modelName: "cache",
          type,
        },
      },
      update: {
        callCount: { increment: 1 },
        estimatedTokens: { increment: estimatedTokensSaved },
        cacheHit: true,
      },
      create: {
        userId,
        date: new Date(new Date().setHours(0, 0, 0, 0)),
        modelName: "cache",
        type,
        callCount: 1,
        estimatedTokens: estimatedTokensSaved,
        tokensInput: 0,
        tokensOutput: 0,
        actualCostUsd: 0,
        cacheHit: true,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2003") {
      console.warn(`[usage-tracker] Ignoring cache hit for non-existent user: ${userId}`);
      return;
    }
    console.error("[usage-tracker] Failed to log cache hit:", error);
  }
}

/**
 * Calculates estimated cost in USD based on model and token counts.
 * Prices based on Google AI Studio (approximate).
 */
export function calculateAICost(modelName: string, tokensInput: number, tokensOutput: number): number {
  const model = modelName.toLowerCase();
  
  // Per 1 million tokens
  const rates = {
    "gemini-1.5-pro": { input: 1.25, output: 5.00 },
    "gemini-2.5-pro": { input: 1.25, output: 5.00 },
    "gemini-3.1-pro-preview": { input: 1.50, output: 6.00 },
    "gemini-pro-latest": { input: 1.25, output: 5.00 },
    
    "gemini-1.5-flash": { input: 0.15, output: 0.60 },
    "gemini-2.5-flash": { input: 0.15, output: 0.60 },
    "gemini-flash-latest": { input: 0.15, output: 0.60 },
    
    "gemini-2.0-flash-lite": { input: 0.075, output: 0.30 },
  };

  // Find matching rate or default to Flash
  let rate = rates["gemini-1.5-flash"];
  for (const key in rates) {
    if (model.includes(key)) {
      rate = rates[key as keyof typeof rates];
      break;
    }
  }

  const costInput = (tokensInput / 1_000_000) * rate.input;
  const costOutput = (tokensOutput / 1_000_000) * rate.output;
  
  return costInput + costOutput;
}

/**
 * Get cache hit rate for a user and type.
 * Returns ratio 0-1, or null if no data.
 */
export async function getCacheHitRate(
  userId: string,
  type: AICallType,
  days: number = 7
): Promise<number | null> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [cacheHits, totalCalls] = await Promise.all([
      prisma.userAIUsage.aggregate({
        where: {
          userId,
          type,
          modelName: "cache",
          date: { gte: since },
        },
        _sum: { callCount: true },
      }),
      prisma.userAIUsage.aggregate({
        where: {
          userId,
          type,
          date: { gte: since },
        },
        _sum: { callCount: true },
      }),
    ]);

    const hits = cacheHits._sum.callCount ?? 0;
    const total = totalCalls._sum.callCount ?? 0;

    if (total === 0) return null;
    return hits / total;
  } catch (error) {
    console.error("[usage-tracker] Failed to get cache hit rate:", error);
    return null;
  }
}
