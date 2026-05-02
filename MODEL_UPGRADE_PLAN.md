# Three quality axes

DeepSeek-only caps you. But "swap models" alone gives ~20% lift. Real improvement stacks **three layers** — each multiplies the next:

1. **Model layer** — substrate + reasoning depth
2. **Context layer** — what you tell it (prompts, examples, retrieval)
3. **Eval layer** — measure, or fly blind

Without layer 2, better model + bad prompt = mediocre. Without layer 3, you can't tell if any change actually helped — you'll iterate on vibes.

Also worth flagging upfront: backend currently doesn't know which subject the user picked. `chat.ts:160` calls a generic `buildSystemPrompt()` regardless. Most options below assume we plumb `subject: ModelType` through `generateAssistantReply` — small change, ~10 min.

---

## Layer 1 — Model

DeepSeek-V3.2 strengths: cheap (~$0.14/$0.28 Mtok), fast, decent multilingual, 128k context.
DeepSeek-V3.2 weaknesses for this product:
- **Uzbek literary canon** — hallucinates Cho‘lpon/Navoiy quotes confidently. Cohere Aya Expanse + Claude + Gemini have notably better Uzbek factual grounding.
- **Multi-step math** — non-reasoning models lose on chains >5 steps. R1, o4-mini, Gemini-2.5-Pro thinking dominate.
- **Hallucination resistance** — Anthropic family ships fewer fabrications under uncertainty.

Options (issue **1**):

- **1A. Subject-routed models** *(recommended)* — `models.json` already abstracts per subject. Point each at best-of-class:
  - maths → `deepseek/deepseek-r1` or `openai/o4-mini`
  - literature → `anthropic/claude-sonnet-4.5` or `google/gemini-2.5-pro`
  - programming → keep DeepSeek (competitive) or Claude
  - **Effort:** 1 hr. **Cost:** ~3–5× DeepSeek on lit, ~2–4× on math reasoning. Per-token, still cents per session.
- **1B. Cascade** — cheap first, escalate on low confidence or long math. Saves cost but added latency. Half day.
- **1C. Reasoning-only for math** — every math query → R1/o4-mini regardless. Strong, simple. Subset of 1A.
- **1D. Ensemble verifier** — model B critiques model A, A revises. Doubles cost, modest lift. Skip until evals demand.

## Layer 2 — Context

Currently: one generic Uzbek system prompt for all subjects, no retrieval, no few-shot.

Options (issue **2**):

- **2A. Subject-specific system prompts** *(recommended, free)* — three prompts:
  - **maths**: derivation in steps, units, sanity check, alt-method, LaTeX strict
  - **literature**: cite work + author verbatim, **NEVER fabricate quotes**, distinguish primary text from interpretation, list canonical Uzbek authors with correct spelling
  - **programming**: runnable example, time/space complexity, common pitfalls, language version
  - **Effort:** 2–3 hr. Free at runtime.
- **2B. Few-shot per subject** *(recommended)* — 1–2 hand-crafted Uzbek Q→A pairs embedded in each system prompt. Most underused output-quality lever; anchors model on style + depth. ~1 day.
- **2C. Anti-hallucination directive** — explicit "manba aniq emas bo‘lsa, tan oling, taxminga asoslanmang." Critical for literature. Free.
- **2D. Curriculum RAG** — embed Uzbek 5-11 sinf textbooks + DTM (Davlat test markazi) bank → retrieve top-k per query → inject into prompt. **The actual moat.** Eliminates literature hallucinations, grounds answers in what students will actually be tested on. **Effort:** 1–2 weeks for v0; start with literature corpus only (highest hallucination cost).
- **2E. Tool use — Python for math** — model writes code, server runs sandboxed, model uses verified result. Kills arithmetic errors. **Effort:** 3–4 days; need to handle tool-roundtrip inside the streaming pipeline.
- **2F. Tool use — web search** — for "qachon", "kim" factual queries. OpenRouter supports it natively. 1 day.
- **2G. Pedagogical scaffold** — force structure: concept summary → step solve → common mistakes → 2 practice questions for active recall. Free, fits in prompt.

## Layer 3 — Eval

Currently: **zero**. Every prompt change is shipped on hope.

Options (issue **3**):

- **3A. Golden eval set** *(recommended, do this first)* — 50 Uzbek questions across 3 subjects with reference answers. Script runs current model+prompt against set, diffs vs reference. Lock it before/after every prompt or model change. **Effort:** 1 day to assemble.
- **3B. LLM-as-judge** — Claude/GPT-4 grades sample of prod responses on (correctness, Uzbek fluency, pedagogy). Half day; catches drift in production.
- **3C. User thumbs up/down** *(recommended)* — DB column on `messages` + UI button + weekly review query. Data compounds — after a month you'll know which subject prompt is weakest. Half day.

---

# Recommended sequence

**Week 1 — Cheap wins (2–3 days work, no infra):**
1. **3A** first — 50-question eval set. Baseline number. Without it, "did this help?" is unanswerable.
2. **2A + 2B + 2C** — split system prompts, embed few-shot, add anti-hallucination. Plumb `subject` through `generateAssistantReply`. **Biggest single quality jump, $0 runtime cost.**
3. **1A** — repoint `models.json`: literature → Claude/Gemini, maths → R1 or o4-mini, programming → keep DeepSeek.
4. **3C** — thumbs up/down. Ships data forever.

**Week 2–3 — If eval numbers justify:**
5. **2G** — pedagogical scaffold (only if eval shows answers feel "shallow")
6. **2D** — literature RAG corpus (only if hallucinations remain top complaint)
7. **2E** — Python tool for maths (only if arithmetic errors persist after 1A)

**Skip unless evidence demands:** 1B cascade, 1D ensemble, 3B auto-judge, 2F web search.

---

# Question

Three honest starting paths. Per CLAUDE.md, picking one option per issue:

**A. Eval-first (issue 3A)** *(my recommendation)* — slower start, but every later change becomes measurable. Without it, 1A and 2A are guesses dressed as engineering.

**B. Prompt overhaul (issue 2A+2B+2C)** — fastest visible jump, zero infra. Risk: you ship it, "feels better", but no proof.

**C. Model routing (issue 1A)** — quickest pure config change, but ceiling-bound by current generic prompt.

I'd do **A → B → C** in that order across week 1. They compound.

Which do you want to start with — and should I treat this as a BIG CHANGE (full week-1 rollout, multi-commit) or SMALL CHANGE (just the first issue you pick)?
