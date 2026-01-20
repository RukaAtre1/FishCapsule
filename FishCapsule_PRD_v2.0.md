# FishCapsule PRD v2.0 — Agentic Study Notebook (革新版)

**Owner**: Junhao (Harley) Jia  
**Status**: Draft for implementation (Agent-ready)  
**Scope**: Slides/PDF 学习闭环（Explain → Quiz → Diagnose → Plan → Review）

---

## 0. One-liner
FishCapsule is an **agentic study notebook**：把任何 PDF/课件变成“按步骤引导的学习流程（guided study flow）”，用**小步生成 + 交互测验 + 错因诊断 + 复习计划**真正提升学习效率，而不是摘要复读。

---

## 1. Problem（痛点）
1) **交互缺失**：右侧输出虽然信息多，但用户是“看完就走”，没有持续操作与反馈。  
2) **超时/慢**：一次性生成大段内容或多页合并 → 模型推理慢、50s timeout、失败影响整包体验。  
3) **图表页无力**：PDF 提取文字不全，图表/坐标轴/标注信息丢失导致解释质量不稳定。  

---

## 2. Goals（目标）
### G1 体验目标（UX)
- 用户选中 **≤3–5 页**后，**10 秒内**看到 Step 1 的首条结果（per-page progressive）。
- 学习流程必须是“可点击推进”的：Step 1 完成后出现 **Next step**。
- Step 2 在后台预取（prefetch），用户点 Next 时“秒开”或短等待。

### G2 学习效果目标（Learning)
- 每次学习都形成闭环：**解释→例子→小测→错因→下一步计划→复习卡**。
- Quiz 必须带“错因标签（Barrier Tags）”：
  - 概念理解（Concept）
  - 计算/推导（Mechanics）
  - 题型迁移（Transfer）
  - 表达/写作（Communication）

### G3 工程目标（Reliability)
- **分步生成（step-by-step generation）**：每个 step 独立请求、独立缓存、独立重试。
- 任意 step 失败不影响已完成的 step；支持“Retry this step / Retry this page”。

---

## 3. Non-goals（非目标）
- v2.0 不做“整门课知识图谱自动构建”或“RAG 全量检索正确性证明”。
- 不追求一次输出大而全的讲义；优先短输出 + 可交互推进。

---

## 4. Core UX（核心交互）

### 4.1 Layout：Notebook UI（笔记本 UI）
保持左侧 PDF 阅读区，但整体 UI 变成“笔记本式排版”：
- 左侧：PDF/Slides Viewer（保持现有上传与选页）
- 右侧：**Study Notebook Panel**（按 Step 展示，像记事本/课堂笔记）
  - 顶部：Step progress（Step 1/4）+ 状态（Ready/Loading/Error）
  - 中部：内容（更大字号、更松行距）
  - 底部：按钮（Next step / Try quiz / I’m confused / Save / Retry）

### 4.2 Step Flow（四步闭环）
> **核心原则**：每一步短、可完成、可验收。

#### Step 1 — Explain Simply（通俗解释 + 生动例子）
- 输入：选中页（page range ≤3–5）
- 执行：**每页一个请求**（page-by-page）
- 输出：每页 3 段（严格短）
  - 通俗解释（Plain explanation）
  - 生活例子（Vivid example）
  - 一句话 takeaway
- UI：逐页出现 “Page 9 done ✅”

#### Step 2 — Synthesize（跨页整合总结）
- 触发：Step 1 至少完成 60% 即可启动预取
- 输入：Step 1 的短结果（不是原 PDF 文本）
- 输出：
  - 3 Key Ideas
  - 1 Common Confusion
  - 1 Exam Angle

#### Step 3 — Quiz（交互测验）
- 触发：用户点击 “Try Quiz” 或 “Next step”
- 输出：3–5 题（逐题 UI，1 题 1 屏）
- 每题：题目 + 选项/输入 + 正确答案 + 1 句解释

#### Step 4 — Diagnose & Plan（错因诊断 + 下一步计划）
- 输入：用户答题记录
- 输出：
  - Barrier Tag（Concept/Mechanics/Transfer/Communication）
  - 10 分钟补救动作（micro-task list）
  - 复习安排（Spaced review plan：1d/3d/7d）
  - “保存为 Cornell Notes（可选）”

---

## 5. OCR Upgrade（图表页增强：OCR 版）
### 5.1 为什么先 OCR 而不是 Vision
- OCR 发送给 LLM 的是文本，带宽小、成本可控；对“图表标题/坐标轴/标注”提升明显。

### 5.2 OCR Trigger Rules（只在需要时触发）
仅当满足任一条件才 OCR：
- `pageText.length < 200` 或明显“垃圾文本”
- 检测到 figure-heavy 信号（Figure/Plot/Axis/MSE/ROC 等关键词）
- 用户手动开启 “Explain figures”

### 5.3 处理链路
- 优先：Client-side OCR（浏览器 OCR）→ 后端只收 ocrText（最省后端）
- 备选：Server-side OCR（若前端不便）

---

## 6. Content Specs（输出规范，避免又长又慢）

### 6.1 Step 1 per-page JSON
```json
{
  "page": 9,
  "plain": "<=120 words",
  "example": "<=120 words",
  "takeaway": "<=20 words"
}
```

### 6.2 Step 2 JSON
```json
{
  "keyIdeas": ["...","...","..."],
  "commonConfusion": "...",
  "examAngle": "..."
}
```

### 6.3 Step 3 Quiz JSON
```json
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "prompt": "...",
      "choices": ["A","B","C","D"],
      "answer": "B",
      "why": "<=30 words",
      "tag": "Concept"
    }
  ]
}
```

### 6.4 Step 4 Diagnose JSON
```json
{
  "overallTag": "Transfer",
  "evidence": ["missed q2: ...", "..."],
  "microPlan": ["10-min task 1", "10-min task 2"],
  "reviewPlan": [{"in":"1d"},{"in":"3d"},{"in":"7d"}]
}
```

---

## 7. Performance & Reliability（速度与稳定性）

### 7.1 Timeouts
- 单页 Step 1：目标 8–15s；超时 25s（soft）/ 35s（hard）
- Step 2：目标 5–10s；超时 20s
- Quiz：目标 5–10s

### 7.2 Prefetch（后台预取）
- Step 1 完成 ≥60% → 自动 prefetch Step 2
- Step 2 ready → prefetch Quiz 题干（不生成长解析）
- Step 4 不预取（依赖用户答案）

### 7.3 Caching（缓存）
Cache Key：`fileHash + pageRange + stepId + promptVersion + ocrFlag`
- Step 1：按 page 缓存
- Step 2：按 selection 缓存
- Step 3：按 selection + difficulty 缓存

### 7.4 Observability（可观测性）
每个 API 响应必须带 `meta`：
```json
{
  "totalMs": 1234,
  "stages": {"extract": 120, "llm": 980, "parse": 50},
  "input": {"chars": 1200, "estTokens": 300},
  "llm": {"provider": "...", "model": "...", "attempts": 1, "timeoutMs": 35000},
  "cache": {"hit": false, "key": "..."}
}
```

---

## 8. Fonts & Typography（字体与排版：阅读优先）

### 8.1 设计原则
- 字号：正文 16–18px（默认），行高 1.6–1.8
- 段落宽度：Notebook panel 文本行宽控制（避免超长行）
- 颜色对比：深色背景需高对比，避免“太黑看不清”

### 8.2 字体推荐（可直接落地）
> 结论：没有“唯一最好的阅读字体”，需要在 UI/长文本/可访问性之间平衡。NNGroup 指出“最佳字体没有单一答案”，字体选择与读者/任务有关。

**默认 UI 字体（推荐）**：Inter  
- Inter 被设计为提升数字屏幕可读性（screen readability），适合 UI 和正文。

**无障碍阅读模式（可选）**：Atkinson Hyperlegible  
- 专为低视力读者提升易读性而设计（developed for low vision readers）。

**备选（偏工程/学术 UI）**：IBM Plex Sans  
- IBM Plex 是开源字体家族，强调 UI 环境使用（designed for UI environments）。

### 8.3 Implementation（Next.js / Tailwind）
- 默认：Inter（Next/font/google）
- 可切换：Atkinson Hyperlegible（Reading Mode toggle）
- 预留：IBM Plex Sans（设置里可选）

---

## 9. Functional Requirements（功能需求）

### FR1 PDF Upload & Page Selection
- 用户上传 PDF
- 支持选择 page range（最多 3–5 页）

### FR2 Study Flow Steps
- Step 1 per-page generate + progressive render
- Step 2 synthesize + prefetch
- Step 3 quiz + interactive answering
- Step 4 diagnose + micro-plan + review plan

### FR3 Notebook Saving
- 保存 Step 输出到 Notebook（按 lecture/pageRange 组织）
- Cornell Notes 一键生成并保存

### FR4 “I’m confused” intervention
- 按钮：I’m confused
- 系统先问 1 个诊断问题（卡在哪？概念/公式/题型/表达）
- 再给针对性解释与 1 个微练习

---

## 10. Acceptance Criteria（验收标准）

### AC1（速度）
- 选 1 页：Step 1 在 15s 内出结果（p50），35s 内不超时（p95）
- 选 3–5 页：右侧能逐页显示结果，不阻塞；任意页失败不影响已成功页

### AC2（交互）
- Step 1 完成后出现 Next step
- Step 2 支持预取：用户点 Next 时若 ready 直接展示
- Quiz 为逐题交互（至少 3 题）

### AC3（学习闭环）
- Quiz 后必须出现 Barrier Tag + micro-plan + review plan

### AC4（可观测）
- 每次生成都能在 meta 中看到 stages timing + token 估计 + cache hit

---

## 11. Implementation Checklist（给 Agent 的执行清单）

### Phase 1（先止血：timeout + progressive）
1) 把 explain 改为 **1 page = 1 request**（Step 1）
2) UI 逐页渲染 + 每页 retry
3) 加 meta timings（llm/parse/cache）

### Phase 2（学习闭环）
4) Step 2 synthesize（用 Step1 输出作为输入）
5) Step 3 quiz（逐题 UI）
6) Step 4 diagnose + micro-plan + spaced review

### Phase 3（Notebook UI + Fonts）
7) 右侧改为 notebook panel（更大字号/更松行距）
8) 字体：默认 Inter；加入 Reading Mode（Atkinson Hyperlegible）

### Phase 4（OCR 升级）
9) 加 OCR trigger + ocrText 接口字段
10) 仅对触发页启用 OCR

---

## 12. Open Questions（实现时可先默认）
- Quiz 类型：先 MCQ + short answer（默认 MCQ）
- Review Plan：先简单 1d/3d/7d，不做复杂算法
- OCR：优先前端 OCR；若不可行再做后端

---

## Appendix A — Suggested Prompts（短、结构化、稳）
> 所有 prompt 都要“短输出 + JSON + 失败可重试”。

### Step 1 Prompt（per-page）
- 目标：plain + example + takeaway（短）

### Step 2 Prompt（synthesize）
- 目标：3 ideas + 1 confusion + 1 exam angle（短）

### Step 3 Prompt（quiz）
- 目标：3–5 questions + tags（短）

### Step 4 Prompt（diagnose）
- 目标：overallTag + microPlan + reviewPlan（短）

