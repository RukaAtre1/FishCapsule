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
        z.object({ start: z.number().int().min(1), end: z.number().int().min(1) }),
    ]),
    titleGuess: z.string().max(200).optional(),
    keyPoints: z.array(z.string().min(5)).min(1).max(10),
    whyItMatters: z.array(z.string().min(5)).min(1).max(5),
    examAngles: z.array(z.string().min(5)).min(1).max(5),
    commonMistakes: z.array(z.string().min(5)).min(1).max(5),
    quickCheck: SlideExplainQuickCheckSchema,
    citations: z.array(CitationSchema).min(1).max(20),
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

// ============ Output Metadata ============

export const OutputMetaSchema = z.object({
    source: z.enum(["llm", "repaired", "fallback"]),
    latencyMs: z.number().optional(),
    validationErrors: z.array(z.string()).optional(),
    generationId: z.string().optional(),
    cacheHit: z.boolean().optional(),
});

// ============ Type Exports ============

export type CornellCardOutput = z.infer<typeof CornellCardSchema>;
export type FeedbackOutput = z.infer<typeof FeedbackResponseSchema>;
export type DiagnoseOutput = z.infer<typeof BarrierAssessmentSchema>;
export type OutputMeta = z.infer<typeof OutputMetaSchema>;
export type LectureNode = z.infer<typeof LectureNodeSchema>;
export type OutlineResponse = z.infer<typeof OutlineResponseSchema>;
