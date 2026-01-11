"use client";

import { copy } from "@/lib/copy/en";
import type { CornellCard } from "@/types/learning";
import TypeIn from "../ui/TypeIn";

export default function LearnCard({ card }: { card: CornellCard }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="glass-card space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--text)]">{copy.learnCard.cues}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[color:var(--muted)]">
            {card.cues.map((cue, idx) => (
              <li key={idx}>{cue}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--text)]">{copy.learnCard.summary}</h2>
          <TypeIn lines={[card.summary]} className="mt-2 space-y-1 text-[color:var(--muted)]" />
        </div>
      </section>

      <section className="glass-card space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--text)]">{copy.learnCard.notes}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[color:var(--muted)]">
            {card.notes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--text)]">{copy.learnCard.pitfalls}</h2>
          <ul className="mt-2 space-y-2">
            {card.misconceptions.map((item, idx) => (
              <li key={idx} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)]/80 px-3 py-2 text-[color:var(--text)]">
                <p className="text-sm font-semibold text-rose-200">
                  {copy.learnCard.pitfallLabel} {item.misconception}
                </p>
                <p className="text-sm text-[color:var(--accent)]">
                  {copy.learnCard.correctionLabel} {item.correction}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
