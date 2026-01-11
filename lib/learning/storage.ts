import type { AttemptLog, CornellCard, FeedbackResponse, StudySession } from "@/types/learning";

const SESSION_PREFIX = "study-session:";
const ATTEMPT_PREFIX = "study-attempts:";

const hasWindow = () => typeof window !== "undefined" && !!window.localStorage;

function attemptsKey(sessionId: string, conceptId: string) {
  return `${ATTEMPT_PREFIX}${sessionId}:${conceptId}`;
}

export function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function saveSession(session: StudySession) {
  if (!hasWindow()) return;
  localStorage.setItem(`${SESSION_PREFIX}${session.sessionId}`, JSON.stringify(session));
}

export function loadSession(sessionId: string): StudySession | null {
  if (!hasWindow()) return null;
  const raw = localStorage.getItem(`${SESSION_PREFIX}${sessionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StudySession;
  } catch {
    return null;
  }
}

export function listSessions(): StudySession[] {
  if (!hasWindow()) return [];
  const sessions: StudySession[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(SESSION_PREFIX)) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          sessions.push(JSON.parse(raw) as StudySession);
        } catch {
          // ignore bad entries
        }
      }
    }
  }
  return sessions.sort((a, b) => b.createdAt - a.createdAt);
}

export function cacheCard(sessionId: string, conceptId: string, card: CornellCard) {
  const session = loadSession(sessionId);
  if (!session) return;
  session.cards = session.cards ?? {};
  session.cards[conceptId] = card;
  saveSession(session);
}

export function appendAttempt(attempt: AttemptLog) {
  if (!hasWindow()) return;
  const key = attemptsKey(attempt.sessionId, attempt.conceptId);
  const existing = localStorage.getItem(key);
  let attempts: AttemptLog[] = [];
  if (existing) {
    try {
      attempts = JSON.parse(existing) as AttemptLog[];
    } catch {
      attempts = [];
    }
  }
  attempts.push(attempt);
  localStorage.setItem(key, JSON.stringify(attempts));
  const session = loadSession(attempt.sessionId);
  if (session) {
    session.attempts = session.attempts ?? {};
    session.attempts[attempt.conceptId] = attempts;
    saveSession(session);
  }
}

export function loadAttempts(sessionId: string, conceptId: string): AttemptLog[] {
  if (!hasWindow()) return [];
  const key = attemptsKey(sessionId, conceptId);
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AttemptLog[];
  } catch {
    return [];
  }
}

export function clearAttempts(sessionId: string, conceptId: string) {
  if (!hasWindow()) return;
  const key = attemptsKey(sessionId, conceptId);
  localStorage.removeItem(key);
  const session = loadSession(sessionId);
  if (session?.attempts) {
    const next = { ...session.attempts };
    delete next[conceptId];
    session.attempts = next;
    saveSession(session);
  }
}

export function updateLatestAttemptMeta(
  sessionId: string,
  conceptId: string,
  questionId: string,
  patch: Partial<AttemptLog>
) {
  if (!hasWindow()) return;
  const key = attemptsKey(sessionId, conceptId);
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const attempts = JSON.parse(raw) as AttemptLog[];
    for (let i = attempts.length - 1; i >= 0; i -= 1) {
      if (attempts[i].questionId === questionId) {
        attempts[i] = { ...attempts[i], ...patch };
        break;
      }
    }
    localStorage.setItem(key, JSON.stringify(attempts));
    const session = loadSession(sessionId);
    if (session) {
      session.attempts = session.attempts ?? {};
      session.attempts[conceptId] = attempts;
      saveSession(session);
    }
  } catch {
    // ignore broken storage; treat as best-effort
  }
}

export function saveFeedbackResult(
  sessionId: string,
  conceptId: string,
  feedback: FeedbackResponse
) {
  if (!hasWindow()) return;
  const session = loadSession(sessionId);
  if (!session) return;
  session.feedback = session.feedback ?? {};
  session.feedback[conceptId] = feedback;
  saveSession(session);
}
