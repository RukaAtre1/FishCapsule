import { NextRequest, NextResponse } from "next/server";
import { generateGeminiResponse } from "@/lib/llm/gemini";
import { Step4DiagnoseSchema } from "@/lib/llm/schema";

export const maxDuration = 45;

const SYSTEM_PROMPT = `Diagnose student struggles based on quiz performance.
Return a barrier tag, evidence, and a micro-plan.

Output format (JSON):
{
  "overallTag": "...",
  "evidence": ["Point 1"],
  "microPlan": ["Next step 1"],
  "reviewPlan": [{ "day": 1, "task": "..." }]
}
`;

export async function POST(req: NextRequest) {
    const start = Date.now();
    try {
        const body = await req.json();
        const { results } = body; // { question, isCorrect, barrierTag }

        const inputContent = results.map((r: any) => `Q: ${r.question} | Correct: ${r.isCorrect} | Tag: ${r.barrierTag}`).join("\n");

        const result = await generateGeminiResponse({
            task: "step4_diagnose",
            systemInstruction: SYSTEM_PROMPT,
            contents: [{ role: "user", parts: [{ text: `Results:\n${inputContent}` }] }],
            jsonMode: true,
            responseSchema: {
                type: "object",
                properties: {
                    overallTag: { type: "string", enum: ["Concept", "Mechanics", "Transfer", "Communication"] },
                    evidence: { type: "array", items: { type: "string" } },
                    microPlan: { type: "array", items: { type: "string" } },
                    reviewPlan: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                in: { type: "string", enum: ["1d", "3d", "7d"] }
                            },
                            required: ["in"]
                        }
                    }
                },
                required: ["overallTag", "evidence", "microPlan", "reviewPlan"]
            },
            timeoutMs: 30000,
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error.message }, { status: 500 });
        }

        const parsed = Step4DiagnoseSchema.safeParse(result.value);
        if (!parsed.success) {
            return NextResponse.json({ error: "Schema validation failed" }, { status: 422 });
        }

        console.log(`[API] Step 4 Diagnose complete in ${Date.now() - start}ms (Model: ${result.meta.model})`);
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
