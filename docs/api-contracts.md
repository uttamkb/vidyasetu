# VidyaSetu API Documentation

> REST API specification for the VidyaSetu Learning Platform.  
> All routes require authentication via session cookies unless marked `[PUBLIC]`.

---

## 📚 Core Curriculum

### GET `/api/curriculum`
Returns the full Subject → Chapter → Topic tree for the current student's grade and board.

**Response:**
```json
{
  "curriculum": [
    {
      "id": "uuid",
      "name": "Mathematics",
      "color": "#4F46E5",
      "icon": "calculator",
      "chapters": [
        {
          "id": "uuid",
          "name": "Polynomials",
          "avgMastery": 72,
          "materialCount": 5,
          "topics": [
            {
              "id": "uuid",
              "name": "Factorization",
              "avgMastery": 65,
              "subtopicCount": 3,
              "materialCount": 2
            }
          ]
        }
      ]
    }
  ],
  "grade": "9",
  "board": "CBSE"
}
```

---

## 📖 Study Materials & Smart Notes

### GET `/api/study-materials`
Fetch study materials with optional filtering. Supports Just-In-Time (JIT) AI generation.

**Query Parameters:**
- `topicId`: Filter by specific topic (Triggers JIT AI Smart Notes if empty)
- `chapterId`: Filter by chapter
- `subjectId`: Filter by subject
- `type`: Filter by type (`VIDEO`, `PDF`, `PLATFORM_CONTENT`)
- `q`: Search query for title/description

**Response:**
```json
{
  "materials": [
    {
      "id": "ai-notes-topic-uuid",
      "title": "Laws of Motion — NCERT Smart Notes",
      "description": "Comprehensive AI-generated notes...",
      "type": "PLATFORM_CONTENT",
      "content": "## NCERT Smart Notes\n\n### 📚 Core Concepts\n...",
      "isAIGenerated": true,
      "subject": { "name": "Science", "color": "#..." },
      "chapter": { "name": "Force" },
      "topic": { "name": "Laws of Motion" }
    }
  ],
  "total": 1
}
```

> [!TIP]
> **JIT Generation**: If `topicId` is provided and no materials exist, the system automatically triggers the 7-section AI pipeline to generate NCERT-aligned Smart Notes and seeds practice questions.

---

## 📝 Assignments & Evaluation

### POST `/api/assignments/generate`
Generate a new personalized assignment (Practice Test).

**Request Body:**
```json
{
  "subjectId": "uuid",
  "type": "CHAPTER | SEMESTER | FULL_SYLLABUS | REMEDIAL",
  "difficulty": "EASY | MEDIUM | HARD | MIXED",
  "chapterId": "uuid?",
  "questionCount": 10,
  "timeLimit": 30
}
```

**Response:**
```json
{
  "assignment": {
    "id": "uuid",
    "title": "Mathematics Polynomials Test — Medium",
    "maxMarks": 50,
    "questionCount": 10
  }
}
```

> [!NOTE]
> The generation logic automatically retrieves the student's **School**, **District**, and **State** from their profile to emulate localized examination patterns.

---

## 👤 Profile & Settings

### PATCH `/api/profile`
Update student profile and academic settings.

**Request Body:**
```json
{
  "name": "string",
  "grade": "8-12",
  "board": "CBSE | ICSE | State Board",
  "state": "string",
  "district": "string?",
  "school": "string?",
  "image": "url?",
  "leaderboardOptIn": true
}
```

**Response:**
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "..." }
}
```

### POST `/api/submissions`
Submit an assignment for evaluation.

**Request Body:**
```json
{
  "assignmentId": "uuid",
  "answers": [
    { "questionId": "uuid?", "questionIndex": 0, "userAnswer": "Option B" }
  ],
  "timeTaken": 450
}
```

**Response:**
```json
{
  "success": true,
  "submissionId": "uuid",
  "totalScore": 42,
  "maxMarks": 50,
  "percentageScore": 84,
  "status": "EVALUATED"
}
```

---

## 📈 Progress & Mastery

### GET `/api/progress/mastery`
Returns the complete mastery map with status indicators.

**Response:**
```json
{
  "masteryMap": [
    {
      "name": "Science",
      "chapters": [
        {
          "name": "Laws of Motion",
          "avgMastery": 80,
          "topics": [
            {
              "name": "Inertia",
              "avgMastery": 82,
              "subtopics": [
                {
                  "name": "Concept of Inertia",
                  "masteryScore": 85,
                  "status": "mastered",
                  "totalAttempts": 12,
                  "correctAttempts": 10,
                  "lastPracticed": "2026-05-12T10:00:00Z"
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

### GET `/api/recommendations`
Personalized study recommendations based on weak areas.

**Query Parameters:**
- `mode`: `dashboard` (summary) or `full` (detailed list)

**Response (mode=full):**
```json
{
  "recommendations": [
    {
      "type": "REMEDIAL_ASSIGNMENT",
      "priority": "HIGH",
      "subtopicName": "Friction",
      "reason": "Very low mastery (25%) — practice more",
      "action": "Generate a remedial test on Friction"
    }
  ]
}
```

---

## 🏆 Social & Gamification

### GET `/api/leaderboard`
Retrieve ranked student leaderboard.

**Query Parameters:**
- `period`: `weekly | monthly | all_time`
- `scope`: `all | state | district | school`

**Response:**
```json
{
  "leaderboard": [
    { "rank": 1, "name": "Aditya Singh", "avgScore": 98.2, "isCurrentUser": false }
  ],
  "myRank": { "rank": 42, "avgScore": 84.5, "isCurrentUser": true }
}
```

---

## 🛠️ System & Admin

### GET `/api/admin/users` [ADMIN ONLY]
Paginated, filterable user list.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search by name/email
- `plan`: Filter by subscription plan (FREE/PRO)
- `status`: Filter by subscription status (ACTIVE/EXPIRED)

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Aditya Singh",
      "email": "aditya@example.com",
      "role": "STUDENT",
      "subscriptionPlan": "FREE",
      "subscriptionStatus": "ACTIVE",
      "totalAssignmentsGenerated": 12,
      "totalSubmissions": 45,
      "lastActiveAt": "2026-05-14T10:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### GET `/api/admin/users/:id` [ADMIN ONLY]
Single user detail + activity timeline.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Aditya Singh",
    "email": "aditya@example.com",
    "role": "STUDENT",
    "subscriptionPlan": "FREE",
    "subscriptionStatus": "ACTIVE",
    "subscriptionExpiresAt": null,
    "isActive": true
  },
  "stats": {
    "totalAssignmentsGenerated": 12,
    "totalSubmissions": 45,
    "totalAICalls": 120
  }
}
```

### PATCH `/api/admin/users/:id` [ADMIN ONLY]
Edit user state. Role changes require SUPER_ADMIN.

**Request Body:**
```json
{
  "subscriptionPlan": "PRO",
  "subscriptionStatus": "ACTIVE",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "user": { "id": "uuid", "subscriptionPlan": "PRO" }
}
```

### GET `/api/admin/health-check` [ADMIN ONLY]
System diagnostics. Logs results to `SystemHealthCheck` table.

**Response:**
```json
{
  "database": { "status": "HEALTHY", "latencyMs": 15 },
  "gemini": { "status": "HEALTHY", "latencyMs": 245 },
  "inngest": { "status": "HEALTHY", "latencyMs": 5 },
  "timestamp": "2026-05-14T10:00:00Z"
}
```

### PATCH `/api/admin/feature-gates` [SUPER_ADMIN ONLY]
Toggle platform features.

**Request Body:**
```json
{
  "name": "contentCaching",
  "state": "ON"
}
```

**States:** `OFF` | `SHADOW` | `ON`

### GET `/api/admin/usage` [ADMIN ONLY]
Returns daily AI usage metrics across all users and models.

**Response:**
```json
{
  "usage": [
    {
      "date": "2026-05-13",
      "modelName": "gemini-2.5-pro",
      "type": "EVALUATION",
      "totalCalls": 150,
      "totalTokens": 450000
    }
  ]
}
```

### POST `/api/admin/seed` [ADMIN ONLY]
Manually trigger curriculum or badge seeding. Supports Inngest background workers.

### GET `/api/health` [PUBLIC]
Returns system health, database connectivity, and AI readiness.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-14T10:00:00Z",
  "services": {
    "database": "connected",
    "ai": "ready"
  }
}
```

---

## 💳 Subscription

### How Enforcement Works

Every AI feature call checks subscription status:

1. **Assignment Generation** → `POST /api/assignments/generate`
   - Checks `requireSubscription(userId, "ASSIGNMENT_GENERATION")`
   - FREE: 3/day, 10/month
   - PRO: 50/day, 500/month

2. **Evaluation** → `POST /api/submissions`
   - Checks `requireSubscription(userId, "EVALUATION")`
   - FREE: 10/day
   - PRO: 100/day

**Blocked Response (403):**
```json
{
  "error": "Daily limit reached (3 ASSIGNMENT_GENERATION per day)",
  "code": "DAILY_LIMIT_REACHED"
}
```

**Shadow Mode:** Set `FEATURE_GATES_ENABLED=shadow` to log violations without blocking.

### Profile Subscription Card

`GET /profile` shows:
- Plan badge (FREE/PRO)
- Status (ACTIVE/EXPIRED)
- Usage limits
- Upgrade prompt for FREE users
