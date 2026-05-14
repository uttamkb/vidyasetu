# Admin Console v2 — Work Breakdown Structure (WBS)

> Epic: Admin Console with RBAC, User Activity Monitoring, Subscription Enforcement, and System Health  
> Status: PLANNING — awaiting Act mode to start  
> Last Updated: 2026-05-13

---

## Legend
- `[BLOCK]` — Must complete before dependent subtasks can start
- `[INLINE]` — Can be done in parallel with other subtasks in the same phase
- `→ verify:` — How to confirm the subtask works

---

## Phase 1: Database Schema & Migration `[BLOCK]`

### 1.1 — UserRole Enum & User Model Extensions
**File:** `prisma/schema.prisma`  
**Goal:** Convert `role` to `UserRole` enum; add subscription, activity, and disable fields.

- [ ] Add `UserRole` enum (`STUDENT`, `ADMIN`, `SUPER_ADMIN`)
- [ ] Replace `role String` with `role UserRole`
- [ ] Add `isActive`, `disabledAt`, `disabledBy`, `disableReason`
- [ ] Add `subscriptionPlan` (FREE | PRO), `subscriptionStatus` (ACTIVE | EXPIRED | TRIAL | CANCELLED), `subscriptionExpiresAt`
- [ ] Add `featureAccess` Json field for per-feature gating
- [ ] Add denormalized activity counters: `totalAssignmentsGenerated`, `totalSubmissions`, `totalAICalls`, `lastActiveAt`
- [ ] Add `createdByAdminId` to track who created/promoted a user (optional audit)
- [ ] Add `@@map` for new models; ensure existing indexes untouched

→ verify: `npx prisma validate` passes; `npx prisma generate` succeeds outside Antigravity terminal

---

### 1.2 — SystemHealthCheck Model
**File:** `prisma/schema.prisma`  
**Goal:** Store historical system health snapshots.

- [ ] Add `SystemHealthCheck` model with: `id`, `service`, `status`, `latencyMs`, `errorMessage`, `checkedAt`
- [ ] Add `@@index([service, checkedAt])`

→ verify: Same as 1.1

---

### 1.3 — Migration Execution
**Goal:** Apply schema changes to database.

- [ ] Run `npx prisma migrate dev --name add_admin_rbac_and_subscription` (user terminal)
- [ ] Run `npx prisma generate` (user terminal)
- [ ] Run `npx prisma db seed` if needed to re-seed curriculum

→ verify: Neon console shows new columns and `system_health_checks` table

---

## Phase 2: Auth Layer — RBAC & Bootstrap `[BLOCK]`

### 2.1 — Extend Session Types
**File:** `src/types/next-auth.d.ts`  
**Goal:** TypeScript knows about `role` as `UserRole`, not just `string`.

- [ ] Update `Session.user.role` type to `"STUDENT" | "ADMIN" | "SUPER_ADMIN"`
- [ ] Update `JWT.role` type to match
- [ ] Add `isActive?: boolean` to session/JWT for edge guard checks

→ verify: `npx tsc --noEmit` passes

---

### 2.2 — Auth.ts — SUPER_ADMIN Bootstrap via OWNER_EMAIL
**File:** `src/lib/auth.ts`  
**Goal:** Auto-promote the owner on first OAuth sign-in.

- [ ] Read `OWNER_EMAIL` from `process.env`
- [ ] In JWT callback OAuth path: if `user.email === OWNER_EMAIL`, set `role = SUPER_ADMIN`
- [ ] In JWT callback OAuth path: all others default to `STUDENT`
- [ ] Update `authorize()` for Credentials demo account: default to `STUDENT` (not hardcoded ADMIN)
- [ ] Ensure `token.isActive` is synced from DB user

→ verify: Sign in with owner email → session shows `role: "SUPER_ADMIN"`; sign in with other email → `role: "STUDENT"`

---

### 2.3 — Auth.Edge.ts — Role in Edge Token
**File:** `src/lib/auth.edge.ts`  
**Goal:** Role is available in middleware for route guards.

- [ ] Confirm `auth.edge.ts` re-exports `auth()` and token includes `role`
- [ ] Add fallback: if `token.role` missing, treat as `"STUDENT"`

→ verify: No Prisma imports; `npx tsc --noEmit` passes

---

### 2.4 — Middleware Route Guards
**File:** `src/lib/auth.config.ts` (authorized callback) or `src/proxy.ts`  
**Goal:** Block non-admin users at the Edge for admin routes.

- [ ] In `authorized()` callback: add check for `/admin*` and `/api/admin*` paths
- [ ] If path is admin and `token.role` is not `ADMIN` or `SUPER_ADMIN` → redirect to `/dashboard`
- [ ] If path is `/admin/admins` (or super-admin-only route) and `token.role !== "SUPER_ADMIN"` → redirect to `/admin`

→ verify: Log in as student → visit `/admin` → redirects to `/dashboard`. Log in as ADMIN → `/admin` loads.

---

### 2.5 — Promote-Admin Script Update
**File:** `src/scripts/promote-admin.ts`  
**Goal:** CLI tool to promote/demote users with role argument.

- [ ] Accept `--role` argument (default `ADMIN`, allow `SUPER_ADMIN`)
- [ ] Accept `--demote` flag to set back to `STUDENT`
- [ ] Print current role before and after change
- [ ] Add validation: cannot demote the `OWNER_EMAIL` user to prevent lockout

→ verify: Run `npx ts-node src/scripts/promote-admin.ts test@example.com --role ADMIN` → user promoted

---

## Phase 3: Admin APIs `[BLOCK]`

### 3.1 — Reusable Admin Guard Helper
**File:** `src/lib/require-admin.ts` (new)  
**Goal:** Centralized admin authorization for all `/api/admin/*` routes.

- [ ] Create `requireAdmin(minRole?: "ADMIN" | "SUPER_ADMIN")` function
- [ ] Reads `auth()` session; checks `role` and `isActive`
- [ ] Returns `{ user }` or throws `NextResponse.json({ error }, { status: 403 })`
- [ ] Also checks `isActive === false` → return 403 even for admins

→ verify: Unit test: mock session with STUDENT → throws 403; with ADMIN → returns user

---

### 3.2 — GET /api/admin/users
**File:** `src/app/api/admin/users/route.ts` (new)  
**Goal:** Paginated, filterable user list for admin table.

- [ ] Require `ADMIN` or `SUPER_ADMIN`
- [ ] Parse query params: `page`, `limit`, `status` (active|disabled), `plan`, `search` (email/name)
- [ ] Query `prisma.user.findMany()` with `where` filters
- [ ] Include activity counters (already on User model after Phase 1)
- [ ] Return `{ users, total, page, totalPages }`
- [ ] Do NOT return `accounts`, `sessions`, or other sensitive relations

→ verify: `curl` with admin cookie → returns paginated list; without cookie → 403

---

### 3.3 — GET /api/admin/users/:id
**File:** `src/app/api/admin/users/[id]/route.ts` (new)  
**Goal:** Single user detail with activity timeline.

- [ ] Require `ADMIN` or `SUPER_ADMIN`
- [ ] Fetch user by id; 404 if not found
- [ ] Include: profile + subscription + counters
- [ ] Aggregate activity timeline: last 30 days of `UserAIUsage`, `Assignment` (count), `Submission` (count)
- [ ] Return structured JSON for timeline chart

→ verify: Valid id → full detail; invalid id → 404; non-admin → 403

---

### 3.4 — PATCH /api/admin/users/:id
**File:** `src/app/api/admin/users/[id]/route.ts` (same as 3.3)  
**Goal:** Admin override of user state.

- [ ] Require `ADMIN` or `SUPER_ADMIN`
- [ ] Accept body: `{ isActive?, subscriptionPlan?, subscriptionStatus?, subscriptionExpiresAt?, disableReason? }`
- [ ] Validate: only `SUPER_ADMIN` can change `role` to/from `ADMIN`/`SUPER_ADMIN`
- [ ] If `isActive` changed to `false`: set `disabledAt = now()`, `disabledBy = adminUser.id`
- [ ] If `isActive` changed to `true`: clear `disabledAt`, `disabledBy`, `disableReason`
- [ ] If `subscriptionExpiresAt` set in past and `subscriptionStatus = ACTIVE` → auto-correct to `EXPIRED`
- [ ] Log audit trail (optional: simple console.log with admin id for now)

→ verify: PATCH body with `isActive: false` → user disabled; attempt login → blocked

---

### 3.5 — PATCH /api/admin/users/:id/features
**File:** `src/app/api/admin/users/[id]/features/route.ts` (new)  
**Goal:** Toggle individual features per user.

- [ ] Require `ADMIN` or `SUPER_ADMIN`
- [ ] Accept body: `{ feature: "ASSIGNMENT_GENERATION" | "EVALUATION" | "AI_TUTOR", isEnabled: boolean }`
- [ ] Read current `featureAccess` JSON, merge change, write back
- [ ] Return updated `featureAccess`

→ verify: Toggle off `ASSIGNMENT_GENERATION` → user can still log in but `/api/assignments/generate` returns 403

---

### 3.6 — GET /api/admin/health-check
**File:** `src/app/api/admin/health-check/route.ts` (new)  
**Goal:** On-demand system health diagnostic.

- [ ] Require `ADMIN` or `SUPER_ADMIN`
- [ ] **DB check**: `prisma.$queryRaw` `SELECT 1` → measure latency
- [ ] **Inngest check**: Call `inngestClient.status()` or similar → measure latency
- [ ] **Gemini check**: Send cheapest possible API call (or just validate API key presence + quick ping) → measure latency
- [ ] **Auth check**: Verify session middleware is responsive (self-referential check)
- [ ] Write result to `SystemHealthCheck` model (async, non-blocking)
- [ ] Return JSON: `{ checks: [{ service, status, latencyMs, error? }] }`

→ verify: All services healthy → all green; simulate DB down → shows DOWN with error

---

## Phase 4: Counter Sync — Wire Activity Tracking `[INLINE]`

### 4.1 — Assignment Generation Counter
**File:** `src/services/assignment-generator.ts`  
**Goal:** Increment `totalAssignmentsGenerated` when assignment created.

- [ ] After successful `prisma.assignment.create()`, also `prisma.user.update()` to increment `totalAssignmentsGenerated`
- [ ] Update `lastActiveAt = now()`

→ verify: Generate assignment → `totalAssignmentsGenerated` increments by 1

---

### 4.2 — Submission Counter
**File:** `src/services/evaluation-engine.ts` or `src/app/api/submissions/route.ts`  
**Goal:** Increment `totalSubmissions` when submission evaluated.

- [ ] After successful evaluation and `prisma.submission.update()` with status `EVALUATED`, increment `totalSubmissions`
- [ ] Update `lastActiveAt = now()`

→ verify: Submit assignment → `totalSubmissions` increments

---

### 4.3 — AI Call Counter
**File:** `src/services/usage-tracker.ts`  
**Goal:** Increment `totalAICalls` alongside `UserAIUsage` tracking.

- [ ] In `trackAIUsage()`, after `upsert` on `UserAIUsage`, also `prisma.user.update()` to increment `totalAICalls`
- [ ] Update `lastActiveAt = now()`

→ verify: Trigger AI evaluation → `totalAICalls` increments

---

## Phase 5: Subscription Enforcement `[BLOCK]`

### 5.1 — Feature Gate Helper
**File:** `src/lib/require-subscription.ts` (new)  
**Goal:** Reusable subscription/feature check for any API route.

- [ ] Create `requireFeatureAccess(user, feature: FeatureName)` function
- [ ] Check `user.isActive` first → throw 403 if disabled
- [ ] Check `user.subscriptionStatus === "ACTIVE"` OR `user.subscriptionPlan === "FREE"` with free limits
- [ ] Check `user.featureAccess?.[feature] !== false`
- [ ] Return `{ allowed: true }` or throw structured error: `{ code: "SUBSCRIPTION_EXPIRED" | "FEATURE_DISABLED" | "ACCOUNT_DISABLED" }`

→ verify: Unit tests for each error code

---

### 5.2 — Enforce in Assignment Generation
**File:** `src/app/api/assignments/generate/route.ts`  
**Goal:** Block non-subscribers from generating assignments.

- [ ] At top of POST handler: call `requireFeatureAccess(user, "ASSIGNMENT_GENERATION")`
- [ ] If blocked → return 403 with `{ code, message }`
- [ ] Free tier: allow limited count (e.g., 3/month) — check `totalAssignmentsGenerated` against limit

→ verify: Free user over limit → 403 with `SUBSCRIPTION_EXPIRED`; PRO user → works

---

### 5.3 — Enforce in Submission/Evaluation
**File:** `src/app/api/submissions/route.ts`  
**Goal:** Block evaluation for expired accounts.

- [ ] At top of POST handler: call `requireFeatureAccess(user, "EVALUATION")`
- [ ] If blocked → return 403

→ verify: Same as 5.2

---

### 5.4 — Enforce in AI Tutor (if applicable)
**File:** Wherever AI tutor endpoint lives  
**Goal:** Block AI tutor for expired accounts.

- [ ] Call `requireFeatureAccess(user, "AI_TUTOR")`

→ verify: Same pattern

---

### 5.5 — Auto-Expiry Cron/Background Job
**File:** `src/inngest/functions.ts` or new `src/inngest/subscription.ts`  
**Goal:** Automatically disable features when subscription expires.

- [ ] Inngest cron function: daily at 00:00 UTC
- [ ] Query users where `subscriptionExpiresAt < now()` AND `subscriptionStatus = "ACTIVE"`
- [ ] Update: `subscriptionStatus = "EXPIRED"`
- [ ] Optionally set `featureAccess` to disable premium features (or rely on `requireFeatureAccess` to check expiry date live)
- [ ] Log count of expired users

→ verify: Run cron manually → expired users updated; verify in admin console their status changed

---

## Phase 6: Admin UI `[INLINE]`

### 6.1 — Admin Layout with Sidebar Navigation
**File:** `src/app/admin/layout.tsx` (update or replace)  
**Goal:** Unified admin shell with navigation.

- [ ] Sidebar with links: Overview, Users, System Health, Admins (SUPER_ADMIN only), Curriculum (existing)
- [ ] Highlight active route
- [ ] Mobile-responsive (hamburger or collapsible)
- [ ] Show current admin user avatar/name in header
- [ ] Logout button

→ verify: Navigate between pages → sidebar highlights correct item; mobile → collapses

---

### 6.2 — Users List Page
**File:** `src/app/admin/users/page.tsx` (new)  
**Goal:** Sortable, filterable table of all users.

- [ ] Fetch from `GET /api/admin/users` with pagination
- [ ] Columns: Avatar+Name, Email, Role, Plan, Status badge, Assignments, AI Calls, Submissions, Last Active, Actions
- [ ] Filters: Status dropdown, Plan dropdown, Search input (debounced)
- [ ] Pagination: Previous/Next, show total count
- [ ] Sorting: Click column headers to sort
- [ ] Row actions: Edit (opens modal), Disable/Enable toggle

→ verify: 50+ users → pagination works; search by email → filters; sort by AI calls → reorders

---

### 6.3 — User Detail Modal/Page
**File:** `src/app/admin/users/[id]/page.tsx` or modal component  
**Goal:** Deep dive into single user.

- [ ] Profile card: name, email, avatar, role, signup date
- [ ] Subscription card: plan, status, expiry date (editable by admin), feature toggles
- [ ] Activity card: total assignments, submissions, AI calls
- [ ] Timeline: bar chart of last 30 days activity (assignments + submissions + AI calls)
- [ ] Actions: Disable/Enable account, Change plan, Reset password (optional)
- [ ] Audit log: show `disabledAt`, `disabledBy`, `disableReason` if applicable

→ verify: Edit subscription expiry → saves via PATCH; toggle feature → saves via PATCH; chart renders

---

### 6.4 — System Health Dashboard
**File:** `src/app/admin/system/page.tsx` (new)  
**Goal:** Real-time-ish system status view.

- [ ] 4 status cards: DB, Inngest, Gemini, Auth — color-coded green/yellow/red
- [ ] Each card shows: current status, last checked time, latency in ms
- [ ] "Run Check Now" button → calls `GET /api/admin/health-check` → refreshes
- [ ] Historical sparkline: last 24h of latency per service (query `SystemHealthCheck`)
- [ ] Error stream: table of recent DOWN/DEGRADED events
- [ ] Auto-refresh every 60 seconds (useSWR or setInterval)

→ verify: All services up → all green; stop DB → shows red with error; sparkline renders

---

### 6.5 — Admins Management Page (SUPER_ADMIN only)
**File:** `src/app/admin/admins/page.tsx` (new)  
**Goal:** SUPER_ADMIN can view and manage other admins.

- [ ] Table of all users with `role = ADMIN` or `SUPER_ADMIN`
- [ ] Show who promoted whom (if `createdByAdminId` tracked)
- [ ] Actions: Promote to ADMIN (from STUDENT), Demote to STUDENT
- [ ] Block: cannot demote the OWNER_EMAIL user
- [ ] Confirmation dialogs for promote/demote

→ verify: SUPER_ADMIN sees page; ADMIN does not see sidebar link or gets 403 if visiting URL directly

---

### 6.6 — Update Existing /admin-console
**File:** `src/app/admin-console/page.tsx`  
**Goal:** Merge or redirect to new unified admin.

- [ ] Option A: Redirect `/admin-console` → `/admin/overview` (AI usage stats become the Overview tab)
- [ ] Option B: Keep `/admin-console` as-is but add nav link to new `/admin`
- [ ] **Decision needed** (default: redirect to maintain single admin entry point)

→ verify: Visit `/admin-console` → redirects to `/admin`

---

## Phase 7: Testing & Validation `[BLOCK]`

### 7.1 — Unit Tests for Guards
**Files:** `src/lib/require-admin.test.ts`, `src/lib/require-subscription.test.ts`  
**Goal:** Auth logic is covered.

- [ ] Test `requireAdmin` with each role (STUDENT, ADMIN, SUPER_ADMIN)
- [ ] Test `requireAdmin` with inactive user
- [ ] Test `requireFeatureAccess` with each error code
- [ ] Test free-tier limit enforcement

→ verify: `npm run test -- src/lib/require-*.test.ts` passes

---

### 7.2 — API Route Tests
**Files:** `src/app/api/admin/**/*.test.ts`  
**Goal:** Admin APIs behave correctly.

- [ ] Test `GET /api/admin/users` — pagination, filtering, search
- [ ] Test `PATCH /api/admin/users/:id` — admin can update; student cannot
- [ ] Test `GET /api/admin/health-check` — returns valid structure
- [ ] Test role escalation protection: ADMIN cannot promote to SUPER_ADMIN

→ verify: `npm run test -- src/app/api/admin` passes

---

### 7.3 — Integration Tests
**Goal:** End-to-end flow works.

- [ ] Sign up as new user → role = STUDENT
- [ ] Log in as owner → role = SUPER_ADMIN
- [ ] Promote user to ADMIN via script or UI
- [ ] Disable user → user cannot access dashboard
- [ ] Expire subscription → user gets 403 on assignment generation
- [ ] Re-enable user + renew subscription → user can generate again

→ verify: Manual walkthrough; document steps in `docs/admin-manual.md` (optional)

---

### 7.4 — Typecheck & Lint
**Goal:** No type errors or lint failures.

- [ ] Run `npm run validate` (typecheck + lint)
- [ ] Fix any errors introduced by schema changes
- [ ] Fix any errors from new files

→ verify: `npm run validate` passes cleanly

---

## Dependency Graph

```
Phase 1 (Schema)
  │
  ├──→ Phase 2 (Auth) ──→ Phase 3 (APIs) ──→ Phase 6 (UI)
  │
  ├──→ Phase 4 (Counters) ──────────────────→ Phase 5 (Enforcement)
  │                                              │
  └──────────────────────────────────────────────┘
                          │
                          └──→ Phase 7 (Tests)
```

**Key rule:** Phase 1 must finish before anything else. Phases 2–5 can progress in parallel once schema is stable. Phase 6 (UI) needs Phase 3 (APIs). Phase 7 is always last.

---

## Estimates

| Phase | Sessions | Complexity |
|-------|----------|------------|
| 1. Schema | 1 | Low |
| 2. Auth | 1 | Medium |
| 3. APIs | 2 | Medium |
| 4. Counters | 1 | Low |
| 5. Enforcement | 1 | Medium |
| 6. UI | 2–3 | Medium-High |
| 7. Tests | 1 | Medium |
| **Total** | **9–10** | |

---

## Ready to Start?

Once you toggle to Act mode, I will begin with **Phase 1.1** (UserRole enum and User model extensions in `prisma/schema.prisma`).
