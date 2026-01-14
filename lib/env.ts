/**
 * Centralized environment variable validation.
 * Ensures critical secrets are present before application runs.
 */
export const env = {
    // LLM Config
    ZAI_API_KEY: process.env.ZAI_API_KEY,
    GLM_MODEL: process.env.GLM_MODEL || "glm-4.5-flash",
    GLM_BASE_URL: process.env.GLM_BASE_URL || "https://api.z.ai/api/paas/v4",

    // Feature Flags (optional)
    DEBUG_MODE: process.env.NODE_ENV === "development",
};

/**
 * Validate required environment variables.
 * Throws an error if any required variables are missing.
 * Should be called at the start of API routes or app initialization.
 */
export function validateEnv() {
    const missing: string[] = [];

    if (!env.ZAI_API_KEY) {
        missing.push("ZAI_API_KEY");
    }

    if (missing.length > 0) {
        if (process.env.NODE_ENV === "production") {
            // In production, throw a generic error to avoid leaking details, 
            // but log the specific missing keys for Vercel logs.
            console.error(`[Server Config] Missing required env vars: ${missing.join(", ")}`);
            throw new Error("Server configuration error: Missing API credentials.");
        } else {
            // In dev, help the developer
            throw new Error(`Missing required env vars: ${missing.join(", ")}. Check your .env file.`);
        }
    }
}
