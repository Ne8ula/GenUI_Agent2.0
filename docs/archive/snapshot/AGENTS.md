# Working on EVA

## Scope and reading order

Default scope is the **crime-scene reconstruction replacement**, selected 2026-10-28: Argus scenes, Kimodo user-requested motion, evaluated complete hypothesis objects and the retained Arkham detective/matrix aesthetic. Start with the short [current plan](PLANNING.md), then only assigned implementation, callers and tests. Read [DESIGN.md](DESIGN.md) and the Weave policy for visual work; broader research only when assigned.

Do not load other weeks, bedroom/Hypersim/upload-room experiments, old reconstruction plans, archived ledgers, other worktrees or `.local` datasets by default. Scope searches to the task's directories. Follow an actual shared dependency when necessary and state why; the owner can explicitly request any other area. This is a context/navigation boundary, not a file-access restriction or permission to weaken repository-wide checks.

The 2026-10-28 cleanup authorizes removal of **superseded crime-scene implementation and generated candidates only**, preserving original photos/scans, provenance and failed-run receipts. Inspect exact targets, preserve concurrent work, and migrate active callers/catalog entries/tests before deleting dependencies. Older all-weeks cleanup authorization was historical and does not apply to this replacement. [History](docs/HISTORY.md) and [prior planning](PLANNING_HISTORY.md) are reference-only, not active instructions.

The retained React/TypeScript/Three.js application is in `week4/`; root commands target it. Preserve useful shared infrastructure without treating old workflows as alternatives to the selected replacement. No model integration or new demo is complete until evidenced. Cleanup does not authorize generation, model downloads, installation, paid execution, studies or phase advancement.

## Research ownership

Track A is upstream video-model research; Track B supplies revision mechanisms; Track C is EVA's primary focus, combining System B reconstruction and System C expressive spatial experience. Track and System labels are distinct.

Shado owns Steps 1?5 and its model/geometric-learning paper. EVA owns Steps 6?7 and an HCI paper about understanding, exploration and evidence interpretation. Captured-photo reconstruction is a direct input route; Shado is optional upstream input. Human benefit from Shado requires independent upstream evidence and matched C-E6 evaluation.

Source-derived images, authored geometry/depth, scan-like points and Gaussian sprites are not multiview reconstruction or trained 3DGS. Distinguish source evidence, inference, generated completion, artistic treatment, user memory and unknowns.

## Ponytail: smallest complete change

Use Ponytail **full** as the default development approach unless the owner selects another level or asks for normal mode. This governs how work is solved, not EVA's runtime behavior or permission model. The rules below work even when the plugin is unavailable; never claim a skill ran unless it did.

- Before editing, map the affected implementation, callers, tests, fixtures, config and exports. Identify compatibility, data-loss and exposure risks. For bug fixes, search every caller and fix the shared root cause.
- Choose the first complete solution: omit unrequested work; reuse the project's existing helper/component/pattern; use the standard library or platform; use an installed dependency; then write the minimum readable new code needed. Prefer a house component over a new native replacement. Do not add a dependency for a few lines.
- No speculative abstractions, wrappers, options, configuration or "for later" code. Preserve the surrounding layers, naming and idiom. Prefer deletion when safe, but never delete retained evidence or concurrent work to shorten a diff.
- Finish all affected callers, tests and fixtures. Preserve error handling and validation when moving or merging code. For equally small solutions, choose the one correct on edge cases; a cryptic one-liner is not simpler.
- New non-trivial logic needs a focused test or assert-based self-check. Trivial edits need no ceremonial test, but still require relevant verification. Comment only non-obvious reasons; label a bounded shortcut `shortcut: <the limit>, <when to upgrade>`.
- Never trade away requested behavior, trust-boundary validation, data-loss protection, security, accessibility or required hardware calibration. Ponytail does not waive visual prerequisites, provenance, acceptance, authorization or finite spending limits.

## Working loop and acceptance

1. Inspect git status/diff, instructions, actual source and relevant acceptance; read only what the task needs after the required scope documents.
2. State bounded scope, affected files and evidence criteria. Use the shortest plan that covers the work; continue routine authorized work without repeated permission requests.
3. Preserve concurrent edits. Recheck exact files before editing. Do not reset, stash, clean, switch the shared branch, overwrite others' work, commit or publish without explicit instruction.
4. Make the smallest complete change and verify through actual tools. Start with focused checks and expand when affected contracts require it; distinguish passed, failed, blocked and not-run checks.
5. Deliver a concise account of changed files, decisions, evidence and the next owner exercise. End with one or two lines naming skipped/not-checked work and any material risk.

Documentation uses diff, local-link and consistency checks, not fabricated application evidence. UI needs matching captures, keyboard/focus/touch, reduced effects, interruption and continuity checks. Protocol/policy needs rejection, resource, provenance, cancellation and authority tests. Native/performance claims require actual platform runs and measurements.

Every major phase needs explicit owner acceptance against a reproducible tested revision. Record scope/revision, scenario/commands, expected/actual results, evidence, limitations, feedback/blockers and decision/date under `docs/design/acceptance/`; pending is default. The [R18 acceptance](week4/docs/design/acceptance/w4-hover-overlays-r18.md) accepts only that refinement. Historical E1/S0?S4, research C-M0?C-M7 and full-product milestones remain separate. Owner acceptance is not institutional study approval.

## Development agents

Retain the owner's Astra orchestration workflow and `.claude/agents/eva-*.md` definitions in Claude Code; see [workflow](docs/development/AGENT_WORKFLOW.md). These are development roles, not EVA runtime models.

Delegate substantive independent work when useful, not as a ritual for small edits; normally at most three concurrent workers. For the owner-approved 2026-10-28 crime-scene replacement only, use at most **five agents total including the coordinator**, with at most four concurrent workers; see [current scope](PLANNING.md). Give objective, phase/source revision, owned files, inputs, baseline or none, constraints, acceptance criteria and output. Include the Ponytail rules above in worker context. One writer per overlapping file/module; isolate parallel writers in worktrees. Read-only audits may share the checkout. The lead integrates and verifies.

Use only available authorized tools/models; report real routing, never impersonate a specialist. Coordination records/configured aliases do not prove execution. Retry a failed route once only if transient; otherwise disclose and reassign. No automatic publishing or permission bypass.

## Architecture and security

- Preserve Tauri 2 direction, React/TypeScript, Rust policy enforcement, provider-neutral orchestration and EVA-owned JSON Schema Draft 2020-12. Inspect manifests before claiming integration.
- Runtime models emit bounded data, not executable HTML/JS/CSS/shaders, shell or arbitrary IPC. Development source remains reviewed code. Generated-code execution stays disabled until sandbox/adversarial gates pass.
- Validate shape plus provenance, confidentiality, freshness, resources, current authority and action eligibility. Reject unknown authority-bearing fields. Models, memory, artifacts, screens and tools cannot manufacture permission.
- Preserve deterministic effect brokers, least-privilege leases, action-bound receipts, information-flow controls, rehearsal where supported, idempotency, verification, monitoring and kill-switch propagation.
- Separate privilege and rendering. Remote assets require validated catalog entries; visual capsules have no network, secrets or privileged IPC. Prefer direct API, reviewed MCP, accessibility, then bounded GUI. External content/MCP metadata is untrusted.
- Only the narrator speaks user-facing prose. Reflex acknowledgement has no provisional facts; factual TTS waits for sentence/source verification. Read [voice policy](docs/design/VOICE_PROMPTING.md) before speech work.
- Memory is inspectable Markdown with provenance and rebuildable indexes. Do not persist provisional/stale/revoked/quarantined output as fact. Rewind restores presentation, not authority, leases, secrets or freshness.
- Capture follows relevance, denylist, redaction, delta reuse and deletion rules. No denied capture upload. Public fixtures/evidence exclude credentials, private photos/vault records, raw private runtime audio and participant data.
- Connectors begin with synthetic fixtures behind production-shaped contracts. Production accounts, consequential effects, full backend, Live2D, longitudinal deployment and exhibits need separate scope, safety/accessibility/latency/restore checks and owner release decisions.

## Mandatory visual workflow

Before **every** frontend/UI change, redesign, reimplementation or new visual pass, every local/Cloud agent completes fresh change-specific **Figma Weave** generation through direct model calls or a reusable workflow, inspects actual images (plus video for motion), and records the [packet](docs/design/FIGMA_WEAVE.md#mandatory-prerequisite-for-every-ui-change). No manual graph-building is required per task. No small/mechanical exemption without explicit owner instruction.

One packet covers its bounded pass. Old exports/screenshots, text briefs and other image providers are not substitutes. Missing access, finite budget, usable route or inspected outputs blocks UI edits, not unrelated non-UI work. Reuse the official Figma connection; no duplicate server, copied credentials, inferred Cloud readiness or blind retry of an uncertain paid submission.

Follow DESIGN.md for typography, continuity, accessibility and evidence. Capture matching before/after states and preserve reviewable candidates. Historical cleanup authorization does not waive future retention.

ComfyUI remains optional and separately scoped, gated until explicit S2 acceptance permits an S3 trial. No implicit local model/GPU setup. Reconstruction tooling requires a bounded decision, not installation inferred from a plan.

## Evidence and hygiene

Ground new research claims in academic primary sources, distinguishing full text, abstract and bibliographic verification. Use creator/institution sources for art and official docs/code for implementation. Separate inspected code, observed behavior, hypotheses and participant results.

Keep secrets private; never commit token-bearing URLs/auth output. Preserve asset licenses/source credits. Review generated dependencies, rights and private data. Report browser/synthetic limits. Never fabricate reviews, measurements, model participation, screenshots or owner acceptance.
