import type { BarrierId } from "@/types/learning";

type BarrierMeta = {
  id: BarrierId;
  name: string;
  definition: string;
  signals: string[];
};

type Tactic = {
  id: string;
  title: string;
  why: string;
  steps: string[];
};

export const barrierMeta: Record<BarrierId, BarrierMeta> = {
  concept_confusion: {
    id: "concept_confusion",
    name: "Concept Confusion",
    definition: "Core idea is blurry; definitions or roles are mixed up.",
    signals: ["Low accuracy overall", "Confused wording", "Mixing multiple ideas"]
  },
  misconception: {
    id: "misconception",
    name: "Misconception",
    definition: "Holds an incorrect rule or exception about the idea.",
    signals: ["Confident but wrong picks", "Repeating same wrong option"]
  },
  retrieval_gap: {
    id: "retrieval_gap",
    name: "Retrieval Gap",
    definition: "Knows it when seen but cannot recall without cues.",
    signals: ["Blank or very short answers", "Long pauses before responses"]
  },
  application_gap: {
    id: "application_gap",
    name: "Application Gap",
    definition: "Can recognize the idea but struggles to use it in answers.",
    signals: ["Correct MCQ but weak short answers", "Missing conditions in examples"]
  },
  precision_issue: {
    id: "precision_issue",
    name: "Precision Issue",
    definition: "Answer is verbose but misses key conditions or boundaries.",
    signals: ["Extra fluff without key terms", "Half-true statements"]
  },
  confidence_block: {
    id: "confidence_block",
    name: "Confidence Block",
    definition: "Hesitation or low volume of attempts despite need.",
    signals: ["Few attempts", "Self-reported low confidence"]
  }
};

const tactics: Record<string, Tactic> = {
  layered_recall: {
    id: "layered_recall",
    title: "Layered Recall Bursts",
    why: "Short recall rounds rebuild the core definition and anchors.",
    steps: [
      "Write a one-sentence definition from memory.",
      "Add two concrete cues or examples.",
      "Re-test in 10 minutes with shuffled prompts."
    ]
  },
  contrast_examples: {
    id: "contrast_examples",
    title: "Contrast Close Examples",
    why: "Juxtaposing look-alike cases makes boundaries memorable.",
    steps: [
      "List two similar-but-different cases.",
      "Mark the decisive difference in each.",
      "Create a mini 'if/then' rule for when to apply the concept."
    ]
  },
  teach_back: {
    id: "teach_back",
    title: "Teach-Back Micro Lesson",
    why: "Explaining forces you to order the idea and spot gaps.",
    steps: [
      "Record a 2-minute audio explaining the concept plainly.",
      "Play it back and note missing qualifiers.",
      "Re-record with the missing pieces."
    ]
  },
  target_conditions: {
    id: "target_conditions",
    title: "Condition Checklist",
    why: "A checklist keeps the exact triggers and constraints visible.",
    steps: [
      "List the exact conditions where the concept applies.",
      "Add one counter-condition where it fails.",
      "Use the checklist to grade two practice examples."
    ]
  },
  stepwise_drills: {
    id: "stepwise_drills",
    title: "Stepwise Practice",
    why: "Breaking actions into ordered steps reduces overload when applying.",
    steps: [
      "Write the 3-5 steps to answer a related question.",
      "Rehearse each step aloud without looking.",
      "Combine steps and time-box to 90 seconds."
    ]
  },
  confidence_ladders: {
    id: "confidence_ladders",
    title: "Confidence Ladder",
    why: "Small wins reduce avoidance and build momentum.",
    steps: [
      "Start with one easy flashcard.",
      "Move to one medium question with notes closed.",
      "Attempt one hard transfer question; log effort not perfection."
    ]
  },
  create_flashcards: {
    id: "create_flashcards",
    title: "Cued Flashcards",
    why: "Well-crafted cues make retrieval faster and more reliable.",
    steps: [
      "Write 3 cue-answer pairs using verbs and context cues.",
      "Add one 'trap' card for a common misconception.",
      "Review twice today using spaced intervals."
    ]
  }
};

const barrierTactics: Record<
  BarrierId,
  { required: string[]; optional: string[] }
> = {
  concept_confusion: { required: ["layered_recall"], optional: ["teach_back", "contrast_examples"] },
  misconception: { required: ["contrast_examples"], optional: ["create_flashcards", "teach_back"] },
  retrieval_gap: { required: ["create_flashcards"], optional: ["layered_recall", "confidence_ladders"] },
  application_gap: { required: ["stepwise_drills"], optional: ["target_conditions", "teach_back"] },
  precision_issue: { required: ["target_conditions"], optional: ["contrast_examples", "teach_back"] },
  confidence_block: { required: ["confidence_ladders"], optional: ["layered_recall", "stepwise_drills"] }
};

export function buildActionsForBarriers(barriers: BarrierId[]) {
  const used = new Set<string>();
  const actions: { title: string; why: string; steps: string[] }[] = [];

  barriers.forEach((b) => {
    const mapping = barrierTactics[b];
    if (!mapping) return;
    const candidateIds = [...mapping.required, ...(mapping.optional || [])];
    candidateIds.forEach((id) => {
      if (used.has(id)) return;
      const tactic = tactics[id];
      if (tactic) {
        used.add(id);
        actions.push({ title: tactic.title, why: tactic.why, steps: tactic.steps });
      }
    });
  });

  const genericAction = {
    title: "Self-check loop",
    why: "Keeps you iterating even without detailed diagnostics.",
    steps: [
      "Write a one-liner answer.",
      "Compare against notes and mark missing pieces.",
      "Retry with those pieces emphasized."
    ]
  };
  const spacedReview = {
    title: "Spaced mini-review",
    why: "Short, spaced passes improve recall reliability.",
    steps: [
      "Set a 5-minute timer and recall main cues.",
      "Check notes only after writing your attempt.",
      "Repeat twice later today with shuffled prompts."
    ]
  };

  if (actions.length === 0) {
    actions.push(genericAction, spacedReview);
  } else if (actions.length === 1) {
    actions.push(spacedReview);
  }
  return actions;
}
