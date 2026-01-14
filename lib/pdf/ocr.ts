"use client";

import { renderPageToCanvas, PageText } from "./extractor";

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
