"use client";

import React from "react";
import { CornellNote } from "@/lib/study/cornellBuilder";
import { Loader2 } from "lucide-react";

interface CornellViewProps {
    cornell: CornellNote | null;
    loading?: boolean;
    onCueClick?: (cue: string, index: number) => void;
}

export function CornellView({ cornell, loading, onCueClick }: CornellViewProps) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-lg">Building Cornell Notes...</p>
            </div>
        );
    }

    if (!cornell) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                <p className="text-lg mb-2">No notes generated yet</p>
                <p className="text-sm">Switch to the Generation tab to create study content</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Main Content: Cues + Notes */}
            <div className="flex gap-4">
                {/* Cues Column (Left - 30%) */}
                <div className="w-[30%] shrink-0">
                    <div className="sticky top-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                            Cues / Recall
                        </h4>
                        <div className="space-y-2">
                            {cornell.cues.map((cue, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onCueClick?.(cue, idx)}
                                    className="w-full text-left p-3 rounded-lg bg-primary/10 border border-primary/20 
                                               text-primary hover:bg-primary/20 hover:border-primary/40 
                                               transition-all text-sm font-medium"
                                >
                                    {cue}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Notes Column (Right - 70%) */}
                <div className="flex-1 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Notes
                    </h4>
                    {cornell.notes.map((pageNote) => (
                        <div
                            key={pageNote.page}
                            id={`page-${pageNote.page}`}
                            className="bg-white/5 border border-white/10 rounded-xl p-5"
                        >
                            <div className="text-xs text-slate-500 mb-3 font-medium">
                                Page {pageNote.page}
                            </div>
                            <ul className="space-y-2">
                                {pageNote.bullets.map((bullet, idx) => (
                                    <li
                                        key={idx}
                                        className={`text-base leading-relaxed ${bullet.startsWith("💡")
                                                ? "text-amber-200 font-medium bg-amber-950/20 p-2 rounded-lg border-l-2 border-amber-500/50"
                                                : bullet.startsWith("Example:")
                                                    ? "text-slate-300 italic pl-4 border-l-2 border-white/10"
                                                    : "text-zinc-100"
                                            }`}
                                    >
                                        {bullet}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary Section (Bottom) */}
            <div className="bg-gradient-to-r from-cyan-950/30 to-blue-950/30 border border-cyan-500/20 rounded-xl p-5">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">
                    Summary
                </h4>
                <p className="text-cyan-100 text-base leading-relaxed">
                    {cornell.summary || "No summary available."}
                </p>
            </div>

            {/* Review Plan (Optional) */}
            {cornell.reviewPlan && cornell.reviewPlan.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Review Schedule
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {cornell.reviewPlan.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                            >
                                <span className="text-xs font-bold text-primary bg-primary/20 px-2 py-0.5 rounded">
                                    {item.in}
                                </span>
                                <span className="text-sm text-slate-300">{item.task}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
