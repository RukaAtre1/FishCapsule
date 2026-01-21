# FishCapsule PRD v2.3 (Update Addendum)
> Scope: **Learning Output Quality Upgrade + Notebook Save/Retrieve UX**
> Based on current UI demo (Cornell Notes + Practice) and observed risks: repetition, weak recall cues, low trust without evidence anchoring, missing exam boundaries, and “Save to Notebook” without a place to view.

---

## 0. Why this update
### What’s already good
- Beginner-friendly explanations (clear, approachable).
- Takeaway captures core idea (e.g., bagging → **variance reduction**).
- Cross-page synthesis is directionally correct.

### What’s hurting learning + trust
1) **Repetition**: Page-to-page notes repeat the same idea instead of adding value.
2) **Cues aren’t recall-driven**: Current cues are statements, not questions that force retrieval.
3) **No evidence anchoring**: Users can’t see “where in the slide this came from,” lowering trust.
4) **No exam boundaries**: Missing “compare-to / trap / when it works” content.
5) **Save without retrieval**: “Saved to notebook!” but no clear place to find it later.

---

## 1) Goals
### G1 — Cornell output becomes “study-efficient”
- Cues become **question-based** (retrieval practice), ready for Cloze (fill-in-the-blank).
- Notes become **non-redundant** and **high-density** (one core idea + bullets + exam traps).
- Summary becomes a **review card**, not a repetition block.

### G2 — Trust & provenance
- Each page includes a lightweight **Evidence Snippet** (source excerpt) tied to page number.

### G3 — Notebook is real (saved, findable, reusable)
- After saving, user can **open the notebook in one click**.
- Users can browse saved notebooks at **doc-level** and **global level**.
- Notebook persists across refresh/device (server-side), not only localStorage.

---

## 2) Non-goals (for v2.3)
- Full RAG (Retrieval-Augmented Generation) pipeline.
- Multi-user sharing / collaboration.
- Spaced repetition scheduling overhaul (only basic retrieval entry points).

---

## 3) UX Requirements

### 3.1 Cornell Notes UI changes (minimal layout change)
**A) Cues/Recall panel**
- Replace “Explain: …” statements with **Q/A style cues**.
- Each cue shows:
  - `page` (e.g., “p6”)
  - `tag` (BarrierTag: Concept / Mechanics / Transfer / Communication)
  - optional “difficulty” later (not in v2.3)

**B) Notes panel**
Per page, enforce structure:

- **Core idea** (1 sentence)
- **Mechanism** (2–3 bullets)
- **Exam traps** (1–2 bullets)
- **Mini example** (optional, max 1)

**C) Evidence snippet**
- Each page block includes a collapsible:
  - “Show source” → one-line snippet (≤ 120 chars)
  - Shows `page` + snippet text
- Purpose: trust + quick verification

**D) Takeaway interaction**
- Takeaway highlight becomes clickable:
  - “Generate 1 Cloze” from this takeaway → adds to Practice queue

### 3.2 Summary area changes
Replace paragraph summary with:
- **3 bullets** (Memorize)
- **2 likely exam questions** (Exam Q)

### 3.3 Notebook Save/Retrieve UX
**Save flow**
- After “Save to Notebook”:
  - Toast: `✅ Saved to "<DocTitle>"` + button `[Open Notebook]`
  - Clicking opens notebook detail page.

**Find flow**
- Add entry points:
  - Left “Source Material” section: add secondary tab **Notebooks**
    - Shows notebooks for current doc (docId filtered)
  - Global top nav button **My Notebooks**
    - Lists all notebooks across docs

---

## 4) AI Output Spec (Schema + Constraints)

### 4.1 Output schema (per page)
```ts
type BarrierTag = "concept" | "mechanics" | "transfer" | "communication";

type Cue = {
  page: number;
  tag: BarrierTag;
  q: string;          // question (must end with ?)
  a: string;          // short answer (<= 8 words preferred)
  cloze?: {           // optional, for direct practice
    text: string;     // e.g., "Bagging reduces ____."
    answer: string;   // "variance"
  };
};

type PageNote = {
  page: number;
  core: string;       // 1 sentence
  mechanism: string[];// 2–3 bullets
  examTraps: string[];// 1–2 bullets
  example?: string;   // optional, 1 short
  takeaway: string;   // <= 14 words
  evidence?: {
    page: number;
    snippet: string;  // <= 120 chars
  };
};

type SummaryCard = {
  memorize: string[]; // exactly 3 bullets
  examQs: string[];   // exactly 2 questions
};

type CornellOutput = {
  cues: Cue[];
  notes: PageNote[];
  summary: SummaryCard;
};
