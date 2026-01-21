"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getNotebookById, NotebookRecord } from "@/lib/study/notebookStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, FileText } from "lucide-react";
import { CornellView } from "@/components/study/CornellView";

export default function NotebookDetailPage({ params }: { params: { id: string } }) {
    const [notebook, setNotebook] = useState<NotebookRecord | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // params.id might depend on Next.js version (async vs sync), but assuming sync for now since it's client component root
        // If it fails with "params is a Promise", I'll fix it.
        const nb = getNotebookById(params.id);
        setNotebook(nb);
        setLoading(false);
    }, [params.id]);

    if (loading) {
        return <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center text-slate-400">Loading...</div>;
    }

    if (!notebook) {
        return (
            <div className="min-h-screen bg-[#0B0F1A] flex flex-col items-center justify-center text-slate-400 gap-4">
                <p>Notebook not found</p>
                <Link href="/notebooks">
                    <Button variant="outline">Back to Library</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0F1A] text-white flex flex-col">
            {/* Header */}
            <div className="border-b border-white/10 bg-[#0B0F1A]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/notebooks">
                            <Button variant="ghost" size="icon" className="hover:bg-white/10 text-slate-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
                                <FileText className="w-5 h-5 text-cyan-400" />
                                {notebook.sourceMeta?.fileName || "Untitled Notebook"}
                            </h1>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {new Date(notebook.timestamp).toLocaleDateString()} &bull; {new Date(notebook.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                    {/* Optional actions like Export could go here */}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 max-w-6xl mx-auto w-full p-6 lg:p-10">
                <div className="bg-[#131926] border border-white/10 rounded-2xl p-6 lg:p-10 shadow-xl">
                    <CornellView cornell={notebook.cornell} loading={false} />
                </div>
            </div>
        </div>
    );
}
