import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ZodSchema } from "zod";

// ─────────────────────────────────────────────────────────────
// Singleton — prevents multiple client instances during HMR
// ─────────────────────────────────────────────────────────────

const globalForGemini = globalThis as unknown as {
  gemini: GoogleGenerativeAI | undefined;
};

function createGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[gemini] GEMINI_API_KEY is not set.\n" +
      "Add it to .env.local: GEMINI_API_KEY=your_key_here\n"
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

// Lazy singleton — only throws if GEMINI_API_KEY is actually missing at call time
const genAI = globalForGemini.gemini ?? createGeminiClient();
if (process.env.NODE_ENV !== "production") globalForGemini.gemini = genAI;

// ─────────────────────────────────────────────────────────────
// Model instances
// ─────────────────────────────────────────────────────────────

/**
 * Gemini 2.0 Flash — fast, cheap, powerful multimodal model.
 * Use for: question generation, quick feedback, MCQ explanation.
 */
export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.7,
    maxOutputTokens: 8192,
  },
});

/**
 * Gemini 1.5 Pro — powerful reasoning.
 * Use for: subjective evaluation, content curation, complex feedback.
 */
export const geminiPro = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.4,
    maxOutputTokens: 8192,
  },
});

// ─────────────────────────────────────────────────────────────
// JSON Parser
// ─────────────────────────────────────────────────────────────

/**
 * Strips markdown code fences Gemini sometimes wraps around JSON output,
 * then parses the result.
 */
export function parseGeminiJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

// ─────────────────────────────────────────────────────────────
// callGemini — universal wrapper with optional Zod validation
// ─────────────────────────────────────────────────────────────

/**
 * Calls a Gemini model and parses the JSON response.
 *
 * @param model       - geminiFlash or geminiPro
 * @param prompt      - the fully-built prompt string
 * @param fallback    - returned if the call or parse fails
 * @param schema      - optional Zod schema for runtime validation of AI output
 */
export async function callGemini<T>(
  model: typeof geminiFlash | typeof geminiPro,
  prompt: string | Array<any>,
  fallback: T,
  schema?: ZodSchema<T>
): Promise<T> {
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const raw = parseGeminiJson<unknown>(text);

    if (schema) {
      return schema.parse(raw); // throws ZodError on invalid AI output
    }
    return raw as T;
  } catch (error) {
    console.error("[Gemini] Error calling API or parsing/validating response:", error);
    return fallback;
  }
}
