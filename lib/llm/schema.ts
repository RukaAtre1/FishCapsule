import { z } from "zod";

// ============ Outline & Course Schemas ============

export const LectureNodeSchema = z.object({
    lectureId: z.string().min(1),
    week: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    title: z.string().min(1).max(200),
    topics: z.array(z.string()).min(1).max(10),
    deliverables: z.array(z.string()).nullable().optional(),
    readings: z.array(z.string()).nullable().optional(),
    deckId: z.string().nullable().optional(),
});

export const OutlineResponseSchema = z.object({
    outline: z.array(LectureNodeSchema).min(1).max(50), // Limited for v1.2 demo/perf
});

// ============ Citation Schema ============

export const CitationSchema = z.object({
    page: z.number().int().min(1),
    chunkId: z.string().min(1),
    snippet: z.string().max(200).optional(),
});

// ============ SlideExplain Schema ============

export const SlideExplainQuickCheckSchema = z.object({
    question: z.string().min(5),
    choices: z.array(z.string()).optional(),
    answer: z.string().min(1),
    explanation: z.string().min(10),
});

export const SlideExplainSchema = z.object({
    lectureId: z.string().min(1),
    deckId: z.string().optional(),
    pages: z.union([
        z.array(z.number().int().min(1)),
        z.number().int().min(1),
        z.object({ start: z.number().int().min(1), end: z.number().int().min(1) }),
    ]),
    titleGuess: z.string().max(200).optional(),
    keyPoints: z.array(z.string().min(2)).min(1).max(10),
    whyItMatters: z.array(z.string().min(2)).min(0).max(5).optional().default([]),
    examAngles: z.array(z.string().min(2)).min(0).max(5).optional().default([]),
    commonMistakes: z.array(z.string().min(2)).min(0).max(5).optional().default([]),
    quickCheck: SlideExplainQuickCheckSchema,
    citations: z.array(CitationSchema).min(0).max(20).optional().default([]),
});

export const SlideExplainResponseSchema = z.object({
    slideExplain: SlideExplainSchema,
});

// ============ ConceptModule Schema ============

export const ConceptModuleSchema = z.object({
    conceptId: z.string().min(1),
    lectureId: z.string().min(1),
    pageRef: z.union([
        z.number().int().min(1),
        z.object({ start: z.number().int().min(1), end: z.number().int().min(1) }),
    ]).optional(),
    title: z.string().min(1).max(200),
    oneLiner: z.string().min(10).max(300),
    intuition: z.array(z.string().min(5)).min(2).max(4),
    vividExample: z.string().min(20),
    miniMathOrPseudo: z.string().optional(),
    commonTraps: z.array(z.string().min(5)).min(2).max(4),
    quickCheck: SlideExplainQuickCheckSchema,
    citations: z.array(CitationSchema).min(1).max(10),
});

export const ConceptModulesResponseSchema = z.object({
    conceptModules: z.array(ConceptModuleSchema).min(1).max(10),
});



// ============ QuickCheck Schemas ============

export const QuickCheckMCQSchema = z.object({
    id: z.string().min(1),
    type: z.literal("mcq"),
    prompt: z.string().min(10),
    choices: z.array(z.string().min(1)).min(3).max(6),
    answer: z.string().min(1),
    rubric: z.array(z.string()).min(1).max(8),
    hints: z.array(z.string()).min(1).max(5),
});

export const QuickCheckShortSchema = z.object({
    id: z.string().min(1),
    type: z.literal("short"),
    prompt: z.string().min(10),
    answer: z.string().min(1),
    rubric: z.array(z.string()).min(1).max(8),
    hints: z.array(z.string()).min(1).max(5),
});

export const QuickCheckCodeSchema = z.object({
    id: z.string().min(1),
    type: z.literal("code"),
    prompt: z.string().min(10),
    starter: z.string().optional(),
    answer: z.string().min(1),
    rubric: z.array(z.string()).min(1).max(8),
    hints: z.array(z.string()).min(1).max(5),
});

export const QuickCheckSchema = z.discriminatedUnion("type", [
    QuickCheckMCQSchema,
    QuickCheckShortSchema,
    QuickCheckCodeSchema,
]);

// ============ Cornell Card Schema ============

export const MisconceptionSchema = z.object({
    misconception: z.string().min(5).max(500),
    correction: z.string().min(5).max(500),
});

export const CornellCardSchema = z.object({
    conceptId: z.string().min(1),
    conceptTitle: z.string().min(1).max(200),
    cues: z.array(z.string().min(5)).min(3).max(10),
    notes: z.array(z.string().min(10)).min(4).max(15),
    summary: z.string().min(30).max(800),
    misconceptions: z.array(MisconceptionSchema).min(1).max(6),
    quickCheck: z.array(QuickCheckSchema).min(1).max(5),
});

// ============ Feedback Schema ============

export const FeedbackBarrierIdSchema = z.enum([
    "concept_confusion",
    "misconception",
    "retrieval_gap",
    "application_gap",
    "precision_issue",
    "confidence_block",
    "misread_prompt",
    "vocabulary_gap",
    "memory_decay",
    "reasoning_jump",
    "careless_error",
    "overload",
    "none",
]);

export const FeedbackTacticSchema = z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10).max(500),
});

export const MicroDrillSchema = z.object({
    task: z.string().min(10).max(500),
    hint: z.string().optional(),
    answer: z.string().optional(),
});

export const FeedbackResponseSchema = z.object({
    barrier: FeedbackBarrierIdSchema,
    barrierName: z.string().optional(),
    evidence: z.string().min(10).max(500),
    tactics: z.array(FeedbackTacticSchema).min(1).max(5),
    microDrill: MicroDrillSchema,
    retestPlan: z.string().min(10).max(500),
    microDrillDone: z.boolean().optional(),
});

// ============ Diagnose Schema ============

export const BarrierAssessmentSchema = z.object({
    sessionId: z.string().min(1),
    conceptId: z.string().min(1),
    conceptTitle: z.string().min(1),
    summary: z.string().min(20).max(1000),
    strongPoints: z.array(z.string()).min(0).max(10),
    weakPoints: z.array(z.string()).min(0).max(10),
    topBarriers: z.array(z.object({
        id: z.string(),
        evidence: z.array(z.string()),
        severity: z.enum(["low", "medium", "high"]),
    })).min(0).max(5),
    recommendedNextActions: z.array(z.object({
        title: z.string(),
        why: z.string(),
        steps: z.array(z.string()),
    })).min(0).max(5),
});

// ============ Output Metadata (PRD v2.0) ============

export const ApiMetaSchema = z.object({
    totalMs: z.number(),
    stages: z.object({
        extract: z.number().optional(),
        llm: z.number().optional(),
        parse: z.number().optional(),
    }),
    input: z.object({
        chars: z.number(),
        estTokens: z.number(),
    }).optional(),
    llm: z.object({
        provider: z.string(),
        model: z.string(),
        attempts: z.number(),
        timeoutMs: z.number(),
    }).optional(),
    cache: z.object({
        hit: z.boolean(),
        key: z.string().optional(),
    }).optional(),
});

// Legacy meta for backward compatibility
export const OutputMetaSchema = z.object({
    source: z.enum(["llm", "cache", "fallback"]),
    latencyMs: z.number().optional(),
    failStage: z.enum(["timeout", "parse", "schema", "repair"]).optional(),
    validationErrors: z.array(z.string()).optional(),
    promptVersion: z.string().optional(),
});

// ============ PRD v2.0 Step Schemas ============

// Step 1: Per-page Explain (short output)
export const Step1ExplainSchema = z.object({
    page: z.number().int().min(1),
    plain: z.string().max(600),    // <=120 words
    example: z.string().max(600),  // <=120 words  
    takeaway: z.string().max(150), // <=20 words
});

export const Step1ResponseSchema = z.object({
    result: Step1ExplainSchema,
    meta: ApiMetaSchema,
});

// Step 2: Synthesize (cross-page summary)
export const Step2SynthesizeSchema = z.object({
    keyIdeas: z.array(z.string().max(300)).min(1).max(5),
    commonConfusion: z.string().max(300),
    examAngle: z.string().max(300),
});

export const Step2ResponseSchema = z.object({
    result: Step2SynthesizeSchema,
    meta: ApiMetaSchema,
});

// Step 3: Quiz with Barrier Tags
export const BarrierTagSchema = z.enum([
    "Concept",
    "Mechanics",
    "Transfer",
    "Communication",
]);

export const QuizQuestionSchema = z.object({
    id: z.string().min(1),
    type: z.enum(["mcq", "short"]),
    prompt: z.string().min(10),
    choices: z.array(z.string()).optional(),
    answer: z.string().min(1),
    why: z.string().max(150), // <=30 words
    tag: BarrierTagSchema,
});

export const Step3QuizSchema = z.object({
    questions: z.array(QuizQuestionSchema).min(3).max(5),
});

export const Step3ResponseSchema = z.object({
    result: Step3QuizSchema,
    meta: ApiMetaSchema,
});

// Step 4: Diagnose + Plan
export const ReviewPlanItemSchema = z.object({
    in: z.enum(["1d", "3d", "7d"]),
});

export const Step4DiagnoseSchema = z.object({
    overallTag: BarrierTagSchema,
    evidence: z.array(z.string()).min(1).max(5),
    microPlan: z.array(z.string()).min(1).max(3), // 10-min tasks
    reviewPlan: z.array(ReviewPlanItemSchema).min(1).max(3),
});

export const Step4ResponseSchema = z.object({
    result: Step4DiagnoseSchema,
    meta: ApiMetaSchema,
});

// ============ PRD v2.2: Cloze Practice ============

// Cloze Question (Type C)
export const ClozeQuestionSchema = z.object({
    id: z.string().min(1),
    sentence: z.string().min(10),  // contains ____ blank marker
    choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    answerIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    explanation: z.string().max(200),
    sourcePages: z.array(z.number().int()),
    tag: BarrierTagSchema.optional(),
});

export const ClozeResponseSchema = z.object({
    questions: z.array(ClozeQuestionSchema).min(3).max(3),
});

// ============ PRD v2.3: Cornell Output Quality Upgrade ============

// BarrierTag lowercase for v2.3
export const BarrierTagV2Schema = z.enum([
    "concept",
    "mechanics",
    "transfer",
    "communication",
]);

// Evidence snippet for trust/provenance
export const EvidenceSnippetSchema = z.object({
    page: z.number().int().min(1),
    snippet: z.string().max(120),
});

// New Cue type with Q/A format
export const CueV2Schema = z.object({
    page: z.number().int().min(1),
    tag: BarrierTagV2Schema,
    q: z.string().min(5),           // question (must end with ?)
    a: z.string().max(80),          // short answer (≤8 words preferred)
    cloze: z.object({
        text: z.string(),           // e.g., "Bagging reduces ____."
        answer: z.string(),
    }).optional(),
});

// New PageNote type with structured format
export const PageNoteV2Schema = z.object({
    page: z.number().int().min(1),
    core: z.string().max(300),                      // 1 sentence core idea
    mechanism: z.array(z.string()).min(2).max(3),   // 2-3 bullets
    examTraps: z.array(z.string()).min(1).max(2),   // 1-2 bullets
    example: z.string().max(300).optional(),        // optional mini example
    takeaway: z.string().max(100),                  // ≤14 words
    evidence: EvidenceSnippetSchema.optional(),
});

// New SummaryCard type (review card format)
export const SummaryCardSchema = z.object({
    memorize: z.array(z.string()).min(3).max(3),    // exactly 3 bullets
    examQs: z.array(z.string()).min(2).max(2),      // exactly 2 questions
});

// Combined Cornell Output for v2.3
export const CornellOutputV2Schema = z.object({
    cues: z.array(CueV2Schema).min(3).max(10),
    notes: z.array(PageNoteV2Schema).min(1),
    summary: SummaryCardSchema,
});

// ============ Type Exports ============

export type CornellCardOutput = z.infer<typeof CornellCardSchema>;
export type FeedbackOutput = z.infer<typeof FeedbackResponseSchema>;
export type DiagnoseOutput = z.infer<typeof BarrierAssessmentSchema>;
export type OutputMeta = z.infer<typeof OutputMetaSchema>;
export type ApiMeta = z.infer<typeof ApiMetaSchema>;
export type LectureNode = z.infer<typeof LectureNodeSchema>;
export type OutlineResponse = z.infer<typeof OutlineResponseSchema>;
export type Step1Explain = z.infer<typeof Step1ExplainSchema>;
export type Step2Synthesize = z.infer<typeof Step2SynthesizeSchema>;
export type Step3Quiz = z.infer<typeof Step3QuizSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type Step4Diagnose = z.infer<typeof Step4DiagnoseSchema>;
export type BarrierTag = z.infer<typeof BarrierTagSchema>;
export type ClozeQuestion = z.infer<typeof ClozeQuestionSchema>;
export type ClozeResponse = z.infer<typeof ClozeResponseSchema>;

// PRD v2.3 types
export type BarrierTagV2 = z.infer<typeof BarrierTagV2Schema>;
export type EvidenceSnippet = z.infer<typeof EvidenceSnippetSchema>;
export type CueV2 = z.infer<typeof CueV2Schema>;
export type PageNoteV2 = z.infer<typeof PageNoteV2Schema>;
export type SummaryCard = z.infer<typeof SummaryCardSchema>;
export type CornellOutputV2 = z.infer<typeof CornellOutputV2Schema>;
