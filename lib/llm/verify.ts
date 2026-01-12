import { z, ZodError } from "zod";
import { CornellCardSchema, FeedbackResponseSchema, OutputMeta } from "./schema";
import type { CornellCard, FeedbackResponse } from "@/types/learning";

export type VerifyResult<T> =
    | { ok: true; data: T; meta: OutputMeta }
    | { ok: false; errors: string[]; meta: OutputMeta };

/**
 * Validates data against a Zod schema
 */
export function validateWithSchema<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    startTime: number
): VerifyResult<T> {
    try {
        const validated = schema.parse(data);
        return {
            ok: true,
            data: validated,
            meta: {
                source: "llm",
                latencyMs: Date.now() - startTime,
            },
        };
    } catch (err) {
        if (err instanceof ZodError) {
            const errors = err.issues.map(
                (e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`
            );
            return {
                ok: false,
                errors,
                meta: {
                    source: "llm",
                    latencyMs: Date.now() - startTime,
                    validationErrors: errors,
                },
            };
        }
        return {
            ok: false,
            errors: [(err as Error).message],
            meta: {
                source: "llm",
                latencyMs: Date.now() - startTime,
                validationErrors: [(err as Error).message],
            },
        };
    }
}

/**
 * Validates a Cornell card from LLM output
 */
export function verifyCornellCard(
    data: unknown,
    startTime: number
): VerifyResult<CornellCard> {
    return validateWithSchema(data, CornellCardSchema, startTime);
}

/**
 * Validates feedback response from LLM output
 */
export function verifyFeedback(
    data: unknown,
    startTime: number
): VerifyResult<FeedbackResponse> {
    return validateWithSchema(data, FeedbackResponseSchema, startTime);
}

/**
 * Attempts to repair invalid LLM output by re-prompting with errors
 */
export function buildRepairPrompt(
    originalPrompt: string,
    invalidOutput: unknown,
    validationErrors: string[]
): string {
    return `The previous response was invalid. Please fix the following errors and return valid JSON:

ERRORS:
${validationErrors.map((e) => `- ${e}`).join("\n")}

ORIGINAL REQUEST:
${originalPrompt}

INVALID OUTPUT:
${JSON.stringify(invalidOutput, null, 2).slice(0, 500)}

Return ONLY valid JSON matching the required schema. No markdown, no extra text.`;
}

/**
 * Sanitizes output to remove potentially harmful content
 */
export function sanitizeOutput<T extends Record<string, unknown>>(data: T): T {
    // Remove any external links
    const urlPattern = /https?:\/\/[^\s]+/gi;

    function sanitizeValue(value: unknown): unknown {
        if (typeof value === "string") {
            return value.replace(urlPattern, "[link removed]");
        }
        if (Array.isArray(value)) {
            return value.map(sanitizeValue);
        }
        if (value && typeof value === "object") {
            return sanitizeObject(value as Record<string, unknown>);
        }
        return value;
    }

    function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeValue(value);
        }
        return sanitized;
    }

    return sanitizeObject(data) as T;
}

/**
 * Generates a unique ID for output tracking
 */
export function generateOutputId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `out-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
