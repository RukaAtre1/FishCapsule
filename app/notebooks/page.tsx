"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getNotebooks, deleteNotebook, NotebookRecord } from "@/lib/study/notebookStore";
import { Button } from "@/components/ui/button";
import { Trash2, BookOpen, Clock, FileText, ArrowLeft } from "lucide-react";

export default function NotebooksPage() {
    const [notebooks, setNotebooks] = useState<NotebookRecord[]>([]);

    useEffect(() => {
        setNotebooks(getNotebooks());
    }, []);

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this notebook?")) {
            deleteNotebook(id);
            setNotebooks(getNotebooks());
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0F1A] text-white p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6 text-slate-400" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">My Study Notebooks</h1>
                            <p className="text-slate-400 mt-1">Review your saved Cornell notes and cues</p>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {notebooks.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/5">
                        <BookOpen className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-slate-300">No notebooks yet</h2>
                        <p className="text-slate-500 mt-2">Start a new study session to generate notes.</p>
                        <Link href="/ingest" className="inline-block mt-6">
                            <Button>Start Studying</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {notebooks.map((nb) => (
                            <Link href={`/notebooks/${nb.id}`} key={nb.id}>
                                <div className="group relative bg-[#131926] border border-white/10 rounded-xl p-5 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-900/10 transition-all cursor-pointer h-full flex flex-col">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-cyan-950/30 rounded-lg border border-cyan-500/20 text-cyan-400">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(nb.id, e)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-cyan-200 transition-colors line-clamp-2 mb-2">
                                            {nb.sourceMeta?.fileName || "Untitled Notebook"}
                                        </h3>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(nb.timestamp).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <BookOpen className="w-3.5 h-3.5" />
                                                {nb.sourceMeta?.pages?.length || 0} pages
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                                        <span className="group-hover:text-cyan-400 transition-colors">
                                            View Notes
                                        </span>
                                        <ArrowLeft className="w-3 h-3 rotate-180 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
