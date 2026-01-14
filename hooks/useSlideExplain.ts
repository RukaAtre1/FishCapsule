"use client";

import { useState, useCallback, useRef } from "react";
import { extractTextFromPages, PageText } from "@/lib/pdf/extractor";
import { ocrPages, terminateOCR } from "@/lib/pdf/ocr";
import { chunkPageText, TextChunk } from "@/lib/pdf/chunker";
import type { SlideExplain } from "@/types/learning";

interface UseSlideExplainResult {
    isLoading: boolean;
    isOCRing: boolean;
    error: string | null;
    result: SlideExplain | null;
    ocrProgress: { current: number; total: number } | null;
    explain: (pdfBuffer: ArrayBuffer, pageRange: number[]) => Promise<void>;
    reset: () => void;
}

export function useSlideExplain(sessionId: string, lectureId: string): UseSlideExplainResult {
    const [isLoading, setIsLoading] = useState(false);
    const [isOCRing, setIsOCRing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SlideExplain | null>(null);
    const [ocrProgress, setOcrProgress] = useState<{ current: number; total: number } | null>(null);

    // Store buffer reference for potential OCR
    const bufferRef = useRef<ArrayBuffer | null>(null);

    const explain = useCallback(async (pdfBuffer: ArrayBuffer, pageRange: number[]) => {
        if (pageRange.length === 0) {
            setError("No pages selected");
            return;
        }

        if (pageRange.length > 5) {
            setError("Maximum 5 pages allowed");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);
        setOcrProgress(null);

        // Clone and store buffer for potential OCR
        bufferRef.current = pdfBuffer.slice(0);

        try {
            // Step 1: Extract text from selected pages
            let pageTexts: PageText[] = await extractTextFromPages(pdfBuffer, pageRange);

            // Check if we got meaningful content
            const hasContent = pageTexts.some((p: PageText) => p.hasContent && !p.needsOCR);

            // If no content, try OCR
            if (!hasContent) {
                console.log("No text found, attempting OCR...");
                setIsOCRing(true);

                const ocrResults = await ocrPages(
                    bufferRef.current!,
                    pageRange,
                    (current, total) => setOcrProgress({ current, total })
                );

                // Merge OCR results with original (preferring OCR where needed)
                pageTexts = ocrResults;
                setIsOCRing(false);
                setOcrProgress(null);

                // Check again
                const hasOCRContent = pageTexts.some((p: PageText) => p.hasContent);
                if (!hasOCRContent) {
                    setError("Could not extract text from slides. Please try different pages.");
                    setIsLoading(false);
                    return;
                }
            }

            // Step 2: Chunk the page texts
            const chunks: TextChunk[] = [];
            for (const pageText of pageTexts) {
                if (pageText.hasContent) {
                    const pageChunks = chunkPageText(pageText.text, pageText.pageNumber);
                    chunks.push(...pageChunks);
                }
            }

            if (chunks.length === 0) {
                setError("No meaningful text found in selected pages.");
                setIsLoading(false);
                return;
            }

            // Step 3: Call the API
            const response = await fetch("/api/slides/explain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId,
                    lectureId,
                    pages: pageRange,
                    chunks: chunks.map((c: TextChunk) => ({
                        chunkId: c.chunkId,
                        page: c.page,
                        text: c.text,
                    })),
                    mode: "explain",
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to generate explanation");
            }

            const data = await response.json();
            setResult(data.slideExplain);
        } catch (err: any) {
            console.error("Explain error:", err);
            setError(err.message || "Something went wrong");
        } finally {
            setIsLoading(false);
            setIsOCRing(false);
        }
    }, [sessionId, lectureId]);

    const reset = useCallback(() => {
        setIsLoading(false);
        setIsOCRing(false);
        setError(null);
        setResult(null);
        setOcrProgress(null);
        bufferRef.current = null;
        // Cleanup OCR worker
        terminateOCR().catch(console.error);
    }, []);

    return { isLoading, isOCRing, error, result, ocrProgress, explain, reset };
}
