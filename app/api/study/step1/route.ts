import { NextRequest, NextResponse } from "next/server";
import { generateGeminiResponse } from "@/lib/llm/gemini";
import { Step1ExplainSchema } from "@/lib/llm/schema";
import { z } from "zod";

export const maxDuration = 60; // Increased for batch processing

const SYSTEM_PROMPT = `You are an expert tutor. Create simple, engaging explanations for the provided slide pages.
Keep each explanation short and conversational.

Output format (JSON Array):
[
  {
    "page": number,
    "plain": "Simple explanation, no jargon",
    "example": "Relatable real-world example",
    "takeaway": "One-sentence core concept"
  }
]
`;

// New Request Schema for Batching
const BatchRequestSchema = z.object({
    pages: z.array(z.number()),
    pageTexts: z.record(z.string(), z.string()), // page -> text
    ocrTexts: z.record(z.string(), z.string()).optional(),
    context: z.string().optional(),
});

export async function POST(req: NextRequest) {
    const start = Date.now();
    try {
        const body = await req.json();

        // Validate Input
        const parsed = BatchRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid request format", details: parsed.error.issues }, { status: 400 });
        }

        const { pages, pageTexts, ocrTexts, context } = parsed.data;

        if (pages.length === 0) {
            return NextResponse.json([]); // Nothing to do
        }

        // Construct Prompt with all pages
        // We'll map each page to a labeled section
        const pagesContent = pages.map(page => {
            const text = pageTexts[page] || "";
            const ocr = ocrTexts?.[page] || "";
            return `[[Page ${page}]]\nText: ${text}\nOCR: ${ocr}`;
        }).join("\n\n----------------\n\n");

        const inputContent = `
Context: ${context || "N/A"}

Requests:
${pagesContent}

Please generate explanations for ALL listed pages.
`;

        const result = await generateGeminiResponse({
            task: "step1_explain", // Use the new task routing
            systemInstruction: SYSTEM_PROMPT,
            contents: [{ role: "user", parts: [{ text: inputContent }] }],
            jsonMode: true,
            responseSchema: {
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
            timeoutMs: 50000,
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

        // Validate Response is Array of Step1Explain
        const ResponseArraySchema = z.array(Step1ExplainSchema);
        const parsedOutput = ResponseArraySchema.safeParse(result.value);

        if (!parsedOutput.success) {
            console.error("Step 1 Batch Validation Error:", parsedOutput.error);
            return NextResponse.json({ error: "Schema validation failed for batch response", details: parsedOutput.error.issues }, { status: 422 });
        }

        console.log(`[API] Step 1 Batch (${pages.length} pages) complete in ${Date.now() - start}ms (Model: ${result.meta.model})`);

        // Return logic: We return the array directly
        return NextResponse.json({
            results: parsedOutput.data,
            meta: {
                source: "gemini",
                totalMs: Date.now() - start,
                attempts: result.meta.attempts,
                model: result.meta.model
            }
        });

    } catch (error: any) {
        console.error("Step 1 API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
