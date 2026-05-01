# Fix Error Skill

## Overview
This skill provides a systematic workflow for identifying, debugging, and resolving runtime and build errors in the VidyaSetu application.

## Resolution Workflow

### 1. Error Identification
- **Build Errors**: Analyze `npm run build` or `next build` output. Look for TypeScript type mismatches, missing modules, or linting failures.
- **Runtime Errors (Server)**: Check terminal logs for Next.js API routes or Server Actions. Look for Prisma exceptions (P2002, P2025, etc.), 500 status codes, or environment variable issues.
- **Runtime Errors (Client)**: Request browser console logs or use `execute_command` to run tests that simulate client behavior.

### 2. Context Gathering
- **Locate Source**: Find the exact file and line number.
- **Check State**:
  - Verify `DATABASE_URL` and other secrets in `.env.local`.
  - Validate database schema using `npx prisma validate`.
  - Check database sync state using `npx prisma db push --dry-run`.
- **Trace Dependencies**: Identify related services, hooks, or API endpoints.

### 3. Debugging Strategies
- **Isolation**: Create a minimal reproduction script (e.g., `src/scripts/repro-error.ts`) and run it using `npx tsx`.
- **Logging**: Inject `console.log` or `console.error` with structured data (`JSON.stringify`) to trace execution flow.
- **Validation**: Use `zod` schemas to validate incoming API data or DB records.

### 4. Common Fix Patterns
- **Schema Out of Sync**: 
  1. `npx prisma db push --accept-data-loss` (if in dev)
  2. `npx prisma generate`
- **Stale Cache**:
  1. `rmdir /s /q .next` (Windows) or `rm -rf .next` (Unix)
  2. Restart `npm run dev`
- **Missing Environment Variables**: 
  - Ensure `.env.local` contains all keys defined in `lib/env.ts` or required by services.
- **Type Errors after Overhaul**:
  - Update interfaces in `src/types/`.
  - Fix component props and API response mappings.

### 5. Verification
- **Test Fix**: Run the specific file's test (e.g., `node --test src/services/xyz.node.test.ts`).
- **Smoke Test**: Run `npm run build` followed by `npm run dev`.
- **Validation**: Ensure no regressions in related UI components.

## Command Cheat Sheet

| Task | Command |
|------|---------|
| Clear Next.js Cache | `rmdir /s /q .next` |
| Sync DB & Generate | `npx prisma db push && npx prisma generate` |
| Run Isolated Test | `node --test path/to/file.node.test.ts` |
| Deep Type Check | `npx tsc --noEmit` |
| Kill Rogue Port | `taskkill /F /IM node.exe` or `netstat -ano \| findstr :3000` |

## Best Practices
- **Do no harm**: Before changing schema, verify if a code-level mapping fix is safer.
- **Conservative Estimates**: If fixing a data estimation error, anchor values in realistic ranges (e.g., mastery 20-80).
- **Idempotency**: Ensure fix scripts or seeds can be run multiple times without duplication.
