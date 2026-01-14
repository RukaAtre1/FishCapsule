import { openDB, DBSchema } from "idb";

interface FishCapsuleDB extends DBSchema {
    pdfs: {
        key: string;
        value: {
            deckId: string;
            file: Blob; // The full PDF file
            pageCount: number;
            name: string;
            uploadedAt: number;
        };
    };
    chunks: {
        key: [string, number]; // Composite key: deckId + pageIndex
        value: {
            deckId: string;
            pageIndex: number; // 0-indexed
            text: string;
            chunkId: string; // Hash of text
            extractedAt: number;
        };
    };
}

const DB_NAME = "fishcapsule-db";
const DB_VERSION = 1;

export async function initDB() {
    return openDB<FishCapsuleDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("pdfs")) {
                db.createObjectStore("pdfs", { keyPath: "deckId" });
            }
            if (!db.objectStoreNames.contains("chunks")) {
                db.createObjectStore("chunks", { keyPath: ["deckId", "pageIndex"] });
            }
        },
    });
}

export async function storePDF(deckId: string, file: File, pageCount: number) {
    const db = await initDB();
    await db.put("pdfs", {
        deckId,
        file,
        pageCount,
        name: file.name,
        uploadedAt: Date.now(),
    });
}

export async function getPDF(deckId: string) {
    const db = await initDB();
    return db.get("pdfs", deckId);
}

export async function storePageText(
    deckId: string,
    pageIndex: number,
    text: string,
    chunkId: string
) {
    const db = await initDB();
    await db.put("chunks", {
        deckId,
        pageIndex,
        text,
        chunkId,
        extractedAt: Date.now(),
    });
}

export async function getPageText(deckId: string, pageIndex: number) {
    const db = await initDB();
    return db.get("chunks", [deckId, pageIndex]);
}

/**
 * Checks if we have text for a specific page range
 */
export async function hasPageText(deckId: string, pageIndex: number): Promise<boolean> {
    const page = await getPageText(deckId, pageIndex);
    return !!page && page.text.length > 0;
}
