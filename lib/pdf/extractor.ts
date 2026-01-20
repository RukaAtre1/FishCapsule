import * as pdfjsLib from "pdfjs-dist";

// Configure worker for client-side use
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;
}

export interface PageText {
    pageNumber: number;
    text: string;
    hasContent: boolean;
    needsOCR?: boolean;
}

/**
 * Extract text from specific pages of a PDF
 * @param pdfData - ArrayBuffer of PDF file (will be cloned to avoid detachment)
 * @param pageNumbers - Array of 1-indexed page numbers to extract
 * @returns Array of PageText objects
 */
export async function extractTextFromPages(
    pdfData: ArrayBuffer,
    pageNumbers: number[]
): Promise<PageText[]> {
    // Clone the ArrayBuffer to avoid detachment issues
    const clonedData = pdfData.slice(0);

    const pdf = await pdfjsLib.getDocument({
        data: clonedData,
        standardFontDataUrl: "https://unpkg.com/pdfjs-dist@4.8.69/standard_fonts/",
    }).promise;
    const results: PageText[] = [];

    for (const pageNum of pageNumbers) {
        if (pageNum < 1 || pageNum > pdf.numPages) {
            results.push({
                pageNumber: pageNum,
                text: '',
                hasContent: false,
                needsOCR: false,
            });
            continue;
        }

        try {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Combine text items
            const text = textContent.items
                .map((item: any) => item.str || '')
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            // Check if text is meaningful or needs OCR
            const hasContent = text.length > 20;
            const needsOCR = !hasContent || checkNeedsOCR(text);

            results.push({
                pageNumber: pageNum,
                text,
                hasContent,
                needsOCR,
            });
        } catch (err) {
            console.error(`Error extracting page ${pageNum}:`, err);
            results.push({
                pageNumber: pageNum,
                text: '',
                hasContent: false,
                needsOCR: true,
            });
        }
    }

    return results;
}

/**
 * Check if text needs OCR (too short or garbage characters)
 */
function checkNeedsOCR(text: string): boolean {
    if (!text || text.length < 40) return true;

    // Check for high ratio of non-readable characters
    const readableChars = text.match(/[a-zA-Z0-9\s.,!?;:'"()\-]/g)?.length || 0;
    const ratio = readableChars / text.length;

    return ratio < 0.6;
}

/**
 * Get total page count from PDF
 */
export async function getPdfPageCount(pdfData: ArrayBuffer): Promise<number> {
    const clonedData = pdfData.slice(0);
    const pdf = await pdfjsLib.getDocument({
        data: clonedData,
        standardFontDataUrl: "https://unpkg.com/pdfjs-dist@4.8.69/standard_fonts/",
    }).promise;
    return pdf.numPages;
}

/**
 * Render a page to canvas for OCR
 */
export async function renderPageToCanvas(
    pdfData: ArrayBuffer,
    pageNumber: number,
    scale: number = 2.0
): Promise<HTMLCanvasElement> {
    const clonedData = pdfData.slice(0);
    const pdf = await pdfjsLib.getDocument({
        data: clonedData,
        standardFontDataUrl: "https://unpkg.com/pdfjs-dist@4.8.69/standard_fonts/",
    }).promise;
    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport: viewport,
    }).promise;

    return canvas;
}
