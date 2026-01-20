import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    // Read directly from process.env at request time (not from cached module)
    const hasZaiKey = !!process.env.ZAI_API_KEY;
    const model = process.env.GLM_MODEL || "glm-4.5-flash";

    // Log for Vercel debugging (only booleans, no secrets)
    console.log("[Health Check]", {
        hasZaiKey,
        hasGlmModel: !!process.env.GLM_MODEL,
        hasGlmBaseUrl: !!process.env.GLM_BASE_URL,
        nodeEnv: process.env.NODE_ENV
    });

    return NextResponse.json({
        ok: true,
        hasZaiKey,
        model,
        timestamp: new Date().toISOString()
    });
}
