"use client";

import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

interface PaneParams {
    title?: string;
    children: ReactNode;
}

interface SplitLayoutProps {
    leftParams?: PaneParams;
    rightParams?: PaneParams;
    className?: string;
}

export default function SplitLayout({ leftParams, rightParams, className = "" }: SplitLayoutProps) {
    return (
        <div className={`grid grid-cols-1 lg:grid-cols-2 h-full overflow-hidden ${className}`}>
            {/* Left Pane */}
            <section className="flex flex-col h-full border-r bg-background relative overflow-hidden">
                {leftParams?.title && (
                    <>
                        <div className="flex-shrink-0 px-6 py-3 bg-muted/10">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {leftParams.title}
                            </h2>
                        </div>
                        <Separator />
                    </>
                )}
                <div className="flex-grow overflow-y-auto overflow-x-hidden relative">
                    {leftParams?.children}
                </div>
            </section>

            {/* Right Pane */}
            <section className="flex flex-col h-full bg-background relative overflow-hidden">
                {rightParams?.title && (
                    <>
                        <div className="flex-shrink-0 px-6 py-3 bg-muted/10">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {rightParams.title}
                            </h2>
                        </div>
                        <Separator />
                    </>
                )}
                <div className="flex-grow overflow-y-auto relative">
                    {rightParams?.children}
                </div>
            </section>
        </div>
    );
}
