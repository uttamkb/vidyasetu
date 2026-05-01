export interface Question {
  question: string;
  options?: string[];
  correctAnswer: string;
  type: "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER";
  marks: number;
  keywords?: string[];
}

export interface Answer {
  questionIndex: number;
  answer: string;
}

export interface AssignmentWithSubject {
  id: string;
  title: string;
  description: string;
  weekNumber: number;
  subjectId: string;
  subject: {
    name: string;
    color: string;
  };
  maxMarks: number;
  dueDate: Date;
  timeLimit: number | null;
  questions: Question[];
  createdAt: Date;
}

export interface SubmissionWithAssignment {
  id: string;
  userId: string;
  assignmentId: string;
  assignment: AssignmentWithSubject;
  answers: Answer[];
  score: number;
  maxMarks: number;
  feedback: string | null;
  status: string;
  submittedAt: Date;
  startedAt: Date | null;
  timeTaken: number | null;
}

export interface StudyMaterialWithSubject {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  subjectId: string;
  subject: {
    name: string;
    color: string;
  };
  topic: string;
  bookmarked: boolean;
  createdAt: Date;
}

export interface DashboardStats {
  totalAssignments: number;
  pendingAssignments: number;
  submissionsThisWeek: number;
  averageScore: number;
  studyStreak: number;
}

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  color: string;
  totalAssignments: number;
  completedAssignments: number;
  averageScore: number;
}

export interface WeeklyProgress {
  weekNumber: number;
  averageScore: number;
  completedAssignments: number;
}
