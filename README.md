# EVA future demos

A lean workspace for EVA's complete fictional text-to-world installation, built through incremental demos.

Start with [the current brief](PLANNING.md). [AGENTS.md](AGENTS.md) defines the owner-approved task-only workflow. Historical work remains available through [the archive](docs/archive/README.md), but agents should not load it by default.

## Contents

- `src/room/verified-mesh.ts` — unchanged bounded, hash-checked asset loader from the previous app.
- `tests/verified-mesh.test.ts` — its unchanged focused tests.
- `package.json` / `package-lock.json` — existing React/Three.js web toolchain, with obsolete routes, launchers and mandatory Rust-build hooks removed. No new dependency versions selected.
- `.claude/agents/` — retained development roles/model aliases, with the new lightweight workflow. Aliases are configuration, not evidence of model access.
- `docs/archive/` — preserved written documentation, provenance manifest and recovery notes.

There is no demo UI yet. Workspace creation did not implement any roadmap increment. No `dev` or `build` script points at a removed historical app.

## Checks

Node.js >=22.18 is required. `npm test` runs the self-contained loader tests without installing dependencies. After an approved dependency installation, `npm run typecheck` checks the retained source and `npm run check` runs both checks. No install, browser download or model setup is implied by this README.

## Git and storage status

This separate local clone is on `future-demos`, based on `334482aecfba8c23d9428dd59d61c6bfa60c203d`. Changes are prepared locally, not committed or pushed. The original `GenUI_Agent` checkout and its unsaved work are untouched.

**Do not delete or move the original checkout yet.** This clone uses Git alternates to share its object database and avoid duplicating approximately 6.5 GiB of history. It is not an independent backup. No old disk usage has been reclaimed and remote completeness has not been verified. Do not prune shared history as a cleanup shortcut.

Next storage step, only when separately authorized: verify/preserve all unique branches, worktrees and non-Git originals; commit and push the reviewed future branch; test recovery; then create an independent shallow, single-branch clone from the remote. Only afterward remove individually approved old local copies. Never blanket-delete ignored sources or assume a branch preserves untracked files.
