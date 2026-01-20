import { NextResponse } from "next/server";
import type { CornellCard, QuickCheckQuestion } from "@/types/learning";
import { generateGeminiResponse } from "@/lib/llm/gemini";
import { cornellMessages } from "@/lib/llm/prompts";
import { keywordFrequency, pickPrimarySnippet, slugify } from "@/lib/learning/extract";
import crypto from "crypto";

function ensureQuickChecks(card: CornellCard, fallback: CornellCard) {
  const hasMcq = card.quickCheck.some((q) => q.type === "mcq");
  const hasShort = card.quickCheck.some((q) => q.type === "short");
  if (!hasMcq || !hasShort || card.quickCheck.length !== 3) {
    return fallback.quickCheck;
  }
  return card.quickCheck;
}

function buildFallbackCard(conceptId: string, conceptTitle: string, context: string): CornellCard {
  const snippet = pickPrimarySnippet(context, conceptTitle);
  const trimmedSnippet = snippet ? snippet.slice(0, 240) : context.slice(0, 200);
  const keywords = keywordFrequency(snippet || context).slice(0, 4).map((k) => k.term);
  const primaryTerm = keywords[0] || conceptTitle;

  const cues = [
    `What problem does ${conceptTitle} address on exams?`,
    `How do you spot ${conceptTitle} in prompts?`,
    `What step-by-step checklist applies to ${conceptTitle}?`,
    `Which bug shows up most with ${conceptTitle}?`,
    `How would you fix a mistake involving ${conceptTitle}?`
  ].slice(0, 5);

  const notes = [
    `From context: "${trimmedSnippet}"`,
    `Exam pattern: predict output involving ${primaryTerm} and explain one line.`,
    `Exam pattern: write or fix a small function using ${primaryTerm}.`,
    `Common bug: forgetting ${keywords[1] || "edge conditions"}; fix by adding a guard.`,
    `Common bug: mixing types near ${primaryTerm}; convert inputs first.`,
    `Checklist: read the prompt, underline data types, list preconditions, then code.`,
    `Checklist: run through inputs -> processing -> outputs for ${conceptTitle}.`,
    `Mini-example: for ${conceptTitle}:\nfor x in data:\n    if cond(x):\n        out.append(x)`,
    `Anchor terms: ${keywords.join(", ") || primaryTerm}`,
    `Why it matters: shows up in short coding and error-fix questions.`
  ].slice(0, 10);

  const summary = `Mastery means you can recognize ${conceptTitle} cues, apply a short checklist, and produce or fix 3-5 lines of code without missing edge cases.`;

  const misconceptions = [
    {
      misconception: `${conceptTitle} only needs the happy path.`,
      correction: `Include edge handling such as ${keywords[1] || "empty inputs or type checks"}.`
    },
    {
      misconception: `${conceptTitle} is separate from ${keywords[2] || "loops/conditions"}.`,
      correction: `It usually pairs with control flow; outline both before coding.`
    },
    {
      misconception: `Testing ${conceptTitle} is optional.`,
      correction: `Quickly test with one normal, one edge, one error-triggering case.`
    }
  ].slice(0, 3);

  const mcq: QuickCheckQuestion = {
    id: `${slugify(conceptId)}-mcq`,
    type: "mcq",
    prompt: `Which statement best matches ${conceptTitle} from the notes?`,
    choices: [
      `It emphasizes ${primaryTerm} with guard checks and clear outputs.`,
      `It skips edge cases and only covers the main path.`,
      `It avoids using ${keywords[1] || "control flow"} even when needed.`,
      `It focuses on styling rather than correctness.`
    ],
    answer: `It emphasizes ${primaryTerm} with guard checks and clear outputs.`,
    rubric: [`Mentions ${primaryTerm}`, "Includes guard/edge handling"],
    hints: [`Look for guard language in: "${trimmedSnippet}"`, "What keeps the code safe?"]
  };

  const short: QuickCheckQuestion = {
    id: `${slugify(conceptId)}-short`,
    type: "short",
    prompt: `In 2-3 sentences, explain ${conceptTitle} and when to apply it.`,
    answer: `Mention ${primaryTerm}, a checklist step, and one edge consideration from "${trimmedSnippet}"`,
    rubric: [
      `Includes ${primaryTerm}`,
      "Cites a checklist or step-by-step approach",
      "Mentions an edge case or guard"
    ],
    hints: [
      `Quote something from: "${trimmedSnippet}"`,
      "Add one edge case you would check first"
    ]
  };

  const microTask: QuickCheckQuestion = {
    id: `${slugify(conceptId)}-micro`,
    type: "short",
    prompt: `Write 3-5 lines showing ${conceptTitle} handling an edge case.`,
    answer: `Pseudo-code with guard then main logic, e.g.,\nif not data: return []\nfor x in data:\n    if cond(x): out.append(x)`,
    rubric: [
      "Includes a guard before main loop/logic",
      "Uses control flow to filter or handle cases",
      "Produces or returns a clear result"
    ],
    hints: [
      "Start with an early return for an edge case",
      "Use a loop or condition tied to the concept keywords"
    ]
  };

  return {
    conceptId,
    conceptTitle,
    cues,
    notes,
    summary,
    misconceptions,
    quickCheck: [mcq, short, microTask]
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const conceptId: string = body.conceptId;
    const conceptTitle: string = body.conceptTitle;
    const context: string = body.context ?? "";
    const force: boolean = !!body.force;

    if (!conceptId || !conceptTitle || !context) {
      return NextResponse.json(
        { ok: false, error: { code: "bad_request", message: "conceptId, conceptTitle, and context are required." } },
        { status: 400 }
      );
    }

    const fallbackCard = buildFallbackCard(conceptId, conceptTitle, context);

    // Use Gemini if Key is present
    try {
      const messages = cornellMessages(conceptId, conceptTitle, context);

      // Map to Gemini format
      const geminiContents = messages.slice(1).map(m => ({
        role: m.role === "user" ? "user" as const : "model" as const,
        parts: [{ text: m.content }]
      }));

      const result = await generateGeminiResponse({
        systemInstruction: messages[0].content,
        contents: geminiContents,
        jsonMode: true,
        timeoutMs: force ? 30000 : 20000,
      });

      if (result.ok && result.value?.card) {
        const raw = result.value.card;
        const card: CornellCard = {
          conceptId,
          conceptTitle,
          cues: raw.cues ?? [],
          notes: raw.notes ?? [],
          summary: raw.summary ?? "",
          misconceptions: raw.misconceptions ?? [],
          quickCheck: raw.quickCheck ?? []
        };

        const quickCheck = ensureQuickChecks(card, fallbackCard);
        const completedCard: CornellCard = {
          conceptId,
          conceptTitle,
          cues: card.cues.length ? card.cues : fallbackCard.cues,
          notes: card.notes.length ? card.notes : fallbackCard.notes,
          summary: card.summary || fallbackCard.summary,
          misconceptions: card.misconceptions.length
            ? card.misconceptions
            : fallbackCard.misconceptions,
          quickCheck
        };

        return NextResponse.json({
          ok: true,
          data: {
            card: completedCard,
            meta: {
              source: "gemini" as const,
              generationId: crypto.randomUUID()
            }
          }
        });
      }
    } catch (err) {
      console.error("Cornell Gemini fallback:", (err as Error).message);
    }

    return NextResponse.json({
      ok: true,
      data: {
        card: fallbackCard,
        meta: {
          source: "fallback" as const,
          reason: "Gemini unavailable or failed",
          generationId: crypto.randomUUID()
        }
      }
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "server_error", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
