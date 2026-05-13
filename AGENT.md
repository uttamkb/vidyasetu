# VidyaSetu — Cognitive Coach for CBSE Class 9 Students

## Vision
VidyaSetu is a **Cognitive Coach & Adaptive Mastery System** for CBSE Class 9 students. It uses learning science (Spaced Repetition, Interleaving, Mastery Learning) and Gemini AI to create a personalized study path that replaces passive content consumption with active retrieval practice.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) + TypeScript + Turbopack |
| **Async Jobs** | Inngest (Event-driven background pipelines) |
| **AI Engine** | Google Gemini (Cascade: 3.1 Pro ↔ 2.5 Flash) |
| **Styling** | Vanilla CSS + shadcn/ui (Radix UI) |
| **Auth** | Auth.js v5 (NextAuth) — Three-file Edge pattern |
| **Database** | Neon PostgreSQL (Serverless) |
| **ORM** | Prisma v7 (Wasm-based with Neon adapter) |
| **Monitoring** | AI Usage Tracker (Token & Call metrics) |

---

## Core Features

### 1. The Mastery Graph (Curriculum Engine)
- **Granular Skill Mapping** — Curriculum is a fine-grained knowledge graph: Subject → Chapter → Topic → Subtopic → Microskill.
- **Mastery Tracking** — Continuous IRT-based estimate of student competence per node.
- **Prerequisite Scaffolding** — Automatic detection of conceptual blockers in prerequisite topics.

### 2. Socratic AI Tutor
- **Discovery-based Learning** — Gemini-powered tutor that teaches through hints and guiding questions, never just giving the answer.
- **Misconception Detection** — Identifies *why* a student got a question wrong and provides targeted remediation.
- **Embedded Assistance** — Just-in-time help directly inside the practice flow.

### 3. Momentum & Gamification
- **Knowledge Chain** — Habit-forming streak system based on actual learning activity.
- **Mastery Map** — Visual representation of the student's growing knowledge base (Red → Yellow → Green).
- **Growth Points (XP)** — Cumulative points awarded for effort, consistency, and mastery improvements.

### 4. Async Evaluation Engine
- **Reliable Pipeline** — Inngest-powered asynchronous evaluation for complex subjective questions.
- **Instant Feedback** — Real-time updates via event polling once evaluation completes.
- **Multi-Factor Scoring** — Evaluation based on accuracy, depth, and conceptual clarity.

### 5. Localized AI Context
- **Regional Exam Emulation** — Captures Student State, District, and School to tailor AI assignments to local curriculum trends and board patterns (e.g., Vydehi School of Excellence).
- **Fallback Hierarchy** — Intelligent prompt logic that falls back from School → District → State → National (CBSE) patterns if specific data is missing.

### 6. Offline Practice Mode (OMR)
- **Paper-to-Digital** — Transcription of physical OMR-based practice sheets into digital records.
- **Unified Progress** — Merges offline practice data with online mastery tracking.

### 6. Admin Console
- **Operational Visibility** — Real-time monitoring of AI usage, job queues, and student activity.
- **Content Seeding** — Tools for AI-assisted curriculum generation and verification.

---

## Database Schema Highlights (Prisma)

- **`User`** — Profile, academic settings (Grade, Board, State, District, School), role (Student/Admin), and cumulative XP.
- **`UserMastery`** — The "brain" of the system; tracks `masteryScore` and `stability` per subtopic.
- **`UserAIUsage`** — Daily logs of model calls and token consumption for cost monitoring.
- **`PracticeSession`** — Individual learning sessions (Daily Review, Adaptive, Exam Sprint).
- **`Question`** — Curated items with Bloom's taxonomy levels and difficulty metadata.
- **`Task`** — Tracks background jobs and curriculum verification progress.

---

## Page Routes

| Route | Description |
|-------|-------------|
| `/dashboard` | Main command center with Knowledge Chain and Mastery summary |
| `/onboarding` | Adaptive diagnostic and target setting |
| `/assignments` | List of generated practice sets and mock exams |
| `/progress` | Detailed Mastery Map and strength/weakness analysis |
| `/leaderboard` | Growth-based rankings (Global, District, School) |
| `/admin` | Operational dashboard for system administrators |
| `/playbook` | Internal developer documentation and UI patterns |

---

## Agent Skills

The following skills are available to the Agent for development and maintenance:

| Skill | Description | Location |
|-------|-------------|----------|
| **academic-notes-curator** | Transforms text into premium study material adhering to NCERT boundaries. | `.agent/skills/academic-notes-curator` |
| **architect-nextjs-ai** | Senior Architect for Next.js, Neon, and Gemini integration. | `.agent/skills/architect-nextjs-ai` |
| **claude** | Behavioral guidelines for simplistic and surgical coding. | `.agent/skills/claude` |
| **devops-engineer** | Expert skill for containerization, GCP deployment, and CI/CD. | `.agent/skills/devops-engineer` |
| **ux-designer** | Expert UI/UX design following HIG and premium aesthetics. | `.agent/skills/ux-designer` |

---

*Built with ❤️ to make CBSE Class 9 students exam-ready through science-backed learning.*
