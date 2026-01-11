"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PracticeTabs from "../components/practice/PracticeTabs";
import StickyActionBar from "../components/practice/StickyActionBar";
import HintsPanel from "../components/practice/HintsPanel";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import Shell from "../components/Shell";
import { copy } from "@/lib/copy/en";
import { cacheCard, loadAttempts, loadSession, appendAttempt } from "@/lib/learning/storage";
import { computeDueStatus, dueLabel, updateReviewStateOnAttempt } from "@/lib/learning/review";
import { generatePracticeVariant, variantLadderOptions } from "@/lib/learning/practice";
import type { AttemptLog, CornellCard, QuickCheckQuestion } from "@/types/learning";

function PracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const sessionId = searchParams.get("session") || "";
  const conceptId = searchParams.get("conceptId") || "";
  const mode = (searchParams.get("mode") as "default" | "review") || "default";
  const redo = searchParams.get("redo");

  const [card, setCard] = useState<CornellCard | null>(null);
  const [conceptTitle, setConceptTitle] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>("");
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confidence, setConfidence] = useState<number | "">("");
  const [ladder, setLadder] = useState<"fix_bug" | "write_guard" | "edge_case">("fix_bug");

  useEffect(() => {
    setError(null);
    if (!sessionId || !conceptId) return;
    const session = loadSession(sessionId);
    if (!session) {
      setError(copy.practice.sessionMissing);
      return;
    }
    setConceptTitle(session.concepts.find((c) => c.id === conceptId)?.title ?? "");
    const attempts = loadAttempts(sessionId, conceptId);
    setAttemptCount(attempts.length);

    const storedCard = session.cards?.[conceptId];
    if (storedCard) {
      setCard(storedCard);
      return;
    }

    const fetchCard = async () => {
      setLoadingCard(true);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch("/api/cornell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conceptId,
            conceptTitle: session.concepts.find((c) => c.id === conceptId)?.title,
            context: session.context
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok) {
          throw new Error(copy.practice.loadError);
        }
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message || copy.practice.loadError);
        setCard(json.data.card as CornellCard);
        cacheCard(sessionId, conceptId, json.data.card as CornellCard);
      } catch (err) {
        const e = err as Error;
        setError(e.message === "AbortError" ? copy.practice.timeout : e.message);
      } finally {
        clearTimeout(timeout);
        setLoadingCard(false);
      }
    };

    fetchCard();
  }, [conceptId, sessionId]);

  useEffect(() => {
    if (redo) {
      setAnswers({});
      setConfidence("");
      setShowAnswer(false);
      setShowHint(false);
    }
  }, [redo, conceptId]);

  const { questions, variant } = useMemo(() => {
    if (!card) return { questions: [] as QuickCheckQuestion[], variant: {} };
    return generatePracticeVariant(card, attemptCount, mode, ladder);
  }, [card, attemptCount, mode, ladder]);

  useEffect(() => {
    if (questions[0]) {
      setActiveTab(questions[0].id);
    }
  }, [questions]);

  const dueStatus = useMemo(() => {
    const session = sessionId ? loadSession(sessionId) : null;
    if (!session) return "not_started";
    const state = session.review?.[conceptId] ?? null;
    return computeDueStatus(state);
  }, [conceptId, sessionId]);

  const activeIndex = useMemo(
    () => questions.findIndex((q) => q.id === activeTab),
    [questions, activeTab]
  );

  const progressPct = useMemo(() => {
    if (!questions.length) return 0;
    const idx = activeIndex >= 0 ? activeIndex : 0;
    return Math.round(((idx + 1) / questions.length) * 100);
  }, [activeIndex, questions.length]);

  const gradeAnswer = (question: QuickCheckQuestion, value: string) => {
    if (question.type === "mcq") {
      return value.trim() === question.answer.trim();
    }
    const normalizedUser = value.toLowerCase();
    const normalizedAnswer = question.answer.toLowerCase();
    return normalizedUser.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedUser);
  };

  const handleSave = async () => {
    if (!card || !activeTab) return;
    const question = questions.find((q) => q.id === activeTab);
    if (!question) return;
    setSaving(true);
    const value = answers[question.id] ?? "";
    const correct = gradeAnswer(question, value);
    const attempt: AttemptLog = {
      sessionId,
      conceptId,
      conceptTitle,
      questionId: question.id,
      type: question.type,
      correct,
      userAnswer: value,
      expectedAnswer: question.answer,
      createdAt: Date.now(),
      confidence: confidence === "" ? undefined : confidence,
      variant
    };
    appendAttempt(attempt);
    updateReviewStateOnAttempt(sessionId, conceptId, attempt);
    setAttemptCount((prev) => prev + 1);
    addToast(copy.toast.saved, "success");
    setTimeout(() => {
      router.push(`/feedback?session=${sessionId}&conceptId=${conceptId}`);
    }, 400);
    setSaving(false);
  };

  if (!sessionId || !conceptId) {
    return (
      <Shell>
        <div className="flex min-h-screen flex-col gap-4">
          <p className="text-[color:var(--muted)]">{copy.practice.missingParams}</p>
          <button className="btn-secondary w-fit" onClick={() => router.push("/")}>
            {copy.practice.backHome}
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex min-h-screen flex-col gap-6 pb-32 pt-4">
        <div className="glass-card flex flex-col gap-4 border border-[color:var(--border)]/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                <button className="btn-glass px-3 py-1 text-xs" onClick={() => router.back()}>
                  {copy.common.back}
                </button>
                <span className="text-[color:var(--muted)]">/</span>
                <button
                  className="text-[color:var(--accent)] hover:text-[color:var(--text)]"
                  onClick={() => router.push(`/learn?session=${sessionId}`)}
                >
                  {copy.practice.breadcrumbConcepts}
                </button>
                <span className="text-[color:var(--muted)]">/</span>
                <span className="text-[color:var(--text)]">{conceptTitle || copy.practice.placeholderConcept}</span>
              </div>
              <h1 className="text-3xl font-semibold text-[color:var(--text)]">{conceptTitle || copy.practice.practiceTitle}</h1>
              {mode === "review" ? (
                <p className="mt-1 text-xs text-amber-300">{copy.practice.scheduledReview}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="chip">
                {copy.common.attempts}: {attemptCount}
              </span>
              <span className="chip">{dueLabel(dueStatus)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--surface2)]/80">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent2)] transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-[color:var(--text)]">{progressPct}%</span>
            <span className="chip text-[11px]">
              {copy.practice.ladderLabel} {variantLadderOptions().find((opt) => opt.id === ladder)?.label}
            </span>
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </div>

        {loadingCard ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : null}

        {card ? (
          <div className="grid gap-5 lg:grid-cols-[1.8fr_1fr]">
            <div className="space-y-4">
              <section className="glass-card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">{copy.practice.practiceTitle}</p>
                    <h2 className="text-lg font-semibold text-[color:var(--text)]">{copy.practice.practiceTitle}</h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                    <span>{copy.practice.ladderLabel}</span>
                    {variantLadderOptions().map((opt) => (
                      <button
                        key={opt.id}
                        className={`rounded-full border px-3 py-1 transition ${
                          ladder === opt.id
                            ? "border-[color:var(--accent)]/70 bg-[color:var(--accent)]/18 text-[color:var(--text)]"
                            : "border-[color:var(--border)] bg-[color:var(--surface2)]/80 text-[color:var(--muted)] hover:border-[color:var(--accent)]/60 hover:text-[color:var(--text)]"
                        }`}
                        onClick={() => setLadder(opt.id)}
                        type="button"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <PracticeTabs
                  questions={questions}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  answers={answers}
                  onAnswerChange={(id, val) => setAnswers((prev) => ({ ...prev, [id]: val }))}
                  showHint={showHint}
                  showAnswer={showAnswer}
                />
              </section>
            </div>

            <div className="space-y-3">
              <HintsPanel card={card} open={showHint} onToggle={() => setShowHint((v) => !v)} />
            </div>
          </div>
        ) : null}

        <StickyActionBar
          confidence={confidence}
          onConfidenceChange={(val) => setConfidence(val as number | "")}
          onSave={handleSave}
          onShowHint={() => setShowHint(true)}
          onRevealAnswer={() => setShowAnswer(true)}
          canShowHint={!!questions.find((q) => q.id === activeTab)?.hints?.length}
          canRevealAnswer={!!questions.find((q) => q.id === activeTab)?.answer}
          saving={saving}
          saveDisabled={!activeTab}
        />
      </div>
    </Shell>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[color:var(--bg0)] text-[color:var(--text)]">
          <div className="mx-auto max-w-7xl p-6 text-sm">{copy.practice.loading}</div>
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
