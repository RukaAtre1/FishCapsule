import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { env, validateEnv } from "@/lib/env";
import { ModelRouter } from "@/lib/ai/modelRouter";

// Types
export type GeminiMessage = {
    role: "user" | "model";
    parts: { text: string }[];
};

export type GeminiResult<T = any> = {
    ok: true;
    value: T;
    meta: {
        model: string;
        totalMs: number;
        attempts: number;
        stages?: Record<string, number>;
        cached?: boolean;
        task?: string;
    };
} | {
    ok: false;
    error: {
        code: string;
        message: string;
    };
    meta: {
        totalMs: number;
        attempts: number;
        timeout?: boolean;
    };
};

// Initialize Client
let genAI: GoogleGenerativeAI | null = null;

function getClient() {
    if (!genAI) {
        validateEnv();
        genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
    }
    return genAI;
}

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

/**
 * sleep for backoff
 */
const sleep = (ms: number) => new Uint8Array(ms).buffer; // Just a dummy way to wait if I had no sleep, but I'll use standard Task-like sleep if possible in JS or just a loop
// Actually, standard setTimeout wrapped in Promise
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Central Gemini Wrapper
 */
export async function generateGeminiResponse<T = any>(
    options: {
        task: import("@/lib/ai/modelRouter").AiTask; // NEW: Task required
        systemInstruction?: string;
        contents: GeminiMessage[];
        model?: string; // Optional override
        temperature?: number;
        maxOutputTokens?: number;
        jsonMode?: boolean;
        responseSchema?: any; // Zod schema or raw JSON schema for Gemini
        timeoutMs?: number;
        maxAttempts?: number;
    }
): Promise<GeminiResult<T>> {
    const startTotal = Date.now();
    const task = options.task;
    const maxAttempts = options.maxAttempts || 8; // Allow more attempts for switching models (3 per model * 2-3 models)
    const timeoutMs = options.timeoutMs || 40000;

    let attempts = 0;
    let lastError: any = null;
    let currentModel = "";

    const stages: Record<string, number> = {};

    while (attempts < maxAttempts) {
        const { model, isFallback } = ModelRouter.selectModel(task, attempts);
        currentModel = options.model || model; // Use override if provided

        attempts++;
        const attemptStart = Date.now();
        console.log(`[Gemini] Task="${task}" Attempt=${attempts} Model="${currentModel}" (Fallback=${isFallback})`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const client = getClient();
            const genModel = client.getGenerativeModel({
                model: currentModel,
                systemInstruction: options.systemInstruction,
                generationConfig: {
                    temperature: options.temperature ?? 0.2,
                    maxOutputTokens: options.maxOutputTokens,
                    responseMimeType: options.jsonMode ? "application/json" : "text/plain",
                    responseSchema: options.responseSchema,
                }
            });

            const result = await genModel.generateContent({
                contents: options.contents,
            }, { signal: controller.signal });

            clearTimeout(timeout);
            const response = await result.response;
            const text = response.text();

            stages[`attempt_${attempts}`] = Date.now() - attemptStart;

            if (options.jsonMode) {
                try {
                    const cleanJson = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
                    const value = JSON.parse(cleanJson);
                    return {
                        ok: true,
                        value: value as T,
                        meta: {
                            model: currentModel,
                            task,
                            totalMs: Date.now() - startTotal,
                            attempts,
                            stages,
                        }
                    };
                } catch (parseErr: any) {
                    throw new Error(`JSON parse failure: ${parseErr.message}`);
                }
            }

            return {
                ok: true,
                value: text as any as T,
                meta: {
                    model: currentModel,
                    task,
                    totalMs: Date.now() - startTotal,
                    attempts,
                    stages,
                }
            };

        } catch (err: any) {
            clearTimeout(timeout);
            lastError = err;
            const isTimeout = err.name === "AbortError";
            const isRetryable = isTimeout || (err.status >= 500) || err.status === 429 || err.message?.includes("overloaded");

            console.warn(`Gemini Attempt ${attempts}/${maxAttempts} failed:`, err.message);

            if (!isRetryable || attempts >= maxAttempts) {
                break;
            }

            if (!ModelRouter.isRetryableError(err) && attempts < maxAttempts) {
                // Even if not strictly retryable, if it's a "models not found" or weird error, maybe switching models helps?
                // But strictly, we check isRetryable.
                // Actually, if we haven't exhausted all models, we might want to try the next model even on 404/400?
                // No, 400 is bad request. 404 is model not found. 
                if (err.message.includes("not found") || err.status === 404) {
                    // Try next model immediately
                    console.warn(`[Gemini] Model ${currentModel} not found, skipping...`);
                    continue;
                }
                if (!ModelRouter.isRetryableError(err)) break;
            }

            // Calculate backoff
            const backoffMs = ModelRouter.getRetryDelay(attempts, err);
            console.log(`[Gemini] Error with ${currentModel}: ${err.message}. Retrying in ${Math.round(backoffMs)}ms...`);
            await delay(backoffMs);
        }
    }

    return {
        ok: false,
        error: {
            code: lastError?.name === "AbortError" ? "timeout" : "api_error",
            message: lastError?.message || "Unknown Gemini error",
        },
        meta: {
            totalMs: Date.now() - startTotal,
            attempts,
            timeout: lastError?.name === "AbortError",
        }
    };
}
