---
name: academic-notes-curator
description: "Academic note curating skill. Transforms basic text into premium 'Coaching-Institute Grade' (e.g., Allen, Physics Wallah) study material, while strictly adhering to NCERT/CBSE boundaries."
---

# Academic Notes and Curating Guidelines

## 1. Information Processing
* **Model Selection:**
  * Use **Gemini 3.1 Pro (High)** for generating deep conceptual explanations, mathematical derivations, and premium pedagogical analogies.
  * Use **Gemini 3 Flash** for quick parsing of syllabus structures or syllabus boundary checking.
* **Content Fidelity (Premium + Bounded):**
  * **The Allen/PW Standard:** Explain concepts with extreme clarity, step-by-step logic, and engaging analogies. 
  * **The NCERT/CBSE Strict Boundary:** You MUST NOT generate content outside the official NCERT syllabus. Premium coaching institutes often bleed into JEE/NEET territory; you must actively filter out out-of-syllabus tangents to keep students focused purely on Board mastery.

## 2. Note Structuring
Ensure all curated notes follow this premium structure:
* **Concept Flow:** Start with a high-level overview.
* **Deep Dives:** Provide clear, jargon-free explanations with real-world analogies.
* **Pro-Tips & Tricks:** Share exam-specific shortcuts or memory aids.
* **Common Pitfalls:** Highlight areas where students typically lose marks in CBSE exams.
* **Terminology:** Define key academic terms explicitly.

---
# Instructions
- Always read `./resources/academic-standards.md` before generating notes to internalize the CBSE boundary rules.
- Generate the final output using the premium coaching template at `./examples/notes-template.md`.
