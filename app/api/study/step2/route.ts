import { NextRequest, NextResponse } from "next/server";
import { generateGeminiResponse } from "@/lib/llm/gemini";
import { Step2SynthesizeSchema } from "@/lib/llm/schema";

export const maxDuration = 45;

const SYSTEM_PROMPT = `You are a study assistant. Synthesize multiple page explanations into a coherent summary.
Identify key ideas and potential confusion.

Output format (JSON):
{
  "keyIdeas": ["Point 1", "Point 2"],
  "commonConfusion": "What students usually get wrong here",
  "examAngle": "How this might be tested"
}
`;

export async function POST(req: NextRequest) {
    const start = Date.now();
    try {
        const body = await req.json();
        const { summaries } = body;

        if (!summaries || !Array.isArray(summaries)) {
            return NextResponse.json({ error: "Missing summaries" }, { status: 400 });
        }

        const inputContent = summaries.map((s, i) => `Page ${s.page}: ${s.takeaway}`).join("\n");

        const result = await generateGeminiResponse({
            task: "step2_synthesize",
            systemInstruction: SYSTEM_PROMPT,
            contents: [{ role: "user", parts: [{ text: `Summaries:\n${inputContent}` }] }],
            jsonMode: true,
            responseSchema: {
                type: "object",
                properties: {
                    keyIdeas: { type: "array", items: { type: "string" }, maxItems: 5 },
                    commonConfusion: { type: "string" },
                    examAngle: { type: "string" }
                },
                required: ["keyIdeas", "commonConfusion", "examAngle"]
            },
            timeoutMs: 30000,
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error.message }, { status: 500 });
        }

        const parsed = Step2SynthesizeSchema.safeParse(result.value);
        if (!parsed.success) {
            return NextResponse.json({ error: "Schema validation failed" }, { status: 422 });
        }

        console.log(`[API] Step 2 Synthesize complete in ${Date.now() - start}ms (Model: ${result.meta.model})`);
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
