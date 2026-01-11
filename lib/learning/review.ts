import { copy } from "@/lib/copy/en";
import { loadSession, saveSession } from "@/lib/learning/storage";
import type { AttemptLog, DueStatus, ReviewState, StudySession } from "@/types/learning";

const DAY = 86400000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ensureReview(session: StudySession, conceptId: string): ReviewState {
  session.review = session.review ?? {};
  if (!session.review[conceptId]) {
    session.review[conceptId] = {
      conceptId,
      ease: 2,
      streak: 0,
      mastery: 0
    };
  }
  return session.review[conceptId];
}

function confidenceBonus(confidence?: number | string) {
  if (typeof confidence === "number") {
    return clamp((confidence - 1) * 0.5, 0, 2);
  }
  if (confidence === "high") return 1.5;
  if (confidence === "medium") return 1;
  if (confidence === "low") return 0.2;
  return 0;
}

export function scoreAttemptQuality(attempt: AttemptLog): number {
  let quality = attempt.correct ? 2 : 0;
  if (attempt.type === "short" || attempt.type === "code") {
    const len = attempt.userAnswer?.trim().length ?? 0;
    if (len >= 80) quality += 2;
    else if (len >= 30) quality += 1;
    else if (len >= 10) quality += 0.5;
  }
  quality += confidenceBonus(attempt.confidence);
  return clamp(quality, 0, 5);
}

export function updateReviewStateOnAttempt(
  sessionId: string,
  conceptId: string,
  attempt: AttemptLog
): ReviewState | null {
  const session = loadSession(sessionId);
  if (!session) return null;
  const state = ensureReview(session, conceptId);
  const quality = scoreAttemptQuality(attempt);

  const prevEase = state.ease ?? 2;
  const ease = clamp(prevEase + (quality - 3) * 0.15, 1.3, 2.6);
  const prevInterval = state.intervalDays ?? 0;
  const streak = quality >= 4 ? (state.streak ?? 0) + 1 : 0;

  let intervalDays: number;
  if (!prevInterval) intervalDays = 1;
  else if (streak === 1) intervalDays = 3;
  else intervalDays = Math.round(clamp(prevInterval * ease, 1, 30));

  const mastery = clamp((state.mastery ?? 0) + (quality - 2.5) * 0.08, 0, 1);
  const nextReviewAt = Date.now() + intervalDays * DAY;

  session.review![conceptId] = {
    conceptId,
    lastAttemptAt: Date.now(),
    nextReviewAt,
    intervalDays,
    ease,
    streak,
    mastery
  };
  saveSession(session);
  return session.review![conceptId];
}

export function getReviewState(sessionId: string, conceptId: string): ReviewState | null {
  const session = loadSession(sessionId);
  if (!session?.review || !session.review[conceptId]) return null;
  return session.review[conceptId];
}

export function computeDueStatus(state: ReviewState | null): DueStatus {
  if (!state || !state.nextReviewAt) return "not_started";
  const now = Date.now();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (state.mastery && state.mastery >= 0.85 && (state.intervalDays ?? 0) >= 14) {
    return "mastered";
  }
  if (state.nextReviewAt <= endOfToday.getTime()) {
    return "due_today";
  }
  if (state.nextReviewAt - now <= 3 * DAY) {
    return "due_soon";
  }
  return "scheduled";
}

export function dueLabel(status: DueStatus) {
  const labels: Record<DueStatus, string> = {
    due_today: copy.learn.filters.dueToday,
    due_soon: copy.learn.filters.dueSoon,
    mastered: "Mastered",
    scheduled: "Scheduled",
    not_started: "Not started"
  };
  return labels[status] ?? "Not started";
}
