"use client";

import { copy } from "@/lib/copy/en";
import { useTheme } from "../providers";
import type { Theme } from "../providers";

const options: { id: "midnight" | "dark" | "light"; label: string }[] = [
  { id: "midnight", label: copy.theme.midnight },
  { id: "dark", label: copy.theme.dark },
  { id: "light", label: copy.theme.light }
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const tone: Record<Theme, string> = {
    midnight: "bg-[#7ac7ff]",
    dark: "bg-[#60a5fa]",
    light: "bg-[#2563eb]"
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface2)]/70 px-1 py-1 text-xs text-[color:var(--text)] shadow-[0_14px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      {options.map((opt) => (
        <button
          key={opt.id}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold transition ${
            theme === opt.id
              ? "bg-[color:var(--surface)] text-[color:var(--text)] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
              : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
          }`}
          onClick={() => setTheme(opt.id)}
          type="button"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${tone[opt.id]}`} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
