import { NextRequest, NextResponse } from "next/server";
import { generateGeminiResponse, GeminiMessage } from "@/lib/llm/gemini";
import { SlideExplainResponseSchema } from "@/lib/llm/schema";
import { z } from "zod";

export const maxDuration = 60;

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

const SYSTEM_PROMPT = `You are an expert teaching assistant that explains lecture slides clearly.
Generate a comprehensive explanation in JSON format.

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
- Include 3-7 key points, 2-3 reasons why it matters, 2-3 exam angles, 2-3 common mistakes.
- Citations MUST reference the provided chunk IDs.
- snippets under 100 chars.
`;

export async function POST(req: NextRequest) {
    const start = Date.now();
    try {
        const body = await req.json();
        const parsedInput = RequestSchema.safeParse(body);
        if (!parsedInput.success) {
            return NextResponse.json({ error: "Invalid request", details: parsedInput.error.issues }, { status: 400 });
        }

        const { lectureId, pages, chunks, mode } = parsedInput.data;
        const slideContent = chunks.map(c => `[Page ${c.page}, ID: ${c.chunkId}]\n${c.text}`).join("\n\n---\n\n");

        const result = await generateGeminiResponse({
            task: "slides_explain_batch",
            systemInstruction: SYSTEM_PROMPT,
            contents: [
                { role: "user", parts: [{ text: `Lecture ID: ${lectureId}\nPages: ${JSON.stringify(pages)}\nMode: ${mode}\n\nContent:\n${slideContent}` }] }
            ],
            jsonMode: true,
            timeoutMs: 45000,
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error.message }, { status: 500 });
        }

        const validated = SlideExplainResponseSchema.safeParse(result.value);
        if (!validated.success) {
            console.error("SlideExplain Validation Error:", JSON.stringify(validated.error.format(), null, 2));
            console.log("Raw Gemini Output:", JSON.stringify(result.value, null, 2));
            return NextResponse.json({
                error: "Schema validation failed",
                details: validated.error.issues
            }, { status: 422 });
        }

        return NextResponse.json({
            ...validated.data,
            meta: {
                source: "gemini",
                latencyMs: Date.now() - start,
                attempts: result.meta.attempts,
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
