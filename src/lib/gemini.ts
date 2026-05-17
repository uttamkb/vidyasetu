import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ZodSchema } from "zod";
import { trackAIUsage, AICallType } from "@/services/usage-tracker";

// ─────────────────────────────────────────────────────────────
// Singleton — prevents multiple client instances during HMR
// ─────────────────────────────────────────────────────────────

const globalForGemini = globalThis as unknown as {
  gemini: GoogleGenerativeAI | undefined;
  modelCache: { flash: string; pro: string } | undefined;
};

function createGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY || "DUMMY_KEY_FOR_BUILD";
  return new GoogleGenerativeAI(apiKey);
}

export const genAI = globalForGemini.gemini ?? createGeminiClient();
if (process.env.NODE_ENV !== "production") globalForGemini.gemini = genAI;

// ─────────────────────────────────────────────────────────────
// Auto-Discovery Engine
// ─────────────────────────────────────────────────────────────

async function discoverModels() {
  if (globalForGemini.modelCache) return globalForGemini.modelCache;

  const apiKey = process.env.GEMINI_API_KEY;
  // MODERN SAFE FALLBACKS: Using the 2.5-generation standard
  const fallbacks = { flash: "gemini-2.5-flash", pro: "gemini-2.5-pro" };

  if (!apiKey || apiKey === "DUMMY_KEY_FOR_BUILD") return fallbacks;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    // Add a short timeout (2s) to the discovery fetch so it doesn't slow down the user
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`API Status: ${response.status}`);

    const data = await response.json();
    if (!data.models) throw new Error("No models in response");

    // Filter for Production-grade text generation Gemini models
    const isValid = (m: any) => {
      const name = m.name.toLowerCase();
      const supportsGenerate = m.supportedGenerationMethods?.includes("generateContent") ?? true;
      return (
        supportsGenerate &&
        name.includes("gemini") &&
        (name.includes("flash") || name.includes("pro")) &&
        !name.includes("nano") &&
        !name.includes("embedding") &&
        !name.includes("aqa") &&
        !name.includes("image") && 
        !name.includes("tts") && 
        !name.includes("vision")
      );
    };

    const flashModels = data.models
      .filter((m: any) => m.name.includes("flash") && isValid(m))
      .map((m: any) => m.name.replace("models/", ""))
      .sort((a: string, b: string) => {
        // Prioritize non-lite models
        const aLite = a.includes("lite");
        const bLite = b.includes("lite");
        if (aLite && !bLite) return 1;
        if (!aLite && bLite) return -1;
        return b.localeCompare(a, undefined, { numeric: true });
      });

    const proModels = data.models
      .filter((m: any) => m.name.includes("pro") && isValid(m))
      .map((m: any) => m.name.replace("models/", ""))
      .sort((a: string, b: string) => {
        // Prioritize non-lite models
        const aLite = a.includes("lite");
        const bLite = b.includes("lite");
        if (aLite && !bLite) return 1;
        if (!aLite && bLite) return -1;
        return b.localeCompare(a, undefined, { numeric: true });
      });

    const result = {
      flash: flashModels[0] || fallbacks.flash,
      pro: proModels[0] || fallbacks.pro
    };

    console.log(`[AI] [INFO] Auto-discovered models: Flash=${result.flash}, Pro=${result.pro}`);
    globalForGemini.modelCache = result;
    return result;
  } catch (error: any) {
    // SILENT FAIL: Don't crash the app, just use fallbacks and log a warning
    console.warn(`[AI] [WARN] Model discovery failed (${error.message}), using silent fallbacks.`);
    return fallbacks;
  }
}

// ─────────────────────────────────────────────────────────────
// Dynamic Model Accessors
// ─────────────────────────────────────────────────────────────

export async function getFlashModel(config?: any, systemInstruction?: string) {
  const { flash } = await discoverModels();
  return genAI.getGenerativeModel({ 
    model: flash, 
    generationConfig: config,
    systemInstruction: systemInstruction ? { role: "system", parts: [{ text: systemInstruction }] } : undefined
  });
}

export async function getProModel(config?: any, systemInstruction?: string) {
  const { pro } = await discoverModels();
  return genAI.getGenerativeModel({ 
    model: pro, 
    generationConfig: config,
    systemInstruction: systemInstruction ? { role: "system", parts: [{ text: systemInstruction }] } : undefined
  });
}

// ─────────────────────────────────────────────────────────────
// Universal Call Wrapper
// ─────────────────────────────────────────────────────────────

export async function callGemini<T>(
  type: "FLASH" | "PRO",
  prompt: string | Array<any>,
  fallback: T,
  schema?: ZodSchema<T>,
  tracking?: { userId: string; type: AICallType },
  systemInstruction?: string
): Promise<T> {
  try {
    const config = { responseMimeType: "application/json", temperature: 0.4 };
    const model = type === "FLASH" 
      ? await getFlashModel(config, systemInstruction)
      : await getProModel(config, systemInstruction);

    const modelName = model.model;
    console.log(`[AI] [INFO] Calling ${modelName}...`);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const usage = (response as any).usageMetadata;

    const raw = parseGeminiJson<unknown>(text);
    const parsed = schema ? schema.parse(raw) : (raw as T);

    if (tracking) {
      trackAIUsage({
        userId: tracking.userId,
        modelName,
        type: tracking.type,
        tokensInput: usage?.promptTokenCount ?? 0,
        tokensOutput: usage?.candidatesTokenCount ?? usage?.completionTokenCount ?? 0,
        estimatedTokens: usage?.totalTokenCount ?? 0,
      }).catch(() => {});
    }

    return parsed as T;
  } catch (error: any) {
    console.error("[AI] [ERROR] Gemini call failed:", error.message);
    return fallback;
  }
}

export async function callGeminiStrict<T>(
  type: "FLASH" | "PRO",
  prompt: string | Array<any>,
  schema?: ZodSchema<T>,
  tracking?: { userId: string; type: AICallType },
  systemInstruction?: string
): Promise<T> {
  const config = { responseMimeType: "application/json", temperature: 0.4 };
  const model = type === "FLASH" 
    ? await getFlashModel(config, systemInstruction)
    : await getProModel(config, systemInstruction);

  const modelName = model.model;
  console.log(`[AI] [INFO] Calling strict ${modelName}...`);

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  const usage = (response as any).usageMetadata;

  const raw = parseGeminiJson<unknown>(text);
  const parsed = schema ? schema.parse(raw) : (raw as T);

  if (tracking) {
    trackAIUsage({
      userId: tracking.userId,
      modelName,
      type: tracking.type,
      tokensInput: usage?.promptTokenCount ?? 0,
      tokensOutput: usage?.candidatesTokenCount ?? usage?.completionTokenCount ?? 0,
      estimatedTokens: usage?.totalTokenCount ?? 0,
    }).catch(() => {});
  }

  return parsed as T;
}

function parseGeminiJson<T>(raw: string): T {
  // 1. Extract JSON from potential Markdown blocks
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let cleaned = jsonMatch ? jsonMatch[1] : raw;
  cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();

  // 2. Sanitize backslashes (Resilience against LaTeX/Math)
  // AI often outputs \sqrt instead of \\sqrt, which crashes JSON.parse.
  // We escape backslashes that aren't already part of a valid JSON escape sequence.
  const sanitized = cleaned.replace(/\\(?!["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");

  try {
    return JSON.parse(sanitized) as T;
  } catch (err) {
    console.error("[AI] [ERROR] JSON Parse failed after sanitization. Raw length:", sanitized.length);
    // If sanitization failed, try one more attempt with the original just in case
    return JSON.parse(cleaned) as T;
  }
}

// ─────────────────────────────────────────────────────────────
// Chat Helpers (Corrected System Instruction Pattern)
// ─────────────────────────────────────────────────────────────

export async function startTutorChat(
  materialTitle: string,
  materialContent: string,
  history: Array<{ role: "user" | "model"; parts: { text: string }[] }> = []
) {
  const systemInstruction = `You are VidyaSetu AI. Help with: ${materialTitle}. Context: ${materialContent}`;
  const model = await getFlashModel(undefined, systemInstruction);
  return model.startChat({ history });
}

export async function startSocraticTutorChat(
  questionContext: string,
  history: Array<{ role: "user" | "model"; parts: { text: string }[] }> = []
) {
  const systemInstruction = `You are the VidyaSetu Socratic AI Tutor. NEVER GIVE DIRECT ANSWERS. Context: ${questionContext}`;
  const model = await getFlashModel(undefined, systemInstruction);
  return model.startChat({ history });
}
