export interface WeeklyData {
  week: string;
  score: number;
  completed: number;
}

export interface SubjectData {
  name: string;
  completed: number;
  total: number;
  average: number;
  color: string;
}

export interface StatusData {
  name: string;
  value: number;
  color: string;
}

export interface ProgressData {
  weeklyData: WeeklyData[];
  subjectData: SubjectData[];
  statusData: StatusData[];
  overallAverage: number;
  bestSubject: SubjectData | null;
  weakestSubject: SubjectData | null;
  submittedCount: number;
  totalAssignments: number;
}
