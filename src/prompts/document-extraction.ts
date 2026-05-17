/**
 * document-extraction.ts — Prompt for extracting questions and exam patterns from PDFs/Images
 */

export interface DocumentExtractionContext {
  schoolName: string;
  subjectName: string;
  grade: string;
}

export function buildDocumentExtractionPrompt(context: DocumentExtractionContext) {
  return `
    You are an expert CBSE Curriculum Analyst for the VidyaSetu platform.
    Your task is to analyze the provided document (Exam Paper or Worksheet) from ${context.schoolName} for ${context.subjectName} (Grade ${context.grade}).

    INSTRUCTIONS:
    1. **Extract the Blueprint**: Identify the overall structure of the exam (total marks, sections, number of questions per section, and marks per question).
    2. **Analyze Stylistic Context**: Describe the stylistic nuances of this paper. Is it focus on rote memorization, conceptual application, or NCERT-style case studies? 
    3. **Extract Individual Questions**: Parse every question individually. 
       - Map each question to a **Suggested Subtopic Name** that most likely exists in a standard CBSE curriculum for this grade.
       - Identify the **Bloom's Level** (REMEMBER, UNDERSTAND, APPLY, ANALYZE).
       - Determine a **Difficulty Level** (1-5).
       - Ensure the content follows the JSON schema exactly.

    STRICT CONSTRAINTS:
    - **No Hallucinations**: Only extract what is present in the document.
    - **Curriculum Boundaries**: If a question is clearly out of the CBSE Grade ${context.grade} syllabus, flag it by adding "[OUT_OF_SYLLABUS]" to the suggested subtopic name.
    - **Language**: If the document is in Hindi/English, extract the content accurately.

    OUTPUT FORMAT:
    Return ONLY a valid JSON object matching the requested schema.
  `;
}
