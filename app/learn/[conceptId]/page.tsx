"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LearnCard from "../../components/learn/LearnCard";
import TypeIn from "../../components/ui/TypeIn";
import Skeleton from "../../components/ui/Skeleton";
import Shell from "../../components/Shell";
import { copy } from "@/lib/copy/en";
import type { ConceptRef, CornellCard, StudySession } from "@/types/learning";
import { cacheCard, loadAttempts, loadSession } from "@/lib/learning/storage";
import { computeDueStatus, dueLabel } from "@/lib/learning/review";

type Props = { params: { conceptId: string } };

type CardMeta = { source?: "llm" | "fallback"; generationId?: string };

export default function ConceptPage({ params }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") || "";
  const conceptId = params.conceptId;

  const [session, setSession] = useState<StudySession | null>(null);
  const [concept, setConcept] = useState<ConceptRef | null>(null);
  const [card, setCard] = useState<CornellCard | null>(null);
  const [cardMeta, setCardMeta] = useState<CardMeta | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const loaded = loadSession(sessionId);
    if (loaded) {
      setSession(loaded);
      const concepts = loaded.concepts ?? [];
      const found = concepts.find((c) => c.id === conceptId) || null;
      setConcept(found);
      if (loaded.cards?.[conceptId]) {
        setCard(loaded.cards[conceptId]);
      }
      const existingAttempts = loadAttempts(sessionId, conceptId);
      setAttemptCount(existingAttempts.length);
    }
    setChecked(true);
  }, [sessionId, conceptId]);

  const fetchCard = async (opts?: { force?: boolean }) => {
    if (!session || !concept) return;
    const isForce = opts?.force ?? false;
    setLoadingCard(true);
    setError(null);
    const controller = new AbortController();
    const timeoutMs = isForce ? 30000 : 15000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch("/api/cornell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          conceptId: concept.id,
          conceptTitle: concept.title,
          context: session.context,
          force: isForce,
          regenerateNonce: Date.now()
        })
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || copy.concept.generateError);
      }
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message || copy.concept.generateError);
      }
      const nextCard: CornellCard = json.data.card;
      setCard(nextCard);
      setCardMeta(json.data.meta ?? null);
      cacheCard(session.sessionId, conceptId, nextCard);
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError") {
        setError(copy.practice.timeout);
      } else {
        setError(e.message);
      }
    } finally {
      clearTimeout(timeout);
      setLoadingCard(false);
    }
  };

  useEffect(() => {
    if (!card && session && concept) {
      fetchCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, concept]);

  const headerSummary = useMemo(
    () => (card ? [card.summary] : []),
    [card]
  );

  if (!sessionId || !conceptId) {
    return (
      <Shell>
        <div className="flex min-h-screen flex-col gap-4">
          <p className="text-[color:var(--muted)]">{copy.concept.missingParams}</p>
          <button className="btn-secondary w-fit" onClick={() => router.push("/")}>
            {copy.common.backToHome}
          </button>
        </div>
      </Shell>
    );
  }

  if (!concept || !session) {
    return (
      <Shell>
        <div className="flex min-h-screen flex-col gap-4">
          <p className="text-[color:var(--muted)]">
            {checked ? copy.concept.notFound : copy.common.loading}
          </p>
          <button className="btn-secondary w-fit" onClick={() => router.push(`/learn?session=${sessionId}`)}>
            {copy.common.backToConcepts}
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex min-h-screen flex-col gap-7 pb-8">
        <div className="glass-card flex flex-col gap-4 border border-[color:var(--border)]/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
              <button
                className="btn-glass px-3 py-1 text-xs"
                onClick={() => router.push(`/learn?session=${sessionId}`)}
              >
                {copy.common.backToConcepts}
              </button>
              <span className="text-[color:var(--muted)]">/</span>
              <span className="text-[color:var(--text)]">{concept.title}</span>
            </div>
            <span className="badge">
              {copy.concept.sourceLabel}{" "}
              {cardMeta?.source ? (cardMeta.source === "llm" ? copy.concept.sourceLLM : copy.concept.sourceFallback) : "..."}
            </span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-[color:var(--muted)]">
                {copy.common.session} {session.sessionId}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)]">{concept.title}</h1>
              <p className="text-sm text-[color:var(--muted)]">{concept.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-glass"
                onClick={() => fetchCard({ force: true })}
                disabled={loadingCard}
              >
                {loadingCard ? copy.concept.regenerating : copy.concept.regenerate}
              </button>
              <button
                className="btn-primary"
                onClick={() => router.push(`/practice?session=${sessionId}&conceptId=${conceptId}`)}
              >
                {copy.common.startPractice}
              </button>
            </div>
          </div>
          {loadingCard && !card ? <div className="skeleton h-4 w-64" /> : null}
          {headerSummary.length ? <TypeIn lines={headerSummary} className="text-[color:var(--muted)]" /> : null}
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.75fr_1fr]">
          <div className="space-y-4">
            <section className="glass-card text-sm text-[color:var(--muted)]">
              <h2 className="text-base font-semibold text-[color:var(--text)]">{copy.concept.cardBasicsTitle}</h2>
              <p className="mt-1 text-[color:var(--muted)]">{copy.concept.cardBasicsIntro}</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-[color:var(--muted)]">
                {copy.concept.cardBasicsSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>

            {card ? (
              <LearnCard card={card} />
            ) : (
              <div className="space-y-3">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass-card sticky top-28 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[color:var(--muted)]">{copy.common.attempts}</span>
                <span className="chip text-sm">{attemptCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[color:var(--muted)]">{copy.practice.dueLabel}</span>
                <span className="chip text-sm">
                  {dueLabel(computeDueStatus(session.review?.[conceptId] ?? null))}
                </span>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  className="btn-primary"
                  onClick={() => router.push(`/practice?session=${sessionId}&conceptId=${conceptId}`)}
                >
                  {copy.common.startPractice}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => router.push(`/feedback?session=${sessionId}&conceptId=${conceptId}`)}
                >
                  {copy.common.viewFeedback}
                </button>
              </div>
            </div>
            {loadingCard ? <Skeleton className="h-24 w-full" /> : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}
