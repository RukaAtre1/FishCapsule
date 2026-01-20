# FishCapsule v2.0 Implementation Plan

## Goal Description
Implement PRD v2.0 improvements to fix readability and prevent Gemini free-tier rate-limit failures. Key features include intelligent model routing, batching Step 1 requests, client-side queuing, and UI readability enhancements.

## User Review Required
> [!IMPORTANT]
> - **API Change**: `POST /api/study/step1` will now accept an array of pages and return an array of results, replacing the per-page execution.
> - **UI Change**: Step 1 will skeleton-load all selected pages immediately and populate them on return.
> - **Model Router**: A new centralized router will manage model selection and fallbacks.

## Proposed Changes

### Core Infrastructure

#### [NEW] [modelRouter.ts](file:///c:/Users/Junhao/Desktop/FishCapsule/lib/ai/modelRouter.ts)
- Implement `selectModel(task, attempt)` returning model name.
- Implement `handleGeminiError(error, attempt)` logic for backoff/switching.
- Task configuration:
    - `step1_explain`: gemini-2.5-flash-lite -> gemini-2.5-flash -> gemini-3-flash
    - `step2_synthesize`: gemini-2.5-flash -> gemini-3-flash
    - `step3_quiz`: gemini-2.5-flash -> gemini-3-flash
    - `step4_diagnose`: gemini-2.5-flash -> gemini-3-flash

#### [MODIFY] [gemini.ts](file:///c:/Users/Junhao/Desktop/FishCapsule/lib/llm/gemini.ts)
- Integrate `modelRouter` for model selection and error handling loops.
- Add structured logging for routing decisions.

#### [NEW] [queue.ts](file:///c:/Users/Junhao/Desktop/FishCapsule/lib/utils/queue.ts)
- Simple async queue to limit concurrency (e.g., for retries or background fetches).

### API Layer

#### [MODIFY] [app/api/study/step1/route.ts](file:///c:/Users/Junhao/Desktop/FishCapsule/app/api/study/step1/route.ts)
- **Batch Processing**: Change input to accept `pages: []` and `pageTexts: {}`.
- **Logic**: 
    - Check cache for each page.
    - Identify missing pages.
    - Call Gemini with ALL missing pages in one prompt (or batched prompts if token limit concerns, but "1 request per selection" implies one prompt).
    - Return combined results: `[{ page, plain, example, takeaway }]`.
- **Caching**: Implement simple in-memory or file-based caching (or keep existing if present). *Note: PRD asks for local storage caching, which implies Client-side or Server-side. Prd says "Cache Step1 output in local storage (sessionId + lectureId + pageNumber + textHash)". This usually means Browser LocalStorage, but prompt says "Cache Step1 output in local storage... If user re-runs... do not call". I will implement Server-side caching for reliability if possible, or support the UI sending cached data.* 
    - *Correction*: "Cache Step1 output in local storage" likely means the Browser's `localStorage` or `IndexedDB`. The UI should check this before sending the request. I will implement the UI logic to filter out already-cached pages.

#### [MODIFY] [app/api/study/step2/route.ts](file:///c:/Users/Junhao/Desktop/FishCapsule/app/api/study/step2/route.ts)
- Update to use Model Router.

#### [MODIFY] [app/api/study/step3/route.ts](file:///c:/Users/Junhao/Desktop/FishCapsule/app/api/study/step3/route.ts)
- Update to use Model Router.

#### [MODIFY] [app/api/study/step4/route.ts](file:///c:/Users/Junhao/Desktop/FishCapsule/app/api/study/step4/route.ts)
- Update to use Model Router.

### UI / Frontend

#### [MODIFY] [StudyNotebookPanel.tsx](file:///c:/Users/Junhao/Desktop/FishCapsule/components/study/StudyNotebookPanel.tsx)
- **Step 1 Logic**:
    - Update `startStep1` to check `localStorage` first.
    - Send ONLY missing pages to API (batch).
    - Render skeleton cards immediately.
    - Update state with results.
- **Queue**: Use `lib/utils/queue` (or local equivalent) for Retries.
- **Styles**:
    - Increase `Takeaway` text contrast (light text on dark card).
    - "I'm confused" button: visible without hover, subtle glow, bottom-right fixed.
    - Typography: Increase base font size, use `Inter` or system-ui.

## Verification Plan

### Automated Tests
- Create a test script `scripts/test-model-router.ts` to simulate 429 errors and verify fallback switching.

### Manual Verification
1. **Step 1 Batching**: Select 3 pages -> Check Network tab (1 request) -> Verify 3 cards appear.
2. **Caching**: Refresh page -> Select same 3 pages -> Check Network tab (0 requests or instant return).
3. **Router Fallback**: Temporarily force a specific model to fail (mock) and verify switch to fallback.
4. **UI**: Check "Takeaway" readability and "I'm confused" visibility.
