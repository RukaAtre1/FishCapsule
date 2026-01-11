import { NextResponse } from "next/server";
import type { AttemptLog, FeedbackBarrierId, FeedbackResponse } from "@/types/learning";
import { barrierMapping, barrierTaxonomy } from "../../utils/barrierMapping";

const defaultModel = process.env.GLM_MODEL ?? "glm-4.5-flash";
const defaultBase = process.env.GLM_BASE_URL ?? "https://api.z.ai/api/paas/v4";

type ModelDiagnosis = { barrier?: FeedbackBarrierId; evidence?: string };

function safeBarrier(id: string | undefined, fallback: FeedbackBarrierId): FeedbackBarrierId {
  if (id && id in barrierMapping) {
    return id as FeedbackBarrierId;
  }
  return fallback;
}

function simpleDiagnose(attempts: AttemptLog[]): { barrier: FeedbackBarrierId; evidence: string } {
  if (!attempts.length) {
    return { barrier: "retrieval_gap", evidence: "No attempts found. Complete a quick check first." };
  }
  const correctCount = attempts.filter((a) => a.correct).length;
  const accuracy = attempts.length ? correctCount / attempts.length : 0;
  const latest = attempts[attempts.length - 1];
  if (accuracy === 1) {
    return { barrier: "none", evidence: "All attempts are correct; no clear barrier detected." };
  }
  if (!latest.correct && (!latest.userAnswer || latest.userAnswer.trim().length < 3)) {
    return { barrier: "retrieval_gap", evidence: "Latest answer was blank or very short; recall looks unstable." };
  }
  if (accuracy < 0.4) {
    return { barrier: "concept_confusion", evidence: "Accuracy below 40%; the core concept is likely blurred." };
  }
  if (!latest.correct && (latest.userAnswer?.length ?? 0) > 80) {
    return { barrier: "precision_issue", evidence: "Long answer missed key conditions; expression may be imprecise." };
  }
  if (accuracy >= 0.4 && accuracy < 0.7) {
    return { barrier: "application_gap", evidence: "Partial success with gaps; applying the steps may be the blocker." };
  }
  return { barrier: "retrieval_gap", evidence: "Answers miss keywords or steps; reinforce recall before retrying." };
}

function buildTaxonomyText() {
  return barrierTaxonomy
    .map((item) => `- ${item.id}: ${item.name} - ${item.description}`)
    .join("\n");
}

function parseModelContent(raw?: string | null): ModelDiagnosis | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const startIndex = Math.min(
    ...[trimmed.indexOf("{"), trimmed.indexOf("[")].filter((i) => i >= 0)
  );
  const candidate = startIndex >= 0 ? trimmed.slice(startIndex) : trimmed;
  try {
    return JSON.parse(candidate) as ModelDiagnosis;
  } catch {
    return null;
  }
}

async function callModel(messages: { role: "system" | "user"; content: string }[], timeoutMs = 10000) {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${defaultBase}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: defaultModel,
        temperature: 0.1,
        messages
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return null;
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content as string | undefined;
    return parseModelContent(content);
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name !== "AbortError") {
      console.error("feedback llm error:", (err as Error).message);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId: string | undefined = body.sessionId;
    const conceptId: string | undefined = body.conceptId;
    const conceptTitle: string | undefined = body.conceptTitle;
    const attempts: AttemptLog[] = Array.isArray(body.attempts) ? body.attempts : [];
    const conceptNotes: string | undefined = body.conceptNotes;

    if (!sessionId || !conceptId) {
      return NextResponse.json(
        { error: { code: "bad_request", message: "Missing sessionId or conceptId." } },
        { status: 400 }
      );
    }

    if (!attempts.length) {
      return NextResponse.json(
        { error: { code: "no_attempts", message: "No attempts provided. Complete a quick check first." } },
        { status: 400 }
      );
    }

    const latest = attempts[attempts.length - 1];
    const correctCount = attempts.filter((a) => a.correct).length;
    const accuracy = attempts.length ? Math.round((correctCount / attempts.length) * 100) : 0;
    const heuristic = simpleDiagnose(attempts);

    const taxonomy = buildTaxonomyText();
    const recentAttempts = attempts.slice(-3);
    const summaryAttempts = recentAttempts
      .map(
        (a, idx) =>
          `#${attempts.length - recentAttempts.length + idx + 1} ${a.type} - ${
            a.correct ? "correct" : "incorrect"
          } - answer: ${a.userAnswer}`
      )
      .join("\n");

    const messages = [
      {
        role: "system" as const,
        content:
          "You are a learning barrier diagnostician. Return JSON only in the format {\"barrier\":\"<id>\",\"evidence\":\"<one-line English rationale>\"}. " +
          'The barrier field must use one of the ids below; use "none" if no clear barrier. Do not return explanations outside JSON.\n' +
          "Barrier catalog:\n" +
          taxonomy
      },
      {
        role: "user" as const,
        content: `Concept: ${conceptTitle || conceptId}\nLatest answer: ${latest.userAnswer || "(empty)"}\nExpected answer: ${
          latest.expectedAnswer || "(not provided)"
        }\nConcept notes: ${conceptNotes || "not provided"}\nRecent accuracy: ${accuracy}%\nRecent attempts:\n${summaryAttempts}\nIdentify the main barrier id and a brief evidence sentence.`
      }
    ];

    const modelResult = await callModel(messages);
    const barrier = safeBarrier(modelResult?.barrier, heuristic.barrier);
    const mapping = barrierMapping[barrier] ?? barrierMapping[heuristic.barrier];
    const evidence = modelResult?.evidence?.trim() || heuristic.evidence;

    const result: FeedbackResponse = {
      barrier,
      barrierName: mapping.name,
      evidence,
      tactics: mapping.tactics,
      microDrill: mapping.microDrill,
      retestPlan: mapping.retestPlan
    };

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "server_error", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
