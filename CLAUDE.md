# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Review this plan thoroughly before making any code changes. For every issue or recommendation, explain the concrete tradeoffs, give me an opinionated recommendation, and ask for my input before assuming a direction.
My engineering preferences (use these to guide your recommendations):

DRY is important—flag repetition aggressively.
Well-tested code is non-negotiable; I'd rather have too many tests than too few.
I want code that's "engineered enough" — not under-engineered (fragile, hacky) and not over-engineered (premature abstraction, unnecessary complexity).
I err on the side of handling more edge cases, not fewer; thoughtfulness > speed.
Bias toward explicit over clever.

1. Architecture review
   Evaluate:

Overall system design and component boundaries.
Dependency graph and coupling concerns.
Data flow patterns and potential bottlenecks.
Scaling characteristics and single points of failure.
Security architecture (auth, data access, API boundaries).

2. Code quality review
   Evaluate:

Code organization and module structure.
DRY violations—be aggressive here.
Error handling patterns and missing edge cases (call these out explicitly).
Technical debt hotspots.
Areas that are over-engineered or under-engineered relative to my preferences.

3. Test review
   Evaluate:

Test coverage gaps (unit, integration, e2e).
Test quality and assertion strength.
Missing edge case coverage—be thorough.
Untested failure modes and error paths.

4. Performance review
   Evaluate:

N+1 queries and database access patterns.
Memory-usage concerns.
Caching opportunities.
Slow or high-complexity code paths.

For each issue you find
For every specific issue (bug, smell, design concern, or risk):

Describe the problem concretely, with file and line references.
Present 2–3 options, including "do nothing" where that's reasonable.
For each option, specify: implementation effort, risk, impact on other code, and maintenance burden.
Give me your recommended option and why, mapped to my preferences above.
Then explicitly ask whether I agree or want to choose a different direction before proceeding.

Workflow and interaction

Do not assume my priorities on timeline or scale.
After each section, pause and ask for my feedback before moving on.

BEFORE YOU START:
Ask if I want one of two options:
1/ BIG CHANGE: Work through this interactively, one section at a time (Architecture → Code Quality → Tests → Performance) with at most 4 top issues in each section.
2/ SMALL CHANGE: Work through interactively ONE question per review section
FOR EACH STAGE OF REVIEW: output the explanation and pros and cons of each stage's questions AND your opinionated recommendation and why, and then use AskUserQuestion. Also NUMBER issues and then give LETTERS for options and when using AskUserQuestion make sure each option clearly labels the issue NUMBER and option LETTER so the user doesn't get confused. Make the recommended option always the 1st option.

## Stack

Bun + Turborepo monorepo. Next.js 16 (React 19.2, React Compiler on, `typedRoutes`) frontend + Convex reactive backend + Better-Auth. Tailwind v4, shadcn/ui (`new-york`, base `neutral`). LLM via OpenRouter. UI/system prompts are Uzbek-only.

## Layout

- `apps/web` — Next.js app (package name `web`).
- `packages/backend` — Convex functions/schema (`@soravur/backend`). Frontend imports types from `@soravur/backend/convex/_generated/api`.
- `packages/config` — shared `tsconfig.base.json` (`@soravur/config`).
- `models.json` (repo root) — single source of truth for model dropdown. Imported by `apps/web/src/components/model-selector.tsx`; the web client passes the chosen `openRouterModel` to `chat.generateAssistantReply`. The `DEFAULT_MODEL` constant in `packages/backend/convex/chat.ts` is only a fallback when the client sends no `model`. Adding/changing a model = edit `models.json` (and add an icon to `ICON_MAP` in `model-selector.tsx` if introducing a new icon key).

## Commands

Run from repo root unless noted. Package manager: bun (`packageManager: bun@1.3.3`).

- `bun install` — install (catalog deps live in root `package.json`).
- `bun run dev` — turbo dev across all packages (web + convex).
- `bun run dev:web` / `bun run dev:server` — single workspace.
- `bun run dev:setup` — `convex dev --configure --until-success` (first-time Convex project setup; creates `_generated/`).
- `bun run build` — turbo build all.
- `bun run check-types` — turbo type-check all (no separate `lint` task is wired beyond turbo's pass-through).
- Convex env: `bunx convex env set OPENROUTER_API_KEY ...` and `bunx convex env set SITE_URL ...` from `packages/backend/`. Web needs `NEXT_PUBLIC_CONVEX_URL`.
- No test runner is configured.

## Backend architecture (Convex)

Schema (`packages/backend/convex/schema.ts`): `users` (linked to auth via `authSubject`), `threads` (`isArchived` is a soft-archive flag), `messages` (`role` ∈ user/assistant/system, optional `tokenUsage`), `rateLimits`, `usageEvents`.

Auth (`auth.ts`) uses `@convex-dev/better-auth` with email+password (no verification). `users.ensureCurrentUserProfile` is the canonical way to materialize a profile from `ctx.auth.getUserIdentity()`; call it before any mutation that needs a `users._id`.

Chat pipeline (`chat.ts` → `generateAssistantReply` action):
1. Verify thread ownership against `users._id`.
2. `rateLimits.checkAndIncrement` enforces `REQUESTS_PER_MINUTE_LIMIT = 12` per user (fixed window).
3. Reject non-Uzbek input via `isLikelyUzbek` (heuristic in `openrouter.ts`) with a canned Uzbek reply.
4. Reject cheating queries via `CHEATING_KEYWORDS` substring match.
5. Send last `MAX_CONTEXT_MESSAGES = 20` to OpenRouter with `buildSystemPrompt()`.
6. If model output fails `isLikelyUzbek`, retry once with a stronger system message, lower temperature.
7. Persist via `messages.appendAssistantMessage`, log to `usageEvents`, and auto-title thread from first user message (first 50 chars).

OpenRouter client (`openrouter.ts`) is a hand-written `fetch` wrapper with 60s `AbortController` timeout and `HTTP-Referer`/`X-Title` headers — no SDK dependency.

HTTP routes (`http.ts`) expose REST mirrors of the chat flow at `POST /api/threads`, `POST /api/threads/:id/messages`, `GET /api/threads/:id/messages`, with hand-rolled CORS (`SITE_URL`-aware) and auth via `ctx.auth.getUserIdentity()`. Auth routes are registered last via `authComponent.registerRoutes`.

## Frontend architecture (apps/web)

`apps/web/src/app/page.tsx` is the single-page shell: `Authenticated` renders `<ChatInterface>` with the selected model; `Unauthenticated` renders sign-in/up. `Providers` (`components/providers.tsx`) wires `ConvexBetterAuthProvider`, `ThemeProvider` (next-themes), and Sonner.

Markdown rendering uses `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` (KaTeX CSS imported in `layout.tsx`). PWA manifest + SVG icons live in `apps/web/public/`.

Path alias: `@/*` → `apps/web/src/*`. The web `tsconfig.json` explicitly includes `../../models.json` so the JSON import in `model-selector.tsx` type-checks.

## Conventions / gotchas

- **Convex codegen**: `_generated/` (in `packages/backend/convex/`) is produced by `bunx convex dev`. If imports from `@soravur/backend/convex/_generated/api` fail, run convex dev first — don't edit generated files.
- **Catalog versions**: `convex`, `better-auth`, `@convex-dev/better-auth`, `dotenv`, `zod`, `typescript` are pinned via the workspace catalog in root `package.json`. Bump them there, not in individual `package.json`s (use `"catalog:"`).
- **Bun isolated linker** (`bunfig.toml`): node_modules are isolated per workspace; expect symlinked layouts.
- **Uzbek-only invariant**: both `isLikelyUzbek` (heuristic) and the system prompt enforce Uzbek output. New user-facing strings, error messages, and prompt edits must stay in Uzbek; otherwise the retry loop in `chat.ts` fires or the heuristic blocks legitimate input.
- **Vercel build**: `vercel.json` runs `cd ../.. && bun run build` from the web app's directory — keep root-level `turbo build` working for deploys.
- **README port mismatch**: README says `localhost:3001`; `next dev` default is `:3000` (matches `SETUP.md`). Trust the actual `next dev` output.
- **Stale doc**: `SETUP.md` references `meta-llama/llama-3.2-3b-instruct:free` as default — current setup uses `models.json` (deepseek by default). Treat `models.json` as authoritative.
