# VidyaSetu Architecture

> Last Updated: April 30, 2026  
> Status: Draft — aligns with PRODUCT-STRATEGY-V2.md

## Overview

VidyaSetu is a Next.js 15 application that serves as an adaptive learning coach for CBSE Class 9 students. The architecture prioritizes:

1. **Learning loop performance** — Smart Review Queue must generate in <200ms
2. **AI tutor cost efficiency** — Cached explanations, tiered model usage
3. **Schema clarity** — Every table must trace to a learning science concept

## System Context

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  Prisma + Neon  │────▶│   PostgreSQL    │
│   (App Router)  │     │   (Primary DB)  │     │   (Serverless)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Redis (Upstash)│◄────│  SR Engine &    │
│   (Cache/Jobs)  │     │  Session State  │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  LLM Gateway    │
│  (OpenRouter/   │
│   OpenAI)       │
└─────────────────┘
```

## Key Services

| Service | Responsibility | Location |
|---------|---------------|----------|
| `SpacedRepetitionEngine` | Generate daily review queues, update forgetting curves | `src/services/spaced-repetition.ts` |
| `AdaptiveDifficultyEngine` | Select next question based on mastery + session history | `src/services/adaptive-difficulty.ts` |
| `SocraticTutor` | Generate hints, detect misconceptions, produce explanations | `src/services/ai-tutor.ts` |
| `MasteryCalculator` | Aggregate session results into topic-level mastery scores | `src/services/mastery-calculator.ts` |
| `SessionManager` | Track practice session lifecycle, timeout handling | `src/services/session-manager.ts` |

## Data Flow

### Daily Review Flow

1. Student opens dashboard → `GET /api/reviews/daily`
2. `SpacedRepetitionEngine.generateDailyQueue(userId)` reads `UserMastery` rows
3. Engine applies interleaving + retrievability filter → returns `Question[]`
4. Frontend renders `PracticeSession` component
5. Each answer POSTs to `/api/sessions/[id]/answer`
6. `AdaptiveDifficultyEngine` selects next question in real time
7. On session end, `MasteryCalculator` updates `UserMastery` rows

### AI Tutor Flow

1. Student clicks "Stuck?" on a question → `POST /api/tutor/hint`
2. `SocraticTutor.generateHint(context)` builds structured prompt
3. LLM Gateway routes to appropriate model (cached → GPT-4o-mini → GPT-4o)
4. Response is cached by `(questionId, errorPattern, hintLevel)` key
5. Frontend renders inline hint; student can escalate to next hint level

## Technology Decisions

| Decision | Rationale | Tradeoff |
|----------|-----------|----------|
| Next.js App Router | Server components reduce client JS; native streaming for AI | Learning curve for data fetching patterns |
| Neon PostgreSQL | Serverless scaling matches variable student load | Cold start latency; mitigated by connection pooling |
| Redis (Upstash) | SR queue generation needs fast random access to mastery state | Added infrastructure complexity |
| Prisma ORM | Type-safe queries, migration system | Runtime overhead; acceptable for our query patterns |
| No tRPC/GraphQL | REST is sufficient; fewer abstractions to debug | Less type safety on API boundary |

## Scalability Considerations

- **SR Engine**: Pre-compute daily queues via cron job (BullMQ) at 4 AM IST, store in Redis with 24h TTL
- **Question Bank**: Static JSON seed for now; move to CDN when >10k questions
- **AI Costs**: Cache hit target >60% for hints; pre-generate top 50 misconceptions

## Security

- Auth.js v5 with Google OAuth only (no password auth)
- All `/api/*` routes validate session via `auth()`
- AI prompts are parameterized; no user input goes directly into LLM prompt
- Rate limit: 30 requests/minute per user on AI tutor endpoints
