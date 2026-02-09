# FishCapsule Upgrade PRD (v2.4) — Gemini 3 Hackathon Edition

## 0. 一句话目标

用 **Gemini 3 Flash（主力）+ Gemini 3 Pro（关键步骤）**，把 FishCapsule 升级成一个**带证据、可测量、可个性化、可多模态**的学习闭环：
**Learn → Test → Diagnose → Fix → Review → Improve**

---

## 1) 背景与问题

### 当前版本优势

* 已有学习闭环：Explain → Synthesize → Quiz → Diagnose → Plan → Review
* 有 Cornell Cards / Cloze / Mistake Bank / Today Review 的雏形
* 你已部署到 Vercel，有可交互 demo

### 当前瓶颈（评委会挑的点）

1. **信任与可验证不足**：内容是否来自原文？证据覆盖率如何？
2. **评估不够硬**：缺少可量化的学习增益/复习效果指标（至少是"系统层"指标）
3. **多模态不足**：对 slide PDF 的图表/公式页支持弱（这正是 Gemini 的卖点）
4. **个性化不够闭环**：错因诊断有了，但没有强制地驱动下一次学习内容与题目难度

---

## 2) 目标（Hackathon "赢点"）

### Must-have（提交前必须做）

* **Evidence-grounded Notes（带证据的笔记）**：每条要点附 page + snippet（可折叠）
* **Evaluation Dashboard（最小评估面板）**：展示学习闭环指标（quiz correct rate、review retention、time-to-first-result、evidence coverage）
* **Gemini 3 模型策略**：Flash 负责速度，Pro 负责高难验证/改写/评分

### Nice-to-have（加分项）

* **Vision for Slides**：对"公式/图表/表格页"进行解释 + 生成题目
* **Auto Study Plan**：根据 barrier tags 自动生成下一步微课程（10min fix kit）+ 下次复习任务队列

---

## 3) 用户故事（User Stories）

### U1：考试冲刺用户（你自己就是 persona）

* 作为学生，我上传 lecture slides，希望快速得到：

  1. 本章核心概念（含证据）
  2. 一套最可能考的题（含错因诊断）
  3. 今日复习清单（让我今晚能复习完）

### U2：评委体验用户（无背景）

* 作为评委，我点开 demo，希望 60 秒内看到：

  * 一个 PDF → 有证据的要点
  * 立即测验 → 自动诊断
  * 有一个"可视化指标"证明系统不是瞎编

---

## 4) 功能需求（FRD）

## 4.1 Evidence-grounded Notes（证据锚定）

**功能描述**
每条 Cornell Notes 的 "Key Point" 都需要绑定证据：

* `page`: number
* `evidence_snippet`: ≤ 240 chars
* `evidence_confidence`: 0–1（模型自估）
* `source_type`: text | table | figure | formula

**交互**

* UI 默认只显示 key points
* 点击 "Show evidence" 展开 snippet + page
* 支持 "jump to page" 或 "highlight section"（如果你已有 PDF viewer）

**验收标准**

* 每页至少 70% key points 有 evidence（coverage ≥ 0.7）
* snippet 必须来自原文/OCR（不能凭空编）
* 生成延迟：P95 < 10s（Flash 主跑）

**模型策略**

* Gemini 3 Flash：生成 notes + 初版 evidence
* Gemini 3 Pro：抽检/修复 evidence（仅对低置信度点触发）

---

## 4.2 Slide Vision Mode（图表/公式页理解）【加分】

**功能描述**
对 "非纯文本页" 做专门处理：

* 识别 page type：text-heavy / figure / table / formula
* 输出 "What the figure shows" + "Common exam questions"
* 生成 3 道题：1 conceptual + 1 computation + 1 interpretation

**验收标准**

* 在包含图/表/公式的页上，能输出合理解释与题目（人工 spot check）

**模型策略**

* Gemini 3 Pro：多模态理解（用在少量页，控制成本）
* Flash：题目改写、答案格式化、解释简化

---

## 4.3 Quiz Grader + Barrier Diagnosis 2.0（评分与诊断升级）

**功能描述**

* 支持短答自动评分（rubric-based）
* 输出 barrier tags：Concept / Mechanics / Transfer / Communication
* 给出 "10-min Fix Kit"：3 个微任务 + 1 个 mini quiz

**验收标准**

* 评分输出稳定（同一答案重复评估一致）
* 诊断结果能驱动下一轮练习题生成（闭环）

**模型策略**

* Flash：大部分评分 + 诊断
* Pro：对 borderline answers / 多解题目做仲裁

---

## 4.4 Evaluation Dashboard（最小可展示指标）

**展示指标（必须有）**

* **Evidence Coverage**：有 evidence 的 key points / 总 key points
* **Quiz Accuracy**：本次 quiz 正确率
* **Review Retention**：Today Review 正确率（或 mock）
* **Latency**：TTFR (time-to-first-result) P50/P95
* **LLM Reliability**：fallback 次数、timeout 次数

**数据来源**

* 本地事件埋点（localStorage 或轻量 DB）
* 每次生成写入 session log（JSON）

**验收标准**

* 评委在 60 秒内能看到 dashboard
* 指标自动更新，非手写截图

---

## 5) 非功能需求（NFR）

* **安全**：API key 只在 server 端；前端不出现 key
* **稳定**：429/timeout 有 retry + backoff + fallback
* **成本控制**：默认 Flash；Pro 只在"需要高质量"处触发（抽检/多模态页/仲裁）
* **速度**：首屏 3–5 秒出结果（可先出 skeleton + 逐步加载）

---

## 6) 技术方案（实现级别）

### 6.1 API 结构（建议）

* `POST /api/ingest`：解析 PDF → pages（文本 + 可选图片）
* `POST /api/notes`：notes + evidence（Flash）
* `POST /api/verify`：低置信度点的 evidence 修复（Pro）
* `POST /api/quiz`：生成题目（Flash）
* `POST /api/grade`：评分 + barrier + fix kit（Flash/Pro）
* `GET /api/metrics`：拉取 session 指标

### 6.2 数据结构（核心 JSON）

* `NotePoint { text, page, evidence_snippet, confidence, source_type }`
* `QuizItem { question, choices?, answer, rationale, linked_concepts, difficulty }`
* `Attempt { quizItemId, userAnswer, correct, barrierTags, timestamp }`

---

## 7) 里程碑（4 小时冲刺版）

### M0（30 min）

* 把模型参数切换成 **Gemini 3 Flash**（至少 notes/quiz 一条链）
* README 与 Devpost 文案更新 "Gemini 3 used"

### M1（1.5h）

* Evidence-grounded notes：key points + page + snippet UI
* 计算 coverage 指标并展示

### M2（1h）

* Dashboard：accuracy + retention + latency（哪怕 localStorage）
* 埋点：step_start/step_done/step_fail + latency_ms

### M3（1h）

* 短答评分 + barrier + fix kit（至少在一个页面链路跑通）
* Demo 视频录屏 90 秒

（可选 M4：Vision mode 只做 1 页公式/图表的 showcase）

---

## 8) Devpost 写法（评委看得懂）

一句话亮点：

* "FishCapsule turns PDFs into a measurable learning loop with grounded evidence and automated diagnosis—powered by Gemini 3 Flash/Pro."

必须展示：

* 证据 snippet
* quiz → diagnosis → review task
* dashboard 指标
