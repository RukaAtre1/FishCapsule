import { NextRequest, NextResponse } from "next/server";
import { generateGeminiResponse } from "@/lib/llm/gemini";
import { Step1ExplainSchema, Step2SynthesizeSchema, Step3QuizSchema } from "@/lib/llm/schema";
import { z } from "zod";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an elite study assistant. Your goal is to conduct a multi-step analysis of the provided study materials.

STEP 1: PER-PAGE EXPLANATION
For each provided page, create a short, conversational explanation. Use simple language and RELATABLE real-world examples.

STEP 2: SYNTHESIS
Identify the core 3-5 "Key Ideas" across all pages. Pinpoint a "Common Confusion" (what students miss) and an "Exam Angle" (how this will be tested).

STEP 3: QUIZ
Generate 3-5 high-quality quiz questions (MCQ) that test the concepts identified in Step 2. 
Each question must have exactly 4 choices and a clear "why" (explanation).
Tags: Concept, Mechanics, Transfer, Communication.

OUTPUT FORMAT (STRICT JSON):
{
  "step1": [
    {
      "page": number,
      "plain": "Simple explanation",
      "example": "Relatable example",
      "takeaway": "One-sentence core concept"
    }
  ],
  "step2": {
    "keyIdeas": ["Idea 1", "Idea 2", "Idea 3"],
    "commonConfusion": "...",
    "examAngle": "..."
  },
  "step3": {
    "questions": [
      {
        "id": "q1",
        "type": "mcq",
        "prompt": "...",
        "choices": ["A", "B", "C", "D"],
        "answer": "A",
        "why": "...",
        "tag": "Concept"
      }
    ]
  }
}
`;

const BatchRequestSchema = z.object({
    pages: z.array(z.number()),
    pageTexts: z.record(z.string(), z.string()),
    ocrTexts: z.record(z.string(), z.string()).optional(),
    context: z.string().optional(),
});

export async function POST(req: NextRequest) {
    const start = Date.now();
    try {
        const body = await req.json();
        const parsedBody = BatchRequestSchema.safeParse(body);
        if (!parsedBody.success) {
            return NextResponse.json({ error: "Invalid request", details: parsedBody.error.issues }, { status: 400 });
        }

        const { pages, pageTexts, ocrTexts, context } = parsedBody.data;
        const pagesContent = pages.map(page => {
            const text = pageTexts[page] || "";
            const ocr = ocrTexts?.[page] || "";
            return `[[Page ${page}]]\nText: ${text}\nOCR: ${ocr}`;
        }).join("\n\n----------------\n\n");

        const inputContent = `
Context: ${context || "N/A"}
Pages to Analyze: ${pages.join(", ")}

Content:
${pagesContent}

Generate Step 1, 2, and 3 content based on the above.
`;

        const result = await generateGeminiResponse({
            task: "batch_generation",
            systemInstruction: SYSTEM_PROMPT,
            contents: [{ role: "user", parts: [{ text: inputContent }] }],
            jsonMode: true,
            responseSchema: {
                type: "object",
                properties: {
                    step1: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                page: { type: "number" },
                                plain: { type: "string" },
                                example: { type: "string" },
                                takeaway: { type: "string" }
                            },
                            required: ["page", "plain", "example", "takeaway"]
                        }
                    },
                    step2: {
                        type: "object",
                        properties: {
                            keyIdeas: { type: "array", items: { type: "string" }, maxItems: 5 },
                            commonConfusion: { type: "string" },
                            examAngle: { type: "string" }
                        },
                        required: ["keyIdeas", "commonConfusion", "examAngle"]
                    },
                    step3: {
                        type: "object",
                        properties: {
                            questions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        type: { type: "string", enum: ["mcq"] },
                                        prompt: { type: "string" },
                                        choices: { type: "array", items: { type: "string" } },
                                        answer: { type: "string" },
                                        why: { type: "string" },
                                        tag: { type: "string", enum: ["Concept", "Mechanics", "Transfer", "Communication"] }
                                    },
                                    required: ["id", "type", "prompt", "choices", "answer", "why", "tag"]
                                }
                            }
                        },
                        required: ["questions"]
                    }
                },
                required: ["step1", "step2", "step3"]
            },
            timeoutMs: 55000,
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error.message }, { status: 500 });
        }

        const data = result.value;

        // Step 1 validation
        const validStep1 = z.array(Step1ExplainSchema).safeParse(data.step1);
        if (!validStep1.success) {
            return NextResponse.json({
                error: "Step 1 validation failed",
                details: validStep1.error.issues
            }, { status: 422 });
        }

        // Step 2 validation
        const validStep2 = Step2SynthesizeSchema.safeParse(data.step2);
        if (!validStep2.success) {
            return NextResponse.json({
                error: "Step 2 validation failed",
                details: validStep2.error.issues
            }, { status: 422 });
        }

        // Step 3 normalization (graceful degradation)
        let step3Data = null;
        try {
            const VALID_TAGS = ["Concept", "Mechanics", "Transfer", "Communication"] as const;
            const normalizedQuestions = (data.step3?.questions || []).map((q: any, idx: number) => {
                // Normalize tag
                let normalizedTag = "Concept";
                if (q.tag) {
                    const foundTag = VALID_TAGS.find(t => t.toLowerCase() === q.tag.toLowerCase());
                    if (foundTag) normalizedTag = foundTag;
                }
                // Normalize answer
                let normalizedAnswer = (q.answer || "").toString().trim().charAt(0).toUpperCase();
                // Truncate why
                const why = (q.why || "").toString().substring(0, 150);
                // Ensure choices array
                const choices = Array.isArray(q.choices) ? q.choices.slice(0, 4) : [];
                while (choices.length < 4) choices.push(`Option ${choices.length + 1}`);

                return {
                    id: q.id || `q${idx + 1}`,
                    type: "mcq",
                    prompt: (q.prompt || "").toString().trim(),
                    choices,
                    answer: normalizedAnswer,
                    why,
                    tag: normalizedTag,
                };
            });

            const validStep3 = Step3QuizSchema.safeParse({ questions: normalizedQuestions });
            if (validStep3.success) {
                step3Data = validStep3.data;
            } else {
                console.warn("[Batch] Step 3 validation failed after normalization:", validStep3.error.issues);
            }
        } catch (e) {
            console.warn("[Batch] Step 3 normalization error:", e);
        }

        console.log(`[API] Batch complete in ${Date.now() - start}ms (Step3: ${step3Data ? "ok" : "skipped"})`);

        return NextResponse.json({
            step1: validStep1.data,
            step2: validStep2.data,
            step3: step3Data,  // null if validation failed
            meta: {
                totalMs: Date.now() - start,
                model: result.meta.model,
                attempts: result.meta.attempts
            }
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
