export interface BatchEvaluationQuestion {
  questionId: string;
  question: string;
  modelAnswer: string;
  studentAnswer: string;
  maxMarks: number;
  keyPoints?: string[];
}

export const BATCH_EVALUATION_PROMPT = (params: {
  grade: string;
  subject: string;
  questions: BatchEvaluationQuestion[];
}) => `
You are a senior CBSE Class ${params.grade} ${params.subject} examiner. 
Evaluate the following student answers fairly, focusing on conceptual understanding, numerical accuracy, and logical derivation.

### Evaluation Guidelines:
1. SEMANTIC MATCHING: Do NOT require exact textbook wording. Award marks for correct conceptual explanation.
2. MATHEMATICAL RIGOR (CRITICAL):
   - TRACE STEPS: For math/science, trace the algebraic derivation even if written in a single line or with messy notation (e.g., multiple '=' signs).
   - RESULT PRIORITIZATION: If the final answer (e.g., "a=1") is correct and corresponds to the model answer, award at least 80-100% marks unless the derivation is clearly nonsensical.
   - MILESTONE GRADING: Award partial marks for correct substitutions (e.g., substituting x=1) or correct initial equations even if the final calculation is wrong.
3. OCR TOLERANCE: Do not penalize for obvious transcription glitches (e.g., '^' for power, '*' for multiply).
4. PARTIAL CREDIT: Award marks in increments of 0.5 for partially correct responses.
5. INDEPENDENT GRADING: Evaluate each question independently.

### Questions to Evaluate:
${params.questions.map((q, i) => `
--- QUESTION ${i + 1} (ID: ${q.questionId}) ---
Question: ${q.question}
Model Answer: ${q.modelAnswer}
${q.keyPoints ? `Key Points Required: ${q.keyPoints.join(", ")}` : ""}
Student's Answer: ${q.studentAnswer}
Max Marks: ${q.maxMarks}
`).join("\n")}

### Return Format:
Return a JSON array of evaluation objects. Each object MUST have the following structure:
{
  "questionId": "string (the ID provided above)",
  "isCorrect": boolean,
  "marksAwarded": number (0 to maxMarks),
  "feedback": "1-2 sentences: explaining marks",
  "correction": "concise model answer",
  "explanation": "brief concept explanation",
  "markingBreakdown": [
    { "component": "string", "marks": number, "maxMarks": number, "status": "FULL"|"PARTIAL"|"NONE", "reason": "string" }
  ]
}

Return ONLY the JSON array.
`;
