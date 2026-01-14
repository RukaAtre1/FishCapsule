"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Lightbulb,
    Target,
    AlertTriangle,
    GraduationCap,
    HelpCircle,
    CheckCircle,
    FileText,
    ChevronDown,
    ChevronUp,
    Plus
} from "lucide-react";
import type { SlideExplain } from "@/types/learning";
import { useState } from "react";

interface SlideExplainPanelProps {
    data: SlideExplain;
    onAddToNotebook?: () => void;
}

export default function SlideExplainPanel({ data, onAddToNotebook }: SlideExplainPanelProps) {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        keyPoints: true,
        whyItMatters: true,
        examAngles: false,
        commonMistakes: false,
        quickCheck: true,
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="space-y-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        {data.titleGuess || "Slide Explanation"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Pages {Array.isArray(data.pages) ? data.pages.join(", ") : `${data.pages.start}-${data.pages.end}`}
                    </p>
                </div>
                {onAddToNotebook && (
                    <Button variant="outline" size="sm" onClick={onAddToNotebook} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add to Notebook
                    </Button>
                )}
            </div>

            <Separator />

            {/* Key Points */}
            <Card className="bg-card/50">
                <CardHeader
                    className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
                    onClick={() => toggleSection("keyPoints")}
                >
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        Key Points
                    </CardTitle>
                    {expandedSections.keyPoints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CardHeader>
                {expandedSections.keyPoints && (
                    <CardContent className="pt-0 pb-4 px-4">
                        <ul className="space-y-2">
                            {data.keyPoints.map((point, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                )}
            </Card>

            {/* Why It Matters */}
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader
                    className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
                    onClick={() => toggleSection("whyItMatters")}
                >
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                        <Target className="w-4 h-4 text-primary" />
                        Why It Matters
                    </CardTitle>
                    {expandedSections.whyItMatters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CardHeader>
                {expandedSections.whyItMatters && (
                    <CardContent className="pt-0 pb-4 px-4">
                        <ul className="space-y-2">
                            {data.whyItMatters.map((point, i) => (
                                <li key={i} className="text-sm text-foreground">
                                    • {point}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                )}
            </Card>

            {/* Exam Angles */}
            <Card className="bg-card/50">
                <CardHeader
                    className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
                    onClick={() => toggleSection("examAngles")}
                >
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                        <GraduationCap className="w-4 h-4 text-blue-500" />
                        Exam Angles
                        <Badge variant="secondary" className="text-xs ml-2">{data.examAngles.length}</Badge>
                    </CardTitle>
                    {expandedSections.examAngles ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CardHeader>
                {expandedSections.examAngles && (
                    <CardContent className="pt-0 pb-4 px-4">
                        <ul className="space-y-2">
                            {data.examAngles.map((angle, i) => (
                                <li key={i} className="text-sm text-foreground bg-blue-500/5 p-2 rounded-md border border-blue-500/10">
                                    {angle}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                )}
            </Card>

            {/* Common Mistakes */}
            <Card className="bg-destructive/5 border-destructive/20">
                <CardHeader
                    className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
                    onClick={() => toggleSection("commonMistakes")}
                >
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        Common Mistakes
                        <Badge variant="secondary" className="text-xs ml-2">{data.commonMistakes.length}</Badge>
                    </CardTitle>
                    {expandedSections.commonMistakes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CardHeader>
                {expandedSections.commonMistakes && (
                    <CardContent className="pt-0 pb-4 px-4">
                        <ul className="space-y-2">
                            {data.commonMistakes.map((mistake, i) => (
                                <li key={i} className="text-sm text-foreground bg-destructive/5 p-2 rounded-md border border-destructive/10">
                                    ⚠️ {mistake}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                )}
            </Card>

            {/* Quick Check */}
            <Card className="bg-card/50">
                <CardHeader
                    className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
                    onClick={() => toggleSection("quickCheck")}
                >
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                        <HelpCircle className="w-4 h-4 text-amber-500" />
                        Quick Check
                    </CardTitle>
                    {expandedSections.quickCheck ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CardHeader>
                {expandedSections.quickCheck && (
                    <CardContent className="pt-0 pb-4 px-4 space-y-3">
                        <p className="text-sm font-medium text-foreground">{data.quickCheck.question}</p>
                        {data.quickCheck.choices && (
                            <div className="space-y-2">
                                {data.quickCheck.choices.map((choice, i) => (
                                    <div key={i} className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                                        {String.fromCharCode(65 + i)}. {choice}
                                    </div>
                                ))}
                            </div>
                        )}
                        <details className="text-sm">
                            <summary className="cursor-pointer text-primary hover:underline">Show Answer</summary>
                            <div className="mt-2 p-2 bg-green-500/10 rounded-md border border-green-500/20">
                                <p className="font-medium text-green-600">Answer: {data.quickCheck.answer}</p>
                                <p className="text-muted-foreground mt-1">{data.quickCheck.explanation}</p>
                            </div>
                        </details>
                    </CardContent>
                )}
            </Card>

            {/* Citations */}
            {data.citations && data.citations.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Sources:
                    </span>
                    {data.citations.map((cite, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-mono">
                            p.{cite.page}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
