# CI/CD setup

End-to-end pipeline:

```
PR pushed ───▶ CI tests ───▶ Vercel preview build ───▶ alias to demo.soravur.uz
                                                              │
                                                              └─▶ comment URLs on PR
PR closed ───▶ re-alias demo.soravur.uz back to latest production
push to main ─▶ CI tests ───▶ Vercel prod build (auto via Vercel git integration)
```

The workflow lives in `.github/workflows/ci.yml`. The build script is
`apps/web/build.sh`, referenced from the root `vercel.json`.

This document is the one-time setup checklist. Without it, the
workflow runs but the alias step will fail.

---

## 1. GitHub repository secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Where to find it |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create. Scope: full access. |
| `VERCEL_ORG_ID` | Vercel → Project → Settings → General → "Project ID" section shows Team/Org ID. |
| `VERCEL_PROJECT_ID` | Vercel → Project → Settings → General → Project ID. |

The token must belong to a user with deploy + alias permissions on the project.

---

## 2. Vercel environment variables

The atomic Convex+Next deploy in `build.sh` activates when
`CONVEX_DEPLOY_KEY` is present. Without it, `build.sh` falls back to a
plain Next build using whatever `NEXT_PUBLIC_CONVEX_URL` is configured
in Vercel — production keeps working, but PR previews share whatever
backend production uses (i.e. real prod data). Set the keys to flip
on per-PR Convex isolation.

In Vercel → Project → Settings → Environment Variables, add:

| Variable | Scope | Source |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | **Production** | Convex dashboard → Settings → Deploy Keys → "Generate Production Deploy Key" |
| `CONVEX_DEPLOY_KEY` | **Preview** | Convex dashboard → Settings → Deploy Keys → "Generate Preview Deploy Key" |

Once both are set, every Vercel build runs `convex deploy` first:
- Production builds → deploys backend to the production Convex project.
- Preview builds → spins up a fresh ephemeral Convex deployment per PR.

The Convex CLI auto-injects `NEXT_PUBLIC_CONVEX_URL` into the spawned
`next build`, so each Vercel deployment lands pointing at its own
backend. No manual URL plumbing.

After enabling, you can remove `NEXT_PUBLIC_CONVEX_URL` from Vercel
env (Convex CLI will overwrite it during build anyway).

---

## 3. DNS for demo.soravur.uz

Add a CNAME record at your DNS provider:

```
demo.soravur.uz   CNAME   cname.vercel-dns.com.
```

Then in Vercel → Project → Settings → Domains, add `demo.soravur.uz`.
Vercel verifies the CNAME, issues an SSL cert, and the alias step in
`ci.yml` can target it.

---

## 4. Branch protection

Go to **Settings → Branches → Add branch protection rule** for `main`:

- Require pull request reviews before merging (optional but recommended).
- Require status checks to pass before merging:
  - Required check: **`Test`** (the job name from `ci.yml`).
- Require branches to be up to date before merging.
- Do not allow bypassing the above settings.

This is what enforces "tests must pass before merge." The CI workflow
runs on every PR push; branch protection blocks merge until it's
green.

---

## 5. Convex production env vars

These live in Convex itself, not Vercel. Set from `packages/backend/`:

```bash
bunx convex env set OPENROUTER_API_KEY  sk-or-...    # required
bunx convex env set RESEND_API_KEY      re_...       # required for transactional email
bunx convex env set SITE_URL            https://soravur.uz
bunx convex env set NEXT_PUBLIC_SENTRY_DSN <dsn>     # optional
```

For preview deployments, Convex preview keys inherit env vars from the
dev deployment by default. Verify with `bunx convex env list` against
each preview as it spins up — the Convex dashboard shows preview
deployments under "Deployments → Preview".

---

## 6. Verify the pipeline

Open a throwaway PR with a trivial change. You should see:

1. **CI workflow starts** within seconds of the push.
2. **`Test` job** runs `bun install`, `check-types`, `test`, smoke build (~3–5 min).
3. **Vercel preview build** runs in parallel (independent of CI).
4. **`Alias preview to demo.soravur.uz` job** waits for Vercel preview to be `READY`, then aliases.
5. **PR comment** appears with both URLs (sticky — updates on each push).
6. **Close the PR.** The `cleanup` job re-aliases `demo.soravur.uz` back to the latest production deployment.

If step 4 times out: check that Vercel actually built the preview
(Vercel → Deployments). If the build failed, the alias is correctly
skipped — fix the build, push again, and the workflow re-runs.

---

## Cost notes

- **Vercel:** preview deployments are included on Pro tier. Hobby tier
  is rate-limited but workable for low-volume projects.
- **Convex:** preview deployments are billed per active deployment.
  They auto-expire on inactivity, so closed PRs do not keep accruing
  cost. Set `CONVEX_PREVIEW_DEPLOYMENT_LIMIT` in dashboard if you want
  hard caps.
- **GitHub Actions:** the `Test` job runs in 3–5 min on free
  `ubuntu-latest`. Public repos: free. Private repos: ~$0.04 per run
  on the standard plan.

---

## Failure modes & recovery

| Symptom | Diagnosis | Fix |
|---|---|---|
| Alias step says "Timed out waiting for Vercel preview" | Vercel preview build failed or didn't trigger | Check Vercel → Deployments for the SHA. If the build errored, fix the cause; if it never started, verify Vercel ↔ GitHub integration is enabled in the project. |
| Alias step says "VERCEL_TOKEN required" | Secret not set or expired | Re-create token in Vercel, update GitHub secret. |
| `bunx convex deploy` fails in Vercel build | `CONVEX_DEPLOY_KEY` missing or wrong scope | Re-generate the right key in Convex dashboard, update Vercel env. |
| `demo.soravur.uz` shows last-PR's preview after close | `cleanup` job ran before a production deploy existed | Trigger a manual prod redeploy, or re-run the cleanup workflow on the closed PR. |
| Preview points to prod Convex (data leakage) | `CONVEX_DEPLOY_KEY` not set on Vercel **Preview** scope | Set it; `build.sh` will start using `convex deploy` on the next preview build. |
