/**
 * Cornell Note Builder
 * Maps Step 1-4 artifacts to Cornell Note format
 */

import { Step1Explain, Step2Synthesize, Step3Quiz, Step4Diagnose } from "@/lib/llm/schema";

// ============ Legacy Types (v2.2 compatibility) ============

export interface CornellNote {
    cues: string[];
    notes: PageNote[];
    summary: string;
    reviewPlan?: ReviewItem[];
}

export interface PageNote {
    page: number;
    bullets: string[];
}

export interface ReviewItem {
    in: string;
    task: string;
}

export interface SourceMeta {
    pages: number[];
    createdAt: number;
    fileName?: string;
    docId?: string;
    docTitle?: string;  // PRD v2.3: for toast display
}

// ============ PRD v2.3 Types ============

export type BarrierTagV2 = "concept" | "mechanics" | "transfer" | "communication";

export interface CueV2 {
    page: number;
    tag: BarrierTagV2;
    q: string;          // question (must end with ?)
    a: string;          // short answer (≤8 words preferred)
    cloze?: {
        text: string;   // e.g., "Bagging reduces ____."
        answer: string;
    };
}

export type SourceType = "text" | "table" | "figure" | "formula";

export interface EvidenceSnippet {
    page: number;
    snippet: string;    // ≤240 chars (PRD v2.4)
}

export interface PageNoteV2 {
    page: number;
    core: string;           // 1 sentence core idea
    mechanism: string[];    // 2-3 bullets
    examTraps: string[];    // 1-2 bullets
    example?: string;       // optional mini example
    takeaway: string;       // ≤14 words
    evidence?: EvidenceSnippet;
    confidence?: number;    // PRD v2.4: 0–1 model self-assessed
    source_type?: SourceType; // PRD v2.4: content classification
}

export interface SummaryCard {
    memorize: string[];     // exactly 3 bullets
    examQs: string[];       // exactly 2 questions
}

export interface CornellNoteV2 {
    cues: CueV2[];
    notes: PageNoteV2[];
    summary: SummaryCard;
    reviewPlan?: ReviewItem[];
}


// ============ Cue Generation Heuristics ============

/**
 * Detect if a phrase is likely a noun phrase (starts with article/determiner or
 * lacks a verb pattern)
 */
function isLikelyNounPhrase(text: string): boolean {
    const trimmed = text.trim().toLowerCase();
    // Starts with articles or common determiners
    if (/^(the|a|an|this|that|these|those|my|your|our|their)\s/.test(trimmed)) {
        return true;
    }
    // Short phrases without common verb patterns
    const words = trimmed.split(/\s+/);
    if (words.length <= 3) {
        const verbPatterns = /\b(is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|will|would|should|may|might|must)\b/i;
        if (!verbPatterns.test(trimmed)) {
            return true;
        }
    }
    return false;
}

/**
 * Convert a key idea into a proper cue question
 */
function ideaToCue(idea: string): string {
    const trimmed = idea.trim();

    // Already a question
    if (trimmed.endsWith("?")) {
        return trimmed;
    }

    // Noun phrase -> "What is X?"
    if (isLikelyNounPhrase(trimmed)) {
        return `What is ${trimmed}?`;
    }

    // Sentence/verb phrase -> "Explain: X"
    return `Explain: ${trimmed}`;
}

/**
 * Convert commonConfusion into a differentiation question
 */
function confusionToCue(confusion: string): string {
    const trimmed = confusion.trim();

    // Already a question
    if (trimmed.endsWith("?")) {
        return trimmed;
    }

    // Look for "vs" or "and" patterns for comparison
    const vsMatch = trimmed.match(/(.+?)\s+(?:vs\.?|versus|and|or)\s+(.+)/i);
    if (vsMatch) {
        return `How is ${vsMatch[1].trim()} different from ${vsMatch[2].trim()}?`;
    }

    // Look for "between X and Y" pattern
    const betweenMatch = trimmed.match(/between\s+(.+?)\s+and\s+(.+)/i);
    if (betweenMatch) {
        return `What's the difference between ${betweenMatch[1].trim()} and ${betweenMatch[2].trim()}?`;
    }

    // Default: wrap as clarification
    return `Why do students confuse: ${trimmed}?`;
}

// ============ Main Builder Function ============

/**
 * Build Cornell Note from Step 1-4 artifacts
 */
export function buildCornellFromArtifacts(
    step1: Record<number, Step1Explain>,
    step2: Step2Synthesize | null,
    step3: Step3Quiz | null,
    step4: Step4Diagnose | null,
    pages: number[]
): CornellNote {
    // 1. Build Notes from Step1 (per-page bullets)
    const notes: PageNote[] = pages
        .filter(page => step1[page])
        .map(page => {
            const s1 = step1[page];
            const bullets: string[] = [];

            // Use actual schema fields: plain, example, takeaway
            if (s1.plain) {
                bullets.push(s1.plain);
            }
            if (s1.example) {
                bullets.push(`Example: ${s1.example}`);
            }
            if (s1.takeaway) {
                bullets.push(`💡 ${s1.takeaway}`);
            }

            return { page, bullets };
        });

    // 2. Build Cues from Step2 (with heuristics)
    let cues: string[] = [];

    if (step2) {
        // Convert keyIdeas to proper questions
        cues = step2.keyIdeas.map(ideaToCue);

        // Add commonConfusion as differentiation question
        if (step2.commonConfusion) {
            cues.push(confusionToCue(step2.commonConfusion));
        }
    } else {
        // Fallback: derive cues from Step1 takeaways
        cues = pages
            .filter(page => step1[page]?.takeaway)
            .map(page => ideaToCue(step1[page].takeaway));
    }

    // 3. Build Summary
    let summary = "";

    if (step2) {
        // Primary: examAngle + synthesized summary
        const takeaways = pages
            .filter(page => step1[page]?.takeaway)
            .map(page => step1[page].takeaway)
            .slice(0, 3)
            .join(". ");

        summary = step2.examAngle;
        if (takeaways) {
            summary += `. Key points: ${takeaways}`;
        }
    } else {
        // Fallback: combine takeaways
        summary = pages
            .filter(page => step1[page]?.takeaway)
            .map(page => step1[page].takeaway)
            .join(". ");
    }

    // 4. Build Review Plan from Step4 (optional)
    let reviewPlan: ReviewItem[] | undefined;

    if (step4?.reviewPlan) {
        reviewPlan = step4.reviewPlan.map((r, idx) => ({
            in: r.in,
            task: step4.microPlan?.[idx] || "Review concepts"
        }));
    }

    return { cues, notes, summary, reviewPlan };
}

/**
 * Create source metadata for saving
 */
export function createSourceMeta(
    pages: number[],
    fileName?: string,
    docId?: string
): SourceMeta {
    return {
        pages,
        createdAt: Date.now(),
        ...(fileName && { fileName }),
        ...(docId && { docId }),
    };
}
