# Definition of Done (DoD) Checklist

Every task performed by the **Senior Architect** must satisfy the following criteria before being considered complete.

## 1. Architectural Integrity
- [ ] Changes adhere to the `architecture-standards.md`.
- [ ] No circular dependencies introduced.
- [ ] Proper separation of concerns (API handlers vs. Services vs. Prompts).
- [ ] Auth patterns strictly follow the "Three-File Pattern" (Edge vs. Node).

## 2. Code Quality & Consistency
- [ ] **Self-Review**: The generated code has been reviewed against the architecture standards.
- [ ] **Simplicity First**: Minimum code that solves the problem. No speculative abstractions.
- [ ] **Surgical Changes**: Touched only what was necessary. No unrelated refactoring or formatting.
- [ ] **Strict Typing**: No `any` types used; Zod schemas define all boundary data.
- [ ] **Error Handling**: Try/catch blocks with typed responses and logging are present.
- [ ] **Performance**: No N+1 queries; AI calls use the standard cascade/retry logic.

## 3. Testing & Validation
- [ ] **Unit Tests**: New logic in `services/` or `lib/` has corresponding Vitest unit tests.
- [ ] **No Regressions**: `npm run test` passes for the entire suite (or relevant affected modules).
- [ ] **Type Safety**: `npm run typecheck` (part of `npm run validate`) passes.
- [ ] **Linting**: `npm run lint` (part of `npm run validate`) passes.

## 4. Documentation
- [ ] New environment variables are documented in `.env.example`.
- [ ] Complex logic is explained with inline comments (JSDoc style).
- [ ] Schema changes are reflected in `docs/db-schema.md` (if applicable).

## 5. User Review
- [ ] A `walkthrough.md` artifact is created/updated summarizing the changes.
- [ ] UI changes (if any) are demonstrated with screenshots or recordings.
