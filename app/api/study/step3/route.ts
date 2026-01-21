import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateGeminiResponse } from "@/lib/llm/gemini";
import { Step3QuizSchema, BarrierTagSchema } from "@/lib/llm/schema";

export const maxDuration = 45;

const MAX_RETRIES = 2;
const VALID_TAGS = ["Concept", "Mechanics", "Transfer", "Communication"] as const;

// Request body schema
const RequestBodySchema = z.object({
    keyIdeas: z.array(z.string()).min(1),
    summaries: z.array(z.object({
        page: z.number(),
        takeaway: z.string(),
    })).min(1),
});

const SYSTEM_PROMPT = `Generate 3-5 quiz questions based on the study content.
Use "barrier tags" to classify what the question tests.

IMPORTANT: Output ONLY valid JSON. Do not include markdown fences or explanatory text.

Output format (JSON):
{
  "questions": [
    {
       "id": "q1",
       "type": "mcq",
       "prompt": "...",
       "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
       "answer": "A",
       "why": "...",
       "tag": "Concept"
    }
  ]
}

Valid tags: Concept, Mechanics, Transfer, Communication
Answer must be just the letter (A, B, C, or D) without punctuation.
`;

/**
 * Extract first valid JSON object/array from potentially noisy LLM output
 */
function extractJSON(raw: string): any {
    // Remove markdown code fences
    let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

    // Try to find JSON object boundaries
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch {
            // Fall through to original parse attempt
        }
    }

    // Last resort: try parsing the cleaned string directly
    return JSON.parse(cleaned);
}

/**
 * Normalize LLM output to match schema expectations
 */
function normalizeQuizResponse(data: any): any {
    if (!data || !data.questions || !Array.isArray(data.questions)) {
        throw new Error("Missing or invalid 'questions' array");
    }

    return {
        questions: data.questions.map((q: any, idx: number) => {
            // Normalize tag (case-insensitive match, default to "Concept")
            let normalizedTag = "Concept";
            if (q.tag || q.barrierTag) {
                const tagValue = (q.tag || q.barrierTag).toString();
                const foundTag = VALID_TAGS.find(
                    t => t.toLowerCase() === tagValue.toLowerCase()
                );
                if (foundTag) normalizedTag = foundTag;
            }

            // Clean answer (remove punctuation, whitespace, "Option" prefix)
            let normalizedAnswer = (q.answer || "").toString().trim();
            normalizedAnswer = normalizedAnswer
                .replace(/^Option\s*/i, "")
                .replace(/[.,;:]/g, "")
                .trim()
                .charAt(0)
                .toUpperCase();

            // Truncate 'why' to 150 chars
            const why = (q.why || q.explanation || "").toString().substring(0, 150);

            // Trim choices
            const choices = Array.isArray(q.choices) || Array.isArray(q.options)
                ? (q.choices || q.options).map((c: any) => c.toString().trim())
                : undefined;

            return {
                id: q.id || `q${idx + 1}`,
                type: q.type || "mcq",
                prompt: (q.prompt || q.question || "").toString().trim(),
                choices,
                answer: normalizedAnswer,
                why,
                tag: normalizedTag,
            };
        }),
    };
}

export async function POST(req: NextRequest) {
    const start = Date.now();

    try {
        // 1. Validate request body
        const body = await req.json();
        const requestValidation = RequestBodySchema.safeParse(body);

        if (!requestValidation.success) {
            return NextResponse.json(
                {
                    error: "VALIDATION_ERROR",
                    where: "request",
                    issues: process.env.NODE_ENV !== "production"
                        ? requestValidation.error.issues
                        : undefined
                },
                { status: 400 }
            );
        }

        const { keyIdeas, summaries } = requestValidation.data;
        const inputContent = `Key Ideas: ${keyIdeas.join(", ")}\nSummaries: ${summaries.map(s => s.takeaway).join("; ")}`;

        let lastError: any = null;

        // 2. Retry loop
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await generateGeminiResponse({
                    task: "step3_quiz",
                    systemInstruction: SYSTEM_PROMPT,
                    contents: [{ role: "user", parts: [{ text: inputContent }] }],
                    jsonMode: true,
                    responseSchema: {
                        type: "object",
                        properties: {
                            questions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        type: { type: "string", enum: ["mcq", "short"] },
                                        prompt: { type: "string" },
                                        choices: { type: "array", items: { type: "string" } },
                                        answer: { type: "string" },
                                        why: { type: "string" },
                                        tag: { type: "string", enum: ["Concept", "Mechanics", "Transfer", "Communication"] }
                                    },
                                    required: ["id", "type", "prompt", "answer", "why", "tag"]
                                }
                            }
                        },
                        required: ["questions"]
                    },
                    timeoutMs: 30000,
                });

                if (!result.ok) {
                    lastError = result.error;
                    continue;
                }

                // 3. Extract JSON (handle fences/noise)
                let extractedData = result.value;
                if (typeof result.value === "string") {
                    extractedData = extractJSON(result.value);
                }

                // 4. Normalize
                const normalized = normalizeQuizResponse(extractedData);

                // 5. Validate response schema
                const parsed = Step3QuizSchema.safeParse(normalized);

                if (parsed.success) {
                    console.log(`[API] Step 3 Quiz complete in ${Date.now() - start}ms (Model: ${result.meta.model}, Attempt: ${attempt + 1})`);
                    return NextResponse.json({
                        ...parsed.data,
                        meta: {
                            source: "gemini",
                            totalMs: Date.now() - start,
                            attempts: attempt + 1,
                            model: result.meta.model
                        }
                    });
                }

                // Schema validation failed, save error and retry
                lastError = parsed.error;
                console.warn(`[Step3] Validation failed (attempt ${attempt + 1}):`, parsed.error.issues);

            } catch (err: any) {
                lastError = err;
                console.error(`[Step3] Error on attempt ${attempt + 1}:`, err.message);
            }
        }

        // 6. Final failure after all retries
        return NextResponse.json(
            {
                error: "VALIDATION_ERROR",
                where: "response",
                message: "Quiz generation failed after retries",
                issues: process.env.NODE_ENV !== "production"
                    ? undefined
                    : lastError?.issues || [lastError?.message]
            },
            { status: 502 }
        );

    } catch (error: any) {
        console.error("[Step3] Unexpected error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
