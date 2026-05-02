# Architecture Standards
# Stack: Next.js 16 · Neon PostgreSQL · Prisma v7 · Google Gemini · Auth.js v5

---

## Pre-Task Review Checklist

Run the relevant sections before implementing any feature.

---

### ✅ Database (PostgreSQL via Neon + Prisma v7)

- [ ] New tables have `@id @default(uuid())`, `createdAt`, `updatedAt`
- [ ] Every foreign key has an explicit `onDelete` policy (`Cascade` or `Restrict`)
- [ ] High-read query columns have `@@index([field])` defined in schema
- [ ] No `Json` (JSONB) fields in `WHERE` clauses on hot paths — use typed columns
- [ ] No N+1 queries — use `include` + `select` to fetch only required relations
- [ ] Multi-step mutations use `prisma.$transaction([...])`, not sequential `await` calls
- [ ] `npx prisma generate` run after any schema change
- [ ] `PrismaNeon({ connectionString })` used — NOT `new Pool()` passed as adapter

**Correct Prisma singleton pattern:**
```typescript
// src/lib/db.ts
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("[db] DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

### ✅ Next.js App Router (v16 + Turbopack)

- [ ] All `import { prisma }` calls are in Server Components, API routes, or server actions ONLY
- [ ] Client Components have `"use client"` at the top — no server-only imports
- [ ] `next.config.ts` has `serverExternalPackages` for Prisma/Neon (prevents Turbopack bundling them before env vars load):

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@neondatabase/serverless",
    "@prisma/adapter-neon",
  ],
};
```

- [ ] AI streaming uses `ReadableStream` — never buffer entire AI response in memory
- [ ] Server Components fetch data directly; Client Components receive data as props
- [ ] `<Suspense>` with skeleton components for async Server Component boundaries

---

### ✅ Auth.js v5 — Three-File Pattern

This is the **most critical** architectural constraint. Violating it causes runtime crashes.

```
auth.config.ts   → EDGE-SAFE
  • Providers (Google OAuth, Credentials stub)
  • JWT callback: reads token only — NO database calls
  • Session callback: shapes session for client
  • Authorized callback: route guard logic

auth.ts          → NODE-ONLY (imports Prisma — never use in middleware)
  • PrismaAdapter for OAuth account/user persistence
  • Credentials: real authorize() with DB upsert
  • JWT callback: DB sync on first sign-in ONLY (when `user` is populated)

auth.edge.ts     → MIDDLEWARE ENTRY POINT
  • Re-exports `auth` from authConfig only
  • No Prisma, no Node.js-only imports

middleware.ts    → imports from auth.edge.ts ONLY
```

**Correct JWT callback pattern:**
```typescript
// auth.ts — DB sync only on first sign-in
async jwt({ token, user, trigger, session }) {
  if (user) {
    // `user` is only populated on initial sign-in — sync DB here
    const dbUser = await prisma.user.upsert({ ... });
    token.id = dbUser.id;
    token.isOnboarded = dbUser.isOnboarded;
  }
  // Subsequent requests: token already has the data — no DB call needed

  if (trigger === "update" && session?.isOnboarded !== undefined) {
    token.isOnboarded = session.isOnboarded;
  }
  return token;
},
```

---

### ✅ Google Gemini AI Integration

- [ ] `gemini-1.5-flash` for speed-critical paths: hints, quick feedback, formatting
- [ ] `gemini-1.5-pro` for quality-critical paths: subjective evaluation, content generation
- [ ] All prompts are in `src/prompts/` — separated from business logic
- [ ] User input is **never** directly string-interpolated into prompts without sanitization
- [ ] All LLM JSON output parsed with `JSON.parse(text.trim())` inside try-catch
- [ ] Cache key defined for repeatable prompts: `(topic, questionId, difficulty, hintLevel)`
- [ ] Rate limit enforced: 30 AI requests/minute per user

**Correct Gemini client pattern:**
```typescript
// src/lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const globalForGemini = globalThis as unknown as {
  gemini: GoogleGenerativeAI | undefined;
};

export const gemini =
  globalForGemini.gemini ??
  new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

if (process.env.NODE_ENV !== "production") globalForGemini.gemini = gemini;

export const flashModel = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
export const proModel   = gemini.getGenerativeModel({ model: "gemini-1.5-pro" });
```

**Correct AI service pattern:**
```typescript
// src/services/evaluation-engine.ts
import { proModel } from "@/lib/gemini";
import { EvaluationResultSchema } from "@/types/evaluation";

export async function evaluateAnswer(context: EvaluationContext): Promise<EvaluationResult> {
  const prompt = buildEvaluationPrompt(context); // from src/prompts/

  try {
    const result = await proModel.generateContent(prompt);
    const text = result.response.text().trim();
    const raw = JSON.parse(text);
    return EvaluationResultSchema.parse(raw); // Zod validation
  } catch (err) {
    console.error("[evaluation-engine] AI evaluation failed:", err);
    throw new Error("Evaluation failed — please try again");
  }
}
```

---

## Clean Code Rules

### TypeScript — Strict Typing

```typescript
// ✅ Type all DB query returns
const submission = await prisma.submission.findUniqueOrThrow({
  where: { id },
  include: { assignment: true },
}) satisfies Submission & { assignment: Assignment };

// ✅ Validate AI output with Zod before use
const result = AssignmentSchema.parse(JSON.parse(aiResponse.trim()));

// ❌ Never silence TypeScript with `as any`
const data = response as any; // BAD — find the correct type
```

### API Route Error Handling

Every API route must follow this pattern:

```typescript
// src/app/api/[resource]/route.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({ /* ... */ });

export async function POST(req: Request) {
  try {
    // 1. Auth guard
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Input validation
    const body = await req.json();
    const input = RequestSchema.safeParse(body);
    if (!input.success) {
      return NextResponse.json({ error: input.error.flatten() }, { status: 400 });
    }

    // 3. Business logic (in src/services/)
    const result = await myService.execute(session.user.id, input.data);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[api/resource] POST failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Database Transactions

```typescript
// ✅ Multi-step mutations in a transaction
const [submission, _mastery] = await prisma.$transaction([
  prisma.submission.create({ data: submissionData }),
  prisma.userMastery.upsert({
    where: { userId_topicId: { userId, topicId } },
    update: { masteryScore: newScore },
    create: { userId, topicId, masteryScore: newScore },
  }),
]);

// ❌ Sequential awaits for related mutations
const submission = await prisma.submission.create({ ... }); // BAD
await prisma.userMastery.update({ ... }); // Not atomic
```

---

## File & Folder Conventions

```
src/
├── app/
│   ├── api/                  # Route handlers (server only, never 'use client')
│   │   └── [resource]/
│   │       └── route.ts      # Auth guard + validation + service call
│   ├── (dashboard)/          # Protected group — auth checked in layout.tsx
│   └── (auth)/               # Login, signup pages
├── components/
│   └── ui/                   # shadcn primitives (never add business logic here)
├── lib/
│   ├── auth.ts               # NODE-ONLY — PrismaAdapter + DB callbacks
│   ├── auth.config.ts        # EDGE-SAFE — providers + pure callbacks
│   ├── auth.edge.ts          # MIDDLEWARE — re-exports auth from authConfig
│   ├── db.ts                 # Prisma singleton (Node only)
│   └── gemini.ts             # Gemini AI client singleton (Node only)
├── services/                 # Business logic — pure functions, no HTTP concerns
├── prompts/                  # AI prompt builders — return strings, no AI calls
└── types/                    # Zod schemas + TypeScript types
```

---

## Common Pitfalls — This Project

| Pitfall | Root Cause | Fix |
|---------|-----------|-----|
| `PrismaClientConstructorValidationError` | Prisma v7 Wasm requires adapter | Use `new PrismaNeon({ connectionString })` |
| `DATABASE_URL` undefined at runtime | Turbopack bundles Prisma before env vars load | Add to `serverExternalPackages` in `next.config.ts` |
| `PrismaClient` in middleware crashing Edge | Middleware is Edge Runtime — no Node.js binary engines | Import `auth.edge.ts` in middleware, never `auth.ts` |
| `prisma generate` EPERM error | macOS sandbox blocks schema-engine writing to `~/.cache` | Run in user's terminal (not Antigravity terminal) |
| Auth `CallbackRouteError` | JWT callback hits DB on every request, not just first sign-in | Only sync DB when `user` is populated (first sign-in) |
| Google Fonts build failure | Sandbox blocks outbound network in `npm run build` | Only affects builds; dev server works fine |
| Duplicate `callbacks` in spread config | `...authConfig` callbacks overwritten silently | One source of truth per callback: config for edge, auth.ts for node |
