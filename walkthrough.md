# FishCapsule v2.0 Walkthrough

This update focuses on **Reliability**, **Cost Efficiency**, and **Readability**.

## Changes Made

### 1. Intelligent Model Router
Added a centralized [modelRouter.ts](file:///c:/Users/Junhao/Desktop/FishCapsule/lib/ai/modelRouter.ts) that:
- Selects models based on task priority (Explain, Synthesize, Quiz, Diagnose).
- Automatically handles **429 Rate Limits** by switching to fallback models (e.g., Flash Lite -> Flash -> Pro).
- Implements exponential backoff with jitter.

### 2. Batch Step 1 API
Refactored Step 1 from "1 request per page" to **"1 request per selection"**.
- [app/api/study/step1/route.ts](file:///c:/Users/Junhao/Desktop/FishCapsule/app/api/study/step1/route.ts) now processes multiple pages in a single LLM prompt.
- Reduces API request count by up to 80% for typical selections.
- Client-side caching in `localStorage` prevents redundant requests for previously explained pages.

### 3. Quota-Safe Request Queue
Implemented [queue.ts](file:///c:/Users/Junhao/Desktop/FishCapsule/lib/utils/queue.ts) to manage concurrent requests.
- Concurrency limited to 2 to prevent burst rate-limit triggers.
- Integrated into the Study Notebook UI for robust background processing.

### 4. UI Readability & UX
- **Typography**: Increased base font size and adjusted line-height for better readability in the [StudyNotebookPanel.tsx](file:///c:/Users/Junhao/Desktop/FishCapsule/components/study/StudyNotebookPanel.tsx).
- **Contrast**: The "Takeaway" cards now use high-contrast text on dark backgrounds to meet accessibility standards.
- **"I'm confused"**: The button is now fixed in the bottom-right with a subtle glow for easy discovery.
- **Progressive Rendering**: Skeleton loaders show immediately for batch requests, with content filling in once the single consolidated response returns.

---

## How to Test Checklist

### 1. Batch API & Caching
- [ ] Select 3 pages in the PDF viewer.
- [ ] Direct your attention to the **Network Tab**.
- [ ] Click "Explain" (or let auto-start run).
- [ ] **Verify**: Only 1 request to `/api/study/step1` is made.
- [ ] **Verify**: 3 cards populate simultaneously (or sequentially if you check state updates).
- [ ] Refresh the page and select the SAME 3 pages.
- [ ] **Verify**: Data appears instantly from `localStorage` with 0 network requests to Step 1.

### 2. Model Routing (Observability)
- [ ] Check Terminal/Server logs.
- [ ] **Verify**: Logs show `[Gemini] Task="step1_explain" Attempt=1 Model="gemini-2.5-flash-lite"`.
- [ ] If a 429 occurs, verify the log shows switching to `gemini-2.5-flash`.

### 3. Readability
- [ ] Look at the "Takeaway" section.
- [ ] **Verify**: Text is clearly readable (near-white vs dark card).
- [ ] **Verify**: "I'm confused" button is visible and has a cyan glow.

### 4. Practice Loop
- [ ] Complete Step 1 -> Step 2 -> Step 3.
- [ ] Answer the quiz questions.
- [ ] **Verify**: Step 4 provides a "Barrier Tag" and a "10-Minute Action Plan".
