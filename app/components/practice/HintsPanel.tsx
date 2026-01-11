"use client";

import { copy } from "@/lib/copy/en";
import type { CornellCard } from "@/types/learning";

type Props = {
  card: CornellCard | null;
  open: boolean;
  onToggle: () => void;
};

export default function HintsPanel({ card, open, onToggle }: Props) {
  return (
    <div className="glass-card space-y-2">
      <button
        className="flex w-full items-center justify-between text-sm font-semibold text-[color:var(--text)]"
        onClick={onToggle}
        type="button"
      >
        <span>{copy.hintsPanel.title}</span>
        <span className="text-xs text-[color:var(--accent)]">{open ? copy.hintsPanel.collapse : copy.hintsPanel.expand}</span>
      </button>
      {!open && card ? <p className="mt-2 text-xs text-[color:var(--muted)]">{copy.hintsPanel.preview}</p> : null}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {open && card ? (
            <div className="mt-3 space-y-3 text-xs text-[color:var(--muted)]">
              <div>
                <p className="font-semibold text-[color:var(--text)]">{copy.learnCard.cues}</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {card.cues.map((cue, idx) => (
                    <li key={idx}>{cue}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-[color:var(--text)]">{copy.learnCard.summary}</p>
                <p className="mt-1 text-[color:var(--muted)]">{card.summary}</p>
              </div>
              <div>
                <p className="font-semibold text-[color:var(--text)]">{copy.hintsPanel.pitfalls}</p>
                <ul className="mt-1 space-y-1">
                  {card.misconceptions.map((m, idx) => (
                    <li key={idx} className="rounded border border-[color:var(--border)] bg-[color:var(--surface2)]/70 px-2 py-1">
                      <span className="text-rose-300">{copy.hintsPanel.pitfallLabel}</span> {m.misconception}
                      <br />
                      <span className="text-[color:var(--accent)]">{copy.hintsPanel.correctionLabel}</span> {m.correction}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
