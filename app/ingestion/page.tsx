"use client";

import StarField from "@/components/StarField";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, BookOpen } from "lucide-react";
import { createSessionId, saveSession } from "@/lib/learning/storage";
import type { StudySession, ConceptRef } from "@/types/learning";

export default function IngestionPage() {
    const router = useRouter();
    const [courseTitle, setCourseTitle] = useState("");
    const [notesText, setNotesText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!notesText.trim()) {
            setError("Please paste your notes or syllabus content.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Call the concepts API
            const response = await fetch("/api/concepts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    context: notesText.trim(),
                    courseTitle: courseTitle.trim() || undefined,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error?.message || "Failed to generate concepts");
            }

            const concepts: ConceptRef[] = result.data?.concepts || [];

            if (concepts.length === 0) {
                throw new Error("No concepts could be extracted. Try adding more content.");
            }

            // Create and save the session
            const sessionId = createSessionId();
            const session: StudySession = {
                sessionId,
                courseTitle: courseTitle.trim() || undefined,
                context: notesText.trim(),
                concepts,
                createdAt: Date.now(),
            };

            saveSession(session);

            // Navigate to learn page
            router.push(`/learn?session=${sessionId}`);
        } catch (err: any) {
            setError(err.message || "An error occurred while generating concepts.");
            setLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden p-6">
            <StarField />

            <div className="relative z-10 w-full max-w-3xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                        <BookOpen className="w-4 h-4 text-blue-300" />
                        <span className="text-sm text-white/70">Knowledge Ingestion</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                        Paste Your Notes
                    </h1>
                    <p className="mt-3 text-white/60 text-lg">
                        We&apos;ll extract key concepts and create Cornell study cards for you.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Course Title Input */}
                    <div className="p-4 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/20">
                        <label className="block text-sm font-medium text-white/70 mb-2">
                            Course Title <span className="text-white/40">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={courseTitle}
                            onChange={(e) => setCourseTitle(e.target.value)}
                            placeholder="e.g. Introduction to Machine Learning"
                            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 transition-colors"
                            disabled={loading}
                        />
                    </div>

                    {/* Notes Textarea */}
                    <div className="p-4 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/20">
                        <label className="block text-sm font-medium text-white/70 mb-2">
                            Syllabus / Notes Content <span className="text-red-300">*</span>
                        </label>
                        <textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            placeholder="Paste your syllabus, lecture notes, or study material here..."
                            rows={12}
                            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 transition-colors resize-none font-mono text-sm leading-relaxed"
                            disabled={loading}
                        />
                        <div className="mt-2 text-xs text-white/40 text-right">
                            {notesText.length.toLocaleString()} characters
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !notesText.trim()}
                        className={`
              w-full px-6 py-4 rounded-xl font-semibold text-lg
              flex items-center justify-center gap-3 transition-all duration-300
              ${loading || !notesText.trim()
                                ? "bg-white/5 border border-white/10 text-white/40 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 text-blue-100 hover:scale-[1.01]"
                            }
            `}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generating Concepts...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Generate Concepts
                            </>
                        )}
                    </button>
                </div>

                <div className="mt-8 text-center">
                    <a href="/" className="text-sm text-white/40 hover:text-white/80 transition-colors">
                        ← Back to Home
                    </a>
                </div>
            </div>

            <div className="absolute bottom-8 text-white/30 text-xs tracking-widest z-10">
                © 2026 HARLEY STUDIO
            </div>
        </main>
    );
}
