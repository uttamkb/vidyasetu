# Unit Test Skill

## Overview
This skill enables the Agent to create, run, and manage unit tests for the VidyaSetu project, ensuring code reliability and preventing regressions.

## Testing Stack

### Primary Testing Framework
- **Jest** - Test runner and assertion library
- **React Testing Library** - For testing React components
- **@testing-library/react** - React-specific testing utilities
- **@testing-library/dom** - DOM testing utilities
- **@testing-library/user-event** - User interaction simulation
- **MSW (Mock Service Worker)** - API mocking for integration tests

### Coverage Tools
- **Istanbul/nyc** - Code coverage reporting
- **Jest Coverage** - Built-in coverage reports

## Testing Guidelines

### 1. Unit Tests
Test individual functions, utilities, and hooks in isolation.

```typescript
// Example: Testing a utility function
import { calculateProgress } from '@/lib/utils';

describe('calculateProgress', () => {
  it('should return 0 when no assignments completed', () => {
    expect(calculateProgress(0, 10)).toBe(0);
  });

  it('should return 100 when all assignments completed', () => {
    expect(calculateProgress(10, 10)).toBe(100);
  });

  it('should calculate percentage correctly', () => {
    expect(calculateProgress(5, 10)).toBe(50);
  });
});
```

### 2. Component Tests
Test React components in isolation with mocked props and context.

```typescript
// Example: Testing a component
import { render, screen } from '@testing-library/react';
import { AssignmentCard } from './AssignmentCard';

describe('AssignmentCard', () => {
  const mockAssignment = {
    id: '1',
    title: 'Math Assignment',
    subject: 'Mathematics',
    dueDate: new Date('2024-01-15'),
    status: 'pending'
  };

  it('should render assignment title', () => {
    render(<AssignmentCard assignment={mockAssignment} />);
    expect(screen.getByText('Math Assignment')).toBeInTheDocument();
  });

  it('should display due date', () => {
    render(<AssignmentCard assignment={mockAssignment} />);
    expect(screen.getByText(/due/i)).toBeInTheDocument();
  });
});
```

### 3. Hook Tests
Test custom React hooks with renderHook.

```typescript
// Example: Testing a custom hook
import { renderHook, act } from '@testing-library/react';
import { useSubmission } from '@/hooks/useSubmission';

describe('useSubmission', () => {
  it('should initialize with empty answers', () => {
    const { result } = renderHook(() => useSubmission());
    expect(result.current.answers).toEqual({});
  });

  it('should add answer when submitting response', () => {
    const { result } = renderHook(() => useSubmission());
    
    act(() => {
      result.current.addAnswer('q1', 'option-a');
    });

    expect(result.current.answers).toEqual({ q1: 'option-a' });
  });
});
```

### 4. Integration Tests
Test API routes and database operations.

```typescript
// Example: Testing an API route
import { GET } from '@/app/api/assignments/route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    assignment: {
      findMany: jest.fn()
    }
  }
}));

describe('GET /api/assignments', () => {
  it('should return all assignments', async () => {
    const mockAssignments = [
      { id: '1', title: 'Test Assignment' }
    ];
    
    (prisma.assignment.findMany as jest.Mock).mockResolvedValue(mockAssignments);

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual(mockAssignments);
  });
});
```

## Test File Structure

### Naming Conventions
- Test files: `*.test.ts` or `*.test.tsx`
- Test directories: `__tests__` or colocated with source files
- Describe blocks: Match component/function names
- Test cases: Use descriptive names starting with "should"

### Directory Structure
```
src/
├── __tests__/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── app/
├── components/
│   ├── AssignmentCard.tsx
│   └── AssignmentCard.test.tsx
├── hooks/
│   ├── useSubmission.ts
│   └── useSubmission.test.ts
└── lib/
    ├── utils.ts
    └── utils.test.ts
```

## Test Commands

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- --testPathPattern=AssignmentCard
```

### Run Tests by Name Pattern
```bash
npm test -- --testNamePattern="should render"
```

## Mocking Strategies

### 1. Mock External Dependencies
```typescript
jest.mock('next/auth', () => ({
  getServerSession: jest.fn()
}));
```

### 2. Mock API Calls
```typescript
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: [] })
  })
) as jest.Mock;
```

### 3. Mock Context Providers
```typescript
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AuthProvider session={mockSession}>
      <ThemeProvider theme="light">
        {component}
      </ThemeProvider>
    </AuthProvider>
  );
};
```

## Coverage Thresholds

Maintain minimum coverage thresholds:
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

## Test Quality Guidelines

### DO's
✅ Test one thing per test case  
✅ Use descriptive test names  
✅ Keep tests independent and isolated  
✅ Mock external dependencies  
✅ Test edge cases and error scenarios  
✅ Use Arrange-Act-Assert (AAA) pattern  

### DON'Ts
❌ Don't test implementation details  
❌ Don't write tests that depend on each other  
❌ Don't mock everything  
❌ Don't skip testing error paths  
❌ Don't write tests that are too complex  

## Continuous Integration

### Pre-commit Hooks
```bash
# Run tests before commit
npm test -- --bail --watchAll=false
```

### CI Pipeline
```yaml
# GitHub Actions example
- name: Run Tests
  run: npm test -- --coverage --watchAll=false

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Debugging Tests

### Debug Specific Test
```bash
npm test -- --runInBand --detectOpenHandles
```

### Verbose Output
```bash
npm test -- --verbose
```

## Test Utilities

Create shared test utilities in `src/__tests__/utils/`:

```typescript
// test-utils.tsx
import { render as rtlRender } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';

export function render(ui, { session, ...options } = {}) {
  function Wrapper({ children }) {
    return (
      <SessionProvider session={session || mockSession}>
        {children}
      </SessionProvider>
    );
  }
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';