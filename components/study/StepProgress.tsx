"use client";

import React from "react";
import { CheckCircle, Loader2, AlertCircle, ChevronRight } from "lucide-react";

export type StepStatus = "idle" | "loading" | "completed" | "error";

interface StepProgressProps {
    currentStep: number;
    totalSteps: number;
    status: StepStatus;
    stepNames?: string[];
}

const defaultStepNames = ["Explain", "Synthesize", "Quiz", "Diagnose"];

export function StepProgress({
    currentStep,
    totalSteps,
    status,
    stepNames = defaultStepNames,
}: StepProgressProps) {
    return (
        <div className="flex items-center gap-2 mb-6">
            {Array.from({ length: totalSteps }).map((_, idx) => {
                const stepNum = idx + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;
                const isPending = stepNum > currentStep;

                return (
                    <React.Fragment key={stepNum}>
                        <div
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                                transition-all duration-300
                                ${isCompleted ? "bg-green-500/20 text-green-400 border border-green-500/30" : ""}
                                ${isActive && status === "loading" ? "bg-primary/20 text-primary border border-primary/30" : ""}
                                ${isActive && status === "completed" ? "bg-green-500/20 text-green-400 border border-green-500/30" : ""}
                                ${isActive && status === "error" ? "bg-destructive/20 text-destructive border border-destructive/30" : ""}
                                ${isActive && status === "idle" ? "bg-primary text-primary-foreground" : ""}
                                ${isPending ? "bg-muted text-muted-foreground border border-border/50" : ""}
                            `}
                        >
                            {isCompleted && <CheckCircle className="w-4 h-4" />}
                            {isActive && status === "loading" && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                            {isActive && status === "error" && (
                                <AlertCircle className="w-4 h-4" />
                            )}
                            {isActive && status === "completed" && (
                                <CheckCircle className="w-4 h-4" />
                            )}
                            <span>
                                Step {stepNum}: {stepNames[idx]}
                            </span>
                        </div>
                        {idx < totalSteps - 1 && (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default StepProgress;
