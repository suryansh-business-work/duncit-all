# CI pipeline: what runs, what is skipped, how to rerun

Every push to `staging`/`main` checks only what the change can reach, and
remembers what already passed so a red run does not cost a full re-run.

## How a run decides what to do

| Workflow | Selects work by | Remembers passes in |
| --- | --- | --- |
| Shared Gates (package suites) | `scripts/ci-affected.mjs plan --under packages/` | cache `ci-ledger-packages-<branch>-*` |
| Portals CI | `scripts/ci-affected.mjs plan --under portals/` | cache `ci-ledger-portals-<branch>-*` |
| Apps CI | `scripts/ci-affected.mjs plan --under app/` | — (two jobs, a few minutes) |
| Android / iOS Build | `plan --under app/mobile-app` + server `*.schema.ts` | — (no build when the app did not change) |
| SonarQube | `scripts/ci-affected.mjs hash` per coverage group | cache `coverage-<group>-<hash>` |
| deploy | `dorny/paths-filter` + `scripts/ci-deploy-gate.mjs gate` | cache `ci-ledger-deploy-<branch>-*` |

**Selection.** `plan` diffs HEAD against the last commit the same workflow
passed on the branch (a PR diffs against its base), and selects every workspace
whose files, or whose `@duncit/*` dependencies' files, changed. A root config
file (lockfile, `tsconfig.base.json`, …) or the workflow itself selects
everything.

**Checkpoint.** "Last green run" is one commit for the whole workflow, so on its
own, one red workspace made the fix commit re-check everything since that green
run. The ledgers fix that:

- Portals / packages: after each workspace passes, `<dir> <content key>` is
  recorded. The key covers the workspace's tree, its transitive `@duncit/*`
  deps, the root files and the workflow file. The next plan drops a selected
  workspace whose key is already recorded.
- Deploy: after the health check passes, each restarted service's input key is
  recorded as **live**. The key covers every file its paths-filter globs match,
  `deploy.yml`, and a one-way digest of the repository secrets and variables
  (rotate a secret and every service rebuilds). Only the latest live key per
  service counts, so a revert to older content still rebuilds.

A key never matches stale work: any change to source, a dependency, the
lockfile, root config, the workflow or a secret produces a new key.

**Retries.** Only network steps retry: image pushes and the remote redeploy
(`nick-fields/retry`), and the VPS file push (connection failures only, exit
255, with 10/20/40s backoff). Typecheck, lint, test and build failures are
deterministic and fail at once.

## After a red run

1. Read the failure: `gh run view <run-id> --log-failed`. A shard lists every
   workspace that failed at its end (`Failed: …`), not just the first.
2. **Code failure:** push the fix. The next run re-checks only the failed
   workspaces plus whatever the fix touches; deploy rebuilds only the services
   not already live with identical inputs.
3. **Transient failure, no code change** (runner lost, registry 429): use
   **Re-run failed jobs** on the run page, or
   `gh run rerun <run-id> --failed`. Successful jobs of that run are kept.

## Forcing a full, clean run

- **Any CI workflow:** run it with `workflow_dispatch` (Actions → the workflow →
  Run workflow). A manual run has no diff base and checks every workspace.
- **Deploy:** `workflow_dispatch` with `services: all` rebuilds and redeploys
  every image whatever the ledger says, and resets those services' ledger
  entries.
- **Discard a ledger** (e.g. after a manual change on the VPS outside CI):
  delete its caches, then the next run falls back to plain diff selection:

  ```sh
  gh cache list --key ci-ledger-deploy-staging-
  gh cache delete <id>        # or: gh cache delete --all
  ```

No extra secrets, variables or cache configuration are needed: ledgers live in
the repository's GitHub Actions cache (scoped per branch; a PR also reads its
base branch's ledger), and every script is dependency-free Node.
