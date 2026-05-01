# VidyaSetu — Student-First SaaS Development Roadmap

> **Last Updated:** April 30, 2026
> **Status:** Phase 1 In Progress
> **Core Goal:** Help individual CBSE Class 9 students onboard easily, stay engaged, and scale their academic skills successfully.

---

## 🎯 Product Philosophy: Student-First

VidyaSetu is built for **individual students** first. Schools and teachers are secondary channels that come later. The platform must deliver immediate, tangible value to a student sitting alone at their study desk.

**Success Metric:** A student should feel "I can't study without VidyaSetu" within 7 days of signing up.

---

## 📊 Current State: What's Already Built

### ✅ Infrastructure & Foundation (100% Complete)
- Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- Prisma ORM with Neon PostgreSQL (serverless)
- NextAuth v5 (Auth.js) with Google OAuth + Demo Account
- Database schema: User, Account, Session, Subject, Assignment, Submission, StudyMaterial, Progress, ContentSource, ContentItem, AgentRun, School, Class, Enrollment, Role enum
- Environment configuration (.env/.env.local)
- Build & deployment scripts (build-and-run.bat/.sh)
- Unit testing framework (Vitest)

### ✅ Core Student Features (80% Complete)
- **Authentication**: Google OAuth login, demo account, protected routes
- **Dashboard**: Weekly overview, quick stats, subject cards, upcoming deadlines
- **Assignments**: List view, detail page with questions, submission form, timer
- **Auto-Evaluation**: Instant grading, MCQ evaluation, score breakdown
- **Study Materials**: Curated resources with subject filter
- **Progress & Analytics**: Charts (Recharts), subject-wise performance, streak tracking
- **Profile**: View and edit profile (name, grade, school)

### ✅ Content Aggregation System (70% Complete)
- Web content scraper service
- AI-powered relevance engine
- Content validator
- Content agent with automated curation
- Content management dashboard
- API routes for content operations

### ⚠️ Partially Built / Needs Hardening
- Mock exam mode (mentioned in docs but not fully implemented)
- Gamification (badges, leaderboard, progress levels)
- Auto-generated weekly assignments (seed data exists, but no cron job)
- Email notifications
- Mobile responsiveness audit
- Accessibility compliance (WCAG 2.1 AA)

---

## 🚀 Student-First SaaS Gap Analysis

To become a student-centric SaaS product, VidyaSetu needs these pillars:

### 1. Instant Value & Onboarding
- 30-second signup (Google OAuth + auto profile)
- Immediate first assignment to try the platform
- Interactive tutorial/guided tour
- Personalized dashboard from Day 1

### 2. Engagement & Retention Engine
- Gamification (badges, streaks, levels, daily challenges)
- Push notifications (assignment reminders, streak alerts)
- Weekly progress emails
- Social proof (peer comparison, study buddy system)

### 3. AI-Powered Personal Learning
- AI-generated personalized assignments based on weak areas
- Adaptive difficulty that scales with student performance
- AI Tutor chatbot for instant doubt resolution
- Smart study plan generator
- Auto-summarized notes from study materials

### 4. Content Quality & Discovery
- High-quality CBSE Class 9 content (notes, videos, practice)
- AI-curated daily learning feed
- Bookmarking and personal notes on materials
- Search and filter by topic, difficulty, type

### 5. Progress & Motivation
- Visual progress tracking (subject-wise, topic-wise)
- Strength/weakness analysis with actionable suggestions
- Mock exam simulator with CBSE board pattern
- Exam readiness score predictor
- Parent sharing (optional read-only reports)

### 6. Monetization (Student-Focused)
- **Free Tier**: 3 assignments/week, basic progress, limited materials
- **Pro Tier (₹99/month)**: Unlimited assignments, AI tutor, mock exams, detailed analytics
- **Annual Plan (₹999/year)**: 2 months free, exclusive content, priority support
- No school/institution billing in Phase 1

### 7. Community & Social (Later Phase)
- Study groups
- Peer leaderboard
- Doubt discussion forums
- Challenge friends

### 8. School/Classroom Pack (Phase 3+)
- Only after individual student product is mature
- Teacher dashboard
- Class management
- Bulk student enrollment
- School-wide analytics

---

## 📋 Granular Development Plan

Each task is designed to be completable in a single focused development session (2-4 hours).

---

## PHASE 1: Student Onboarding & Engagement (Weeks 1-2)
**Goal:** Make a student feel "This is exactly what I need" within 5 minutes.

### P1.1: Frictionless Onboarding
- [x] Google OAuth + Demo Account (already done)
- [x] Auto profile creation on first login (already done)
- [x] **Welcome Flow**: After first login, ask 3 questions:
  - Which subjects do you find hardest? (Multi-select)
  - What's your target score in finals? (Slider)
  - When do you usually study? (Time preference)
- [x] **Personalized Dashboard**: Show relevant subjects first, hide easy ones
- [x] **First Assignment**: Auto-generate a "Diagnostic Test" covering all 5 subjects
- [x] **Guided Tour**: Highlight key features with tooltips (React Joyride)

### P1.2: Gamification v1 — Core Loops
- [ ] Add `Badge`, `Achievement`, `UserBadge` models to Prisma
- [ ] Create badge system:
  - **First Steps**: "First Login", "First Assignment", "First Perfect Score"
  - **Consistency**: "3-Day Streak", "7-Day Streak", "30-Day Streak"
  - **Mastery**: "Math Whiz", "Science Star", "All-Rounder"
  - **Speed**: "Quick Thinker" (finish under time), "Night Owl" (study after 9pm)
- [ ] Build badge notification popup (celebration animation)
- [ ] Add progress levels: Beginner → Scholar → Topper → Board Ready
- [ ] Display level progress bar in dashboard header
- [ ] Create weekly challenges (e.g., "Complete 5 assignments this week")

### P1.3: Streak & Habit Tracker
- [ ] Add `studyStreak` to User model (already in Progress model)
- [ ] Build streak calendar UI (GitHub-style contribution graph)
- [ ] Implement streak logic:
  - Streak increases when student submits any assignment
  - Streak resets if missed for 2 consecutive days
  - Streak freeze token (watch ad or share to restore)
- [ ] Add streak reminder push notifications
- [ ] Display "Current Streak" prominently on dashboard

### P1.4: Notification System
- [ ] Create `Notification` model in Prisma
- [ ] Build notification bell component with badge count
- [ ] Implement notification triggers:
  - New assignment available
  - Assignment due in 24 hours
  - Score published
  - Badge earned
  - Streak about to break
  - Weekly progress report ready
- [ ] Add notification preferences in profile settings
- [ ] Send welcome email with onboarding tips

---

## PHASE 2: AI-Powered Personal Learning (Weeks 3-4)
**Goal:** Make every student feel they have a personal tutor.

### P2.1: AI Diagnostic & Skill Mapping
- [ ] Build diagnostic test (20 questions across all subjects)
- [ ] Store diagnostic results in `UserSkillMap` model (topic → proficiency 0-100)
- [ ] Display skill radar chart in profile
- [ ] Auto-identify weak topics from submission history
- [ ] Show "Focus Areas" card on dashboard

### P2.2: AI-Generated Personalized Assignments
- [ ] Integrate OpenAI/Anthropic API
- [ ] Build assignment generator:
  - Input: Weak topics + target difficulty + question count
  - Output: MCQs, short answers, long answers
- [ ] Store AI-generated assignments with `isAIGenerated` flag
- [ ] Add "Generate Practice Test" button on dashboard
- [ ] Limit free users to 3 AI assignments/week

### P2.3: AI Tutor Chatbot
- [ ] Create chat interface component (floating chat bubble)
- [ ] Build chat API with context:
  - Current assignment context
  - Subject knowledge base
  - Student's skill map
- [ ] Pre-load CBSE Class 9 NCERT content as context
- [ ] Add chat history persistence
- [ ] Limit free users to 10 messages/day

### P2.4: Adaptive Difficulty Engine
- [ ] Track per-topic success rate from submissions
- [ ] Auto-adjust next assignment difficulty:
  - < 40% score → Easier questions
  - 40-70% → Same difficulty
  - > 70% → Harder questions
- [ ] Show difficulty level on assignment card
- [ ] Add "Challenge Mode" (harder than usual)

---

## PHASE 3: Content & Mock Exams (Weeks 5-6)
**Goal:** Become the one-stop shop for CBSE Class 9 study material.

### P3.1: Enhanced Study Materials
- [ ] Import high-quality CBSE content (NCERT notes, formulas, important questions)
- [ ] Add content rating system (students rate usefulness)
- [ ] Build bookmarking with personal notes
- [ ] Add "Read Later" queue
- [ ] Create subject-wise topic index (chapters 1-15 for each subject)
- [ ] Add video embed support (YouTube integration)

### P3.2: Mock Exam Simulator
- [ ] Build full-length mock exam mode (3 hours, all subjects)
- [ ] CBSE board exam pattern (MCQ + Short + Long in ratio 20:30:50)
- [ ] Real exam timer with countdown
- [ ] OMR-style answer sheet UI
- [ ] Instant result with percentile ranking
- [ ] Store mock exam history with improvement graph

### P3.3: Daily Learning Feed
- [ ] Create "Today's Focus" card on dashboard
- [ ] AI-curated 3 things to study today based on:
  - Weak areas
  - Upcoming assignments
  - Streak maintenance
- [ ] Add "Quick Practice" (5-minute MCQ session)
- [ ] Daily quote/motivation card

---

## PHASE 4: Monetization & Pro Features (Weeks 7-8)
**Goal:** Convert engaged free users to Pro subscribers.

### P4.1: Subscription Tiers
- [ ] Add `Subscription` model to Prisma (plan, status, startDate, endDate)
- [ ] Define tier features:
  | Feature | Free | Pro (₹99/mo) |
  |---------|------|--------------|
  | Assignments/week | 3 | Unlimited |
  | AI Tutor messages | 10/day | Unlimited |
  | AI-generated tests | 1/week | Unlimited |
  | Mock exams | 1/month | Unlimited |
  | Detailed analytics | Basic | Advanced |
  | Study materials | Limited | Full access |
  | Streak freeze | 1/month | 3/month |
- [ ] Integrate Stripe/Razorpay for payments
- [ ] Build pricing page
- [ ] Add "Upgrade" banners in free tier

### P4.2: Pro Analytics Dashboard
- [ ] Topic-wise mastery breakdown
- [ ] Time spent per subject
- [ ] Comparison with top performers (anonymized)
- [ ] Predicted final exam score
- [ ] Personalized study schedule

### P4.3: Referral Program
- [ ] Each user gets a referral code
- [ ] Referrer gets 7 days Pro free per signup
- [ ] Referee gets 7 days Pro free on signup
- [ ] Build referral dashboard

---

## PHASE 5: Social & Community (Weeks 9-10)
**Goal:** Students learn better together.

### P5.1: Peer Comparison (Anonymous)
- [ ] Show "You scored better than X% of students"
- [ ] Subject-wise percentile ranking
- [ ] Weekly leaderboard (pseudonymous)
- [ ] "Study Buddy" matching based on weak subjects

### P5.2: Study Groups
- [ ] Create/join study groups (max 5 members)
- [ ] Group assignments and challenges
- [ ] Group leaderboard
- [ ] Share progress cards

### P5.3: Doubt Forum
- [ ] Ask doubts community-wide
- [ ] Upvote helpful answers
- [ ] AI-suggested answers from knowledge base
- [ ] Teacher/Expert verification badges

---

## PHASE 6: Parent Engagement (Weeks 11-12)
**Goal:** Parents become advocates for VidyaSetu.

### P6.1: Parent Dashboard (Read-Only)
- [ ] Parent signup with child linking (email invite)
- [ ] Weekly progress email to parent
- [ ] Parent dashboard showing:
  - Child's attendance/streak
  - Recent scores
  - Time spent studying
  - Areas needing attention
- [ ] "Share Progress" button for WhatsApp

### P6.2: Parent Notifications
- [ ] Email when child misses assignment deadline
- [ ] Weekly summary every Sunday
- [ ] Alert when child achieves milestone

---

## PHASE 7: Operations & Polish (Weeks 13-14)
**Goal:** Production-ready platform.

### P7.1: Performance & Reliability
- [ ] Add Sentry for error tracking
- [ ] Implement API rate limiting
- [ ] Add database connection pooling
- [ ] Optimize image loading
- [ ] Add PWA support (offline access to materials)

### P7.2: Content Operations
- [ ] Hire/content partner for quality CBSE material
- [ ] Weekly content curation cycle
- [ ] User feedback on content quality
- [ ] Content freshness alerts

### P7.3: Accessibility & Mobile
- [ ] WCAG 2.1 AA compliance audit
- [ ] Mobile app (React Native or PWA)
- [ ] Dark mode
- [ ] Hindi language support

---

## PHASE 8: School/Institution Pack (Weeks 15-16+)
**Goal:** Only after individual product is mature and profitable.

### P8.1: School Onboarding
- [ ] School registration flow
- [ ] Bulk student import (CSV)
- [ ] Teacher account creation
- [ ] Class/section setup

### P8.2: Teacher Tools
- [ ] Assignment creation and distribution
- [ ] Class performance dashboard
- [ ] Gradebook export
- [ ] Announcement system

### P8.3: School Admin
- [ ] Usage analytics
- [ ] Billing management
- [ ] Content moderation
- [ ] Branding customization

---

## 🎯 Revised Implementation Priority

### Immediate (Do First) — Student Value
1. **Gamification v1** (badges, streaks, levels) — drives daily engagement
2. **AI Diagnostic** — personalized from day 1
3. **Notification System** — brings students back

### High Priority — Learning Outcomes
4. **AI Tutor Chatbot** — instant help, reduces churn
5. **AI-Generated Assignments** — infinite practice
6. **Mock Exam Simulator** — exam readiness

### Medium Priority — Retention & Revenue
7. **Subscription Tiers** (Free vs Pro)
8. **Referral Program**
9. **Pro Analytics Dashboard**

### Lower Priority — Scale
10. **Social Features** (study groups, forum)
11. **Parent Dashboard**
12. **School Pack** (Phase 3+)

---

## 💡 Success Metrics by Phase

| Phase | Primary Metric | Target |
|-------|---------------|--------|
| Phase 1 | Day-7 Retention | > 40% |
| Phase 2 | Assignments/week | > 5 per active user |
| Phase 3 | Mock exams taken | > 2 per month |
| Phase 4 | Free-to-Pro Conversion | > 5% |
| Phase 5 | Social Engagement | > 30% join groups |
| Phase 6 | Parent Signup Rate | > 20% of students |

---

## 🚀 Recommended First Sprint (This Week)

1. **Fix TypeScript errors** in auth.ts (add role/schoolId to next-auth.d.ts)
2. **Build Badge System**:
   - Add Badge model to Prisma
   - Create 10 initial badges
   - Build badge notification component
3. **Add Streak Calendar** to dashboard
4. **Implement Welcome Flow** (3-question onboarding)
5. **Send First Assignment** automatically on signup

---

*Built with ❤️ for CBSE Class 9 students. Students first, always.*
