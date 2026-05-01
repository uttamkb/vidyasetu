# UI Patterns

## Philosophy

The UI is a study companion, not a dashboard. Every screen must answer: "What should I do RIGHT NOW?"

## Design System

- **Primary color**: Slate/Blue (`slate-900` text, `blue-600` actions)
- **Success**: Green (`green-500`) — mastery, correct answers
- **Warning**: Amber (`amber-500`) — streak at risk, partial mastery
- **Danger**: Red (`red-500`) — low mastery, incorrect answers
- **Background**: White cards on `slate-50` page background
- **Fonts**: Inter (body), system-ui (fallback)

## Core Screens

### Dashboard (Home)

```
┌─────────────────────────────────────┐
│  Good morning, Aarav!               │
│  Your Daily Review is ready →       │
├─────────────────────────────────────┤
│  Exam Readiness: 62% ▲ +3%         │
│  [==========>        ]              │
├─────────────────────────────────────┤
│  Knowledge Chain: 🔥 12 days        │
│  [●][●][●][●][●][●][○][○][○][○]   │
├─────────────────────────────────────┤
│  Mastery Map (simplified)           │
│  Math: [██████░░] 75%               │
│  Science: [████░░░░] 50%            │
│  ...                                │
└─────────────────────────────────────┘
```

**Rules:**
- Single primary action: "Start Daily Review" button (largest on screen)
- Secondary: "Practice Weak Topics", "Exam Sprint"
- Mastery Map uses color coding: red (<40%), yellow (40-70%), green (>70%)

### Practice Session

```
┌─────────────────────────────────────┐
│  Daily Review    3 of 12     8:24   │
├─────────────────────────────────────┤
│                                     │
│  [Question text]                    │
│                                     │
│  ○ Option A                         │
│  ○ Option B                         │
│  ● Option C (selected)              │
│  ○ Option D                         │
│                                     │
│  [Stuck? Ask Tutor]                 │
│                                     │
├─────────────────────────────────────┤
│  [Skip]        [Submit Answer]      │
└─────────────────────────────────────┘
```

**Rules:**
- One question at a time; no scrolling
- Timer is ambient (small), not stressful
- "Stuck? Ask Tutor" is contextual, not a floating chat widget
- After answer: immediate feedback with explanation
- Swipe/click to next question

### AI Tutor Hint

```
┌─────────────────────────────────────┐
│  💡 Tutor Hint (Level 1)            │
│                                     │
│  "Think about what happens when     │
│   you add 7 apples and 3 apples."   │
│                                     │
│  [Need another hint?]               │
│  [Show me a worked example]         │
└─────────────────────────────────────┘
```

**Rules:**
- Hints appear inline below the question
- Max 3 hint levels before showing answer
- Never more than 60 words per hint
- After correct answer: "Why does this work?" expansion

### Remediation Flow

```
┌─────────────────────────────────────┐
│  ❌ Incorrect                       │
│                                     │
│  The correct answer is C.           │
│                                     │
│  [Micro-explanation: 2 sentences]   │
│                                     │
│  Common mistake: [misconception]    │
│                                     │
│  [Try a similar question →]         │
└─────────────────────────────────────┘
```

**Rules:**
- No shame language ("You got it wrong" → "Let's look at this together")
- Micro-explanation is 2-3 sentences max
- One near-transfer question follows; then back to queue

### Mastery Map

- Honeycomb or grid visualization of subtopics
- Color: red → yellow → green
- Tap to zoom: subject → chapter → topic → subtopic
- Shows last practiced date on hover/long-press

## Accessibility

- All interactive elements: minimum 44x44px touch target
- Color is not the only indicator (icons + text accompany colors)
- Focus visible on all buttons
- Screen reader labels for mastery percentages
- Respect `prefers-reduced-motion`

## Responsive Breakpoints

| Breakpoint | Usage |
|------------|-------|
| Mobile (<640px) | Single column, full-width cards |
| Tablet (640-1024px) | Two-column dashboard |
| Desktop (>1024px) | Three-column dashboard, side Mastery Map |

## Animation Guidelines

- Subtle only: 200ms transitions
- Purposeful: progress bars animate on load, mastery colors transition on update
- No confetti, no shake animations on wrong answers
- Streak chain links animate sequentially on load
