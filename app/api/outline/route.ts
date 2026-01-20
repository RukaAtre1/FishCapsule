import { NextRequest, NextResponse } from "next/server";
import { generateGeminiResponse } from "@/lib/llm/gemini";
import { OutlineResponseSchema } from "@/lib/llm/schema";

export const maxDuration = 45;

const SYSTEM_PROMPT = `You are a curriculum expert. Parse the syllabus into a structured JSON course outline.
Return VALID JSON.

Structure:
{
  "outline": [
    {
      "lectureId": "lec-1",
      "week": "Topic/Week",
      "title": "Main Topic",
      "topics": ["Subtopic A", "Subtopic B"],
      "readings": ["Ch 1"],
      "deliverables": []
    }
  ]
}

RULES:
1. Extract 5-15 major lecture items.
2. Group related topics logically.
3. If no week/date is found, use 'Lec X'.
`;

export async function POST(req: NextRequest) {
    const start = Date.now();
    try {
        const body = await req.json();
        const { syllabusText, courseTitle } = body;

        if (!syllabusText) {
            return NextResponse.json({ error: "Missing syllabus text" }, { status: 400 });
        }

        console.log(`[Outline] Generating with Gemini for: ${courseTitle}`);

        const result = await generateGeminiResponse({
            systemInstruction: SYSTEM_PROMPT,
            contents: [
                { role: "user", parts: [{ text: `Course: ${courseTitle}\nSyllabus:\n${syllabusText}` }] }
            ],
            jsonMode: true,
            timeoutMs: 35000,
        });

        if (!result.ok) {
            return NextResponse.json({
                error: result.error.message,
                meta: {
                    totalMs: Date.now() - start,
                    attempts: result.meta.attempts,
                    timeout: result.meta.timeout,
                }
            }, { status: 500 });
        }

        const data = result.value;
        const parsed = OutlineResponseSchema.safeParse(data);

        if (!parsed.success) {
            console.error("Gemini Validation Error:", parsed.error.issues);
            return NextResponse.json({
                error: "Schema validation failed",
                details: parsed.error.issues,
                meta: {
                    totalMs: Date.now() - start,
                    attempts: result.meta.attempts,
                }
            }, { status: 422 });
        }

        return NextResponse.json({
            outline: parsed.data.outline,
            meta: {
                source: "gemini",
                model: result.meta.model,
                totalMs: Date.now() - start,
                attempts: result.meta.attempts,
            }
        });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({
            error: error.message,
            meta: { totalMs: Date.now() - start }
        }, { status: 500 });
    }
}
