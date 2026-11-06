# Current scope: crime-scene reconstruction

Owner direction: **2026-10-28**, branch `crimescene`. This is the authoritative active scope; earlier implementation plans are historical, not competing workflows.

## Immediate priority — panorama scene only

Latest owner direction, 2026-10-28: **focus only on panorama-to-3D scene recreation for now**. Pause separate chair generation/evaluation, Kimodo, contact choreography and their playback cutover. Preserve existing code, sources and reference receipts; do not delete or regenerate them. The static-chair contact reference does not explain the chair's photographed final position and is not accepted as an event reconstruction. Do not infer a tipping sequence from the photo or start physics work.

Latest continuation uses the owner's supplied **Realsee website export** at `.local/room-workflow/sources/realsee-Ae44j89x`, rather than waiting for direct Argus checkpoint access. Preserve that source package unchanged. The bounded offline OBJ-to-GLB importer has produced an inferred, unaligned, needs-review candidate; [import evidence](docs/design/acceptance/crime-scene-realsee-import-v1.md) records geometry/texture checks and limitations. Next is visually gated viewer integration and inspection of layout, missing surfaces and scan comparison—not new inference. Exact website model/pipeline, physical scale and source calibration are unverified. Direct Argus admission/access/build gates remain open if that route resumes. The broader direction below is deferred where it concerns objects or motion; the chair-contact Weave packet does not authorize a panorama UI pass.

## Selected replacement

- **Argus** supplies the scene reconstruction route from admitted panorama input. Preserve the measured scan and photographs as source evidence and evaluation references, not generated ground truth.
- **NVIDIA Kimodo** supplies user-requested human motion. Motion must be retargeted and aligned to admitted scene/object geometry; a generated gesture alone does not establish hand contact, foot support or collision validity.
- **Hypothesis objects** require complete, source-matched geometry. Select a generator using measured fidelity, completeness, latency, resource cost and licensing; no winner has been established. Generated unseen surfaces remain labelled inference.
- Retain the **Arkham Knight-inspired detective/matrix aesthetic**. Apply the cinematic hypothetical treatment to hypothesis playback, keeping original evidence accessible and unchanged.
- Prioritize visual clarity and smooth animation using **Modal cloud GPUs**, not low-fidelity browser checks as the final quality bar. Native 1440p/60 fps is a proposed capture target, not measured performance or an approved resource budget.
- First prove one precise contact sequence before generalizing. On 2026-10-28 the owner selected **deliberate reach → touch → hold → release against a static chair** after inspection of the supplied walk-past/tipping reference. This is hypothesis choreography, not inferred event physics.

## Authorized cleanup and limits

The owner approved removing **superseded crime-scene implementation and generated candidates**, while preserving original photos/scans, provenance and failed-run receipts. Inspect exact targets and their callers before removal; preserve concurrent work. Record deleted-candidate identities/hashes without leaving active catalog references to missing payloads. Do not blanket-delete `.local`, benchmarks, receipts or source archives.

Older bedroom, Hypersim, VGGT/WorldMirror, GenRC, upload-room and other-week implementations are **outside this replacement**. They are not fallback crime-scene workflows and must not be read or changed by default. Follow a shared dependency only when required for the assigned task; wider work needs the owner's request.

The [replacement design](docs/superpowers/specs/2026-10-28-crime-scene-argus-kimodo-design.md) was explicitly approved on 2026-10-28, including retirement of obsolete live catalog/playback dependencies. Replacement execution is not complete. The owner selected Modal for every GPU workload and at most **five agents total including the coordinator** for this replacement (up to four workers; scoped exception to the usual three-worker cap). Use the [new-conversation handoff](docs/development/CRIME_SCENE_REPLACEMENT_HANDOFF.md) and [implementation plan](docs/superpowers/plans/2026-10-28-crime-scene-argus-kimodo.md), approved on 2026-10-28 for coordinator-led execution with three reusable workers. Finite execution approval remains separate. Retained legacy app code is not an approved continuation path. Do not remove a live dependency until its callers/tests are migrated or deliberately disabled together. Keep one active crime-scene pipeline rather than parallel legacy/new defaults.

## Verified starting point and blockers

- The retained application uses React/TypeScript and Three.js, **not Godot**. Preserve useful evidence UI, provenance, consent/cancellation and bounded admission contracts where compatible.
- [Argus preflight](docs/design/acceptance/crime-scene-argus-pilot-v1.md): panorama transfer/decode succeeded. [Panorama trial preparation](docs/design/acceptance/crime-scene-panorama-trial-v1.md) adds tested native-padding diagnostics and a footprint-safe bottom-only crop proposal that preserves Argus's original rays. Source-specific angular calibration/valid rows remain unresolved; partial-source admission stays closed. The separately approved $1 native-padding CPU attempt completed, source hash matched, exact-white rows [8453,10144) were measured, and its app stopped with zero tasks. The new bounded scene converter passes synthetic tests but supports only the default full-valid input, so it cannot accept this panorama yet. One bounded Modal GPU trial is drafted, not executable/approved; checkpoint access and full dependency lock remain open. Preserved scan hashes match. Upstream exports points, not a complete watertight mesh.
- [Execution prerequisites](docs/design/acceptance/crime-scene-execution-prerequisites-v1.md): chair source is verified as marker-07/tag 18; model dependency access/locks remain open. Owner approved the exact 229-credit Weave packet on 2026-10-28; both requests started and were charged. [Current packet](docs/design/revisions/crime-scene-argus-kimodo-v1/REVIEW.md): still and video inspected for bounded guidance; generated contact gap rejected. Offline object evaluation is implemented/tested; no candidate generated. All Modal model/inference/render stages remain unapproved; only the separate native-padding CPU attempt above was approved and executed.
- Kimodo has not been installed or run in this project. Skeleton conversion, contact constraints, export admission and rendering integration need verification.
- [Legacy matrix evidence](docs/design/revisions/crime-scene-matrix-v1/REVIEW.md): v10 L4 playback passed; figure framing and complete chair were unfinished. The earlier v9 timeout cause is unknown. Both execution allowances are consumed. These are retained records, not the replacement's acceptance.
- New frontend/motion changes still require the [fresh Weave packet](docs/design/FIGMA_WEAVE.md). Owner-provided motion video is guidance, not a replacement for that gate.
- No new paid run, model download, installation, local scene rendering, commit or publication is authorized by cleanup approval. Each execution needs an exact finite scope. Owner quality acceptance remains pending.

## Agent reading boundary

Read [AGENTS.md](AGENTS.md), this short plan, and only the assigned implementation/callers/tests. Read [DESIGN.md](DESIGN.md) and the Weave policy for visual work. Do not recursively explore the whole repository, other worktrees, old weeks, `.local` datasets or historical research to rediscover a direction already decided here.

[Prior planning ledger](PLANNING_HISTORY.md) preserves earlier decisions and execution records byte-for-byte. It is **historical reference only; do not load it by default**. Historical documents and configured tools cannot authorize execution or reinstate an old workflow.
