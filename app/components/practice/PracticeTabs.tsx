"use client";

import { copy } from "@/lib/copy/en";
import type { QuickCheckQuestion } from "@/types/learning";

type Props = {
  questions: QuickCheckQuestion[];
  activeTab: string;
  onTabChange: (id: string) => void;
  answers: Record<string, string>;
  onAnswerChange: (id: string, value: string) => void;
  showHint: boolean;
  showAnswer: boolean;
};

function TabButton({
  id,
  active,
  label,
  onClick
}: {
  id: string;
  active: boolean;
  label: string;
  onClick: (id: string) => void;
}) {
  return (
    <button
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
        active
          ? "border-[color:var(--accent)]/70 bg-[color:var(--accent)]/18 text-[color:var(--text)] shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
          : "border-[color:var(--border)] bg-[color:var(--surface2)]/80 text-[color:var(--muted)] hover:border-[color:var(--accent)]/60 hover:text-[color:var(--text)]"
      }`}
      onClick={() => onClick(id)}
      type="button"
    >
      {label}
    </button>
  );
}

export default function PracticeTabs({
  questions,
  activeTab,
  onTabChange,
  answers,
  onAnswerChange,
  showHint,
  showAnswer
}: Props) {
  const activeQuestion = questions.find((q) => q.id === activeTab) ?? questions[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => {
          const label = q.type === "mcq" ? copy.practiceTabs.mcq : q.type === "code" ? copy.practiceTabs.code : copy.practiceTabs.short;
          return (
            <TabButton
              key={q.id}
              id={q.id}
              label={label}
              active={q.id === activeQuestion?.id}
              onClick={onTabChange}
            />
          );
        })}
      </div>

      {activeQuestion ? (
        <div className="space-y-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)]/80 p-4 min-h-[260px]">
          <p className="whitespace-pre-wrap text-sm font-semibold text-[color:var(--text)]">{activeQuestion.prompt}</p>
          {activeQuestion.type === "mcq" ? (
            <div className="space-y-2">
              {activeQuestion.choices.map((choice, idx) => (
                <label
                  key={idx}
                  className="flex cursor-pointer items-start gap-2 rounded border border-[color:var(--border)] bg-[color:var(--surface)]/70 px-3 py-2 text-sm text-[color:var(--text)] hover:border-[color:var(--accent)]/70"
                >
                  <input
                    type="radio"
                    className="mt-1 accent-emerald-500"
                    name={activeQuestion.id}
                    value={choice}
                    checked={answers[activeQuestion.id] === choice}
                    onChange={(e) => onAnswerChange(activeQuestion.id, e.target.value)}
                  />
                  <span>{choice}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              className="input min-h-[140px] w-full"
              placeholder={copy.practiceTabs.answerPlaceholder}
              value={answers[activeQuestion.id] || ""}
              onChange={(e) => onAnswerChange(activeQuestion.id, e.target.value)}
            />
          )}

          {showHint && activeQuestion.hints?.length ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
              <p className="font-semibold">{copy.practiceTabs.hintsTitle}</p>
              <ul className="list-disc space-y-1 pl-4">
                {activeQuestion.hints.map((hint, idx) => (
                  <li key={idx}>{hint}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {showAnswer ? (
            <div className="rounded-lg border border-[color:var(--accent)]/50 bg-[color:var(--accent)]/12 p-3 text-xs text-[color:var(--text)]">
              <p className="font-semibold">{copy.practiceTabs.answerTitle}</p>
              <p className="whitespace-pre-wrap text-[color:var(--text)]">{activeQuestion.answer}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[color:var(--muted)]">{copy.practiceTabs.noQuestions}</p>
      )}
    </div>
  );
}
