# FishCapsule PRD v2.2 — Duolingo × Cornell (Cloze-first)

> **Theme:** Turn Cornell Notes into a Duolingo-style training loop.  
> **Scope for v2.2:** Implement **Type C (Cloze)** first to establish:  
> **instant feedback → XP/streak → mistake bank → today review queue**, with Cornell Notes as the explanation layer.

---

## 1) One-liner
Learn PDFs like Duolingo: do **cloze questions** with **instant feedback**, earn **XP/streak**, and turn mistakes into a **review queue**, backed by **Cornell Notes** for explanations.

---

## 2) Why this version
### Current pain (v2.1)
- Cornell Notes looks correct but learning mechanism feels weak.
- Save to Notebook feels low-value without a clear review loop.
- Cues/Recall feels redundant with takeaways.

### v2.2 fixes
- Convert Cornell/Cues into **answerable training cards** (start with Cloze).
- Create a strong **micro-loop** (10–20s per question) with instant feedback.
- Make mistakes drive review through **Mistake Bank + Today Review**.

---

## 3) Goals / Non-goals
### Goals
1. **Cloze-first LessonRunner**: 8–12 cloze questions per lesson (pages range).
2. **Instant feedback**: ✅/❌ + correct answer + short explanation (from Cornell Notes).
3. **Game layer**: XP + session streak (optional daily streak later).
4. **Mistake Bank**: wrong answers get stored; create **Today Review** queue.
5. **Cornell integration**: each question links back to page-anchored notes (“Show notes”).

### Non-goals (not in v2.2)
- No open-ended auto-grading (avoid unfair scoring).
- No full “course map” across units (single doc flow is enough).
- No full RAG grounding (page anchors + generated notes only).
- No multi-type questions yet (only Cloze).

---

## 4) Key Concepts
- **Lesson**: `docId/file + pagesRange` (e.g., pages 6–7).
- **Cloze Question (Type C)**: sentence with one blank + 4 choices + one correct.
- **Micro-loop**: question → answer → instant feedback → record → next.
- **Mistake Bank**: store wrong questions with scheduling for review.
- **Today Review**: small due queue (2–5 min) drawn from mistake bank.

---

## 5) UX / Workflow
### Flow A: First-time practice (Lesson)
1. Select pages → generate Cornell Notes (existing).
2. Click **Start Practice**.
3. Enter **LessonRunner** (Cloze).
4. For each question:
   - choose an option
   - instant ✅/❌ feedback
   - show correct answer + short explanation
   - optional **Show notes** (expand linked notes)
   - Next
5. End screen:
   - XP earned, accuracy, mistakes
   - CTA: **Review mistakes now** / **Save to Notebook**

### Flow B: Today Review (2–5 min)
1. Open Practice tab → Today Review count.
2. Answer 6 due cloze questions.
3. Update scheduling based on correct/wrong.

---

## 6) Information Architecture (MVP)
Inside Study Notebook Panel, add a third tab:

- **Cornell Notes** (default)
- **Generation** (existing Step 1–4)
- **Practice** (NEW)

Practice tab contains:
- Start Practice (for current pages)
- Today Review (global queue from localStorage)

> Future: separate bottom nav Learn / Practice / Notebook / Profile, but not required for v2.2.

---

## 7) Question Type: Cloze (Type C)
### Structure
Each question includes:
- `sentence` with blank marker (e.g. `____` or `{blank}`)
- `choices` length = 4
- `answerIndex` (0–3)
- `explanation` <= 200 chars
- `sourcePages[]`
- optional `tag` (BarrierTag)

### Example
- Sentence: `Bagging reduces ____ by averaging predictions over bootstrap samples.`
- Choices: `["variance","bias","learning rate","entropy"]`
- AnswerIndex: 0
- Explanation: `Averaging high-variance models cancels noise, reducing variance.`
- SourcePages: `[6,7]`

### Quantity & Coverage
- Per lesson: **8–12** questions
- Per page: target **3–5** questions

---

## 8) Game Mechanics
### XP
- Correct: +10 XP
- Optional streak bonus: +2 XP every consecutive correct after the first
- Lesson completion bonus: +30 XP if accuracy ≥ 80%

### Session Streak
- Consecutive correct answers in current session
- Wrong resets session streak to 0

### Mistake behavior
- Wrong answer → add/update in Mistake Bank
- wrongCount increments; wrong questions prioritized in Today Review

---

## 9) Cornell Integration (Differentiator)
### Generation source
Cloze questions should be based on Cornell artifacts:
- Step1 notes bullets
- Step2 key ideas / common confusion
- pages range

### Explanation layer
- explanation should be derived from Cornell notes/takeaway (short)
- “Show notes” expands the relevant page notes to support learning & trust

---

## 10) Data Schemas
### BarrierTag
`"Concept" | "Mechanics" | "Transfer" | "Communication"`

### ClozeQuestion
```ts
type ClozeQuestion = {
  id: string;
  sentence: string;          // contains blank marker
  choices: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;       // <= 200 chars
  sourcePages: number[];
  tag?: BarrierTag;
};
````

### LessonRun

```ts
type LessonRun = {
  lessonId: string; // doc + pages range
  questions: ClozeQuestion[];
  answers: Array<{
    questionId: string;
    selectedIndex: number;
    correct: boolean;
    ts: number;
  }>;
  xpEarned: number;
  accuracy: number;
};
```

### MistakeItem

```ts
type MistakeItem = {
  question: ClozeQuestion;
  wrongCount: number;
  lastWrongAt: number;
  nextReviewAt: number;
  lastResult?: "wrong" | "right";
};
```

### UserGameState

```ts
type UserGameState = {
  totalXP: number;
  sessionStreak: number;
  // dailyStreak?: number; // optional future
  // lastActiveDate?: string; // optional future
};
```

---

## 11) Storage (Local First)

* Mistakes: `localStorage["fishcapsule:mistakes"]`
* Game state: `localStorage["fishcapsule:gameState"]`
* Notebook: `localStorage["fishcapsule:notebooks"]` (existing v2.1)

APIs:

* `mistakeBankStore.ts`: add/update/getDue
* `gameStateStore.ts`: addXP/reset/update streak

---

## 12) API Contract

Option A: Extend existing step3

* `POST /api/study/step3` returns `{ questions: ClozeQuestion[] }`

Option B: New endpoint (cleaner)

* `POST /api/practice/cloze` returns `{ questions: ClozeQuestion[] }`

### Reliability requirements

* Strip markdown fences from LLM output
* Normalize shapes
* Zod validate; retry up to 2 times if invalid
* 422 must return zod issues in development mode

---

## 13) Spaced Review (Simple Scheduling Rules)

MVP scheduling (no SM-2 yet):

* First wrong: nextReviewAt = now + 1 day
* Second wrong: nextReviewAt = now + 12 hours
* Correct on review: nextReviewAt = now + 3 days
* Correct twice in a row: nextReviewAt = now + 7 days

Today Review selection:

* pick N=6 due questions ordered by `nextReviewAt`, then `wrongCount` desc

---

## 14) Frontend Components

### New

* `PracticeTab.tsx`
* `LessonRunner.tsx`
* `mistakeBankStore.ts`
* `gameStateStore.ts`

### Modified

* `StudyNotebookPanel.tsx`

  * add Practice tab
  * wire Start Practice for current pages
  * show Today Review count

UI details:

* Sentence displayed with blank
* 4 choice buttons
* After selection:

  * show ✅/❌
  * show correct answer + explanation
  * CTA: Next
  * optional: “Show notes”

---

## 15) Acceptance Criteria

1. **Start Practice works**

   * For pages 6–7, user gets 8–12 cloze questions rendered correctly.

2. **Instant feedback**

   * Selecting an option immediately shows correct/incorrect + explanation.

3. **XP & streak**

   * XP increases correctly; streak increases on correct and resets on wrong.

4. **Mistake Bank**

   * Wrong questions are stored in localStorage and appear in Today Review.

5. **Cornell link**

   * “Show notes” expands relevant notes for the question’s sourcePages.

6. **Reliability**

   * If API returns 422, UI shows Retry and can recover.

---

## 16) Implementation Checklist (P0)

Backend

* [ ] Cloze schema (Zod)
* [ ] Cloze generation prompt + normalization + retries
* [ ] Endpoint returns `{questions: ClozeQuestion[]}`

Frontend

* [ ] Practice tab
* [ ] LessonRunner (Cloze)
* [ ] Instant feedback UI
* [ ] XP + session streak store
* [ ] Mistake Bank store + Today Review
* [ ] Optional “Show notes” expansion

---

## 17) Next (v2.3+)

* Add Type A (Flash self-grade) + Type B (MCQ)
* Daily streak (date-based)
* Learn map (units/lessons)
* RAG evidence grounding (citations/snippets)


