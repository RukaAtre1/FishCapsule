import { NextResponse } from "next/server";
import type { AttemptLog, BarrierAssessment, BarrierId } from "@/types/learning";
import { buildActionsForBarriers } from "@/lib/learning/barriers";

function analyzeBarriers(attempts: AttemptLog[]): {
  barriers: { id: BarrierId; evidence: string[]; severity: "low" | "medium" | "high" }[];
  strongPoints: string[];
  weakPoints: string[];
} {
  const total = attempts.length;
  const correctCount = attempts.filter((a) => a.correct).length;
  const accuracy = total === 0 ? 0 : correctCount / total;
  const mcq = attempts.filter((a) => a.type === "mcq");
  const short = attempts.filter((a) => a.type === "short");

  const barriers: { id: BarrierId; evidence: string[]; severity: "low" | "medium" | "high" }[] =
    [];
  const strongPoints: string[] = [];
  const weakPoints: string[] = [];

  if (accuracy >= 0.6) {
    strongPoints.push("Solid overall accuracy so far.");
  } else {
    weakPoints.push("Overall accuracy needs work.");
  }

  const blankShort = short.filter((a) => !a.userAnswer || a.userAnswer.trim().length < 3);
  if (blankShort.length > 0) {
    barriers.push({
      id: "retrieval_gap",
      evidence: [`${blankShort.length} short answers were blank or very short.`],
      severity: "medium"
    });
    weakPoints.push("Struggled to recall details without cues.");
  }

  const mcqAccuracy = mcq.length ? mcq.filter((a) => a.correct).length / mcq.length : 0;
  const shortAccuracy = short.length ? short.filter((a) => a.correct).length / short.length : 0;

  if (total > 0 && accuracy < 0.5) {
    barriers.push({
      id: "concept_confusion",
      evidence: ["Less than half of attempts were correct."],
      severity: "high"
    });
    weakPoints.push("Core idea may be unclear.");
  }

  if (mcq.length > 1 && mcqAccuracy < 0.5) {
    barriers.push({
      id: "misconception",
      evidence: ["MCQ responses frequently chose incorrect options."],
      severity: "medium"
    });
  }

  if (mcqAccuracy >= 0.6 && shortAccuracy < 0.5 && short.length > 0) {
    barriers.push({
      id: "application_gap",
      evidence: ["Recognizes choices but short answers miss application details."],
      severity: "medium"
    });
    weakPoints.push("Needs practice applying the idea in explanations.");
  }

  const verboseWrong = short.filter((a) => !a.correct && (a.userAnswer?.length ?? 0) > 80);
  if (verboseWrong.length > 0) {
    barriers.push({
      id: "precision_issue",
      evidence: ["Long answers missed key conditions or qualifiers."],
      severity: "low"
    });
  }

  const lowConfidence = attempts.filter((a) => a.confidence === "low");
  if ((lowConfidence.length > 0 && total < 4) || total <= 2) {
    barriers.push({
      id: "confidence_block",
      evidence: ["Few attempts logged and confidence marked low."],
      severity: "medium"
    });
    weakPoints.push("Confidence may be limiting practice volume.");
  }

  if (barriers.length === 0) {
    barriers.push({
      id: "retrieval_gap",
      evidence: ["Limited signals detected; defaulting to retrieval practice guidance."],
      severity: "low"
    });
  }

  if (strongPoints.length === 0) {
    strongPoints.push("Shows willingness to attempt the questions.");
  }
  if (weakPoints.length === 0) {
    weakPoints.push("Keep practicing to surface clearer signals.");
  }

  return { barriers, strongPoints, weakPoints };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const conceptId: string = body.conceptId;
    const conceptTitle: string = body.conceptTitle;
    const attempts: AttemptLog[] = Array.isArray(body.attempts) ? body.attempts : [];
    const sessionId: string = attempts[0]?.sessionId ?? "unknown-session";

    if (!conceptId || !conceptTitle) {
      return NextResponse.json(
        { ok: false, error: { code: "bad_request", message: "conceptId and conceptTitle are required." } },
        { status: 400 }
      );
    }

    const { barriers, strongPoints, weakPoints } = analyzeBarriers(attempts);
    const barrierIds = barriers.map((b) => b.id);
    const recommendedNextActions = buildActionsForBarriers(barrierIds);

    const assessment: BarrierAssessment = {
      sessionId,
      conceptId,
      conceptTitle,
      summary:
        attempts.length === 0
          ? `No attempts yet for ${conceptTitle}. Start with quick checks.`
          : `Detected ${barriers.length} barrier(s) for ${conceptTitle}; focus on targeted drills.`,
      strongPoints,
      weakPoints,
      topBarriers: barriers,
      recommendedNextActions
    };

    return NextResponse.json({ ok: true, data: { assessment } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "server_error", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
