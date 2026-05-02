#!/usr/bin/env bash
# Vercel build entry — runs from the project Root Directory (apps/web).
#
# Two paths:
#
#   1. CONVEX_DEPLOY_KEY is set in Vercel env (recommended for prod):
#      Run `convex deploy --cmd ...` from packages/backend. The Convex
#      CLI deploys the backend (production deployment when on main,
#      preview deployment when on a PR branch if a Preview Deploy Key
#      is set) and injects NEXT_PUBLIC_CONVEX_URL into the spawned
#      build. Backend + frontend deploy atomically.
#
#   2. CONVEX_DEPLOY_KEY is unset (fallback):
#      Plain Next build using whatever NEXT_PUBLIC_CONVEX_URL is set
#      directly in Vercel env. Production keeps building even if the
#      deploy key was never configured — no auto-deploy of backend,
#      but no breakage either.
#
# Adopting auto-deploy = add CONVEX_DEPLOY_KEY in Vercel env. Removing
# it = unset that var. No code change needed either way.

set -euo pipefail

if [ -n "${CONVEX_DEPLOY_KEY:-}" ]; then
  echo "→ CONVEX_DEPLOY_KEY detected — atomic Convex + Next build"
  cd ../../packages/backend
  exec bunx convex deploy --cmd 'cd ../../apps/web && bun run build'
fi

echo "→ CONVEX_DEPLOY_KEY not set — plain Next build (no backend deploy)"
cd ../..
exec bun run build
