# Crime-scene Argus/Kimodo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Reuse workers; the repository's five-agent lifetime limit overrides fresh-agent-per-task recipes.

**Goal:** Replace legacy crime-scene generation and stock motion with an admitted Argus scene, one complete source-matched chair and Kimodo contact motion, delivered with native 2560×1440/60 fps evidence.

**Architecture:** Keep React/Three.js, the evidence UI and hash-bound catalog/review boundary. Produce separate, provenance-bound scene/object/motion candidates through exclusive Modal attempts; only current owner-approved candidates enter playback. Replace legacy producers and playback contracts in coordinated cutovers, without a silent fallback.

**Tech Stack:** Existing Python/Modal adapters, Node service and tests, JSON Schema Draft 2020-12, React/TypeScript/Three.js. No new local model installation or orchestration framework.

**Spec:** [Approved design](../specs/2026-10-28-crime-scene-argus-kimodo-design.md). [Execution handoff](../../development/CRIME_SCENE_REPLACEMENT_HANDOFF.md).

**Status:** Owner approved this written plan and coordinator-led execution with three reusable workers on 2026-10-28. Routine scoped implementation is authorized; paid/visual execution and quality acceptance remain separate gates. Baseline: `crimescene`, HEAD `0380e13efbdfa8c1ee29fe2c621927852b7766b7`, plus existing dirty/untracked work inspected 2026-10-28. HEAD alone does not identify the working source.

## Current priority override — panorama only

Latest owner direction on 2026-10-28 pauses Tasks 3–5's chair/motion work and the combined contact-demo target to focus on **panorama 3D scene recreation**. Continue Task 2 and its required preservation/admission checks; any later scene-only viewer/capture work must stay within that narrowed scope and its own visual/execution gates. Retain earlier decisions and evidence below as deferred work, not active marching orders. The owner did not accept the static-chair reference as explaining the photographed chair position; this does not authorize inferred tipping physics, a new motion run or deletion of the reference.

## Offline execution checkpoint — 2026-10-28

[Offline evidence and limitations](../../design/acceptance/crime-scene-offline-admission-v1.md) records the tested snapshot. Task 1's manifest/shared validation are implemented; replacement owner-review binding remains coupled to Task 5. Task 2 has a strict source-record validator but no admitted real input, scene converter or inference adapter: pinned Argus cannot consume the invalid-region mask. Task 3 has upstream inspection and shared validation only; dependency licences/pins and export bounds remain unresolved. The [prerequisite follow-up](../../design/acceptance/crime-scene-execution-prerequisites-v1.md) verifies the exact chair crop (marker-07/tag 18), explains panorama export padding without claiming calibration, and records a separate unapproved Weave quote. The old producer and all candidate files remain present until their coordinated cutovers. Tasks 4–6 remain gated; the choreography choice alone is settled. No full task or replacement quality acceptance is claimed.

## Implementation follow-up — 2026-10-28

The owner requested the next implementation step and approved the exact 229-credit Weave packet. Both runs completed; [references and inspection](../../design/revisions/crime-scene-argus-kimodo-v1/REVIEW.md) retain the generated contact gap as a rejected detail. Task 3 now includes the offline `evaluate_object` function and four red-to-green tests, reusing `ffs_fit`; observed fit and indexed topology never approve completeness/contact. Fitter 10/10 and artifact 20/20 passed; core/app 437 passed; room suite 205 passed, two skipped. No model adapter, candidate generation, motion integration or frontend cutover is claimed. Source calibration, account access, locked builds and finite Modal execution remain open.

## Global Constraints

- Crime-scene replacement only. No unrelated-week, bedroom, Hypersim, upload-room or historical-ledger exploration. Narrow shared dependencies require a stated reason.
- Every GPU workload, heavy real-scene processing, browser GPU check and final recording runs on Modal, never the owner's PC. Local work is editing, metadata/media inspection and synthetic CPU tests.
- At most five agents total including coordinator; no nested delegation. One writer per module; parallel writers use isolated worktrees containing the exact assigned dirty-source snapshot, not merely HEAD.
- Preserve original photos/scans, provenance, licences, fit/review records, failed receipts and concurrent edits. No reset, stash, clean, shared-branch switch, commit or publication.
- No paid allowance is supplied. Downloads, image builds, inference, rendering and Weave generation require exact finite approval. One submission per approved attempt, no automatic retries; cancellation never refunds authority or quota.
- Fresh change-specific Weave stills **and video**, inspected and recorded, precede frontend/motion edits. Missing visual approval does not block independent Argus/object/admission work.
- Preserve scanned-clue eligibility, staged-blood limitations, consent, quotas, cancellation and unknown-field rejection. No solution sheet, unscanned clue identities/locations or secrets in model inputs. Runtime models emit bounded data only.
- Native **2560×1440 at 60 fps** is the target, not an existing measurement. Offline master cadence and real-time interactive performance are separate claims.
- Held static-chair contact: palm error **≤0.01 m**, known-proxy penetration **≤0.005 m**, planted-foot drift **≤0.01 m** after retargeting. These are animation tolerances, not forensic reconstruction accuracy.
- Owner acceptance of geometry, contact and visual quality stays pending until actual evidence is reviewed.

## Review Focus

1. A review or asset changes during a job: reject stale completion rather than applying old approval to new bytes (Tasks 1, 4, 5).
2. A stream reports plausible metadata but contains truncated, externally referenced or decompression-heavy payloads: reject before decoder allocation/network access (Tasks 1, 3).
3. A valid-looking skeleton uses the wrong units, bind pose or handedness: reject or explicitly convert, then verify contact in the displayed frame (Tasks 4, 5).
4. A cancelled request completes late or the UI seeks backwards: do not restore authority or show a stale actor/object pose (Tasks 4, 5).
5. A nominal 60 fps recording duplicates 25 fps source frames: reject the delivery claim and report actual render/recording cadence (Task 6).

## Ownership and gate order

Coordinator owns shared schemas/catalog/broker, removal decisions, frontend integration, execution proposals and final verification. Recommended execution uses three reusable workers: Argus implementer, object implementer and independent read-only reviewer; coordinator owns Kimodo/contact to avoid splitting that tightly coupled seam. Four agents total leaves one unused slot; do not spawn it ceremonially. Ruflo routing is advisory only. On 2026-10-28 two isolated `eva-implementer` workers supplied Argus admission and shared artifact checks; one `eva-reviewer` reviewed the integrated offline snapshot. Four agents total including coordinator; no nested delegation.

Order: Task 1 → Tasks 2 and 3 independently → Task 4 → Task 5 → Task 6. The visual packet gates Task 4's motion implementation and all Task 5 frontend changes. Failed source/provider gates pause their dependent work, not unrelated offline tasks. A paid task never runs merely because this implementation plan was approved.

## Task 1: Freeze preservation and candidate admission

**Owner:** Coordinator.

**Files:** Create `scripts/room_workflow/ffs_artifacts.py`, `scripts/room_workflow/test_ffs_artifacts.py`, `scripts/room_workflow/crime-scene-retirement.json`, and `scripts/room_workflow/crime-scene-retirement.test.mjs`. Modify `scripts/room_workflow/ffs_objects_cloud.py` only to move model-independent validation before retiring it. Reuse `crime-scene.mjs`, `scene-review.mjs` and their tests; coordinator alone changes `ffs-resources.json`.

**Interfaces:** Preserve `ffsResource(pathname, {root, catalog})` and existing catalog entries `{path, sha256, bytes, type}`. Extract `validate_glb(data, limits) -> dict` and `validate_fit(entry, target) -> None` without dropping existing checks. `limits` contains explicit byte, face, vertex and decoded-texture bounds; limits are not chosen by model output. Candidate identity is the payload hash plus source hashes, producer/code/weight revisions, settings, coordinate transform and licence records. Owner review must bind that identity, not a reusable tag alone.

- [x] Recheck exact dirty files; record source hashes and a classification for every retirement/preservation target. Inspect only the approved `.local` paths, not a recursive dataset inventory. Record original source/archive and receipt hashes before any deletion.
- [ ] Write red tests: changed candidate hash invalidates approval; unknown authority fields are rejected; changed/deleted catalog payloads fail closed; a retirement entry with changed bytes cannot authorize deletion. Run `node --test scripts/room_workflow/crime-scene-retirement.test.mjs scripts/room_workflow/crime-scene.test.mjs scripts/room_workflow/scene-review.test.mjs` and observe the intended failures.
- [x] Move reusable GLB/fit rejection checks from the old producer into `ffs_artifacts.py`; transfer their tests before removing any model-specific test. Add malformed chunks/accessors, external URI, nonfinite values, excessive decoded textures and byte/face/vertex-limit cases. Run `python -m unittest discover -s scripts/room_workflow -p test_ffs_artifacts.py`; tests must fail before implementing added checks, then pass.
- [ ] Implement the minimal manifest/admission changes and rerun both commands. No asset promotion on registration, failed receipt, cancellation or stale owner review. Preserve atomic writes and exclusive attempt reservation.

### Exact retirement set and preservation rule

| Target | Action at its cutover | Preserve |
| --- | --- | --- |
| `scripts/room_workflow/ffs_objects_cloud.py`, `test_ffs_objects_cloud.py` | Task 3: remove SAM2→TripoSR producer/model-specific tests after extracting used validation and recording executed recipe identity | Used model-independent tests; executed code/version/licence provenance |
| `.local/reconstruction/ffs-th0028-objects-v2/returned/models/tag-13.glb` | Task 5: remove exact inspected payload and active catalog key `models/tag-13.glb` | Manifest hash/bytes, source crops, fit/review/receipt records |
| Same directory, `tag-18.glb` | Same; catalog key `models/tag-18.glb` | Same |
| Same directory, `tag-69.glb` | Same; catalog key `models/tag-69.glb` | Same |
| Same directory, `fits.json` | Keep on disk as historical provenance; retire its live `models/fits.json` pointer when loader is migrated | Entire original file/hash |
| `week4/app/src/crime-scene/figures.ts`, `playback.ts` | Task 5: replace stock-pose/clip path and tests, not wholesale module deletion | Deterministic clock, state/disposal logic and relevant tests |
| `.local/reconstruction/figure-ual-v1/` | No blanket deletion. Retain licensed mesh if retargeting passes; otherwise retire exact mesh/catalog reference only at Task 5 | Licence/source provenance; no stock-clip fallback |
| `scene.ply`, tags/photos/depth/segments/review entries | Preserve evidence resources; do not relabel scan as Argus output | Original bytes/hashes and access |
| Revision/acceptance folders and failed/cloud receipts | Preserve | All records, including rejected candidates required by policy |

Manifest fields: `path`, `classification` (`delete-payload`, `retire-code`, `preserve`), `sha256`, `bytes`, `catalog_keys`, `cutover_task`, `reason`. Hashes must come from actual inspected files, not this plan's catalog snapshot. Removal checks scan active crime-scene code/tests/catalog/cloud upload lists; historical mentions are not dangling live references. Never delete changed bytes under an old manifest.

## Task 2: Admit the panorama and implement bounded Argus output

**Owner:** Argus worker after Task 1 contract freeze.

**Files:** Modify `scripts/room_workflow/ffs_argus.py`, `ffs_argus_cloud.py`, `test_ffs_argus.py`, `test_ffs_argus_cloud.py`. Create `scripts/room_workflow/ffs_argus_scene.py` and `test_ffs_argus_scene.py`. Record actual results in `docs/design/acceptance/crime-scene-argus-pilot-v1.md`, preserving its existing preflight record.

**Interfaces:** Keep `panorama_header(raw)` and the existing preflight receipt format. Add `validate_source_admission(admission, input_sha256) -> dict` requiring hash-bound projection/calibration, dimensions, explicit valid-region mask and owner review. Add `convert_scene(points, confidence, cameras, admission) -> dict` producing bounded geometry plus source/inferred/unknown classification and explicit alignment; confidence is not geometric truth. Follow the existing `prepare` / exclusive `execute` / bounded `receive` pattern with a distinct inference plan kind and output attempt directory, never reuse the consumed preflight allowance.

- [ ] Inspect official pinned Argus code/checkpoint licences and source calibration metadata without downloads/builds. Determine whether its actual input path can respect the invalid region. If not, keep admission false and report the missing calibration/input capability; do not crop-stretch, paint a floor or assert a mask is supported.
- [ ] Add red tests for blank-band admission without projection, changed source hash, invalid mask bounds, nonfinite points, oversized output and unauthorized execution. Run `python -m unittest discover -s scripts/room_workflow -p "test_ffs_argus*.py"`.
- [ ] Implement admission and scene conversion on synthetic CPU fixtures. Reuse confidence-filtered point output; connect only locally supported surfaces, leaving unsupported regions explicitly unknown. Preserve cameras/depth/confidence and transforms for evaluation. Reject a complete-surface claim when surfaces remain missing; no measured-scan substitution.
- [ ] Implement pinned, bounded inference adapter and receipt checks; rerun the focused tests. Test interrupted/duplicate/path-traversing streams, changed plan/code, exhausted attempt and owned-app cleanup failure. No import-time network/model initialization.
- [ ] Under separately approved execution only, run once on Modal, compare the aligned reconstruction against retained source evidence, inspect surfaces and record actual output/version/resource/cost/cleanup evidence. Geometry quality remains unaccepted if only transport passes.

## Task 3: Complete-chair candidate and retire the isolated old producer

**Owner:** Object worker; coordinator applies deletion/catalog decisions.

**Files:** Create `scripts/room_workflow/ffs_trellis.py`, `ffs_trellis_cloud.py`, `test_ffs_trellis.py`, `test_ffs_trellis_cloud.py`. Reuse `ffs_fit.py` / `test_ffs_fit.py` and Task 1 artifact checks. Retire the two producer files listed in the manifest after live caller and test migration.

**Interfaces:** `prepare() -> dict`, `receive(stream, output, plan) -> dict`, `execute(plan_path, approved_sha256, approved_dollars) -> dict` follow the existing bounded Modal pattern. `evaluate_object(vertices, faces, segment, floor_z) -> dict` uses existing `fit` for observed-region fit and separately records component/silhouette/contact/completeness review; it never interprets scan coverage as hidden-surface accuracy.

- [ ] Verify official TRELLIS.2 code/weights revisions, GLB export, third-party licences and hardware requirements before proposing execution. Select the chair from reviewed tag/source identity, not a guessed numeric tag. Inputs are exact eligible crops/hashes only.
- [ ] Add red tests for unreviewed targets/crops, unsafe GLBs, changed review, duplicate output chunks, incomplete streams and limits exceeded. Run `python -m unittest discover -s scripts/room_workflow -p "test_ffs_trellis*.py"`.
- [ ] Implement the one-candidate adapter and evaluation using shared admission checks. Propose explicit revised payload/decoded-memory limits based on the inspected export; do not inherit 2 MB/40k faces or raise bounds without rejection tests. Keep the candidate unregistered/unapproved until validation and owner review.
- [ ] Rerun the focused tests plus `python -m unittest discover -s scripts/room_workflow -p test_ffs_fit.py` and Task 1 checks. Archive the old producer's executed recipe/version evidence, recheck manifest hashes/callers, then remove its executable source and only model-specific tests. Existing old catalog payloads remain explicitly legacy until Task 5, not replacement candidates.
- [ ] Under separate finite approval, generate one candidate on Modal. Review unstyled geometry from multiple views: all legs/rails, seat/back, thin structures, occluded surfaces and floor support. Record fit, latency, peak memory, output bounds and rights. Reject or seek a separately approved alternative if it fails; no automatic model search.

## Task 4: Kimodo task, conversion and contact admission

**Owner:** Coordinator. **Gate:** Fresh inspected still-plus-motion Weave packet before motion implementation; read-only upstream/rig inspection and test planning may precede it.

**Files:** Create `scripts/room_workflow/ffs_kimodo.py`, `ffs_kimodo_cloud.py`, `test_ffs_kimodo.py`, `test_ffs_kimodo_cloud.py`, and `scripts/room_workflow/crime-scene-motion.schema.json`. Modify `eva-investigator.mjs`, `eva-investigator.test.mjs`, `eva-investigation.schema.json`, `broker.mjs` only as part of Task 5's coordinated live contract switch.

**Interfaces:** `validate_motion_task(task, admitted_scene, admitted_object, authority) -> dict` consumes an eligible explicit request and admitted hashes, not model-authored authority. `convert_motion(raw, rig, transform) -> dict` returns bounded sampled motion with joint order, bind-pose/rig hash, sample rate, units, transform, root positions and local unit quaternions. `verify_contact(samples, rig, anchors, proxies) -> dict` evaluates the final retargeted skeleton in a common metre frame and fails closed on missing collision proxies. Cloud plan/receive/execute signatures follow Task 3.

- [x] Decoded the supplied `batman_references/Accidental Contact · Video.mp4` with CPU ffmpeg and inspected sampled frames: a figure walks past the chair, which tips over. On 2026-10-28 the owner selected **deliberate reach → touch → hold → release against a static chair** for the first verified sequence. This choice does not authorize generation or replace Weave.
- [ ] Inspect official Kimodo constraints/export and the licensed rig's joint/bind-pose metadata. Pin actual code/model/format; verify metres versus SOMA BVH centimetres, rotation order and axes. Preserve the app's existing z-up display convention through an explicit transform rather than silently changing every source coordinate.
- [ ] Add red synthetic tests: 100 cm converts to 1 m; known 90° joint rotation reaches its expected anchor; invalid joint order/quaternion/scale fails; unreachable targets fail; equality at tolerances passes and any excess fails. Test palm error ≤0.01 m, penetration ≤0.005 m, foot drift ≤0.01 m **after** retargeting. Run `python -m unittest discover -s scripts/room_workflow -p "test_ffs_kimodo*.py"`.
- [ ] Implement constraints (root path, hand anchor/contact interval and planted feet), conversion, deterministic contact correction and verification. Treat generated motion as a candidate until checks pass. Numeric artifacts use `allow_pickle=False` and bounded shape/dtype/allocation checks; runtime never receives executable output.
- [ ] Add and pass tests for forged/unscanned object IDs, model-supplied anchors/approval, changed scene/object/rig hashes, late completion after cancellation, consumed quota and exact-plan replay. Schema rejects unknown fields. Do not inherit text-question consent as authority to submit a paid GPU job.
- [ ] Execute one separately approved Modal motion run only after scene/object admission and choreography selection. Inspect the retargeted full human/chair sequence, not only raw skeleton or wrist distance. Reject unverified contact/rigs; do not substitute stock animation.

## Task 5: Atomic scene/catalog/playback cutover

**Owner:** Coordinator (single frontend writer). **Gate:** Task 4's packet must explicitly cover this entire bounded playback/geometry pass; expand/generate a fresh packet if it does not.

**Files:** Modify `week4/app/src/crime-scene/{models,figures,playback,renderer,investigation,state,api}.ts`, `CrimeSceneApp.tsx`, `AskEva.tsx` as needed by the contract, and matching `week4/app/tests/crime-scene*.test.ts`. Modify shared backend files listed in Task 4, `crime-scene.mjs`, `scene-review.mjs` and their tests, `ffs-resources.json`, and the cloud source/upload lists in `crime_scene_browser_cloud.py` / `crime_scene_demo_cloud.py`. Preserve `App.tsx`'s existing route; no new app entrypoint.

**Interfaces:** Keep public `duration(scenario)`, `frameAt(scenario, t)`, `steppedFrame(scenario, index)` and playback controls. Change actor frame data from named `pose`/`next` clips to admitted sampled root/joint transforms. Investigator output describes bounded eligible intent; only the broker can attach a hash-bound admitted motion reference. No arbitrary URL/coordinate/asset approval supplied by a language model. Preserve evidence/caption steps and one scenario clock.

- [ ] Capture the matched before-state on approved Modal resources; inspect the full current caller chain. Add red tests for absent/stale motion, rig mismatch, scene/object revision changes, reduced-motion stepping, deterministic seek in either direction, pause/Escape, cancellation, evidence return and disposal. Run `node --test "week4/app/tests/crime-scene*.test.ts"`.
- [ ] Migrate backend schema, validation and canned test fixtures together with the frontend types/loaders. Old saved stock-clip reconstructions remain historical text/data but cannot play; an unavailable replacement is explicit, not a fallback. Preserve non-motion evidence/notebook content.
- [ ] Admit hash-bound scene/object/motion resources with bounded streamed reads and pre-decoder resource checks. Remove stock clip lookup and automatic measured-scan/generated-object substitution. The measured scan stays accessible as evidence. Keep full chair/human silhouettes, source labels and existing typography; matrix effects are restrained materials only.
- [ ] Update active catalog/review bindings and browser upload manifests atomically. Remove the three exact legacy GLBs and obsolete live fits pointer only after their hash manifest and source preservation checks pass. Retain the historical fits file. Retain the existing rig mesh only if Task 4 verifies it; remove stock-clip usage regardless.
- [ ] Run frontend tests above and `node --test scripts/room_workflow/crime-scene.test.mjs scripts/room_workflow/scene-review.test.mjs scripts/room_workflow/eva-investigator.test.mjs scripts/room_workflow/crime-scene-retirement.test.mjs`. Run `npm run room:test`, `npm test`, `npm run typecheck`, `npm run build` for shared-contract regressions. These are CPU checks, not permission to launch a local scene/browser renderer. Report environmental/pre-existing failures without weakening checks.
- [ ] Verify no active import, command, catalog key, fixture or upload list requires deleted payloads/producers. Compare preserved source/receipt hashes. Any concurrently changed removal target blocks its deletion.

## Task 6: Native clarity/cadence evidence and independent review

**Owner:** Coordinator; retained read-only reviewer audits integration and evidence.

**Files:** Modify `scripts/room_workflow/crime_scene_browser_cloud.py`, `crime_scene_demo_cloud.py` and their tests; `week4/app/scripts/crime-scene-{demo,smoke,walkthrough}.mjs`. Touch `browser-options.mjs` and its test only if actual NVIDIA verification requires it. Create `docs/design/acceptance/crime-scene-argus-kimodo-v1.md`; record actual packet/evidence under `docs/design/revisions/crime-scene-argus-kimodo-v1/` and link it from `docs/design/INDEX.md` after evidence exists.

**Interfaces:** Extend existing capture reports with actual framebuffer/viewport/DPR, antialiasing, GPU identity, timestamped render/encode cadence, frame-time distribution, stalls and dropped/duplicate frames. A 60 fps container header alone is not an acceptance check.

- [ ] Add red synthetic capture-report tests rejecting 1440×960 input, 25→60 re-encoding, software-renderer substitution and missing cadence evidence. Run `python -m unittest discover -s scripts/room_workflow -p "test_crime_scene*cloud.py"`.
- [ ] Implement native 2560×1440 output and actual cadence instrumentation in the existing Modal capture route. Use deterministic offline rendering for a high-quality master if needed, but measure/report real-time interaction separately. Rerun CPU report tests and affected Node tests before any submission.
- [ ] Under approved finite rendering scope, capture complete human/chair, held contact and matching before/after states. Check keyboard focus, touch, reduced effects, pause/seek/Escape, interruption/context loss, source access and camera/selection continuity on Modal. Inspect actual frames/video and numeric contact reports.
- [ ] Have the retained reviewer audit contracts, confidentiality, resource rejection, stale-authority handling, cleanup and evidence using the exact tested source snapshot. Integrate confirmed fixes and rerun their checks; no new review agent per task.
- [ ] Record source snapshot hashes, exact commands, versions, GPU, outputs, actual costs where known, per-attempt cleanup/stopped/zero-task evidence, limitations and recording path. Ask owner to accept chair, contact and clarity separately; keep acceptance pending until their decision. No automatic commit or publishing.

## Consolidated finite execution proposal (separate approval)

After offline inspection pins the actual contracts, present one proposal with distinct non-transferable stage allowances: Weave still+motion references; Argus acquisition/build/inference; TRELLIS.2 build/chair candidate; Kimodo build/contact generation; Modal before/after browser/render/recording. Motion reference discovery should quote Seedance 2.5 if available, not silently substitute another model.

For **each** stage, provide exact code/weight/package/image revisions and licences, input/upload hashes and confidentiality, GPU/CPU/RAM, container count, build/startup/worker/client timeouts, one-attempt limit, output/decoded-memory/retention bounds, cleanup method and estimated cost with rate source. Identify operational allowances versus provider-enforced caps. A build/download allowance must be explicit, not hidden inside inference. Do not submit a stage with unknown input identity, unverified access or a missing price quote; do not silently move unused allowance to another stage.

The proposal is intentionally not a dollar quote: pricing, gated checkpoint access, actual hardware/export requirements and live Weave contracts have not been verified in this planning pass. Approval of this plan authorizes routine scoped implementation only, not those submissions.

## Plan review and execution handoff

Planning self-review: all approved-design areas map to Tasks 1–6; the five failure classes map to explicit rejection tests; retirement is coupled to callers and preserved evidence; all GPU and visual gates remain separate. The offline checkpoint above records subsequent source-preservation/testing evidence, not model, contact or performance acceptance.

Approved method: coordinator-led execution with reusable independent Argus/object workers and one retained reviewer, within the five-agent cap. Written plan review was supplied on 2026-10-28; routine authorized work does not need repeated approval. Unresolved execution/visual gates still require their own approval.
