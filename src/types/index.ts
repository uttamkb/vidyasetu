// ─────────────────────────────────────────────────────────
// Shared Frontend Types for VidyaSetu MVP
// ─────────────────────────────────────────────────────────

export interface AssignmentSummary {
  id: string;
  title: string;
  type: "CHAPTER" | "SEMESTER" | "FULL_SYLLABUS" | "REMEDIAL" | "DIAGNOSTIC";
  difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
  maxMarks: number;
  timeLimit: number | null;
  isAIGenerated: boolean;
  questionCount: number;
  dueDate: Date | null;
  createdAt: Date;
  subject: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
  };
  chapter: {
    id: string;
    name: string;
  } | null;
  submission: SubmissionSummary | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EVALUATED";
}

export interface AssignmentQuestion {
  id: string;
  orderIndex: number;
  type: "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER" | "NUMERIC";
  difficulty: number;
  bloomLevel: string;
  subtopic: {
    id: string;
    name: string;
    topic: { id: string; name: string; chapter: { id: string; name: string } };
  };
  content: {
    question: string;
    options?: string[];
    maxMarks: number;
    // correctAnswer excluded from client payload during test
  };
}

export interface SubmissionSummary {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "EVALUATED";
  totalScore: number;
  percentageScore: number;
  submittedAt: Date;
}

export interface EvaluatedAnswer {
  questionId: string;
  questionText: string;
  options?: string[];
  correctAnswer: string;
  userAnswer: string | number | null;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  feedback: string;
  correction: string;
  explanation: string;
  type: string;
  subtopicName?: string;
  topicName?: string;
  chapterName?: string;
}

export interface SubmissionResult {
  id: string;
  status: "EVALUATED";
  totalScore: number;
  maxMarks: number;
  percentageScore: number;
  aiFeedback: string | null;
  submittedAt: Date;
  evaluatedAt: Date | null;
  timeTaken: number | null;
  assignment: {
    id: string;
    title: string;
    type: string;
    difficulty: string;
    subject: { id: string; name: string; color: string };
    chapter: { id: string; name: string } | null;
  };
  stats: {
    total: number;
    correct: number;
    incorrect: number;
    accuracy: number;
  };
  answers: EvaluatedAnswer[];
}

export interface MasterySubtopic {
  id: string;
  name: string;
  difficulty: number;
  masteryScore: number;
  lastPracticed: Date | null;
  totalAttempts: number;
  correctAttempts: number;
  status: "mastered" | "learning" | "weak" | "not_started";
}

export interface MasteryTopic {
  id: string;
  name: string;
  orderIndex: number;
  avgMastery: number;
  subtopics: MasterySubtopic[];
}

export interface MasteryChapter {
  id: string;
  name: string;
  orderIndex: number;
  avgMastery: number;
  topics: MasteryTopic[];
}

export interface MasterySubject {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  chapters: MasteryChapter[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  school: string | null;
  district: string | null;
  state: string | null;
  avgScore: number;
  submissionCount: number;
  isCurrentUser: boolean;
}

export interface Recommendation {
  type: "STUDY_MATERIAL" | "REMEDIAL_ASSIGNMENT" | "TOPIC_REVIEW";
  priority: "HIGH" | "MEDIUM" | "LOW";
  subtopicId: string;
  subtopicName: string;
  topicName: string;
  chapterName: string;
  subjectName: string;
  masteryScore: number;
  reason: string;
  action: string;
}
