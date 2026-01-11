"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy/en";
import type { ConceptRef, StudySession } from "@/types/learning";
import { createSessionId, saveSession } from "@/lib/learning/storage";
import Skeleton from "./components/ui/Skeleton";
import { useToast } from "./components/ui/Toast";
import AppShell from "./components/AppShell";

const sampleContext = `# Module 1: Signals and Noise
- Distinguish signal vs. noise in metrics and logs
- Common traps: cherry-picking windows, ignoring baselines
- Quick audit checklist: time window, segment, comparison

# Module 2: Model Lifecycle Basics
- Framing a question, defining success metrics
- Data readiness review: leakage checks, missing data patterns
- Monitoring drift and feedback loops after launch

# Module 3: Communicating Findings
1) Lead with the decision and risk trade-offs
2) Visual cues: before/after, thresholds, uncertainty bands
3) Anti-patterns: burying assumptions, unclear next steps`;

export default function HomePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [courseTitle, setCourseTitle] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    if (!context.trim()) {
      setError(copy.home.missingContext);
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
      addToast(copy.toast.saved, "success");
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
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300/80">
          {copy.common.learn} / {copy.common.practice} / {copy.common.feedback}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">{copy.home.title}</h1>
        <p className="max-w-2xl text-base leading-relaxed text-slate-300">{copy.home.subtitle}</p>
        <div className="grid gap-3 text-sm text-slate-300">
          {copy.home.trust.map((item) => (
            <div key={item} className="inline-flex items-center gap-2 text-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
              {item}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
            {copy.home.heroCta}
          </button>
          <button className="btn-secondary" onClick={handleLoadSample} disabled={loading}>
            {copy.home.heroSubCta}
          </button>
        </div>
        </section>

        <section className="surface-card-strong space-y-5">
        <div className="grid gap-3">
          <label className="text-sm text-slate-200">
            {copy.home.courseLabel}
            <input
              className="input mt-1"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder={copy.home.coursePlaceholder}
            />
          </label>
        </div>

        <div>
          <label className="text-sm text-slate-200">
            {copy.home.contextLabel}
            <textarea
              className="textarea mt-1 min-h-[260px]"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={copy.home.contextPlaceholder}
            />
          </label>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? copy.home.generating : copy.home.generate}
          </button>
          <button className="btn-secondary" onClick={handleLoadSample} disabled={loading}>
            {copy.home.loadSample}
          </button>
          <button className="btn-secondary" onClick={handleClear} disabled={loading}>
            {copy.home.clear}
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : null}
        </section>

        <section className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-3">
          {copy.home.steps.map((step, idx) => (
            <div key={step} className="surface-card space-y-2">
              <p className="text-sm font-semibold text-emerald-300">{idx + 1}</p>
              <p className="text-lg font-semibold text-slate-50">{step}</p>
              <p className="text-sm text-slate-300">{copy.home.stepDetails[idx]}</p>
            </div>
          ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
