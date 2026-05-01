# Code Review Skill

## Overview
This skill enables the Agent to perform comprehensive code reviews for the VidyaSetu project, ensuring code quality, consistency, and best practices.

## Capabilities

### 1. Code Quality Analysis
- **TypeScript Type Safety**: Verify proper typing, avoid `any` types, use interfaces/types
- **ESLint Compliance**: Check for linting errors and warnings
- **Code Style**: Ensure consistency with project conventions (Prettier, naming conventions)
- **Complexity Analysis**: Identify overly complex functions that need refactoring

### 2. Security Review
- **Input Validation**: Verify Zod schemas for user input
- **Authentication Checks**: Ensure protected routes require authentication
- **SQL Injection Prevention**: Verify Prisma usage (parameterized queries)
- **XSS Prevention**: Check for proper escaping in React components
- **Environment Variables**: Ensure sensitive data is not hardcoded

### 3. Performance Review
- **React Optimization**: Check for unnecessary re-renders, proper use of useMemo/useCallback
- **Database Queries**: Identify N+1 queries, missing indexes, inefficient Prisma queries
- **Bundle Size**: Flag large imports, suggest code splitting
- **Image Optimization**: Verify use of Next.js Image component

### 4. Accessibility Review
- **ARIA Labels**: Check for proper accessibility attributes
- **Keyboard Navigation**: Verify focus management and keyboard support
- **Color Contrast**: Ensure WCAG compliance for text readability
- **Semantic HTML**: Proper use of HTML5 elements

### 5. Best Practices
- **Error Handling**: Proper try-catch blocks, error boundaries
- **Testing Coverage**: Verify unit tests exist for critical functionality
- **Documentation**: Check for proper JSDoc comments and README updates
- **Git Hygiene**: Meaningful commit messages, proper branching

## Review Process

### Step 1: Static Analysis
```bash
# Run ESLint
npm run lint

# Run TypeScript compiler check
npx tsc --noEmit
```

### Step 2: Manual Code Review Checklist
- [ ] TypeScript types are properly defined
- [ ] No `any` types used without justification
- [ ] Error handling is implemented
- [ ] Input validation with Zod schemas
- [ ] Authentication/authorization checks in place
- [ ] Database queries are optimized
- [ ] Components follow React best practices
- [ ] Accessibility considerations addressed
- [ ] Code is properly documented

### Step 3: Architecture Review
- [ ] Separation of concerns maintained
- [ ] Reusable components extracted
- [ ] Proper use of Next.js App Router patterns
- [ ] Server/Client component boundaries respected

## Output Format

When performing a code review, provide:

1. **Summary**: Overall assessment of code quality
2. **Critical Issues**: Security vulnerabilities, bugs, breaking changes
3. **Warnings**: Performance concerns, code smells, maintainability issues
4. **Suggestions**: Minor improvements, style enhancements
5. **Positive Feedback**: Well-implemented patterns, good practices

## Example Review Output

```markdown
## Code Review Summary

### ✅ Positive Observations
- Good use of TypeScript interfaces
- Proper error boundaries implemented
- Zod validation schemas for forms

### 🚨 Critical Issues
1. **Security**: Missing authentication check on `/api/assignments` route
2. **Bug**: Potential null reference in `useEffect` dependency array

### ⚠️ Warnings
1. **Performance**: N+1 query pattern detected in user progress loading
2. **Maintainability**: Large component (>200 lines) should be split

### 💡 Suggestions
1. Consider using `useMemo` for expensive calculations
2. Add JSDoc comments for complex functions
```

## Integration with CI/CD

This skill can be integrated into GitHub Actions or other CI/CD pipelines to automatically review pull requests.

## Commands

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint for code quality |
| `npx tsc --noEmit` | TypeScript type checking |
| `npm run build` | Build verification |