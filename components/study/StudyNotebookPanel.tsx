"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { StepProgress, StepStatus } from "./StepProgress";
import { Step1Explain, Step2Synthesize, Step3Quiz, Step4Diagnose, QuizQuestion } from "@/lib/llm/schema";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, BookOpen, HelpCircle, Save, ArrowRight, AlertTriangle } from "lucide-react";
import { globalQueue } from "@/lib/utils/queue";

interface StudyNotebookPanelProps {
    pages: number[];
    pageTexts: Record<number, string>;
    ocrTexts?: Record<number, string>;
    sessionId?: string;
    lectureId?: string;
    onSave?: (data: any) => void;
}

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
    onSave,
}: StudyNotebookPanelProps) {
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
    const [step4Result, setStep4Result] = useState<Step4Diagnose | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

    // UI status message
    const [statusMessage, setStatusMessage] = useState<string>("");

    // Fetch Step 1 for ALL selected pages in a SINGLE batch request
    const fetchStep1Batch = useCallback(async (pagesToFetch: number[]) => {
        if (pagesToFetch.length === 0) return;

        setStep1(prev => ({
            ...prev,
            loading: true,
            globalError: undefined,
        }));
        setStatusMessage("Generating explanations...");

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

    // AUTO-TRIGGER: Start Step 1 when component mounts with valid data
    useEffect(() => {
        const hasPageTexts = pages.length > 0 && pages.some(p => pageTexts[p] && pageTexts[p].length > 0);

        if (hasPageTexts && currentStep === 1 && !hasStartedRef.current) {
            hasStartedRef.current = true;
            console.log("[Step1] Auto-starting batch for pages:", pages);
            startStep1();
        }
    }, [pages, pageTexts, currentStep, startStep1]);

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
            if (!res.ok) throw new Error(data.error);

            setStep3Result(data);
            setStepStatus("completed");
            setStatusMessage("Quiz ready!");
        } catch (err: any) {
            setStepStatus("error");
            setStatusMessage(`Error: ${err.message}`);
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

    return (
        <div className="h-full flex flex-col bg-[#0B0F1A] relative text-zinc-100">
            {/* Header */}
            <div className="p-5 border-b border-white/5 bg-[#0B0F1A]/80 backdrop-blur-xl z-10 sticky top-0">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white tracking-tight">
                        Study Notebook
                    </h2>
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 font-medium tabular-nums shadow-sm">
                        {currentStep === 1 && `Step 1/4 • Explaining ${Object.keys(step1.results).length}/${pages.length} pages`}
                        {currentStep === 2 && "Step 2/4 • Synthesize"}
                        {currentStep === 3 && "Step 3/4 • Quiz"}
                        {currentStep === 4 && "Step 4/4 • Diagnosis"}
                    </span>
                </div>
                <StepProgress
                    currentStep={currentStep}
                    totalSteps={4}
                    status={stepStatus}
                />
                {/* Status Message */}
                {statusMessage && (
                    <p className="mt-2 text-sm text-slate-400">{statusMessage}</p>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 notebook-content">
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
                {currentStep === 3 && step3Result && (
                    <div className="space-y-5">
                        <h3 className="text-xl font-medium text-white">Step 3: Quick Quiz</h3>
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
            </div>

            {/* Action Buttons */}
            <div className="p-5 border-t border-white/10 action-buttons bg-[#0B0F1A] flex items-center gap-3 relative z-20">
                {currentStep === 1 && step1HasAnyResult && !step1.loading && (
                    <Button onClick={fetchStep2} size="lg" className="text-base">
                        Next: Synthesize
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
                {currentStep === 2 && step2Result && (
                    <Button onClick={fetchStep3} size="lg" className="text-base">
                        Try Quiz
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
                {currentStep === 3 && step3Result && (
                    <Button onClick={submitQuizAndFetchStep4} size="lg" className="text-base">
                        Submit & Diagnose
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
                {currentStep === 4 && step4Result && (
                    <Button onClick={() => onSave?.({ step1, step2Result, step3Result, step4Result })} size="lg" className="text-base">
                        <Save className="w-4 h-4 mr-2" />
                        Save to Notebook
                    </Button>
                )}
            </div>

            {/* FIXED: Floating Help Button - Always Visible with Glow */}
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
