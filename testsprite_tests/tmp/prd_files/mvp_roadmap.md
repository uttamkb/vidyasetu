# VidyaSetu MVP Roadmap

> **Platform Goal:** Help individual students stay continuously exam-ready through AI-powered assignments, evaluation, ranking, and guided learning.
> **Last Updated:** May 2, 2026
> **Status:** 🚧 In Progress — Phase 0–2 ✅, Phase 3 ✅, Phase 4 ✅ (API + UI done), Phase 5–7 pending

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

## 📊 Implementation Snapshot (as of May 2, 2026)

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
| `prisma db push` synced | ✅ Done | Run successfully 2026-05-02 |

### ✅ Infrastructure — Fully Implemented
| Concern | Status |
|---------|--------|
| Auth.js v5 three-file pattern (`auth.config.ts` / `auth.ts` / `auth.edge.ts`) | ✅ Done |
| Prisma v7 + Neon adapter (`PrismaNeon`) in `src/lib/db.ts` | ✅ Done |
| Gemini SDK setup in `src/lib/gemini.ts` (Flash + Pro) | ✅ Done |
| Rate-limiter in `src/lib/rate-limit.ts` | ✅ Done |
| Middleware (`src/middleware.ts`) using `auth.edge.ts` | ✅ Done |
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

### ❌ API Routes — Missing
| Route | Phase | Priority |
|-------|-------|----------|
| ~~`GET /api/leaderboard/me`~~ | P4 | ✅ Done |
| ~~`GET /api/progress/trends`~~ | P3 | ✅ Done |
| ~~`GET /api/curriculum`~~ | P5 | ✅ Done |
| ~~`GET /api/curriculum/[subjectId]/chapters`~~ | P5 | ✅ Done |
| ~~`GET /api/study-materials`~~ | P5 | ✅ Done |
| `POST /api/admin/curriculum/subjects` | P7 | 🟢 Low |
| `POST /api/admin/curriculum/chapters` | P7 | 🟢 Low |
| `POST /api/admin/curriculum/topics` | P7 | 🟢 Low |
| `POST /api/admin/content/materials` | P7 | 🟢 Low |
| `GET /api/admin/questions` | P7 | 🟢 Low |
| `GET /api/admin/students` | P7 | 🟢 Low |

### ✅ UI Pages — Implemented
| Page | Status | Notes |
|------|--------|-------|
| `/login` | ✅ Done | Google OAuth + demo |
| `/onboarding` | ✅ Done | Collects grade, subjects, state, district, school |
| `/dashboard` | ✅ Done | Fully featured with Next Up AI recommendations |
| `/assignments` (list) | ✅ Done | Includes "Generate with AI" modal |
| `/assignments/[id]` (take test) | ✅ Done | Assignment form component present |
| `/submissions/[id]` (result) | ✅ Done | Per-question feedback UI + "Your Learning Path" |
| `/progress` (charts) | ✅ Done | Progress stats, Trends, Mastery Map, Strength/Weakness panel |
| `/study-materials` | ✅ Curriculum Browser | Interactive subject tabs, chapter tree, material cards |
| `/leaderboard` | ✅ Done | Full leaderboard with scopes (All, State, District, School) |
| `/profile` | ✅ Done | |

### ❌ UI Pages — Missing
| Page | Phase | Priority |
|------|-------|----------|
| `/admin` dashboard and sub-pages | P7 | 🔴 High |

---

## Phase 0 — Foundation Cleanup ✅ COMPLETE

**Goal:** Clean schema, remove dead weight, add missing fields.

- [x] Add `state`, `district`, `school`, `role` to `User`
- [x] Add `type`, `difficulty`, `chapterId`, `topicIds`, `isAIGenerated` to `Assignment`
- [x] Add `percentageScore`, `aiFeedback`, `evaluatedAt` to `Submission`
- [x] Add `chapterId`, `topicId`, `youtubeUrl`, `thumbnailUrl`, `fileUrl`, `materialType` to `StudyMaterial`
- [x] Create `LeaderboardEntry` model
- [x] Drop `ContentSource`, `ContentItem`, `ContentQueue`, `ContentCurationLog`, `AgentRun`
- [x] Run `npx prisma db push` — synced ✅
- [x] Remove content aggregation services + routes + dashboard page
- [ ] **🔴 TODO:** Update onboarding to collect `state`, `district`, `school` — form exists but fields missing

---

## Phase 1 — AI Assignment Engine ✅ COMPLETE

**Goal:** Students can generate and take AI-created tests by chapter, semester, or full syllabus.

- [x] `src/services/assignment-generator.ts` — `generateAssignment()` implemented
- [x] `POST /api/assignments/generate` — route live
- [x] `GET /api/assignments` — list route live
- [x] `GET /api/assignments/[id]` — detail route live
- [x] Assignment list UI (`/assignments`) — done
- [x] Assignment detail/take-test UI (`/assignments/[id]`) — done with timer form
- [x] "Generate with AI" modal on assignments page (quick-launch without navigating away) ✅

---

## Phase 2 — Submission & AI Evaluation ✅ MOSTLY COMPLETE

**Goal:** Student submits assignment; AI evaluates like a teacher.

- [x] `src/services/evaluation-engine.ts` — `evaluateSubmission()` implemented (MCQ auto-grade + Gemini Pro for subjective)
- [x] `POST /api/submissions` — submit answers route live
- [x] `GET /api/submissions/[id]` — evaluation result route live
- [x] `GET /api/submissions` — history route live
- [x] Submission result UI (`/submissions/[id]`) — per-question breakdown done
- [x] Mastery update after evaluation — wired into evaluation engine
- [x] "Retry Weak Topics" button on submission result page → triggers targeted remedial assignment ✅

---

## Phase 3 — Performance Dashboard ✅ COMPLETE

**Goal:** Student sees their complete academic picture — marks, trends, mastery.

- [x] `GET /api/progress` — overall stats route live
- [x] `GET /api/progress/mastery` — mastery map data route live
- [x] `GET /api/progress/history` — score history route live
- [x] Marks history chart (weekly score line chart) — implemented in `progress-charts.tsx`
- [x] Subject-wise performance bar chart — implemented in `progress-charts.tsx`
- [x] `GET /api/progress/trends` — weekly trend API route implemented ✅
- [x] Mastery Map UI — color grid (🔴🟡🟢 per subtopic) implemented ✅
- [x] Strength/Weakness analysis panel (top 3 strong + top 3 weak subtopics) ✅
- [x] Improvement trend chart component ✅

---

## Phase 4 — Leaderboard & Ranking ✅ COMPLETE

**Goal:** Students see their rank against peers (school, district, state, all-India).

- [x] `LeaderboardEntry` schema with all rank fields — done
- [x] `GET /api/leaderboard` — main leaderboard route live (period + scope params)
- [x] `GET /api/leaderboard/me` — student's own rank details route implemented ✅
- [x] `/leaderboard` UI page — full page implemented (tabs: Weekly/Monthly/All-Time; scope: School/District/State/All India; "Your Rank" card) ✅

---

## Phase 5 — Guided Learning Path ✅ COMPLETE

**Goal:** Structured curriculum roadmap with study materials per topic.

- [x] `StudyMaterial` schema with `chapterId`, `topicId`, `youtubeUrl`, `thumbnailUrl`, `materialType` — done
- [x] `src/services/content-curator.ts` — `generateTopicContentPack()`, `saveContentPack()` implemented
- [x] `GET /api/curriculum` — full curriculum tree route ✅
- [x] `GET /api/curriculum/[subjectId]/chapters` — route ✅
- [x] `GET /api/study-materials?topicId=xxx` — filtered route ✅
- [x] Curriculum Browser UI — Subject tabs + expandable Chapter → Topic sidebar + material cards ✅
- [x] YouTube thumbnail auto-derive from video ID (no API key needed) ✅
- [x] Inline notes reader modal for NOTES / PLATFORM_CONTENT materials ✅

---

## Phase 6 — Recommendation Engine ✅ COMPLETE

**Goal:** System tells the student what to study next.

- [x] `src/services/recommendation-engine.ts` — `getRecommendations()`, `getNextUpSummary()`, `generateRemedialAssignment()` all implemented
- [x] `GET /api/recommendations` — route live
- [x] `POST /api/recommendations/remedial` — route live
- [x] Dashboard **"Next Up" widget** wired to `getNextUpSummary()` — shows top 3 AI recommendations with Study/Practice CTAs ✅
- [x] **Weekly Summary card** — mastered topics this week, weak area count, strong areas ✅
- [x] Submission result **"Your Learning Path"** card — shows top 3 recommendations after every test ✅

---

## Phase 7 — Admin / Content Management ❌ NOT STARTED

**Goal:** Admin can manage syllabus, upload materials, and configure the platform.

- [x] `User.role` field with `"ADMIN"` value — schema ready
- [x] `content-curator.ts` service ready
- [x] Admin role middleware guard for `/admin/*` and `/api/admin/*` ✅
- [x] `/admin` dashboard page ✅
- [ ] **🔴 TODO:** `/admin/curriculum` — Subjects → Chapters → Topics → Subtopics CRUD
- [ ] **🔴 TODO:** `/admin/content` — material upload UI
- [ ] **🔴 TODO:** `/admin/questions` — AI-generated question review queue
- [ ] **🔴 TODO:** `/admin/leaderboard` — leaderboard settings
- [ ] **🔴 TODO:** `/admin/students` — student management
- [ ] **🔴 TODO:** All `/api/admin/*` routes

---

## 🎯 Next Up — What to Build Now

> Based on audit: Phase 0+1+2+6 are done. Phase 3 needs polish, Phase 4 and 5 need their UI, Phase 7 not started.

### Immediate Priority (unblocks everything):
1. **Onboarding `state/district/school` fields** — required for leaderboard scoping to work
2. **`GET /api/progress/trends`** — completes Phase 3 API surface
3. **Mastery Map UI** on `/progress` — most visible missing feature
4. **`GET /api/leaderboard/me`** + `/leaderboard` page — Phase 4 completion

### Next Sprint:
5. **`/api/curriculum` + `/api/study-materials`** routes
6. **Curriculum Browser UI** redesign on `/study-materials`
7. **Dashboard "Next Up" widget** wired to recommendation engine
8. **Admin role gate + basic admin pages** (curriculum + content upload)

---

## Complete Feature → Phase Map (Updated)

| # | Feature | Phase | Week | Status |
|---|---------|-------|------|--------|
| 1 | Schema cleanup + user profile (state/district/school) | P0 | 1 | ✅ Schema done / 🔴 Onboarding UI missing |
| 2 | AI Assignment Generator (chapter/semester/full) | P1 | 2 | ✅ Done |
| 3 | Difficulty levels (Easy/Medium/Hard) | P1 | 2 | ✅ Done |
| 4 | Personalized assignment (based on mastery) | P1 | 2 | ✅ Done |
| 5 | Submission form with timer | P2 | 3 | ✅ Done |
| 6 | Auto-grade objective answers (MCQ/Numeric) | P2 | 3 | ✅ Done |
| 7 | AI-evaluate subjective answers | P2 | 3 | ✅ Done |
| 8 | Per-question feedback + corrections + explanation | P2 | 3 | ✅ Done |
| 9 | Overall AI feedback paragraph | P2 | 3 | ✅ Done |
| 10 | Mastery update after evaluation | P2 | 3 | ✅ Done |
| 11 | Marks history chart | P3 | 4 | ✅ Done |
| 12 | Subject-wise performance chart | P3 | 4 | ✅ Done |
| 13 | Topic Mastery Map (color grid) | P3 | 4 | ❌ Missing |
| 14 | Strength/Weakness analysis | P3 | 4 | ❌ Missing |
| 15 | Improvement trend chart | P3 | 4 | ❌ Missing (API also missing) |
| 16 | Weekly leaderboard | P4 | 5 | 🟡 API only (no UI) |
| 17 | Monthly leaderboard | P4 | 5 | 🟡 API only (no UI) |
| 18 | State-wise ranking | P4 | 5 | 🟡 API only (no UI) |
| 19 | District-wise ranking | P4 | 5 | 🟡 API only (no UI) |
| 20 | School-wise ranking | P4 | 5 | 🟡 API only (no UI) |
| 21 | Student's own rank card | P4 | 5 | ❌ Missing (`/api/leaderboard/me` missing) |
| 22 | Curriculum browser (Subject → Chapter → Topic) | P5 | 6 | ❌ Missing (API + UI) |
| 23 | YouTube video embed with thumbnail | P5 | 6 | 🟡 Schema ready, no UI |
| 24 | PDF/Notes/Worksheet material cards | P5 | 6 | 🟡 Schema ready, no UI |
| 25 | Recommendation after evaluation | P6 | 7 | 🟡 Service done, UI not wired |
| 26 | Remedial assignment generation | P6 | 7 | ✅ Done |
| 27 | "Next Up" adaptive path on dashboard | P6 | 7 | ❌ Not wired to dashboard |
| 28 | Admin: Curriculum management | P7 | 8 | ❌ Not started |
| 29 | Admin: Content upload | P7 | 8 | ❌ Not started |
| 30 | Admin: Question review queue | P7 | 8 | ❌ Not started |
| 31 | Admin: Leaderboard settings | P7 | 8 | ❌ Not started |
| 32 | Admin: Student management | P7 | 8 | ❌ Not started |

---

## API Surface Summary (Updated)

```
✅ /api/assignments/generate     POST   - Generate AI assignment
✅ /api/assignments              GET    - List assignments
✅ /api/assignments/[id]         GET    - Assignment detail

✅ /api/submissions              POST   - Submit answers
✅ /api/submissions/[id]         GET    - Evaluation result
✅ /api/submissions              GET    - Submission history

✅ /api/progress                 GET    - Overall stats
✅ /api/progress/mastery         GET    - Mastery map
✅ /api/progress/history         GET    - Score history
❌ /api/progress/trends          GET    - Weekly trends  ← MISSING

✅ /api/leaderboard              GET    - Leaderboard (?period&scope)
❌ /api/leaderboard/me           GET    - My ranks  ← MISSING

❌ /api/curriculum               GET    - Full tree  ← MISSING
❌ /api/curriculum/[id]/chapters GET    - Chapters  ← MISSING
❌ /api/study-materials          GET    - Materials by topic  ← MISSING

✅ /api/recommendations          GET    - Personalized recommendations
✅ /api/recommendations/remedial POST   - Generate remedial test

❌ /api/admin/curriculum/*       CRUD   - Admin only  ← NOT STARTED
❌ /api/admin/content/*          CRUD   - Admin only  ← NOT STARTED
❌ /api/admin/questions/*        CRUD   - Admin only  ← NOT STARTED
❌ /api/admin/students           GET    - Admin only  ← NOT STARTED
```

---

## External Service Dependencies

| Service | Purpose | Required For | Status |
|---------|---------|-------------|--------|
| **Google Gemini 1.5 Flash** | Question generation, MCQ explanations | Phase 1, 2 | ✅ Configured |
| **Google Gemini 1.5 Pro** | Subjective answer evaluation, topic content curation | Phase 2, 5 | ✅ Configured |
| **Neon PostgreSQL** | Primary database | All phases | ✅ Active |
| **NextAuth v5** | Authentication | All phases | ✅ Active |
| **YouTube oEmbed API** | Fetch thumbnails for video links | Phase 5 | ❌ Not integrated |
| **Vercel Blob / AWS S3** | PDF/file uploads | Phase 5, 7 | ❌ Not integrated |

---

## ✅ Decisions — All Resolved

| # | Question | Decision |
|---|----------|---------:|
| 1 | AI Provider | **Google Gemini** (Flash for gen, Pro for eval) |
| 2 | Leaderboard opt-in/out | **Opt-in** — `leaderboardOptIn` field on User |
| 3 | Content upload | **Admin-only UI** + Gemini auto-generates topic content packs |
| 4 | Free vs paid | **Everything free** for MVP |
| 5 | Board support | **CBSE only** — single board seed |

---

## 8-Week Delivery Timeline (Revised)

```
Week 1  ████████████████░░░░░░░░░░░░░░░░  Phase 0: Schema + Cleanup          ✅ DONE
Week 2  ████████████████░░░░░░░░░░░░░░░░  Phase 1: AI Assignment Engine       ✅ DONE
Week 3  ████████████████░░░░░░░░░░░░░░░░  Phase 2: Submission + AI Evaluation ✅ DONE
Week 4  ████████░░░░░░░░░░░░░░░░░░░░░░░░  Phase 3: Performance Dashboard      🚧 50% (charts done; mastery map + trends missing)
Week 5  ░░░░████░░░░░░░░░░░░░░░░░░░░░░░░  Phase 4: Leaderboard & Ranking      🚧 25% (API done; /me + entire UI missing)
Week 6  ░░░░░░░░████░░░░░░░░░░░░░░░░░░░░  Phase 5: Guided Learning Path       🚧 20% (service done; API + UI missing)
Week 7  ████████░░░░░░░░░░░░░░░░░░░░░░░░  Phase 6: Recommendation Engine      🚧 70% (service+API done; UI wiring missing)
Week 8  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 7: Admin CMS                  ❌ NOT STARTED
```
