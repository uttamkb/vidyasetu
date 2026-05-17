# Implementation Plan Example
# Feature: Assignment Generation Engine

> This is a filled-in example of `resources/wbs-template.md`.
> Use this as a reference when planning a new feature.

---

## Feature: AI Assignment Generation Engine

| | |
|-|-|
| **Date** | May 2, 2026 |
| **Author** | VidyaSetu Team |
| **Status** | `Done` |
| **Skill** | `.agent/skills/architect-nextjs-ai/SKILL.md` |

---

## Summary

Students can generate personalized practice assignments for any subject, chapter, or difficulty level. The system uses Google Gemini Flash to create structured question sets, stores them in PostgreSQL, and returns them to the student immediately. Assignments are linked to a student's existing mastery data to bias difficulty appropriately.

---

## Phase 1 — Schema Design & Migration ✅

| Task | Detail | Status |
|------|--------|--------|
| Define `Assignment` model | id, title, subjectId, difficulty, questions (Json), userId, createdAt | ✅ |
| Define `Submission` model | id, assignmentId, userId, answers, totalScore, aiFeedback, status | ✅ |
| Add relations + `onDelete` | Assignment → Subject (Restrict), Submission → Assignment (Cascade) | ✅ |
| Add `@@index` | `userId`, `subjectId`, `submittedAt` on Submission | ✅ |
| Run `npx prisma db push` | Schema synced to Neon | ✅ |

**Key Models:**
```prisma
model Assignment {
  id         String      @id @default(uuid())
  title      String
  subject    Subject     @relation(fields: [subjectId], references: [id], onDelete: Restrict)
  subjectId  String
  difficulty String      // "easy" | "medium" | "hard"
  questions  Json        // Array of Question objects
  createdBy  User        @relation(fields: [createdById], references: [id])
  createdById String
  submissions Submission[]
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  @@index([subjectId])
  @@index([createdById])
}

model Submission {
  id           String    @id @default(uuid())
  assignment   Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  assignmentId String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  status       String    @default("PENDING")  // "PENDING" | "SUBMITTED" | "EVALUATED"
  totalScore   Int?
  maxScore     Int?
  aiFeedback   String?
  submittedAt  DateTime  @default(now())

  @@index([userId])
  @@index([assignmentId])
  @@index([userId, submittedAt])
}
```

**Index Rationale:**
- `userId` on Submission: dashboard query filters by user
- `userId, submittedAt` compound: leaderboard and streak queries need both
- `subjectId` on Assignment: subject-filtered browsing

---

## Phase 2 — Core API / Server Actions ✅

| Route | Method | Auth | Input Schema | Status |
|-------|--------|------|-------------|--------|
| `/api/assignments/generate` | POST | Required | `GenerateSchema` | ✅ |
| `/api/assignments` | GET | Required | query params | ✅ |
| `/api/submissions` | POST | Required | `SubmitSchema` | ✅ |

**Input Validation:**
```typescript
const GenerateSchema = z.object({
  subjectId: z.string().uuid(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  scope: z.enum(["chapter", "semester", "full"]),
  chapterId: z.string().uuid().optional(),
  questionCount: z.number().int().min(5).max(30).default(10),
});
```

**Response Type:**
```typescript
type GenerateResponse = {
  assignment: {
    id: string;
    title: string;
    questions: Question[];
    difficulty: string;
    subject: { name: string; color: string };
  };
};
```

**Business Logic:** `src/services/assignment-engine.ts`
1. Validate user owns the subject (or it's a public subject)
2. Fetch user mastery for the subject topics
3. Build prompt with mastery-weighted topic distribution
4. Call Gemini Flash → parse + validate JSON output
5. Store in `Assignment` table
6. Return assignment to client

---

## Phase 3 — AI Integration Service Layer ✅

| Task | Model | Prompt File | Cached? | Cache Key | Status |
|------|-------|------------|---------|-----------|--------|
| Assignment generation | `flash` | `src/prompts/assignment-generation.ts` | No (personalized) | — | ✅ |
| Subjective evaluation | `pro` | `src/prompts/evaluation.ts` | By answer hash | `(questionId, answerHash)` | ✅ |

**Output Zod Schema:**
```typescript
const QuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(10),
  type: z.enum(["mcq", "short", "long"]),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  marks: z.number().int().min(1).max(10),
  topic: z.string(),
});

const AssignmentOutputSchema = z.object({
  title: z.string(),
  questions: z.array(QuestionSchema).min(1),
});
```

**Fallback:** If AI fails, return 503 with `{ error: "Assignment generation unavailable, please retry" }`

**Cost Estimate:** ~800 tokens/call × 50 calls/day = 40k tokens/day on Flash (free tier)

---

## Phase 4 — UI & State Management ✅

| Component | Type | Data Source | Status |
|-----------|------|------------|--------|
| `AssignmentsPage` | Server Component | Direct Prisma query | ✅ |
| `AssignmentGeneratorClient` | Client Component | Form → POST `/api/assignments/generate` | ✅ |
| `AssignmentCard` | Server Component | Props from parent | ✅ |
| `AssignmentsSkeleton` | Server Component | — | ✅ |

**Loading state:** `<Suspense fallback={<AssignmentsSkeleton />}>`

**Error state:** Toast notification with retry button

**Empty state:** "No assignments yet" card with "Generate your first assignment" CTA

---

## Phase 5 — Validation & Testing ✅

| Scenario | Expected Result | Status |
|----------|----------------|--------|
| Happy path — generate assignment | 200 with valid assignment JSON | ✅ |
| Unauthenticated request | 401 Unauthorized | ✅ |
| Invalid subjectId (not UUID) | 400 with Zod field error | ✅ |
| Gemini returns malformed JSON | Caught in try-catch, 503 returned | ✅ |
| DB insert fails | 500 logged, user sees friendly message | ✅ |

**Unit Testing (Vitest):**
- [x] `src/services/assignment-engine.test.ts`: 100% logic coverage
- [x] `src/lib/gemini.test.ts`: Cascade and retry logic verified
- [x] `npm run test` passes for the entire project

**Type Safety:** `npm run typecheck` → ✅ Zero errors

**Manual E2E flow:**
1. Log in with demo account → `/dashboard`
2. Navigate to `/assignments` → click "Generate Assignment"
3. Select subject "Mathematics", difficulty "Medium", scope "Chapter"
4. Verify assignment appears with correct number of questions
5. Submit answers → verify submission stored in DB

---

## Definition of Done ✅

- [x] **Architectural Integrity**: Follows Three-File Pattern for Auth.
- [x] **Strict Typing**: Zod schemas for all boundaries; zero `any` types.
- [x] **Unit Tests**: New logic in `src/services/` has Vitest unit tests.
- [x] **Self-Review**: Code reviewed against `architecture-standards.md`.
- [x] **Validation**: `npm run validate` and `npm run test` pass.
- [x] **No Regressions**: No existing functionality broken.
