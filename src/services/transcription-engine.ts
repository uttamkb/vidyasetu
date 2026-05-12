/**
 * Transcription Engine Service
 * 
 * Uses Gemini Pro Vision to extract student answers from full-page scans.
 * Supports OMR bubble detection and handwritten text extraction.
 */

import { geminiProModels, callGemini } from "@/lib/gemini";
import { TRANSCRIPTION_PROMPT } from "@/prompts/transcription";

interface ExtractionResult {
  extractedAnswers: Record<number, string>;
}

export async function transcribeExamPaper(
  assignmentId: string,
  images: string[],
  questions: any[]
): Promise<ExtractionResult> {
  const questionsContext = questions.map((q, idx) => {
    const content = q.question?.content || q.content;
    const type = q.question?.type || q.type;
    return `Q${idx + 1}: [Type: ${type}] Question: "${content.question}" ${
      content.options ? `Options: ${content.options.join(", ")}` : ""
    }`;
  }).join("\n");

  const promptParts: any[] = [
    TRANSCRIPTION_PROMPT(assignmentId, questionsContext)
  ];

  for (const img of images) {
    try {
      const parts = img.split(",");
      if (parts.length !== 2) continue;
      
      const header = parts[0];
      const base64 = parts[1];
      const mimeType = header.replace("data:", "").split(";")[0];
      
      promptParts.push({ inlineData: { data: base64, mimeType } });
    } catch (e) {
      console.warn("[TranscriptionEngine] Skipping malformed image string");
    }
  }

  try {
    return await callGemini<ExtractionResult>(
      geminiProModels,
      promptParts,
      { extractedAnswers: {} }
    );
  } catch (err) {
    console.error("[TranscriptionEngine] Extraction failed:", err);
    throw new Error("Failed to transcribe exam paper. Please ensure photos are clear and try again.");
  }
}
