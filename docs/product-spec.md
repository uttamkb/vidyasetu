# VidyaSetu Product Specification

> Derived from PRODUCT-STRATEGY-V2.md  
> Audience: Engineers implementing features

## Problem Statement

Students of any class/grade study alone with textbooks and scattered YouTube videos. They:
- Don't know what they don't know (no diagnostic)
- Forget what they learned after a week (no spaced repetition)
- Get stuck and stay stuck (no tutor)
- Can't tell if they're exam-ready (no progress signal)

## Solution

VidyaSetu is a cognitive coach that:
1. **Diagnoses** knowledge gaps via adaptive assessment
2. **Schedules** daily review sessions using spaced repetition
3. **Teaches** via a Socratic AI tutor (hints, not answers)
4. **Tracks** mastery at the subtopic level (750+ nodes per grade)
5. **Predicts** exam readiness with a single score

## User Journey

### Onboarding (Day 0)
1. Google OAuth sign-in → auto-create profile
2. Select grade and board (e.g., CBSE Class 9, ICSE Class 10)
3. Immediate diagnostic test (15 min, all subjects for that grade, adaptive)
4. View Mastery Map — colored grid of all topics for your grade
5. Set daily study time preference

### Daily Loop (Day 1+)
1. Notification at preferred time: "Your Daily Review is ready. 12 min today."
2. Open app → see today's 8-12 question queue (interleaved subjects)
3. Answer each question; if wrong, see remediation flow
4. If stuck, use "Ask Tutor" for tiered hints
5. Finish → see session summary + updated Mastery Map

### Weekly Loop (Saturday)
1. "Exam Readiness Sprint" — 20 min full-coverage assessment
2. Score feeds into readiness predictor
3. Weekly Insight Card: "You mastered X topics. Focus on Y next week."

## Core Entities

| Entity | Definition | Example |
|--------|-----------|---------|
| **Subject** | CBSE subject | Mathematics |
| **Chapter** | NCERT chapter | Polynomials |
| **Topic** | Chapter section | Factorization |
| **Subtopic** | Specific skill | Factorization by grouping |
| **Question** | Assessable item | MCQ/short answer/numeric |
| **PracticeSession** | A study session | Daily Review, Topic Focus, Exam Sprint |
| **UserMastery** | Student's state on a subtopic | score, stability, last practiced |

## Out of Scope

- School/teacher features
- Social features (groups, leaderboards, forums)
- Video library as primary content
- Subscription paywalls
- Parent dashboard
- Content scraping/aggregation

## Success Criteria

- 80% diagnostic completion within 24h of signup
- 50% Day-7 retention
- 40% tutor engagement on incorrect answers
- 75% accuracy on 7-day spaced repetition questions
