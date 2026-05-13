import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ZodSchema } from "zod";
import { trackAIUsage, AICallType } from "@/services/usage-tracker";

// ─────────────────────────────────────────────────────────────
// Singleton — prevents multiple client instances during HMR
// ─────────────────────────────────────────────────────────────

const globalForGemini = globalThis as unknown as {
  gemini: GoogleGenerativeAI | undefined;
};

function createGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY || "DUMMY_KEY_FOR_BUILD";
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      "[gemini] GEMINI_API_KEY is not set. Using dummy key for build phase. " +
      "Make sure to provide a valid key in .env.local for runtime."
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

// Lazy singleton — only throws if GEMINI_API_KEY is actually missing at call time
export const genAI = globalForGemini.gemini ?? createGeminiClient();
if (process.env.NODE_ENV !== "production") globalForGemini.gemini = genAI;

// ─────────────────────────────────────────────────────────────
// Model instances
// ─────────────────────────────────────────────────────────────

/**
 * Gemini Flash Cascade
 * Attempts 2.5 -> 2.0 Lite -> Flash Latest
 */
const flashConfig = {
  responseMimeType: "application/json",
  temperature: 0.7,
  maxOutputTokens: 8192,
};

export const geminiFlashModels = [
  genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: flashConfig }),
  genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite", generationConfig: flashConfig }),
  genAI.getGenerativeModel({ model: "gemini-flash-latest", generationConfig: flashConfig }),
];

/**
 * Gemini Pro Cascade
 * Attempts 2.5 Pro -> 3.1 Pro Preview -> Pro Latest
 */
const proConfig = {
  responseMimeType: "application/json",
  temperature: 0.4,
  maxOutputTokens: 8192,
};

export const geminiProModels = [
  genAI.getGenerativeModel({ model: "gemini-2.5-pro", generationConfig: proConfig }),
  genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview", generationConfig: proConfig }),
  genAI.getGenerativeModel({ model: "gemini-pro-latest", generationConfig: proConfig }),
];

// ─────────────────────────────────────────────────────────────
// JSON Parser
// ─────────────────────────────────────────────────────────────

/**
 * Strips markdown code fences Gemini sometimes wraps around JSON output,
 * then parses the result.
 */
export function parseGeminiJson<T>(raw: string): T {
  // First try to extract just the JSON block if it exists
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let cleaned = jsonMatch ? jsonMatch[1] : raw;
  
  // Fallback cleanup just in case
  cleaned = cleaned
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
    
  return JSON.parse(cleaned) as T;
}

// ─────────────────────────────────────────────────────────────
// callGemini — universal wrapper with optional Zod validation
// ─────────────────────────────────────────────────────────────

/**
 * Calls a Gemini model with an intelligent fallback cascade.
 *
 * @param models      - Array of GenerativeModels to try in order (e.g. geminiProModels)
 * @param prompt      - the fully-built prompt string
 * @param fallback    - returned if ALL models in the cascade fail
 * @param schema      - optional Zod schema for runtime validation of AI output
 */
export async function callGemini<T>(
  models: any[],
  prompt: string | Array<any>,
  fallback: T,
  schema?: ZodSchema<T>,
  tracking?: { userId: string; type: AICallType }
): Promise<T> {
  let lastError = null;

  for (const model of models) {
    const modelName = model.model || "unknown-model";
    try {
      console.log(`[Gemini] Attempting generation with ${modelName}...`);
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const raw = parseGeminiJson<unknown>(text);
      const usage = (result.response as any).usageMetadata;

      // Log usage if tracking is provided
      if (tracking) {
        trackAIUsage({
          userId: tracking.userId,
          modelName,
          type: tracking.type,
          // Use actual tokens from Gemini response, fallback to rough estimate
          estimatedTokens: usage?.totalTokenCount ?? Math.ceil(((typeof prompt === 'string' ? prompt.length : 0) + text.length) / 4),
        }).catch((e) => console.error("[Gemini] Tracking failed:", e));
      }

      if (schema) {
        return schema.parse(raw); // throws ZodError on invalid AI output
      }
      return raw as T;
    } catch (error: any) {
      console.warn(`[Gemini] Model ${modelName} failed. Error:`, error.message);
      lastError = error;
      // Continue loop to try the next model in the cascade
    }
  }

  console.error("[Gemini] All models in cascade failed. Returning empty fallback.", lastError?.message);
  return fallback;
}
