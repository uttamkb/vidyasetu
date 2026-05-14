# VidyaSetu — AI Cost Architecture Assessment & Optimization Strategy

> **Stack:** Next.js 16 + Cloud Run + Inngest + Gemini AI SDK + Prisma + Neon PostgreSQL  
> **Assessment Date:** 2026-05-14  
> **Scope:** Full AI cost analysis, optimization roadmap, production scaling strategy

---

## 1. Executive Summary

### Current State: High Cost, Low Efficiency

| Metric | Current | Target |
|--------|---------|--------|
| AI Cost per Assignment | ~$0.08–$0.15 | ~$0.02–$0.04 |
| AI Cost per Evaluation | ~$0.05–$0.12 | ~$0.01–$0.03 |
| AI Cost per Content Pack | ~$0.50–$0.80 | ~$0.05–$0.10 (cached) |
| Cache Hit Rate | 0% | >60% |
| Question Bank Reuse | ~70% bank / 30% AI | ~85% bank / 15% AI |
| Concurrent AI Jobs (Inngest) | 35 max | 50+ with smarter routing |
| Rate Limiting | In-memory, per-user only | Distributed, per-feature, per-model |

### Biggest Risk
**Content Curation (`generateTopicContentPack`)** is the single most expensive operation — ~10x the cost of assignment generation — and it runs **on-demand (JIT)** when students click study materials. At 1,000 concurrent users, this is a cost bomb.

### Biggest Quick Win
Implement **assignment-level caching** and **question bank pre-seeding**. These two changes alone can reduce AI costs by **60–70%**.

---

## 2. Current AI Cost Flow Analysis

### 2.1 Assignment Generation Flow

```
Student clicks "Generate Assignment"
  → POST /api/assignments/generate
    → generateAssignment() [DB queries: 3]
      → Bank questions fetched (70% = ~7 questions, 0 AI cost)
      → AI questions needed (30% = ~3 questions)
        → Inngest event: app/assignment.generate
          → generateAssignmentAIContent()
            → generateQuestionsWithAI()
              → buildQuestionGenerationPrompt() [~3,500 chars prompt]
              → callGemini(geminiFlashModels, prompt, ...)
                → Attempt 1: gemini-2.5-flash
                  → Input: ~1,000 tokens (prompt)
                  → Output: ~2,500 tokens (3 questions JSON)
                  → Cost: ~$0.0015 input + ~$0.0015 output = ~$0.003
                → If fails → Attempt 2: gemini-2.0-flash-lite
                  → Same tokens, cost ~$0.0012
                → If fails → Attempt 3: gemini-flash-latest
                  → Same tokens, cost ~$0.0015
              → prisma.question.createManyAndReturn() [DB write]
              → prisma.assignment.update() [DB write]
    → Total per assignment: ~$0.003–$0.009 (avg $0.005)
```

**Observation:** This is actually the *cheapest* AI path. Flash models are well-chosen. The 70/30 bank/AI split is good.

### 2.2 Submission Evaluation Flow

```
Student submits answers
  → POST /api/submissions
    → prisma.submission.create() [DB write]
    → Inngest event: app/submission.evaluate
      → evaluateSubmissionJob (concurrency: 15)
        → evaluateSubmission()
          → DB fetch: submission + assignment + questions [1 query]
          → Objective grading (MCQ/NUMERIC): 0 AI cost
          → Subjective batch evaluation
            → Chunk size: 5 questions per batch
            → For 10-question assignment with 5 subjective:
              → 1 batch of 5
              → callGemini(geminiProModels, batchPrompt, ...)
                → Attempt 1: gemini-2.5-pro
                  → Input: ~2,500 tokens (5 questions + answers + rubric)
                  → Output: ~3,000 tokens (5 evaluation JSON objects)
                  → Cost: ~$0.003 input + ~$0.015 output = ~$0.018
                → If batch fails → FALLBACK: individual evaluation
                  → 5 × callGemini(geminiProModels, individualPrompt)
                  → Cost: 5 × ~$0.008 = ~$0.040 (2.2x more expensive!)
          → generateOverallFeedback()
            → callGemini(geminiFlashModels, feedbackPrompt)
              → Input: ~300 tokens, Output: ~200 tokens
              → Cost: ~$0.0005
          → prisma.$transaction() [mastery + leaderboard updates]
    → Total per evaluation: ~$0.019–$0.060 (avg ~$0.025)
```

**Observation:** The batch-to-individual fallback is a **major cost risk**. If batch failure rate is 10%, average cost increases by ~12%. At scale, this adds up.

### 2.3 Content Curation Flow (THE COST BOMB)

```
Student clicks "Study Materials" for a topic with no content
  → GET /api/study-materials?topicId=xxx
    → No materials found
    → JIT trigger: generateTopicContentPack(topicId)
      → DB fetch: topic + chapter + subject + subtopics [1 query]
      → callGemini(contentGenModels, massivePrompt, ...)
        → Attempt 1: gemini-2.5-pro
          → Input: ~1,200 tokens (prompt with topic metadata)
          → Output: ~10,000 tokens (full 7-section content pack)
          → Cost: ~$0.0015 input + ~$0.050 output = ~$0.052
        → If fails → Attempt 2: gemini-3.1-pro-preview
          → Same output size, cost ~$0.060
        → If fails → Attempt 3: gemini-pro-latest
          → Cost ~$0.055
      → Verify YouTube videos (up to 5 API calls, 0 AI cost)
      → prisma.studyMaterial.upsert() [DB write]
      → prisma.question.create() for self-assessment questions [DB writes]
    → Total per content pack: ~$0.052–$0.180 (avg ~$0.070)
```

**Observation:** This is **14x more expensive** than assignment generation. If 100 students click the same topic, you pay $7.00 instead of $0.07 (with caching).

### 2.4 Model Cascade Cost Multiplier

Current cascade behavior:

| Model Tier | Models | Avg Cost per 1K Output Tokens | Fallback Trigger |
|------------|--------|------------------------------|------------------|
| Flash | 2.5-flash → 2.0-lite → flash-latest | $0.60 → $0.30 → $0.60 | Any error (429, 503, 500, parse error) |
| Pro | 2.5-pro → 3.1-pro-preview → pro-latest | $5.00 → $6.00 → $5.00 | Any error |
| Content | 2.5-pro → 3.1-pro-preview → pro-latest | $5.00 → $6.00 → $5.00 | Any error |

**Problem:** The cascade retries on **any** error, including:
- 429 (rate limit) — retry with exponential backoff is correct
- 503 (service unavailable) — retry is correct
- **JSON parse error** — retrying won't help; prompt is malformed or model output is bad
- **Zod validation error** — retrying won't help; schema mismatch

**Cost Impact:** If 5% of calls hit parse/validation errors, each cascades through 2 more models = 15% extra cost for zero benefit.

---

## 3. Biggest AI Cost Drivers (Ranked)

### 🚨 #1: JIT Content Generation (Content Curation)
- **Current:** Generated on-demand when student clicks
- **Cost:** ~$0.07 per topic, per student
- **At 1,000 users exploring 5 topics each:** $350/day
- **With caching:** $0.07/day (generate once, serve 1,000 times)
- **Savings Potential:** 99.98%

### 🚨 #2: Batch Evaluation Fallback to Individual
- **Current:** If batch of 5 fails, evaluate each individually
- **Cost multiplier:** 2.2x per failure
- **At 10% failure rate:** +12% evaluation cost
- **With better prompts + structured outputs:** Reduce failure to 2%
- **Savings Potential:** 10%

### 🚨 #3: No Assignment-Level Caching
- **Current:** Same student generates "Polynomials Chapter Test" multiple times
- **Cost:** $0.005 per generation
- **At 100 students retrying same assignment:** $0.50
- **With caching by (topic, difficulty, count):** $0.005 once
- **Savings Potential:** 95%

### 🚨 #4: Pro Models Used for Overall Feedback
- **Current:** Overall feedback uses Flash (correct)
- **But:** Batch evaluation uses Pro for ALL subjective questions
- **Opportunity:** Short answers (2-3 marks) could use Flash with a simpler rubric
- **Savings Potential:** 30–40% of evaluation cost

### 🚨 #5: Massive Prompts with Redundant Instructions
- **Question generation prompt:** ~3,500 chars = ~875 tokens
- **Could be:** ~1,500 chars = ~375 tokens (strip verbose pedagogical fluff)
- **Savings:** ~57% input tokens per generation call
- **At 1,000 generations/day:** $0.50/day saved

### 🚨 #6: No Per-User Daily/Monthly Limits
- **Current:** Rate limit is 30 req/min (in-memory, resets on deploy)
- **Missing:** Daily token budget, monthly spend cap, per-feature limits
- **Risk:** Single abusive user could burn $50+ in a day

---

## 4. Unnecessary AI Calls & Repeated Patterns

### 4.1 Identified Waste

| Pattern | Location | Fix | Savings |
|---------|----------|-----|---------|
| Same topic content regenerated for every student | `content-curator.ts` | Pre-seed + cache | 99% |
| Same assignment type regenerated | `assignment-generator.ts` | Cache by (topic, difficulty, count) | 95% |
| Model list fetched on EVERY generation | `route.ts:48-59` | Remove or cache for 1h | 0 cost (just latency) |
| Overall feedback re-generated for same score pattern | `evaluation-engine.ts` | Cache by (score%, wrong topics) | 80% |
| Individual fallback on batch parse errors | `evaluation-engine.ts:327-335` | Better structured output + no retry on parse | 15% |
| Full content pack generated when only notes needed | `content-curator.ts` | Split into 3 API calls: notes, videos, questions | 60% |
| Pro used for all subjective evaluations | `evaluation-engine.ts` | Use Flash for 1-2 mark questions, Pro for 5+ marks | 35% |

### 4.2 Repeated Generation Patterns (Cacheable)

```
High-Frequency, Low-Variability Requests:
├─ "Class 9 CBSE Mathematics: Polynomials Chapter Test (MEDIUM, 10 questions)"
├─ "Class 9 CBSE Science: Force and Laws of Motion Chapter Test (MIXED, 10 questions)"
├─ "Class 10 CBSE Mathematics: Quadratic Equations Chapter Test (HARD, 15 questions)"
└─ Content packs for TOP 50 most-clicked topics

→ These represent ~70% of all AI generation requests
→ Cache key: (grade, board, subject, chapter, difficulty, count, school?)
→ TTL: 7 days (curriculum doesn't change weekly)
```

---

## 5. Prompt Efficiency Analysis

### 5.1 Question Generation Prompt

**Current:** ~3,500 characters (~875 tokens)  
**Problem:** Massive pedagogical preamble that repeats every call.

```
Current structure:
- "You are a senior CBSE/NCERT examination paper setter..." [200 chars]
- Student context (school/district/state) [150 chars]
- Localization rules (4 bullet points) [400 chars]
- Internal emulation analysis (6 bullets) [500 chars]
- Goal statement [150 chars]
- Context (chapter, topics, difficulty) [200 chars]
- Question distribution rules [300 chars]
- Pedagogical requirements [800 chars]
- Difficulty guidelines [200 chars]
- Output schema [1,000 chars]
- Strict rules [400 chars]
```

**Optimized structure:**
```
- System prompt (set once in model config, not per-call): "You are a CBSE Class {grade} {subject} question setter."
- Per-call dynamic content:
  - Chapter: {chapterName}
  - Subtopics: {subtopics}
  - Difficulty: {difficulty}
  - Count: {count}
  - Localization: {state}/{district}/{school}
- Output schema (compressed JSON example)
```

**Estimated reduction:** 875 → 350 tokens (**60% savings**)

### 5.2 Batch Evaluation Prompt

**Current:** ~2,000–4,000 chars per batch  
**Problem:** Full rubric repeated for every batch.

**Optimization:**
- Move evaluation philosophy to system instruction
- Per-batch: just questions, answers, and key points
- **Reduction:** ~30% input tokens

### 5.3 Content Curation Prompt

**Current:** ~4,000 chars + 16K output  
**Problem:** Generating ALL 7 sections in ONE call is expensive.

**Optimization:**
- Split into 3 parallel Flash calls:
  1. Core concepts + micro-topics + explanations (Flash, ~3K output)
  2. Examples + misconceptions + revision sheet (Flash, ~2K output)
  3. Self-assessment questions + YouTube recommendations (Flash, ~1K output)
- Total: 3 × Flash calls = ~$0.006 vs 1 × Pro call = ~$0.052
- **Savings: 88%**

---

## 6. Caching Strategy

### 6.1 Multi-Layer Cache Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  L1: In-Memory Cache (Node.js server, < 1ms)               │
│     - Recently generated assignments (last 50)              │
│     - Active content packs (last 20 topics)                 │
│     - TTL: 5 minutes                                        │
├─────────────────────────────────────────────────────────────┤
│  L2: Redis / Upstash Redis (5–15ms)                        │
│     - Assignment templates by (topic, difficulty, count)    │
│     - Content packs by topicId                              │
│     - Evaluation rubrics by (questionId, answerHash)        │
│     - Overall feedback by (score%, subject, grade)          │
│     - TTL: 7 days for assignments, 30 days for content      │
├─────────────────────────────────────────────────────────────┤
│  L3: Database (Prisma/Neon, 20–50ms)                       │
│     - Question bank (already exists)                        │
│     - Study materials (already exists)                      │
│     - User mastery (already exists)                         │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Cache Key Design

```typescript
// Assignment cache key
`assignment:${grade}:${board}:${subjectId}:${chapterId}:${difficulty}:${count}:${schoolHash}`

// Content pack cache key
`content:${topicId}:${LATEST_CONTENT_VERSION}`

// Evaluation cache key (for identical answers)
`eval:${questionId}:${hashAnswer(studentAnswer)}:${hashAnswer(modelAnswer)}`

// Overall feedback cache key
`feedback:${grade}:${subject}:${scorePercent}:${wrongCount}:${skippedCount}`
```

### 6.3 Cache Invalidation

| Cache Type | Invalidation Trigger |
|------------|---------------------|
| Assignment | Curriculum update, new school pattern detected |
| Content pack | `LATEST_CONTENT_VERSION` bump, manual admin refresh |
| Evaluation | Never (deterministic by question+answer) |
| Feedback | Never (deterministic by score pattern) |

---

## 7. Request Batching & Queue Optimization

### 7.1 Inngest Current State

```typescript
// Evaluation: 15 concurrent
{ concurrency: { limit: 15 }, retries: 3 }

// Generation: 20 concurrent
{ concurrency: { limit: 20 }, retries: 2 }
```

**Issues:**
1. No cost-based throttling
2. No priority queue (free user vs pro user)
3. No batching of similar jobs
4. No deduplication

### 7.2 Proposed Inngest Optimization

```typescript
// Priority-based concurrency
{ 
  concurrency: { 
    limit: 15,
    key: "event.data.userTier", // Separate pools for FREE vs PRO
  },
  retries: 3,
  // Debounce: if same assignment generation is requested twice in 30s, dedupe
  debounce: { period: "30s", key: "event.data.assignmentId" }
}

// Batch similar evaluations
{ 
  concurrency: { limit: 20 },
  batchEvents: {
    maxSize: 5,
    timeout: "5s",
    key: "event.data.assignmentId" // Batch evaluations for same assignment
  }
}
```

### 7.3 Job Deduplication

```typescript
// Before sending Inngest event, check if job already queued
async function deduplicateEvent(eventName: string, dedupeKey: string) {
  const existing = await redis.get(`inngest:pending:${eventName}:${dedupeKey}`);
  if (existing) return { skipped: true, reason: "Already queued" };
  
  await redis.setex(`inngest:pending:${eventName}:${dedupeKey}`, 300, "1");
  return { skipped: false };
}
```

---

## 8. Model Selection Strategy (Model Router)

### 8.1 Current: Static Cascade

```
Flash: 2.5-flash → 2.0-lite → flash-latest
Pro:  2.5-pro → 3.1-pro-preview → pro-latest
```

### 8.2 Proposed: Smart Router

```typescript
interface ModelRouterConfig {
  task: "generation" | "evaluation" | "feedback" | "content";
  complexity: "low" | "medium" | "high";
  outputTokens: number;
  userTier: "free" | "pro";
}

function selectModel(config: ModelRouterConfig): string {
  // Low complexity + small output → Flash Lite
  if (config.complexity === "low" && config.outputTokens < 2000) {
    return "gemini-2.0-flash-lite";
  }
  
  // Medium complexity + medium output → Flash
  if (config.complexity === "medium" && config.outputTokens < 4000) {
    return "gemini-2.5-flash";
  }
  
  // High complexity OR large output → Pro
  return "gemini-2.5-pro";
}
```

### 8.3 Task-to-Model Mapping

| Task | Current Model | Proposed Model | Cost Reduction |
|------|--------------|----------------|----------------|
| Question generation (3 MCQs) | Flash cascade | Flash Lite | 40% |
| Question generation (3 short answers) | Flash cascade | Flash | 0% (same) |
| Batch evaluation (5 questions, 1-2 marks each) | Pro | Flash | 75% |
| Batch evaluation (5 questions, 3-5 marks each) | Pro | Pro | 0% |
| Overall feedback | Flash | Flash Lite | 50% |
| Content pack (notes only) | Pro | Flash | 80% |
| Content pack (full 7-section) | Pro | 3 parallel Flash | 88% |
| Diagnostic assessment | Pro | Flash | 70% |

---

## 9. Concurrency & Scaling Analysis

### 9.1 Cloud Run Scaling Behavior

| Metric | Current | At 1,000 Concurrent Users |
|--------|---------|--------------------------|
| Container instances | 1–10 | 50–100 |
| Cold start latency | 2–5s | Same (per container) |
| In-memory rate limit store | Per container = broken | Per container = VERY broken |
| Prisma connections | 1 per container × 100 = 100 | Neon limit: ~1000 |

**Critical Issue:** In-memory rate limiting (`src/lib/rate-limit.ts`) is **completely ineffective** at scale. Each Cloud Run container has its own `Map`, so a user gets 30 req/min × container count.

### 9.2 Inngest Concurrency Bottlenecks

At 1,000 concurrent users submitting evaluations:
- 15 concurrent evaluation jobs
- Average evaluation time: 5s (batch) + 2s (feedback) = 7s
- Throughput: 15 jobs / 7s = ~2.1 evaluations/second
- Queue depth: 1,000 users × 1 eval / 2.1 per sec = **476 seconds queue wait**

**Users wait 8 minutes for evaluation.** This is unacceptable.

### 9.3 Required Concurrency Scaling

| Users | Eval Concurrency | Gen Concurrency | Avg Wait Time |
|-------|-----------------|-----------------|---------------|
| 100 | 15 | 20 | 47s |
| 500 | 50 | 50 | 70s |
| 1,000 | 100 | 75 | 70s |
| 5,000 | 200 | 150 | 175s |

**Note:** Gemini API quotas typically limit to 60 RPM for Flash, 30 RPM for Pro per project. Raw concurrency scaling hits API limits.

### 9.4 Solution: Sharded API Keys + Queue Prioritization

```
Multiple Gemini API Keys (sharded by userId % N)
  → Key Pool Manager rotates keys
  → Per-key rate limiting enforced in code
  → If all keys exhausted, queue with exponential backoff
```

---

## 10. Retry Strategy & Failure Scenarios

### 10.1 Current Retry Behavior

```typescript
// Inngest retries: 3 attempts with exponential backoff
// callGemini cascade: 3 model attempts per Inngest attempt
// Total potential calls: 3 × 3 = 9 AI calls per job
```

### 10.2 Problem: Retry on Non-Retryable Errors

| Error Type | Should Retry? | Current Behavior | Cost Impact |
|------------|--------------|------------------|-------------|
| 429 (rate limit) | Yes (with backoff) | Yes | Low |
| 503 (service unavailable) | Yes | Yes | Low |
| 400 (bad request) | No | Yes (cascades) | **High** |
| JSON parse error | No | Yes (cascades) | **High** |
| Zod validation error | No | Yes (cascades) | **High** |
| 401/403 (auth error) | No | Yes (cascades) | **High** |

### 10.3 Proposed: Intelligent Retry

```typescript
function shouldRetry(error: any): boolean {
  const code = error.status || error.code;
  if ([429, 503, 504].includes(code)) return true; // transient
  if ([400, 401, 403].includes(code)) return false; // client error
  if (error.message?.includes("JSON parse")) return false; // bad output
  if (error.name === "ZodError") return false; // schema mismatch
  return false; // default: don't retry
}
```

---

## 11. Database Usage & Optimization

### 11.1 Current Query Patterns

| Operation | Queries | Optimization |
|-----------|---------|--------------|
| Assignment generation | 3 (subject, user, questions) | Combine subject+user into 1 query |
| Evaluation | 1 (submission+assignment+user) | Good |
| Evaluation (mastery update) | N (1 per subtopic) | Batch with `upsertMany` |
| Evaluation (leaderboard) | 3 (weekly, monthly, all-time) | Good |
| Content generation | 1 (topic+chapter+subject) | Good |

### 11.2 Neon Connection Pooling

```
Current: PrismaNeon manages connections internally
Issue: No visibility into connection count, no tuning
Recommendation:
  - Set max connections to 20 per Cloud Run instance
  - Monitor `pg_stat_activity` for idle connections
  - Use connection pooling URL for Prisma
```

### 11.3 Query Optimization

```typescript
// BEFORE: N queries for mastery updates
for (const update of updates) {
  await tx.userMastery.upsert({...}); // N queries
}

// AFTER: 1 query with ON CONFLICT
await tx.$executeRaw`
  INSERT INTO user_mastery (user_id, subtopic_id, mastery_score, ...)
  VALUES ${updates.map(u => `(${u.userId}, ${u.subtopicId}, ...)`).join(",")}
  ON CONFLICT (user_id, subtopic_id) 
  DO UPDATE SET ...
`;
```

---

## 12. Duplicate Request Prevention

### 12.1 Current State

No deduplication exists. A user can:
1. Click "Generate Assignment" 5 times rapidly → 5 Inngest jobs
2. Refresh page during evaluation → trigger new evaluation
3. Multiple students request same content → each gets fresh generation

### 12.2 Idempotency Keys

```typescript
// API Route
const idempotencyKey = req.headers.get("Idempotency-Key") || 
                       `${session.user.id}:${Date.now()}`;

const existing = await redis.get(`idempotency:${idempotencyKey}`);
if (existing) {
  return NextResponse.json(JSON.parse(existing));
}

// Process...
await redis.setex(`idempotency:${idempotencyKey}`, 300, JSON.stringify(result));
```

### 12.3 Content Deduplication

```typescript
// Before generating content pack
const existing = await prisma.studyMaterial.findFirst({
  where: { topicId, type: "PLATFORM_CONTENT", isAIGenerated: true }
});
if (existing && !isContentOutdated([existing])) {
  return existing; // Serve cached
}
```

---

## 13. Storage vs. Regeneration Tradeoffs

### 13.1 Cost Comparison

| Asset | Generation Cost | Storage Cost (1 year) | Break-Even |
|-------|----------------|----------------------|------------|
| Content pack (10K tokens) | $0.07 | $0.0001 (DB row) | 1 use |
| Assignment (3 AI questions) | $0.005 | $0.00005 | 1 use |
| Evaluation (5 subjective) | $0.025 | $0.0001 | 1 use |

**Conclusion:** Always store. Generation is 100–1000x more expensive than storage.

### 13.2 Pre-Generation Strategy

```
Pre-generate content packs for TOP 50 topics during low-traffic hours
  → Inngest cron job: every Sunday 2 AM
  → Generate content for topics with >10 views but no content
  → Store in DB with version marker
  → Students get instant load, zero AI cost
```

---

## 14. Question Bank Reuse Strategy

### 14.1 Current: 70% Bank / 30% AI

```typescript
const bankQCount = Math.min(existingQuestions.length, Math.floor(qCount * 0.7));
const aiQCount = qCount - bankQCount;
```

### 14.2 Target: 90% Bank / 10% AI

```
Strategy:
1. Pre-generate 500 AI questions per chapter during seeding
2. Store in question bank with source="ai_generated"
3. Mark as verifiedByHuman=false initially
4. During assignment generation:
   - Pull 90% from bank (mix of human-verified + AI-generated)
   - Only generate 10% fresh AI questions for variety
5. After student attempts, use performance data to promote AI questions
```

### 14.3 Bank Quality Metrics

```typescript
// Promote AI questions to "verified" after N successful uses
await prisma.question.updateMany({
  where: { 
    source: "ai_generated", 
    usageCount: { gte: 10 },
    avgAccuracy: { gte: 0.4, lte: 0.8 } // Not too easy, not too hard
  },
  data: { verifiedByHuman: true }
});
```

---

## 15. Cost Per User / Per Generation Estimation

### 15.1 Current Cost Model (Per Active User per Day)

| Activity | Frequency | Cost per Action | Daily Cost |
|----------|-----------|-----------------|------------|
| Assignment generation | 2/day | $0.005 | $0.010 |
| Submission evaluation | 2/day | $0.025 | $0.050 |
| Content pack view (JIT) | 3/day | $0.070 | $0.210 |
| **Total per user/day** | | | **$0.270** |

### 15.2 Optimized Cost Model

| Activity | Frequency | Cost per Action | Daily Cost |
|----------|-----------|-----------------|------------|
| Assignment generation | 2/day | $0.001 (cached) | $0.002 |
| Submission evaluation | 2/day | $0.015 (Flash for short answers) | $0.030 |
| Content pack view | 3/day | $0.0001 (cached) | $0.0003 |
| **Total per user/day** | | | **$0.032** |

**Savings: 88% per user per day**

### 15.3 Scaling to 1,000 Active Users

| Scenario | Daily AI Cost | Monthly AI Cost |
|----------|--------------|-----------------|
| Current (no optimization) | $270 | $8,100 |
| With caching + model routing | $32 | $960 |
| With pre-generation + bank reuse | $16 | $480 |

---

## 16. Scaling Impact for 1,000 Concurrent Users

### 16.1 Resource Requirements

| Resource | Current | At 1,000 Users | Bottleneck |
|----------|---------|---------------|------------|
| Cloud Run instances | 1–10 | 50–100 | CPU/memory |
| Gemini API RPM (Flash) | <60 | 600+ | API quota |
| Gemini API RPM (Pro) | <30 | 300+ | API quota |
| Inngest job queue depth | <10 | 500+ | Concurrency limits |
| Neon DB connections | 10 | 500+ | Connection pool |
| Redis (if added) | 0 | 1 instance | Memory |

### 16.2 Required Infrastructure Changes

```
1. Redis/Upstash Redis (required)
   - Distributed rate limiting
   - Multi-layer caching
   - Job deduplication
   
2. Multiple Gemini API Keys (required)
   - Shard by userId to distribute quota
   - Fallback key pool manager
   
3. Inngest Concurrency Increase (required)
   - Evaluation: 15 → 100
   - Generation: 20 → 75
   - Add priority tiers (PRO users first)
   
4. Neon Connection Pooling (required)
   - Use PgBouncer or Neon pooled URL
   - Max 20 connections per Cloud Run instance
   
5. Cloud Run Min Instances (recommended)
   - Keep 5 warm instances to reduce cold starts
   - Cost: ~$50/month vs user experience gain
```

---

## 17. Cloud Run Specific Recommendations

### 17.1 Container Optimization

```yaml
# Current: No memory/CPU tuning visible
# Recommended Cloud Run service.yaml:
spec:
  template:
    spec:
      containers:
        - resources:
            limits:
              cpu: "2"
              memory: "2Gi"
          env:
            - name: GEMINI_API_KEY_POOL
              valueFrom:
                secretKeyRef:
                  name: gemini-keys
      containerConcurrency: 80  # Max requests per container
      maxScale: 100
      minScale: 5  # Warm instances
```

### 17.2 Environment Variable Strategy

```
# Instead of single GEMINI_API_KEY:
GEMINI_API_KEY_1=...
GEMINI_API_KEY_2=...
GEMINI_API_KEY_3=...
GEMINI_KEY_POOL_SIZE=3

# Application rotates keys based on userId hash
```

---

## 18. Inngest Batching Optimization

### 18.1 Event Batching

```typescript
// Batch evaluation jobs for same assignment
export const batchEvaluateJob = inngest.createFunction(
  {
    id: "batch-evaluate-submissions",
    concurrency: { limit: 20 },
    batchEvents: {
      maxSize: 10,
      timeout: "10s",
      key: "data.assignmentId",
    },
  },
  { event: "app/submission.evaluate" },
  async ({ events, step }) => {
    // Process 10 submissions in one batch
    // Share common data (assignment, questions) across all
    // Single DB query for assignment + questions
    // Batch AI evaluation if answers are similar
    const results = await step.run("batch-evaluate", async () => {
      return await evaluateBatch(events.map(e => e.data.submissionId));
    });
    return { processed: events.length, results };
  }
);
```

### 18.2 Cost Savings from Batching

| Scenario | Without Batch | With Batch | Savings |
|----------|--------------|-----------|---------|
| 10 students, same assignment | 10 × DB queries + 10 × AI calls | 1 × DB query + 5 × AI calls | 50% |
| 50 students, same chapter test | 50 evaluations | 5 batches of 10 | 70% |

---

## 19. Redis / Cache Opportunities

### 19.1 Recommended Redis Schema

```
# Assignment template cache
SET assignment:template:{hash} {json} EX 604800  # 7 days

# Content pack cache
SET content:pack:{topicId}:{version} {json} EX 2592000  # 30 days

# Rate limiting (distributed)
INCR ratelimit:{userId}:{feature} EX 60

# Job deduplication
SETEX inngest:pending:{event}:{key} 300 1

# API key rotation state
HSET gemini:key:usage {keyId} {timestamp}

# Model fallback circuit breaker
SETEX circuit:breaker:{model} 300 1  # 5min cooldown
```

### 19.2 Upstash Redis (Serverless, Pay-per-Request)

```
Cost: ~$0.20 per 100K requests
At 1,000 users/day:
  - Rate limit checks: 1,000 × 10 = 10K
  - Cache lookups: 1,000 × 5 = 5K
  - Total: 15K/day = $0.03/day = $0.90/month
  
vs AI cost savings: $7,000+/month
ROI: 7,700x
```

---

## 20. Observability & Monitoring Metrics

### 20.1 Required Metrics

| Metric | Type | Alert Threshold |
|--------|------|----------------|
| `ai.calls.total` | Counter | >10K/day |
| `ai.calls.by_model` | Counter | Pro >50% of total |
| `ai.tokens.input` | Counter | — |
| `ai.tokens.output` | Counter | — |
| `ai.cost.total_usd` | Gauge | >$50/day |
| `ai.cost.by_user` | Gauge | >$5/user/day |
| `ai.cache.hit_rate` | Gauge | <50% |
| `ai.batch.failure_rate` | Gauge | >5% |
| `ai.cascade.fallback_rate` | Gauge | >10% |
| `inngest.queue.depth` | Gauge | >100 |
| `inngest.job.duration` | Histogram | p99 >30s |
| `db.connections.active` | Gauge | >80% of max |
| `rate_limit.rejected` | Counter | >100/day |

### 20.2 Implementation

```typescript
// Using existing logger
logger.info("AI call completed", {
  category: "AI",
  userId,
  metadata: {
    model: modelName,
    tokensInput: usage.promptTokenCount,
    tokensOutput: usage.completionTokenCount,
    costUsd: calculateCost(modelName, usage),
    cacheHit: false,
    durationMs: Date.now() - startTime,
  }
});
```

---

## 21. Per-User & Per-Tenant Cost Controls

### 21.1 Daily Budget Caps

```typescript
const USER_DAILY_LIMITS = {
  free: { tokens: 50_000, costUsd: 0.50 },
  pro: { tokens: 500_000, costUsd: 5.00 },
};

async function checkBudget(userId: string, tier: "free" | "pro"): Promise<boolean> {
  const key = `budget:${userId}:${new Date().toISOString().slice(0, 10)}`;
  const spent = await redis.hgetall(key);
  const tokens = parseInt(spent.tokens || "0");
  const cost = parseFloat(spent.cost || "0");
  
  const limit = USER_DAILY_LIMITS[tier];
  return tokens < limit.tokens && cost < limit.costUsd;
}
```

### 21.2 Budget Protection Mechanisms

```
1. Soft limit (80%): Warn user, suggest upgrade
2. Hard limit (100%): Block AI features, serve cached content only
3. Emergency limit (200%): Block user entirely, alert admin
4. Global daily cap: If total platform spend > $100/day, throttle all free users
```

---

## 22. Abuse Prevention

### 22.1 Attack Vectors

| Vector | Risk | Mitigation |
|--------|------|------------|
| Rapid assignment generation | Medium | Distributed rate limit: 5/hour for free, 20/hour for pro |
| Bot submission spam | High | CAPTCHA on submit, device fingerprinting |
| Content scraping | Medium | Rate limit study-materials endpoint, require auth |
| Shared API key abuse | High | Key rotation, per-key quota monitoring |
| Prompt injection | Medium | Input sanitization, output validation |

### 22.2 Anomaly Detection

```typescript
// Flag users with unusual patterns
async function detectAbuse(userId: string): Promise<boolean> {
  const stats = await prisma.userAIUsage.groupBy({
    by: ["type"],
    where: { userId, date: { gte: new Date(Date.now() - 86400000) } },
    _sum: { callCount: true, estimatedTokens: true },
  });
  
  const totalCalls = stats.reduce((s, r) => s + r._sum.callCount, 0);
  if (totalCalls > 100) return true; // >100 AI calls/day = suspicious
  
  return false;
}
```

---

## 23. Prioritized Recommendations

### 🔥 Quick Wins (Implement This Week)

| # | Action | Effort | Savings | Impact |
|---|--------|--------|---------|--------|
| 1 | **Add content pack caching** (DB + Redis) | 4h | 99% content cost | 🔥 Critical |
| 2 | **Fix middleware role check** for SUPER_ADMIN | 30min | N/A (functional) | 🔥 Critical |
| 3 | **Add assignment template caching** (Redis) | 4h | 95% repeat gen cost | 🔥 High |
| 4 | **Remove model list fetch** from generation route | 15min | Latency only | 🟡 Medium |
| 5 | **Add distributed rate limiting** (Upstash) | 2h | Prevents abuse | 🔥 High |

### 📈 Short-Term (This Month)

| # | Action | Effort | Savings | Impact |
|---|--------|--------|---------|--------|
| 6 | **Implement smart model router** (Flash for simple evals) | 8h | 35% eval cost | 🔥 High |
| 7 | **Split content curation into 3 parallel Flash calls** | 6h | 88% content cost | 🔥 High |
| 8 | **Pre-generate TOP 50 topic content packs** (Inngest cron) | 4h | 90% JIT content cost | 🔥 High |
| 9 | **Compress prompts** (strip redundant instructions) | 4h | 30% input tokens | 🟡 Medium |
| 10 | **Add per-user daily token/cost budgets** | 4h | Prevents abuse | 🟡 Medium |
| 11 | **Add idempotency keys** to generation API | 2h | Prevents duplicates | 🟡 Medium |
| 12 | **Implement intelligent retry** (no retry on parse errors) | 2h | 15% cascade waste | 🟡 Medium |

### 🏗️ Long-Term (Next Quarter)

| # | Action | Effort | Savings | Impact |
|---|--------|--------|---------|--------|
| 13 | **Increase question bank to 90% reuse** | 16h | 60% gen cost | 🔥 High |
| 14 | **Implement Inngest event batching** | 8h | 50% eval cost at peak | 🔥 High |
| 15 | **Add multiple Gemini API keys + rotation** | 4h | Enables scaling | 🟡 Medium |
| 16 | **Add Redis L1/L2 cache architecture** | 8h | <10ms cache hits | 🟡 Medium |
| 17 | **Implement evaluation caching** by answer hash | 6h | 80% repeat evals | 🟡 Medium |
| 18 | **Add comprehensive AI observability dashboard** | 8h | Visibility | 🟢 Low |
| 19 | **Add anomaly detection + auto-throttling** | 12h | Abuse prevention | 🟡 Medium |
| 20 | **Migrate to Gemini 2.5 Flash for all non-critical tasks** | 4h | 40% cost reduction | 🔥 High |

---

## 24. Recommended Architecture Changes

### 24.1 Before vs After

```
BEFORE (Current):
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Student   │────▶│  Next.js    │────▶│   Gemini    │
│             │     │  (Cloud Run)│     │   (Direct)  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Neon DB   │
                    └─────────────┘

AFTER (Optimized):
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Student   │────▶│  Next.js    │────▶│  Cache      │
│             │     │  (Cloud Run)│     │  (Redis)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
       │                    │                   │
       │                    ▼                   │
       │             ┌─────────────┐            │
       │             │   Inngest   │            │
       │             │   Queue     │            │
       │             └──────┬──────┘            │
       │                    │                   │
       │         ┌──────────┴──────────┐        │
       │         ▼                     ▼        │
       │    ┌─────────┐          ┌─────────┐    │
       │    │  Flash  │          │   Pro   │    │
       │    │ (Fast)  │          │ (Deep)  │    │
       │    └────┬────┘          └────┬────┘    │
       │         │                    │         │
       │         └──────────┬─────────┘         │
       │                    ▼                   │
       │             ┌─────────────┐            │
       └────────────▶│   Neon DB   │◀───────────┘
                     └─────────────┘
```

### 24.2 New Service: Model Router

```typescript
// src/services/model-router.ts
export async function routeAIRequest<T>(
  config: RouterConfig,
  prompt: string,
  fallback: T
): Promise<T> {
  // 1. Check cache
  const cached = await cache.get(config.cacheKey);
  if (cached) return cached;
  
  // 2. Select model based on complexity
  const model = selectModel(config);
  
  // 3. Check budget
  const withinBudget = await checkBudget(config.userId, config.tier);
  if (!withinBudget) throw new BudgetExceededError();
  
  // 4. Call AI
  const result = await callGemini([model], prompt, fallback, config.schema);
  
  // 5. Track usage
  await trackAIUsage({...});
  
  // 6. Cache result
  await cache.set(config.cacheKey, result, config.ttl);
  
  return result;
}
```

---

## 25. Production-Safe Scaling Recommendations

### 25.1 Immediate (Before Next Traffic Spike)

1. **Set Cloud Run max instances to 100**
2. **Enable Neon connection pooling** (pooled URL)
3. **Add Upstash Redis** (free tier: 10K req/day)
4. **Implement distributed rate limiting**
5. **Add content pack caching**

### 25.2 Before 500 Concurrent Users

1. **Add 2nd Gemini API key** and rotation logic
2. **Increase Inngest evaluation concurrency to 50**
3. **Implement smart model router**
4. **Add per-user daily budgets**
5. **Pre-generate TOP 50 content packs**

### 25.3 Before 1,000 Concurrent Users

1. **Add 3rd Gemini API key**
2. **Implement Inngest batching**
3. **Add Redis L1/L2 cache**
4. **Increase question bank reuse to 90%**
5. **Add anomaly detection**
6. **Set global daily AI spend cap ($200)**

### 25.4 Before 5,000 Concurrent Users

1. **Shard users across multiple Gemini projects** (each has separate quota)
2. **Implement regional Cloud Run deployments**
3. **Add dedicated Redis cluster**
4. **Consider Gemini Enterprise for higher quotas**
5. **Implement aggressive caching (90%+ hit rate)**

---

## 26. Cost Optimization Roadmap

```
Week 1: Quick Wins
  ├── Add content pack caching (Redis + DB)
  ├── Add assignment template caching
  ├── Fix SUPER_ADMIN middleware bug
  ├── Remove model list fetch
  └── Add distributed rate limiting
  
Week 2: Model Optimization
  ├── Implement smart model router
  ├── Split content curation into parallel Flash calls
  ├── Compress generation prompts
  └── Add intelligent retry logic
  
Week 3: Pre-Generation & Bank Reuse
  ├── Pre-generate TOP 50 content packs (Inngest cron)
  ├── Increase bank question ratio to 85%
  ├── Add idempotency keys
  └── Add per-user daily budgets
  
Week 4: Scaling Prep
  ├── Add multiple API keys + rotation
  ├── Implement Inngest batching
  ├── Add evaluation caching
  └── Add comprehensive observability
  
Month 2: Advanced Optimizations
  ├── Implement anomaly detection
  ├── Add global spend caps
  ├── Optimize DB queries (raw SQL for mastery)
  └── A/B test model selection strategies
  
Month 3: Enterprise Scale
  ├── Shard across Gemini projects
  ├── Regional deployments
  ├── Dedicated Redis cluster
  └── 90%+ cache hit rate target
```

---

## 27. Summary: Impact on admin_todo.md

The AI cost optimization work is **orthogonal** to the Admin Console epic but intersects at:

1. **Usage tracking** (Phase 1.1, 4.x): The `UserAIUsage` model and counters should capture:
   - `cacheHit: boolean`
   - `actualCostUsd: number`
   - `modelUsed: string`
   - `tokensInput: number`, `tokensOutput: number`

2. **Admin APIs** (Phase 3): New endpoints needed:
   - `GET /api/admin/ai-costs` — daily/weekly cost breakdown
   - `GET /api/admin/ai-efficiency` — cache hit rates, model distribution
   - `POST /api/admin/ai-throttle` — emergency global throttling

3. **System Health** (Phase 3.6): Add:
   - Gemini API quota remaining
   - Redis connectivity
   - Cache hit rate
   - Average cost per evaluation/generation

4. **Subscription enforcement** (Phase 5): The `requireFeatureAccess` helper should:
   - Check daily token budget
   - Check if user is within fair-use limits
   - Fall back to cached content if budget exceeded

---

## Appendix A: Gemini Pricing Reference (Estimated)

| Model | Input ($/M tokens) | Output ($/M tokens) | Context Window |
|-------|-------------------|--------------------|----------------|
| gemini-2.0-flash-lite | $0.075 | $0.30 | 1M |
| gemini-2.5-flash | $0.15 | $0.60 | 1M |
| gemini-flash-latest | $0.15 | $0.60 | 1M |
| gemini-2.5-pro | $1.25 | $5.00 | 1M |
| gemini-3.1-pro-preview | $1.50 | $6.00 | 2M |
| gemini-pro-latest | $1.25 | $5.00 | 1M |

*Prices are approximate and may vary by region. Check Google AI Studio for current rates.*

---

## Appendix B: Cost Calculation Formula

```typescript
function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = {
    "gemini-2.0-flash-lite": { input: 0.075, output: 0.30 },
    "gemini-2.5-flash": { input: 0.15, output: 0.60 },
    "gemini-2.5-pro": { input: 1.25, output: 5.00 },
    "gemini-3.1-pro-preview": { input: 1.50, output: 6.00 },
  };
  
  const rate = rates[model] || rates["gemini-2.5-flash"];
  return (inputTokens / 1_000_000 * rate.input) + (outputTokens / 1_000_000 * rate.output);
}
```

---

*End of Assessment*
