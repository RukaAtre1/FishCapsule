"use client";

import { useMemo, useState } from "react";
import { useToast } from "./ui/Toast";
import { copy } from "@/lib/copy/en";

type MicroDrillProps = {
  task: string;
  hint?: string;
  answer?: string;
  onComplete: () => void;
};

export default function MicroDrill({ task, hint, answer, onComplete }: MicroDrillProps) {
  const [input, setInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [notified, setNotified] = useState(false);
  const { addToast } = useToast();

  const buttonLabel = useMemo(() => {
    if (answer) {
      return showAnswer ? copy.microDrill.answered : copy.microDrill.showAnswer;
    }
    return notified ? copy.microDrill.completed : copy.microDrill.markComplete;
  }, [answer, notified, showAnswer]);

  const notifyComplete = () => {
    if (notified) return;
    setNotified(true);
    onComplete();
    addToast(copy.toast.microDrillDone, "success");
  };

  const handleReveal = () => {
    setShowAnswer(true);
    notifyComplete();
  };

  const handleComplete = () => {
    notifyComplete();
  };

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)]/80 p-4 shadow-inner">
      <p className="text-base font-semibold text-[color:var(--text)]">
        {copy.microDrill.promptLabel} {task}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {hint ? (
          <button
            className="self-start text-xs text-[color:var(--accent)] hover:text-[color:var(--text)]"
            onClick={() => setShowHint((prev) => !prev)}
            type="button"
          >
            {showHint ? copy.microDrill.hintHide : copy.microDrill.hintShow}
          </button>
        ) : null}
        {showHint && hint ? <p className="text-xs text-[color:var(--muted)]">Hint: {hint}</p> : null}
        <textarea
          rows={3}
          className="input w-full text-sm"
          placeholder={copy.microDrill.placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          {answer ? (
            <button
              className={`btn-primary px-3 py-2 text-sm ${showAnswer ? "cursor-not-allowed opacity-80" : ""}`}
              onClick={handleReveal}
              disabled={showAnswer}
              type="button"
            >
              {buttonLabel}
            </button>
          ) : (
            <button
              className={`btn-primary px-3 py-2 text-sm ${notified ? "cursor-not-allowed opacity-80" : ""}`}
              onClick={handleComplete}
              disabled={notified}
              type="button"
            >
              {buttonLabel}
            </button>
          )}
          {input ? <span className="text-xs text-[color:var(--muted)]">{copy.microDrill.charCount(input.length)}</span> : null}
        </div>
        {showAnswer && answer ? (
          <div className="mt-2 rounded-lg border border-[color:var(--accent)]/60 bg-[color:var(--surface)]/90 p-3 text-sm text-[color:var(--text)]">
            <p className="font-semibold text-[color:var(--accent)]">{copy.microDrill.referenceAnswer}</p>
            <p className="whitespace-pre-wrap text-[color:var(--text)]">{answer}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
