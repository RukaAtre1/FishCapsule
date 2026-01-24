"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Loader2, X, Check, AlertCircle, ChevronRight,
    BookOpen, Trophy, RefreshCw, ArrowRight
} from "lucide-react";
import { ClozeQuestion, PageNoteV2, Step2Synthesize } from "@/lib/llm/schema";
import {
    processCorrectAnswer, processWrongAnswer, completeLesson,
    getGameState
} from "@/lib/study/gameStateStore";
import { addMistake, updateMistake, getDueItems, MistakeItem } from "@/lib/study/mistakeBankStore";

// ============ Types ============

interface LessonRunnerProps {
    pages: number[];
    step1Results: Record<number, PageNoteV2>;
    step2Result?: Step2Synthesize | null;
    docId?: string;
    mode: "lesson" | "review";
    onComplete: (run: LessonRun) => void;
    onExit: () => void;
}

interface LessonRun {
    lessonId: string;
    questions: ClozeQuestion[];
    answers: AnswerRecord[];
    xpEarned: number;
    accuracy: number;
}

interface AnswerRecord {
    questionId: string;
    selectedIndex: number;
    correct: boolean;
    ts: number;
}

type RunnerState = "loading" | "question" | "feedback" | "end" | "error";

// ============ Helper: Render Step1 Notes ============

function renderStep1Notes(
    sourcePages: number[],
    step1Results: Record<number, PageNoteV2>
): React.ReactNode {
    const notes = sourcePages
        .filter(p => step1Results[p])
        .map(p => step1Results[p]);

    if (notes.length === 0) return null;

    return (
        <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Related Notes
            </h4>
            {notes.map((note, idx) => (
                <div key={idx} className="space-y-1 text-sm">
                    <p className="text-zinc-200">{note.core}</p>
                    {note.example && (
                        <p className="text-slate-400 italic pl-3 border-l-2 border-white/10">
                            Example: {note.example}
                        </p>
                    )}
                    <p className="text-amber-200 font-medium">💡 {note.takeaway}</p>
                </div>
            ))}
        </div>
    );
}

// ============ Component ============

export function LessonRunner({
    pages,
    step1Results,
    step2Result,
    docId,
    mode,
    onComplete,
    onExit,
}: LessonRunnerProps) {
    const [state, setState] = useState<RunnerState>("loading");
    const [questions, setQuestions] = useState<ClozeQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [showNotes, setShowNotes] = useState(false);
    const [answers, setAnswers] = useState<AnswerRecord[]>([]);
    const [xpEarned, setXpEarned] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const currentQuestion = questions[currentIndex];

    // ============ Load Questions ============

    useEffect(() => {
        if (mode === "review") {
            loadReviewQuestions();
        } else {
            fetchLessonQuestions();
        }
    }, [mode]);

    // P0-1: Review mode loads from mistakeBankStore
    const loadReviewQuestions = useCallback(() => {
        const dueItems = getDueItems(3);
        if (dueItems.length === 0) {
            setError("No review questions due");
            setState("error");
            return;
        }
        setQuestions(dueItems.map(m => m.question));
        setState("question");
    }, []);

    // Lesson mode fetches from API
    const fetchLessonQuestions = useCallback(async () => {
        setState("loading");
        try {
            // Build compact bullets payload (P0-4)
            const bullets = pages
                .filter(p => step1Results[p])
                .map(p => ({
                    page: p,
                    text: step1Results[p].core,
                    takeaway: step1Results[p].takeaway,
                }));

            if (bullets.length === 0) {
                throw new Error("No study notes found for selected pages. Please generate notes first.");
            }

            const res = await fetch("/api/practice/cloze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    docId,
                    pages,
                    bullets,
                    keyIdeas: step2Result?.keyIdeas,
                    commonConfusion: step2Result?.commonConfusion,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || data.error || "Failed to generate questions");
            }

            setQuestions(data.questions);
            setState("question");
        } catch (err: any) {
            setError(err.message);
            setState("error");
        }
    }, [pages, step1Results, step2Result, docId]);

    // ============ Answer Handling ============

    const handleSelectAnswer = (index: number) => {
        if (selectedIndex !== null) return; // Already answered
        setSelectedIndex(index);

        const isCorrect = index === currentQuestion.answerIndex;

        // Record answer
        const record: AnswerRecord = {
            questionId: currentQuestion.id,
            selectedIndex: index,
            correct: isCorrect,
            ts: Date.now(),
        };
        setAnswers(prev => [...prev, record]);

        // Update game state
        if (isCorrect) {
            const { xpEarned: xp } = processCorrectAnswer();
            setXpEarned(prev => prev + xp);
        } else {
            processWrongAnswer();
            // Add to mistake bank (or update if review mode)
            if (mode === "review") {
                updateMistake(currentQuestion.id, false);
            } else {
                addMistake(currentQuestion);
            }
        }

        // If review mode and correct, update the mistake
        if (mode === "review" && isCorrect) {
            updateMistake(currentQuestion.id, true);
        }

        setState("feedback");
    };

    const handleNext = () => {
        if (currentIndex + 1 >= questions.length) {
            // End of lesson
            finishLesson();
        } else {
            setCurrentIndex(prev => prev + 1);
            setSelectedIndex(null);
            setShowNotes(false);
            setState("question");
        }
    };

    const finishLesson = () => {
        const correctCount = answers.filter(a => a.correct).length;
        const accuracy = answers.length > 0 ? correctCount / answers.length : 0;

        // Lesson completion bonus
        const { bonusXP } = completeLesson(accuracy);
        const totalXP = xpEarned + bonusXP;

        const run: LessonRun = {
            lessonId: `${docId || "doc"}_${pages.join("-")}_${Date.now()}`,
            questions,
            answers,
            xpEarned: totalXP,
            accuracy,
        };

        setXpEarned(totalXP);
        onComplete(run);
        setState("end");
    };

    // ============ Render ============

    if (state === "loading") {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-lg">
                    {mode === "review" ? "Loading review..." : "Generating questions..."}
                </p>
            </div>
        );
    }

    if (state === "error") {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-red-200 text-lg">{error}</p>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onExit}>
                        Exit
                    </Button>
                    {mode === "lesson" && (
                        <Button onClick={fetchLessonQuestions}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    if (state === "end") {
        const correctCount = answers.filter(a => a.correct).length;
        const wrongCount = answers.length - correctCount;
        const accuracy = answers.length > 0 ? (correctCount / answers.length) * 100 : 0;

        return (
            <div className="flex flex-col items-center justify-center h-full p-8 space-y-6">
                <div className="text-center space-y-2">
                    <Trophy className="w-16 h-16 text-amber-400 mx-auto" />
                    <h2 className="text-3xl font-bold text-white">
                        {mode === "review" ? "Review Complete!" : "Lesson Complete!"}
                    </h2>
                </div>

                <div className="grid grid-cols-3 gap-6 w-full max-w-md">
                    <div className="text-center p-4 rounded-xl bg-amber-950/30 border border-amber-500/20">
                        <p className="text-3xl font-bold text-amber-200">{xpEarned}</p>
                        <p className="text-sm text-amber-400/70">XP Earned</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-green-950/30 border border-green-500/20">
                        <p className="text-3xl font-bold text-green-200">{correctCount}</p>
                        <p className="text-sm text-green-400/70">Correct</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-red-950/30 border border-red-500/20">
                        <p className="text-3xl font-bold text-red-200">{wrongCount}</p>
                        <p className="text-sm text-red-400/70">Wrong</p>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-lg text-slate-300">
                        Accuracy: <span className="font-bold text-white">{accuracy.toFixed(0)}%</span>
                    </p>
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" onClick={onExit}>
                        Back to Practice
                    </Button>
                    {wrongCount > 0 && mode === "lesson" && (
                        <Button onClick={() => {
                            // Load the questions that were wrong in THIS session
                            const wrongQuestionIds = answers.filter(a => !a.correct).map(a => a.questionId);
                            const wrongQs = questions.filter(q => wrongQuestionIds.includes(q.id));
                            setQuestions(wrongQs);
                            setCurrentIndex(0);
                            setAnswers([]);
                            setXpEarned(0);
                            setSelectedIndex(null);
                            setShowNotes(false);
                            setState("question");
                        }}>
                            Review Mistakes
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // Question + Feedback states
    const isCorrect = selectedIndex === currentQuestion?.answerIndex;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <button onClick={onExit} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">
                        {currentIndex + 1} / {questions.length}
                    </span>
                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>
                <div className="text-amber-200 font-bold">
                    +{xpEarned} XP
                </div>
            </div>

            {/* Question Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Sentence with Blank */}
                <div className="text-center p-6 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xl text-white leading-relaxed">
                        {currentQuestion?.sentence.split("____").map((part, i, arr) => (
                            <React.Fragment key={i}>
                                {part}
                                {i < arr.length - 1 && (
                                    <span className="inline-block px-4 py-1 mx-1 rounded bg-primary/30 border-b-2 border-primary text-primary font-bold min-w-[80px]">
                                        {state === "feedback"
                                            ? currentQuestion.choices[currentQuestion.answerIndex]
                                            : "______"
                                        }
                                    </span>
                                )}
                            </React.Fragment>
                        ))}
                    </p>
                </div>

                {/* Choices */}
                <div className="grid grid-cols-2 gap-3">
                    {currentQuestion?.choices.map((choice, idx) => {
                        const isSelected = selectedIndex === idx;
                        const isAnswer = idx === currentQuestion.answerIndex;
                        const showResult = state === "feedback";

                        let buttonClass = "p-4 rounded-xl border-2 text-left transition-all ";

                        if (showResult) {
                            if (isAnswer) {
                                buttonClass += "bg-green-950/50 border-green-500 text-green-100";
                            } else if (isSelected && !isAnswer) {
                                buttonClass += "bg-red-950/50 border-red-500 text-red-100";
                            } else {
                                buttonClass += "bg-white/5 border-white/10 text-slate-400";
                            }
                        } else {
                            buttonClass += isSelected
                                ? "bg-primary/20 border-primary text-white"
                                : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleSelectAnswer(idx)}
                                disabled={state === "feedback"}
                                className={buttonClass}
                            >
                                <span className="font-medium">{choice}</span>
                                {showResult && isAnswer && (
                                    <Check className="inline-block w-5 h-5 ml-2 text-green-400" />
                                )}
                                {showResult && isSelected && !isAnswer && (
                                    <X className="inline-block w-5 h-5 ml-2 text-red-400" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Feedback */}
                {state === "feedback" && (
                    <div className={`p-4 rounded-xl ${isCorrect
                        ? "bg-green-950/30 border border-green-500/30"
                        : "bg-red-950/30 border border-red-500/30"
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                            {isCorrect ? (
                                <>
                                    <Check className="w-5 h-5 text-green-400" />
                                    <span className="font-bold text-green-200">Correct!</span>
                                </>
                            ) : (
                                <>
                                    <X className="w-5 h-5 text-red-400" />
                                    <span className="font-bold text-red-200">Incorrect</span>
                                </>
                            )}
                        </div>
                        <p className="text-sm text-slate-300">
                            {currentQuestion?.explanation}
                        </p>

                        {/* Show Notes Toggle */}
                        <button
                            onClick={() => setShowNotes(!showNotes)}
                            className="mt-3 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                            <BookOpen className="w-4 h-4" />
                            {showNotes ? "Hide notes" : "Show notes"}
                        </button>

                        {showNotes && renderStep1Notes(currentQuestion.sourcePages, step1Results)}
                    </div>
                )}
            </div>

            {/* Bottom Action */}
            {state === "feedback" && (
                <div className="p-4 border-t border-white/10">
                    <Button onClick={handleNext} size="lg" className="w-full text-base">
                        {currentIndex + 1 >= questions.length ? "Finish" : "Next"}
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}
        </div>
    );
}
