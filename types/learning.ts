export type ConceptRef = { id: string; title: string; description: string };

export type QuickCheckMCQ = {
  id: string;
  type: "mcq";
  prompt: string;
  choices: string[];
  answer: string;
  rubric: string[];
  hints: string[];
};

export type QuickCheckShort = {
  id: string;
  type: "short";
  prompt: string;
  answer: string;
  rubric: string[];
  hints: string[];
};

export type QuickCheckQuestion = QuickCheckMCQ | QuickCheckShort;

export type CornellCard = {
  conceptId: string;
  conceptTitle: string;
  cues: string[];
  notes: string[];
  summary: string;
  misconceptions: { misconception: string; correction: string }[];
  quickCheck: QuickCheckQuestion[];
};

export type AttemptLog = {
  sessionId: string;
  conceptId: string;
  conceptTitle: string;
  questionId: string;
  type: "mcq" | "short";
  correct: boolean;
  userAnswer: string;
  expectedAnswer: string;
  createdAt: number;
  confidence?: "low" | "medium" | "high";
  rubric?: string[];
};

export type BarrierId =
  | "concept_confusion"
  | "misconception"
  | "retrieval_gap"
  | "application_gap"
  | "precision_issue"
  | "confidence_block";

export type BarrierAssessment = {
  sessionId: string;
  conceptId: string;
  conceptTitle: string;
  summary: string;
  strongPoints: string[];
  weakPoints: string[];
  topBarriers: { id: BarrierId; evidence: string[]; severity: "low" | "medium" | "high" }[];
  recommendedNextActions: { title: string; why: string; steps: string[] }[];
};

export type StudySession = {
  sessionId: string;
  courseTitle?: string;
  context: string;
  concepts: ConceptRef[];
  createdAt: number;
  cards?: Record<string, CornellCard>;
};
