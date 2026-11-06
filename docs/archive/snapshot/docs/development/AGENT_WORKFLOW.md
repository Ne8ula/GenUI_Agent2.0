# Development workflow

Retained owner preference: Astra orchestrates Claude Code through existing Model Gateway; Ruflo supplies optional coordination. This is separate from EVA's runtime and study conditions.

Read [AGENTS.md](../../AGENTS.md) and the short [current scope](../../PLANNING.md). Default assignments stay within the crime-scene replacement; do not attach historical plans, unrelated weeks, datasets or worktree dumps to worker briefs. Pass exact owned paths and only relevant dependencies; broader exploration requires a concrete dependency or owner request. Apply the central [Ponytail full rules](../../AGENTS.md#ponytail-smallest-complete-change) to planning, implementation and review; do not maintain separate copies of that policy per role. Existing definitions/settings and `scripts/agents/` remain. Configured aliases are not proof of current access/execution.

Astra owns decomposition/integration/verification. Existing definitions assign implementation to GPT-6 Astra at high effort, mechanical tasks to Luna, research to Terra, UI to Fable at high effort and independent review to Opus. Use available authorized routes and disclose substitutions; other harnesses must not pretend to invoke Claude-native definitions.

Keep small, coupled edits with the lead; delegate independent substantive work only when it reduces effort or supplies useful independent evidence. Give owned files, inputs, source revision, baseline or none, criteria and output, including the central Ponytail rules. Follow AGENTS.md's worker limit, including the scoped five-agent-total crime-scene exception; one writer per overlapping file. Parallel writers use isolated worktrees; read-only audits may share a checkout. Do not create a swarm, a new plan document or extra coordination machinery merely because a plugin is installed.

Ruflo routing is advisory; records do not prove inference. Invoke actual workers and distinguish configured from observed model identity. Retry once only for a transient route failure; otherwise report/reassign. Kimi remains an external handoff until a working authorized adapter is verified.

## Existing tooling and handoff

`scripts/agents/start-astra.ps1` launches the configured local workflow; `check-ruflo.mjs` checks coordination. Inspect contracts/diagnostics before use. Do not install routers, initialize/reset configuration, overwrite auth or stop shared services to complete ordinary work.

No bypassPermissions, automatic commit/push/merge, silent model override or API-key detour. Local credentials do not establish Cloud readiness.

Report task/phase/source revision; actual agent/model/tools; changed files; inputs/baseline; decisions; checks/evidence; next owner exercise. Keep the handoff concise and end with skipped/not-checked work and material risks. Documentation-only work uses diff, local-link and consistency checks; do not imply an application run. Broader changes retain AGENTS.md's domain-specific evidence requirements.

Every UI writer obeys the [fresh Weave gate](../design/FIGMA_WEAVE.md). A coordinator may supply the current scoped packet to Cloud without credentials or a new allowance. Old unattended Cloud prompts are retired. Historical setup/version evidence is in [Git recovery](../HISTORY.md), not asserted as current.
