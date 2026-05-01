# Coding Standards

## TypeScript

- **Strict mode enabled** — no `any` without `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + comment explaining why
- **Explicit return types** on all exported functions
- **No `ts-ignore`** — use `ts-expect-error` with a reason comment

## File Organization

```
src/
  app/                    # Next.js App Router
    api/                  # API routes
    (dashboard)/          # Route groups
  components/
    ui/                   # shadcn/ui components (auto-generated)
    practice/             # Domain-specific components
    tutor/                # AI tutor components
  lib/
    db.ts                 # Prisma singleton
    auth.ts               # Auth.js config
    utils.ts              # cn() and helpers
  services/               # Business logic (no React)
    spaced-repetition.ts
    adaptive-difficulty.ts
    ai-tutor.ts
    mastery-calculator.ts
  types/                  # Shared TypeScript types
  __tests__/              # Unit + integration tests
```

## API Routes

- Use `auth()` to validate session at the top of every route handler
- Return Zod-validated JSON; never return raw Prisma objects
- Handle errors with consistent shape: `{ error: string, code?: string }`

```typescript
// Good
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await req.json();
  const parsed = createQuestionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  
  // ... business logic
  return NextResponse.json({ data: result });
}
```

## Database Access

- Use `prisma` singleton from `lib/db.ts`
- Wrap mutations in transactions when affecting multiple tables
- Prefer `findUnique` over `findFirst` when querying by unique key

## Component Patterns

- Server components by default
- Client components only when using `useState`, `useEffect`, or browser APIs
- Prefix client components with `'use client'`
- Props interfaces named `{ComponentName}Props`

## Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Files | kebab-case | `spaced-repetition.ts` |
| Functions | camelCase | `generateDailyQueue` |
| Components | PascalCase | `PracticeSession` |
| Constants | SCREAMING_SNAKE | `MAX_HINT_LEVEL` |
| Database models | PascalCase | `UserMastery` |
| API routes | kebab-case | `/api/reviews/daily` |

## Testing

- Vitest for unit tests
- Co-locate tests with source or in `__tests__/` directory
- Name pattern: `{module}.test.ts`
- Mock external services (LLM, database) in unit tests
- Use test database (separate Neon branch) for integration tests

## Performance

- Database queries must execute in <100ms (measured in tests)
- AI tutor responses cached by `(questionId, errorPattern, hintLevel)`
- Server components fetch data; client components handle interactivity
- No `n+1` queries — use `include` or batch with `Promise.all`
