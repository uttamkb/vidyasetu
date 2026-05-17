# VidyaSetu MVP Roadmap

> **Platform Goal:** Help individual students stay continuously exam-ready through AI-powered assignments, evaluation, ranking, and guided learning.
> **Last Updated:** May 16, 2026
> **Status:** 🚧 In Progress — Phase 0–6 ✅, Phase 7 🚧

---

## ✅ Locked Product Decisions

| Decision | Choice | Implication |
|----------|--------|-----------|
| **AI Provider** | Google Gemini (Gemini 1.5 Pro + Flash) | Use `@google/generative-ai` SDK; Flash for question gen, Pro for subjective eval |
| **Leaderboard** | Opt-in | `leaderboardOptIn Boolean @default(false)` on `User` ✅ shipped |
| **Content Upload** | Admin-only UI, but **Gemini auto-generates curated content** per topic | Gemini generates: topic summary notes, YouTube search queries, key concept flashcards |
| **Pricing** | Everything free for MVP | No subscription gates anywhere |
| **Board** | CBSE only | Single board seed; `board` field defaults to `"CBSE"` and is hidden from UI |

---

## 📊 Implementation Snapshot (as of May 16, 2026)

### ✅ Schema — Fully Implemented
| Model | Status | Notes |
|-------|--------|-------|
| `User` (with `state`, `district`, `school`, `role`, `leaderboardOptIn`) | ✅ Done | All P0 fields present in schema |
| `Subject → Chapter → Topic → Subtopic` | ✅ Done | Full curriculum graph with `onDelete: Cascade` |
| `Question` (enums: `QuestionType`, `BloomLevel`) | ✅ Done | First-class entity with indexes |
| `Assignment` (enums: `AssignmentType`, `DifficultyLevel`) | ✅ Done | All P1 fields: `type`, `difficulty`, `chapterId`, `topicIds`, `isAIGenerated` |
| `Submission` (with `percentageScore`, `aiFeedback`, `evaluatedAt`) | ✅ Done | All P2 fields present |
| `UserMastery` | ✅ Done | Full spaced-repetition fields |
| `PracticeSession` + `SessionQuestion` | ✅ Done | |
| `StudyMaterial` (with `chapterId`, `topicId`, `youtubeUrl`, `thumbnailUrl`, `fileUrl`, `materialType`) | ✅ Done | Enum `MaterialType` present |
| `LeaderboardEntry` (with `overallRank`, `stateRank`, `districtRank`, `schoolRank`) | ✅ Done | P4 model ready |
| `StudyStreak`, `Notification`, `Badge`, `UserBadge` | ✅ Done | |
| `WeeklyChallenge`, `UserChallenge` | ✅ Done | |
| Dead models (`ContentSource`, `ContentItem`, etc.) | ✅ Removed | Replaced by `SubjectLegacy` stub |
| `prisma db push` synced | ✅ Done | Run successfully |

### ✅ Infrastructure — Fully Implemented
| Concern | Status |
|---------|--------|
| Auth.js v5 three-file pattern (`auth.config.ts` / `auth.ts` / `auth.edge.ts`) | ✅ Done |
| Prisma v7 + Neon adapter (`PrismaNeon`) in `src/lib/db.ts` | ✅ Done |
| Gemini SDK setup in `src/lib/gemini.ts` (Flash + Pro) | ✅ Done |
| Rate-limiter in `src/lib/rate-limit.ts` | ✅ Done |
| Proxy Gateway (`src/proxy.ts`) using `auth.edge.ts` | ✅ Next.js 16 Migrated |
| `serverExternalPackages` in `next.config.ts` | ✅ Done |

### ✅ Services — All Core Services Built
| Service | Status | File |
|---------|--------|------|
| `assignment-generator.ts` — `generateAssignment()` | ✅ Done | `src/services/assignment-generator.ts` |
| `evaluation-engine.ts` — `evaluateSubmission()` | ✅ Done | `src/services/evaluation-engine.ts` |
| `recommendation-engine.ts` — `getRecommendations()`, `getNextUpSummary()`, `generateRemedialAssignment()` | ✅ Done | `src/services/recommendation-engine.ts` |
| `content-curator.ts` — `generateTopicContentPack()`, `saveContentPack()` | ✅ Done | `src/services/content-curator.ts` |
| `diagnostic.ts` | ✅ Done | `src/services/diagnostic.ts` |
| `gamification.ts` | ✅ Done | `src/services/gamification.ts` |

### ✅ API Routes — Implemented
| Route | Status |
|-------|--------|
| `POST /api/assignments/generate` | ✅ Done |
| `GET /api/assignments` | ✅ Done |
| `GET /api/assignments/[id]` | ✅ Done |
| `POST /api/submissions` | ✅ Done |
| `GET /api/submissions/[id]` | ✅ Done |
| `GET /api/progress` | ✅ Done |
| `GET /api/progress/mastery` | ✅ Done |
| `GET /api/progress/history` | ✅ Done |
| `GET /api/recommendations` | ✅ Done |
| `POST /api/recommendations/remedial` | ✅ Done |
| `GET /api/leaderboard` | ✅ Done |
| `GET/PATCH /api/profile` | ✅ Done |
| `POST /api/onboarding` | ✅ Done |

### ✅ UI Pages — Implemented
| Page | Status | Notes |
|------|--------|-------|
| `/login` | ✅ Done | Self-healing Auth implemented |
| `/onboarding` | ✅ Done | Collects grade, subjects, state, district, school |
| `/dashboard` | ✅ Done | Fully featured with Next Up AI recommendations |
| `/assignments` (list) | ✅ Done | Includes "Generate with AI" modal |
| `/assignments/[id]` (take test) | ✅ Done | Assignment form component present |
| `/submissions/[id]` (result) | ✅ Done | Per-question feedback UI + "Your Learning Path" |
| `/progress` (charts) | ✅ Done | Progress stats, Trends, Mastery Map, Strength/Weakness panel |
| `/study-materials` | ✅ Curriculum Browser | Interactive subject tabs, chapter tree, material cards |
| `/leaderboard` | ✅ Done | Full leaderboard with scopes (All, State, District, School) |
| `/profile` | ✅ Done | |
| `/playbook` | ✅ Done | Student Manual & Workflow Documentation |

### ❌ UI Pages — Missing
| Page | Phase | Priority |
|------|-------|----------|
| `/admin` dashboard and sub-pages | P7 | 🔴 High |

---

## Phase 0 — Foundation Cleanup ✅ COMPLETE
## Phase 1 — AI Assignment Engine ✅ COMPLETE
## Phase 2 — Submission & AI Evaluation ✅ COMPLETE
## Phase 3 — Performance Dashboard ✅ COMPLETE
## Phase 4 — Leaderboard & Ranking ✅ COMPLETE
## Phase 5 — Guided Learning Path ✅ COMPLETE
## Phase 6 — Recommendation Engine ✅ COMPLETE

---

## Phase 7 — Admin / Content Management 🚧 IN PROGRESS

**Goal:** Admin can manage syllabus, upload materials, and configure the platform.

- [x] Admin role middleware guard for `/admin/*` and `/api/admin/*` ✅
- [x] `/admin` dashboard layout ✅
- [x] `/admin/seeder` — Background Smart Notes Seeding Dashboard ✅
- [ ] `/admin/curriculum` — Subjects → Chapters → Topics → Subtopics CRUD
- [ ] `/admin/content` — material upload UI
- [ ] `/admin/questions` — AI-generated question review queue
- [ ] `/admin/students` — student management

---

## 🎯 Next Up — What to Build Now

1. **Admin Curriculum Management UI** (`/admin/curriculum`) — allows admins to view and edit subjects, chapters, and topics.
2. **Question Review Queue** (`/admin/questions`) — review AI-generated questions before they enter the public question bank.
