import { NextResponse } from "next/server";
import type { ConceptRef } from "@/types/learning";
import { callGLM } from "@/lib/llm/glm";
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

    if (process.env.ZAI_API_KEY) {
      try {
        const messages = conceptMessages(courseTitle, context);
        const llm = await callGLM(messages, undefined, { timeoutMs: 12000 });
        if (llm.ok && llm.value?.concepts) {
          concepts = (llm.value.concepts as any[]).map((c) => {
            const title = (c?.title as string) || (c?.name as string) || "Concept";
            const description =
              (c?.description as string) || `From syllabus: ${title.slice(0, 80)}`;
            const id = c?.id ? slugify(String(c.id)) : slugify(title);
            return { id, title: title.trim(), description: description.trim() };
          });
        }
      } catch (err) {
        // fall through to deterministic fallback
        console.error("Concepts LLM fallback:", (err as Error).message);
      }
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
