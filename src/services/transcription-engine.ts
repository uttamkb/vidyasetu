/**
 * Transcription Engine Service
 * 
 * Uses Gemini Pro Vision to extract student answers from full-page scans.
 * Supports OMR bubble detection and handwritten text extraction.
 */

import { callGemini } from "@/lib/gemini";
import { RAW_OCR_PROMPT, SEMANTIC_MAPPING_PROMPT } from "@/prompts/transcription";
import { getFewShotContext } from "./self-learning-service";

interface ExtractionResult {
  extractedAnswers: Record<string, string>; // Keys are now questionIds
  confidenceScores?: Record<string, number>;
  uncertainWords?: Record<string, string[]>;
}

export async function transcribeExamPaper(
  assignmentId: string,
  images: string[],
  questions: any[]
): Promise<ExtractionResult> {
  // 1. Fetch Past Corrections for Self-Learning
  const fewShotContext = await getFewShotContext("TRANSCRIPTION", 3);

  // Pass 1: Visual OCR
  const rawOcrParts: any[] = [RAW_OCR_PROMPT];

  for (const img of images) {
    try {
      const parts = img.split(",");
      if (parts.length !== 2) continue;
      
      const header = parts[0];
      const base64 = parts[1];
      const mimeType = header.replace("data:", "").split(";")[0];
      
      rawOcrParts.push({ inlineData: { data: base64, mimeType } });
    } catch (e) {
      console.warn("[TranscriptionEngine] Skipping malformed image string");
    }
  }

  let ocrResult: { transcribedPages: Array<{ pageNumber: number; rawText: string }> };
  try {
    ocrResult = await callGemini<{ transcribedPages: Array<{ pageNumber: number; rawText: string }> }>(
      "PRO",
      rawOcrParts,
      { transcribedPages: [] }
    );
  } catch (err) {
    console.error("[TranscriptionEngine] Pass 1 Visual OCR failed:", err);
    throw new Error("Failed to transcribe exam paper. Please ensure photos are clear and try again.");
  }

  const rawOcrText = ocrResult.transcribedPages
    .map((p) => `--- PAGE ${p.pageNumber} ---\n${p.rawText}`)
    .join("\n\n");

  // Pass 2: Semantic Mapping
  const questionsContext = questions.map((q, idx) => {
    const content = q.question?.content || q.content;
    const type = q.question?.type || q.type;
    const qId = q.question?.id || q.id || q.pointer?.questionId;
    
    return `[LABEL: Q${idx + 1}] [ID: ${qId}] [Type: ${type}] Question: "${content.question}" ${
      content.options ? `Options: ${content.options.join(", ")}` : ""
    }`;
  }).join("\n");

  const mappingPrompt = SEMANTIC_MAPPING_PROMPT(questionsContext, rawOcrText) + (fewShotContext ? `\n${fewShotContext}` : "");

  try {
    return await callGemini<ExtractionResult>(
      "PRO",
      mappingPrompt,
      { extractedAnswers: {} }
    );
  } catch (err) {
    console.error("[TranscriptionEngine] Pass 2 Semantic Mapping failed:", err);
    throw new Error("Failed to transcribe exam paper. Please ensure photos are clear and try again.");
  }
}
