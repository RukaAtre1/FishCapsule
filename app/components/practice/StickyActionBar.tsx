"use client";

import { copy } from "@/lib/copy/en";

type Props = {
  confidence: number | "";
  onConfidenceChange: (val: number | "") => void;
  onSave: () => void;
  onShowHint?: () => void;
  onRevealAnswer?: () => void;
  canShowHint?: boolean;
  canRevealAnswer?: boolean;
  saving?: boolean;
  saveDisabled?: boolean;
};

export default function StickyActionBar({
  confidence,
  onConfidenceChange,
  onSave,
  onShowHint,
  onRevealAnswer,
  canShowHint,
  canRevealAnswer,
  saving,
  saveDisabled
}: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-[color:var(--border)]/80 bg-[color:var(--surface2)]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-3">
        <select
          className="input w-[200px] text-sm"
          value={confidence === "" ? "" : confidence.toString()}
          onChange={(e) => onConfidenceChange(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">{copy.stickyAction.confidencePlaceholder}</option>
          <option value="5">{copy.stickyAction.options["5"]}</option>
          <option value="4">{copy.stickyAction.options["4"]}</option>
          <option value="3">{copy.stickyAction.options["3"]}</option>
          <option value="2">{copy.stickyAction.options["2"]}</option>
          <option value="1">{copy.stickyAction.options["1"]}</option>
        </select>

        {canShowHint ? (
          <button className="btn-glass" onClick={onShowHint} type="button">
            {copy.stickyAction.showHints}
          </button>
        ) : null}

        {canRevealAnswer ? (
          <button className="btn-glass" onClick={onRevealAnswer} type="button">
            {copy.stickyAction.revealAnswer}
          </button>
        ) : null}

        <button
          className="btn-primary ml-auto"
          onClick={onSave}
          disabled={saving || !!saveDisabled}
          type="button"
        >
          {saving ? copy.stickyAction.saving : copy.stickyAction.save}
        </button>
      </div>
    </div>
  );
}
