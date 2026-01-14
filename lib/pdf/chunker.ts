import crypto from "crypto";

export interface TextChunk {
    page: number;
    chunkId: string;
    text: string;
}

/**
 * Generate a stable chunk ID from text content
 */
export function generateChunkId(text: string): string {
    // Use a simple hash for browser compatibility
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Split page text into semantic chunks for LLM processing
 * Target: 100-200 tokens per chunk (roughly 400-800 characters)
 */
export function chunkPageText(pageText: string, pageNumber: number): TextChunk[] {
    const chunks: TextChunk[] = [];

    if (!pageText || pageText.trim().length === 0) {
        return chunks;
    }

    // Clean the text
    const cleanedText = pageText
        .replace(/\s+/g, ' ')
        .trim();

    // Split by paragraphs or bullet points first
    const sections = cleanedText.split(/(?:\n\s*\n|•|▪|▸|►|◆|○|●|\d+\.\s)/);

    let currentChunk = '';
    const TARGET_SIZE = 500; // characters
    const MAX_SIZE = 800;

    for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        if (currentChunk.length + trimmed.length < TARGET_SIZE) {
            currentChunk += (currentChunk ? ' ' : '') + trimmed;
        } else {
            // Save current chunk if it has content
            if (currentChunk.length > 30) {
                chunks.push({
                    page: pageNumber,
                    chunkId: `p${pageNumber}-${generateChunkId(currentChunk)}`,
                    text: currentChunk,
                });
            }

            // Start new chunk with this section
            if (trimmed.length > MAX_SIZE) {
                // Split long sections by sentences
                const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
                currentChunk = '';
                for (const sentence of sentences) {
                    if (currentChunk.length + sentence.length < TARGET_SIZE) {
                        currentChunk += (currentChunk ? ' ' : '') + sentence.trim();
                    } else {
                        if (currentChunk.length > 30) {
                            chunks.push({
                                page: pageNumber,
                                chunkId: `p${pageNumber}-${generateChunkId(currentChunk)}`,
                                text: currentChunk,
                            });
                        }
                        currentChunk = sentence.trim();
                    }
                }
            } else {
                currentChunk = trimmed;
            }
        }
    }

    // Don't forget the last chunk
    if (currentChunk.length > 30) {
        chunks.push({
            page: pageNumber,
            chunkId: `p${pageNumber}-${generateChunkId(currentChunk)}`,
            text: currentChunk,
        });
    }

    return chunks;
}

/**
 * Check if text needs OCR (too short or garbage characters)
 */
export function needsOCR(text: string): boolean {
    if (!text || text.length < 40) return true;

    // Check for high ratio of non-readable characters
    const readableChars = text.match(/[a-zA-Z0-9\s.,!?;:'"()-]/g)?.length || 0;
    const ratio = readableChars / text.length;

    return ratio < 0.6;
}
