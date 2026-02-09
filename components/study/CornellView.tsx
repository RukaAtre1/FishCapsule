"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Eye, Sparkles } from "lucide-react";
import type { CornellNoteV2, CueV2, PageNoteV2, SummaryCard, BarrierTagV2, SourceType } from "@/lib/study/cornellBuilder";
import { Loader2 } from "lucide-react";

// Props for legacy compatibility
interface LegacyCornellNote {
    cues: string[];
    notes: { page: number; bullets: string[] }[];
    summary: string;
    reviewPlan?: { in: string; task: string }[];
}

interface CornellViewProps {
    cornell: CornellNoteV2 | LegacyCornellNote | null;
    loading?: boolean;
    onCueClick?: (cue: CueV2 | string, index: number) => void;
    onGenerateCloze?: (takeaway: string, page: number) => void;
}

// Tag color mapping
const TAG_COLORS: Record<BarrierTagV2, { bg: string; text: string; border: string }> = {
    concept: { bg: "bg-blue-950/40", text: "text-blue-300", border: "border-blue-500/30" },
    mechanics: { bg: "bg-emerald-950/40", text: "text-emerald-300", border: "border-emerald-500/30" },
    transfer: { bg: "bg-purple-950/40", text: "text-purple-300", border: "border-purple-500/30" },
    communication: { bg: "bg-amber-950/40", text: "text-amber-300", border: "border-amber-500/30" },
};

// Type guard for v2.3 format
function isV2Format(cornell: CornellNoteV2 | LegacyCornellNote): cornell is CornellNoteV2 {
    return 'cues' in cornell &&
        Array.isArray(cornell.cues) &&
        cornell.cues.length > 0 &&
        typeof cornell.cues[0] === 'object' &&
        'q' in cornell.cues[0];
}

// Cue Card Component (Q/A format with reveal)
function CueCard({ cue, index, onClick }: { cue: CueV2; index: number; onClick?: () => void }) {
    const [showAnswer, setShowAnswer] = useState(false);
    const colors = TAG_COLORS[cue.tag] || TAG_COLORS.concept;

    return (
        <div
            className={`p-4 rounded-xl ${colors.bg} border ${colors.border} transition-all hover:scale-[1.02] cursor-pointer`}
            onClick={() => {
                setShowAnswer(!showAnswer);
                onClick?.();
            }}
        >
            {/* Header: Page + Tag */}
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">
                    p{cue.page}
                </span>
                <span className={`text-[10px] font-medium uppercase tracking-wider ${colors.text}`}>
                    {cue.tag}
                </span>
            </div>

            {/* Question */}
            <p className="text-sm font-medium text-white mb-2">{cue.q}</p>

            {/* Answer (toggleable) */}
            <div className={`overflow-hidden transition-all duration-200 ${showAnswer ? 'max-h-20' : 'max-h-0'}`}>
                <p className={`text-sm ${colors.text} pt-2 border-t border-white/10`}>
                    <span className="font-semibold">A:</span> {cue.a}
                </p>
            </div>

            {/* Reveal hint */}
            {!showAnswer && (
                <p className="text-[10px] text-slate-500 mt-1">Click to reveal answer</p>
            )}
        </div>
    );
}

// Evidence Snippet Component (collapsible)
function EvidenceSnippet({ evidence }: { evidence: { page: number; snippet: string } }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-start gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors mt-3 w-full text-left"
        >
            {expanded ? <ChevronDown className="w-3 h-3 mt-0.5 shrink-0" /> : <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />}
            <Eye className="w-3 h-3 mt-0.5 shrink-0" />
            {expanded ? (
                <span className="italic">&ldquo;{evidence.snippet}&rdquo; — p{evidence.page}</span>
            ) : (
                <span>Show source</span>
            )}
        </button>
    );
}

// Source type icon mapping
const SOURCE_TYPE_ICON: Record<string, string> = {
    text: "📄",
    table: "📊",
    figure: "🖼️",
    formula: "🧮",
};

// Confidence bar color
function confidenceColor(c: number): string {
    if (c >= 0.8) return "bg-green-500";
    if (c >= 0.5) return "bg-yellow-500";
    return "bg-red-500";
}

// Page Note Card Component (v2.4 evidence-grounded format)
function PageNoteCard({ note, onGenerateCloze }: { note: PageNoteV2; onGenerateCloze?: (takeaway: string, page: number) => void }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
            {/* Page Header + Source Type + Confidence */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Page {note.page}</span>
                {note.source_type && (
                    <span className="text-[10px] bg-slate-800/60 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                        {SOURCE_TYPE_ICON[note.source_type] || "📄"} {note.source_type}
                    </span>
                )}
                {typeof note.confidence === 'number' && (
                    <div className="flex items-center gap-1.5 ml-auto" title={`Confidence: ${Math.round(note.confidence * 100)}%`}>
                        <span className="text-[10px] text-slate-500">{Math.round(note.confidence * 100)}%</span>
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${confidenceColor(note.confidence)} transition-all`}
                                style={{ width: `${note.confidence * 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Core Idea */}
            <div>
                <h5 className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-1">Core Idea</h5>
                <p className="text-base text-zinc-100">{note.core}</p>
            </div>

            {/* Mechanism */}
            <div>
                <h5 className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-1">How It Works</h5>
                <ul className="space-y-1">
                    {note.mechanism.map((item, idx) => (
                        <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                            <span className="text-emerald-400 mt-1">•</span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Exam Traps */}
            <div>
                <h5 className="text-[10px] uppercase tracking-wider text-amber-400 font-bold mb-1">⚠️ Exam Traps</h5>
                <ul className="space-y-1">
                    {note.examTraps.map((item, idx) => (
                        <li key={idx} className="text-sm text-amber-200/80 flex items-start gap-2">
                            <span className="text-amber-400 mt-1">!</span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Example (if present) */}
            {note.example && (
                <div className="pl-4 border-l-2 border-white/10">
                    <h5 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Example</h5>
                    <p className="text-sm text-slate-300 italic">{note.example}</p>
                </div>
            )}

            {/* Takeaway (clickable for Cloze) */}
            <div
                className="bg-amber-950/20 p-3 rounded-lg border-l-2 border-amber-500/50 cursor-pointer hover:bg-amber-950/30 transition-colors group"
                onClick={() => onGenerateCloze?.(note.takeaway, note.page)}
            >
                <div className="flex items-center justify-between">
                    <span className="text-amber-200 font-medium text-sm">💡 {note.takeaway}</span>
                    {onGenerateCloze && (
                        <span className="text-[10px] text-amber-400/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Generate Cloze
                        </span>
                    )}
                </div>
            </div>

            {/* Evidence Snippet */}
            {note.evidence && note.evidence.snippet && (
                <EvidenceSnippet evidence={note.evidence} />
            )}
        </div>
    );
}

// Summary Card Component (v2.3 format)
function SummaryCardView({ summary }: { summary: SummaryCard }) {
    return (
        <div className="bg-gradient-to-r from-cyan-950/30 to-blue-950/30 border border-cyan-500/20 rounded-xl p-5 space-y-4">
            {/* Memorize Section */}
            <div>
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    📝 Memorize
                </h4>
                <ul className="space-y-2">
                    {summary.memorize.map((item, idx) => (
                        <li key={idx} className="text-cyan-100 text-sm flex items-start gap-2">
                            <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Exam Questions Section */}
            <div className="pt-4 border-t border-cyan-500/20">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    🎯 Likely Exam Questions
                </h4>
                <ul className="space-y-2">
                    {summary.examQs.map((q, idx) => (
                        <li key={idx} className="text-purple-200 text-sm flex items-start gap-2">
                            <span className="text-purple-400 font-bold">Q{idx + 1}:</span>
                            {q}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// Legacy Summary Component
function LegacySummary({ summary }: { summary: string }) {
    return (
        <div className="bg-gradient-to-r from-cyan-950/30 to-blue-950/30 border border-cyan-500/20 rounded-xl p-5">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">
                Summary
            </h4>
            <p className="text-cyan-100 text-base leading-relaxed">
                {summary || "No summary available."}
            </p>
        </div>
    );
}

// Legacy Cue Button
function LegacyCueButton({ cue, onClick }: { cue: string; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-3 rounded-lg bg-primary/10 border border-primary/20 
                       text-primary hover:bg-primary/20 hover:border-primary/40 
                       transition-all text-sm font-medium"
        >
            {cue}
        </button>
    );
}

// Legacy Page Note
function LegacyPageNote({ note }: { note: { page: number; bullets: string[] } }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="text-xs text-slate-500 mb-3 font-medium">Page {note.page}</div>
            <ul className="space-y-2">
                {note.bullets.map((bullet, idx) => (
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
    );
}

export function CornellView({ cornell, loading, onCueClick, onGenerateCloze }: CornellViewProps) {
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

    // Detect format and render accordingly
    const isV2 = isV2Format(cornell);

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
                            {isV2 ? (
                                // V2.3 Q/A Cues
                                (cornell as CornellNoteV2).cues.map((cue, idx) => (
                                    <CueCard
                                        key={idx}
                                        cue={cue}
                                        index={idx}
                                        onClick={() => onCueClick?.(cue, idx)}
                                    />
                                ))
                            ) : (
                                // Legacy string cues
                                (cornell as LegacyCornellNote).cues.map((cue, idx) => (
                                    <LegacyCueButton
                                        key={idx}
                                        cue={cue}
                                        onClick={() => onCueClick?.(cue, idx)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Notes Column (Right - 70%) */}
                <div className="flex-1 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Notes
                    </h4>
                    {isV2 ? (
                        // V2.3 Structured Notes
                        (cornell as CornellNoteV2).notes.map((note) => (
                            <PageNoteCard
                                key={note.page}
                                note={note}
                                onGenerateCloze={onGenerateCloze}
                            />
                        ))
                    ) : (
                        // Legacy bullet notes
                        (cornell as LegacyCornellNote).notes.map((note) => (
                            <LegacyPageNote key={note.page} note={note} />
                        ))
                    )}
                </div>
            </div>

            {/* Summary Section (Bottom) */}
            {isV2 ? (
                <SummaryCardView summary={(cornell as CornellNoteV2).summary} />
            ) : (
                <LegacySummary summary={(cornell as LegacyCornellNote).summary} />
            )}
        </div>
    );
}
