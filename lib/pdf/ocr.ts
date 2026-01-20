"use client";

import { renderPageToCanvas, PageText } from "./extractor";

// ============ PRD v2.0: OCR Trigger Rules ============

/**
 * Determine if OCR should be triggered for a page.
 * PRD v2.0 Rules:
 * - pageText.length < 200 or mostly garbage characters
 * - Detected figure-heavy signals (Figure/Plot/Axis/MSE/ROC, etc.)
 * - User manually enables "Explain figures"
 */
export function shouldTriggerOCR(pageText: string, explainFiguresMode = false): boolean {
    // Rule 1: User manual override
    if (explainFiguresMode) return true;

    // Rule 2: Text too short
    if (pageText.length < 200) return true;

    // Rule 3: Mostly garbage characters (high ratio of non-alphanumeric)
    if (isGarbageText(pageText)) return true;

    // Rule 4: Figure-heavy signals
    if (hasFigureHeavySignals(pageText)) return true;

    return false;
}

/**
 * Check if text appears to be garbage/corrupted
 */
function isGarbageText(text: string): boolean {
    if (text.length === 0) return true;

    // Count alphanumeric + common punctuation + whitespace
    const validChars = text.replace(/[^a-zA-Z0-9\s.,;:!?'"()-]/g, '');
    const ratio = validChars.length / text.length;

    // If less than 60% valid characters, likely garbage
    return ratio < 0.6;
}

/**
 * Check for figure-heavy signals in text
 */
function hasFigureHeavySignals(text: string): boolean {
    const figurePatterns = /\b(figure|fig\.|plot|axis|axes|graph|chart|diagram|mse|rmse|roc|auc|error rate|accuracy|precision|recall|f1|confusion matrix|correlation|regression|histogram|scatter|bar chart|pie chart|legend|x-axis|y-axis)\b/gi;

    const matches = text.match(figurePatterns);
    // If we have 3+ figure-related terms, likely a figure-heavy page
    return (matches?.length || 0) >= 3;
}

// Lazy load Tesseract to reduce bundle size
let tesseractWorker: any = null;

async function getWorker() {
    if (tesseractWorker) return tesseractWorker;

    const Tesseract = await import("tesseract.js");
    tesseractWorker = await Tesseract.createWorker("eng", 1, {
        logger: (m: any) => {
            if (m.status === "recognizing text") {
                console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
        },
    });

    return tesseractWorker;
}

/**
 * Perform OCR on a single page
 */
export async function ocrPage(
    pdfData: ArrayBuffer,
    pageNumber: number
): Promise<string> {
    try {
        // Render page to canvas at high resolution for better OCR
        const canvas = await renderPageToCanvas(pdfData, pageNumber, 2.5);

        // Get worker and perform OCR
        const worker = await getWorker();
        const { data } = await worker.recognize(canvas);

        return data.text.trim();
    } catch (err) {
        console.error(`OCR error on page ${pageNumber}:`, err);
        return "";
    }
}

/**
 * Perform OCR on multiple pages
 */
export async function ocrPages(
    pdfData: ArrayBuffer,
    pageNumbers: number[],
    onProgress?: (page: number, total: number) => void
): Promise<PageText[]> {
    const results: PageText[] = [];

    for (let i = 0; i < pageNumbers.length; i++) {
        const pageNum = pageNumbers[i];
        onProgress?.(i + 1, pageNumbers.length);

        const text = await ocrPage(pdfData, pageNum);
        results.push({
            pageNumber: pageNum,
            text,
            hasContent: text.length > 20,
            needsOCR: false, // Already processed
        });
    }

    return results;
}

/**
 * Cleanup OCR worker when done
 */
export async function terminateOCR() {
    if (tesseractWorker) {
        await tesseractWorker.terminate();
        tesseractWorker = null;
    }
}

// ============ OCR Caching (IndexedDB) ============

const OCR_CACHE_DB = "fishcapsule-ocr-cache";
const OCR_CACHE_STORE = "ocr-results";

/**
 * Cache OCR result to IndexedDB
 */
export async function cacheOCRResult(
    deckId: string,
    page: number,
    ocrText: string
): Promise<void> {
    try {
        const { openDB } = await import("idb");
        const db = await openDB(OCR_CACHE_DB, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(OCR_CACHE_STORE)) {
                    db.createObjectStore(OCR_CACHE_STORE);
                }
            },
        });

        const key = `${deckId}-page-${page}`;
        await db.put(OCR_CACHE_STORE, {
            ocrText,
            timestamp: Date.now(),
        }, key);

        db.close();
    } catch (err) {
        console.error("Failed to cache OCR result:", err);
    }
}

/**
 * Get cached OCR result from IndexedDB
 */
export async function getCachedOCR(
    deckId: string,
    page: number
): Promise<string | null> {
    try {
        const { openDB } = await import("idb");
        const db = await openDB(OCR_CACHE_DB, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(OCR_CACHE_STORE)) {
                    db.createObjectStore(OCR_CACHE_STORE);
                }
            },
        });

        const key = `${deckId}-page-${page}`;
        const cached = await db.get(OCR_CACHE_STORE, key);
        db.close();

        if (cached) {
            // Check if cache is still valid (24h TTL)
            const age = Date.now() - cached.timestamp;
            if (age < 24 * 60 * 60 * 1000) {
                return cached.ocrText;
            }
        }

        return null;
    } catch (err) {
        console.error("Failed to get cached OCR:", err);
        return null;
    }
}

