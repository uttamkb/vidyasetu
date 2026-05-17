export const RAW_OCR_PROMPT = `
You are an expert academic handwriting transcriber.
Attached are photos of a student's handwritten answer sheet.

YOUR TASK:
1. Transcribe the handwritten text on each page exactly as written, preserving any student labels (e.g., "Q1", "Ans 2", "1)", etc.).
2. If the student answers a question, transcribe the full explanation, formula steps, or reasoning exactly as they wrote it.
3. If the student wrote multiple pages/photos, demarcate each page clearly.
4. **CONFIDENCE TAGGING**: If you are uncertain about a specific word or phrase due to messy handwriting, wrap it in <mark>tags (e.g., "The process of <mark>photosynthesis</mark> involves...").

Return JSON format:
{
  "transcribedPages": [
    {
      "pageNumber": number,
      "rawText": "full transcribed text for this page including headers, labels, and answers"
    }
  ]
}
Return ONLY the JSON object.
`;

export const SEMANTIC_MAPPING_PROMPT = (questionsContext: string, rawOcrText: string) => `
You are an expert CBSE academic examiner. 
Your goal is to map transcribed student answers to the correct questions in the exam structure.

EXAM STRUCTURE:
${questionsContext}

TRANSCRIBED HANDWRITING (RAW OCR):
${rawOcrText}

YOUR TASK:
1. Carefully analyze the TRANSCRIBED HANDWRITING to find where each question from the EXAM STRUCTURE was solved.
2. The student may have solved questions out of order, or used labels like "Q1", "Ans 2", "1)", or no labels at all. Use semantic matching, option matching (for MCQs), and context clues to map each block of answer to the correct question ID.
3. For MCQs: Identify the student's selected option. Return ONLY the full text of that option from the options list in the EXAM STRUCTURE.
4. For Subjective Questions: Extract the full handwritten text for that question. Stitch text if it spans multiple pages.
5. If a question is not solved or not found, OMIT it from the JSON output.
6. Evaluate your confidence level (0-100%) for the transcription of each mapped question and identify any uncertain/messy words (word smudges).

Return JSON format:
{
  "extractedAnswers": {
    "uuid-for-question-1": "student's answer",
    "uuid-for-question-2": "student's answer"
  },
  "confidenceScores": {
    "uuid-for-question-1": 95,
    "uuid-for-question-2": 72
  },
  "uncertainWords": {
    "uuid-for-question-1": [],
    "uuid-for-question-2": ["osmosis"]
  }
}
Return ONLY the JSON object.
`;

export const TRANSCRIPTION_PROMPT = (assignmentId: string, questionsContext: string, fewShotContext?: string) => `
You are an expert academic transcriber for CBSE. 
Attached are photos of a student's handwritten answer sheet for Assignment ID: ${assignmentId}.

STUDENT SOLVING RULES:
- The student is using BLANK paper.
- They identify answers using markers like "Q1", "Ans 2", "1)", "Answer for Question 5", etc.
- They may solve questions in any order.
- Answers may span multiple pages.

EXAM STRUCTURE (FOR CONTEXT):
${questionsContext}

YOUR TASK:
1. Scan all provided images to identify which part of the handwriting corresponds to which question in the EXAM STRUCTURE.
2. IMPORTANT: Use the [LABEL] in the EXAM STRUCTURE (e.g., Q1, Q2) to match the student's handwritten question numbers.
3. For MCQs: Identify the student's choice. Return ONLY the full text of the selected option from the EXAM STRUCTURE.
4. For Subjective Questions: Transcribe the handwritten text exactly as written.
5. **CONFIDENCE TAGGING**: If you are uncertain about a specific word or phrase due to messy handwriting, wrap it in <mark>tags (e.g., "The process of <mark>photosynthesis</mark> involves...").

IMPORTANT:
- If an answer spans multiple photos, STITCH the text together logically.
- If a question is not solved or not visible, OMIT it from the JSON.
- Return ONLY the JSON object.

JSON FORMAT:
{
  "extractedAnswers": {
    "uuid-for-q1": "B",
    "uuid-for-q2": "The process of <mark>osmosis</mark> occurs when...",
    "uuid-for-q5": "The value of x is <mark>15.4</mark>..."
  }
}

${fewShotContext || ""}
`;
