# Architecture Standards
# Stack: Next.js 16 · Neon PostgreSQL · Prisma v7 · Google Gemini · Auth.js v5 · Tailwind 4

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

### ✅ Tailwind CSS 4

- [ ] Use `@theme` block in CSS for custom tokens, not `tailwind.config.js`
- [ ] Prefer modern CSS features (OKLCH colors, container queries) supported by Tailwind 4
- [ ] Use `cn()` utility from `lib/utils.ts` for conditional class merging
- [ ] Avoid ad-hoc utility bloat; use the design system tokens

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

proxy.ts         → acts as middleware, imports from auth.edge.ts ONLY
```

---

### ✅ Google Gemini AI Integration

- [ ] Use `geminiFlashModels` (cascade starts with `gemini-2.5-flash`) for speed-critical paths
- [ ] Use `geminiProModels` (cascade starts with `gemini-2.5-pro`) for quality-critical paths
- [ ] All prompts are in `src/prompts/` — separated from business logic
- [ ] User input is **never** directly string-interpolated into prompts without sanitization
- [ ] Use `callGemini()` wrapper from `lib/gemini.ts` for automatic cascade and retry
- [ ] Use `parseGeminiJson()` for robust JSON extraction from markdown-fenced AI output
- [ ] AI output is **always** validated with a Zod schema passed to `callGemini()`

---

### ✅ Vitest — Testing Standards (DoD)

- [ ] **Unit Tests**: Every service in `src/services/` must have a corresponding `.test.ts` file
- [ ] **Mocking**: Mock external dependencies (Prisma, Gemini) using `vi.mock()`
- [ ] **Regression**: Run `npm run test` before every commit to ensure existing flows are intact
- [ ] **Coverage**: Aim for 100% coverage on complex business logic (e.g., evaluation engines)

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

## Self-Review Checklist (Consistency)

Before submitting code, check:
1. **Consistency**: Does this follow the same naming conventions as existing files?
2. **Review**: Have I reviewed the code against the "Three-File Pattern" for Auth?
3. **Tests**: Have I added unit tests for new service logic?
4. **Validation**: Does `npm run validate` pass?
5. **Regressions**: Does `npm run test` pass for the entire project?

---

## Common Pitfalls — This Project

| Pitfall | Root Cause | Fix |
|---------|-----------|-----|
| `PrismaClientConstructorValidationError` | Prisma v7 Wasm requires adapter | Use `new PrismaNeon({ connectionString })` |
| `DATABASE_URL` undefined at runtime | Turbopack bundles Prisma before env vars load | Add to `serverExternalPackages` in `next.config.ts` |
| `PrismaClient` in middleware crashing Edge | Middleware is Edge Runtime — no Node.js binary engines | Import `auth.edge.ts` in proxy.ts, never `auth.ts` |
| `prisma generate` EPERM error | macOS sandbox blocks schema-engine writing to `~/.cache` | Run in user's terminal (not Antigravity terminal) |
| Auth `CallbackRouteError` | JWT callback hits DB on every request, not just first sign-in | Only sync DB when `user` is populated (first sign-in) |
| Duplicate `callbacks` in spread config | `...authConfig` callbacks overwritten silently | One source of truth per callback: config for edge, auth.ts for node |
