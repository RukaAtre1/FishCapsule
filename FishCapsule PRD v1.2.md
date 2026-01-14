# **FishCapsule PRD v1.2 (Final, Clean) — Lecture Notebook Workspace \+ L1 Evidence Grounding**

## **0\) One-liner**

FishCapsule v1.2 turns a syllabus into a structured course map, then lets users upload lecture slides (PDF-only) and learn page-by-page. The left panel shows high-quality Concept Modules (with vivid examples \+ quick checks); the right panel is a fixed Cornell Lecture Notebook that accumulates notes for that lecture. All AI outputs are schema-validated, repairable, cache-first, and include page-level citations (L1 evidence grounding). OCR is used only when needed and only for the selected pages.

---

## **1\) Problem**

Students’ course materials are scattered across syllabus text, PDFs, and slide decks. They waste time deciding what to study next, and generic chatbots produce shallow, unreliable answers. Explaining entire slide decks is token-expensive and slow. When systems silently fall back to templated outputs, trust collapses.

---

## **2\) Target Users**

* **Primary:** UCLA STEM undergrads preparing for quizzes/midterms/finals.  
* **Secondary:** Self-learners preparing for interviews/certifications using course slides.  
  ---

  ## **3\) Goals & Non-goals**

  ### **3.1 Goals (Must-have)**

1. **Outline-driven navigation:** Syllabus → structured Week/Lecture outline.  
2. **PDF-only slides (v1.2):** Users upload slides as PDFs per lecture.  
3. **Page/range learning:** Explain a single page by default; range explain capped at **\<= 5 pages**.  
4. **High-quality concepts:** Every Concept Module includes **intuition \+ vivid example \+ traps \+ quick check**.  
5. **Lecture Cornell Notebook:** One notebook per lecture; fixed right panel; append-only behavior (editable).  
6. **L1 evidence grounding:** Explanations include **citations** (page \+ chunkId).  
7. **Reliability visibility:** Zod validation \+ one repair \+ safe fallback; expose `meta.source`, latency, fail stage.  
8. **Local-first storage:** Persist slide text, explanations, notebooks, attempts in **IndexedDB/localStorage**; do not store large files on Vercel.  
9. **Vercel deployability:** Build passes; clean dependency resolution; no hacks.

   ### **3.2 Non-goals (Not in v1.2)**

* Course-level vector DB / NotebookLM-style long-term multi-document knowledge base (L2/L3).  
* RAG verification / claim-to-evidence auditing (L4).  
* Default “explain entire deck” behavior (forbidden).  
* Cross-lecture auto-merge into a global knowledge graph.  
  ---

  ## **4\) Core User Journey**

1. **Ingest Syllabus**  
* Input: course title (optional) \+ syllabus text (required)  
* Action: Generate Outline → create StudySession → go to Course Map  
2. **Course Map**  
* Render Week/Lecture list  
* Each lecture shows slides status (uploaded/not uploaded)  
* Click lecture → Lecture Workspace  
3. **Lecture Workspace (Core)**  
* Upload PDF slides for this lecture (recommended)  
* Select page or range (\<=5 pages)  
* Click Explain → generate SlideExplain (with citations)  
* Generate Concept Modules (with vivid examples)  
* Left: Concept Stack  
* Right: Cornell Lecture Notebook (fixed, accumulative)  
* Practice → save attempts → (optional) diagnose/feedback  
  ---

  ## **5\) Product Shape & Pages**

* `/` Landing (cinematic StarField)  
* `/ingest` Syllabus ingestion (cinematic StarField)  
* `/course?session=<id>` Course Map (outline)  
* `/lecture?session=<id>&lecture=<lectureId>` Lecture Workspace (core learning)  
* `/practice?...` Optional route (or inline drawer)  
* `/feedback?...` Optional route (or embedded panel)  
  ---

  ## **6\) UI & Theme Requirements**

  ### **6.1 StarField Scope (Page-scoped, Non-negotiable)**

* StarField background is enabled **only** on:  
  * `/` (Landing)  
  * `/ingest` (Ingestion)  
* All other pages (`/course`, `/lecture`, `/practice`, `/feedback`) do **not** require StarField and may use a lighter static gradient background for readability/performance.  
* **Non-regression:** Do not remove or degrade the existing StarField behavior (particle count, glow/blending, slow rotation, mouse repulsion, lerp return) unless performance data justifies a change.

  ### **6.2 Cinematic Consistency (Without forcing StarField everywhere)**

* All pages must keep a consistent “cinematic glass” design system:  
  * glass cards, spacing, typography, max width, responsive layout, theme tokens.  
* Error states must be usable and non-blocking (Retry paths, no dead ends).  
  ---

  ## **7\) Lecture Workspace UX Spec (Key Requirement)**

  ### **Layout: Two-pane**

**Left pane: Concept Stack**

* Header: lecture title \+ page selector \+ range selector (\<=5)  
* Concept modules list; vertical “flip” navigation (animation optional)  
* Each Concept Module MUST include:  
  * `oneLiner`  
  * `intuition` (2–4 short points)  
  * `vividExample` (mandatory)  
  * `miniMathOrPseudo` (optional)  
  * `commonTraps` (2–4)  
  * `quickCheck` (question \+ answer \+ explanation)  
  * `citations` (clickable)

Buttons:

* **Add to Notebook** (append)  
* **Practice** (generate 1–3 questions)

**Right pane: Lecture Cornell Notebook (fixed)**

* Cues: collected questions/checks (editable)  
* Notes: append-only list (editable, reorder)  
* Summary: lecture summary; optional “Update summary” action

**Optional: Slide viewer**

* Show current page image/preview  
* Render only selected page(s)  
  ---

  ## **8\) Slides Pipeline (PDF-only \+ OCR fallback)**

  ### **Principle**

* Default: extract text using PDF text extraction (pdf.js)  
* If extracted text is insufficient: run OCR **only for selected page(s)/range**  
* OCR should be **client-side first** (e.g., Tesseract.js) and cached in IndexedDB

  ### **OCR Trigger (suggested)**

* `pageText.length < 40` OR mostly garbage characters → show “Run OCR” button (or auto-run if desired)

  ### **Range Constraints**

* Explain range max: **\<= 5 pages**  
* OCR range max: **\<= 5 pages**  
  ---

  ## **9\) L1 Evidence Grounding (Light RAG)**

  ### **Definition**

No course-level vector store. For each explain request, use only the selected page/range chunks as evidence and require explicit citations.

### **Chunking**

* Split `pageText` into chunks (100–200 tokens or paragraph/bullet boundaries)  
* Each chunk gets a stable `chunkId` (hash)

  ### **Output Requirement**

SlideExplain and Concept Modules MUST include:

* `citations: [{ page:number, chunkId:string, snippet?:string }]`  
* Snippets must be short.  
  ---

  ## **10\) Functional Requirements (FR)**

  ### **FR1 — Syllabus → Outline**

* Generate structured lecture nodes sorted by time  
* Persist to local storage

  ### **FR2 — Lecture Slides Binding**

* One PDF deck per lecture  
* Store locally (IndexedDB); server must not store full PDFs  
* Track: `deckId`, `pageCount`

  ### **FR3 — Page/Range Explain**

* Extract text (pdf.js)  
* If low-text: OCR on-demand (client-side)  
* Call `/api/slides/explain` with selected chunks only

  ### **FR4 — High-quality Concept Modules**

* Every module must include vividExample \+ quickCheck

  ### **FR5 — Lecture Notebook (Append-only)**

* Add to notebook must not overwrite prior notes; it appends  
* Notes/cues editable, reorderable  
* One notebook per lecture

  ### **FR6 — Practice \+ Attempts**

* Generate 1–3 questions per concept  
* Save attempts with lecture/page/concept linkage

  ### **FR7 — Diagnose/Feedback (Optional tail of v1.2)**

* Barriers \+ next actions pointing to lecture/page/concept

  ### **FR8 — Caching (24h TTL, Local-first)**

Cache validated outputs locally:

* outline  
* slideExplain  
* conceptModules  
* practice questions (optional)  
* diagnose/feedback (optional)

Cache key includes:  
`sessionId + lectureId + deckId + page/range + promptVersion + contentHash`

---

## **11\) Reliability & Observability (Verification Layer)**

### **VR1 — Schema Validation (Zod)**

Must validate:

* OutlineResponse  
* SlideExplainResponse  
* ConceptModulesResponse  
* LectureNotebook  
* PracticeQuestionsResponse (if used)  
* Diagnose/Feedback (if used)

  ### **VR2 — Repair Once**

If invalid JSON/schema mismatch:

* run one repair prompt forcing strict JSON

  ### **VR3 — Safe Fallback (No “fake high quality”)**

If repair fails/timeouts:

* return deterministic minimal object  
* `meta.source="fallback"`  
* UI must display a visible degraded warning \+ **Retry** button

  ### **VR4 — Meta (Must expose)**

Every API returns:

* `meta.source` \= `llm | cache | fallback`  
* `meta.latencyMs`  
* `meta.failStage` \= `timeout | parse | schema | repair`  
* `meta.validationErrors?` (optional)  
  ---

  ## **12\) API Spec (Minimal v1.2)**

  ### **`POST /api/outline`**

**Input**

* `courseTitle?`  
* `syllabusText` (required)  
  **Output**  
* `{ outline: LectureNode[], meta }`

  ### **`POST /api/slides/explain`**

**Input**

* `sessionId`  
* `lectureId`  
* `pages`: `{start,end}` or `number[]`  
* `chunks`: `{page, chunkId, text}[]`  
* `mode`: `"explain" | "keypoints" | "quiz"`  
  **Output**  
* `SlideExplain + meta`

  ### **`POST /api/concepts_v2` (or bundled with explain)**

**Input**

* `lectureId`  
* `slideExplain`  
  **Output**  
* `{ conceptModules: ConceptModule[], meta }`

  ### **`POST /api/practice` (optional)**

**Input**

* `lectureId`  
* `conceptId`  
* `conceptModule`  
  **Output**  
* `{ questions: PracticeQuestion[], meta }`  
  ---

  ## **13\) Data Model**

  ### **StudySession**

* `sessionId: string`  
* `courseTitle?: string`  
* `syllabusText: string`  
* `outline: LectureNode[]`  
* `createdAt: number`  
* `promptVersion: string`

  ### **LectureNode**

* `lectureId: string`  
* `week?: string`  
* `date?: string`  
* `title: string`  
* `topics: string[]`  
* `deliverables: string[]`  
* `readings: string[]`  
* `deckId?: string`

  ### **SlideExplain**

* `lectureId: string`  
* `deckId: string`  
* `pages: number[] | { start:number; end:number }`  
* `titleGuess?: string`  
* `keyPoints: string[]`  
* `whyItMatters: string[]`  
* `examAngles: string[]`  
* `commonMistakes: string[]`  
* `quickCheck: { question:string; choices?: string[]; answer:string; explanation:string }`  
* `citations: { page:number; chunkId:string; snippet?:string }[]`  
* `meta: Meta`

  ### **ConceptModule**

* `conceptId: string`  
* `lectureId: string`  
* `pageRef?: number | { start:number; end:number }`  
* `title: string`  
* `oneLiner: string`  
* `intuition: string[]`  
* `vividExample: string`  
* `miniMathOrPseudo?: string`  
* `commonTraps: string[]`  
* `quickCheck: { question:string; choices?: string[]; answer:string; explanation:string }`  
* `citations: { page:number; chunkId:string; snippet?:string }[]`  
* `meta: Meta`

  ### **LectureNotebook**

* `lectureId: string`  
* `cues: { id:string; text:string; source?: { conceptId?:string; page?:number } }[]`  
* `notes: { id:string; text:string; source?: { conceptId?:string; page?:number } }[]`  
* `summary: string`  
* `updatedAt: number`

  ### **Attempt**

* `attemptId: string`  
* `sessionId: string`  
* `lectureId: string`  
* `deckId?: string`  
* `page?: number`  
* `conceptId: string`  
* `answer: string`  
* `confidence: 1|2|3|4|5`  
* `createdAt: number`  
* `result?: { score?: number; notes?: string }`

  ### **Meta**

* `source: "llm" | "cache" | "fallback"`  
* `latencyMs?: number`  
* `failStage?: "timeout" | "parse" | "schema" | "repair"`  
* `validationErrors?: string[]`  
* `promptVersion?: string`  
  ---

  ## **14\) Performance & Constraints**

* Hard enforce range limit: **\<= 5 pages** per explain/OCR request.  
* Backend must never receive full PDFs; only page text/chunks.  
* Cache-first UX with skeleton loaders \+ retry UI.  
* Local-first persistence (IndexedDB for large text; localStorage for small metadata).  
* Cross-device sync is not required in v1.2.  
  ---

  ## **15\) Acceptance Criteria (Success)**

* End-to-end lecture loop works: Explain → Concept Modules → Add to Notebook → Practice  
* Every concept includes vividExample \+ quickCheck  
* UI displays meta.source; majority are `llm` or `cache`, not `fallback`  
* Vercel build passes; clean install; no dependency hacks  
* No “explain entire deck”; range cap enforced everywhere  
* StarField remains intact on `/` and `/ingest` only  
  ---

  ## **16\) Roadmap**

* **v1.2:** Lecture Workspace \+ L1 grounding \+ per-page OCR fallback  
* **v1.3:** Stronger Diagnose/Feedback \+ spaced repetition plan  
* **v2:** L2/L4 RAG (course-level indexing \+ verification)  
* ---

