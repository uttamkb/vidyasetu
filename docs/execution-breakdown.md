# VidyaSetu — Complete Execution Breakdown

> **Roles:** Senior Product Manager · Solution Architect · Engineering Lead  
> **Date:** May 1, 2026  
> **North Star Doc:** `PRODUCT-STRATEGY-V2.md`  
> **Current Stack:** Next.js 16 (App Router) · TypeScript · Tailwind · shadcn/ui · Prisma · Neon PostgreSQL · Auth.js v5 · Vitest  
> **MVP Definition:** A single CBSE Class 9 student can sign up, complete an adaptive diagnostic, see their Mastery Map, complete a daily Smart Review, use the AI Socratic Tutor, and track exam readiness — all within 7 days.

---

## 1. Product Modules

| # | Module | Description | Maps to Vision Feature |
|---|--------|-------------|------------------------|
| M1 | **Platform Foundation** | Auth, onboarding, user profile, notifications, streak tracking, base UI shell | Admin (user mgmt), Engagement baseline |
| M2 | **Curriculum & Knowledge Graph** | 4-level taxonomy (Subject→Chapter→Topic→Subtopic), prerequisite mapping, question bank | Guided Learning Path hierarchy |
| M3 | **Diagnostic & Mastery Engine** | Adaptive diagnostic test, initial skill estimation, Mastery Map visualization, UserMastery CRUD | AI Assignment Engine (diagnostic variant) |
| M4 | **Smart Review & Adaptive Practice** | Spaced repetition queue, daily review generation, interleaving, real-time difficulty scaling, topic-focus sessions | Submission & Evaluation, Recommendation Engine |
| M5 | **AI Socratic Tutor** | Embedded tiered hints, misconception detection, error-pattern analysis, remediation flow with near-transfer questions | Submission & Evaluation (subjective evaluation), Guided Learning |
| M6 | **Exam Readiness & Analytics** | Weekly 20-min exam sprints, predictive readiness score (0-100), performance dashboard, weekly insight cards | Performance Dashboard, Leaderboard (personal only) |
| M7 | **Engagement & Habit System** | Learning-validated streaks, momentum UI (Knowledge Chain), session quality scoring, compassionate notification system | Leaderboard / Ranking (future), Engagement |
| M8 | **Content Management (Admin)** | Curriculum editor, question bank CRUD, misconception library, micro-explanation curation, content quality scoring | Admin / Content Management |
| M9 | **Infrastructure & Observability** | Redis caching, BullMQ job queues, API rate limiting, event tracking pipeline, error monitoring, PWA shell | DevOps / Deployment, Security / Auth |

---

## 2. Epics per Module

### M1 — Platform Foundation
| Epic ID | Epic Name |
|---------|-----------|
| M1-E1 | Authentication & Authorization |
| M1-E2 | Frictionless Onboarding Flow |
| M1-E3 | User Profile & Preferences |
| M1-E4 | Notification System |
| M1-E5 | Study Streak & Habit Tracker |

### M2 — Curriculum & Knowledge Graph
| Epic ID | Epic Name |
|---------|-----------|
| M2-E1 | Curriculum Taxonomy Schema |
| M2-E2 | Question Bank Architecture |
| M2-E3 | Prerequisite Graph |
| M2-E4 | Content Seeding & Curation |

### M3 — Diagnostic & Mastery Engine
| Epic ID | Epic Name |
|---------|-----------|
| M3-E1 | Adaptive Diagnostic Engine |
| M3-E2 | IRT-Based Skill Estimation |
| M3-E3 | Mastery Map UI |
| M3-E4 | UserMastery Persistence & Updates |

### M4 — Smart Review & Adaptive Practice
| Epic ID | Epic Name |
|---------|-----------|
| M4-E1 | Spaced Repetition Engine (FSRS-like) |
| M4-E2 | Daily Review Queue Generator |
| M4-E3 | Practice Session Manager |
| M4-E4 | Adaptive Difficulty Engine |
| M4-E5 | Interleaving Algorithm |

### M5 — AI Socratic Tutor
| Epic ID | Epic Name |
|---------|-----------|
| M5-E1 | LLM Gateway & Prompt Management |
| M5-E2 | Tiered Hint System |
| M5-E3 | Misconception Detection |
| M5-E4 | Remediation Flow Builder |
| M5-E5 | Explanation Cache & Cost Control |

### M6 — Exam Readiness & Analytics
| Epic ID | Epic Name |
|---------|-----------|
| M6-E1 | Weekly Exam Readiness Sprint |
| M6-E2 | Predictive Readiness Score |
| M6-E3 | Performance Dashboard |
| M6-E4 | Weekly Insight Cards |

### M7 — Engagement & Habit System
| Epic ID | Epic Name |
|---------|-----------|
| M7-E1 | Learning-Validated Streaks |
| M7-E2 | Momentum UI (Knowledge Chain + Mastery Map fills) |
| M7-E3 | Session Quality Scoring |
| M7-E4 | Notification Preferences & Compassionate Reminders |

### M8 — Content Management (Admin)
| Epic ID | Epic Name |
|---------|-----------|
| M8-E1 | Admin Portal Shell & RBAC |
| M8-E2 | Curriculum Editor |
| M8-E3 | Question Bank Manager |
| M8-E4 | Misconception Library |
| M8-E5 | AI Explanation Review Queue |

### M9 — Infrastructure & Observability
| Epic ID | Epic Name |
|---------|-----------|
| M9-E1 | Redis & Caching Layer |
| M9-E2 | Job Queue (BullMQ) |
| M9-E3 | API Rate Limiting & Security |
| M9-E4 | Event Tracking Pipeline |
| M9-E5 | Error Monitoring (Sentry) |
| M9-E6 | PWA & Offline Shell |

---

## 3. Detailed Tasks, Subtasks & Engineering Implementation

---

### M1 — Platform Foundation

#### M1-E1: Authentication & Authorization
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M1-E1-T1 | Fix Auth.js TypeScript strictness | P0 | S1 | Add `role`, `schoolId` to `next-auth.d.ts`; extend `User` session type; ensure `auth()` returns strict `User` object across all server components. |
| M1-E1-T2 | Google OAuth + Demo Account hardening | P0 | S1 | Verify `Account` model sync; add demo-account seed script; enforce `demo@vidyasetu.in` only in dev/staging; add demo flag to session. |
| M1-E1-T3 | Protected route middleware | P0 | S1 | Implement `middleware.ts` to redirect unauthenticated users to `/login`; whitelist public assets, `/api/auth/*`; add role-based route guards for `/admin/*`. |
| M1-E1-T4 | API route session validation | P0 | S1 | Create `lib/auth.ts` helper: `requireAuth()` that throws 401 if no session; wrap all `/api/*` handlers; add integration test for 401 on missing session. |

#### M1-E2: Frictionless Onboarding Flow
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M1-E2-T1 | 3-Question Onboarding UI | P0 | S1 | Build `/onboarding` page: hardest subjects multi-select, target score slider, study time preference dropdown; persist to `User.hardestSubjects`, `targetScore`, `studyTimePreference`. |
| M1-E2-T2 | Onboarding completion gate | P0 | S1 | Redirect new signups to `/onboarding` if `isOnboarded === false`; set `isOnboarded = true` on completion; update middleware to allow `/onboarding` while onboarding. |
| M1-E2-T3 | Personalized dashboard initialization | P0 | S1 | On onboarding complete, trigger `POST /api/diagnostic/start` to pre-create diagnostic session; reorder dashboard subject cards based on `hardestSubjects`. |
| M1-E2-T4 | Guided Tour (React Joyride) | P1 | S2 | Integrate `react-joyride` on first dashboard visit; highlight: Daily Review card, Mastery Map tab, Streak indicator, Profile menu; persist `hasSeenTour` in `User` model. |

#### M1-E3: User Profile & Preferences
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M1-E3-T1 | Profile page redesign | P1 | S2 | Update `/profile` page: display avatar, name, grade, board, study time preference; editable fields for name, grade, study time; board selection dropdown (CBSE/ICSE). |
| M1-E3-T2 | Notification preferences | P1 | S3 | Add `NotificationPreference` model or JSON column on `User`: `dailyReviewEnabled`, `streakAlertEnabled`, `weeklyInsightEnabled`, `reminderTime`; build toggle UI in profile. |
| M1-E3-T3 | Grade/Board change handler | P2 | S4 | On grade change, create new `UserMastery` rows for new curriculum; preserve old mastery data; invalidate all cached review queues in Redis. |

#### M1-E4: Notification System
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M1-E4-T1 | Notification data model | P1 | S2 | Finalize `Notification` model (already in schema): ensure indexes on `(userId, read)` and `(userId, createdAt)`; add `link` field for deep-linking. |
| M1-E4-T2 | Notification bell component | P1 | S2 | Build `NotificationBell` client component with badge count; fetch via `GET /api/notifications?unreadOnly=true`; mark read on click via `PATCH /api/notifications/:id/read`. |
| M1-E4-T3 | Notification triggers | P1 | S3 | Implement server-side trigger functions: `notifyAssignmentAvailable`, `notifyScorePublished`, `notifyBadgeEarned`, `notifyStreakAtRisk`; call from respective service layers. |
| M1-E4-T4 | Push notification PoC (OneSignal / web-push) | P2 | S5 | Evaluate `web-push` library vs OneSignal; implement service worker for push; send daily review reminder at `studyTimePreference`; A/B test copy. |

#### M1-E5: Study Streak & Habit Tracker
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M1-E5-T1 | Streak logic service | P0 | S2 | Build `src/services/streak.ts`: increment on any completed `PracticeSession`; reset to 0 if `lastStudyDate` is >2 days ago; update `StudyStreak` model. |
| M1-E5-T2 | Streak calendar UI | P1 | S2 | Build `StreakCalendar` component (GitHub-style contribution graph); fetch last 30 days of session completion dates; color-code by session count. |
| M1-E5-T3 | Dashboard streak prominence | P1 | S2 | Add streak counter to dashboard header; show flame icon + day count; animate on increment via `framer-motion`. |

---

### M2 — Curriculum & Knowledge Graph

#### M2-E1: Curriculum Taxonomy Schema
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M2-E1-T1 | Prisma schema refinement | P0 | S1 | Verify `Subject`, `Chapter`, `Topic`, `Subtopic` models; ensure `Subject` unique constraint on `[name, grade, board]`; add `grade` and `board` to `Subject` if missing. |
| M2-E1-T2 | Prerequisite self-relations | P0 | S1 | Verify `Topic.prerequisites` / `requiredFor` implicit many-to-many; add `@relation("TopicPrerequisites")` consistency check; write seed script for prerequisite linking. |
| M2-E1-T3 | CBSE Class 9 seed data | P0 | S1 | Complete `prisma/seed-curriculum.ts`: 5 subjects (Math, Science, Social Science, English, Hindi/II Lang) → ~15 chapters each → ~3-5 topics each → ~2-4 subtopics each; target 750 total subtopics. |
| M2-E1-T4 | Curriculum API endpoints | P0 | S1 | `GET /api/curriculum` (tree for user's grade/board); `GET /api/curriculum/:subjectId` (chapters); `GET /api/curriculum/chapter/:id` (topics); cache in Redis with 24h TTL. |

#### M2-E2: Question Bank Architecture
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M2-E2-T1 | Question model hardening | P0 | S1 | Ensure `Question` model has: `subtopicId`, `type` (enum), `bloomLevel` (enum), `difficulty` (1-5), `content` (JSON), `commonMisconceptions` (JSON), `prerequisiteIds` (String[]), `source`, `verifiedByHuman`. |
| M2-E2-T2 | Question content JSON schema | P0 | S1 | Define strict Zod schema for `content`: `{ question: string, options?: string[], correctAnswer: string | number | string[], explanation: string, diagramUrl?: string }`; validate on create/update. |
| M2-E2-T3 | Seed 500 curated questions | P0 | S2 | Create `prisma/seed-questions.ts`: 100 questions per subject, evenly distributed across subtopics; include at least 3 common misconceptions per question; tag source as `"curated"`. |
| M2-E2-T4 | Question search & filter API | P1 | S3 | `GET /api/questions?subtopicId=&difficulty=&bloomLevel=&type=`; paginated; used by admin and internal services; add `@@index([subtopicId, difficulty])` query plan verification. |
| M2-E2-T5 | Question usage analytics | P2 | S5 | Update `usageCount` and `avgAccuracy` on each session completion; background job recalculates nightly; expose to admin for quality triage. |

#### M2-E3: Prerequisite Graph
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M2-E3-T1 | Prerequisite data population | P1 | S2 | For each Topic, define prerequisite Topic IDs; seed for Class 9 Math (e.g., "Linear Equations" requires "Algebraic Expressions"); store in `Topic.prerequisites`. |
| M2-E3-T2 | Prerequisite validation API | P1 | S3 | `GET /api/prerequisites/:topicId`: returns ordered list of prerequisite topics; used by adaptive engine to detect readiness. |
| M2-E3-T3 | Prerequisite-aware session routing | P1 | S3 | In `AdaptiveDifficultyEngine`, if student fails at difficulty 1, call `findPrerequisiteQuestion()` to route to prerequisite subtopic instead. |

#### M2-E4: Content Seeding & Curation
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M2-E4-T1 | Human-curated micro-explanations | P1 | S3 | Create `MicroExplanation` model: `id`, `subtopicId`, `title`, `content` (markdown), `diagramUrl`, `misconceptionType`, `verifiedByHuman`; seed top 20 misconceptions. |
| M2-E4-T2 | Content quality scoring | P2 | S5 | Add `contentQualityScore` to `Question` and `MicroExplanation`; score based on student feedback (thumbs up/down), accuracy rates, tutor escalation rates. |

---

### M3 — Diagnostic & Mastery Engine

#### M3-E1: Adaptive Diagnostic Engine
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M3-E1-T1 | Diagnostic session type | P0 | S1 | Add `DIAGNOSTIC` to `SessionType` enum; create `PracticeSession` with `type=DIAGNOSTIC`, `targetDuration=15`, `interleaved=true`. |
| M3-E1-T2 | Interleaved diagnostic plan | P0 | S1 | Build `src/services/diagnostic.ts`: select 2-3 questions per subject, rotating every 3 questions (Math→Science→Math→English...); total 20 questions. |
| M3-E1-T3 | Adaptive branching logic | P1 | S2 | Real-time adaptation: if answer correct → harder difficulty or next subtopic; if wrong → easier difficulty or prerequisite topic; update `difficultyCalibration` live. |
| M3-E1-T4 | Diagnostic UI | P0 | S1 | Reuse existing assignment UI but strip timer urgency; add progress bar (question 1 of 20); subject badge per question; allow pause/resume via session status. |
| M3-E1-T5 | Diagnostic completion gate | P0 | S1 | On submit: call `MasteryCalculator` to initialize `UserMastery` rows for all subtopics in grade; set `masteryScore` based on diagnostic performance. |

#### M3-E2: IRT-Based Skill Estimation
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M3-E2-T1 | Simplified IRT implementation | P1 | S2 | Build `src/services/mastery-calculator.ts`: for each subtopic, estimate `masteryScore = (correctAttempts / totalAttempts) * 100`, weighted by question difficulty; apply Bayesian smoothing for small samples. |
| M3-E2-T2 | Stability & retrievability init | P1 | S2 | On diagnostic completion, set initial `stability = 1.0` day for all subtopics; set `retrievability = 0.5`; `lastPracticed = now`. |
| M3-E2-T3 | Mastery recalculation job | P1 | S3 | BullMQ job `recalculate-mastery` runs every 6 hours: updates `retrievability` based on elapsed time and stability; decays mastery for unpracticed topics. |

#### M3-E3: Mastery Map UI
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M3-E3-T1 | Mastery Map component | P0 | S2 | Build `MasteryMap` component: grid of subjects → expandable chapters → topic cards colored by `masteryScore` (red <40, yellow 40-70, green >70); use `framer-motion` for expand/collapse. |
| M3-E3-T2 | Skill Radar Chart | P0 | S1 | Already exists (`skill-radar-chart.tsx`); ensure it reads from `UserMastery` aggregated by subject; show 5 axes (one per subject). |
| M3-E3-T3 | Focus Areas card | P0 | S1 | Already exists (`focus-areas.tsx`, `focus-areas-client.tsx`); refine to show top 3 weakest subtopics with "Practice Now" CTA linking to topic-focus session. |
| M3-E3-T4 | Subtopic detail drawer | P1 | S3 | Clicking a topic in Mastery Map opens drawer: shows `masteryScore`, `lastPracticed`, `stability`, recent error patterns, link to practice this topic. |

#### M3-E4: UserMastery Persistence & Updates
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M3-E4-T1 | UserMastery CRUD service | P0 | S1 | Build `src/services/user-mastery.ts`: `getOrCreate(userId, subtopicId)`, `updateAfterSession(sessionId)`, `getWeakAreas(userId, limit=3)`. |
| M3-E4-T2 | Bulk mastery initialization | P0 | S1 | On diagnostic start, pre-create 750 `UserMastery` rows for user with `masteryScore=0` to avoid N+1 inserts later; use Prisma `createMany`. |
| M3-E4-T3 | Mastery history tracking | P2 | S4 | Add `MasteryHistory` model: `id`, `userMasteryId`, `masteryScore`, `stability`, `recordedAt`; log on every update for trend analysis. |

---

### M4 — Smart Review & Adaptive Practice

#### M4-E1: Spaced Repetition Engine (FSRS-like)
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M4-E1-T1 | SR Engine core service | P0 | S2 | Build `src/services/spaced-repetition.ts`: implement `calculateRetrievability(node)`, `updateStability(node, grade)` using FSRS-inspired formula; grade scale 0-5 based on accuracy + confidence. |
| M4-E1-T2 | Retrievability decay scheduler | P0 | S2 | Every 6 hours, job iterates all `UserMastery` rows, updates `retrievability = exp(-elapsedDays / stability)`; flag `retrievability < 0.3` as "due for review". |
| M4-E1-T3 | Redis caching for mastery state | P0 | S2 | Cache `UserMastery` rows in Redis as hash per user (`user:mastery:{userId}`); TTL 24h; invalidate on session completion. |

#### M4-E2: Daily Review Queue Generator
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M4-E2-T1 | Daily queue algorithm | P0 | S2 | `generateDailyQueue(userId, targetMinutes=15)`: (1) Select subtopics with `retrievability < 0.3`, (2) Add subtopics with `masteryScore < 60`, (3) Interleave 2-3 subjects, (4) Pick 1 question per subtopic, (5) Estimate time (~90s/question) → 8-12 questions. |
| M4-E2-T2 | Cron job for queue pre-computation | P0 | S2 | BullMQ recurring job at 4:00 AM IST: pre-computes `dailyQueue:{userId}` in Redis for all active users; TTL 26h. |
| M4-E2-T3 | Daily review API | P0 | S2 | `GET /api/reviews/daily`: returns pre-computed queue or generates on-demand if missing; creates `PracticeSession` with `type=DAILY_REVIEW`. |
| M4-E2-T4 | Daily review UI | P0 | S2 | Build `DailyReviewCard` on dashboard: shows "Today's Review: 12 min · 8 questions"; CTA starts session; show completion checkmark if done. |

#### M4-E3: Practice Session Manager
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M4-E3-T1 | Session lifecycle service | P0 | S2 | Build `src/services/session-manager.ts`: `createSession(userId, type, options)`, `getNextQuestion(sessionId)`, `submitAnswer(sessionQuestionId, answer)`, `completeSession(sessionId)`. |
| M4-E3-T2 | Session state machine | P0 | S2 | Enforce `IN_PROGRESS` → `COMPLETED` | `ABANDONED`; auto-abandon after 30 min inactivity; store timeout timestamp in Redis. |
| M4-E3-T3 | Question rendering UI | P0 | S2 | Reuse existing assignment detail page; adapt for session types: show subject badge, hint button, "Stuck? Ask Tutor" button, confidence rating (1-5) after each answer. |
| M4-E3-T4 | Session summary screen | P0 | S2 | On completion: show accuracy %, time taken, topics practiced, mastery changes (red→yellow→green animations), "Schedule next review" CTA. |
| M4-E3-T5 | Resume abandoned session | P1 | S3 | Allow resuming `IN_PROGRESS` sessions within 2 hours; restore state from Redis; merge partial progress. |

#### M4-E4: Adaptive Difficulty Engine
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M4-E4-T1 | Real-time difficulty selector | P0 | S2 | Build `src/services/adaptive-difficulty.ts`: `selectNextQuestion(userId, topicId, sessionHistory)`; calculate recentAccuracy over last 5 answers; adjust target difficulty ±1. |
| M4-E4-T2 | Prerequisite fallback | P1 | S3 | If `recentAccuracy < 0.3` and `targetDifficulty === 1`, call `findPrerequisiteQuestion(topicId)` to serve prerequisite subtopic question instead. |
| M4-E4-T3 | Challenge mode | P2 | S4 | Add optional "Challenge Mode" toggle in topic-focus sessions: forces `targetDifficulty + 1`; track separately in analytics. |

#### M4-E5: Interleaving Algorithm
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M4-E5-T1 | Subject interleaving | P0 | S2 | In daily queue: round-robin subjects (Math, Science, English, Math, Science...) every 2-3 questions; prevent >2 consecutive same-subject questions. |
| M4-E5-T2 | Topic interleaving within subject | P1 | S3 | Within same subject, ensure consecutive questions are from different topics to promote transfer learning. |

---

### M5 — AI Socratic Tutor

#### M5-E1: LLM Gateway & Prompt Management
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M5-E1-T1 | LLM abstraction service | P0 | S3 | Build `src/services/llm-gateway.ts`: unified interface `generate(prompt, modelTier)`; model tiers: `cached` → `fast` (GPT-4o-mini) → `powerful` (GPT-4o); route via OpenRouter for failover. |
| M5-E1-T2 | Prompt template engine | P0 | S3 | Build `src/lib/prompts.ts`: typed prompt builders for `hint`, `misconceptionDetection`, `explanation`, `remediation`; all prompts parameterized; no raw user input interpolation. |
| M5-E1-T3 | API key & cost management | P0 | S3 | Store keys in `.env.local`; add cost tracking per request (log to `AgentRun` table or new `LLMUsage` model); monthly budget alert at ₹5,000. |
| M5-E1-T4 | Rate limiting on tutor endpoints | P0 | S3 | 30 requests/minute per user on `/api/tutor/*`; use Upstash Redis rate limiter; return 429 with retry-after header. |

#### M5-E2: Tiered Hint System
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M5-E2-T1 | Hint generation API | P0 | S3 | `POST /api/tutor/hint`: body `{ sessionQuestionId, hintLevel }`; builds `TutorContext`; calls `SocraticTutor.generateHint()`; returns hint text. |
| M5-E2-T2 | Embedded hint UI | P0 | S3 | Add "Stuck? Ask Tutor" button below each question; clicking reveals Hint 1; show "Need more help?" to escalate to Hint 2, then Hint 3; track `hintsUsed` count. |
| M5-E2-T3 | Hint caching layer | P1 | S3 | Cache hints by `(questionId, errorPattern, hintLevel)` key in Redis; TTL 30 days; pre-generate top 50 common misconception hints via background job. |
| M5-E2-T4 | Hint quality feedback | P2 | S5 | Add thumbs up/down on each hint; store feedback; monthly report of low-quality hints for prompt refinement. |

#### M5-E3: Misconception Detection
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M5-E3-T1 | Error pattern library | P0 | S3 | Create `ErrorPattern` enum/model: `SIGN_ERROR`, `DISTRIBUTIVE_FAIL`, `UNIT_CONVERSION`, `CONCEPTUAL_GAP`, `CARELESS`; map common wrong answers to patterns per question. |
| M5-E3-T2 | Pattern matcher service | P0 | S3 | Build `src/services/misconception-detector.ts`: `detect(context)` first checks `Question.commonMisconceptions` for exact match; falls back to LLM analysis for novel errors. |
| M5-E3-T3 | Error pattern tracking | P0 | S3 | On each wrong answer, append to `UserMastery.errorPatterns` JSON: `{ type, count, lastOccurredAt }`; update in transaction with mastery score. |

#### M5-E4: Remediation Flow Builder
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M5-E4-T1 | Remediation state machine | P0 | S3 | Define flow: (1) Show micro-explanation targeting error pattern, (2) Present near-transfer question (same concept, different context), (3) If correct → schedule review +1d,+3d,+7d; if wrong → unlock prerequisite. |
| M5-E4-T2 | Near-transfer question selector | P0 | S3 | Query `Question` table for same `subtopicId` and `difficulty` but different `content` hash; ensure not previously attempted in last 7 days. |
| M5-E4-T3 | Remediation UI | P0 | S3 | On wrong answer: slide-in drawer with micro-explanation (text + diagram); "Try Similar Question" CTA; show prerequisite unlock if second failure. |
| M5-E4-T4 | Remediation scheduling | P1 | S4 | On successful remediation, override SR schedule: set `stability = 1`, `lastPracticed = now`; force inclusion in next daily review. |

#### M5-E5: Explanation Cache & Cost Control
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M5-E5-T1 | Explanation store | P1 | S3 | Create `ExplanationCache` model: `id`, `questionId`, `errorPattern`, `hintLevel`, `content`, `modelUsed`, `generatedAt`; unique on `[questionId, errorPattern, hintLevel]`. |
| M5-E5-T2 | Pre-generation job | P2 | S4 | BullMQ job: weekly, generate explanations for top 100 most-attempted questions × top 3 error patterns × 3 hint levels; store in `ExplanationCache`. |

---

### M6 — Exam Readiness & Analytics

#### M6-E1: Weekly Exam Readiness Sprint
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M6-E1-T1 | Sprint session type | P1 | S3 | Add `EXAM_SPRINT` to `SessionType`; create session with `targetDuration=20`, `interleaved=true`, covers all 5 subjects weighted by low mastery + low retrievability. |
| M6-E1-T2 | Sprint question selection | P1 | S3 | Select 15-20 questions: 30% from weak topics, 30% from due-for-review topics, 40% random syllabus coverage; interleave every 3 questions. |
| M6-E1-T3 | Sprint UI | P1 | S3 | Dedicated `/sprint` page: full-screen focus mode, countdown timer, progress bar, subject badge; no hints allowed (assessment mode). |
| M6-E1-T4 | Sprint scheduling | P1 | S3 | Auto-create sprint every Saturday 9 AM; notify user; allow retake once if abandoned; store best score of the week. |

#### M6-E2: Predictive Readiness Score
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M6-E2-T1 | Readiness score algorithm | P1 | S4 | Build `src/services/readiness-scorer.ts`: score = 0.4×(mastery coverage %) + 0.3×(avg retrievability) + 0.2×(consistency score) + 0.1×(remediation success rate); output 0-100. |
| M6-E2-T2 | Score dashboard widget | P1 | S4 | Build `ReadinessScoreCard`: circular progress indicator, trend arrow (up/down), text: "72% exam-ready"; actionable subtitle: "Practice Force & Laws of Motion to improve." |
| M6-E2-T3 | Score trend history | P2 | S5 | Store daily readiness score in `ReadinessHistory` table; render line chart (Recharts) on analytics page. |

#### M6-E3: Performance Dashboard
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M6-E3-T1 | Subject-wise performance charts | P0 | S1 | Already exists (Recharts); ensure data pulls from `UserMastery` aggregated by subject; show mastery % over time. |
| M6-E3-T2 | Topic mastery breakdown | P1 | S3 | Expand dashboard with topic-level grid per subject; color-coded cells; clickable to practice. |
| M6-E3-T3 | Time spent analytics | P2 | S4 | Aggregate `SessionQuestion.timeTaken` per subject; show weekly bar chart; surface in weekly insights. |
| M6-E3-T4 | Improvement trends | P1 | S3 | Compare current week vs previous week: mastery delta, accuracy delta, sessions completed; show on dashboard as "+12% this week". |

#### M6-E4: Weekly Insight Cards
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M6-E4-T1 | Insight generation service | P1 | S4 | Build `src/services/insights.ts`: generate every Sunday at 8 AM; content: topics mastered count, weakest area, recommended focus, streak status, readiness score change. |
| M6-E4-T2 | Insight card UI | P1 | S4 | Build `WeeklyInsightCard` on dashboard: collapsible rich text with icons; deep-link to recommended practice topic. |
| M6-E4-T3 | Insight notification | P1 | S4 | Send `Notification` on insight generation; push notification if enabled. |

---

### M7 — Engagement & Habit System

#### M7-E1: Learning-Validated Streaks
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M7-E1-T1 | Streak validation logic | P0 | S2 | Streak only increments on completed `PracticeSession` with ≥3 questions answered; opening app without learning does NOT count; enforce in `streak.ts`. |
| M7-E1-T2 | Streak recovery | P1 | S3 | If streak breaks (missed 2 days), show compassionate message: "Pick up where you left off. 15 min today." Do NOT offer streak freeze (removed per V2). |
| M7-E1-T3 | Longest streak tracking | P1 | S2 | Update `StudyStreak.longestStreak` whenever `currentStreak` surpasses it; show trophy on profile. |

#### M7-E2: Momentum UI
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M7-E2-T1 | Knowledge Chain visualization | P1 | S3 | Build `KnowledgeChain` component: horizontal chain of last 14 days; each link is a day; filled = practiced, empty = missed; animate new link on completion. |
| M7-E2-T2 | Mastery Map color transitions | P1 | S3 | Animate topic color changes on dashboard after session: red→yellow→green pulse effect; delayed cascade for visual reward. |
| M7-E2-T3 | Level system removal | P0 | S1 | Remove `User.level` and `User.xp` from schema/UI (per V2); replace with mastery-focused progress only. |

#### M7-E3: Session Quality Scoring
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M7-E3-T1 | Quality score calculation | P2 | S4 | `qualityScore = (accuracy * 0.6) + (confidenceCalibration * 0.2) + (speedScore * 0.2)`; store on `PracticeSession` model (add `qualityScore` field). |
| M7-E3-T2 | Post-session quality prompt | P2 | S4 | After session summary: "How focused were you?" 1-5 self-report; store in `PracticeSession.focusRating`. |

#### M7-E4: Notification Preferences & Compassionate Reminders
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M7-E4-T1 | Single daily notification | P1 | S3 | Send ONE notification at `studyTimePreference`: "Your Daily Review is ready. 12 min today."; no nagging; mute if completed already. |
| M7-E4-T2 | Missed-day recovery copy | P1 | S3 | If missed yesterday: "Pick up where you left off. 15 min today."; no guilt language; A/B test against factual copy. |
| M7-E4-T3 | Notification settings UI | P1 | S3 | Toggles for daily review, streak alert, weekly insight, sprint reminder; time picker for preferred study time. |

---

### M8 — Content Management (Admin)

#### M8-E1: Admin Portal Shell & RBAC
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M8-E1-T1 | Admin layout & navigation | P1 | S3 | Create `/admin` route group with sidebar nav: Dashboard, Curriculum, Questions, Explanations, Analytics; protect with `requireRole('ADMIN')`. |
| M8-E1-T2 | Role-based access control | P1 | S3 | Add `role` enum to `User`: `STUDENT`, `ADMIN`, `CONTENT_CURATOR`; default `STUDENT`; update session token to include role. |
| M8-E1-T3 | Admin authentication | P1 | S3 | Admin users must be manually promoted in DB or via invite-only flow; no public admin signup. |

#### M8-E2: Curriculum Editor
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M8-E2-T1 | Subject/Chapter/Topic CRUD | P1 | S3 | Admin pages: list subjects → drill into chapters → topics → subtopics; forms for create/edit; validation for unique constraints. |
| M8-E2-T2 | Prerequisite graph editor | P2 | S4 | Visual graph editor for topic prerequisites: drag-connect topics; validate acyclic graph on save. |
| M8-E2-T3 | Curriculum versioning | P2 | S5 | Add `version` to `Subject`; allow publishing draft curriculum; students only see published version. |

#### M8-E3: Question Bank Manager
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M8-E3-T1 | Question list & filter | P1 | S3 | Admin table: columns for question text (truncated), type, difficulty, bloomLevel, subtopic, usageCount, avgAccuracy; filter by all fields. |
| M8-E3-T2 | Question editor | P1 | S3 | Form with dynamic fields based on `QuestionType`: MCQ options editor, correct answer input, explanation textarea, misconception repeater; validate JSON schema on save. |
| M8-E3-T3 | Bulk question import | P2 | S4 | CSV/JSON import: validate rows against Zod schema; show preview before import; handle duplicates by `content.question` hash. |
| M8-E3-T4 | Question quality dashboard | P2 | S5 | Sort by lowest `avgAccuracy` or highest `hintsUsed`; flag questions where >50% of students use tutor (indicates poor clarity). |

#### M8-E4: Misconception Library
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M8-E4-T1 | Misconception CRUD | P1 | S3 | Admin page: list `ErrorPattern` definitions; link to affected questions; edit explanation templates. |
| M8-E4-T2 | Misconception coverage report | P2 | S4 | Show which subtopics have zero misconceptions defined; highlight gaps in content quality. |

#### M8-E5: AI Explanation Review Queue
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| M8-E5-T1 | Explanation review UI | P2 | S4 | Admin queue: AI-generated explanations pending human review; side-by-side question + explanation; approve/edit/reject actions. |
| M8-E5-T2 | Curator assignment | P2 | S4 | Assign explanations to content curators; track review latency; enforce >95% human verification rate before cache promotion. |

---

### M9 — Infrastructure & Observability

#### M9-E1: Redis & Caching Layer
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| N9-E1-T1 | Redis client setup | P0 | S2 | Add `@upstash/redis` or `ioredis` client; configure connection from `REDIS_URL`; create `src/lib/redis.ts` singleton. |
| N9-E1-T2 | Mastery state cache | P0 | S2 | Cache `UserMastery` rows as hash `user:mastery:{userId}`; TTL 24h; invalidate via event on session completion. |
| N9-E1-T3 | Daily queue cache | P0 | S2 | Store pre-computed daily queue as JSON `dailyQueue:{userId}`; TTL 26h. |
| N9-E1-T4 | Explanation cache | P1 | S3 | Cache hints/explanations by composite key; TTL 30 days; warm cache via background job. |

#### M9-E2: Job Queue (BullMQ)
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| N9-E2-T1 | BullMQ setup | P0 | S2 | Install `bullmq`; configure Redis connection; create `src/lib/queue.ts` with named queues: `daily-review`, `mastery-recalc`, `explanation-generate`, `insight-generate`. |
| N9-E2-T2 | Daily review cron job | P0 | S2 | Recurring job at 4:00 AM IST: iterates active users, calls `generateDailyQueue`, stores in Redis; logs success/failure per user. |
| N9-E2-T3 | Mastery recalculation job | P1 | S3 | Recurring job every 6 hours: updates `retrievability` and decays mastery; batch process 1000 users per run. |
| N9-E2-T4 | Insight generation job | P1 | S4 | Weekly job Sundays 8 AM: generates `WeeklyInsight` for each user; creates `Notification` row. |
| N9-E2-T5 | Explanation pre-generation job | P2 | S4 | Weekly job: generates top-N explanations via LLM; stores in `ExplanationCache` pending human review. |
| N9-E2-T6 | Queue monitoring dashboard | P2 | S5 | Add `/admin/queues` page: shows BullMQ queue stats (waiting, active, completed, failed); ability to retry failed jobs. |

#### M9-E3: API Rate Limiting & Security
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| N9-E3-T1 | Rate limiter middleware | P0 | S3 | Implement `@upstash/ratelimit` or custom Redis sliding window: 30 req/min per user on `/api/tutor/*`, 100 req/min on `/api/sessions/*`, 10 req/min on auth endpoints. |
| N9-E3-T2 | AI tutor endpoint protection | P0 | S3 | Strict rate limit + input validation via Zod; max prompt length 2000 chars; sanitize user input before embedding in LLM prompt. |
| N9-E3-T3 | CORS & CSP headers | P1 | S3 | Configure `next.config.ts` with strict CSP; allow only self + Google OAuth domains + LLM API domain; block inline scripts. |
| N9-E3-T4 | SQL injection prevention | P0 | S1 | Audit all raw queries (should be zero); enforce Prisma ORM for all DB access; add `prisma validate` to CI. |

#### M9-E4: Event Tracking Pipeline
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| N9-E4-T1 | Event schema definition | P1 | S3 | Define event types: `question_attempted`, `hint_used`, `tutor_interaction`, `session_completed`, `mastery_updated`, `streak_incremented`; Zod schema for each. |
| N9-E4-T2 | Event logger service | P1 | S3 | Build `src/services/analytics.ts`: `track(event, userId, properties)`; writes to `AnalyticsEvent` table (or external like Segment/PostHog if budget allows). |
| N9-E4-T3 | Analytics database | P1 | S3 | Create `AnalyticsEvent` model: `id`, `userId`, `eventType`, `properties` (JSON), `timestamp`, `sessionId`; high-write optimized; consider TimescaleDB extension on Neon if supported. |
| N9-E4-T4 | Funnel analytics | P2 | S5 | Build admin funnel: signup → diagnostic start → diagnostic complete → daily review 1 → daily review 3 → day-7 active. |

#### M9-E5: Error Monitoring (Sentry)
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| N9-E5-T1 | Sentry integration | P1 | S3 | Install `@sentry/nextjs`; configure DSN in `.env`; capture errors in API routes, server components, client components; source maps upload in CI. |
| N9-E5-T2 | Alert rules | P2 | S4 | Configure PagerDuty/Slack alerts for: >5% error rate on `/api/tutor/*`, >1% checkout failure (future), DB connection pool exhaustion. |

#### M9-E6: PWA & Offline Shell
| Task ID | Task | Priority | Sprint | Subtasks / Engineering Items |
|---------|------|----------|--------|------------------------------|
| N9-E6-T1 | Service worker setup | P2 | S5 | Add `next-pwa` or custom service worker; cache static assets, curriculum tree, and user's current daily review questions for offline access. |
| N9-E6-T2 | Offline indicator | P2 | S5 | Show "Offline Mode" banner when connection lost; allow answering cached questions; queue submissions for sync when online. |
| N9-E6-T3 | Manifest & icons | P2 | S5 | Generate `manifest.json` with app name, icons, theme color; add to `<head>` in root layout. |

---

## 4. Suggested Priority Summary

| Priority | Definition | Count |
|----------|-----------|-------|
| **P0** | Blocks MVP release; critical path for student value | 35 tasks |
| **P1** | Required for complete user experience; can ship 1-2 weeks post-MVP | 28 tasks |
| **P2** | Quality of life, scaling, admin efficiency; post-product-market fit | 20 tasks |

### P0 Tasks (Critical Path)
- All M1-E1 (Auth hardening)
- All M1-E2 (Onboarding)
- All M2-E1 (Curriculum schema)
- All M2-E2-T1..T3 (Question bank schema + seed)
- All M3-E1 (Diagnostic engine)
- All M3-E3 (Mastery Map UI)
- All M3-E4 (UserMastery persistence)
- All M4-E1 (SR engine)
- All M4-E2 (Daily review queue)
- All M4-E3 (Session manager)
- All M4-E4-T1 (Adaptive difficulty)
- All M5-E1 (LLM gateway)
- All M5-E2 (Tiered hints)
- All M5-E3 (Misconception detection)
- All M5-E4-T1..T3 (Remediation flow)
- M6-E3-T1 (Performance charts — existing)
- M7-E2-T3 (Remove XP/levels)
- M9-E1-T1..T3 (Redis setup + caches)
- M9-E2-T1..T2 (BullMQ + daily cron)
- N9-E3-T1..T2 (Rate limiting)

---

## 5. Recommended Sprint / Phase Mapping

### Phase 0: Foundation Repair (Sprint 1 — Week 1)
**Goal:** Strip dead weight; prepare schema for mastery tracking.

| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| S1 | Schema & Seed | Prisma migration for mastery graph; CBSE curriculum seed; 500 question seed; auth TS fixes; onboarding flow; diagnostic skeleton; remove XP/levels |

**Tasks:** M1-E1-T1..T4, M1-E2-T1..T3, M2-E1-T1..T4, M2-E2-T1..T3, M3-E1-T1, M3-E4-T1..T2, M7-E2-T3, N9-E3-T4

### Phase 1: The Learning Core (Sprints 2-4 — Weeks 2-4)
**Goal:** Student can sign up, take diagnostic, see Mastery Map, complete first Smart Review.

| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| S2 | Diagnostic + SR Engine | Adaptive diagnostic (20 q); IRT skill estimation; Mastery Map UI; Focus Areas; SR engine core; daily review API; session manager; Redis caching; BullMQ cron |
| S3 | Adaptive Practice | Real-time difficulty adjustment; interleaving; topic-focus sessions; session summary; streak logic; daily review UI; question rendering UI |
| S4 | Polish & Hardening | Resume abandoned sessions; prerequisite fallback; streak calendar; mastery history; performance trends; notification system v1 |

**Tasks:** M1-E2-T4, M1-E3-T1, M1-E4-T1..T2, M1-E5-T1..T3, M2-E3-T1, M3-E1-T2..T5, M3-E2-T1..T3, M3-E3-T1..T4, M3-E4-T3, M4-E1-T1..T3, M4-E2-T1..T4, M4-E3-T1..T5, M4-E4-T1..T2, M4-E5-T1..T2, M6-E3-T1..T2, M7-E1-T1, M7-E2-T1..T2, M7-E4-T1, M9-E1-T1..T4, M9-E2-T1..T3, N9-E3-T1..T3

### Phase 2: The AI Tutor (Sprints 5-7 — Weeks 5-7)
**Goal:** Every question is a teaching moment. Tutor feels like a patient older sibling.

| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| S5 | LLM Gateway + Hints | LLM abstraction; prompt templates; tiered hint API; embedded hint UI; rate limiting; explanation cache; admin portal shell |
| S6 | Misconception + Remediation | Error pattern library; pattern matcher; remediation flow; near-transfer questions; micro-explanation seed; notification preferences |
| S7 | Tutor Intelligence | Hint quality feedback; pre-generation job; misconception tracking analytics; tutor engagement rate dashboard |

**Tasks:** M5-E1-T1..T4, M5-E2-T1..T4, M5-E3-T1..T3, M5-E4-T1..T4, M5-E5-T1..T2, M8-E1-T1..T3, M8-E2-T1, M8-E3-T1..T2, M8-E4-T1, M9-E2-T4..T6, N9-E4-T1..T3, N9-E5-T1

### Phase 3: Habit & Momentum (Sprints 8-9 — Weeks 8-9)
**Goal:** Students come back daily because they feel progress.

| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| S8 | Momentum UI | Knowledge Chain; Mastery Map animations; session quality scoring; weekly insight cards; push notification PoC |
| S9 | Ritual Builder | Study time preference enforcement; compassionate missed-day copy; single daily notification; focus rating; mobile responsiveness audit |

**Tasks:** M1-E3-T2, M1-E4-T3..T4, M6-E4-T1..T3, M7-E1-T2, M7-E3-T1..T2, M7-E4-T2..T3, M9-E6-T1..T3, N9-E4-T4, N9-E5-T2

### Phase 4: Exam Readiness (Sprints 10-11 — Weeks 10-11)
**Goal:** Students know exactly how prepared they are.

| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| S10 | Exam Sprints | Weekly sprint session type; sprint question selection; sprint UI; auto-schedule Saturdays; assessment mode (no hints) |
| S11 | Readiness Score | Predictive score algorithm; score widget; trend history; correlation tracking with sprint performance |

**Tasks:** M6-E1-T1..T4, M6-E2-T1..T3, M6-E3-T3..T4, M8-E5-T1..T2

### Phase 5: Intelligence & Polish (Sprints 12-14 — Weeks 12-14)
**Goal:** Product feels magically intelligent.

| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| S12 | Confidence Calibration | Post-answer confidence rating; calibration tracking; metacognition feedback cards |
| S13 | Content Quality | Human-curated micro-explanations for top 20 misconceptions; explanation review queue; image/diagram support in questions |
| S14 | Performance & Accessibility | Sub-2s page loads; WCAG 2.1 AA audit; offline review queue; image optimization; PWA polish |

**Tasks:** M2-E4-T1..T2, M6-E3-T3, M7-E3-T1..T2, M8-E2-T2..T3, M8-E3-T3..T4, M8-E4-T2, M9-E6-T1..T3

### Phase 6: Scale (Sprint 15+ — Week 15+)
**Goal:** Expand without diluting quality.

| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| S15+ | Multi-Grade | Class 10 curriculum seed; grade switcher; preserved mastery across grades |
| S16+ | Market Expansion | Hindi language support (i18n); parent summaries (opt-in weekly email); school partnerships (ONLY after NPS > 50) |

---

## 6. Dependencies Between Tasks

```
[M2-E1] Curriculum Schema
    └── [M2-E2] Question Bank
        └── [M3-E1] Diagnostic Engine
            └── [M3-E2] IRT Estimation
                └── [M3-E3] Mastery Map UI
                    └── [M4-E1] SR Engine
                        └── [M4-E2] Daily Review Queue
                            └── [M4-E3] Session Manager
                                ├── [M5-E2] Tiered Hints
                                │   └── [M5-E1] LLM Gateway
                                ├── [M5-E3] Misconception Detection
                                │   └── [M5-E4] Remediation Flow
                                └── [M7-E1] Streak Validation
                                    └── [M6-E1] Exam Sprints
                                        └── [M6-E2] Readiness Score

[M1-E1] Auth Hardening
    └── [M1-E2] Onboarding
        └── [M3-E1] Diagnostic Engine

[M9-E1] Redis Setup
    ├── [M4-E1] SR Engine (caching)
    ├── [M4-E2] Daily Queue (storage)
    ├── [M9-E2] BullMQ (job backend)
    └── [N9-E3] Rate Limiting

[M2-E2-T3] Seed 500 Questions
    └── [M3-E1-T2] Diagnostic Plan (needs questions)
    └── [M4-E2-T1] Daily Queue (needs questions)
```

### Critical Path
The longest dependency chain determines MVP date:
1. **Schema + Seed** (S1) → 2. **Diagnostic Engine** (S1/S2) → 3. **UserMastery Init** (S2) → 4. **SR Engine + Daily Queue** (S2) → 5. **Session Manager + Adaptive Difficulty** (S2/S3)

**MVP is blocked until M4-E3 (Session Manager) is complete in Sprint 3.**

---

## 7. Risks / Open Questions

| Risk ID | Risk | Impact | Likelihood | Mitigation | Owner |
|---------|------|--------|------------|------------|-------|
| R1 | **LLM costs exceed budget** — Uncapped tutor usage could burn ₹50k+/mo | High | High | Implement strict rate limiting (30 req/min), explanation caching (target 60% hit rate), pre-generation for top questions, use GPT-4o-mini for hints; monthly cost cap with circuit breaker | Engineering |
| R2 | **Question bank quality too low** — 500 questions is thin for 750 subtopics | High | Medium | Prioritize human curation for top 200 subtopics (most frequently tested); use AI generation only for gap-filling with mandatory human review; partner with CBSE tutors for content | Content |
| R3 | **Neon PostgreSQL cold starts** — Serverless DB latency spikes during daily cron job | Medium | Medium | Use Prisma connection pooling (`prisma.config.ts`); run cron jobs with warm connection; cache mastery state in Redis to reduce DB reads; consider Neon min compute if budget allows | Engineering |
| R4 | **Adaptive algorithm accuracy poor** — IRT simplified too much; mastery scores don't correlate with actual exam performance | High | Medium | Run backtesting on simulated student data; compare mastery estimates vs. sprint scores; iterate algorithm weekly for first month; retain ability to override algorithm manually | Data Science |
| R5 | **Student drop-off during diagnostic** — 20 questions feels long for a new user | High | Medium | Make diagnostic adaptive: early quitters get partial mastery map; save progress every question; allow resume within 24h; reduce to 15 questions if completion <60% | Product |
| R6 | **Content moderation liability** — AI-generated explanations could contain errors misaligned with CBSE syllabus | High | Medium | 100% human verification before cache promotion; restrict LLM to CBSE-aligned prompts; add "Report Error" button on every explanation; monthly content audit | Content / Legal |
| R7 | **Redis/Upstash dependency** — Adds infrastructure complexity and another vendor | Medium | Low | Use Upstash serverless Redis (managed); keep fallback to direct DB queries if Redis unavailable; abstract cache layer so backend is swappable | Engineering |
| R8 | **BullMQ on Vercel** — Vercel serverless functions have 15s timeout; cron jobs may exceed | High | Medium | Use Vercel Cron (max 5 min on Pro) for lightweight triggers; delegate heavy processing to Neon serverless functions or move to Railway/Render for worker nodes | Engineering |
| R9 | **Mobile web performance** — Class 9 students primarily use phones; PWA may feel sluggish | High | High | Budget <200KB initial JS; use Next.js dynamic imports; optimize images to WebP; add service worker caching; test on ₹8,000 Android devices | Engineering / QA |
| R10 | **No monetization in MVP** — 14 weeks without revenue may strain runway | Medium | Medium | Defer all monetization to Phase 6; focus on retention metrics to attract pre-seed; keep infrastructure costs low (Neon free tier, Upstash free tier, Vercel hobby) | Product / Biz |
| OQ1 | **Should we keep Legacy Assignment/Submission tables?** | — | — | Decision: Keep read-only for historical data; no new creation; migrate old submissions to `PracticeSession` format in background job | Engineering |
| OQ2 | **Which LLM provider?** OpenAI, Anthropic, or OpenRouter? | — | — | Decision: OpenRouter primary (failover across providers); GPT-4o-mini for hints; GPT-4o for novel misconception detection; cache aggressively | Engineering |
| OQ3 | **How to handle multiple boards (CBSE vs ICSE)?** | — | — | Decision: `Subject` scoped by `(name, grade, board)`; seed CBSE first; ICSE is Phase 6+; UI defaults to user's `board` | Product |

---

## 8. MVP vs Future Scope Separation

### MVP (Phase 0-4: Weeks 1-11)
**Definition:** A single CBSE Class 9 student can sign up, take an adaptive diagnostic, see their Mastery Map, complete daily Smart Reviews, use the AI Socratic Tutor on every question, experience remediation on wrong answers, track their exam readiness score, and build a study streak.

**In Scope:**
- ✅ Google OAuth + Demo Account
- ✅ 3-question onboarding
- ✅ Adaptive diagnostic (20 questions, interleaved)
- ✅ Mastery Map with skill radar
- ✅ Smart Review Queue (daily 15-min sessions)
- ✅ Adaptive difficulty in real-time
- ✅ AI Socratic Tutor (3-tier hints, misconception detection)
- ✅ Remediation flow (micro-explanation + near-transfer question)
- ✅ Exam Readiness Sprint (weekly 20-min)
- ✅ Predictive readiness score
- ✅ Learning-validated streaks + Knowledge Chain
- ✅ Basic notification system (daily reminder + score published)
- ✅ Admin portal (question bank, curriculum editor)
- ✅ 500 curated questions covering top 200 subtopics
- ✅ Redis caching + BullMQ cron jobs
- ✅ Rate limiting + basic security

### Future Scope (Phase 5+: Week 12+)
**Definition:** Features that improve quality, scale, or monetization but are NOT required for initial student value.

| Feature | Why Future | Target Phase |
|---------|-----------|--------------|
| ❌ **Social Features** (study groups, peer comparison, leaderboards, forums) | Creates anxiety, distracts from individual learning; removed per V2 | Phase 6+ (if ever) |
| ❌ **Parent Dashboard** | Distracts from student experience; parents are a channel, not a user | Phase 6+ |
| ❌ **School/Teacher Pack** | Premature; product must be 10/10 for individuals first | Phase 6+ (NPS > 50) |
| ❌ **Subscription Tiers / Paywalls** | Monetization gates learning; optimize for indispensability first | Phase 6+ (10k active students, 30% D30 retention) |
| ❌ **Referral Program** | Growth hack that optimizes signups, not learning | Phase 5+ |
| ❌ **Full Video Library** | Passive watching is low-retention; only conceptual blockers need video | Phase 5+ (targeted micro-videos) |
| ❌ **Mock Exam Simulator (3-hour full-length)** | Too infrequent to drive habit; weekly sprint replaces it | Phase 5+ (optional) |
| ❌ **Bookmarking / Read Later** | Creates guilt piles; system should surface what to study | Phase 5+ (if requested by users) |
| ❌ **Dark Mode / Hindi Language** | Nice to have; not a learning differentiator | Phase 5+ |
| ❌ **Native Mobile App (React Native)** | Mobile web responsive is enough; native is scaling move | Phase 6+ |
| ❌ **Content Aggregation / Scraping** | Quality >> quantity; scraped content never matches pedagogy | **Removed permanently** |
| ❌ **Gamification (coins, fake currencies, cosmetic badges)** | Crowds out intrinsic motivation; replaced by mastery momentum | **Removed permanently** |
| ✅ **Class 10 Curriculum** | Natural progression once Class 9 is solid | Phase 6 |
| ✅ **Advanced Analytics (funnels, cohort retention)** | Needed for optimization but not for student value | Phase 5 |
| ✅ **PWA Offline Mode** | Important for low-connectivity students but complex | Phase 5 |
| ✅ **Human-Curated Micro-Explanations for all 750 subtopics** | Requires content team scaling | Phase 5-6 |
| ✅ **A/B Test Framework** | Needed for growth optimization | Phase 5 |

---

## 9. Success Metrics Dashboard

### Educational KPIs (North Stars)

| Metric | Target | Measurement | Task Owner |
|--------|--------|-------------|------------|
| Diagnostic Completion Rate (within 24h) | >80% | `PracticeSession.type=DIAGNOSTIC` completed / signups | M3-E1 |
| Day-7 Retention | >50% | Cohort analysis: active on day 7 / signups | M7-E1 |
| Day-30 Retention | >25% | Cohort analysis: active on day 30 / signups | M7-E1 |
| Smart Review Completion Rate | >85% | Completed daily reviews / started daily reviews | M4-E3 |
| Tutor Engagement Rate (on wrong answers) | >40% | `SessionQuestion.tutorUsed=true` where `isCorrect=false` | M5-E2 |
| Remediation Success Rate | >65% | Correct on near-transfer question after remediation | M5-E4 |
| Topic Mastery Rate (by exam time) | >60% | % of subtopics with `masteryScore > 70` | M3-E2 |
| Retention Index (7-day spaced accuracy) | >75% | Accuracy on questions repeated after 7+ days | M4-E1 |
| Exam Readiness Correlation | r > 0.7 | Correlation between readiness score and sprint score | M6-E2 |
| Net Promoter Score | >50 | In-app survey at day 14 | M1-E2 |

### Anti-Metrics (Watch for Danger)

| Metric | Danger Signal | Action |
|--------|--------------|--------|
| Time per session >30 min | Student is confused, not engaged | Investigate hint usage; check question clarity |
| High hint usage + low mastery | Tutor giving answers too fast | Tighten hint prompts to be more Socratic |
| App opens without session completion | Streak gaming | Redefine streak to require ≥3 answered questions |
| High question skip rate | Questions too hard or irrelevant | Tune adaptive difficulty; review question bank |

---

## 10. Engineering Resource Estimates

Assuming 2 full-stack engineers + 1 AI/ML engineer (part-time) + 1 content curator.

| Phase | Duration | Effort | Bottleneck |
|-------|----------|--------|------------|
| Phase 0: Foundation | 1 week | 2 eng × 1 wk | Schema design decisions |
| Phase 1: Learning Core | 3 weeks | 2 eng × 3 wk | Redis + SR algorithm correctness |
| Phase 2: AI Tutor | 3 weeks | 2 eng × 3 wk + 0.5 AI | LLM prompt engineering; cost control |
| Phase 3: Habit | 2 weeks | 2 eng × 2 wk | Push notification reliability |
| Phase 4: Exam Readiness | 2 weeks | 2 eng × 2 wk | Readiness score algorithm validation |
| Phase 5: Polish | 3 weeks | 2 eng × 3 wk | WCAG compliance; performance |
| **Total to MVP** | **14 weeks** | **~14 eng-weeks** | Content curation (500 questions) |

---

*This document is the single source of execution truth. All sprint planning, standup updates, and scope decisions must trace back to a Task ID in this breakdown.*
