import { NextRequest, NextResponse } from "next/server";
import { generateGeminiResponse } from "@/lib/llm/gemini";
import { Step1ExplainSchema, Step2SynthesizeSchema, Step3QuizSchema, Step1Explain } from "@/lib/llm/schema";
import { z } from "zod";

export const maxDuration = 60;

// PRD v2.4: Updated system prompt for evidence-grounded, study-efficient output
const SYSTEM_PROMPT = `You are an elite study assistant creating Cornell-style notes optimized for active recall and exam preparation.

## OUTPUT REQUIREMENTS (PRD v2.4 — Evidence-Grounded)

### STEP 1: PER-PAGE NOTES (structured format)
For each page, generate:
- "core": 1 sentence capturing the central idea
- "mechanism": 2-3 bullet points explaining HOW it works
- "examTraps": 1-2 bullet points on common mistakes/exam pitfalls
- "example": (optional) 1 short concrete example
- "takeaway": A memorable phrase (≤14 words)
- "evidence": { "page": number, "snippet": "≤240 char excerpt QUOTED from source text" }
- "confidence": A number 0-1 representing how confident you are the evidence accurately supports the core idea (1.0 = exact quote found, 0.5 = paraphrased, 0.2 = inferred)
- "source_type": One of "text" | "table" | "figure" | "formula" — classify the primary content type of this page

### STEP 2: CUES (Q/A Recall Format)
Generate 4-6 retrieval cues. Each cue MUST be:
- "q": A question ending with "?" (forces active recall)
- "a": Short answer (≤8 words preferred)
- "page": Source page number
- "tag": One of "concept" | "mechanics" | "transfer" | "communication"

Example good cue:
{ "page": 3, "tag": "concept", "q": "What problem does bagging solve?", "a": "Reduces variance in unstable models" }

### STEP 3: SUMMARY (Review Card Format)
- "memorize": Exactly 3 bullets (core facts to remember)
- "examQs": Exactly 2 likely exam questions

OUTPUT FORMAT (STRICT JSON):
{
  "step1": [
    {
      "page": number,
      "core": "1-sentence main idea",
      "mechanism": ["How point 1", "How point 2"],
      "examTraps": ["Watch out for..."],
      "example": "Optional brief example",
      "takeaway": "≤14 words memorable phrase",
      "evidence": { "page": number, "snippet": "≤240 chars QUOTED from source" },
      "confidence": 0.9,
      "source_type": "text"
    }
  ],
  "step2": {
    "cues": [
      { "page": 1, "tag": "concept", "q": "Question?", "a": "Short answer" }
    ],
    "keyIdeas": ["Idea 1", "Idea 2", "Idea 3"],
    "commonConfusion": "What students often mix up",
    "examAngle": "How this appears on exams"
  },
  "step3": {
    "memorize": ["Fact 1", "Fact 2", "Fact 3"],
    "examQs": ["Likely exam question 1?", "Likely exam question 2?"]
  }
}

CRITICAL RULES:
- Cues must be QUESTIONS (end with ?)
- No repetition between pages
- Evidence snippets must be REAL EXCERPTS from the input text (≤240 chars). Do NOT fabricate.
- confidence must reflect actual grounding: 1.0 only if snippet is a direct quote
- source_type must match the page content type
- Summary is for quick review, not a repeat of notes
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
                    // Step 1: Per-page structured notes (PRD v2.3)
                    step1: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                page: { type: "number" },
                                core: { type: "string" },
                                mechanism: { type: "array", items: { type: "string" } },
                                examTraps: { type: "array", items: { type: "string" } },
                                example: { type: "string" },
                                takeaway: { type: "string" },
                                evidence: {
                                    type: "object",
                                    properties: {
                                        page: { type: "number" },
                                        snippet: { type: "string" }
                                    }
                                },
                                confidence: { type: "number" },
                                source_type: { type: "string", enum: ["text", "table", "figure", "formula"] }
                            },
                            required: ["page", "core", "mechanism", "examTraps", "takeaway"]
                        }
                    },
                    // Step 2: Cues (Q/A format) + synthesis (PRD v2.3)
                    step2: {
                        type: "object",
                        properties: {
                            cues: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        page: { type: "number" },
                                        tag: { type: "string", enum: ["concept", "mechanics", "transfer", "communication"] },
                                        q: { type: "string" },
                                        a: { type: "string" }
                                    },
                                    required: ["page", "tag", "q", "a"]
                                }
                            },
                            keyIdeas: { type: "array", items: { type: "string" }, maxItems: 5 },
                            commonConfusion: { type: "string" },
                            examAngle: { type: "string" }
                        },
                        required: ["cues", "keyIdeas", "commonConfusion", "examAngle"]
                    },
                    // Step 3: Summary card (PRD v2.3)
                    step3: {
                        type: "object",
                        properties: {
                            memorize: { type: "array", items: { type: "string" } },
                            examQs: { type: "array", items: { type: "string" } }
                        },
                        required: ["memorize", "examQs"]
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
        const warnings: string[] = [];

        // === Step 1 Validation & Normalization (PRD v2.4: Evidence-Grounded PageNote) ===
        type PageNoteV2 = {
            page: number;
            core: string;
            mechanism: string[];
            examTraps: string[];
            example?: string;
            takeaway: string;
            evidence?: { page: number; snippet: string };
            confidence?: number;
            source_type?: "text" | "table" | "figure" | "formula";
        };

        const VALID_SOURCE_TYPES = ["text", "table", "figure", "formula"] as const;

        const validStep1V2Helper = (item: any): PageNoteV2 | null => {
            try {
                if (typeof item.page !== 'number') return null;

                // Normalize source_type
                const rawSourceType = typeof item.source_type === 'string' ? item.source_type.toLowerCase() : null;
                const source_type = rawSourceType && VALID_SOURCE_TYPES.includes(rawSourceType as any)
                    ? rawSourceType as "text" | "table" | "figure" | "formula"
                    : undefined;

                // Normalize confidence
                const confidence = typeof item.confidence === 'number'
                    ? Math.max(0, Math.min(1, item.confidence))
                    : undefined;

                return {
                    page: item.page,
                    core: typeof item.core === 'string' ? item.core.substring(0, 300) :
                        (typeof item.plain === 'string' ? item.plain.substring(0, 300) : "Core concept"),
                    mechanism: Array.isArray(item.mechanism)
                        ? item.mechanism.slice(0, 3).map((s: any) => String(s).substring(0, 200))
                        : ["Key mechanism"],
                    examTraps: Array.isArray(item.examTraps)
                        ? item.examTraps.slice(0, 2).map((s: any) => String(s).substring(0, 200))
                        : ["Watch for common mistakes"],
                    example: typeof item.example === 'string' ? item.example.substring(0, 300) : undefined,
                    takeaway: typeof item.takeaway === 'string' ? item.takeaway.substring(0, 100) : "Key takeaway",
                    evidence: item.evidence && typeof item.evidence === 'object' ? {
                        page: typeof item.evidence.page === 'number' ? item.evidence.page : item.page,
                        snippet: typeof item.evidence.snippet === 'string'
                            ? item.evidence.snippet.substring(0, 240)
                            : ""
                    } : undefined,
                    confidence,
                    source_type,
                };
            } catch { return null; }
        };

        const rawStep1 = Array.isArray(data.step1) ? data.step1 : [];
        const normalizedStep1 = rawStep1.map(validStep1V2Helper).filter((x: PageNoteV2 | null): x is PageNoteV2 => x !== null);

        if (normalizedStep1.length === 0) {
            return NextResponse.json({
                error: "Step 1 failed: No valid notes generated",
                details: "LLM output for Step 1 was empty or malformed"
            }, { status: 422 });
        }

        if (normalizedStep1.length < rawStep1.length) {
            warnings.push(`step1_partial_loss: ${rawStep1.length - normalizedStep1.length} items dropped`);
        }

        // === Step 2 Validation & Normalization (PRD v2.3: Cues + Synthesis) ===
        type CueV2 = { page: number; tag: string; q: string; a: string };

        const VALID_TAGS = ["concept", "mechanics", "transfer", "communication"] as const;

        let normalizedCues: CueV2[] = [];
        let normalizedStep2: any = null;

        if (data.step2 && typeof data.step2 === 'object') {
            const s2 = data.step2;

            // Normalize cues (Q/A format)
            if (Array.isArray(s2.cues)) {
                normalizedCues = s2.cues.map((c: any) => {
                    const tag = VALID_TAGS.includes(c.tag?.toLowerCase()) ? c.tag.toLowerCase() : "concept";
                    const q = typeof c.q === 'string' ? c.q : "What is the key concept?";
                    return {
                        page: typeof c.page === 'number' ? c.page : 1,
                        tag,
                        q: q.endsWith('?') ? q : q + '?',  // Ensure question mark
                        a: typeof c.a === 'string' ? c.a.substring(0, 80) : "See notes",
                    };
                }).slice(0, 10);
            }

            normalizedStep2 = {
                cues: normalizedCues,
                keyIdeas: Array.isArray(s2.keyIdeas)
                    ? s2.keyIdeas.map((s: any) => String(s).substring(0, 300)).slice(0, 5)
                    : ["Key concepts analyzed"],
                commonConfusion: typeof s2.commonConfusion === 'string'
                    ? s2.commonConfusion.substring(0, 300)
                    : "No common confusion identified.",
                examAngle: typeof s2.examAngle === 'string'
                    ? s2.examAngle.substring(0, 300)
                    : "Focus on understanding core definitions.",
            };
        }

        if (!normalizedStep2) {
            warnings.push("step2_failed_missing");
        }

        // === Step 3 Normalization (PRD v2.3: Summary Card) ===
        type SummaryCard = { memorize: string[]; examQs: string[] };

        let step3Data: SummaryCard | null = null;

        try {
            if (data.step3 && typeof data.step3 === 'object') {
                const s3 = data.step3;

                // Normalize memorize bullets (exactly 3)
                let memorize = Array.isArray(s3.memorize)
                    ? s3.memorize.map((s: any) => String(s).substring(0, 200)).slice(0, 3)
                    : [];
                while (memorize.length < 3) {
                    memorize.push("Key fact to remember");
                }

                // Normalize exam questions (exactly 2)
                let examQs = Array.isArray(s3.examQs)
                    ? s3.examQs.map((s: any) => {
                        const q = String(s).substring(0, 200);
                        return q.endsWith('?') ? q : q + '?';
                    }).slice(0, 2)
                    : [];
                while (examQs.length < 2) {
                    examQs.push("What are the key concepts?");
                }

                step3Data = { memorize, examQs };
            }
        } catch (e: any) {
            warnings.push("step3_normalization_error");
            console.warn("[Batch] Step 3 normalization error:", e?.message || e);
        }

        // Fallback for step3
        if (!step3Data) {
            step3Data = {
                memorize: ["Key concept 1", "Key concept 2", "Key concept 3"],
                examQs: ["What is the main idea?", "How does this apply in practice?"]
            };
            warnings.push("step3_used_fallback");
        }

        console.log(`[API] Batch v2.3 complete in ${Date.now() - start}ms (warnings: ${warnings.length})`);

        return NextResponse.json({
            step1: normalizedStep1,
            step2: normalizedStep2,
            step3: step3Data,
            cues: normalizedCues,  // Also expose cues at top level for convenience
            warnings: warnings.length > 0 ? warnings : undefined,
            meta: {
                totalMs: Date.now() - start,
                model: result.meta.model,
                attempts: result.meta.attempts,
                version: "v2.4"
            }
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
