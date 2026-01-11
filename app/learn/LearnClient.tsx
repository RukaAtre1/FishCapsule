"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { copy } from "@/lib/copy/en";
import type { DueStatus, StudySession } from "@/types/learning";
import { loadAttempts, loadSession } from "@/lib/learning/storage";
import { computeDueStatus, dueLabel } from "@/lib/learning/review";

const moduleAccents = [
  "border-emerald-400/60",
  "border-sky-400/60",
  "border-amber-400/60",
  "border-fuchsia-400/60",
  "border-rose-400/60",
  "border-cyan-400/60"
];

function parseModule(title: string) {
  const match = title.match(/^\s*Module\s*(\d+)\s*[:\-]/i);
  const moduleNumber = match ? parseInt(match[1], 10) : null;
  const cleanTitle = match ? title.slice(match[0].length).trim() || title.trim() : title.trim();
  return { moduleNumber, cleanTitle };
}

function statusTone(due: DueStatus) {
  if (due === "due_today") return "border-[color:var(--accent)]/70 bg-[color:var(--accent)]/18 text-[color:var(--text)]";
  if (due === "due_soon") return "border-amber-300/60 bg-amber-400/15 text-amber-50";
  if (due === "mastered") return "border-emerald-300/60 bg-emerald-500/12 text-emerald-50";
  if (due === "scheduled") return "border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)]";
  return "border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)]";
}

export default function LearnClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") || "";
  const [session, setSession] = useState<StudySession | null>(null);
  const [filters, setFilters] = useState<"all" | "due_today" | "due_soon" | "need_fix" | "need_practice">("all");
  const [checked, setChecked] = useState(false);

  const conceptProgress = useMemo(() => {
    if (!session) return {};
    const feedback = session.feedback ?? {};
    return session.concepts.reduce<Record<
      string,
      { attempts: number; due: DueStatus; needFix: boolean }
    >>((acc, concept) => {
      const attempts =
        session.attempts?.[concept.id]?.length ?? loadAttempts(session.sessionId, concept.id).length;
      const reviewState = session.review?.[concept.id] ?? null;
      const due = computeDueStatus(reviewState);
      const fb = feedback[concept.id];
      const needFix = !!fb && fb.barrier !== "none" && !fb.microDrillDone;
      acc[concept.id] = { attempts, due, needFix };
      return acc;
    }, {});
  }, [session]);

  useEffect(() => {
    if (!sessionId) return;
    const loaded = loadSession(sessionId);
    setSession(loaded ?? null);
    setChecked(true);
  }, [sessionId]);

  const grouped = useMemo(() => {
    if (!session) return [];
    const map = new Map<
      string,
      {
        moduleNumber: number | null;
        label: string;
        concepts: {
          id: string;
          description: string;
          cleanTitle: string;
          progress: { attempts: number; due: DueStatus; needFix: boolean };
        }[];
      }
    >();

    session.concepts.forEach((concept) => {
      const { moduleNumber, cleanTitle } = parseModule(concept.title);
      const key = moduleNumber ? `module-${moduleNumber}` : "other";
      const next = map.get(key) ?? {
        moduleNumber: moduleNumber ?? null,
        label: moduleNumber ? `${copy.learn.moduleLabel} ${moduleNumber}` : copy.learn.moduleFallback,
        concepts: []
      };
      next.concepts.push({
        id: concept.id,
        description: concept.description,
        cleanTitle,
        progress:
          conceptProgress[concept.id] ?? { attempts: 0, due: "not_started" as DueStatus, needFix: false }
      });
      map.set(key, next);
    });

    const modules = Array.from(map.values())
      .filter((g) => g.moduleNumber !== null)
      .sort((a, b) => (a.moduleNumber ?? 0) - (b.moduleNumber ?? 0));
    const other = map.get("other");
    return other ? [...modules, other] : modules;
  }, [conceptProgress, session]);

  const duePriority: Record<DueStatus, number> = {
    due_today: 0,
    due_soon: 1,
    not_started: 3,
    scheduled: 4,
    mastered: 5
  };

  const totalAttempts = useMemo(
    () =>
      Object.values(conceptProgress).reduce((sum, item) => {
        if (!item) return sum;
        return sum + (item.attempts ?? 0);
      }, 0),
    [conceptProgress]
  );

  const matchesFilter = (p: { attempts: number; due: DueStatus; needFix: boolean }) => {
    if (filters === "all") return true;
    if (filters === "due_today") return p.due === "due_today";
    if (filters === "due_soon") return p.due === "due_soon";
    if (filters === "need_fix") return p.needFix;
    if (filters === "need_practice") return p.attempts === 0 || p.due === "not_started";
    return true;
  };

  const filteredGroups = grouped
    .map((group) => ({
      ...group,
      concepts: group.concepts
        .filter((c) => matchesFilter(c.progress))
        .sort((a, b) => {
          const aScore = duePriority[a.progress.due] ?? 99;
          const bScore = duePriority[b.progress.due] ?? 99;
          if (aScore !== bScore) return aScore - bScore;
          return (b.progress.attempts ?? 0) - (a.progress.attempts ?? 0);
        })
    }))
    .filter((g) => g.concepts.length > 0);

  const filtersConfig = [
    { id: "all", label: copy.learn.filters.all },
    { id: "due_today", label: copy.learn.filters.dueToday },
    { id: "due_soon", label: copy.learn.filters.dueSoon },
    { id: "need_practice", label: copy.learn.filters.needPractice },
    { id: "need_fix", label: copy.learn.filters.needFix }
  ];

  if (!sessionId) {
    return (
      <div className="flex min-h-[50vh] flex-col gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)]/70 p-6">
        <p className="text-[color:var(--muted)]">{copy.learn.emptySession}</p>
        <button className="btn-secondary w-fit" onClick={() => router.push("/")}>
          {copy.common.backToHome}
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[50vh] flex-col gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)]/70 p-6">
        <p className="text-[color:var(--muted)]">{checked ? copy.learn.noSession : copy.common.loading}</p>
        <button className="btn-secondary w-fit" onClick={() => router.push("/")}>
          {copy.common.backToHome}
        </button>
      </div>
    );
  }

  const nothingToShow = filteredGroups.length === 0;

  return (
    <div className="flex min-h-screen flex-col gap-7 pb-6">
      <header className="space-y-4">
        <div className="glass-card flex flex-col gap-3 border border-[color:var(--border)]/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                {copy.common.session} {session.sessionId}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)]">
                {session.courseTitle || copy.learn.headingFallback}
              </h1>
              <p className="text-sm text-[color:var(--muted)]">{copy.learn.subheading}</p>
            </div>
            <button className="btn-secondary" onClick={() => router.push("/")}>
              {copy.common.backToHome}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
            <span className="rounded-full border border-[color:var(--border)] px-3 py-1">
              {session.concepts.length} concepts
            </span>
            <span className="rounded-full border border-[color:var(--border)] px-3 py-1">
              {copy.common.attempts}: {totalAttempts}
            </span>
          </div>
        </div>
        <div className="sticky top-20 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--surface2)]/80 px-2 py-2 backdrop-blur-xl">
          {filtersConfig.map((tab) => (
            <button
              key={tab.id}
              className={`chip transition ${
                filters === tab.id
                  ? "border-[color:var(--accent)]/70 bg-[color:var(--accent)]/18 text-[color:var(--text)] shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                  : "text-[color:var(--muted)] hover:border-[color:var(--accent)]/60 hover:text-[color:var(--text)]"
              }`}
              onClick={() => setFilters(tab.id as any)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {nothingToShow ? (
        <div className="glass-card flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--muted)]">
          <div>
            <p className="text-[color:var(--text)]">Nothing to show.</p>
            <p className="text-xs text-[color:var(--muted)]">Try a different filter or reset.</p>
          </div>
          <button className="btn-secondary" onClick={() => setFilters("all")}>
            Reset filters
          </button>
        </div>
      ) : null}

      <div className="space-y-8">
        {filteredGroups.map((group, idx) => {
          const accent =
            group.moduleNumber && group.moduleNumber > 0
              ? moduleAccents[(group.moduleNumber - 1) % moduleAccents.length]
              : "border-[color:var(--border)]";
          const accentBg = accent.replace("border", "bg");
          return (
            <section key={`${group.label}-${idx}`} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-1.5 rounded-full ${accentBg}`} />
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text)]">{group.label}</p>
                    <p className="text-xs text-[color:var(--muted)]">{copy.learn.description}</p>
                  </div>
                </div>
                <span className="text-xs text-[color:var(--muted)]">{group.concepts.length} items</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {group.concepts.map((concept) => {
                  const primaryAction =
                    concept.progress.due === "due_today" || concept.progress.due === "due_soon"
                      ? { label: copy.learn.cardActions.startReview, href: `/practice?session=${sessionId}&conceptId=${concept.id}&mode=review` }
                      : concept.progress.attempts > 0
                        ? { label: copy.learn.cardActions.practice, href: `/practice?session=${sessionId}&conceptId=${concept.id}` }
                        : { label: copy.learn.cardActions.learn, href: `/learn/${concept.id}?session=${sessionId}` };
                  const secondaryAction = concept.progress.needFix
                    ? { label: copy.learn.cardActions.feedback, href: `/feedback?session=${sessionId}&conceptId=${concept.id}` }
                    : primaryAction.label === copy.learn.cardActions.learn
                      ? null
                      : { label: copy.learn.cardActions.learn, href: `/learn/${concept.id}?session=${sessionId}` };
                  return (
                    <div
                      key={concept.id}
                      role="button"
                      tabIndex={0}
                      className={`glass-card group relative flex h-full min-h-[240px] flex-col gap-3 border-l-4 ${accent} transition hover:border-[color:var(--accent)]/70`}
                      onClick={() => router.push(`/learn/${concept.id}?session=${sessionId}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") router.push(`/learn/${concept.id}?session=${sessionId}`);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-[color:var(--text)]">{concept.cleanTitle}</h3>
                          <p
                            className="text-sm text-[color:var(--muted)]"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden"
                            }}
                          >
                            {concept.description}
                          </p>
                        </div>
                        {group.moduleNumber ? (
                          <span className="badge">
                            {copy.learn.moduleLabel} {group.moduleNumber}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="chip bg-[color:var(--surface2)]/80 text-[color:var(--text)]">
                          {copy.common.attempts}: {concept.progress.attempts}
                        </span>
                        <span className={`chip ${statusTone(concept.progress.due)}`}>
                          {dueLabel(concept.progress.due)}
                        </span>
                        {concept.progress.needFix ? (
                          <span className="chip border-rose-400/50 bg-rose-500/15 text-rose-100">
                            {copy.common.needFix}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-auto flex flex-wrap gap-2">
                        <button
                          className="btn-primary px-3 text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(primaryAction.href);
                          }}
                          type="button"
                        >
                          {primaryAction.label}
                        </button>
                        {secondaryAction ? (
                          <button
                            className="btn-glass px-3 text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(secondaryAction.href);
                            }}
                            type="button"
                          >
                            {secondaryAction.label}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
