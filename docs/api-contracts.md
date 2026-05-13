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
Returns system health, database connectivity, and Inngest client status.
