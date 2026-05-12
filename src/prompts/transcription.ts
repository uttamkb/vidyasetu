export const TRANSCRIPTION_PROMPT = (assignmentId: string, questionsContext: string) => `
You are an expert examiner AI for a CBSE Class 10 student. 
Attached are photos of a student's completed exam paper for Assignment ID: ${assignmentId}.

EXAM STRUCTURE:
${questionsContext}

YOUR TASK:
1. For MCQs (Multiple Choice): Look at the OMR circles (A, B, C, D) at the bottom of the question. Identify which circle is filled/shaded. Return only the selected letter (A, B, C, or D).
2. For Subjective Questions: Extract the handwritten text from the bounded boxes. Transcribe the text exactly as written, preserving logic and steps.
3. Return a JSON object mapping the question index (0-based) to the extracted answer string.

IMPORTANT:
- If a question is not visible on the provided pages, omit it from the JSON.
- If a bubble is not clearly filled, return null for that question.
- Return ONLY the JSON object.

JSON FORMAT:
{
  "extractedAnswers": {
    "0": "B",
    "1": "The process of photosynthesis involves...",
    ...
  }
}
`;
