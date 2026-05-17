# VidyaSetu Architecture

> Last Updated: May 14, 2026
> Status: Active — reflects current production stack

## Overview

VidyaSetu is a Next.js 16 (App Router) application that serves as an adaptive learning coach for CBSE Class 9 & 10 students. The architecture prioritizes:

1. **Learning loop performance** — Assignment generation and evaluation must complete in <3s
2. **AI cost efficiency** — Gemini Flash for speed paths, Gemini Pro for quality paths
3. **Schema clarity** — Every table must trace to a learning science concept
4. **Edge-safe auth** — Middleware never touches Prisma; Auth.js three-file pattern enforced

## System Context

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 16    │────▶│  Prisma v7 +    │────▶│  Neon Postgres  │
│   (App Router   │     │  Neon Adapter   │     │  (Serverless)   │
│    Turbopack)   │     │  (Wasm engine)  │     └─────────────────┘
└─────────────────┘     └─────────────────┘
         │                       ▲
         ▼                       │
┌─────────────────┐     ┌─────────────────┐
│  Inngest        │────▶│  Background     │
│  (Event Queue)  │     │  Workers        │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Google Gemini  │
│  AI SDK         │
└─────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Auth.js v5 (three files)    │
│  auth.config.ts  → Edge      │
│  auth.ts         → Node      │
│  auth.edge.ts    → Middleware│
└──────────────────────────────┘
```

## Key Services

| Service | Responsibility | Location |
|---------|---------------|----------|
| `AssignmentGenerator` | Generate AI-powered assignments (chapter/semester/full syllabus) | `src/services/assignment-generator.ts` |
| `EvaluationEngine` | AI-grade subjective answers, auto-grade objective answers | `src/services/evaluation-engine.ts` |
| `UsageTracker` | Monitor AI calls, tokens, and costs per user/model | `src/services/usage-tracker.ts` |
| `RecommendationEngine` | Identify weak topics, suggest next steps | `src/services/recommendation-engine.ts` |
| `Prisma Singleton` | Thread-safe DB client with Neon adapter | `src/lib/db.ts` |
| `Logger` | Centralized dual-logging (Console + Database) for observability | `src/lib/logger.ts` |
| `Inngest Client` | Event bus for async tasks (evaluation, generation) | `src/inngest/client.ts` |
| `Constants` | Shared Indian states, subjects, and curriculum metadata | `src/lib/constants.ts` |
| `Cache` | Multi-tier caching (Redis L1 + memory L2) for AI responses | `src/lib/cache.ts` |
| `FeatureGate` | Runtime feature toggles with OFF/SHADOW/ON states | `src/lib/feature-gate.ts` |
| `RequireAdmin` | Centralized admin auth guard with role validation | `src/lib/require-admin.ts` |
| `RequireSubscription` | Subscription enforcement with shadow mode | `src/lib/require-subscription.ts` |
| `FeatureGate` | Runtime feature toggles with OFF/SHADOW/ON states | `src/lib/feature-gate.ts` |

## Auth Architecture — Three-File Pattern

This is the most critical architectural constraint in the project:

```
auth.config.ts
  ├── Providers: Google OAuth, Credentials (stub)
  ├── JWT callback: reads token only (no DB)
  ├── Session callback: shapes client session
  └── Authorized callback: route guard logic
  ↓ (imported by)
auth.ts  [NODE ONLY — never import in middleware]
  ├── PrismaAdapter: OAuth account persistence
  ├── Credentials: real authorize() with DB upsert
  └── JWT callback: DB sync on first sign-in only
  ↓
auth.edge.ts  [EDGE ENTRY]
  └── re-exports auth() from authConfig (no Prisma)
  ↓
proxy.ts      [MIDDLEWARE]
  └── Uses NextAuth v5 wrapper. Handles Route Protection & AI Rate Limiting.
```

**Rule:** `proxy.ts` is the project's middleware. It MUST only import from `auth.edge.ts`.

## Database Layer

- **ORM:** Prisma v7 (Wasm-based — requires driver adapter)
- **Adapter:** `PrismaNeon({ connectionString })` — NOT a bare Pool instance
- **Host:** Neon PostgreSQL (serverless, connection pooler enabled)
- **Migrations:** Automated `npx prisma db push` during Cloud Build pipeline before deploy.
- **Env:** `DATABASE_URL` must be set in `.env.local`

### Critical: `serverExternalPackages`
These packages MUST be in `next.config.ts → serverExternalPackages` to prevent Turbopack
from bundling them (which causes `process.env.DATABASE_URL` to be undefined at runtime):
- `@prisma/client`
- `@neondatabase/serverless`
- `@prisma/adapter-neon`

## Data Flow

### Assignment Generation Flow

1. Student requests assignment → `POST /api/assignments/generate`
2. `AssignmentGenerator.generate(userId, options)` fetches user location (School/District/State) and mastery data.
3. Generator builds prompt with student-specific context (e.g., "Vydehi School of Excellence").
4. AI emulates localized exam patterns using a fallback hierarchy: School → District → State → National.
5. Gemini Flash generates structured JSON → stored in `Assignment` table.
6. Inngest handles background question enrichment if bank-AI split is used.

### Submission & Evaluation Flow

1. Student submits answers → `POST /api/submissions`
2. `EvaluationEngine` triggers Inngest event → `vidyasetu/submission.submitted`
3. Inngest worker picks up job → runs async evaluation cascade (2.5-pro -> 3.1-pro)
4. `UsageTracker` logs model calls and tokens in background
5. Results stored in `Submission` with `aiFeedback` and `totalScore`
6. `RecommendationEngine` updates topic mastery based on results

### Leaderboard Flow

1. Weekly cron (or on-demand) → aggregates `Submission.totalScore` per user
2. `LeaderboardEntry` upserted per user/period combination
3. Ranking computed via SQL window function (`ROW_NUMBER() OVER (ORDER BY score DESC)`)

## Admin Console

Full admin dashboard at `/admin` with role-based access:

| Page | Path | Access | Features |
|------|------|--------|----------|
| Dashboard | `/admin` | ADMIN+ | Stats, overview, quick actions |
| Users | `/admin/users` | ADMIN+ | Paginated table, filters, edit modal |
| System Health | `/admin/system` | ADMIN+ | Live DB/Gemini/Inngest status cards |
| Feature Gates | `/admin/gates` | SUPER_ADMIN | Toggle features OFF/SHADOW/ON |
| Curriculum | `/admin/curriculum` | ADMIN+ | Curriculum tree placeholder |
| Content | `/admin/content` | ADMIN+ | Study materials placeholder |
| Seeder | `/admin/seeder` | ADMIN+ | Background AI engine info |

### Authorization Helpers
- `requireAdmin()` — Allows ADMIN and SUPER_ADMIN, checks `isActive`
- `requireSuperAdmin()` — Strict, only SUPER_ADMIN. Used for role changes and feature gates.

## Subscription System

### Enforcement Flow

```
Student Request → requireSubscription(userId, feature)
  ├── User not found → 403
  ├── Account disabled → 403 (shadow: log only)
  ├── Subscription expired → 403 (shadow: log only)
  ├── Daily limit reached → 403 (shadow: log only)
  ├── Monthly limit reached → 403 (shadow: log only)
  └── Access granted → incrementUsage() → Proceed
```

### Kill Switch

| Env Var | Behavior |
|---------|----------|
| `FEATURE_GATES_ENABLED=shadow` (or unset) | Shadow mode — log only, don't block |
| `FEATURE_GATES_ENABLED=true` | Not used — enforcement is ON by default |

**Rollback:** Set `FEATURE_GATES_ENABLED=shadow` → all blocks stop immediately.

### Plans

| Plan | Assignments/Day | Assignments/Month | Evaluations/Day |
|------|-----------------|-------------------|-----------------|
| FREE | 3 | 10 | 10 |
| PRO | 50 | 500 | 100 |

**Redis counters:** `usage:daily:{userId}:{feature}:{dayKey}` and `usage:monthly:{userId}:{feature}:{monthKey}` with 48h/35d TTL.

## System Observability

VidyaSetu uses a custom "Dual-Logging" framework to balance infrastructure monitoring with admin visibility.

### Logging Strategy (`src/lib/logger.ts`)

1. **Infrastructure Logs (Console)**: Standard `console.log/error` outputs. These are captured by GCP Cloud Logging (Stackdriver) for deep system debugging.
2. **Admin Logs (Database)**: High-value events (AI failures, Inngest triggers, Auth events) are stored in the `SystemLog` table.

**Key Features**:
- **Non-Blocking**: Database logging is performed asynchronously to ensure zero impact on request latency.
- **Structured Metadata**: JSON field for capturing full error stacks or AI prompt/response snippets.
- **Classification**: Logs are categorized by `LogLevel` (INFO, WARN, ERROR, SUCCESS) and `LogCategory` (AI, DB, AUTH, etc.).

### Usage Tracking (`src/services/usage-tracker.ts`)
AI costs are tracked per-user per-day in the `UserAIUsage` table, allowing admins to monitor burn rates and identify high-cost student accounts.

## Technology Decisions

| Decision | Rationale | Tradeoff |
|----------|-----------|----------|
| Next.js 16 App Router | Server components, native streaming, Turbopack speed | Breaking changes from v14; requires `serverExternalPackages` for Prisma |
| Neon PostgreSQL | Serverless scaling, HTTP connections (no TCP cold starts for Prisma Wasm) | Requires connection pooler URL for Prisma adapter |
| Prisma v7 (Wasm) | Type-safe queries, auto-generated client | No binary engines; must use driver adapter; `prisma generate` needs write access to `~/.cache` |
| Google Gemini | Free tier for MVP, Model cascade (2.5, 3.1) ensures reliability | Requires `@google/generative-ai` SDK |
| Auth.js v5 | First-class Next.js support, Edge-compatible JWT | Three-file pattern required; PrismaAdapter for OAuth |
| No tRPC/GraphQL | REST is sufficient; fewer abstractions | Manual type checking on API boundary |

## Scalability Considerations

- **AI Costs**: Use `gemini-2.5-flash` for hints/feedback; `gemini-2.5-pro` only for evaluation
- **Caching**: Multi-tier cache (Redis L1 + memory L2) for content packs, evaluations, and feedback. Target >60% hit rate.
- **Leaderboard**: Pre-aggregate scores on submission, not at read time
- **DB Indexes**: All leaderboard and submission queries must use indexed columns

## Security

- Auth.js v5 with Google OAuth (primary) and demo Credentials (MVP testing only)
- All `/api/*` routes validate session via `auth()` from `@/lib/auth`
- Admin APIs use `requireAdmin()` / `requireSuperAdmin()` for role-based access
- Feature gates enable safe rollout with shadow mode (admin-only preview)
- **Subscription enforcement**: `requireSubscription()` checks plan limits before AI calls
- **Session Sync**: Profile updates (name, image, location) are synced to the browser via Auth.js `update()` and custom JWT callbacks.
- AI prompts are parameterized; user content is never string-interpolated directly
- Rate limit enforced: 30 AI requests/minute per user (implemented in `proxy.ts` middleware)
- `DATABASE_URL` is server-only — never prefixed with `NEXT_PUBLIC_`
- Admin routing: Admins visiting student pages are auto-redirected to `/admin`

## Known Environment Constraints

| Constraint | Impact | Workaround |
|-----------|--------|-----------|
| `~/.cache` not writable in sandbox | `prisma generate` fails with EPERM | Run in user terminal (not Antigravity terminal) |
| `0.0.0.0` socket bind blocked in sandbox | Cannot run dev server from Antigravity terminal | Use `./build-and-run.sh` in user terminal |
| No outbound network for `npm install` | Some packages can't be installed from Antigravity | User installs manually in their terminal |
