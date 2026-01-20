
export type AiTask =
    | "step1_explain"
    | "step2_synthesize"
    | "step3_quiz"
    | "step4_diagnose"
    | "embedding";

interface ModelConfig {
    primary: string;
    fallbacks: string[];
}

// Default Model Configuration
// Using strings as requested in PRD v2.0
// Note: In a real scenario, ensure these models exist or are aliased in the SDK.
const MODEL_CONFIG: Record<AiTask, ModelConfig> = {
    "step1_explain": {
        primary: "gemini-2.5-flash-lite", // As requested. Fallback to 2.0 if this is future-dated.
        fallbacks: ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"]
    },
    "step2_synthesize": {
        primary: "gemini-2.5-flash",
        fallbacks: ["gemini-2.0-flash", "gemini-1.5-flash"]
    },
    "step3_quiz": {
        primary: "gemini-2.5-flash",
        fallbacks: ["gemini-2.0-flash", "gemini-1.5-flash"]
    },
    "step4_diagnose": {
        primary: "gemini-2.5-flash",
        fallbacks: ["gemini-2.0-flash", "gemini-1.5-flash"]
    },
    "embedding": {
        primary: "text-embedding-004",
        fallbacks: []
    }
};

export interface RouteResult {
    model: string;
    isFallback: boolean;
}

export class ModelRouter {
    static selectModel(task: AiTask, attemptIndex: number = 0): RouteResult {
        const config = MODEL_CONFIG[task];
        const allModels = [config.primary, ...config.fallbacks];

        // Strategy: 3 retries per model before switching
        const MAX_RETRIES_PER_MODEL = 3;

        const modelIndex = Math.floor(attemptIndex / MAX_RETRIES_PER_MODEL);

        if (modelIndex >= allModels.length) {
            // Exhausted all models, stick to the last one
            return { model: allModels[allModels.length - 1], isFallback: true };
        }

        return {
            model: allModels[modelIndex],
            isFallback: modelIndex > 0
        };
    }

    static getRetryDelay(attempt: number, error?: any): number {
        // Exponential backoff + Jitter
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        return baseDelay + jitter;
    }

    static isRetryableError(error: any): boolean {
        if (!error) return false;

        const status = error.status || error.statusCode;
        const msg = error.message?.toLowerCase() || "";

        // 429 Too Many Requests
        if (status === 429) return true;

        // 5xx Server Errors
        if (status >= 500) return true;

        // Overloaded / Timeout
        if (msg.includes("overloaded") || msg.includes("timeout") || msg.includes("deadline exceeded")) return true;
        if (error.name === "AbortError") return true; // Client timeout

        return false;
    }
}
