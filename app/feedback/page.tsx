"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MicroDrill from "../components/MicroDrill";
import TypeIn from "../components/ui/TypeIn";
import Skeleton from "../components/ui/Skeleton";
import Shell from "../components/Shell";
import { copy } from "@/lib/copy/en";
import { loadAttempts, loadSession, saveFeedbackResult } from "@/lib/learning/storage";
import type { AttemptLog, FeedbackResponse } from "@/types/learning";
import { barrierMapping } from "../utils/barrierMapping";

function FeedbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") || "";
  const conceptId = searchParams.get("conceptId") || "";

  const [attempts, setAttempts] = useState<AttemptLog[]>([]);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [microDrillDone, setMicroDrillDone] = useState(false);
  const [conceptTitle, setConceptTitle] = useState<string>("");

  useEffect(() => {
    setError(null);
    setFeedback(null);
    setMicroDrillDone(false);

    if (!sessionId || !conceptId) {
      setLoading(false);
      return;
    }

    const loaded = loadSession(sessionId);
    const concept = loaded?.concepts.find((c) => c.id === conceptId) || null;
    setConceptTitle(concept?.title ?? "");
    const attemptList = loadAttempts(sessionId, conceptId);
    setAttempts(attemptList);

    if (!attemptList.length) {
      setLoading(false);
      return;
    }

    const conceptNotes =
      loaded?.cards?.[conceptId]?.summary ||
      (loaded?.cards?.[conceptId]?.notes ?? []).join(" ") ||
      "";
    const cached = loaded?.feedback?.[conceptId];
    if (cached) {
      setFeedback(cached);
      setMicroDrillDone(!!cached.microDrillDone);
    }

    const fetchFeedback = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            conceptId,
            conceptTitle: concept?.title,
            attempts: attemptList,
            conceptNotes
          })
        });
        if (!res.ok) {
          const text = await res.text();
          try {
            const parsed = JSON.parse(text);
            throw new Error(parsed?.error?.message || text || copy.feedback.error);
          } catch {
            throw new Error(text || copy.feedback.error);
          }
        }
        const data = (await res.json()) as FeedbackResponse;
        const merged = { ...data, microDrillDone: cached?.microDrillDone || data.microDrillDone };
        setFeedback(merged);
        saveFeedbackResult(sessionId, conceptId, merged);
      } catch (err) {
        setError((err as Error).message || copy.feedback.error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [conceptId, sessionId]);

  const mappedBarrier = useMemo(() => {
    if (!feedback) return null;
    return barrierMapping[feedback.barrier];
  }, [feedback]);

  const showRetestButton = useMemo(() => {
    if (!feedback?.retestPlan) return false;
    return true;
  }, [feedback]);

  const handleRetest = () => {
    router.push(`/practice?session=${sessionId}&conceptId=${conceptId}&redo=1`);
  };

  const handleDrillComplete = () => {
    if (!feedback) return;
    const updated = { ...feedback, microDrillDone: true };
    setFeedback(updated);
    setMicroDrillDone(true);
    if (sessionId && conceptId) {
      saveFeedbackResult(sessionId, conceptId, updated);
    }
  };

  if (!sessionId || !conceptId) {
    return (
      <Shell>
        <div className="flex min-h-screen flex-col gap-4">
          <p className="text-slate-300">{copy.feedback.missingParams}</p>
          <button className="btn-secondary w-fit" onClick={() => router.push("/")}>
            {copy.common.backToHome}
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex min-h-screen flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-slate-400">
          {copy.common.session} {sessionId}
        </p>
        <h1 className="text-3xl font-semibold text-white">
          {copy.feedback.titlePrefix} {conceptTitle || copy.practice.placeholderConcept}
        </h1>
        <p className="text-sm text-slate-400">
          {copy.feedback.attemptsNote.replace("{count}", attempts.length.toString())}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            className="btn-glass"
            onClick={() => router.push(`/learn/${conceptId}?session=${sessionId}`)}
          >
            {copy.feedback.backToConcept}
          </button>
        </div>
      </header>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {attempts.length === 0 ? (
        <section className="glass-card space-y-3">
          <h2 className="text-lg font-semibold text-white">{copy.feedback.noAttemptsTitle}</h2>
          <p className="text-slate-300">{copy.feedback.noAttemptsBody}</p>
          <button
            className="btn-primary w-fit"
            onClick={() => router.push(`/practice?session=${sessionId}&conceptId=${conceptId}`)}
          >
            {copy.feedback.goPractice}
          </button>
        </section>
      ) : loading && !feedback ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : feedback ? (
        <div className="space-y-4">
          <section className="glass-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">{copy.feedback.diagnosisTitle}</h2>
              <span className="chip">
                {mappedBarrier?.name || feedback.barrier}
              </span>
            </div>
            <TypeIn
              lines={[
                `${mappedBarrier?.description ?? ""}`,
                feedback.evidence
              ].filter(Boolean)}
              className="space-y-1 text-sm text-slate-300"
            />
          </section>

          <section className="glass-card space-y-3">
            <h3 className="text-lg font-semibold text-white">{copy.feedback.tacticsTitle}</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {feedback.tactics.map((tactic, idx) => (
                <div key={idx} className="surface-card space-y-1">
                  <p className="text-sm font-semibold text-white">{tactic.title}</p>
                  <p className="text-sm text-slate-300">{tactic.description}</p>
                </div>
              ))}
            </div>
          </section>

          {feedback.microDrill ? (
            <section className="glass-card space-y-3">
              <h3 className="text-lg font-semibold text-white">{copy.feedback.microDrillTitle}</h3>
              <MicroDrill
                task={feedback.microDrill.task}
                hint={feedback.microDrill.hint}
                answer={feedback.microDrill.answer}
                onComplete={handleDrillComplete}
              />
            </section>
          ) : null}

          <section className="glass-card space-y-3">
            <h3 className="text-lg font-semibold text-white">{copy.feedback.retestTitle}</h3>
            <p className="text-slate-300">{feedback.retestPlan}</p>
            {showRetestButton ? (
              <button
                className="btn-primary w-fit"
                onClick={handleRetest}
                disabled={!microDrillDone}
              >
                {microDrillDone ? copy.feedback.retestReady : copy.feedback.retestLocked}
              </button>
            ) : null}
          </section>
        </div>
      ) : (
        <p className="text-slate-300">{copy.feedback.loadingFeedback}</p>
      )}
      </div>
    </Shell>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <div className="mx-auto max-w-6xl p-6 text-sm">{copy.feedback.loadingFeedback}</div>
        </div>
      }
    >
      <FeedbackContent />
    </Suspense>
  );
}
