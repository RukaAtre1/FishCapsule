import { NextRequest, NextResponse } from "next/server";
import { callGLM } from "@/lib/llm/glm";
import { SlideExplainResponseSchema, SlideExplainSchema } from "@/lib/llm/schema";
import { z } from "zod";
import crypto from "crypto";

export const maxDuration = 60;

// Input validation schema
const RequestSchema = z.object({
    sessionId: z.string().min(1),
    lectureId: z.string().min(1),
    pages: z.union([
        z.object({ start: z.number().int().min(1), end: z.number().int().min(1) }),
        z.array(z.number().int().min(1)).min(1).max(5),
    ]),
    chunks: z.array(z.object({
        page: z.number().int().min(1),
        chunkId: z.string().min(1),
        text: z.string().min(1),
    })).min(1).max(50),
    mode: z.enum(["explain", "keypoints", "quiz"]).optional().default("explain"),
});

// Generate stable chunk ID from text
function generateChunkId(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);
}

const SYSTEM_PROMPT = `You are an expert teaching assistant that explains lecture slides clearly.

Given slide content, generate a comprehensive explanation in JSON format.

Structure:
{
  "slideExplain": {
    "lectureId": "<provided>",
    "pages": [<page numbers>],
    "titleGuess": "Best guess for slide title/topic",
    "keyPoints": ["Point 1", "Point 2", ...],
    "whyItMatters": ["Reason 1", "Reason 2", ...],
    "examAngles": ["How this might appear on exams..."],
    "commonMistakes": ["Mistake 1", "Mistake 2", ...],
    "quickCheck": {
      "question": "A quick question to test understanding",
      "choices": ["A", "B", "C", "D"],
      "answer": "B",
      "explanation": "Why B is correct..."
    },
    "citations": [
      { "page": 1, "chunkId": "<hash>", "snippet": "relevant text..." }
    ]
  }
}

Rules:
- Return ONLY valid JSON, no markdown
- Include 3-7 key points
- Include 2-3 reasons why this matters
- Include 2-3 exam angles
- Include 2-3 common mistakes
- Citations MUST reference the provided chunk IDs
- Keep snippets under 100 characters`;

export async function POST(req: NextRequest) {
    const start = Date.now();

    try {
        const body = await req.json();

        // Validate input
        const parsed = RequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: "Invalid request",
                details: parsed.error.issues,
                meta: {
                    source: "fallback",
                    latencyMs: Date.now() - start,
                    failStage: "validation",
                }
            }, { status: 400 });
        }

        const { sessionId, lectureId, pages, chunks, mode } = parsed.data;

        // Enforce 5-page limit (PRD requirement)
        const pageCount = Array.isArray(pages)
            ? pages.length
            : (pages.end - pages.start + 1);

        if (pageCount > 5) {
            return NextResponse.json({
                error: "Page range exceeds limit of 5 pages",
                meta: {
                    source: "fallback",
                    latencyMs: Date.now() - start,
                    failStage: "validation",
                }
            }, { status: 400 });
        }

        // Build context from chunks
        const slideContent = chunks
            .map(c => `[Page ${c.page}, ID: ${c.chunkId}]\n${c.text}`)
            .join("\n\n---\n\n");

        const messages = [
            { role: "system" as const, content: SYSTEM_PROMPT },
            {
                role: "user" as const,
                content: `Lecture ID: ${lectureId}
Pages: ${JSON.stringify(pages)}
Mode: ${mode}

Slide Content:
${slideContent}

Generate a detailed explanation.`,
            },
        ];

        const result = await callGLM(messages, "glm-4.5-flash", { timeoutMs: 50000 });

        if (!result.ok) {
            console.error("GLM Error:", result.error);
            return NextResponse.json({
                error: result.error.message,
                code: result.error.code,
                meta: {
                    source: "fallback",
                    latencyMs: Date.now() - start,
                    failStage: result.error.code === "timeout" ? "timeout" : "network",
                }
            }, { status: 500 });
        }

        // Validate response schema
        const validated = SlideExplainResponseSchema.safeParse(result.value);

        if (!validated.success) {
            console.error("Schema validation failed:", validated.error.issues);

            // Attempt repair with stricter prompt
            const repairMessages = [
                { role: "system" as const, content: "Fix this JSON to match the schema. Return ONLY valid JSON." },
                { role: "user" as const, content: JSON.stringify(result.value) },
            ];

            const repairResult = await callGLM(repairMessages, "glm-4.5-flash", { timeoutMs: 20000 });

            if (repairResult.ok) {
                const revalidated = SlideExplainResponseSchema.safeParse(repairResult.value);
                if (revalidated.success) {
                    return NextResponse.json({
                        ...revalidated.data,
                        meta: {
                            source: "repaired",
                            latencyMs: Date.now() - start,
                        }
                    });
                }
            }

            // Return fallback
            return NextResponse.json({
                error: "Schema validation failed",
                details: validated.error.issues.slice(0, 5),
                meta: {
                    source: "fallback",
                    latencyMs: Date.now() - start,
                    failStage: "schema",
                    validationErrors: validated.error.issues.map(i => i.message),
                }
            }, { status: 422 });
        }

        return NextResponse.json({
            ...validated.data,
            meta: {
                source: "llm",
                latencyMs: Date.now() - start,
            }
        });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({
            error: error.message,
            meta: {
                source: "fallback",
                latencyMs: Date.now() - start,
                failStage: "parse",
            }
        }, { status: 500 });
    }
}
