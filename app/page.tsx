"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ConceptRef, StudySession } from "@/types/learning";
import { createSessionId, saveSession } from "@/lib/learning/storage";

const sampleContext = `# Module 1: Signals and Noise
- Distinguish signal vs. noise in metrics and logs
- Common traps: cherry-picking windows, ignoring baselines
- Quick audit checklist: time window, segment, comparison

# Module 2: Model Lifecycle Basics
• Framing a question, defining success metrics
• Data readiness review: leakage checks, missing data patterns
• Monitoring drift and feedback loops after launch

# Module 3: Communicating Findings
1) Lead with the decision and risk trade-offs
2) Visual cues: before/after, thresholds, uncertainty bands
3) Anti-patterns: burying assumptions, unclear next steps`;

export default function HomePage() {
  const router = useRouter();
  const [courseTitle, setCourseTitle] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    if (!context.trim()) {
      setError("Please paste a syllabus or notes first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseTitle, context })
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Failed to generate concepts.");
      }
      const concepts: ConceptRef[] = json.data.concepts;
      const sessionId = createSessionId();
      const session: StudySession = {
        sessionId,
        courseTitle: courseTitle.trim() || undefined,
        context,
        concepts,
        createdAt: Date.now(),
        cards: {}
      };
      saveSession(session);
      router.push(`/learn?session=${sessionId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = () => {
    setCourseTitle("Applied Analytics Bootcamp");
    setContext(sampleContext);
  };

  const handleClear = () => {
    setCourseTitle("");
    setContext("");
    setError(null);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-white">AI Self-Study Capsule</h1>
        <p className="text-sm text-slate-400">
          Paste your syllabus or notes, generate concepts, then drill with Cornell cards and quick
          checks. All data stays in your browser.
        </p>
      </header>

      <section className="card space-y-4">
        <div className="grid gap-3">
          <label className="text-sm text-slate-300">
            Course Title (optional)
            <input
              className="input mt-1"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="e.g., Introduction to Data Analytics"
            />
          </label>
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Syllabus / Notes
            <textarea
              className="input mt-1 min-h-[260px] resize-none"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Paste headings, bullets, and key points here..."
            />
          </label>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate Concepts"}
          </button>
          <button className="btn-secondary" onClick={handleLoadSample} disabled={loading}>
            Load Sample
          </button>
          <button className="btn-secondary" onClick={handleClear} disabled={loading}>
            Clear
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold text-white">How it works</h2>
        <ol className="mt-2 space-y-2 text-sm text-slate-300">
          <li>1) Paste your syllabus or notes.</li>
          <li>2) Generate concepts and open one to view a Cornell card.</li>
          <li>3) Answer quick checks and save attempts.</li>
          <li>4) View feedback to see barriers and suggested tactics.</li>
        </ol>
      </section>
    </main>
  );
}
