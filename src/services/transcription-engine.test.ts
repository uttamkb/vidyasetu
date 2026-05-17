import { describe, it, expect, vi } from "vitest";
import { transcribeExamPaper } from "./transcription-engine";
import { callGemini } from "@/lib/gemini";

vi.mock("@/lib/gemini", () => ({
  geminiProModels: [],
  callGemini: vi.fn(),
}));

vi.mock("@/prompts/transcription", () => ({
  RAW_OCR_PROMPT: "raw-ocr-mock-prompt",
  SEMANTIC_MAPPING_PROMPT: vi.fn(() => "semantic-mapping-mock-prompt"),
  TRANSCRIPTION_PROMPT: vi.fn(() => "mock-prompt"),
}));

vi.mock("./self-learning-service", () => ({
  getFewShotContext: vi.fn(() => Promise.resolve("")),
}));

describe("transcription-engine", () => {
  const mockAssignmentId = "asgn-1";
  const mockImages = ["data:image/png;base64,abcdef", "invalid-image"];
  const mockQuestions = [
    { type: "MCQ", content: { question: "Q1?", options: ["A", "B"] } },
    { question: { type: "SHORT", content: { question: "Q2?" } } },
  ];

  it("transcribes exam paper from multiple images", async () => {
    (callGemini as any)
      .mockResolvedValueOnce({
        transcribedPages: [{ pageNumber: 1, rawText: "Q1 is A. Q2 is Some text" }]
      })
      .mockResolvedValueOnce({
        extractedAnswers: { 1: "A", 2: "Some text" }
      });

    const result = await transcribeExamPaper(mockAssignmentId, mockImages, mockQuestions);

    expect(result.extractedAnswers).toEqual({ 1: "A", 2: "Some text" });
    expect(callGemini).toHaveBeenNthCalledWith(
      1,
      "PRO",
      expect.arrayContaining([
        "raw-ocr-mock-prompt",
        expect.objectContaining({ inlineData: { data: "abcdef", mimeType: "image/png" } })
      ]),
      expect.anything()
    );
    expect(callGemini).toHaveBeenNthCalledWith(
      2,
      "PRO",
      expect.stringContaining("semantic-mapping-mock-prompt"),
      expect.anything()
    );
  });

  it("handles malformed image strings gracefully", async () => {
    (callGemini as any)
      .mockResolvedValueOnce({ transcribedPages: [] })
      .mockResolvedValueOnce({ extractedAnswers: {} });

    // This hits the parts.length !== 2 branch
    await transcribeExamPaper(mockAssignmentId, ["invalid-image"], mockQuestions);
    
    // This hits the catch block
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    (callGemini as any)
      .mockResolvedValueOnce({ transcribedPages: [] })
      .mockResolvedValueOnce({ extractedAnswers: {} });
    // @ts-ignore
    await transcribeExamPaper(mockAssignmentId, [null], mockQuestions);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping malformed image string"));
    warnSpy.mockRestore();
  });

  it("throws error if Gemini call fails", async () => {
    (callGemini as any).mockRejectedValue(new Error("Gemini error"));

    await expect(transcribeExamPaper(mockAssignmentId, mockImages, mockQuestions))
      .rejects.toThrow("Failed to transcribe exam paper");
  });
});
