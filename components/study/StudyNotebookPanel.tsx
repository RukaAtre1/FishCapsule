"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { StepProgress, StepStatus } from "./StepProgress";
import { Step1Explain, Step2Synthesize, Step3Quiz, Step4Diagnose, QuizQuestion } from "@/lib/llm/schema";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, BookOpen, HelpCircle, Save, ArrowRight, ArrowLeft, AlertTriangle, FileText, Sparkles, Dumbbell } from "lucide-react";
import { globalQueue } from "@/lib/utils/queue";
import { CornellView } from "./CornellView";
import { buildCornellFromArtifacts, CornellNote, createSourceMeta } from "@/lib/study/cornellBuilder";
import { saveNotebook, generateNotebookId, NotebookRecord } from "@/lib/study/notebookStore";
import { PracticeTab } from "./PracticeTab";
import { LessonRunner } from "./LessonRunner";
import { getDueCount } from "@/lib/study/mistakeBankStore";

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

type TabType = "cornell" | "practice";
type PracticeMode = "idle" | "lesson" | "review";

interface Step1State {
    results: Record<number, Step1Explain>;
    loading: boolean;
    errors: Record<number, string>;
    globalError?: string;
    retrying?: boolean;
}

// Cache utilities
const CACHE_PREFIX = "fishcapsule_step1_";

function getCacheKey(sessionId: string, lectureId: string, page: number, textHash: string): string {
    return `${CACHE_PREFIX}${sessionId}_${lectureId}_${page}_${textHash}`;
}

function hashText(text: string): string {
    // Simple hash for demo; in production use a proper hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const chr = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash.toString(16);
}

function getFromCache(key: string): Step1Explain | null {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch {
        return null;
    }
}

function saveToCache(key: string, data: Step1Explain): void {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch {
        // Ignore storage errors
    }
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
    // Tab navigation state
    const [activeTab, setActiveTab] = useState<TabType>("cornell");
    const [practiceMode, setPracticeMode] = useState<PracticeMode>("idle");
    const [dueCount, setDueCount] = useState(0);
    const [practiceRefreshKey, setPracticeRefreshKey] = useState(0);

    // Refresh due count when tab changes
    useEffect(() => {
        if (activeTab === "practice") {
            setDueCount(getDueCount());
        }
    }, [activeTab, practiceRefreshKey]);

    const [currentStep, setCurrentStep] = useState(1);
    const [stepStatus, setStepStatus] = useState<StepStatus>("idle");

    // Step 1 state
    const [step1, setStep1] = useState<Step1State>({
        results: {},
        loading: false,
        errors: {},
    });

    // Step 2-4 states
    const [step2Result, setStep2Result] = useState<Step2Synthesize | null>(null);
    const [step3Result, setStep3Result] = useState<Step3Quiz | null>(null);
    const [step3Error, setStep3Error] = useState<{ message: string; canRetry: boolean; details?: any } | null>(null);
    const [step4Result, setStep4Result] = useState<Step4Diagnose | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

    // UI status message
    const [statusMessage, setStatusMessage] = useState<string>("");
    const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Build Cornell Notes from artifacts (memoized)
    const cornellNote = useMemo(() => {
        if (Object.keys(step1.results).length === 0) return null;
        return buildCornellFromArtifacts(
            step1.results,
            step2Result,
            step3Result,
            step4Result,
            pages
        );
    }, [step1.results, step2Result, step3Result, step4Result, pages]);

    // Derive step completion from data presence (not stepStatus)
    // step1Complete is already defined below - using step1Progress
    const hasStep2Data = step2Result !== null;
    const hasStep3Data = step3Result !== null;
    const hasStep4Data = step4Result !== null;

    // Batch Generation for Steps 1, 2, 3
    const startBatchGeneration = useCallback(async () => {
        setStepStatus("loading");
        setStep1(prev => ({ ...prev, loading: true, globalError: undefined }));
        setStatusMessage("Initializing unified study batch (Steps 1, 2, 3)...");

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

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Batch generation failed");

            // Apply all results at once
            const step1Results: Record<number, Step1Explain> = {};
            data.step1.forEach((r: Step1Explain) => {
                step1Results[r.page] = r;
            });

            setStep1(prev => ({
                ...prev,
                results: step1Results,
                loading: false,
            }));
            setStep2Result(data.step2);
            setStep3Result(data.step3);

            setStepStatus("completed");
            setStatusMessage("Notebook ready! All steps pre-generated.");
        } catch (err: any) {
            setStepStatus("error");
            setStep1(prev => ({ ...prev, loading: false, globalError: err.message }));
            setStatusMessage(`Error: ${err.message}`);
        }
    }, [pages, pageTexts, ocrTexts]);

    // Fetch Step 1 for ALL selected pages in a SINGLE batch request (Legacy fallback)
    const fetchStep1Batch = useCallback(async (pagesToFetch: number[]) => {

        try {
            // Build pageTexts object for request
            const pageTextsForRequest: Record<string, string> = {};
            const ocrTextsForRequest: Record<string, string> = {};
            pagesToFetch.forEach(page => {
                pageTextsForRequest[page.toString()] = pageTexts[page] || "";
                if (ocrTexts[page]) {
                    ocrTextsForRequest[page.toString()] = ocrTexts[page];
                }
            });

            const res = await fetch("/api/study/step1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pages: pagesToFetch,
                    pageTexts: pageTextsForRequest,
                    ocrTexts: ocrTextsForRequest,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Check for rate limit
                if (res.status === 429 || data.error?.includes("429") || data.error?.includes("quota")) {
                    setStatusMessage("Rate limit reached. Waiting to retry...");
                    setStep1(prev => ({ ...prev, loading: false, retrying: true, globalError: "Rate limit reached. The system will retry automatically." }));
                    // The backend should handle retry, but we can show a message
                    return;
                }
                throw new Error(data.error || "Failed to explain pages");
            }

            // data.results should be an array of Step1Explain
            const resultsArray: Step1Explain[] = data.results || [];
            const newResults: Record<number, Step1Explain> = {};

            resultsArray.forEach(item => {
                newResults[item.page] = item;
                // Cache each result
                const cacheKey = getCacheKey(sessionId, lectureId, item.page, hashText(pageTexts[item.page] || ""));
                saveToCache(cacheKey, item);
            });

            setStep1(prev => ({
                ...prev,
                results: { ...prev.results, ...newResults },
                loading: false,
                retrying: false,
            }));

            setStatusMessage(`Explained ${resultsArray.length} pages (Model: ${data.meta?.model || "unknown"})`);
            console.log(`[Step1] Batch complete: ${resultsArray.length} pages in ${data.meta?.totalMs}ms`);

        } catch (err: any) {
            setStep1(prev => ({
                ...prev,
                loading: false,
                globalError: err.message,
            }));
            setStatusMessage(`Error: ${err.message}`);
        }
    }, [pageTexts, ocrTexts, sessionId, lectureId]);

    // Start Step 1: Check cache first, then fetch missing pages
    const startStep1 = useCallback(() => {
        setStepStatus("loading");

        const cachedResults: Record<number, Step1Explain> = {};
        const missingPages: number[] = [];

        pages.forEach(page => {
            const cacheKey = getCacheKey(sessionId, lectureId, page, hashText(pageTexts[page] || ""));
            const cached = getFromCache(cacheKey);
            if (cached) {
                cachedResults[page] = cached;
            } else {
                missingPages.push(page);
            }
        });

        // Apply cached results immediately
        if (Object.keys(cachedResults).length > 0) {
            setStep1(prev => ({
                ...prev,
                results: { ...prev.results, ...cachedResults },
            }));
            console.log(`[Step1] Loaded ${Object.keys(cachedResults).length} pages from cache`);
        }

        // Fetch missing pages
        if (missingPages.length > 0) {
            fetchStep1Batch(missingPages);
        } else {
            setStepStatus("completed");
            setStatusMessage("All pages loaded from cache!");
        }
    }, [pages, pageTexts, sessionId, lectureId, fetchStep1Batch]);

    // Retry a single page with Queue protection
    const retryPage = useCallback((page: number) => {
        globalQueue.add(() => fetchStep1Batch([page]));
    }, [fetchStep1Batch]);

    // Check if Step 1 is complete enough for Step 2
    const step1Progress = Object.keys(step1.results).length / pages.length;
    const step1Complete = step1Progress === 1 && !step1.loading;
    const step1HasAnyResult = Object.keys(step1.results).length > 0;

    // Track if we've started Step 1 to prevent re-triggering
    const hasStartedRef = useRef(false);

    // AUTO-TRIGGER: Start Batch Generation when component mounts with valid data
    useEffect(() => {
        const hasPageTexts = pages.length > 0 && pages.some(p => pageTexts[p] && pageTexts[p].length > 0);

        if (hasPageTexts && currentStep === 1 && !hasStartedRef.current) {
            hasStartedRef.current = true;
            console.log("[Batch] Auto-starting unified generation for pages:", pages);
            startBatchGeneration();
        }
    }, [pages, pageTexts, currentStep, startBatchGeneration]);

    // Fetch Step 2
    const fetchStep2 = useCallback(async () => {
        setCurrentStep(2);
        setStepStatus("loading");
        setStatusMessage("Synthesizing key insights...");

        try {
            const summaries = Object.values(step1.results).map(r => ({
                page: r.page,
                takeaway: r.takeaway,
            }));

            const res = await fetch("/api/study/step2", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ summaries }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setStep2Result(data);
            setStepStatus("completed");
            setStatusMessage("Synthesis complete!");
        } catch (err: any) {
            setStepStatus("error");
            setStatusMessage(`Error: ${err.message}`);
        }
    }, [step1.results]);

    // Fetch Step 3
    const fetchStep3 = useCallback(async () => {
        if (!step2Result) return;
        setCurrentStep(3);
        setStepStatus("loading");
        setStatusMessage("Generating quiz...");
        setStep3Error(null);

        try {
            const summaries = Object.values(step1.results).map(r => ({
                page: r.page,
                takeaway: r.takeaway,
            }));

            const res = await fetch("/api/study/step3", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    keyIdeas: step2Result.keyIdeas,
                    summaries,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Handle specific error cases
                if (res.status === 400) {
                    // Request validation failed
                    setStep3Error({
                        message: "Input invalid (Step 1/2 missing). Please go back.",
                        canRetry: false,
                        details: data.issues,
                    });
                } else if (res.status === 502 || res.status === 422) {
                    // Response validation failed
                    setStep3Error({
                        message: "Quiz generation failed.",
                        canRetry: true,
                        details: data.issues,
                    });
                    if (process.env.NODE_ENV !== "production" && data.issues) {
                        console.error("[Step3] Validation issues:", data.issues);
                    }
                } else {
                    throw new Error(data.error || data.message || "Unknown error");
                }
                setStepStatus("error");
                setStatusMessage("");
                return;
            }

            setStep3Result(data);
            setStep3Error(null);
            setStepStatus("completed");
            setStatusMessage("Quiz ready!");
        } catch (err: any) {
            setStepStatus("error");
            setStep3Error({
                message: err.message || "An unexpected error occurred",
                canRetry: true,
            });
            setStatusMessage("");
        }
    }, [step1.results, step2Result]);

    // Submit quiz answers and fetch Step 4
    const submitQuizAndFetchStep4 = useCallback(async () => {
        if (!step3Result) return;
        setCurrentStep(4);
        setStepStatus("loading");
        setStatusMessage("Diagnosing learning gaps...");

        try {
            const results = step3Result.questions.map(q => ({
                question: q.prompt,
                isCorrect: quizAnswers[q.id] === q.answer,
                barrierTag: q.tag,
            }));

            const res = await fetch("/api/study/step4", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ results }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setStep4Result(data);
            setStepStatus("completed");
            setStatusMessage("Diagnosis complete!");
        } catch (err: any) {
            setStepStatus("error");
            setStatusMessage(`Error: ${err.message}`);
        }
    }, [step3Result, quizAnswers]);

    // Back navigation - only changes step, does NOT re-fetch or set status
    const handleBack = useCallback(() => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            // Don't set stepStatus - let UI derive from data presence
        }
    }, [currentStep]);

    // Save to Notebook
    const handleSaveToNotebook = useCallback(() => {
        if (!cornellNote) {
            setSaveStatus({ type: "error", message: "No notes to save yet" });
            return;
        }

        const record: NotebookRecord = {
            id: generateNotebookId(),
            timestamp: Date.now(),
            sourceMeta: createSourceMeta(pages, fileName, docId),
            cornell: cornellNote,
            artifacts: {
                step1: step1.results,
                step2: step2Result,
                step3: step3Result,
                step4: step4Result,
            },
        };

        if (saveNotebook(record)) {
            setSaveStatus({ type: "success", message: "Saved to Notebook!" });
            onSave?.(record);
        } else {
            setSaveStatus({ type: "error", message: "Failed to save" });
        }

        // Clear status after 3 seconds
        setTimeout(() => setSaveStatus(null), 3000);
    }, [cornellNote, pages, fileName, docId, step1.results, step2Result, step3Result, step4Result, onSave]);

    // Scroll to page section when cue clicked
    const handleCueClick = useCallback((cue: string, index: number) => {
        // Simple scroll to first notes section (minimal MVP)
        const firstPageEl = document.getElementById(`page-${pages[0]}`);
        firstPageEl?.scrollIntoView({ behavior: "smooth" });
    }, [pages]);

    return (
        <div className="h-full flex flex-col bg-background relative text-zinc-100">
            {/* Header with Tabs */}
            <div className="p-5 border-b border-white/5 bg-background/80 backdrop-blur-xl z-10 sticky top-0">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white tracking-tight">
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
                    </div>
                </div>

                {/* Save Toast */}
                {saveStatus && (
                    <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${saveStatus.type === "success"
                        ? "bg-green-950/30 border border-green-500/30 text-green-300"
                        : "bg-red-950/30 border border-red-500/30 text-red-300"
                        }`}>
                        {saveStatus.message}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 notebook-content">
                {/* Practice Overlay */}
                {practiceMode !== "idle" && (
                    <div className="absolute inset-0 z-50 bg-[#0B0F1A] flex flex-col">
                        <LessonRunner
                            pages={pages}
                            step1Results={step1.results}
                            step2Result={step2Result}
                            docId={docId}
                            mode={practiceMode}
                            onComplete={(run) => {
                                // Refresh due count and XP after lesson
                                setDueCount(getDueCount());
                                setPracticeRefreshKey(prev => prev + 1);
                                // We could also save the run record here if needed
                            }}
                            onExit={() => setPracticeMode("idle")}
                        />
                    </div>
                )}

                {/* Cornell Tab View */}
                {activeTab === "cornell" && (
                    <CornellView
                        cornell={cornellNote}
                        loading={step1.loading}
                        onCueClick={handleCueClick}
                    />
                )}

                {/* Practice Tab View */}
                {activeTab === "practice" && (
                    <PracticeTab
                        pages={pages}
                        step1Results={step1.results}
                        step2Result={step2Result}
                        refreshKey={practiceRefreshKey}
                        onStartLesson={() => setPracticeMode("lesson")}
                        onStartReview={() => setPracticeMode("review")}
                    />
                )}

                <>
                    {/* Step 1: Per-page Explain */}
                    {currentStep === 1 && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-medium text-white">
                                    Step 1: Explain Pages {pages.join(", ")}
                                </h3>
                                {Object.keys(step1.results).length === 0 && !step1.loading && (
                                    <Button onClick={startStep1}>
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        Start Explaining
                                    </Button>
                                )}
                            </div>

                            {/* Global Error */}
                            {step1.globalError && (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-200">
                                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                                    <span className="text-base">{step1.globalError}</span>
                                </div>
                            )}

                            {/* Per-page results (skeleton or filled) */}
                            {pages.map(page => (
                                <div key={page} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors group">
                                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                                        <span className="font-semibold text-lg text-slate-200">Page {page}</span>
                                        {step1.loading && !step1.results[page] && (
                                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                        )}
                                        {step1.results[page] && (
                                            <span className="text-xs text-green-400 font-medium">✓ Done</span>
                                        )}
                                        {step1.errors[page] && (
                                            <Button size="sm" variant="ghost" className="h-8 hover:bg-red-500/10 hover:text-red-400" onClick={() => retryPage(page)}>
                                                <RefreshCw className="w-3 h-3 mr-1" /> Retry
                                            </Button>
                                        )}
                                    </div>

                                    {/* Skeleton */}
                                    {step1.loading && !step1.results[page] && (
                                        <div className="space-y-4 animate-pulse">
                                            <div className="h-4 bg-white/10 rounded w-3/4"></div>
                                            <div className="h-4 bg-white/10 rounded w-1/2"></div>
                                            <div className="h-4 bg-white/10 rounded w-2/3"></div>
                                        </div>
                                    )}

                                    {step1.results[page] && (
                                        <div className="space-y-6">
                                            <div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Explanation</span>
                                                <p className="text-zinc-50 text-lg leading-8 tracking-wide">{step1.results[page].plain}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Example</span>
                                                <p className="text-slate-200 text-lg leading-8 italic border-l-2 border-white/10 pl-4 py-1">{step1.results[page].example}</p>
                                            </div>
                                            {/* FIXED: Takeaway with high contrast */}
                                            <div className="p-5 bg-primary/15 border border-primary/30 rounded-xl shadow-inner">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-bold text-primary tracking-wide uppercase">💡 Takeaway</span>
                                                </div>
                                                <p className="text-white font-semibold text-lg leading-8">{step1.results[page].takeaway}</p>
                                            </div>
                                        </div>
                                    )}

                                    {step1.errors[page] && (
                                        <p className="text-red-400 text-sm mt-2">{step1.errors[page]}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Synthesize */}
                    {currentStep === 2 && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xl font-semibold text-white mb-6">Step 2: Key Insights</h3>
                            {stepStatus === "loading" && (
                                <div className="flex items-center gap-3 text-zinc-300">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                    <span className="text-lg">Synthesizing key ideas...</span>
                                </div>
                            )}
                            {step2Result && (
                                <div className="space-y-6">
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Key Ideas</span>
                                        <ul className="space-y-3 pl-2">
                                            {step2Result.keyIdeas.map((idea, i) => (
                                                <li key={i} className="flex gap-3 text-zinc-50 text-lg leading-8">
                                                    <span className="text-primary font-bold">•</span>
                                                    {idea}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-5">
                                        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 block">Common Confusion</span>
                                        <p className="text-amber-100 text-lg leading-8">{step2Result.commonConfusion}</p>
                                    </div>
                                    <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-5">
                                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 block">Exam Angle</span>
                                        <p className="text-cyan-100 text-lg leading-8">{step2Result.examAngle}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Quiz */}
                    {currentStep === 3 && (
                        <div className="space-y-5">
                            <h3 className="text-xl font-medium text-white">Step 3: Quick Quiz</h3>

                            {/* Loading state */}
                            {stepStatus === "loading" && (
                                <div className="flex items-center gap-3 text-zinc-300 p-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                    <span className="text-lg">Generating quiz questions...</span>
                                </div>
                            )}

                            {/* Error state */}
                            {step3Error && (
                                <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-6">
                                    <div className="flex items-start gap-3 mb-4">
                                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-red-200 text-base">{step3Error.message}</p>
                                            {step3Error.details && process.env.NODE_ENV !== "production" && (
                                                <details className="mt-2 text-sm text-red-300/70">
                                                    <summary className="cursor-pointer">Technical details</summary>
                                                    <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto">
                                                        {JSON.stringify(step3Error.details, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        {step3Error.canRetry && (
                                            <Button onClick={fetchStep3} variant="outline" className="border-red-500/30 hover:bg-red-500/10">
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Retry Quiz
                                            </Button>
                                        )}
                                        {!step3Error.canRetry && (
                                            <Button onClick={() => setCurrentStep(2)} variant="outline">
                                                Go to Step 2
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Success: Quiz questions */}
                            {step3Result && !step3Error && (
                                <>
                                    {step3Result.questions.map((q, idx) => (
                                        <div key={q.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary font-medium">
                                                    {q.tag}
                                                </span>
                                                <span className="text-sm text-slate-400">
                                                    Question {idx + 1}
                                                </span>
                                            </div>
                                            <p className="font-medium text-lg text-white mb-4">{q.prompt}</p>
                                            {q.choices && (
                                                <div className="space-y-2">
                                                    {q.choices.map((choice, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => setQuizAnswers(prev => ({
                                                                ...prev,
                                                                [q.id]: choice.charAt(0),
                                                            }))}
                                                            className={`
                                                            w-full text-left p-4 rounded-lg border transition-all text-base
                                                            ${quizAnswers[q.id] === choice.charAt(0)
                                                                    ? "border-primary bg-primary/10 text-white"
                                                                    : "border-white/10 hover:border-primary/50 text-slate-200"
                                                                }
                                                        `}
                                                        >
                                                            {choice}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 4: Diagnose */}
                    {currentStep === 4 && step4Result && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xl font-medium text-white mb-6">Step 4: Learning Diagnosis</h3>
                            <div className="space-y-5">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-400">Primary Barrier:</span>
                                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary font-medium text-base">
                                        {step4Result.overallTag}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-400 block mb-2">Evidence:</span>
                                    <ul className="list-disc list-inside space-y-1 text-slate-200 text-base">
                                        {step4Result.evidence.map((e, i) => (
                                            <li key={i}>{e}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-400 block mb-2">10-Minute Action Plan:</span>
                                    <ol className="list-decimal list-inside space-y-1 text-green-300 text-base">
                                        {step4Result.microPlan.map((task, i) => (
                                            <li key={i}>{task}</li>
                                        ))}
                                    </ol>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-400 block mb-2">Review Schedule:</span>
                                    <div className="flex gap-2 mt-2">
                                        {step4Result.reviewPlan.map((r, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1 rounded bg-accent/20 text-accent text-sm font-medium"
                                            >
                                                {r.in}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
                )}
            </div>

            {/* Action Buttons - Show conditionally based on tab */}
            <div className="p-5 border-t border-white/10 action-buttons bg-[#0B0F1A] flex items-center gap-3 relative z-20">
                {/* Cornell Tab: Save Button */}
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

