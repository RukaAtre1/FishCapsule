"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StarField from "@/components/StarField";
import { createSessionId, saveSession } from "@/lib/learning/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function IngestPage() {
    const router = useRouter();
    const [syllabusText, setSyllabusText] = useState("");
    const [courseTitle, setCourseTitle] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!syllabusText.trim()) return;

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch("/api/outline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ syllabusText, courseTitle }),
            });

            if (!response.ok) {
                const errorData = await response.json();

                if (errorData.code === "MISSING_ENV") {
                    throw new Error("API Key Missing. Please configure ZAI_API_KEY in Vercel settings.");
                }

                throw new Error(errorData.error || "Failed to generate outline");
            }

            const data = await response.json();

            // Create and save session
            const sessionId = createSessionId();
            saveSession({
                sessionId,
                courseTitle: courseTitle || "Untitled Course",
                syllabusText,
                outline: data.outline,
                createdAt: Date.now(),
                cards: {},
                attempts: {},
                feedback: {}
            });

            // Redirect to course map
            router.push(`/course?session=${sessionId}`);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <main className="relative min-h-screen flex flex-col items-center justify-center p-4">
            <StarField />

            <Card className="relative z-10 w-full max-w-2xl animate-fade-in bg-card/50 backdrop-blur-xl border-border/50">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center text-primary">
                        Ingest Course
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground uppercase tracking-wide">
                            Course Title (Optional)
                        </label>
                        <Input
                            type="text"
                            placeholder="e.g. CS 101: Intro to AI"
                            value={courseTitle}
                            onChange={(e) => setCourseTitle(e.target.value)}
                            className="bg-background/50 text-lg h-12"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground uppercase tracking-wide">
                            Syllabus Text
                        </label>
                        <Textarea
                            className="min-h-[250px] bg-background/50 font-mono text-sm leading-relaxed resize-none"
                            placeholder="Paste your syllabus text here..."
                            value={syllabusText}
                            onChange={(e) => setSyllabusText(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                            {error}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center pb-8">
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || !syllabusText.trim()}
                        className="w-full md:w-auto px-10 py-6 text-lg"
                        size="lg"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Generating Map...
                            </>
                        ) : (
                            "Generate Course Map"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}
