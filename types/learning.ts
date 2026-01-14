import type { LectureNode } from "@/lib/llm/schema";

export type ConceptRef = { id: string; title: string; description: string };

// SlideExplain types
export type Citation = {
  page: number;
  chunkId: string;
  snippet?: string;
};

export type SlideExplainQuickCheck = {
  question: string;
  choices?: string[];
  answer: string;
  explanation: string;
};

export type SlideExplain = {
  lectureId: string;
  deckId?: string;
  pages: number[] | { start: number; end: number };
  titleGuess?: string;
  keyPoints: string[];
  whyItMatters: string[];
  examAngles: string[];
  commonMistakes: string[];
  quickCheck: SlideExplainQuickCheck;
  citations: Citation[];
};


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

export type QuickCheckCode = {
  id: string;
  type: "code";
  prompt: string;
  starter?: string;
  answer: string;
  rubric: string[];
  hints: string[];
};

export type QuickCheckQuestion = QuickCheckMCQ | QuickCheckShort | QuickCheckCode;

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
  type: "mcq" | "short" | "code";
  correct: boolean;
  userAnswer: string;
  expectedAnswer: string;
  createdAt: number;
  confidence?: number | "low" | "medium" | "high";
  rubric?: string[];
  usedReveal?: boolean;
  timeSpentSec?: number;
  variant?: {
    mcqVariantId?: string;
    shortVariantId?: string;
    codeVariantId?: string;
    ladder?: "fix_bug" | "write_guard" | "edge_case";
  };
};

export type BarrierId =
  | "concept_confusion"
  | "misconception"
  | "retrieval_gap"
  | "application_gap"
  | "precision_issue"
  | "confidence_block";

export type FeedbackBarrierId =
  | "concept_confusion"
  | "misconception"
  | "retrieval_gap"
  | "application_gap"
  | "precision_issue"
  | "confidence_block"
  | "misread_prompt"
  | "vocabulary_gap"
  | "memory_decay"
  | "reasoning_jump"
  | "careless_error"
  | "overload"
  | "none";

export type FeedbackTactic = { title: string; description: string };

export type MicroDrill = { task: string; hint?: string; answer?: string };

export type FeedbackResponse = {
  barrier: FeedbackBarrierId;
  barrierName?: string;
  evidence: string;
  tactics: FeedbackTactic[];
  microDrill: MicroDrill;
  retestPlan: string;
  microDrillDone?: boolean;
};

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

export type ReviewState = {
  conceptId: string;
  lastAttemptAt?: number;
  nextReviewAt?: number;
  intervalDays?: number;
  ease?: number;
  streak?: number;
  mastery?: number;
};

export type DueStatus = "due_today" | "due_soon" | "mastered" | "scheduled" | "not_started";

export type StudySession = {
  sessionId: string;
  courseTitle?: string;
  syllabusText: string;
  outline: LectureNode[];
  context?: string; // Legacy? Keeping for compatibility
  concepts?: ConceptRef[]; // Legacy? Keeping
  createdAt: number;
  cards?: Record<string, CornellCard>;
  attempts?: Record<string, AttemptLog[]>;
  feedback?: Record<string, FeedbackResponse>;
  review?: Record<string, ReviewState>;
};
