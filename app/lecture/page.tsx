"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadSession, saveSession } from "@/lib/learning/storage";
import PDFViewer from "@/components/pdf/PDFViewer";
import SlideExplainPanel from "@/components/lecture/SlideExplainPanel";
import type { StudySession, CornellCard } from "@/types/learning";
import { ChevronLeft, Save, BookOpen, FileText, Loader2, Sparkles, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSlideExplain } from "@/hooks/useSlideExplain";

function LectureWorkspace() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session") || "";
    const lectureId = searchParams.get("lecture") || "";

    const [session, setSession] = useState<StudySession | null>(null);
    const [selectedRange, setSelectedRange] = useState<number[]>([]);
    const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
    const [notes, setNotes] = useState("");
    const [cues, setCues] = useState("");
    const [summary, setSummary] = useState("");
    const [showExplainPanel, setShowExplainPanel] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

    const {
        isLoading: isExplaining,
        isOCRing,
        error: explainError,
        result: explainResult,
        ocrProgress,
        explain,
        reset: resetExplain
    } = useSlideExplain(sessionId, lectureId);

    useEffect(() => {
        if (!sessionId) return;
        const loaded = loadSession(sessionId);
        setSession(loaded);

        // Load saved notes if available
        if (loaded?.cards?.[lectureId]) {
            const card = loaded.cards[lectureId];
            setCues(card.cues?.join("\n") || "");
            setNotes(card.notes?.join("\n") || "");
            setSummary(card.summary || "");
        }
    }, [sessionId, lectureId]);

    const handleRangeSelect = useCallback((range: number[]) => {
        setSelectedRange(range);
    }, []);

    const handlePdfLoaded = useCallback((buffer: ArrayBuffer, numPages: number) => {
        // Clone the buffer to avoid detachment issues
        setPdfBuffer(buffer.slice(0));
    }, []);

    const handleExplain = useCallback(async () => {
        if (!pdfBuffer || selectedRange.length === 0) return;
        setShowExplainPanel(true);
        await explain(pdfBuffer, selectedRange);
    }, [pdfBuffer, selectedRange, explain]);

    const handleCloseExplainPanel = useCallback(() => {
        setShowExplainPanel(false);
        resetExplain();
    }, [resetExplain]);

    const handleAddToNotebook = useCallback(() => {
        if (!explainResult) return;

        // Add key points to cues
        const newCues = explainResult.keyPoints.slice(0, 3).map(p => `• ${p}`).join("\n");
        setCues(prev => prev ? `${prev}\n\n${newCues}` : newCues);

        // Add why it matters to notes
        const newNotes = explainResult.whyItMatters.map(p => `- ${p}`).join("\n");
        setNotes(prev => prev ? `${prev}\n\n${newNotes}` : newNotes);

        // Add summary
        const quickSummary = explainResult.titleGuess
            ? `**${explainResult.titleGuess}**: ${explainResult.whyItMatters[0] || ""}`
            : explainResult.whyItMatters[0] || "";
        setSummary(prev => prev ? `${prev}\n\n${quickSummary}` : quickSummary);

        // Switch back to notebook view
        setShowExplainPanel(false);
        resetExplain();
    }, [explainResult, resetExplain]);

    const handleSaveNotes = useCallback(() => {
        if (!session) return;

        setSaveStatus("saving");

        // Create Cornell card
        const card: CornellCard = {
            conceptId: lectureId,
            conceptTitle: session.outline.find(l => l.lectureId === lectureId)?.title || "Unknown",
            cues: cues.split("\n").filter(c => c.trim()),
            notes: notes.split("\n").filter(n => n.trim()),
            summary: summary,
            misconceptions: [],
            quickCheck: [],
        };

        // Update session
        const updatedSession: StudySession = {
            ...session,
            cards: {
                ...session.cards,
                [lectureId]: card,
            },
        };

        saveSession(updatedSession);
        setSession(updatedSession);

        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
    }, [session, lectureId, cues, notes, summary]);

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
                    {selectedRange.length > 0 && (
                        <>
                            <Badge variant="secondary" className="px-3 py-1.5 gap-2">
                                <FileText className="w-3.5 h-3.5" />
                                {selectedRange.length} page{selectedRange.length > 1 ? 's' : ''} selected
                            </Badge>
                            <Button
                                size="sm"
                                onClick={handleExplain}
                                disabled={isExplaining || !pdfBuffer}
                                className="gap-2"
                            >
                                {isExplaining ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {isOCRing ? `OCR ${ocrProgress?.current || 0}/${ocrProgress?.total || 0}` : "Analyzing..."}
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
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleSaveNotes}
                        disabled={saveStatus === "saving"}
                    >
                        {saveStatus === "saving" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saveStatus === "saved" ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saveStatus === "saved" ? "Saved!" : "Save Notes"}
                    </Button>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex-grow flex overflow-hidden">
                {/* Left: PDF Viewer */}
                <div className="flex-1 border-r overflow-hidden">
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

                {/* Right: Cornell Notebook or Explain Panel */}
                <div className="flex-1 overflow-hidden">
                    <div className="h-full flex flex-col">
                        <div className="flex-shrink-0 px-6 py-3 bg-muted/10 border-b flex items-center justify-between">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {showExplainPanel ? "Slide Explanation" : "Cornell Notebook"}
                            </h2>
                            {showExplainPanel && (
                                <Button variant="ghost" size="icon" onClick={handleCloseExplainPanel} className="h-6 w-6">
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {showExplainPanel ? (
                                // Explain Panel
                                <div className="h-full">
                                    {(isExplaining || isOCRing) && (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="text-center space-y-4">
                                                <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                                                <p className="text-muted-foreground text-sm">
                                                    {isOCRing
                                                        ? `Running OCR... (${ocrProgress?.current || 0}/${ocrProgress?.total || 0} pages)`
                                                        : "Analyzing slides..."
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {explainError && !isExplaining && (
                                        <div className="p-6">
                                            <Card className="bg-destructive/10 border-destructive/20">
                                                <CardContent className="p-4 text-center">
                                                    <p className="text-destructive text-sm">{explainError}</p>
                                                    <Button variant="outline" size="sm" onClick={handleCloseExplainPanel} className="mt-4">
                                                        Go Back
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                    {explainResult && !isExplaining && (
                                        <SlideExplainPanel
                                            data={explainResult}
                                            onAddToNotebook={handleAddToNotebook}
                                        />
                                    )}
                                </div>
                            ) : (
                                // Cornell Notebook
                                <div className="p-6 space-y-6 h-full flex flex-col">
                                    {/* Cues */}
                                    <Card className="bg-card/50">
                                        <CardHeader className="py-3 px-4 border-b">
                                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                Cues / Questions
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <Textarea
                                                className="min-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 rounded-none p-4"
                                                placeholder="Add keywords, questions, or main ideas..."
                                                value={cues}
                                                onChange={(e) => setCues(e.target.value)}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* Notes */}
                                    <Card className="bg-card/50 flex-grow flex flex-col min-h-[300px]">
                                        <CardHeader className="py-3 px-4 border-b flex-shrink-0">
                                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                Notes
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0 flex-grow">
                                            <Textarea
                                                className="h-full resize-none border-0 bg-transparent focus-visible:ring-0 rounded-none p-4"
                                                placeholder="Take detailed notes here during the lecture..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* Summary */}
                                    <Card className="bg-card/50">
                                        <CardHeader className="py-3 px-4 border-b">
                                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                Summary
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <Textarea
                                                className="min-h-[100px] resize-none border-0 bg-transparent focus-visible:ring-0 rounded-none p-4"
                                                placeholder="Summarize the main points in your own words..."
                                                value={summary}
                                                onChange={(e) => setSummary(e.target.value)}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
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
