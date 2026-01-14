import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json({
        ok: true,
        hasZaiKey: !!env.ZAI_API_KEY,
        model: env.GLM_MODEL,
        timestamp: new Date().toISOString()
    });
}
