"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AttemptLog,
  ConceptRef,
  CornellCard,
  QuickCheckQuestion,
  StudySession
} from "@/types/learning";
import {
  appendAttempt,
  cacheCard,
  loadAttempts,
  loadSession
} from "@/lib/learning/storage";

type Props = { params: { conceptId: string } };

export default function ConceptPage({ params }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") || "";
  const conceptId = params.conceptId;

  const [session, setSession] = useState<StudySession | null>(null);
  const [concept, setConcept] = useState<ConceptRef | null>(null);
  const [card, setCard] = useState<CornellCard | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [attemptCount, setAttemptCount] = useState(0);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const loaded = loadSession(sessionId);
    if (loaded) {
      setSession(loaded);
      const found = loaded.concepts.find((c) => c.id === conceptId) || null;
      setConcept(found);
      if (loaded.cards?.[conceptId]) {
        setCard(loaded.cards[conceptId]);
      }
      const existingAttempts = loadAttempts(sessionId, conceptId);
      setAttemptCount(existingAttempts.length);
    }
    setChecked(true);
  }, [sessionId, conceptId]);

  const fetchCard = async () => {
    if (!session || !concept) return;
    setLoadingCard(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/cornell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          conceptId: concept.id,
          conceptTitle: concept.title,
          context: session.context
        })
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to generate card.");
      }
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Failed to generate card.");
      }
      const nextCard: CornellCard = json.data.card;
      setCard(nextCard);
      cacheCard(session.sessionId, conceptId, nextCard);
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError") {
        setError("Request timed out (15s). Please retry; fallback will still work if the API is slow.");
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

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const gradeAnswer = (question: QuickCheckQuestion, value: string) => {
    if (question.type === "mcq") {
      return value.trim() === question.answer.trim();
    }
    const normalizedUser = value.toLowerCase();
    const normalizedAnswer = question.answer.toLowerCase();
    return normalizedUser.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedUser);
  };

  const handleSubmit = (question: QuickCheckQuestion) => {
    if (!session || !concept || !card) return;
    const value = answers[question.id] ?? "";
    const correct = gradeAnswer(question, value);
    const attempt: AttemptLog = {
      sessionId: session.sessionId,
      conceptId: concept.id,
      conceptTitle: concept.title,
      questionId: question.id,
      type: question.type,
      correct,
      userAnswer: value,
      expectedAnswer: question.answer,
      createdAt: Date.now()
    };
    appendAttempt(attempt);
    setAttemptCount((prev) => prev + 1);
    setResults((prev) => ({
      ...prev,
      [question.id]: correct ? "Correct" : "Try again"
    }));
  };

  const quickChecks = useMemo(() => card?.quickCheck ?? [], [card]);

  if (!sessionId || !conceptId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-4 py-10">
        <p className="text-slate-300">Missing session or concept. Go back to start.</p>
      </main>
    );
  }

  if (!concept || !session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-4 py-10">
        <p className="text-slate-300">
          {checked ? "Concept or session not found in this browser." : "Loading concept..."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Session {session.sessionId}</p>
          <h1 className="text-2xl font-semibold text-white">{concept.title}</h1>
          <p className="text-sm text-slate-300">{concept.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={fetchCard} disabled={loadingCard}>
            {loadingCard ? "Generating..." : "Regenerate card"}
          </button>
          <button
            className="btn-primary"
            onClick={() => router.push(`/feedback?session=${sessionId}&conceptId=${conceptId}`)}
          >
            Feedback
          </button>
        </div>
      </header>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {card ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Cues</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                {card.cues.map((cue, idx) => (
                  <li key={idx}>{cue}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Notes</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                {card.notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Summary</h2>
              <p className="mt-2 text-slate-300">{card.summary}</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Misconceptions</h2>
              <ul className="mt-2 space-y-2 text-slate-300">
                {card.misconceptions.map((item, idx) => (
                  <li key={idx} className="rounded-lg bg-slate-800 px-3 py-2">
                    <p className="text-sm font-semibold text-rose-300">Misconception: {item.misconception}</p>
                    <p className="text-sm text-emerald-200">Correction: {item.correction}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Quick Check</h2>
              <p className="text-xs text-slate-400">{attemptCount} attempts saved</p>
            </div>
            {quickChecks.map((question) => (
              <div key={question.id} className="rounded-lg bg-slate-800/60 p-3">
                <p className="font-medium text-white">{question.prompt}</p>
                {question.type === "mcq" ? (
                  <div className="mt-2 space-y-2">
                    {question.choices.map((choice, idx) => (
                      <label key={idx} className="flex cursor-pointer items-start gap-2 text-sm text-slate-200">
                        <input
                          type="radio"
                          className="mt-1 accent-emerald-500"
                          name={question.id}
                          value={choice}
                          checked={answers[question.id] === choice}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        />
                        <span>{choice}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="input mt-2 min-h-[90px]"
                    placeholder="Type your answer..."
                    value={answers[question.id] || ""}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  />
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button className="btn-primary" onClick={() => handleSubmit(question)}>
                    Save attempt
                  </button>
                  {results[question.id] && (
                    <span
                      className={`text-sm ${
                        results[question.id] === "Correct" ? "text-emerald-300" : "text-amber-300"
                      }`}
                    >
                      {results[question.id]}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  <p>Expected: {question.answer}</p>
                  {question.hints?.length ? <p>Hint: {question.hints[0]}</p> : null}
                </div>
              </div>
            ))}
          </section>
        </div>
      ) : (
        <p className="text-slate-300">{loadingCard ? "Generating card..." : "No card yet."}</p>
      )}
    </main>
  );
}
