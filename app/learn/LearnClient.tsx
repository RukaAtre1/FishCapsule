"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StudySession } from "@/types/learning";
import { loadSession } from "@/lib/learning/storage";

export default function LearnClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") || "";
  const [session, setSession] = useState<StudySession | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const loaded = loadSession(sessionId);
    setSession(loaded ?? null);
    setChecked(true);
  }, [sessionId]);

  if (!sessionId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-4 py-10">
        <p className="text-slate-300">Missing session id. Go back to start.</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-4 py-10">
        <p className="text-slate-300">
          {checked ? "Session not found in this browser." : "Loading session..."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-slate-400">Session {session.sessionId}</p>
        <h1 className="text-2xl font-semibold text-white">
          {session.courseTitle || "Study Concepts"}
        </h1>
        <p className="text-sm text-slate-400">Choose a concept to open a Cornell card.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {session.concepts.map((concept) => (
          <button
            key={concept.id}
            className="card text-left transition hover:border-emerald-500/60 hover:shadow-emerald-500/10"
            onClick={() => router.push(`/learn/${concept.id}?session=${sessionId}`)}
          >
            <h3 className="text-lg font-semibold text-white">{concept.title}</h3>
            <p className="mt-1 text-sm text-slate-300">{concept.description}</p>
          </button>
        ))}
      </div>
    </main>
  );
}
