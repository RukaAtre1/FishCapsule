/**
 * Notebook Persistence Store
 * Handles localStorage save/load for Cornell notebooks
 */

import { CornellNote, SourceMeta } from "./cornellBuilder";
import { Step1Explain, Step2Synthesize, Step3Quiz, Step4Diagnose } from "@/lib/llm/schema";

const STORAGE_KEY = "fishcapsule:notebooks";

// ============ Types ============

export interface NotebookRecord {
    id: string;
    timestamp: number;
    sourceMeta: SourceMeta;
    cornell: CornellNote;
    artifacts: {
        step1: Record<number, Step1Explain>;
        step2: Step2Synthesize | null;
        step3: Step3Quiz | null;
        step4: Step4Diagnose | null;
    };
}

// ============ Storage Functions ============

/**
 * Get all notebooks from localStorage
 */
export function getNotebooks(): NotebookRecord[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (error) {
        console.error("[NotebookStore] Failed to load notebooks:", error);
        return [];
    }
}

/**
 * Save a notebook record to localStorage
 * @returns true if successful, false otherwise
 */
export function saveNotebook(record: NotebookRecord): boolean {
    try {
        const notebooks = getNotebooks();

        // Check for duplicate (same pages + close timestamp)
        const existingIdx = notebooks.findIndex(n =>
            n.sourceMeta.pages.join(",") === record.sourceMeta.pages.join(",") &&
            Math.abs(n.timestamp - record.timestamp) < 60000 // Within 1 minute
        );

        if (existingIdx >= 0) {
            // Update existing
            notebooks[existingIdx] = record;
        } else {
            // Add new at the beginning
            notebooks.unshift(record);
        }

        // Keep only last 50 notebooks to avoid quota issues
        const trimmed = notebooks.slice(0, 50);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        return true;
    } catch (error) {
        console.error("[NotebookStore] Failed to save notebook:", error);
        return false;
    }
}

/**
 * Delete a notebook by ID
 */
export function deleteNotebook(id: string): boolean {
    try {
        const notebooks = getNotebooks();
        const filtered = notebooks.filter(n => n.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error("[NotebookStore] Failed to delete notebook:", error);
        return false;
    }
}

/**
 * Get a single notebook by ID
 */
export function getNotebookById(id: string): NotebookRecord | null {
    const notebooks = getNotebooks();
    return notebooks.find(n => n.id === id) || null;
}

/**
 * Generate a unique ID for new notebooks
 */
export function generateNotebookId(): string {
    // Use crypto.randomUUID if available, otherwise fallback
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older environments
    return `nb_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Get notebooks filtered by docId (PRD v2.3)
 */
export function getNotebooksByDocId(docId: string): NotebookRecord[] {
    return getNotebooks().filter(n => n.sourceMeta.docId === docId);
}

/**
 * Get notebooks grouped by docId (PRD v2.3)
 */
export function getNotebooksGroupedByDoc(): Record<string, NotebookRecord[]> {
    const notebooks = getNotebooks();
    const grouped: Record<string, NotebookRecord[]> = {};

    for (const nb of notebooks) {
        const key = nb.sourceMeta.docId || "unknown";
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(nb);
    }

    return grouped;
}
