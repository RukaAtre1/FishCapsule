/**
 * Metrics Store (PRD v2.4)
 * Lightweight event logging + metrics computation for the Evaluation Dashboard.
 * Uses localStorage for persistence.
 */

// ============ Types ============

export type MetricEventType =
    | "step_start"
    | "step_done"
    | "step_fail"
    | "quiz_answer"
    | "review_answer"
    | "evidence_coverage";

export interface MetricEvent {
    type: MetricEventType;
    timestamp: number;
    data: Record<string, any>;
}

export interface SessionMetrics {
    evidenceCoverage: number;       // ratio 0–1
    quizAccuracy: number;           // ratio 0–1
    quizTotal: number;              // total answered
    reviewRetention: number;        // ratio 0–1
    reviewTotal: number;
    latencyP50: number;             // ms
    latencyP95: number;             // ms
    fallbackCount: number;
    timeoutCount: number;
    totalSteps: number;
    failedSteps: number;
}

// ============ Constants ============

const STORAGE_KEY = "fishcapsule:metrics";
const MAX_EVENTS = 500; // rolling cap

// ============ Core Functions ============

function getEvents(): MetricEvent[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveEvents(events: MetricEvent[]): void {
    if (typeof window === "undefined") return;
    try {
        // Keep rolling cap
        const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.warn("[MetricsStore] Failed to save:", e);
    }
}

/**
 * Record a metric event.
 */
export function recordEvent(event: Omit<MetricEvent, "timestamp">): void {
    const events = getEvents();
    events.push({ ...event, timestamp: Date.now() });
    saveEvents(events);
}

/**
 * Compute aggregate session metrics from the event log.
 */
export function getMetrics(): SessionMetrics {
    const events = getEvents();

    // Quiz accuracy
    const quizEvents = events.filter(e => e.type === "quiz_answer");
    const quizCorrect = quizEvents.filter(e => e.data?.correct === true).length;
    const quizTotal = quizEvents.length;
    const quizAccuracy = quizTotal > 0 ? quizCorrect / quizTotal : 0;

    // Review retention
    const reviewEvents = events.filter(e => e.type === "review_answer");
    const reviewCorrect = reviewEvents.filter(e => e.data?.correct === true).length;
    const reviewTotal = reviewEvents.length;
    const reviewRetention = reviewTotal > 0 ? reviewCorrect / reviewTotal : 0;

    // Latency (from step_done events)
    const latencies = events
        .filter(e => e.type === "step_done" && typeof e.data?.latencyMs === "number")
        .map(e => e.data.latencyMs as number)
        .sort((a, b) => a - b);

    const latencyP50 = latencies.length > 0
        ? latencies[Math.floor(latencies.length * 0.5)]
        : 0;
    const latencyP95 = latencies.length > 0
        ? latencies[Math.floor(latencies.length * 0.95)]
        : 0;

    // Fallback + timeout counts
    const fallbackCount = events.filter(
        e => e.type === "step_done" && e.data?.isFallback === true
    ).length;
    const timeoutCount = events.filter(e => e.type === "step_fail" && e.data?.timeout === true).length;

    // Step counts
    const totalSteps = events.filter(e => e.type === "step_start").length;
    const failedSteps = events.filter(e => e.type === "step_fail").length;

    // Evidence coverage (latest value)
    const coverageEvents = events.filter(e => e.type === "evidence_coverage");
    const evidenceCoverage = coverageEvents.length > 0
        ? (coverageEvents[coverageEvents.length - 1].data?.coverage ?? 0)
        : 0;

    return {
        evidenceCoverage,
        quizAccuracy,
        quizTotal,
        reviewRetention,
        reviewTotal,
        latencyP50,
        latencyP95,
        fallbackCount,
        timeoutCount,
        totalSteps,
        failedSteps,
    };
}

/**
 * Compute evidence coverage from notes.
 */
export function computeEvidenceCoverage(
    notes: Array<{ evidence?: { snippet?: string } | null }>
): number {
    if (notes.length === 0) return 0;
    const withEvidence = notes.filter(
        n => n.evidence && typeof n.evidence.snippet === "string" && n.evidence.snippet.length > 0
    ).length;
    return withEvidence / notes.length;
}

/**
 * Clear all metric events (for testing/reset).
 */
export function clearMetrics(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
}
