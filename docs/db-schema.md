# Database Schema Design

> Prisma schema for VidyaSetu learning platform  
> Principles: every table traces to a learning science concept; no LMS cruft

## Design Decisions

1. **Auth.js models preserved** (`Account`, `Session`, `User`) — required by NextAuth v5
2. **School/Class/Enrollment removed** — premature for student-first product
3. **Content aggregation removed** — quality over quantity; questions are curated
4. **Questions are first-class entities** — not embedded JSON blobs; enables analytics
5. **UserMastery is the brain** — one row per (user, subtopic); indexed for fast queue generation

## Entity Relationship Diagram

```
User ──┬── Account (Auth.js)
       ├── Session (Auth.js)
       ├── UserMastery ──▶ Subtopic ──▶ Topic ──▶ Chapter ──▶ Subject
       ├── PracticeSession ──▶ SessionQuestion ──▶ Question ──▶ Subtopic
       ├── Submission (legacy, readonly) ──▶ Assignment (legacy, readonly)
       ├── StudyStreak
       └── Notification

Question ──▶ Subtopic
```

## Model Reference

### Curriculum Graph

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `Subject` | Board+grade subject | `name`, `grade`, `board` (e.g., "Math", "9", "CBSE") |
| `Chapter` | NCERT chapter | `name`, `orderIndex`, `subjectId` |
| `Topic` | Chapter section | `name`, `orderIndex`, `chapterId` |
| `Subtopic` | Specific skill | `name`, `description`, `difficulty` (1-5), `topicId` |

### User State

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `UserMastery` | Per-subtopic mastery | `masteryScore` (0-100), `stability` (days), `lastPracticed`, `errorPatterns` (JSON) |
| `StudyStreak` | Habit tracking | `currentStreak`, `longestStreak`, `lastStudyDate` (validates actual learning) |

### Learning Content

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `Question` | Assessable item | `type` (MCQ/SHORT_ANSWER/NUMERIC), `bloomLevel`, `difficulty`, `content` (JSON), `commonMisconceptions` |
| `PracticeSession` | Study session | `type` (DAILY_REVIEW/ADAPTIVE/TOPIC_FOCUS/EXAM_SPRINT), `status`, `targetDuration` |
| `SessionQuestion` | Attempt record | `userAnswer`, `isCorrect`, `timeTaken`, `confidence`, `hintsUsed`, `tutorUsed` |

### Legacy (Read-Only Migration)

| Model | Purpose | Fate |
|-------|---------|------|
| `Assignment` | Old weekly assignments | Keep for historical submissions; no new creation |
| `Submission` | Old submission records | Read-only; migrated to `PracticeSession` over time |

## Indexes

```
UserMastery: (userId, subtopicId) UNIQUE, (userId, masteryScore), (userId, lastPracticed)
Question: (subtopicId, difficulty), (subtopicId, bloomLevel)
SessionQuestion: (sessionId, orderIndex)
PracticeSession: (userId, createdAt)
```

## Migrations

- Migration `001_init_mastery_graph`: Creates curriculum + user state tables
- Migration `002_seed_cbse_curriculum`: Seeds all chapters/topics/subtopics for 5 subjects
- Migration `003_migrate_legacy_data`: (Optional) Map old assignments to new question bank

## Data Volume Estimates

| Entity | Count | Row Size |
|--------|-------|----------|
| Subject (per grade) | ~5 | ~100B |
| Subtopic (per grade) | ~750 | ~200B |
| Question (per grade) | ~5,000 | ~2KB |
| UserMastery (per user) | ~750 | ~150B |
| PracticeSession (per user/year) | ~300 | ~200B |
| SessionQuestion (per user/year) | ~3,000 | ~300B |

A student with 1 year of usage: ~1.5MB of user-specific data.

## Multi-Grade Support

- `Subject` is scoped by `(name, grade, board)` — "Mathematics" exists separately for Class 9 CBSE, Class 10 CBSE, Class 9 ICSE, etc.
- `User.grade` and `User.board` determine which curriculum the student sees
- When a student upgrades grade, new `UserMastery` rows are created for the new grade's subtopics; old mastery data is preserved for reference
- Daily Review queries filter by the user's current `grade` and `board` through the Subject relation
