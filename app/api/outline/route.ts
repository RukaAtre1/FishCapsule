import { NextRequest, NextResponse } from "next/server";
import { callGLM } from "@/lib/llm/glm";
import { OutlineResponseSchema } from "@/lib/llm/schema";
import { z } from "zod";

export const maxDuration = 120; // Allow 120s for slow LLM responses

const SYSTEM_PROMPT = `You are a curriculum expert.
Your goal is to parse raw syllabus text into a structured JSON course outline.
Return JSON ONLY. No markdown formatting. No preamble.

Structure:
{
  "outline": [
    {
      "lectureId": "lec-1",
      "week": "Week 1",
      "date": "2024-01-01",
      "title": "Introduction...",
      "topics": ["Topic A", "Topic B"],
      "deliverables": ["HW1"],
      "readings": ["Ch 1"]
    }
  ]
}

- Group by lecture.
- Generate stable IDs (lec-1, lec-2...).
- Extract dates if present.
- Limit to major lectures.
`;

// ... imports

export async function POST(req: NextRequest) {
    const start = Date.now();
    try {
        const body = await req.json();
        const { syllabusText, courseTitle } = body;

        if (!syllabusText) {
            return NextResponse.json({ error: "Missing syllabus text" }, { status: 400 });
        }

        const messages = [
            { role: "system" as const, content: SYSTEM_PROMPT },
            {
                role: "user" as const,
                content: `Course Title: ${courseTitle || "Unknown"}\n\nSyllabus:\n${syllabusText}`,
            },
        ];

        const result = await callGLM(messages, "glm-4.5-flash", { timeoutMs: 90000 });

        if (!result.ok) {
            console.error("GLM Error:", result.error);
            return NextResponse.json({
                error: result.error.message,
                meta: {
                    source: "fallback",
                    latencyMs: Date.now() - start,
                    failStage: "timeout" // or network_error, simplified
                }
            }, { status: 500 });
        }

        const parsed = OutlineResponseSchema.safeParse(result.value);

        if (!parsed.success) {
            console.error("Validation Error:", parsed.error);
            return NextResponse.json({
                error: "Schema validation failed",
                details: parsed.error.issues,
                meta: {
                    source: "fallback",
                    latencyMs: Date.now() - start,
                    failStage: "schema",
                    validationErrors: parsed.error.issues.map(i => i.message)
                }
            }, { status: 422 });
        }

        return NextResponse.json({
            outline: parsed.data.outline,
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
                failStage: "parse"
            }
        }, { status: 500 });
    }
}
