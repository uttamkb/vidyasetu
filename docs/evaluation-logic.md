# Evaluation & Grading Logic

VidyaSetu uses a hybrid evaluation strategy that combines deterministic "Fuzzy Matching" for objective questions with "Milestone-Aware AI" for subjective math questions.

## 1. Objective Questions (MCQ / Numeric)
**Service**: `evaluateObjective` in `src/services/evaluation-engine.ts`

To reduce student frustration, we use a three-layer normalization process instead of exact string matching.

### A. Label Stripping
We recursively strip option labels from the beginning of the student's answer.
- **Regex**: `^[a-zA-Z0-9][\.\)\-\s]+`
- **Examples**: `B. Answer` → `Answer`, `2) Result` → `Result`, `c- Choice` → `Choice`.

### B. Fuzzy Normalization
Before comparison, both the student answer and the model answer are normalized:
1. All whitespace is removed.
2. All characters are converted to lowercase.
3. **Comparison**: `y + 5 / y` becomes `y+5/y`, matching correctly even if spacing differs.

### C. Index-Based Fallback
If the student picks just the letter (e.g., "B") or the number (e.g., "2"), the system looks up the corresponding option from the question's `options` array to award marks.

---

## 2. Subjective Questions (Math / Science)
**Service**: `evaluateSubjectiveBatch` with **Gemini Pro**
**Prompt**: `src/prompts/batch-evaluation.ts`

We instruct the AI to act as a "Senior CBSE Examiner" with specific mathematical rigor.

### A. Equation Tracing
The AI is explicitly told to trace algebraic steps even if written in a single line or with dense notation (multiple `=` signs).

### B. Result Prioritization
If the student's final numerical result matches the model answer, the AI is instructed to award **80-100% marks** by default, even if the derivation steps are messy or poorly formatted.

### C. Milestone Credit
Marks are awarded for conceptual milestones:
- Correct substitution of variables.
- Correct initial formula or equation setup.
- Correct identification of constants.

---

## 3. Feedback Generation
After individual question grading, a separate **Gemini Flash** pass generates a "Holistic Feedback" paragraph. This pass looks at the student's overall performance, identifies recurring error patterns, and provides encouragement in a constructive tone.
