"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, Save, FileText, Dumbbell, ExternalLink, BarChart3 } from "lucide-react";
import { CornellView } from "./CornellView";
import { CornellNoteV2, CueV2, PageNoteV2, SummaryCard, createSourceMeta } from "@/lib/study/cornellBuilder";
import { saveNotebook, generateNotebookId, NotebookRecord } from "@/lib/study/notebookStore";
import { PracticeTab } from "./PracticeTab";
import { LessonRunner } from "./LessonRunner";
import { getDueCount } from "@/lib/study/mistakeBankStore";
import { MetricsDashboard } from "./MetricsDashboard";
import { recordEvent, computeEvidenceCoverage } from "@/lib/study/metricsStore";

interface StudyNotebookPanelProps {
    pages: number[];
    pageTexts: Record<number, string>;
    ocrTexts?: Record<number, string>;
    sessionId?: string;
    lectureId?: string;
    fileName?: string;
    docId?: string;
    onSave?: (data: any) => void;
}

type TabType = "cornell" | "practice" | "dashboard";
type PracticeMode = "idle" | "lesson" | "review";

// PRD v2.3: API response types
interface BatchAPIResponse {
    step1: PageNoteV2[];
    step2: {
        cues: CueV2[];
        keyIdeas: string[];
        commonConfusion: string;
        examAngle: string;
    } | null;
    step3: SummaryCard | null;
    cues: CueV2[];
    warnings?: string[];
    meta: {
        totalMs: number;
        model: string;
        attempts: number;
        version?: string;
    };
}

interface CornellState {
    notes: PageNoteV2[];
    cues: CueV2[];
    summary: SummaryCard | null;
    loading: boolean;
    error?: string;
}

export function StudyNotebookPanel({
    pages,
    pageTexts,
    ocrTexts = {},
    sessionId = "default",
    lectureId = "default",
    fileName,
    docId,
    onSave,
}: StudyNotebookPanelProps) {
    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>("cornell");
    const [practiceMode, setPracticeMode] = useState<PracticeMode>("idle");
    const [practiceRefreshKey, setPracticeRefreshKey] = useState(0);
    const [dueCount, setDueCount] = useState(0);

    // Cornell state (v2.3 format)
    const [cornellState, setCornellState] = useState<CornellState>({
        notes: [],
        cues: [],
        summary: null,
        loading: false,
    });

    // Save status with notebook ID for "Open Notebook" feature
    const [saveStatus, setSaveStatus] = useState<{
        type: "success" | "error";
        message: string;
        notebookId?: string;
    } | null>(null);

    // Load due count on mount
    useEffect(() => {
        setDueCount(getDueCount());
    }, []);

    // Build CornellNoteV2 from state
    const cornellNote = useMemo<CornellNoteV2 | null>(() => {
        if (cornellState.notes.length === 0) return null;

        return {
            cues: cornellState.cues,
            notes: cornellState.notes,
            summary: cornellState.summary || {
                memorize: ["Key concept 1", "Key concept 2", "Key concept 3"],
                examQs: ["What is the main idea?", "How does this apply?"]
            },
        };
    }, [cornellState.notes, cornellState.cues, cornellState.summary]);

    // Fetch via Batch API (v2.4)
    const startBatchGeneration = useCallback(async () => {
        if (pages.length === 0) return;

        setCornellState(prev => ({ ...prev, loading: true, error: undefined }));
        const batchStartMs = Date.now();
        recordEvent({ type: "step_start", data: { step: "batch_generation", pages: pages.length } });

        try {
            const pageTextsForRequest: Record<string, string> = {};
            const ocrTextsForRequest: Record<string, string> = {};
            pages.forEach(page => {
                pageTextsForRequest[page.toString()] = pageTexts[page] || "";
                if (ocrTexts[page]) {
                    ocrTextsForRequest[page.toString()] = ocrTexts[page];
                }
            });

            const res = await fetch("/api/study/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pages,
                    pageTexts: pageTextsForRequest,
                    ocrTexts: ocrTextsForRequest,
                }),
            });

            const data: BatchAPIResponse = await res.json();

            if (!res.ok) {
                throw new Error((data as any).error || "Batch generation failed");
            }

            const latencyMs = Date.now() - batchStartMs;
            recordEvent({
                type: "step_done",
                data: {
                    step: "batch_generation",
                    latencyMs,
                    model: data.meta?.model,
                    isFallback: (data.meta?.attempts ?? 1) > 1,
                },
            });

            // Update state with v2.4 format data
            const notes = data.step1 || [];
            setCornellState({
                notes,
                cues: data.cues || data.step2?.cues || [],
                summary: data.step3 || null,
                loading: false,
            });

            // Record evidence coverage metric
            const coverage = computeEvidenceCoverage(notes);
            recordEvent({ type: "evidence_coverage", data: { coverage } });

        } catch (err: any) {
            recordEvent({
                type: "step_fail",
                data: {
                    step: "batch_generation",
                    error: err.message,
                    timeout: err.name === "AbortError",
                },
            });
            setCornellState(prev => ({
                ...prev,
                loading: false,
                error: err.message || "Failed to generate content",
            }));
        }
    }, [pages, pageTexts, ocrTexts]);

    // Auto-trigger batch generation on mount if no results
    useEffect(() => {
        if (pages.length > 0 && cornellState.notes.length === 0 && !cornellState.loading) {
            startBatchGeneration();
        }
    }, [pages, cornellState.notes.length, cornellState.loading, startBatchGeneration]);

    // Handle cue click
    const handleCueClick = useCallback((cue: CueV2 | string, index: number) => {
        console.log("Cue clicked:", cue);
        // Could scroll to related content or show detail modal
    }, []);

    // Handle Cloze generation from takeaway
    const handleGenerateCloze = useCallback((takeaway: string, page: number) => {
        console.log("Generate Cloze from:", takeaway, "page:", page);
        // TODO: Integrate with practice system
    }, []);

    // Save to notebook (PRD v2.3: with Open Notebook button)
    const handleSaveToNotebook = useCallback(() => {
        if (!cornellNote) return;

        try {
            const notebookId = generateNotebookId();
            const record: NotebookRecord = {
                id: notebookId,
                timestamp: Date.now(),
                sourceMeta: createSourceMeta(pages, fileName, docId),
                cornell: cornellNote as any, // Type compatible
                artifacts: {
                    step1: cornellState.notes.reduce((acc, n) => ({ ...acc, [n.page]: n }), {}),
                    step2: null,
                    step3: null,
                    step4: null,
                },
            };
            saveNotebook(record);

            // PRD v2.3: Show doc title + Open Notebook button
            const docTitle = fileName || "Notebook";
            setSaveStatus({
                type: "success",
                message: `✅ Saved to "${docTitle}"`,
                notebookId: notebookId
            });

            // Don't auto-clear so user can click "Open Notebook"
        } catch (err) {
            setSaveStatus({ type: "error", message: "Failed to save" });
            setTimeout(() => setSaveStatus(null), 3000);
        }
    }, [cornellNote, cornellState.notes, fileName, docId, pages]);

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Header with Tabs */}
            <div className="p-5 border-b border-white/10 shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-white tracking-tight">
                        Study Notebook
                    </h2>

                    {/* Tab Switcher */}
                    <div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
                        <button
                            onClick={() => setActiveTab("cornell")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "cornell"
                                ? "bg-primary text-white shadow-sm"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            Cornell Notes
                        </button>
                        <button
                            onClick={() => setActiveTab("practice")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "practice"
                                ? "bg-primary text-white shadow-sm"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <Dumbbell className="w-4 h-4" />
                            Practice
                            {dueCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200 text-[10px] font-bold">
                                    {dueCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("dashboard")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "dashboard"
                                ? "bg-primary text-white shadow-sm"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Dashboard
                        </button>
                    </div>
                </div>

                {/* PRD v2.3: Enhanced Save Toast with Open Notebook button */}
                {saveStatus && (
                    <div className={`mt-3 p-3 rounded-lg text-sm font-medium flex items-center justify-between ${saveStatus.type === "success"
                        ? "bg-green-950/30 border border-green-500/30 text-green-300"
                        : "bg-red-950/30 border border-red-500/30 text-red-300"
                        }`}>
                        <span>{saveStatus.message}</span>
                        {saveStatus.type === "success" && saveStatus.notebookId && (
                            <div className="flex items-center gap-2">
                                <Link href={`/notebooks/${saveStatus.notebookId}`}>
                                    <Button variant="ghost" size="sm" className="text-green-300 hover:text-green-100 hover:bg-green-900/30">
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Open Notebook
                                    </Button>
                                </Link>
                                <button
                                    onClick={() => setSaveStatus(null)}
                                    className="text-slate-500 hover:text-slate-300 text-xs"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 notebook-content">
                {/* Practice Overlay (Lesson Runner) */}
                {practiceMode !== "idle" && (
                    <div className="absolute inset-0 z-50 bg-background flex flex-col">
                        <LessonRunner
                            pages={pages}
                            step1Results={cornellState.notes.reduce((acc, n) => ({ ...acc, [n.page]: n }), {})}
                            step2Result={null}
                            docId={docId}
                            mode={practiceMode}
                            onComplete={() => {
                                setDueCount(getDueCount());
                                setPracticeRefreshKey(prev => prev + 1);
                            }}
                            onExit={() => setPracticeMode("idle")}
                        />
                    </div>
                )}

                {/* Cornell Tab View */}
                {activeTab === "cornell" && (
                    <CornellView
                        cornell={cornellNote}
                        loading={cornellState.loading}
                        onCueClick={handleCueClick}
                        onGenerateCloze={handleGenerateCloze}
                    />
                )}

                {/* Practice Tab View */}
                {activeTab === "practice" && (
                    <PracticeTab
                        pages={pages}
                        step1Results={cornellState.notes.reduce((acc, n) => ({ ...acc, [n.page]: n }), {})}
                        step2Result={null}
                        refreshKey={practiceRefreshKey}
                        onStartLesson={() => setPracticeMode("lesson")}
                        onStartReview={() => setPracticeMode("review")}
                    />
                )}

                {/* Dashboard Tab View */}
                {activeTab === "dashboard" && (
                    <MetricsDashboard />
                )}
            </div>

            {/* Action Buttons */}
            <div className="p-5 border-t border-white/10 action-buttons bg-background flex items-center gap-3 relative z-20">
                {activeTab === "cornell" && cornellNote && (
                    <Button onClick={handleSaveToNotebook} size="lg" className="text-base">
                        <Save className="w-4 h-4 mr-2" />
                        Save to Notebook
                    </Button>
                )}
            </div>

            {/* Floating Help Button */}
            <button
                className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-5 py-3 rounded-full 
                           bg-gradient-to-r from-cyan-900/60 to-cyan-800/60 
                           border-2 border-cyan-400/50 
                           text-cyan-100 
                           shadow-lg shadow-cyan-500/30 
                           backdrop-blur-md 
                           hover:bg-cyan-800/70 hover:border-cyan-300/70 hover:text-white hover:shadow-cyan-400/50 
                           transition-all duration-300 group"
            >
                <HelpCircle className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-sm">I&apos;m confused</span>
            </button>
        </div>
    );
}

export default StudyNotebookPanel;
