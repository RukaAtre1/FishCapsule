"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dumbbell, Play, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { Step1Explain, Step2Synthesize } from "@/lib/llm/schema";
import { getGameState, UserGameState } from "@/lib/study/gameStateStore";
import { getDueCount } from "@/lib/study/mistakeBankStore";

interface PracticeTabProps {
    pages: number[];
    step1Results: Record<number, Step1Explain>;
    step2Result?: Step2Synthesize | null;
    refreshKey?: number;  // Increment to force refresh state
    onStartLesson: () => void;
    onStartReview: () => void;
}

export function PracticeTab({
    pages,
    step1Results,
    step2Result,
    refreshKey = 0,
    onStartLesson,
    onStartReview,
}: PracticeTabProps) {
    const [gameState, setGameState] = useState<UserGameState | null>(null);
    const [dueCount, setDueCount] = useState(0);

    // Load game state and due count on mount AND when refreshKey changes
    useEffect(() => {
        setGameState(getGameState());
        setDueCount(getDueCount());
    }, [refreshKey]);

    const hasStep1Data = Object.keys(step1Results).length > 0;
    const hasEnoughPages = pages.length > 0;
    const canStartPractice = hasStep1Data && hasEnoughPages;

    return (
        <div className="space-y-6">
            {/* XP Display */}
            {gameState && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-950/30 to-yellow-950/30 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-amber-400" />
                        <div>
                            <p className="text-2xl font-bold text-amber-200">
                                {gameState.totalXP} XP
                            </p>
                            <p className="text-sm text-amber-400/70">
                                Total earned
                            </p>
                        </div>
                    </div>
                    {gameState.sessionStreak > 0 && (
                        <div className="text-right">
                            <p className="text-lg font-bold text-orange-300">
                                🔥 {gameState.sessionStreak}
                            </p>
                            <p className="text-xs text-orange-400/70">
                                Streak
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Start Practice */}
            <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/20">
                        <Dumbbell className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            Practice Session
                        </h3>
                        <p className="text-sm text-slate-400">
                            {canStartPractice
                                ? `${pages.length} page${pages.length > 1 ? "s" : ""} ready for practice`
                                : "Generate notes first to start practicing"
                            }
                        </p>
                    </div>
                </div>

                <Button
                    onClick={onStartLesson}
                    disabled={!canStartPractice}
                    size="lg"
                    className="w-full text-base"
                >
                    <Play className="w-4 h-4 mr-2" />
                    Start Practice (3 Qs)
                    {step2Result && (
                        <Sparkles className="w-4 h-4 ml-2 text-yellow-300" />
                    )}
                </Button>

                {!canStartPractice && (
                    <p className="text-xs text-center text-slate-500">
                        Go to the Generation tab to explain your pages first
                    </p>
                )}
            </div>

            {/* Today Review */}
            <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-cyan-500/20">
                            <RotateCcw className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                Today Review
                            </h3>
                            <p className="text-sm text-slate-400">
                                Review your past mistakes
                            </p>
                        </div>
                    </div>
                    {dueCount > 0 && (
                        <span className="px-3 py-1 rounded-full bg-cyan-500/30 text-cyan-200 text-sm font-bold">
                            {dueCount} due
                        </span>
                    )}
                </div>

                <Button
                    onClick={onStartReview}
                    disabled={dueCount === 0}
                    variant="outline"
                    size="lg"
                    className="w-full text-base"
                >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {dueCount > 0
                        ? `Today Review (${Math.min(dueCount, 3)} Qs)`
                        : "No reviews due"
                    }
                </Button>

                {dueCount === 0 && (
                    <p className="text-xs text-center text-slate-500">
                        Mistakes from practice will appear here for review
                    </p>
                )}
            </div>
        </div>
    );
}
