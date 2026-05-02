#!/usr/bin/env bash
# Vercel build entry. Two paths:
#
# 1. CONVEX_DEPLOY_KEY is set (recommended):
#    Run `convex deploy --cmd ...` from packages/backend. The Convex CLI
#    deploys backend (production deploy on main, preview deploy on PRs)
#    and injects NEXT_PUBLIC_CONVEX_URL into the spawned build, so each
#    deployment ships pointing at its own backend.
#
# 2. CONVEX_DEPLOY_KEY is unset (fallback):
#    Plain Next build using whatever NEXT_PUBLIC_CONVEX_URL is set in
#    Vercel env. Production keeps working pre-migration; previews share
#    that backend until the env var is configured.
#
# This conditional exists so adopting the per-PR Convex preview pattern
# is a Vercel-env change, not a code change — flip the switch and it
# starts working.

set -euo pipefail

if [ -n "${CONVEX_DEPLOY_KEY:-}" ]; then
  echo "→ CONVEX_DEPLOY_KEY detected — atomic Convex + Next build"
  cd ../../packages/backend
  exec bunx convex deploy --cmd 'cd ../../apps/web && bun run build'
fi

echo "→ CONVEX_DEPLOY_KEY not set — plain Next build (no backend deploy)"
cd ../..
exec bun run build
