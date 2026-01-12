import { NextRequest, NextResponse } from "next/server";
const pdf = require("pdf-parse");

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        console.log(`Processing file: ${file.name}, size: ${file.size}`);

        // Convert File to Buffer (Crucial Step)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse PDF
        const data = await pdf(buffer);

        return NextResponse.json({
            success: true,
            text: data.text,
            info: data.info,
            pages: data.numpages
        });
    } catch (error: any) {
        console.error("PDF Parse Error:", error);
        return NextResponse.json(
            { error: "Failed to parse PDF", details: error.message },
            { status: 500 }
        );
    }
}
