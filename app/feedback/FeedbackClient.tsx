"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AttemptLog, BarrierAssessment, ConceptRef, StudySession } from "@/types/learning";
import { loadAttempts, loadSession } from "@/lib/learning/storage";

export default function FeedbackClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") || "";
  const conceptId = searchParams.get("conceptId") || "";

  const [session, setSession] = useState<StudySession | null>(null);
  const [concept, setConcept] = useState<ConceptRef | null>(null);
  const [attempts, setAttempts] = useState<AttemptLog[]>([]);
  const [assessment, setAssessment] = useState<BarrierAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !conceptId) return;
    const loadedSession = loadSession(sessionId);
    const conceptMatch = loadedSession?.concepts.find((c) => c.id === conceptId) ?? null;
    setSession(loadedSession ?? null);
    setConcept(conceptMatch);
    const attemptsForConcept = loadAttempts(sessionId, conceptId);
    setAttempts(attemptsForConcept);
  }, [sessionId, conceptId]);

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!concept) return;
      if (attempts.length === 0) {
        setAssessment(null);
        return;
      }
      try {
        const res = await fetch("/api/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conceptId,
            conceptTitle: concept.title,
            attempts
          })
        });
        const json = await res.json();
        if (!json.ok) {
          throw new Error(json.error?.message || "Failed to load feedback.");
        }
        setAssessment(json.data.assessment);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    fetchAssessment();
  }, [concept, attempts, conceptId]);

  if (!sessionId || !conceptId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-4 py-10">
        <p className="text-slate-300">Missing session or concept id.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-slate-400">Session {sessionId}</p>
        <h1 className="text-2xl font-semibold text-white">
          Feedback for {concept?.title || "Concept"}
        </h1>
        <p className="text-sm text-slate-400">
          Attempts analyzed: {attempts.length}. Recommendations are heuristic and local.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => router.push(`/learn/${conceptId}?session=${sessionId}`)}
          >
            Back to concept
          </button>
        </div>
      </header>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {attempts.length === 0 ? (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold text-white">Get started</h2>
          <p className="text-slate-300">
            No attempts yet. Try 1 MCQ + 1 short answer, then return for diagnosis.
          </p>
          <button
            className="btn-primary w-fit"
            onClick={() => router.push(`/learn/${conceptId}?session=${sessionId}`)}
          >
            Go to Quick Check
          </button>
        </section>
      ) : assessment ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card space-y-3">
            <h2 className="text-lg font-semibold text-white">Summary</h2>
            <p className="text-slate-300">{assessment.summary}</p>
            <div>
              <h3 className="text-sm font-semibold text-white">Strong Points</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-300">
                {assessment.strongPoints.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Weak Points</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-300">
                {assessment.weakPoints.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="card space-y-3">
            <h2 className="text-lg font-semibold text-white">Barriers</h2>
            <ul className="space-y-2 text-slate-300">
              {assessment.topBarriers.map((barrier, idx) => (
                <li key={idx} className="rounded-lg bg-slate-800 px-3 py-2">
                  <p className="font-semibold text-white">
                    {barrier.id} - {barrier.severity}
                  </p>
                  <ul className="list-disc pl-4 text-sm">
                    {barrier.evidence.map((ev, j) => (
                      <li key={j}>{ev}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>

          <section className="card space-y-3 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white">Recommended Next Actions</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {assessment.recommendedNextActions.map((action, idx) => (
                <div key={idx} className="rounded-lg bg-slate-800 px-3 py-3 text-sm text-slate-200">
                  <p className="font-semibold text-white">{action.title}</p>
                  <p className="text-slate-400">{action.why}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {action.steps.map((step, j) => (
                      <li key={j}>{step}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <p className="text-slate-300">Loading feedback...</p>
      )}
    </main>
  );
}
