import { copy } from "@/lib/copy/en";
import type { CornellCard, QuickCheckMCQ, QuickCheckQuestion } from "@/types/learning";

type VariantMeta = {
  mcqVariantId?: string;
  shortVariantId?: string;
  codeVariantId?: string;
  ladder?: "fix_bug" | "write_guard" | "edge_case";
};

function seededShuffle<T>(arr: T[], seed: number) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = seed % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const shortTemplates = [
  "Explain it in two sentences and give one quick example.",
  "State the definition first, then contrast it with a nearby concept.",
  "Write the key idea and point out one common mistake to avoid."
];

const ladderPrompts: Record<"fix_bug" | "write_guard" | "edge_case", string> = {
  fix_bug: "Identify and fix one obvious bug in the logic below:",
  write_guard: "Add input validation or guardrails to the following function or approach:",
  edge_case: "Add an edge-case test or scenario for the prompt below:"
};

export function generatePracticeVariant(
  card: CornellCard,
  attemptCount: number,
  mode: "default" | "review" = "default",
  ladder?: "fix_bug" | "write_guard" | "edge_case"
): { questions: QuickCheckQuestion[]; variant: VariantMeta } {
  const seedBase = attemptCount + card.conceptId.length;
  const variant: VariantMeta = { ladder };
  const mcq = card.quickCheck.find((q) => q.type === "mcq") as QuickCheckMCQ | undefined;
  const shorts = card.quickCheck.filter((q) => q.type === "short");
  const codeTask = card.quickCheck.find((q) => q.type === "code");

  const questions: QuickCheckQuestion[] = [];
  if (mcq) {
    const shuffled = seededShuffle(mcq.choices, seedBase);
    const answerText = mcq.answer;
    const variantId = `mcq-${attemptCount}-${card.conceptId}`;
    variant.mcqVariantId = variantId;
    questions.push({
      ...mcq,
      id: `${mcq.id}-${variantId}`,
      choices: shuffled,
      answer: answerText
    });
  }

  if (shorts.length) {
    const templateIdx = (attemptCount + seedBase) % shortTemplates.length;
    const template = shortTemplates[templateIdx];
    const picked = shorts[0];
    variant.shortVariantId = `short-${templateIdx}`;
    questions.push({
      ...picked,
      id: `${picked.id}-v${templateIdx}`,
      prompt: `${picked.prompt} ${template}`
    });
    if (shorts[1] && mode === "default") {
      questions.push(shorts[1]);
    }
  }

  if (codeTask) {
    const ladderKey = ladder ?? "fix_bug";
    const prefix = ladderPrompts[ladderKey];
    const variantId = `code-${ladderKey}-${attemptCount}`;
    variant.codeVariantId = variantId;
    questions.push({
      ...codeTask,
      id: `${codeTask.id}-${variantId}`,
      prompt: `${prefix}\n${codeTask.prompt}`
    });
  }

  const finalQuestions =
    mode === "review" && questions.length > 1 ? questions.slice(0, 2) : questions;

  return { questions: finalQuestions, variant };
}

export function variantLadderOptions() {
  return [
    { id: "fix_bug" as const, label: copy.practice.variantLadder.fix_bug },
    { id: "write_guard" as const, label: copy.practice.variantLadder.write_guard },
    { id: "edge_case" as const, label: copy.practice.variantLadder.edge_case }
  ];
}
