import { NextResponse } from "next/server";
import type { AttemptLog, FeedbackBarrierId, FeedbackResponse } from "@/types/learning";
import { barrierMapping, barrierTaxonomy } from "../../utils/barrierMapping";
import { generateGeminiResponse } from "@/lib/llm/gemini";

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

export async function POST(req: Request) {
  const start = Date.now();
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
          `#${attempts.length - recentAttempts.length + idx + 1} ${a.type} - ${a.correct ? "correct" : "incorrect"
          } - answer: ${a.userAnswer}`
      )
      .join("\n");

    const systemInstruction =
      "You are a learning barrier diagnostician. Return JSON only in the format {\"barrier\":\"<id>\",\"evidence\":\"<one-line English rationale>\"}. " +
      'The barrier field must use one of the ids below; use "none" if no clear barrier. Do not return explanations outside JSON.\n' +
      "Barrier catalog:\n" +
      taxonomy;

    const userContent = `Concept: ${conceptTitle || conceptId}\nLatest answer: ${latest.userAnswer || "(empty)"}\nExpected answer: ${latest.expectedAnswer || "(not provided)"
      }\nConcept notes: ${conceptNotes || "not provided"}\nRecent accuracy: ${accuracy}%\nRecent attempts:\n${summaryAttempts}\nIdentify the main barrier id and a brief evidence sentence.`;

    const result = await generateGeminiResponse<ModelDiagnosis>({
      task: "feedback",
      systemInstruction,
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      jsonMode: true,
      timeoutMs: 15000,
    });

    let modelResult: ModelDiagnosis | null = result.ok ? result.value : null;

    const barrier = safeBarrier(modelResult?.barrier, heuristic.barrier);
    const mapping = barrierMapping[barrier] ?? barrierMapping[heuristic.barrier];
    const evidence = modelResult?.evidence?.trim() || heuristic.evidence;

    const feedback: FeedbackResponse = {
      barrier,
      barrierName: mapping.name,
      evidence,
      tactics: mapping.tactics,
      microDrill: mapping.microDrill,
      retestPlan: mapping.retestPlan
    };

    return NextResponse.json(feedback, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "server_error", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
