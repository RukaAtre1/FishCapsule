
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";

/**
 * GET /api/debug/models
 * Lists available models for the configured API key.
 * Protected by secret key for production safety.
 */
export async function GET(req: NextRequest) {
    const debugKey = req.headers.get("X-Debug-Key");
    const isDev = process.env.NODE_ENV === "development";

    // Simple guard: only allow in dev or with secret header
    if (!isDev && debugKey !== env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        if (!env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "API Key missing in env" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        // Note: listModels is a discovery method in the SDK
        // We use it to see which models the current key can actually 'see'

        // Use the native fetch for listing if SDK doesn't expose it directly in a clean way 
        // or just use the SDK if it's there.
        // Actually, the SDK has listModels.

        // For debugging, we'll try to reach the endpoint directly if SDK version is unclear
        const baseUrl = "https://generativelanguage.googleapis.com/v1beta";
        const url = `${baseUrl}/models?key=${env.GEMINI_API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        return NextResponse.json({
            ok: true,
            models: data.models || [],
            source: "discovery_api"
        });

    } catch (error: any) {
        return NextResponse.json({
            ok: false,
            error: error.message
        }, { status: 500 });
    }
}
