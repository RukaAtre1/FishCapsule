import { NextRequest, NextResponse } from "next/server";
import { generateGeminiResponse } from "@/lib/llm/gemini";
import { Step3QuizSchema } from "@/lib/llm/schema";

export const maxDuration = 45;

const SYSTEM_PROMPT = `Generate 3-5 quiz questions based on the study content.
Use "barrier tags" to classify what the question tests.

Output format (JSON):
{
  "questions": [
    {
       "id": "q1",
       "question": "...",
       "options": ["A", "B", "C", "D"],
       "answerIndex": 0,
       "explanation": "...",
       "barrierTag": "Concept" | "Mechanics" | "Transfer" | "Communication"
    }
  ]
}
`;

export async function POST(req: NextRequest) {
    const start = Date.now();
    try {
        const body = await req.json();
        const { keyIdeas, summaries } = body;

        const inputContent = `Key Ideas: ${keyIdeas?.join(", ")}\nSummaries: ${summaries?.map((s: any) => s.takeaway).join("; ")}`;

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
            return NextResponse.json({ error: result.error.message }, { status: 500 });
        }

        const parsed = Step3QuizSchema.safeParse(result.value);
        if (!parsed.success) {
            return NextResponse.json({ error: "Schema validation failed" }, { status: 422 });
        }

        console.log(`[API] Step 3 Quiz complete in ${Date.now() - start}ms (Model: ${result.meta.model})`);
        return NextResponse.json({
            ...parsed.data,
            meta: {
                source: "gemini",
                totalMs: Date.now() - start,
                attempts: result.meta.attempts,
                model: result.meta.model
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
