# VidyaSetu — Personal Tutor for CBSE Class 9 Students

## Vision
An AI-powered personal tutor dashboard for CBSE Class 9 students that generates weekly assignments, evaluates submissions instantly, provides curated study materials, and tracks progress to make students exam-ready.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | NextAuth.js v5 (Auth.js) with Google OAuth |
| Database | Neon PostgreSQL (serverless) |
| ORM | Prisma |
| Validation | Zod |
| Charts | Recharts (via shadcn/ui charts) |

---

## Core Features

### 1. Authentication & Onboarding
- **Google OAuth Login** — One-click sign-in with Gmail
- **Auto Profile Creation** — First login creates student profile
- **Profile Completion** — Add name, grade, school (Class 9 pre-selected)
- **Protected Routes** — All pages require authentication

### 2. Student Dashboard (`/dashboard`)
- **Weekly Overview Card** — Current week number, total assignments, pending count
- **Quick Stats** — Submissions this week, average score, study streak
- **Subject Cards** — 5 CBSE subjects with progress rings
- **Recent Activity Feed** — Latest assignments, submission results
- **Upcoming Deadlines** — Assignments due this week

### 3. Weekly Assignment System (`/assignments`)
- **Auto-Generated Weekly Assignments** — Every Monday, new assignments appear for all 5 subjects
- **Subject-wise Grouping** — Math, Science, Social Science, English, Hindi
- **Assignment Status** — Not Started / In Progress / Submitted / Evaluated
- **Assignment Detail Page** (`/assignments/[id]`)
  - Title, description, subject, max marks, due date
  - Question set (MCQs + short answer)
  - "Start Assignment" → "Mark In Progress" → "Submit"
  - Timer for mock exam mode

### 4. Auto-Evaluation Engine (`/submissions/[id]`)
- **Instant Grading** — Submit → immediate score
- **MCQ Evaluation** — Automatic correct/incorrect marking
- **Short Answer Evaluation** — Keyword-based matching with partial marks
- **Detailed Feedback** — Correct answers, explanations, suggested study links
- **Score Breakdown** — Per-question marks, subject-wise total

### 5. Study Materials (`/study-materials`)
- **Curated Resources** — Notes, video links, practice PDFs per subject
- **Subject Filter** — Math, Science, SST, English, Hindi
- **Resource Types** — Notes, Videos, Practice Papers, Formulas
- **Search** — Find topics quickly
- **Bookmark** — Save important materials

### 6. Progress & Analytics (`/progress`)
- **Weekly Score Chart** — Line chart of scores over weeks
- **Subject-wise Performance** — Bar chart comparing subjects
- **Assignment Completion Rate** — Pie chart of status distribution
- **Strength & Weakness Analysis** — Best and worst performing subjects
- **Study Streak Tracker** — Consecutive active days

### 7. Mock Exam Mode
- **Timed Assessments** — Configurable timer per assignment
- **Full Subject Tests** — Comprehensive tests covering multiple chapters
- **Board Exam Pattern** — Questions formatted like CBSE board papers
- **Result Summary** — Rank, percentile, time taken, accuracy

### 8. Gamification
- **Badges** — "First Submission", "Perfect Score", "7-Day Streak", "All Subjects Done"
- **Leaderboard** — Compare scores with classmates (if class feature added later)
- **Progress Levels** — Beginner → Scholar → Topper → Board Ready

---

## Database Schema (Prisma)

```prisma
model User {
  id            String        @id @default(uuid())
  email         String        @unique
  name          String?
  image         String?
  grade         String        @default("9")
  createdAt     DateTime      @default(now())
  submissions   Submission[]
  progress      Progress[]
}

model Subject {
  id            String        @id @default(uuid())
  name          String        // Math, Science, SST, English, Hindi
  color         String        // Tailwind color class
  assignments   Assignment[]
  materials     StudyMaterial[]
}

model Assignment {
  id            String        @id @default(uuid())
  title         String
  description   String
  weekNumber    Int
  subjectId     String
  subject       Subject       @relation(fields: [subjectId], references: [id])
  questions     Json          // Array of {question, options, correctAnswer, type, marks}
  maxMarks      Int
  dueDate       DateTime
  submissions   Submission[]
}

model Submission {
  id            String        @id @default(uuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  assignmentId  String
  assignment    Assignment    @relation(fields: [assignmentId], references: [id])
  answers       Json
  score         Int
  maxMarks      Int
  feedback      String?
  status        String        // IN_PROGRESS / SUBMITTED
  submittedAt   DateTime      @default(now())
}

model StudyMaterial {
  id            String        @id @default(uuid())
  title         String
  description   String?
  type          String        // NOTES / VIDEO / PDF / PRACTICE
  url           String?
  subjectId     String
  subject       Subject       @relation(fields: [subjectId], references: [id])
  topic         String
  createdAt     DateTime      @default(now())
}

model Progress {
  id            String        @id @default(uuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  weekNumber    Int
  totalAssignments Int
  completedAssignments Int
  averageScore  Float
  subjectScores Json          // { subjectId: score }
}
```

---

## Page Routes

| Route | Description |
|-------|-------------|
| `/login` | Google OAuth sign-in |
| `/dashboard` | Main dashboard with weekly overview |
| `/assignments` | List of all assignments |
| `/assignments/[id]` | Assignment detail & submission |
| `/submissions/[id]` | Evaluated result & feedback |
| `/study-materials` | Curated study resources |
| `/progress` | Analytics & performance charts |
| `/profile` | Student profile settings |

---

## CBSE Class 9 Subjects & Weekly Content Plan

### Subjects
1. **Mathematics** — Number Systems, Polynomials, Coordinate Geometry, Linear Equations, Euclid's Geometry, Lines & Angles, Triangles, Quadrilaterals, Area, Circles, Constructions, Heron's Formula, Surface Areas & Volumes, Statistics, Probability
2. **Science** — Matter, Is Matter Around Us Pure, Atoms & Molecules, Structure of Atom, Cell, Tissues, Diversity in Living Organisms, Motion, Force & Laws, Gravitation, Work & Energy, Sound, Why Do We Fall Ill, Natural Resources, Improvement in Food Resources
3. **Social Science** — History (French Revolution, Socialism, Nazism, Forest Society, Pastoralists, Peasants & Farmers), Geography (India — Size & Location, Physical Features, Drainage, Climate, Natural Vegetation, Population), Civics (Democracy, Constitutional Design, Electoral Politics, Working of Institutions, Democratic Rights), Economics (Story of Village Palampur, People as Resource, Poverty, Food Security)
4. **English** — Beehive & Moments prose/poetry, Grammar, Writing (Letters, Articles, Reports)
5. **Hindi** — Kshitij & Kritika prose/poetry, Vyakaran, Nibandh, Patra Lekhan

### Weekly Assignment Pattern
- **5 assignments per week** (1 per subject)
- **Each assignment**: 10 questions (5 MCQ + 3 Short Answer + 2 Long Answer)
- **Max Marks**: 25 per assignment
- **Due**: End of the week (Sunday)

---

## Build Phases

### Phase 1: Foundation
- Initialize Next.js + shadcn/ui
- Setup Prisma + Neon PostgreSQL
- Configure Google OAuth (NextAuth.js)
- Create base layout & navigation

### Phase 2: Core Features
- Dashboard page with stats
- Assignment list & detail pages
- Submission form with timer
- Auto-evaluation engine

### Phase 3: Content & Analytics
- Study materials page
- Progress charts & analytics
- Seed CBSE Class 9 data

### Phase 4: Polish
- Gamification (badges, streaks)
- Responsive design
- Performance optimization
- Final testing

---

## Design Notes
- **Color Theme**: Calm academic feel — slate/blue primary, soft backgrounds
- **Typography**: Clean, readable fonts (Inter/system)
- **Mobile-First**: Fully responsive for tablets and phones
- **Accessibility**: ARIA labels, keyboard navigation, focus states

---

## Environment Variables Required

```env
# Database
DATABASE_URL="postgresql://..." // Neon connection string

# Auth (Google OAuth)
AUTH_SECRET="your-random-secret"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# App
NEXTAUTH_URL="http://localhost:3000"
```

---

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your credentials
3. Run `npm install`
4. Run `npx prisma migrate dev` to set up the database
5. Run `npx prisma db seed` to seed CBSE data
6. Run `npm run dev` to start the development server

---

*Built with ❤️ for CBSE Class 9 students.*

---

## Agent Skills

The following skills are available to the Agent for development tasks:

| Skill | Description | Location |
|-------|-------------|----------|
| **Code Review** | Perform comprehensive code reviews including security, performance, accessibility, and best practices analysis | `.clinerules/skills/code-review.md` |
| **Unit Test** | Create, run, and manage unit tests with Jest and React Testing Library | `.clinerules/skills/unit-test.md` |
| **Build and Run** | Build, run, deploy, and troubleshoot the application | `.clinerules/skills/build-and-run.md` |
| **Design UX/UI** | Create and evaluate user experience and interface designs with accessibility and responsive design | `.clinerules/skills/design-ux-ui.md` |
| **Content Aggregation** | Automated web content procurement, AI-powered relevance filtering, and safety validation for CBSE Class 9 | `.clinerules/skills/content-aggregation.md` |

### Using Skills

To use a skill, reference it in your instructions or ask the Agent to perform tasks using specific skills:

- **"Run a code review on the recent changes"** - Uses Code Review skill
- **"Write unit tests for the AssignmentCard component"** - Uses Unit Test skill
- **"Build and deploy the application"** - Uses Build and Run skill
- **"Design a new dashboard layout"** - Uses Design UX/UI skill
- **"Start the content aggregation agent"** - Uses Content Aggregation skill
- **"Review pending content for approval"** - Uses Content Aggregation skill

Each skill provides detailed guidelines, commands, and best practices for the Agent to follow.
