"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { copy } from "@/lib/copy/en";

export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 mb-4 w-full border-b border-[color:var(--border)]/70 bg-[color:var(--surface2)]/60 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_14px_rgba(45,212,191,0.7)]" />
          {copy.common.brand}
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
