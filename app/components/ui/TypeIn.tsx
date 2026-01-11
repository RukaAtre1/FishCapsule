"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/copy/en";

type TypeInProps = {
  lines: string[];
  className?: string;
  delay?: number;
};

export default function TypeIn({ lines, className, delay = 70 }: TypeInProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [skip, setSkip] = useState(false);

  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (reducedMotion || skip) {
      setVisibleCount(lines.length);
      return;
    }
    if (visibleCount >= lines.length) return;
    const id = setTimeout(() => setVisibleCount((prev) => prev + 1), delay);
    return () => clearTimeout(id);
  }, [delay, lines.length, visibleCount, reducedMotion, skip]);

  return (
    <div className={className}>
      {lines.slice(0, visibleCount).map((line, idx) => (
        <p key={idx} className="text-slate-200">
          {line}
        </p>
      ))}
      {visibleCount < lines.length ? (
        <button
          className="mt-2 text-xs text-emerald-300 hover:text-emerald-200"
          onClick={() => setSkip(true)}
          type="button"
        >
          {copy.typeIn.skip}
        </button>
      ) : null}
    </div>
  );
}
