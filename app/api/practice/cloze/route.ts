import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateGeminiResponse } from "@/lib/llm/gemini";
import { ClozeQuestionSchema, ClozeResponseSchema, ClozeQuestion } from "@/lib/llm/schema";

// ============ Request Schema ============

const RequestBodySchema = z.object({
    docId: z.string().optional(),
    pages: z.array(z.number().int().min(1)).min(1),
    bullets: z.array(z.object({
        page: z.number().int(),
        text: z.string(),
        takeaway: z.string(),
    })).min(1),
    keyIdeas: z.array(z.string()).optional(),
    commonConfusion: z.string().optional(),
});

// ============ Constants ============

const MAX_RETRIES = 2;
const BLANK_MARKER = "____";
const BLANK_PATTERN = /____|\{blank\}/gi;

// ============ Normalization Helpers ============

/**
 * Normalize blank marker to standard "____"
 */
function normalizeBlank(sentence: string): string {
    return sentence.replace(BLANK_PATTERN, BLANK_MARKER);
}

/**
 * Validate sentence has exactly ONE blank
 */
function hasExactlyOneBlank(sentence: string): boolean {
    const matches = sentence.match(BLANK_PATTERN);
    return matches !== null && matches.length === 1;
}

/**
 * Generate stable hash-based ID (P0-2)
 */
function generateStableId(docId: string, pages: number[], sentence: string, choices: string[]): string {
    const input = `${docId || "doc"}:${pages.join(",")}:${sentence}:${choices.join(",")}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const chr = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return `cloze_${Math.abs(hash).toString(36)}`;
}

/**
 * Normalize and validate a single cloze question
 */
function normalizeClozeQuestion(
    raw: any,
    docId: string,
    requestedPages: number[]
): ClozeQuestion | null {
    try {
        // Ensure required fields exist
        if (!raw.sentence || !raw.choices || raw.answerIndex === undefined) {
            return null;
        }

        // Normalize blank marker
        const sentence = normalizeBlank(raw.sentence);

        // Validate exactly one blank
        if (!hasExactlyOneBlank(sentence)) {
            return null;
        }

        // Normalize choices (trim, ensure 4 unique non-empty)
        const choices = (raw.choices as any[]).slice(0, 4).map(c => String(c).trim());
        if (choices.length !== 4 || choices.some(c => !c)) {
            return null;
        }
        if (new Set(choices).size !== 4) {
            return null;
        }

        // Validate answerIndex
        const answerIndex = Number(raw.answerIndex);
        if (![0, 1, 2, 3].includes(answerIndex)) {
            return null;
        }

        // Normalize sourcePages (subset of requested pages)
        let sourcePages = Array.isArray(raw.sourcePages)
            ? raw.sourcePages.filter((p: any) => requestedPages.includes(Number(p))).map(Number)
            : requestedPages.slice(0, 1);
        if (sourcePages.length === 0) {
            sourcePages = requestedPages.slice(0, 1);
        }

        // Truncate explanation
        const explanation = String(raw.explanation || "").slice(0, 200);

        // Generate stable ID
        const id = generateStableId(docId, sourcePages, sentence, choices as [string, string, string, string]);

        // Normalize tag
        const validTags = ["Concept", "Mechanics", "Transfer", "Communication"];
        const tag = validTags.includes(raw.tag) ? raw.tag : undefined;

        return {
            id,
            sentence,
            choices: choices as [string, string, string, string],
            answerIndex: answerIndex as 0 | 1 | 2 | 3,
            explanation,
            sourcePages,
            tag,
        };
    } catch {
        return null;
    }
}

/**
 * Extract JSON from LLM response (handle markdown fences)
 */
function extractJSON(raw: string): any | null {
    let cleaned = raw.trim();

    // Remove markdown fences
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
        cleaned = fenceMatch[1].trim();
    }

    // Try to find JSON object
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    }

    try {
        return JSON.parse(cleaned);
    } catch {
        return null;
    }
}

// ============ System Prompt ============

const SYSTEM_PROMPT = `Generate EXACTLY 3 fill-in-the-blank (cloze) questions from the study content.

RULES:
1. Each sentence must have EXACTLY ONE blank marked as "____"
2. Provide exactly 4 choices for each question
3. All choices must be unique and plausible
4. answerIndex (0-3) indicates the correct choice
5. Keep explanation under 200 characters
6. Tag questions by type: Concept, Mechanics, Transfer, or Communication
7. Avoid near-duplicate questions; each question must test a DIFFERENT idea
8. If multiple pages, ensure at least one question from each page

OUTPUT FORMAT (JSON only, no markdown):
{
  "questions": [
    {
      "sentence": "Bagging reduces ____ by averaging predictions.",
      "choices": ["variance", "bias", "learning rate", "entropy"],
      "answerIndex": 0,
      "explanation": "Averaging high-variance models cancels noise.",
      "sourcePages": [6],
      "tag": "Concept"
    }
  ]
}

Return EXACTLY 3 cloze questions.`;

// ============ Route Handler ============

export async function POST(req: NextRequest) {
    const start = Date.now();

    try {
        // 1. Parse and validate request
        const body = await req.json();
        const parsed = RequestBodySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({
                error: "VALIDATION_ERROR",
                where: "request",
                ...(process.env.NODE_ENV !== "production" && { issues: parsed.error.issues }),
            }, { status: 400 });
        }

        const { docId, pages, bullets, keyIdeas, commonConfusion } = parsed.data;

        // 2. Build compact input for LLM
        const bulletsText = bullets.map(b =>
            `Page ${b.page}: ${b.text}\nTakeaway: ${b.takeaway}`
        ).join("\n\n");

        let inputContent = `Study Content:\n${bulletsText}`;
        if (keyIdeas?.length) {
            inputContent += `\n\nKey Ideas: ${keyIdeas.join("; ")}`;
        }
        if (commonConfusion) {
            inputContent += `\n\nCommon Confusion: ${commonConfusion}`;
        }
        inputContent += `\n\nGenerate cloze questions for pages: ${pages.join(", ")}`;

        // 3. LLM call with retries
        let lastError: any = null;
        let questions: ClozeQuestion[] = [];

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            const result = await generateGeminiResponse({
                task: "practice_cloze",
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
                                    sentence: { type: "string" },
                                    choices: { type: "array", items: { type: "string" } },
                                    answerIndex: { type: "number" },
                                    explanation: { type: "string" },
                                    sourcePages: { type: "array", items: { type: "number" } },
                                    tag: { type: "string" }
                                },
                                required: ["sentence", "choices", "answerIndex", "explanation"]
                            }
                        }
                    },
                    required: ["questions"]
                },
                timeoutMs: 30000,
                temperature: attempt === 0 ? 0.7 : 0.5,  // Lower temp on retry
            });

            if (!result.ok) {
                lastError = result.error;
                continue;
            }

            // 4. Extract and normalize
            const rawData = typeof result.value === "string"
                ? extractJSON(result.value)
                : result.value;

            if (!rawData?.questions || !Array.isArray(rawData.questions)) {
                lastError = { message: "Invalid response structure" };
                continue;
            }

            // Normalize each question
            questions = rawData.questions
                .map((q: any) => normalizeClozeQuestion(q, docId || "", pages))
                .filter((q: any): q is ClozeQuestion => q !== null);

            // Validate we have enough questions
            if (questions.length >= 3) {
                break;  // Success!
            }

            lastError = { message: `Only ${questions.length} valid questions generated` };
        }

        // 5. Final validation
        if (questions.length < 3) {
            return NextResponse.json({
                error: "VALIDATION_ERROR",
                where: "response",
                message: `Generated ${questions.length} questions, need 3`,
                ...(process.env.NODE_ENV !== "production" && {
                    lastError: lastError?.message,
                    questions,  // Return partial for debugging
                }),
            }, { status: 502 });
        }

        // Limit to 12 questions
        questions = questions.slice(0, 3);

        console.log(`[API] Cloze practice: ${questions.length} questions in ${Date.now() - start}ms`);

        return NextResponse.json({
            questions,
            meta: {
                source: "gemini",
                totalMs: Date.now() - start,
                count: questions.length,
            }
        });

    } catch (error: any) {
        console.error("[API] Cloze error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
