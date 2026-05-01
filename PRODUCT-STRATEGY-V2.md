# VidyaSetu Product Strategy V2.0
## "The AI Tutor Students Cannot Study Without"

> **Prepared by:** CPO / EdTech Strategist / Learning Scientist / System Architect  
> **Date:** April 30, 2026  
> **Mission:** Build the best free learning product for CBSE Class 9 students. Optimize for learning outcomes, retention, and habit formation — NOT revenue.  
> **Target:** Make VidyaSetu indispensable within 7 days of signup.

---

## Executive Summary

VidyaSetu currently has solid infrastructure but **misaligned product DNA**. It looks like an LMS (assignments, submissions, content aggregation) with gamification bolted on. It is NOT yet a personal tutor.

**The hard truth:**
- The current roadmap prioritizes monetization, social features, and school sales before proving educational value.
- The "AI tutor" is just a chatbot. A real AI tutor teaches, diagnoses, remediates, and adapts.
- Content aggregation is a trap — scraped web content will never match curated, pedagogically sequenced material.
- Badges for "Night Owl" and "Early Bird" are vanity gamification. They don't improve learning.
- The assignment system is a weekly dump of questions. There is no retrieval practice, no spaced repetition, no mastery loop.
- There is zero topic-level granularity. You cannot adapt what you cannot measure.

**The new vision:** VidyaSetu is not a study app. It is a **cognitive coach** that uses proven learning science to make every minute of study more effective. We replace "more content" with "better memory." We replace "gamification" with "momentum." We replace "chatbot" with "Socratic tutor."

---

## Key Strategic Changes

| Dimension | Current Approach | New Approach |
|-----------|-----------------|------------|
| **Core Identity** | LMS + Content Aggregator + Gamified Study App | Cognitive Coach & Adaptive Mastery System |
| **Primary Loop** | Receive assignment → Submit → Get score | Learn → Practice → Diagnose → Remediate → Master |
| **Content Strategy** | Scrape & aggregate web content | Curate + AI-generate targeted, pedagogical micro-content |
| **Gamification** | Cosmetic badges (Night Owl, Early Bird) | Momentum mechanics tied to learning behaviors |
| **AI Role** | Chatbot for doubt clearing | Socratic tutor + misconception detector + adaptive problem generator |
| **Difficulty** | Static 3-bucket (<40%, 40-70%, >70%) | Continuous adaptive difficulty with decay modeling |
| **Progress Tracking** | Subject-level averages | Topic/subtopic mastery graph with forgetting curve |
| **Monetization** | Freemium with assignment limits (Phase 4) | **Removed from roadmap entirely** until product is indispensable |
| **Social Features** | Study groups, peer comparison, forums | **Removed** — distracts from individual learning flow |
| **School/Teacher Features** | Phase 8 after individual product | **Removed** until student product is a 10/10 |

---

## Features to REMOVE / Deprioritize

### Immediate Removal (Dead Weight)

| Feature | Why Remove |
|---------|-----------|
| **Content Aggregation Engine** | Scraping web content is a losing battle. Quality >> quantity. Replace with curated CBSE content + AI-generated micro-practice. |
| **Content Management Dashboard** | Operational overhead with no learning value. Kill it. |
| **Study Groups / Peer Comparison** | Social comparison creates anxiety, not learning. Class 9 students need focus, not FOMO. |
| **Doubt Forum** | Becomes a garbage dump of unverified answers. The AI tutor should be the single source of truth. |
| **Referral Program** | Growth hack that optimizes for signups, not learning. Build organic indispensability first. |
| **Parent Dashboard** | Distracts from student experience. Parents are a channel, not a user. Revisit at scale. |
| **School/Class/Enrollment Models** | Premature. Remove from schema or hide behind feature flag. The product is for individual students. |
| **Night Owl / Early Bird Badges** | Vanity gamification. Zero educational impact. |
| **Subscription Tiers (Free/Pro)** | Monetization gates learning. Every student gets everything. Revenue comes later from different vectors. |
| **Streak Freeze (Watch Ad / Share)** | Introduces extrinsic motivation and ads into a learning flow. Toxic. |
| **Weekly Progress Emails** | Low open rates, high noise. In-app momentum notifications only. |
| **Daily Quote / Motivation Card** | Inspirational wallpaper. Does not teach. |

### Deprioritize to Phase 5+ (If Ever)

| Feature | Why Delay |
|---------|-----------|
| **Mock Exam Simulator (Full 3-hour)** | Too infrequent to drive habit. Replace with "Exam Readiness Sprints" — 20-minute adaptive sessions. |
| **Full Video Library** | Passive watching is low-retention. Use video ONLY for conceptual blockers, not as primary content. |
| **Bookmarking / Read Later** | Creates guilt piles. The system should surface what to study, not the student. |
| **Dark Mode / Hindi Language** | Nice to have. Not a learning differentiator. |
| **PWA / Mobile App** | Mobile web responsive is enough for MVP. Native app is a Phase 3+ scaling move. |

---

## New Recommended Features

### Tier 1: The Core Learning Loop (Build First)

#### 1. Diagnostic Mastery Onboarding
**What:** A 15-minute adaptive diagnostic covering all 5 subjects at the chapter/topic level. Not a test — a calibration.
**How it works:**
- Student signs up → immediately enters diagnostic.
- Questions adapt in real-time: get it wrong → easier follow-up on prerequisite; get it right → harder or new topic.
- Uses 2-3 questions per topic to estimate initial mastery (can be noisy, that's OK).
- Outputs a "Mastery Map" — a visual graph of 50+ topics colored by confidence.
**Learning Science:** Pretesting effect + Diagnostic assessment enables personalized spacing.
**Why first:** Without knowing what the student doesn't know, everything else is guesswork.

#### 2. The Mastery Graph (Skill Graph V2)
**What:** A fine-grained knowledge graph of CBSE Class 9 curriculum.
**Structure:**
```
Subject (e.g., Math)
  → Chapter (e.g., Polynomials)
    → Topic (e.g., Factorization)
      → Subtopic (e.g., Factorization by Grouping)
        → Microskill (e.g., Identify common factors in 4-term expressions)
```
**Granularity:** ~150-200 nodes per subject. ~750 total for Class 9.
**Properties per node:**
- `masteryScore`: 0-100 (IRT-based estimate)
- `lastPracticed`: timestamp
- `stability`: forgetting curve estimate (based on practice history)
- `retrievability`: probability of recall right now
- `prerequisites`: list of nodes that must be solid before this one
- `difficultyCalibration`: personalized difficulty level
**Learning Science:** Mastery Learning (Bloom) + Knowledge Space Theory + Forgetting Curve (Ebbinghaus).
**Why it matters:** This is the brain of the product. Every other feature feeds into or reads from this graph.

#### 3. Smart Review Queue (Spaced Repetition Engine)
**What:** A daily, automatically generated queue of questions designed to maximize long-term retention.
**How it works:**
- Each morning (or at student's preferred time), the system generates a 15-20 minute "Daily Review."
- Mix of:
  - **Relearning:** Topics with low stability (high probability of forgetting).
  - **Maintenance:** Topics recently mastered but need reinforcement.
  - **Interleaving:** 2-3 different subjects mixed together (proven to improve transfer).
- Uses spaced repetition algorithm (custom FSRS-like or SM-2 variant) adapted for academic subjects.
- NOT flashcards. Each item is a short problem or active recall prompt.
**Learning Science:** Spaced Repetition + Interleaving + Active Recall.
**Why it matters:** This is the feature that creates long-term retention. Without it, students cram and forget.

#### 4. Adaptive Practice Sessions
**What:** On-demand practice that targets specific weak areas with scaffolded difficulty.
**How it works:**
- Student taps "Practice Math → Polynomials" or "Practice Weakest Topics."
- System selects questions based on:
  - Current mastery estimate
  - Prerequisite readiness
  - Time since last practice
  - Pattern of previous errors
- Difficulty adjusts in real-time: if 2 consecutive errors, drop difficulty and give a hint; if 3 consecutive correct, increase difficulty or switch to interleaved topic.
- Each session ends with a "What I Learned" summary and 1-2 questions scheduled for tomorrow's review.
**Learning Science:** Adaptive Difficulty + Mastery Learning + Scaffolded Instruction.

#### 5. AI Socratic Tutor (Not a Chatbot)
**What:** An AI tutor that teaches through guided discovery, not answers.
**Pedagogical Rules:**
1. **Never give the answer first.** Always start with a question or a hint.
2. **Misconception Detection:** If a student selects "7x + 3x = 10x²," the tutor doesn't just say "wrong." It asks: "What happens when you add 7 apples and 3 apples? Do you get 10 squared apples?"
3. **Scaffolded Hints:** Tiered hint system — Hint 1 (strategic), Hint 2 (procedural), Hint 3 (worked example), then answer.
4. **Explanation on Demand:** After correct answer, student can request "Why does this work?" — gets conceptual explanation.
5. **Error Pattern Analysis:** Tracks specific error types (e.g., "sign errors in linear equations") and surfaces targeted micro-lessons.
6. **Socratic Dialogue:** For open-ended questions, engages in step-by-step reasoning rather than output dumping.
**Interface:** Embedded in every question — "Stuck? Ask Tutor" button. Not a floating chat widget (chat widgets encourage off-task behavior).
**Learning Science:** Socratic Method + Scaffolded Instruction + Misconception-Based Remediation.

#### 6. Misconception-Driven Remediation Flow
**What:** When a student gets something wrong, the system doesn't just mark it wrong. It diagnoses WHY and fixes it.
**How it works:**
- **Step 1:** Identify error category (e.g., conceptual vs. careless vs. procedural).
- **Step 2:** If conceptual: show a 2-minute micro-explanation targeting that exact misconception.
- **Step 3:** Present a "near transfer" question — same concept, slightly different context.
- **Step 4:** If correct, schedule review for +1 day, +3 days, +7 days.
- **Step 5:** If wrong again, drop to prerequisite topic and practice that first.
**Learning Science:** Formative Assessment + Immediate Feedback + Near Transfer + Mastery Learning.

#### 7. Weekly Exam Readiness Sprint
**What:** A 20-minute, full-coverage adaptive assessment every Saturday.
**How it works:**
- Covers all 5 subjects.
- Question selection weighted by:
  - Topics not practiced recently (retrieval practice)
  - Topics with low mastery
  - Interleaved subject switching every 3-4 questions
- Results feed back into Mastery Graph.
- Score is NOT the goal. The goal is identifying what to review next week.
**Learning Science:** Retrieval Practice + Interleaving + Low-Stakes Testing.

---

### Tier 2: Engagement & Habit Formation (Build Second)

#### 8. Learning Momentum System (Replace Gamification)
**What:** A habit-formation system that makes students FEEL progress without cheap rewards.
**Mechanics:**
- **Daily Review Streak:** Consecutive days of completing the Smart Review Queue. Visualized as a "Knowledge Chain" — each link represents a day of practice. Breaking the chain feels like losing progress (loss aversion).
- **Mastery Unlocks:** As topics turn from red → yellow → green, the Mastery Map visually fills in. This is the ultimate progress bar.
- **Study Session Quality Score:** After each session, rate 1-5 based on focus (self-reported) + accuracy. Encourages meta-cognition.
- **Weekly Insight Cards:** "This week you mastered 3 topics in Polynomials. Your weakest area is still Force & Laws of Motion. Here's your focus for next week."
- **No coins, no leaderboards, no fake currencies.** These create extrinsic motivation that crowds out intrinsic learning drive.
**Learning Science:** Self-Determination Theory (Autonomy, Competence, Relatedness) + Loss Aversion + Progress Monitoring.

#### 9. Concept Blocker Resolution
**What:** When a student is stuck on a concept, the system provides a targeted 3-minute "unlock" experience.
**How it works:**
- Student marks "I don't understand this" on any question.
- System serves a micro-lesson: 1 visual explanation + 1 worked example + 1 guided practice.
- Then returns to original question.
- If still stuck, prerequisite unlock is suggested.
**Learning Science:** Just-in-Time Instruction + Prerequisite Scaffolding.

#### 10. Study Ritual Builder
**What:** Helps students build a consistent study routine.
**How it works:**
- During onboarding, student picks a daily study time (e.g., 6:00 PM, 30 minutes).
- System sends ONE notification at that time: "Your Daily Review is ready. 12 minutes today."
- Completing the review reinforces the habit loop (cue → routine → reward).
- Miss a day? Next notification says: "Pick up where you left off. 15 minutes today." No guilt, no shame.
**Learning Science:** Habit Loop (Duhigg) + Implementation Intentions + Compassionate Design.

---

### Tier 3: Intelligence Layer (Build Third)

#### 11. Predictive Exam Readiness Score
**What:** A dynamic score (0-100) representing how prepared the student is for the CBSE final exam.
**How it works:**
- Based on mastery coverage (% of syllabus mastered), retention stability, and performance variance.
- Updates daily.
- If dropping: "Your readiness score dropped because it's been 5 days since you practiced Motion. Here's a quick 8-minute review."
- If rising: "You're 72% exam-ready. At this pace, you'll be 95% ready by December."
**Why:** Turns abstract progress into concrete, motivating feedback.

#### 12. AI-Generated Micro-Explanations
**What:** For any question or concept, generate a personalized explanation based on the student's error pattern and current level.
**How it works:**
- Uses LLM with structured prompt including: concept, student's error, prerequisite knowledge, target reading level (Class 9).
- Explanations are reviewed/curated for accuracy. AI generates, human verifies for CBSE alignment.
- Stored and reused to reduce LLM costs.
**Learning Science:** Personalized Instruction + Worked Examples.

#### 13. Confidence Calibration Training
**What:** Teach students to accurately assess their own knowledge.
**How it works:**
- After each answer, student rates confidence: "How sure are you?" (1-5)
- System tracks calibration: Are they overconfident on wrong answers? Underconfident on right ones?
- Periodic "metacognition moments" show calibration stats: "You were 90% sure but wrong 4 times this week. Slow down and double-check your work."
**Learning Science:** Metacognition + Calibration Training ( improves self-regulated learning).

---

## Redesigned Roadmap by Phase

### Phase 0: Foundation Repair (Week 1)
**Goal:** Strip dead weight. Prepare the schema for mastery tracking.

- [ ] **Remove from schema:** School, Class, Enrollment, SubscriptionPlan, ContentSource, ContentItem, ContentCurationLog, AgentRun.
- [ ] **Simplify schema:** Keep User, Subject, Assignment, Submission, Progress, Badge, UserBadge, Notification.
- [ ] **Redesign Assignment.questions JSON schema** to include: topicId, subtopicId, Bloom's taxonomy level, difficulty, prerequisiteTopicIds, commonMisconceptions.
- [ ] **Build Mastery Graph schema:** Topic, Subtopic, Microskill, UserMastery (per-node tracking).
- [ ] **Seed CBSE Class 9 curriculum tree:** All chapters, topics, subtopics for 5 subjects.
- [ ] **Kill Content Aggregation system entirely.** Remove code, routes, dashboard.

---

### Phase 1: The Learning Core (Weeks 2-4)
**Goal:** A student can sign up, take a diagnostic, see their Mastery Map, and complete their first Smart Review.
**Educational Impact: HIGH** — This is the minimum viable learning product.

| Week | Focus | Deliverables |
|------|-------|-------------|
| **W2** | Diagnostic Engine | Adaptive diagnostic test; Mastery Map visualization; initial skill estimation |
| **W3** | Smart Review Queue | Spaced repetition algorithm; Daily Review generation; interleaving logic; 15-min session UI |
| **W4** | Adaptive Practice | On-demand practice by topic; real-time difficulty adjustment; session summaries |

**Success Criteria:**
- 80% of signups complete diagnostic within 24 hours.
- 60% of users complete at least 3 Smart Reviews in first 7 days.
- Mastery Map shows >50 topic nodes.

---

### Phase 2: The AI Tutor (Weeks 5-7)
**Goal:** Every question becomes a teaching moment. The AI tutor feels like a patient, smart older sibling.
**Educational Impact: VERY HIGH** — This differentiates VidyaSetu from every other practice app.

| Week | Focus | Deliverables |
|------|-------|-------------|
| **W5** | Socratic Tutor V1 | Embedded "Stuck? Ask Tutor" on every question; tiered hint system; misconception-aware responses |
| **W6** | Remediation Flow | Error diagnosis; micro-explanation generation; prerequisite unlocking; near-transfer questions |
| **W7** | AI Explanations | Personalized worked examples; "Why does this work?" explanations; curated content for common errors |

**Success Criteria:**
- Tutor engagement rate >40% on incorrect answers.
- Remediation completion rate >60%.
- Students who use tutor show >20% higher accuracy on follow-up questions.

---

### Phase 3: Habit & Momentum (Weeks 8-9)
**Goal:** Students come back daily because they feel progress, not because of notifications.
**Educational Impact: HIGH** — Habit formation is the retention engine.

| Week | Focus | Deliverables |
|------|-------|-------------|
| **W8** | Momentum System | Knowledge Chain visualization; Mastery Map color transitions; Weekly Insight Cards; Session Quality scoring |
| **W9** | Study Ritual Builder | Preferred time onboarding; single daily notification; compassionate missed-day recovery; push notification |

**Success Criteria:**
- Day-7 retention >50%.
- Day-30 retention >25%.
- Average sessions per active user per week >4.

---

### Phase 4: Exam Readiness (Weeks 10-11)
**Goal:** Students know exactly how prepared they are and what to do about it.
**Educational Impact: MEDIUM-HIGH** — Bridges gap between practice and exam performance.

| Week | Focus | Deliverables |
|------|-------|-------------|
| **W10** | Exam Readiness Sprints | Weekly 20-min adaptive assessments; full syllabus coverage; CBSE pattern weighting |
| **W11** | Predictive Readiness Score | Dynamic 0-100 score; trend visualization; actionable recommendations based on score gaps |

**Success Criteria:**
- >60% of active users take the weekly sprint.
- Readiness score correlates with mock exam performance (r > 0.7).

---

### Phase 5: Intelligence & Polish (Weeks 12-14)
**Goal:** The product feels magically intelligent.
**Educational Impact: MEDIUM** — Quality of life improvements that compound engagement.

| Week | Focus | Deliverables |
|------|-------|-------------|
| **W12** | Confidence Calibration | Post-answer confidence rating; calibration tracking; metacognition feedback |
| **W13** | Content Quality Layer | Human-curated micro-lessons for top 20 misconceptions; AI explanation caching; image/diagram support |
| **W14** | Performance & Accessibility | Sub-2s page loads; offline review queue caching; WCAG AA compliance; mobile polish |

---

### Phase 6: Scale (Weeks 15+)
**Goal:** Expand without diluting quality.

- **Class 10 curriculum** (natural progression)
- **Hindi language support** (market expansion)
- **Parent summaries** (opt-in, read-only, weekly)
- **School partnerships** (ONLY after student NPS > 50)

**Monetization:** Only after achieving:
- >10,000 active students
- Day-30 retention >30%
- Organic word-of-mouth growth >50% of signups
- Then: premium features like live doubt sessions, advanced analytics, printed worksheets.

---

## Educational Rationale for Each Major Feature

| Feature | Learning Science Principles | Expected Outcome |
|---------|---------------------------|-----------------|
| **Diagnostic Mastery Onboarding** | Pretesting effect; Diagnostic assessment; Prior knowledge activation | Baseline accuracy for personalization |
| **Mastery Graph** | Knowledge Space Theory; Mastery Learning (Bloom); Competence progressions | Precise targeting of practice |
| **Smart Review Queue** | Spaced Repetition (Ebbinghaus); Interleaving (Rohrer); Active Recall | 2-3x better long-term retention vs. massed practice |
| **Adaptive Practice** | Adaptive Difficulty (Vygotsky's ZPD); Scaffolded Instruction | Optimal challenge level; reduced frustration |
| **Socratic AI Tutor** | Socratic Method; Scaffolded instruction; Zone of Proximal Development | Deeper conceptual understanding; self-explanation |
| **Misconception Remediation** | Formative assessment; Immediate feedback; Near transfer | Fix root causes, not symptoms |
| **Exam Readiness Sprints** | Retrieval practice; Low-stakes testing; Distributed practice | Exam familiarity; reduced test anxiety |
| **Momentum System** | Self-Determination Theory; Loss aversion; Progress monitoring | Intrinsic motivation; habit formation |
| **Study Ritual Builder** | Habit loop (Duhigg); Implementation intentions | Daily engagement without willpower depletion |
| **Confidence Calibration** | Metacognition; Self-regulated learning | Reduced overconfidence; better study decisions |

---

## Success Metrics

### Educational KPIs (North Stars)

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| **Topic Mastery Rate** | % of syllabus topics where mastery >70% | >60% by exam time | Mastery Graph tracking |
| **Retention Index** | Accuracy on questions repeated after 7+ days | >75% | Spaced repetition performance |
| **Remediation Success Rate** | % of remediated topics showing improvement on next attempt | >65% | Pre/post comparison |
| **Diagnostic Accuracy** | Correlation between diagnostic estimate and actual performance | r > 0.75 | IRT model validation |
| **Exam Readiness Correlation** | Correlation between readiness score and actual exam score | r > 0.7 | Post-exam survey (optional) |

### Engagement KPIs (Leading Indicators)

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| **Diagnostic Completion Rate** | % of signups completing diagnostic within 24h | >80% | Event tracking |
| **Day-7 Retention** | % of signups active on Day 7 | >50% | Cohort analysis |
| **Day-30 Retention** | % of signups active on Day 30 | >25% | Cohort analysis |
| **Sessions per Active User/Week** | Average learning sessions per active user | >4 | Event tracking |
| **Smart Review Completion Rate** | % of started reviews completed | >85% | Session tracking |
| **Tutor Engagement Rate** | % of incorrect answers where tutor is used | >40% | Interaction tracking |
| **Net Promoter Score** | "How likely are you to recommend VidyaSetu to a friend?" | >50 | In-app survey |

### Anti-Metrics (Watch for These)

| Metric | Why It's Dangerous | Action if High |
|--------|-------------------|----------------|
| **Time spent per session** | Long sessions may indicate confusion, not engagement. | Investigate if correlation with mastery is negative. |
| **Badge unlock rate** | High cosmetic badge rate with low mastery = gamification over learning. | Rebalance badge criteria toward learning behaviors. |
| **Chat volume** | High chat use may indicate content gaps or tutor giving answers too fast. | Analyze chat logs for dependency. |
| **App opens without learning** | Students opening for streak but not practicing. | Redesign streak to require actual learning activity. |

---

## Technical Architecture Recommendations

### 1. Database Schema Overhaul

**Current Problem:** The schema is LMS-shaped (assignments, submissions, schools). It needs to be learning-shaped (mastery, forgetting, interleaving).

**New Core Models:**

```prisma
// === CURRICULUM GRAPH ===
model Subject {
  id          String    @id @default(uuid())
  name        String    @unique
  color       String
  chapters    Chapter[]
}

model Chapter {
  id          String    @id @default(uuid())
  subjectId   String
  subject     Subject   @relation(fields: [subjectId], references: [id])
  name        String
  orderIndex  Int
  topics      Topic[]
}

model Topic {
  id              String      @id @default(uuid())
  chapterId       String
  chapter         Chapter     @relation(fields: [chapterId], references: [id])
  name            String
  orderIndex      Int
  subtopics       Subtopic[]
  prerequisites   Topic[]     @relation("TopicPrerequisites")
  requiredFor     Topic[]     @relation("TopicPrerequisites")
}

model Subtopic {
  id          String      @id @default(uuid())
  topicId     String
  topic       Topic       @relation(fields: [topicId], references: [id])
  name        String
  description String?
  difficulty  Int         @default(1) // 1-5
}

// === USER MASTERY ===
model UserMastery {
  id                  String   @id @default(uuid())
  userId              String
  subtopicId          String
  masteryScore        Float    @default(0)   // 0-100, IRT estimate
  stability           Float    @default(0)   // Forgetting curve stability
  lastPracticed       DateTime?
  totalAttempts       Int      @default(0)
  correctAttempts     Int      @default(0)
  consecutiveCorrect  Int      @default(0)
  errorPatterns       Json     // [{type: "sign_error", count: 3}]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([userId, subtopicId])
  @@index([userId, masteryScore])
  @@index([userId, lastPracticed])
}

// === QUESTIONS ===
model Question {
  id                  String   @id @default(uuid())
  subtopicId          String
  type                String   // MCQ, SHORT_ANSWER, NUMERIC, MATCHING
  bloomLevel          String   // REMEMBER, UNDERSTAND, APPLY, ANALYZE
  difficulty          Int      // 1-5, calibrated
  content             Json     // {question, options, correctAnswer, explanation}
  commonMisconceptions Json    // [{pattern: "sign_error", explanation: "..."}]
  prerequisiteIds     String[] // topic IDs
  usageCount          Int      @default(0)
  avgAccuracy         Float    @default(0)
  source              String   // "curated" | "ai_generated"
  verifiedByHuman     Boolean  @default(false)
}

// === PRACTICE SESSIONS ===
model PracticeSession {
  id              String   @id @default(uuid())
  userId          String
  type            String   // DAILY_REVIEW | ADAPTIVE | TOPIC_FOCUS | EXAM_SPRINT
  status          String   // IN_PROGRESS | COMPLETED | ABANDONED
  startTime       DateTime @default(now())
  endTime         DateTime?
  targetDuration  Int      // minutes
  questions       SessionQuestion[]
  interleaved     Boolean  @default(false)
}

model SessionQuestion {
  id              String   @id @default(uuid())
  sessionId       String
  questionId      String
  orderIndex      Int
  userAnswer      Json?
  isCorrect       Boolean?
  timeTaken       Int?     // seconds
  confidence      Int?     // 1-5
  hintsUsed       Int      @default(0)
  tutorUsed       Boolean  @default(false)
  submittedAt     DateTime?
}

// === ASSIGNMENTS (Simplified) ===
model Assignment {
  id          String       @id @default(uuid())
  userId      String       // Personalized per student
  type        String       // WEEKLY_SPRINT | DIAGNOSTIC | REMEDIAL
  title       String
  dueDate     DateTime?
  status      String       // ACTIVE | COMPLETED | EXPIRED
  questions   Json         // [{questionId, orderIndex}]
  createdAt   DateTime     @default(now())
}

// === STREAKS (Learning-Validated) ===
model StudyStreak {
  id              String   @id @default(uuid())
  userId          String   @unique
  currentStreak   Int      @default(0)
  longestStreak   Int      @default(0)
  lastStudyDate   DateTime?
  totalStudyDays  Int      @default(0)
}
```

**Remove:** School, Class, Enrollment, SubscriptionPlan, ContentSource, ContentItem, ContentCurationLog, AgentRun, StudyMaterial (replace with inline micro-explanations).

### 2. Spaced Repetition Engine (Service Layer)

```typescript
// src/services/spaced-repetition.ts

interface SRNode {
  subtopicId: string;
  masteryScore: number;
  stability: number;      // days until ~50% recall probability
  retrievability: number; // current probability of recall
  lastPracticed: Date;
  repetitions: number;
}

class SpacedRepetitionEngine {
  // Custom FSRS-like algorithm adapted for academic subjects
  calculateRetrievability(node: SRNode): number {
    const elapsed = daysSince(node.lastPracticed);
    return Math.exp(-elapsed / node.stability);
  }

  updateStability(node: SRNode, grade: number /* 0-5 */): number {
    // Grade: 0=complete blackout, 5=perfect recall
    // FSRS-inspired update with subject-specific decay
    const retrievability = this.calculateRetrievability(node);
    const difficulty = this.gradeToDifficulty(node.masteryScore);
    
    const newStability = node.stability * (
      1 + Math.exp(difficulty) * (grade - 2) * (1 / retrievability - 1)
    );
    
    return Math.max(1, newStability);
  }

  generateDailyQueue(userId: string, targetMinutes: number = 15): Promise<Question[]> {
    // 1. Get all nodes with retrievability < threshold (due for review)
    // 2. Add nodes with low mastery (<60) for relearning
    // 3. Interleave subjects: pick from 2-3 different subjects
    // 4. Estimate time per question (~90s average)
    // 5. Return ordered queue
  }
}
```

### 3. AI Tutor Architecture

```typescript
// src/services/ai-tutor.ts

interface TutorContext {
  question: Question;
  studentAnswer: any;
  isCorrect: boolean;
  studentMastery: UserMastery;
  sessionHistory: SessionQuestion[];
}

class SocraticTutor {
  async generateHint(context: TutorContext, hintLevel: number): Promise<string> {
    const prompt = `
You are a patient CBSE Class 9 tutor. The student is stuck on this question:
${context.question.content.question}

Student's answer: ${JSON.stringify(context.studentAnswer)}
Correct answer: ${context.question.content.correctAnswer}

Rules:
1. NEVER give the answer directly.
2. Hint level ${hintLevel}: ${this.getHintStrategy(hintLevel)}
3. Use Class 9 appropriate language. Relate to real life if possible.
4. If the student made a specific error (${this.identifyError(context)}), address the misconception subtly.

Respond in under 50 words.
`;
    return await llm.generate(prompt);
  }

  private getHintStrategy(level: number): string {
    switch(level) {
      case 1: return "Ask a guiding question that points them toward the right approach.";
      case 2: return "Give a procedural hint about the next step.";
      case 3: return "Show a worked example of a similar but simpler problem.";
      default: return "Explain the concept and show the solution step by step.";
    }
  }

  async detectMisconception(context: TutorContext): Promise<string | null> {
    // Pattern matching against known misconception library
    // Falls back to LLM analysis for novel errors
  }
}
```

### 4. Adaptive Difficulty Engine

```typescript
// src/services/adaptive-difficulty.ts

class AdaptiveDifficultyEngine {
  selectNextQuestion(
    studentId: string,
    topicId: string,
    sessionHistory: SessionQuestion[]
  ): Question {
    const mastery = getUserMastery(studentId, topicId);
    const recentAccuracy = calculateRecentAccuracy(sessionHistory, 5);
    
    let targetDifficulty: number;
    
    if (recentAccuracy >= 0.8) {
      targetDifficulty = Math.min(5, mastery.difficultyLevel + 1);
    } else if (recentAccuracy <= 0.4) {
      targetDifficulty = Math.max(1, mastery.difficultyLevel - 1);
      // Check prerequisites if dropping too low
      if (targetDifficulty === 1 && recentAccuracy < 0.3) {
        return this.findPrerequisiteQuestion(studentId, topicId);
      }
    } else {
      targetDifficulty = mastery.difficultyLevel;
    }
    
    return this.findQuestionAtDifficulty(topicId, targetDifficulty, sessionHistory);
  }
}
```

### 5. Architecture Changes

| Area | Current | Recommended |
|------|---------|-------------|
| **Database** | Prisma + Neon (good) | Add Redis for session state & SR queue caching |
| **AI Layer** | Direct OpenAI calls | Add abstraction: `AITutorService` with prompt templates, response caching, fallback to static explanations |
| **Job Queue** | None | Add BullMQ/Redis for: daily review generation, mastery recalculation, content curation |
| **Caching** | None | Redis for: question bank, student mastery state, generated explanations |
| **Analytics** | Basic submission counts | Event pipeline (Segment-compatible) for: every question attempt, hint usage, tutor interaction, time per question |
| **Testing** | Vitest unit tests | Add: A/B test framework, mastery algorithm backtesting, content quality scoring |

### 6. Infrastructure Priorities

1. **Redis** (Upstash or self-hosted): Critical for SR engine performance and real-time adaptive difficulty.
2. **Event Tracking**: Every learning interaction must be tracked for algorithm improvement.
3. **Question Bank**: Curate 5,000+ high-quality questions before launch. AI generation supplements, not replaces.
4. **LLM Cost Management**: Cache explanations. Pre-generate common ones. Use smaller models (GPT-4o-mini) for hint generation, larger models only for novel misconception detection.

---

## Final Principles

1. **Every feature must earn its place on the Mastery Graph.** If it doesn't improve mastery, retention, or habit — kill it.
2. **The student is alone at their desk.** Design for that moment. No teacher, no parent, no peer — just the student and VidyaSetu.
3. **Learning is hard. The product should make it easier, not pretend it's easy.** Celebrate effort and progress, not just outcomes.
4. **Data is a means, not an end.** Track what helps students learn. Don't track what helps us look good in dashboards.
5. **Build the tutor you'd want for your own child.** Patient, smart, never judgmental, always helpful.

---

*This document replaces SAAS-ROADMAP.md as the single source of product truth. All development decisions must trace back to learning impact.*
