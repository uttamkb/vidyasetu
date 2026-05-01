# API Contracts

> REST API specification for VidyaSetu  
> All routes require authentication unless marked [PUBLIC]

## Authentication

All routes validate session via `auth()` from `lib/auth.ts`.

```
401 Unauthorized: { "error": "Unauthorized" }
403 Forbidden:    { "error": "Forbidden" }
400 Bad Request:  { "error": "Validation failed", "details": [...] }
500 Server Error: { "error": "Internal server error" }
```

---

## Reviews

### GET /api/reviews/daily

Generate today's Smart Review queue.

**Response:**
```json
{
  "sessionId": "uuid",
  "type": "DAILY_REVIEW",
  "targetDuration": 15,
  "questions": [
    {
      "id": "q-uuid",
      "orderIndex": 0,
      "type": "MCQ",
      "content": {
        "question": "What is the value of (x + y)²?",
        "options": ["x² + y²", "x² + 2xy + y²", "x² - y²", "2x + 2y"]
      },
      "subtopic": {
        "id": "st-uuid",
        "name": "Algebraic Identities"
      }
    }
  ]
}
```

---

## Practice Sessions

### POST /api/sessions

Create a new practice session.

**Request:**
```json
{
  "type": "DAILY_REVIEW | ADAPTIVE | TOPIC_FOCUS | EXAM_SPRINT",
  "topicId": "uuid?",       // required for TOPIC_FOCUS
  "targetDuration": 15      // minutes
}
```

**Response:**
```json
{
  "id": "uuid",
  "type": "DAILY_REVIEW",
  "status": "IN_PROGRESS",
  "startTime": "2026-04-30T10:00:00Z",
  "questions": [...]
}
```

### POST /api/sessions/:id/answer

Submit an answer for the current question.

**Request:**
```json
{
  "questionId": "q-uuid",
  "userAnswer": "B",
  "confidence": 4,          // 1-5, optional
  "timeTaken": 45           // seconds
}
```

**Response:**
```json
{
  "isCorrect": true,
  "correctAnswer": "B",
  "explanation": "(x + y)² expands to x² + 2xy + y² by the distributive property.",
  "nextQuestion": { ... } | null,
  "sessionComplete": false
}
```

### POST /api/sessions/:id/complete

Mark session as complete and update mastery.

**Response:**
```json
{
  "sessionId": "uuid",
  "stats": {
    "totalQuestions": 12,
    "correct": 9,
    "accuracy": 75,
    "avgTimePerQuestion": 52
  },
  "masteryUpdates": [
    { "subtopicId": "st-uuid", "oldScore": 45, "newScore": 62 }
  ]
}
```

---

## AI Tutor

### POST /api/tutor/hint

Request a hint for the current question.

**Request:**
```json
{
  "questionId": "q-uuid",
  "hintLevel": 1,           // 1-3
  "studentAnswer": "A",     // optional (what they tried)
  "sessionId": "uuid"
}
```

**Response:**
```json
{
  "hint": "Think about what happens when you add 7 apples and 3 apples. Do you get 10 squared apples?",
  "hintLevel": 1,
  "misconceptionDetected": "sign_error"
}
```

### POST /api/tutor/explain

Request a full explanation (after answer or on demand).

**Request:**
```json
{
  "questionId": "q-uuid",
  "studentAnswer": "A",
  "isCorrect": false
}
```

**Response:**
```json
{
  "explanation": "The identity (x + y)² = x² + 2xy + y² comes from multiplying (x + y) by itself...",
  "workedExample": "Let x = 2, y = 3. (2 + 3)² = 25. Also, 2² + 2(2)(3) + 3² = 4 + 12 + 9 = 25.",
  "relatedSubtopic": "st-uuid"
}
```

---

## Mastery

### GET /api/mastery

Get full mastery map for the current user.

**Response:**
```json
{
  "subjects": [
    {
      "id": "sub-uuid",
      "name": "Mathematics",
      "chapters": [
        {
          "id": "ch-uuid",
          "name": "Polynomials",
          "topics": [
            {
              "id": "t-uuid",
              "name": "Factorization",
              "subtopics": [
                {
                  "id": "st-uuid",
                  "name": "Factorization by Grouping",
                  "masteryScore": 72,
                  "stability": 14.5,
                  "lastPracticed": "2026-04-28T10:00:00Z",
                  "status": "green"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### GET /api/mastery/readiness

Get exam readiness score.

**Response:**
```json
{
  "readinessScore": 62,
  "trend": "+3",
  "coverage": {
    "totalSubtopics": 750,
    "mastered": 320,
    "inProgress": 180,
    "notStarted": 250
  },
  "weakAreas": [
    { "subtopicId": "st-uuid", "name": "Force and Laws of Motion", "masteryScore": 35 }
  ]
}
```

---

## Diagnostic

### POST /api/diagnostic/start

Start a new diagnostic assessment.

**Response:**
```json
{
  "diagnosticId": "uuid",
  "estimatedDuration": 15,
  "totalQuestions": 25,
  "firstQuestion": { ... }
}
```

### POST /api/diagnostic/:id/answer

Submit diagnostic answer (adaptive — next question depends on this).

**Request:**
```json
{
  "questionId": "q-uuid",
  "userAnswer": "B"
}
```

**Response:**
```json
{
  "isCorrect": true,
  "nextQuestion": { ... } | null,
  "complete": false
}
```

### GET /api/diagnostic/:id/results

Get diagnostic results.

**Response:**
```json
{
  "diagnosticId": "uuid",
  "masteryMap": { ... },
  "strongestSubject": "Mathematics",
  "weakestSubject": "Social Science",
  "recommendedFocus": ["st-uuid-1", "st-uuid-2"]
}
```

---

## Streak

### GET /api/streak

Get current streak status.

**Response:**
```json
{
  "currentStreak": 12,
  "longestStreak": 15,
  "lastStudyDate": "2026-04-29",
  "todayCompleted": false,
  "chain": [
    { "date": "2026-04-18", "completed": true },
    { "date": "2026-04-19", "completed": true }
  ]
}
```

**Note:** Streak is only validated when a `PracticeSession` of type `DAILY_REVIEW` is completed with ≥5 questions answered.
