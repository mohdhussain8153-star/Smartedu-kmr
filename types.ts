
export type ExamType = 
  | 'NEET' | 'JEE' | 'JKSSB' | 'SSB' | 'IAS' | 'KAS' | 'IPS' | 'BANKING' | 'JRF' | 'GATE' | 'RAILWAY' | 'NDA' | 'JK_POLICE' 
  | '10TH_NCERT' | '11TH_NCERT' | '12TH_NCERT' | 'IAF' | 'JK_BANK' | 'SBI' | 'INDIAN_POST' 
  | 'MIXED' | 'AI_MOCK';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export type FeedbackType = 'Inaccurate Question' | 'Typo/Error' | 'Improvement Suggestion' | 'Technical Bug' | 'Other';

export type StudyLevel = 'Beginner' | 'Regular' | 'Serious';
export type LanguagePreference = 'English' | 'Hindi';
export type EnergyLevel = 'Low energy' | 'Okay' | 'Motivated';

export type Subject = 
  | 'Physics' 
  | 'Biology' 
  | 'Chemistry' 
  | 'Maths' 
  | 'English' 
  | 'History' 
  | 'Political Science' 
  | 'Geography' 
  | 'Computer Science' 
  | 'Urdu'
  | 'Arabic'
  | 'General Knowledge' 
  | 'Current Affairs (JK & India)'
  | 'Current Affairs (International)'
  | 'Environmental Science'
  | 'Disaster Management';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index
  explanation: string;
  subject: Subject;
  difficulty: DifficultyLevel;
  userAnswer?: number;
  isCorrect?: boolean;
  attemptDate?: number;
  examType?: ExamType;
}

export interface MockTestResult {
  sessionId: string;
  examType: ExamType;
  date: number;
  score: number;
  total: number;
  negativeMarks: number;
  accuracy: number;
  readinessPercentage: number;
  subjectAnalysis: Record<string, { correct: number, total: number }>;
}

export interface UserProfile {
  name: string;
  course: string;
  studyLevel: StudyLevel;
  language: LanguagePreference;
  lastEnergyLevel?: EnergyLevel;
  totalAnswered: number;
  correctCount: number;
  milestonesReached: number;
  history: MCQ[];
  lastWeeklyReset?: number;
  journal?: JournalEntry[];
  joiningYear?: number;
  mockTestHistory: MockTestResult[];
  // New profile fields
  status?: string;
  aim?: string;
  aimPercentage: number;
  profilePic?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  readingMode: boolean;
  timerDuration: number;
}

export interface ExamSession {
  id: string;
  questions: MCQ[];
  currentBatchIndex: number; 
  startTime: number;
  selectedSubjects: Subject[];
  examType: ExamType;
  difficulty: DifficultyLevel;
  mode: 'Practice' | 'Revision' | 'Struggle' | 'AI Mock' | 'Realistic Mock';
  timerPerQuestion: number;
}

export interface JournalEntry {
  date: number;
  content: string;
}
