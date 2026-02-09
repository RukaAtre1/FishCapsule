import { NextRequest, NextResponse } from "next/server";
import { generateGeminiResponse } from "@/lib/llm/gemini";
import { GradeResponseSchema } from "@/lib/llm/schema";
import { z } from "zod";

export const maxDuration = 30;

const GradeRequestSchema = z.object({
    question: z.string().min(5),
    userAnswer: z.string().min(1),
    expectedAnswer: z.string().min(1),
    rubric: z.array(z.string()).min(1).max(5).optional(),
    context: z.string().max(2000).optional(),
});

const GRADE_SYSTEM_PROMPT = `You are a precise educational grading assistant. Grade the student's answer against the expected answer using the rubric criteria.

OUTPUT FORMAT (STRICT JSON):
{
  "score": 0.0–1.0,
  "feedback": "Concise explanation of the grade (1-3 sentences). If wrong, explain the gap specifically.",
  "barrierTags": ["Concept" | "Mechanics" | "Transfer" | "Communication"],
  "fixKit": {
    "microTasks": [
      "10-min actionable micro-task 1",
      "10-min actionable micro-task 2",
      "10-min actionable micro-task 3"
    ],
    "miniQuiz": {
      "question": "A quick follow-up question to test understanding",
      "choices": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option B"
    }
  }
}

SCORING RULES:
- 1.0: Perfect or near-perfect answer, all rubric criteria met
- 0.7-0.9: Mostly correct, minor gaps
- 0.4-0.6: Partially correct, significant gaps
- 0.1-0.3: Mostly wrong but shows some understanding
- 0.0: Completely wrong or irrelevant

BARRIER TAGS — pick the most relevant:
- "Concept": Student doesn't grasp the underlying concept
- "Mechanics": Student knows the concept but can't apply the procedure
- "Transfer": Student can't apply knowledge to new contexts
- "Communication": Student knows the answer but can't articulate it clearly

MICRO-TASKS: Must be specific, actionable, and completable in ≤10 minutes each. Target the identified barrier.

MINI-QUIZ: A single MCQ that tests the specific gap found in the student's answer.
`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = GradeRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.issues },
                { status: 400 }
            );
        }

        const { question, userAnswer, expectedAnswer, rubric, context } = parsed.data;

        const rubricText = rubric
            ? `\nRubric criteria:\n${rubric.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
            : "";

        const userPrompt = `
Question: ${question}

Expected Answer: ${expectedAnswer}

Student's Answer: ${userAnswer}
${rubricText}
${context ? `\nContext: ${context}` : ""}

Grade this answer and provide feedback with a Fix Kit.
`;

        const result = await generateGeminiResponse({
            task: "grade_short_answer",
            systemInstruction: GRADE_SYSTEM_PROMPT,
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            jsonMode: true,
            responseSchema: {
                type: "object",
                properties: {
                    score: { type: "number" },
                    feedback: { type: "string" },
                    barrierTags: { type: "array", items: { type: "string" } },
                    fixKit: {
                        type: "object",
                        properties: {
                            microTasks: { type: "array", items: { type: "string" } },
                            miniQuiz: {
                                type: "object",
                                properties: {
                                    question: { type: "string" },
                                    choices: { type: "array", items: { type: "string" } },
                                    answer: { type: "string" },
                                },
                            },
                        },
                    },
                },
                required: ["score", "feedback", "barrierTags", "fixKit"],
            },
            timeoutMs: 25000,
        });

        if (!result.ok) {
            return NextResponse.json(
                { error: result.error.message },
                { status: 500 }
            );
        }

        // Normalize response
        const data = result.value;
        const normalized = {
            score: Math.max(0, Math.min(1, typeof data.score === "number" ? data.score : 0)),
            feedback: typeof data.feedback === "string" ? data.feedback : "Unable to grade.",
            barrierTags: Array.isArray(data.barrierTags)
                ? data.barrierTags.filter((t: string) =>
                    ["Concept", "Mechanics", "Transfer", "Communication"].includes(t)
                ).slice(0, 3)
                : ["Concept"],
            fixKit: {
                microTasks: Array.isArray(data.fixKit?.microTasks)
                    ? data.fixKit.microTasks.slice(0, 3).map((t: any) => String(t))
                    : ["Review the concept and try again"],
                miniQuiz: data.fixKit?.miniQuiz && typeof data.fixKit.miniQuiz === "object"
                    ? {
                        question: String(data.fixKit.miniQuiz.question || ""),
                        choices: Array.isArray(data.fixKit.miniQuiz.choices)
                            ? data.fixKit.miniQuiz.choices.map((c: any) => String(c))
                            : [],
                        answer: String(data.fixKit.miniQuiz.answer || ""),
                    }
                    : undefined,
            },
        };

        return NextResponse.json(normalized);
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || "Grading failed" },
            { status: 500 }
        );
    }
}
