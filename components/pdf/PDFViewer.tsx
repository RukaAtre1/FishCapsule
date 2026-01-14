"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Upload, AlertCircle, FileText, Check, X, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Configure worker
if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;
}

interface PDFViewerProps {
    onRangeSelect: (range: number[]) => void;
    onPdfLoaded?: (buffer: ArrayBuffer, numPages: number) => void;
    maxRangeSize?: number;
}

export default function PDFViewer({ onRangeSelect, onPdfLoaded, maxRangeSize = 5 }: PDFViewerProps) {
    const [file, setFile] = useState<File | null>(null);
    const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [pageNum, setPageNum] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [selectedStart, setSelectedStart] = useState<number | null>(null);
    const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfBufferRef = useRef<ArrayBuffer | null>(null);

    // Handle File Upload
    const handleFileUpload = useCallback(async (uploadedFile: File) => {
        if (uploadedFile.type !== "application/pdf") {
            setError("Please upload a valid PDF file");
            setTimeout(() => setError(null), 3000);
            return;
        }

        setFile(uploadedFile);
        setError(null);
        setPageNum(1);
        setSelectedStart(null);
        setSelectedEnd(null);
        setIsLoading(true);
        setUploadProgress(0);

        try {
            // Simulate progress for UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 100);

            const buffer = await uploadedFile.arrayBuffer();
            // Clone buffer BEFORE pdfjs uses it (pdfjs detaches the original)
            const bufferClone = buffer.slice(0);
            pdfBufferRef.current = bufferClone;

            const loadedPdf = await pdfjsLib.getDocument({ data: buffer }).promise;

            clearInterval(progressInterval);
            setUploadProgress(100);

            setPdf(loadedPdf);
            setNumPages(loadedPdf.numPages);

            // Notify parent about loaded PDF with the CLONED buffer
            if (onPdfLoaded) {
                onPdfLoaded(bufferClone, loadedPdf.numPages);
            }

            setTimeout(() => {
                setIsLoading(false);
                setUploadProgress(0);
            }, 500);
        } catch (err) {
            console.error(err);
            setError("Failed to load PDF");
            setIsLoading(false);
            setUploadProgress(0);
        }
    }, [onPdfLoaded]);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (uploadedFile) handleFileUpload(uploadedFile);
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.type === "application/pdf") {
            handleFileUpload(droppedFile);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        setPdf(null);
        pdfBufferRef.current = null;
        setPageNum(1);
        setNumPages(0);
        setSelectedStart(null);
        setSelectedEnd(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Render Page
    useEffect(() => {
        if (!pdf || !canvasRef.current) return;

        const renderPage = async () => {
            if (renderTaskRef.current) {
                await renderTaskRef.current.cancel();
            }

            try {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current!;
                const context = canvas.getContext("2d")!;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                const task = page.render(renderContext as any);
                renderTaskRef.current = task;
                await task.promise;
            } catch (err: any) {
                if (err.name !== "RenderingCancelledException") {
                    console.error("Render error:", err);
                }
            }
        };

        renderPage();
    }, [pdf, pageNum, scale]);

    // Range Selection Logic
    const togglePageSelection = () => {
        if (selectedStart === null) {
            setSelectedStart(pageNum);
            setSelectedEnd(pageNum);
            onRangeSelect([pageNum]);
            return;
        }

        if (selectedStart === pageNum && selectedStart === selectedEnd) {
            setSelectedStart(null);
            setSelectedEnd(null);
            onRangeSelect([]);
            return;
        }

        const start = Math.min(selectedStart, pageNum);
        const end = Math.max(selectedStart, pageNum);
        const size = end - start + 1;

        if (size > maxRangeSize) {
            setError(`Range limited to ${maxRangeSize} pages`);
            setTimeout(() => setError(null), 3000);
            return;
        }

        setError(null);
        setSelectedStart(start);
        setSelectedEnd(end);

        const range = Array.from({ length: size }, (_, i) => start + i);
        onRangeSelect(range);
    };

    const isPageSelected = (p: number) => {
        if (selectedStart === null || selectedEnd === null) return false;
        return p >= selectedStart && p <= selectedEnd;
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Expose buffer getter for parent
    const getPdfBuffer = useCallback(() => pdfBufferRef.current, []);

    if (!file) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-8 bg-muted/20">
                <Card
                    className={`w-full max-w-2xl p-10 border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-card'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-primary/20 scale-110' : 'bg-muted'
                            }`}>
                            <Upload className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">Upload Lecture Slides</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                Drag & drop your PDF here, or click to browse
                            </p>
                        </div>

                        <Badge variant="secondary" className="gap-2 px-3 py-1 font-normal">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Supported format: PDF (max 50MB)</span>
                        </Badge>

                        <label className="cursor-pointer">
                            <Button size="lg">
                                Choose File
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileInputChange}
                                className="hidden"
                            />
                        </label>

                        <p className="text-xs text-muted-foreground/60 max-w-md mx-auto">
                            Files are processed locally in your browser. No data is uploaded to servers.
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* File Info Bar */}
            <div className="flex-shrink-0 border-b bg-card px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <File className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium truncate">{file.name}</h4>
                            <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                        </div>
                        {isLoading ? (
                            <div className="h-1 w-24 bg-muted overflow-hidden rounded-full mt-1">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">{numPages} pages</p>
                        )}
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={pageNum <= 1}
                            onClick={() => setPageNum(p => p - 1)}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-mono px-2 min-w-[60px] text-center">
                            {pageNum} / {numPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={pageNum >= numPages}
                            onClick={() => setPageNum(p => p + 1)}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="h-6 w-px bg-border mx-2" />

                    <Button
                        variant={isPageSelected(pageNum) ? "default" : "secondary"}
                        size="sm"
                        onClick={togglePageSelection}
                        className="gap-2"
                    >
                        {isPageSelected(pageNum) ? (
                            <>
                                <Check className="w-4 h-4" />
                                Selected
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4" />
                                Select Page
                            </>
                        )}
                    </Button>
                </div>

                {selectedStart && (
                    <Badge variant="outline" className="border-primary/50 text-foreground">
                        Range: {selectedStart}-{selectedEnd}
                    </Badge>
                )}
            </div>

            {/* Error Toast */}
            {error && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 bg-destructive text-destructive-foreground text-sm rounded-md shadow-lg animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Canvas Area */}
            <div className="flex-grow overflow-auto flex justify-center items-start p-6 bg-muted/10">
                <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto rounded-md shadow-lg border border-border/50"
                />
            </div>
        </div>
    );
}
