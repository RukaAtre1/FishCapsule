"use client";

import React, { useEffect, useState } from "react";
import { getMetrics, type SessionMetrics } from "@/lib/study/metricsStore";
import { Activity, BarChart3, Brain, Clock, Shield } from "lucide-react";

function MetricCard({
    icon,
    label,
    value,
    subtext,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subtext?: string;
    color: string;
}) {
    return (
        <div className={`bg-white/5 border border-white/10 rounded-xl p-4 space-y-2`}>
            <div className="flex items-center gap-2">
                <div className={`${color}`}>{icon}</div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {label}
                </span>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            {subtext && <div className="text-xs text-slate-500">{subtext}</div>}
        </div>
    );
}

function PercentBar({ value, color }: { value: number; color: string }) {
    return (
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div
                className={`h-full rounded-full ${color} transition-all duration-500`}
                style={{ width: `${Math.round(value * 100)}%` }}
            />
        </div>
    );
}

export function MetricsDashboard() {
    const [metrics, setMetrics] = useState<SessionMetrics | null>(null);

    useEffect(() => {
        // Initial load
        setMetrics(getMetrics());

        // Refresh every 5s
        const interval = setInterval(() => {
            setMetrics(getMetrics());
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    if (!metrics) {
        return (
            <div className="flex items-center justify-center h-40 text-slate-500">
                Loading metrics...
            </div>
        );
    }

    const hasData = metrics.totalSteps > 0 || metrics.quizTotal > 0 || metrics.reviewTotal > 0;

    if (!hasData) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                <BarChart3 className="w-10 h-10 mb-4 text-slate-600" />
                <p className="text-lg mb-1">No data yet</p>
                <p className="text-sm text-slate-500">
                    Generate study notes and complete quizzes to see your metrics.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4" /> Evaluation Dashboard
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Evidence Coverage */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Evidence Coverage
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-cyan-400">
                        {Math.round(metrics.evidenceCoverage * 100)}%
                    </div>
                    <PercentBar value={metrics.evidenceCoverage} color="bg-cyan-500" />
                    <div className="text-xs text-slate-500">
                        Notes with source evidence grounding
                    </div>
                </div>

                {/* Quiz Accuracy */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Quiz Accuracy
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">
                        {metrics.quizTotal > 0
                            ? `${Math.round(metrics.quizAccuracy * 100)}%`
                            : "—"}
                    </div>
                    {metrics.quizTotal > 0 && (
                        <PercentBar value={metrics.quizAccuracy} color="bg-emerald-500" />
                    )}
                    <div className="text-xs text-slate-500">
                        {metrics.quizTotal} questions answered
                    </div>
                </div>

                {/* Review Retention */}
                <MetricCard
                    icon={<BarChart3 className="w-4 h-4" />}
                    label="Review Retention"
                    value={
                        metrics.reviewTotal > 0
                            ? `${Math.round(metrics.reviewRetention * 100)}%`
                            : "—"
                    }
                    subtext={`${metrics.reviewTotal} reviews completed`}
                    color="text-purple-400"
                />

                {/* Latency */}
                <MetricCard
                    icon={<Clock className="w-4 h-4" />}
                    label="Latency (P50 / P95)"
                    value={
                        metrics.latencyP50 > 0
                            ? `${(metrics.latencyP50 / 1000).toFixed(1)}s / ${(metrics.latencyP95 / 1000).toFixed(1)}s`
                            : "—"
                    }
                    subtext={`${metrics.totalSteps} total LLM calls`}
                    color="text-amber-400"
                />
            </div>

            {/* LLM Reliability Row */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        LLM Reliability
                    </span>
                </div>
                <div className="flex gap-6 text-sm">
                    <div>
                        <span className="text-slate-500">Fallbacks: </span>
                        <span className={metrics.fallbackCount > 0 ? "text-amber-400 font-medium" : "text-green-400"}>
                            {metrics.fallbackCount}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-500">Timeouts: </span>
                        <span className={metrics.timeoutCount > 0 ? "text-red-400 font-medium" : "text-green-400"}>
                            {metrics.timeoutCount}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-500">Failures: </span>
                        <span className={metrics.failedSteps > 0 ? "text-red-400 font-medium" : "text-green-400"}>
                            {metrics.failedSteps}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
