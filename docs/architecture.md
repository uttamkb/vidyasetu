# VidyaSetu Architecture

> Last Updated: May 2, 2026
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
         │
         ▼
┌─────────────────┐
│  Google Gemini  │
│  AI SDK         │
│  (@google/      │
│  generative-ai) │
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
| `AssignmentEngine` | Generate AI-powered assignments (chapter/semester/full syllabus) | `src/services/assignment-engine.ts` |
| `EvaluationEngine` | AI-grade subjective answers, auto-grade objective answers | `src/services/evaluation-engine.ts` |
| `RecommendationEngine` | Identify weak topics, suggest next steps | `src/services/recommendation-engine.ts` |
| `ContentCurator` | Curate and seed study materials via Gemini | `src/services/content-curator.ts` |
| `Prisma Singleton` | Thread-safe DB client with Neon adapter | `src/lib/db.ts` |

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
auth.edge.ts  [MIDDLEWARE ONLY]
  └── re-exports auth() from authConfig (no Prisma)
```

**Rule:** `middleware.ts` MUST only import from `auth.edge.ts`.

## Database Layer

- **ORM:** Prisma v7 (Wasm-based — requires driver adapter)
- **Adapter:** `PrismaNeon({ connectionString })` — NOT a bare Pool instance
- **Host:** Neon PostgreSQL (serverless, connection pooler enabled)
- **Migrations:** `npx prisma db push` for MVP; migrate dev for production
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
2. `AssignmentEngine.generate(userId, options)` builds prompt with student profile
3. Gemini Flash generates structured JSON assignment
4. Response parsed with Zod → stored in `Assignment` table
5. Frontend renders assignment with question cards

### Submission & Evaluation Flow

1. Student submits answers → `POST /api/submissions`
2. Objective questions → auto-graded immediately
3. Subjective questions → `EvaluationEngine.evaluate()` calls Gemini Pro
4. Results stored in `Submission` with `aiFeedback` and `totalScore`
5. `RecommendationEngine` updates topic mastery based on results

### Leaderboard Flow

1. Weekly cron (or on-demand) → aggregates `Submission.totalScore` per user
2. `LeaderboardEntry` upserted per user/period combination
3. Ranking computed via SQL window function (`ROW_NUMBER() OVER (ORDER BY score DESC)`)

## Technology Decisions

| Decision | Rationale | Tradeoff |
|----------|-----------|----------|
| Next.js 16 App Router | Server components, native streaming, Turbopack speed | Breaking changes from v14; requires `serverExternalPackages` for Prisma |
| Neon PostgreSQL | Serverless scaling, HTTP connections (no TCP cold starts for Prisma Wasm) | Requires connection pooler URL for Prisma adapter |
| Prisma v7 (Wasm) | Type-safe queries, auto-generated client | No binary engines; must use driver adapter; `prisma generate` needs write access to `~/.cache` |
| Google Gemini | Free tier for MVP, `gemini-1.5-flash` is fast + cheap | Requires `@google/generative-ai` SDK |
| Auth.js v5 | First-class Next.js support, Edge-compatible JWT | Three-file pattern required; PrismaAdapter for OAuth |
| No tRPC/GraphQL | REST is sufficient; fewer abstractions | Manual type checking on API boundary |

## Scalability Considerations

- **AI Costs**: Use `gemini-1.5-flash` for hints/feedback; `gemini-1.5-pro` only for evaluation
- **Caching**: Cache AI responses by `(topic, difficulty, questionId)` — target >60% cache hit
- **Leaderboard**: Pre-aggregate scores on submission, not at read time
- **DB Indexes**: All leaderboard and submission queries must use indexed columns

## Security

- Auth.js v5 with Google OAuth (primary) and demo Credentials (MVP testing only)
- All `/api/*` routes validate session via `auth()` from `@/lib/auth`
- AI prompts are parameterized; user content is never string-interpolated directly
- Rate limit target: 30 AI requests/minute per user (implement in API middleware)
- `DATABASE_URL` is server-only — never prefixed with `NEXT_PUBLIC_`

## Known Environment Constraints

| Constraint | Impact | Workaround |
|-----------|--------|-----------|
| `~/.cache` not writable in sandbox | `prisma generate` fails with EPERM | Run in user terminal (not Antigravity terminal) |
| `0.0.0.0` socket bind blocked in sandbox | Cannot run dev server from Antigravity terminal | Use `./build-and-run.sh` in user terminal |
| No outbound network for `npm install` | Some packages can't be installed from Antigravity | User installs manually in their terminal |
