/**
 * Game State Store
 * Tracks XP and session streak for Duolingo-style gamification
 */

const STORAGE_KEY = "fishcapsule:gameState";

// ============ Types ============

export interface UserGameState {
    totalXP: number;
    sessionStreak: number;
}

const DEFAULT_STATE: UserGameState = {
    totalXP: 0,
    sessionStreak: 0,
};

// ============ XP Constants ============

export const XP_CORRECT = 10;
export const XP_STREAK_BONUS = 2;  // per consecutive correct after first
export const XP_LESSON_COMPLETE = 30;  // if accuracy >= 80%
export const ACCURACY_THRESHOLD = 0.8;

// ============ Storage Functions ============

/**
 * Get current game state from localStorage
 */
export function getGameState(): UserGameState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return { ...DEFAULT_STATE };
        return JSON.parse(stored);
    } catch {
        return { ...DEFAULT_STATE };
    }
}

/**
 * Save game state to localStorage
 */
function saveGameState(state: UserGameState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        console.error("[GameState] Failed to save");
    }
}

/**
 * Add XP points
 */
export function addXP(points: number): UserGameState {
    const state = getGameState();
    state.totalXP += points;
    saveGameState(state);
    return state;
}

/**
 * Increment session streak (on correct answer)
 */
export function incrementStreak(): UserGameState {
    const state = getGameState();
    state.sessionStreak += 1;
    saveGameState(state);
    return state;
}

/**
 * Reset session streak to 0 (on wrong answer)
 */
export function resetStreak(): UserGameState {
    const state = getGameState();
    state.sessionStreak = 0;
    saveGameState(state);
    return state;
}

/**
 * Calculate XP for a correct answer (includes streak bonus)
 */
export function calculateCorrectXP(currentStreak: number): number {
    if (currentStreak === 0) {
        return XP_CORRECT;
    }
    return XP_CORRECT + XP_STREAK_BONUS;
}

/**
 * Calculate lesson completion bonus
 */
export function calculateLessonBonus(accuracy: number): number {
    return accuracy >= ACCURACY_THRESHOLD ? XP_LESSON_COMPLETE : 0;
}

/**
 * Process a correct answer: increment streak and add XP
 */
export function processCorrectAnswer(): { xpEarned: number; state: UserGameState } {
    const prevState = getGameState();
    const xp = calculateCorrectXP(prevState.sessionStreak);
    addXP(xp);
    const state = incrementStreak();
    return { xpEarned: xp, state };
}

/**
 * Process a wrong answer: reset streak
 */
export function processWrongAnswer(): UserGameState {
    return resetStreak();
}

/**
 * Complete a lesson: add bonus XP if accuracy threshold met
 */
export function completeLesson(accuracy: number): { bonusXP: number; state: UserGameState } {
    const bonus = calculateLessonBonus(accuracy);
    const state = bonus > 0 ? addXP(bonus) : getGameState();
    return { bonusXP: bonus, state };
}
