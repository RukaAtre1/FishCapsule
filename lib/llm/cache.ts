import type { CornellCard } from "@/types/learning";
import type { OutputMeta } from "./schema";

const CACHE_PREFIX = "fish-cache:";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PROMPT_VERSION = "v1";

/**
 * Creates a hash key for caching
 */
export function createCacheKey(
    sessionId: string,
    conceptId: string,
    contextSnippet: string
): string {
    // Use first 200 chars of context for hashing
    const contextHash = simpleHash(contextSnippet.slice(0, 200));
    return `${CACHE_PREFIX}${sessionId}:${conceptId}:${contextHash}:${PROMPT_VERSION}`;
}

/**
 * Simple string hash function
 */
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

/**
 * Stores a validated Cornell card in cache
 */
export function cacheValidatedCard(
    key: string,
    card: CornellCard,
    meta: OutputMeta
): void {
    if (typeof window === "undefined") return;

    try {
        const entry = {
            card,
            meta,
            timestamp: Date.now(),
            ttl: CACHE_TTL_MS,
        };
        localStorage.setItem(key, JSON.stringify(entry));
    } catch (err) {
        // Storage full or unavailable, ignore
        console.warn("Cache write failed:", (err as Error).message);
    }
}

/**
 * Retrieves a cached Cornell card if valid
 */
export function getCachedCard(
    key: string
): { card: CornellCard; meta: OutputMeta } | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const entry = JSON.parse(raw);
        const age = Date.now() - entry.timestamp;

        if (age > entry.ttl) {
            localStorage.removeItem(key);
            return null;
        }

        return {
            card: entry.card,
            meta: { ...entry.meta, cacheHit: true },
        };
    } catch {
        return null;
    }
}

/**
 * Clears all FishCapsule cache entries
 */
export function clearAllCache(): void {
    if (typeof window === "undefined") return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Gets cache statistics
 */
export function getCacheStats(): { entries: number; totalSize: number } {
    if (typeof window === "undefined") return { entries: 0, totalSize: 0 };

    let entries = 0;
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
            entries++;
            const value = localStorage.getItem(key);
            if (value) {
                totalSize += value.length * 2; // Approximate bytes (UTF-16)
            }
        }
    }

    return { entries, totalSize };
}
