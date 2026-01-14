"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadSession } from "@/lib/learning/storage";
import type { StudySession } from "@/types/learning";
import { ArrowLeft, Calendar, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function CourseContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session");

    const [session, setSession] = useState<StudySession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sessionId) {
            setLoading(false);
            return;
        }

        const loaded = loadSession(sessionId);
        if (loaded) {
            setSession(loaded);
        }
        setLoading(false);
    }, [sessionId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground text-sm">Loading course map...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6 bg-background">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-accent/10">
                    <Sparkles className="w-8 h-8 text-accent" />
                </div>
                <p className="text-lg text-muted-foreground">Session not found</p>
                <Button
                    variant="outline"
                    onClick={() => router.push("/")}
                >
                    Back to Home
                </Button>
            </div>
        );
    }

    return (
        <main className="min-h-screen p-6 md:p-12 max-w-5xl mx-auto space-y-10 animate-fade-in bg-background">
            {/* Header */}
            <header className="space-y-6">
                <Button
                    variant="ghost"
                    className="pl-0 hover:pl-2 transition-all gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => router.push("/")}
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Home</span>
                </Button>

                <div className="space-y-3">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                        {session.courseTitle || "Course Map"}
                    </h1>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="text-foreground">{session.outline.length}</span> Lectures
                        </span>
                        <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Created <span className="text-foreground">{new Date(session.createdAt).toLocaleDateString()}</span>
                        </span>
                    </div>
                </div>
            </header>

            {/* Course Outline */}
            <div className="space-y-4">
                {session.outline.map((lecture, index) => (
                    <Card
                        key={lecture.lectureId || index}
                        onClick={() => router.push(`/lecture?session=${sessionId}&lecture=${lecture.lectureId}`)}
                        className="group cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                    >
                        <CardContent className="flex items-start gap-5 md:gap-6 p-6">
                            {/* Number */}
                            <div className="flex-shrink-0 mt-1">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-mono border bg-muted text-muted-foreground group-hover:text-foreground group-hover:border-primary/20 transition-colors">
                                    {String(index + 1).padStart(2, '0')}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-grow space-y-2">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                                        {lecture.title}
                                    </h3>
                                    {lecture.week && (
                                        <Badge variant="outline" className="font-mono text-xs font-normal">
                                            {lecture.week}
                                        </Badge>
                                    )}
                                </div>

                                {lecture.topics && lecture.topics.length > 0 && (
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {lecture.topics.slice(0, 3).join(" • ")}
                                        {lecture.topics.length > 3 && " ..."}
                                    </p>
                                )}

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {lecture.deliverables?.slice(0, 2).map((d, i) => (
                                        <Badge key={i} variant="secondary" className="bg-secondary/50 text-secondary-foreground hover:bg-secondary">
                                            {d}
                                        </Badge>
                                    ))}
                                    {lecture.readings?.slice(0, 2).map((r, i) => (
                                        <Badge key={i} variant="secondary" className="bg-accent/10 text-accent-foreground hover:bg-accent/20">
                                            {r}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 duration-300">
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </main>
    );
}

export default function CoursePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
            </div>
        }>
            <CourseContent />
        </Suspense>
    );
}
