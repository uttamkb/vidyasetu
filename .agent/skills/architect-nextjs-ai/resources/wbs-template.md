# Work Breakdown Structure Template

> Copy this file for each new feature. Fill in every section.
> Leave Phase N/A if it doesn't apply to this feature.

---

## Feature: [FEATURE NAME]

| | |
|-|-|
| **Date** | [DATE] |
| **Author** | [AUTHOR] |
| **Status** | `Draft` \| `In Progress` \| `Review` \| `Done` |
| **Skill** | `.agent/skills/architect-nextjs-ai/SKILL.md` |

---

## Summary

<!-- One paragraph: what this feature does, why it exists, which user story it fulfills -->

---

## Phase 1 — Schema Design & Migration

> **Gate:** No API or UI work starts until schema is reviewed and pushed.

| Task | Detail | Status |
|------|--------|--------|
| Define Prisma model(s) | List all new tables + fields | ☐ |
| Add relations + `onDelete` policy | Cascade or Restrict for each FK | ☐ |
| Add `@@index` for query fields | Cover all `WHERE` + `ORDER BY` columns | ☐ |
| Run `npx prisma db push` | Verify DB synced | ☐ |
| Seed test data | Update `prisma/seed.ts` | ☐ |

**New Prisma Models:**
```prisma
// Paste model definitions here
```

**Index Rationale:**
<!-- Why each index was chosen, which queries it serves -->

---

## Phase 2 — Core API / Server Actions

> **Pattern:** Auth guard → Zod validation → Service call → Typed response

| Route | Method | Auth | Input Schema | Status |
|-------|--------|------|-------------|--------|
| `/api/...` | POST | Required | `XSchema` | ☐ |

**Input Validation (Zod):**
```typescript
const RequestSchema = z.object({
  // define fields here
});
type Request = z.infer<typeof RequestSchema>;
```

**Response Type:**
```typescript
type SuccessResponse = {
  // define shape here
};
```

**Service location:** `src/services/[service-name].ts`

**Business logic description:**
<!-- What the service does step-by-step, no code yet -->

---

## Phase 3 — AI Integration Service Layer

> **Rule:** Prompts in `src/prompts/`. AI calls in `src/services/`. Zod-validated output.

| Task | Model | Prompt File | Cached? | Cache Key | Status |
|------|-------|------------|---------|-----------|--------|
| | `flash` / `pro` | `src/prompts/...` | Yes / No | `(field1, field2)` | ☐ |

**Prompt Template Location:** `src/prompts/[name].ts`

**Output Zod Schema:**
```typescript
const AIOutputSchema = z.object({
  // validate every AI output field
});
```

**Fallback Behavior:**
<!-- What happens when AI call fails, times out, or returns malformed JSON -->

**Estimated Cost:**
<!-- Approx tokens per call × expected call frequency -->

---

## Phase 4 — UI & State Management

> **Rule:** Server Components fetch data. Client Components receive data as props.

| Component | Type | Data Source | Status |
|-----------|------|------------|--------|
| `[Name]Page` | Server Component | API route / direct Prisma | ☐ |
| `[Name]Client` | Client Component (`"use client"`) | Props from parent | ☐ |
| `[Name]Skeleton` | Server Component | — (loading state) | ☐ |

**Loading state:** `<Suspense fallback={<[Name]Skeleton />}>`

**Error state:**
<!-- What the user sees when the API call fails -->

**Empty state:**
<!-- What renders when there's no data yet (new user, no submissions, etc.) -->

---

## Phase 5 — Validation & Testing

> **Gate:** Zero `tsc --noEmit` errors before marking any phase Done.

| Scenario | Expected Result | Status |
|----------|----------------|--------|
| Happy path (valid input, logged in) | 200 with correct data | ☐ |
| Unauthenticated request | 401 Unauthorized | ☐ |
| Invalid input (fails Zod) | 400 with field-level errors | ☐ |
| Database error | 500, user sees friendly message | ☐ |
| AI call fails / times out | Graceful fallback, no unhandled exception | ☐ |
| AI returns malformed JSON | `JSON.parse` caught, fallback applied | ☐ |
| Rate limit exceeded | 429, user sees retry message | ☐ |

**TypeScript:** `npx tsc --noEmit` → ☐ Zero errors

**Manual end-to-end flow:**
<!-- Describe the exact click path to verify the feature works -->

---

## Definition of Done

- [ ] `npx tsc --noEmit` — zero errors
- [ ] All API routes: typed response on success AND error paths
- [ ] Prisma schema: indexes defined, FK `onDelete` set, no JSONB in `WHERE`
- [ ] AI prompts: parameterized, Zod-validated output, try-catch on parse
- [ ] `middleware.ts` imports `auth.edge.ts` only (not `auth.ts`)
- [ ] No Server-only imports (`prisma`, `gemini`) in `"use client"` files
- [ ] Happy path + all error scenarios tested manually
- [ ] Feature documented in `docs/` if it changes architecture

---

## Open Questions

<!-- Questions that need answers before or during implementation -->

1.
2.

## Dependencies & Risks

| Item | Risk Level | Mitigation |
|------|-----------|-----------|
| | Low / Med / High | |
