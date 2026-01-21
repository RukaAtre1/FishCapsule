/**
 * Mistake Bank Store
 * Stores wrong answers with spaced repetition scheduling
 */

import { ClozeQuestion } from "@/lib/llm/schema";

const STORAGE_KEY = "fishcapsule:mistakes";

// ============ Types ============

export interface MistakeItem {
    question: ClozeQuestion;
    wrongCount: number;
    correctStreak: number;  // consecutive correct answers, reset on wrong
    lastWrongAt: number;
    nextReviewAt: number;
    lastResult?: "wrong" | "right";
}

// ============ Scheduling Constants (in ms) ============

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const SCHEDULE = {
    FIRST_WRONG: 0,                  // Immediate for testing (was 1 day)
    REPEAT_WRONG: 12 * HOUR,         // +12 hours
    FIRST_CORRECT: 3 * DAY,          // correctStreak 0 -> 1: +3 days
    SECOND_CORRECT: 7 * DAY,         // correctStreak >= 1: +7 days
};

// ============ Storage Functions ============

/**
 * Get all mistakes from localStorage
 */
export function getMistakes(): MistakeItem[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch {
        console.error("[MistakeBank] Failed to load");
        return [];
    }
}

/**
 * Save mistakes to localStorage
 */
function saveMistakes(items: MistakeItem[]): boolean {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return true;
    } catch {
        console.error("[MistakeBank] Failed to save");
        return false;
    }
}

/**
 * Add a new mistake or update existing one (on wrong answer)
 */
export function addMistake(question: ClozeQuestion): void {
    const items = getMistakes();
    const existingIdx = items.findIndex(m => m.question.id === question.id);
    const now = Date.now();

    if (existingIdx >= 0) {
        // Update existing
        const item = items[existingIdx];
        item.wrongCount += 1;
        item.correctStreak = 0;  // reset on wrong
        item.lastWrongAt = now;
        item.lastResult = "wrong";
        // Repeat wrong: shorter interval
        item.nextReviewAt = now + SCHEDULE.REPEAT_WRONG;
    } else {
        // Add new
        items.push({
            question,
            wrongCount: 1,
            correctStreak: 0,
            lastWrongAt: now,
            nextReviewAt: now + SCHEDULE.FIRST_WRONG,
            lastResult: "wrong",
        });
    }

    saveMistakes(items);
}

/**
 * Update a mistake after review (correct or wrong)
 */
export function updateMistake(id: string, correct: boolean): void {
    const items = getMistakes();
    const idx = items.findIndex(m => m.question.id === id);
    if (idx < 0) return;

    const item = items[idx];
    const now = Date.now();

    if (correct) {
        item.correctStreak += 1;
        item.lastResult = "right";

        // Schedule based on correctStreak
        if (item.correctStreak === 1) {
            item.nextReviewAt = now + SCHEDULE.FIRST_CORRECT;
        } else {
            item.nextReviewAt = now + SCHEDULE.SECOND_CORRECT;
        }
    } else {
        item.wrongCount += 1;
        item.correctStreak = 0;
        item.lastWrongAt = now;
        item.lastResult = "wrong";
        item.nextReviewAt = now + SCHEDULE.REPEAT_WRONG;
    }

    saveMistakes(items);
}

/**
 * Get due items for today review
 * Ordered by nextReviewAt, then wrongCount descending
 */
export function getDueItems(limit: number = 3): MistakeItem[] {
    const now = Date.now();
    const items = getMistakes()
        .filter(m => m.nextReviewAt <= now)
        .sort((a, b) => {
            // First by nextReviewAt (oldest first)
            if (a.nextReviewAt !== b.nextReviewAt) {
                return a.nextReviewAt - b.nextReviewAt;
            }
            // Then by wrongCount (most wrong first)
            return b.wrongCount - a.wrongCount;
        });

    return items.slice(0, limit);
}

/**
 * Get count of due items
 */
export function getDueCount(): number {
    const now = Date.now();
    return getMistakes().filter(m => m.nextReviewAt <= now).length;
}

/**
 * Get total mistake count
 */
export function getMistakeCount(): number {
    return getMistakes().length;
}

/**
 * Remove a mistake (if needed, e.g., after mastery)
 */
export function removeMistake(id: string): void {
    const items = getMistakes().filter(m => m.question.id !== id);
    saveMistakes(items);
}
