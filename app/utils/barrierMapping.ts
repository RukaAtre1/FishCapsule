import type {
  FeedbackBarrierId,
  FeedbackTactic,
  MicroDrill
} from "@/types/learning";

type BarrierMappingEntry = {
  name: string;
  description: string;
  tactics: FeedbackTactic[];
  microDrill: MicroDrill;
  retestPlan: string;
};

export const barrierMapping: Record<FeedbackBarrierId, BarrierMappingEntry> = {
  concept_confusion: {
    name: "Concept blur",
    description: "Definitions or boundaries overlap; answers mix multiple ideas.",
    tactics: [
      { title: "Rewrite the definition", description: "Write a one-line definition of {concept} with the must-have conditions." },
      { title: "Contrast similar concepts", description: "List commonly confused neighbors and write the key differences plus one counterexample." },
      { title: "Example check", description: "Create two positive examples and one counterexample to pressure-test your definition." }
    ],
    microDrill: {
      task: "Without notes, write a two-sentence definition of {concept} and give one counterexample that fails the conditions.",
      hint: "Use must/if/otherwise wording to mark the boundaries.",
      answer: "Example: {concept} requires conditions A and B; a counterexample lacks A or violates B, so it does not qualify."
    },
    retestPlan: "Re-explain {concept} in 10 minutes with a new prompt to confirm the order of conditions."
  },
  misconception: {
    name: "Faulty rule",
    description: "An incorrect rule or exception is memorized, causing repeat errors.",
    tactics: [
      { title: "Error checklist", description: "List common traps and the corrected statement; skim before answering." },
      { title: "Counterexample rewrite", description: "Write one counterexample for the mistake and the corrected takeaway." },
      { title: "Teach the fix", description: "Explain the correction out loud, emphasizing the trigger words that flip the answer." }
    ],
    microDrill: {
      task: "Write the mistaken rule you applied and rewrite the correct statement for {concept}.",
      hint: "Start with \"Actually...\" and point to the missed condition."
    },
    retestPlan: "Do one targeted question today and another tomorrow to confirm the correction sticks."
  },
  retrieval_gap: {
    name: "Retrieval gap",
    description: "Needs hints to recall; answers are blank or very short.",
    tactics: [
      { title: "Layered recall", description: "List keywords, then expand to full sentences, then add conditions and exceptions." },
      { title: "Quick flash cards", description: "Create 3 fast flash cards and loop through them for 1-3 minutes." },
      { title: "Voice recap", description: "Record a 1-minute recap with eyes closed, then replay and note missing pieces." }
    ],
    microDrill: {
      task: "Write three keywords for {concept} and connect them in one sentence without notes.",
      hint: "Link keywords with because/so to avoid just listing nouns."
    },
    retestPlan: "Self-test 10 minutes later and again in 2 hours."
  },
  application_gap: {
    name: "Application gap",
    description: "Understands the idea but struggles to apply it to steps or examples.",
    tactics: [
      { title: "Step checklist", description: "Turn the solution flow into 3-5 ordered steps and rehearse them." },
      { title: "Scenario walkthrough", description: "Apply {concept} to a small scenario, writing input -> process -> output." },
      { title: "Rewrite an example", description: "Take a textbook example and change conditions; solve it again using the steps." }
    ],
    microDrill: {
      task: "Pick a small scenario using {concept}. Write 3-5 steps to apply it.",
      hint: "Use 'if...then...' phrasing to mark decisions."
    },
    retestPlan: "Do a fresh problem now, then another tomorrow with a different scenario."
  },
  precision_issue: {
    name: "Imprecise expression",
    description: "Answers are long but miss keywords or conditions.",
    tactics: [
      { title: "Keyword frame", description: "List the three terms that must appear and bold them in your answer." },
      { title: "State constraints", description: "Explicitly write preconditions, limits, and exceptions." },
      { title: "Short-sentence rewrite", description: "Split long sentences into three short ones, one idea each." }
    ],
    microDrill: {
      task: "Compress your answer into three short sentences, each with one keyword and one condition.",
      hint: "Use colons or dashes to highlight the terms.",
      answer: "Example: name the core term, state the condition, then state a boundary or exception."
    },
    retestPlan: "Rewrite a concise answer in 5 minutes and compare to the reference. Retest once more today."
  },
  confidence_block: {
    name: "Confidence block",
    description: "Low confidence leads to avoidance; attempts are sparse.",
    tactics: [
      { title: "Confidence ladder", description: "Do one easy item first, then a medium one, recording small wins." },
      { title: "Timed micro-steps", description: "Set a 90-second timer for a tiny action to reduce hesitation." },
      { title: "Positive log", description: "Log one bright spot after each attempt to counter doom-thinking." }
    ],
    microDrill: {
      task: "List the smallest action related to {concept} you can do in 90 seconds, then do it now.",
      hint: "Make it tiny enough to start without thinking, like writing the definition or first step."
    },
    retestPlan: "After two micro-steps, run a full quick check and note your confidence change."
  },
  misread_prompt: {
    name: "Prompt misread",
    description: "Misses verbs or limits, so the answer tackles the wrong question.",
    tactics: [
      { title: "Highlight verbs", description: "Circle action words and limits; confirm whether to explain, compare, or compute." },
      { title: "Restate the ask", description: "Write one line: \"The question wants me to...\" before answering." },
      { title: "Sample check", description: "Build a tiny example to verify your interpretation before committing." }
    ],
    microDrill: {
      task: "Take a question on {concept}; write the three verbs/constraints and restate the ask in one line.",
      hint: "Focus on verbs like explain/compare/prove and any limiting adjectives."
    },
    retestPlan: "Before the next problem, spend 30 seconds marking verbs and limits, then answer."
  },
  vocabulary_gap: {
    name: "Vocabulary gap",
    description: "Key terms feel unfamiliar, slowing expression or comprehension.",
    tactics: [
      { title: "Term sheet", description: "List core terms with a one-line meaning you can rehearse quickly." },
      { title: "Synonym swap", description: "Write two alternate phrases for each term to avoid blanking out." },
      { title: "Read-aloud chain", description: "Read the terms aloud in a connected sentence to build rhythm." }
    ],
    microDrill: {
      task: "List five terms tied to {concept} and write one line explaining each.",
      hint: "Start with \"means...\" to keep it short and clear."
    },
    retestPlan: "Read the list twice today; tomorrow, use three terms in sentences before testing again."
  },
  memory_decay: {
    name: "Memory decay",
    description: "Details faded after a long gap between reviews.",
    tactics: [
      { title: "Quick review", description: "Spend 3 minutes skimming notes and pulling the top points." },
      { title: "Spaced checks", description: "Schedule self-tests today, tomorrow, and in three days." },
      { title: "Redo past misses", description: "Redo a previously missed item and highlight the corrected detail." }
    ],
    microDrill: {
      task: "Write three lines summarizing the core of {concept} and one detail you previously missed.",
      hint: "Lead with title, definition, example; end with the missed detail."
    },
    retestPlan: "Test now, tomorrow, and three days later to rebuild the curve."
  },
  reasoning_jump: {
    name: "Reasoning jumps",
    description: "Middle steps are missing, so the argument feels disjointed.",
    tactics: [
      { title: "Fill the bridges", description: "Write each inference step and add a short \"because\" justification." },
      { title: "Reverse check", description: "Work backward from the answer to see if each step is reversible." },
      { title: "Peer walkthrough", description: "Have someone follow your steps and mark where they cannot execute." }
    ],
    microDrill: {
      task: "Write the solution as numbered steps for {concept} and add \"because...\" after each.",
      hint: "Keep one inference per step; avoid merging multiple moves."
    },
    retestPlan: "Redo the same problem immediately using the steps, then one more later today."
  },
  careless_error: {
    name: "Careless slips",
    description: "Loses points on copying, symbols, or units.",
    tactics: [
      { title: "Checklist scan", description: "Create a checklist for units, signs, order, and format; scan before submitting." },
      { title: "Slow first pass", description: "Deliberately slow the first attempt to ensure clean setup and notation." },
      { title: "Cross-check", description: "Verify key numbers or conditions with a quick alternate method." }
    ],
    microDrill: {
      task: "After one problem, check units/symbols/order with your list and write the slip you found (if any).",
      hint: "Reserve one minute only for review - no new thinking."
    },
    retestPlan: "Use the checklist for every problem today; recheck with another problem in an hour."
  },
  overload: {
    name: "Overload",
    description: "Too much information creates freeze or slow starts.",
    tactics: [
      { title: "Chunk the info", description: "Split the prompt into data, conditions, and goal; tackle one chunk at a time." },
      { title: "Whiteboard draft", description: "Sketch or bullet the structure to offload working memory before writing." },
      { title: "Limit inputs", description: "Hide or ignore extra text and handle one variable or paragraph at once." }
    ],
    microDrill: {
      task: "Split a {concept}-related problem into \"given / goal / tools\" columns and fill each with up to five bullets.",
      hint: "Keep each column lean so you can scan it in under 15 seconds."
    },
    retestPlan: "Apply the chunk-first approach to three problems today, then one more tomorrow."
  },
  none: {
    name: "No major barrier",
    description: "Performance is stable; keep spacing and variety to stay sharp.",
    tactics: [
      { title: "Maintain spacing", description: "Keep short-cycle reviews to prevent forgetting." },
      { title: "Mix formats", description: "Try a different format or cross-topic question to test transfer." },
      { title: "Teach someone", description: "Explain {concept} to a peer or to yourself on record for one minute." }
    ],
    microDrill: {
      task: "Write a brief note to future you with the steps that keep {concept} solid.",
      hint: "Be concise and highlight the key checks that prevent drift."
    },
    retestPlan: "Schedule another quick check tomorrow and next week to keep mastery."
  }
};

export const barrierTaxonomy = Object.entries(barrierMapping).map(([id, entry]) => ({
  id: id as FeedbackBarrierId,
  name: entry.name,
  description: entry.description
}));
