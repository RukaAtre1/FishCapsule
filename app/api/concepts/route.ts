import { NextResponse } from "next/server";
import type { ConceptRef } from "@/types/learning";
import { generateGeminiResponse } from "@/lib/llm/gemini";
import { conceptMessages } from "@/lib/llm/prompts";
import { extractFallbackConcepts, slugify } from "@/lib/learning/extract";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const courseTitle: string | undefined = body.courseTitle;
    const context: string = body.context ?? "";

    if (!context || typeof context !== "string") {
      return NextResponse.json(
        { ok: false, error: { code: "bad_request", message: "Context is required." } },
        { status: 400 }
      );
    }

    let concepts: ConceptRef[] | null = null;

    try {
      const messages = conceptMessages(courseTitle, context);

      const geminiContents = messages.slice(1).map(m => ({
        role: m.role === "user" ? "user" as const : "model" as const,
        parts: [{ text: m.content }]
      }));

      const result = await generateGeminiResponse({
        systemInstruction: messages[0].content,
        contents: geminiContents,
        jsonMode: true,
        timeoutMs: 15000,
      });

      if (result.ok && result.value?.concepts) {
        concepts = (result.value.concepts as any[]).map((c) => {
          const title = (c?.title as string) || (c?.name as string) || "Concept";
          const description = (c?.description as string) || `From syllabus: ${title.slice(0, 80)}`;
          const id = c?.id ? slugify(String(c.id)) : slugify(title);
          return { id, title: title.trim(), description: description.trim() };
        });
      }
    } catch (err) {
      console.error("Concepts Gemini fallback:", (err as Error).message);
    }

    if (!concepts || concepts.length === 0) {
      concepts = extractFallbackConcepts(context, courseTitle);
    }

    return NextResponse.json({ ok: true, data: { concepts: concepts.slice(0, 12) } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "server_error", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
