"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadSession, saveSession } from "@/lib/learning/storage";
import PDFViewer from "@/components/pdf/PDFViewer";
import { StudyNotebookPanel } from "@/components/study/StudyNotebookPanel";
import type { StudySession, CornellCard } from "@/types/learning";
import { ChevronLeft, Loader2, Sparkles, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { extractTextFromPages, PageText } from "@/lib/pdf/extractor";

function LectureWorkspace() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session") || "";
    const lectureId = searchParams.get("lecture") || "";

    const [session, setSession] = useState<StudySession | null>(null);
    const [selectedRange, setSelectedRange] = useState<number[]>([]);
    const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
    const [showStepFlow, setShowStepFlow] = useState(false);
    const [pageTexts, setPageTexts] = useState<Record<number, string>>({});
    const [isExtractingText, setIsExtractingText] = useState(false);

    useEffect(() => {
        if (!sessionId) return;
        const loaded = loadSession(sessionId);
        setSession(loaded);
    }, [sessionId]);

    const handleRangeSelect = useCallback((range: number[]) => {
        setSelectedRange(range);
    }, []);

    const handlePdfLoaded = useCallback((buffer: ArrayBuffer, numPages: number) => {
        setPdfBuffer(buffer.slice(0));
    }, []);

    const handleStartStepFlow = useCallback(async () => {
        if (!pdfBuffer || selectedRange.length === 0) return;

        setIsExtractingText(true);
        try {
            // Extract text from selected pages
            const texts = await extractTextFromPages(pdfBuffer, selectedRange);
            const textMap: Record<number, string> = {};
            texts.forEach((pt: PageText) => {
                textMap[pt.pageNumber] = pt.text;
            });
            setPageTexts(textMap);
            setShowStepFlow(true);
        } catch (err) {
            console.error("Text extraction error:", err);
        } finally {
            setIsExtractingText(false);
        }
    }, [pdfBuffer, selectedRange]);

    if (!session) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground text-sm">Loading session...</p>
                </div>
            </div>
        );
    }

    const lectureNode = session.outline.find(l => l.lectureId === lectureId);
    const lectureTitle = lectureNode?.title || "Unknown Lecture";

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="flex-shrink-0 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-6 justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/course?session=${sessionId}`)}
                        className="rounded-full"
                    >
                        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                    </Button>
                    <div>
                        <h1 className="text-base font-semibold truncate max-w-[350px] text-foreground">
                            {lectureTitle}
                        </h1>
                        <p className="text-xs uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                            <BookOpen className="w-3 h-3" />
                            {session.courseTitle || "Course"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {selectedRange.length > 0 && !showStepFlow && (
                        <>
                            <Badge variant="secondary" className="px-3 py-1.5 gap-2">
                                <FileText className="w-3.5 h-3.5" />
                                {selectedRange.length} page{selectedRange.length > 1 ? 's' : ''} selected
                            </Badge>
                            <Button
                                size="sm"
                                onClick={handleStartStepFlow}
                                disabled={isExtractingText || !pdfBuffer}
                                className="gap-2"
                            >
                                {isExtractingText ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Extracting...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Explain Selection
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                    {showStepFlow && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowStepFlow(false)}
                        >
                            Back to PDF
                        </Button>
                    )}
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex-grow flex overflow-hidden">
                {/* Left: PDF Viewer */}
                <div className="flex-[0.38] border-r overflow-hidden">
                    <div className="h-full flex flex-col">
                        <div className="flex-shrink-0 px-6 py-3 bg-muted/10 border-b">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Source Material
                            </h2>
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <PDFViewer
                                onRangeSelect={handleRangeSelect}
                                onPdfLoaded={handlePdfLoaded}
                                maxRangeSize={5}
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Step Flow Panel */}
                <div className="flex-[0.62] overflow-hidden">
                    <div className="h-full flex flex-col">
                        <div className="flex-shrink-0 px-6 py-3 bg-muted/10 border-b">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {showStepFlow ? "Study Notebook" : "Select pages to begin"}
                            </h2>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {showStepFlow ? (
                                <StudyNotebookPanel
                                    pages={selectedRange}
                                    pageTexts={pageTexts}
                                    onSave={(data) => {
                                        console.log("Saving study data:", data);
                                    }}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <div className="text-center space-y-4">
                                        <Sparkles className="w-12 h-12 mx-auto opacity-30" />
                                        <p>Select 1-5 pages and click &quot;Explain Selection&quot;<br />to start the 4-step learning flow.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer with Version */}
            <footer className="h-8 border-t bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
                FishCapsule • Gemini 3 Flash
            </footer>
        </div>
    );
}

export default function LecturePage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground text-sm">Loading workspace...</p>
                </div>
            </div>
        }>
            <LectureWorkspace />
        </Suspense>
    );
}
