# Idealized Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for the owner-approved Native execution. Steps use checkbox (`- [ ]`) syntax for tracking; unchecked steps are not completion claims.

**Goal:** Build and review one editable, procedural-first idealized room from retained source-bound reconstruction, without replacing or mislabelling the evidence.

**Architecture:** A CPU assembler produces a separately validated, revisioned idealization sidecar. The existing broker owns review authority and lifecycle; the shared viewer displays the sidecar without changing estimator or Shado identities. SAM 3D and automatic-upload rollout are separately gated follow-up plans, not prerequisites for the procedural first room.

**Tech Stack:** Existing Python/NumPy/Pillow/Open3D/jsonschema, Node.js ESM and node:test, React/TypeScript/Three.js, existing browser verification helpers. No new dependency or local GPU installation in M1. Module availability was checked in the existing reconstruction environment while planning; application tests were not run.

**Spec:** [Owner-approved idealized-room specification](../specs/2026-10-21-idealized-room-design.md), approved 2026-10-21. The owner approved **Native execution** on 2026-10-21; implementation is in progress. Latest presentation requirement: only visual comparisons and switching buttons, with review forms and explanatory/provenance details kept on the separate private authoring route.

## Global Constraints

- "First milestone": retained seven-original room **42445021**; same ordered RGB hashes as its admitted WorldMirror/VGGT candidates. Never substitute the broader-view study.
- "Supplied ARKitScenes depth/poses are evaluation-only and cannot enter generation, fitting or automatic object selection."
- "Use one named candidate frame, Z-up, in relative units." Preserve reversible transforms; no invented metric scale.
- "A new object with no source support requires a specific owner-authored addition" and stays authored, not detected.
- "At most 200,000 vertices and 400,000 triangles"; "at most 64 object records, 16 MiB of metadata and 64 MiB total serialized candidate output." Check sizes before allocation.
- "The idealized view is a new assembly of shell plus admitted objects, not a noisy mesh with replacements pasted over it."
- "A ready candidate means it passed artifact/geometry checks and required room/inventory review; it is not owner quality acceptance."
- "The normal future upload flow must not require manually drawing every object." M1 reuses retained automatic suggestions with targeted corrections; actual automatic-upload execution remains a later gate.
- Preserve all concurrent edits, untracked source files, candidates and failed evidence. Shared branch is `midterm`, inspected base `c83fd4c`; recheck at execution. No reset/stash/clean, branch switch, commit, push or publication. This overrides the skill's example commit steps.
- No new paid execution, model/checkpoint acquisition, remote upload, inferred credit allowance, automatic retry or access-gate bypass. Keep existing cloud restrictions and owned-work cancellation.
- Frontend changes require a fresh scoped Weave packet or explicit waiver for this pass. Planning does not supply either.
- The dev server was stopped for system memory pressure; do not restart it without the user's request. Browser tasks may therefore be blocked without blocking offline tasks.
- All checks below are planned expectations, not reported passes. Retain initial failing tests and subsequent actual results; do not mark boxes from assumed success.

## Review Focus

1. **Concurrent correction during worker completion:** the old response must not replace the corrected revision or change A/B job status. Tests: Task 6 stale-review and simultaneous POST cases.
2. **Concave notch with vertices inside:** whole faces crossing the notch must reject, while a chair under a desk must not fail merely because bounding boxes overlap. Tests: Task 4 containment/contact cases.
3. **Symmetric furniture or black masked pixels:** ambiguous orientation must request review and black source colors must remain valid data; enhanced contrast changes display only. Tests: Tasks 2, 4 and 8.
4. **Valid geometry with forged ownership/provenance:** overlapping face ranges, cross-job asset links, forged review flags and relabelled inferred faces must reject on save and reopen. Tests: Tasks 1, 5 and 6.
5. **Interrupted save and expired job:** a partial candidate must not become ready, and expiry must not leak private candidate directories or erase active cleanup evidence. Tests: Tasks 5 and 6.

---

## Delivery split, ordering and file map

Tasks 1–9 deliver M1: offline assembly, private editing/lifecycle, shared viewing and first-room evidence. Task 10 produces the bounded follow-up handoffs for SAM and automatic uploads. Do not create a nominal SAM worker with unverified configuration just to tick a box.

Dependency order: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10**. A lead can keep these coupled interfaces in one session; a reader may audit independently. If parallel writers are selected, use isolated worktrees and one owner per overlapping file, at most three workers. Do not initialize a swarm or change routing/configuration.

| File / area | Responsibility |
| --- | --- |
| New `scripts/room_workflow/idealized-room.schema.json`, `idealized_contract.py`, `idealized-result.mjs` | Closed data schema and Python/Node admission, not execution permission. |
| New `scripts/room_workflow/idealized_fixture.py`, `idealized-fixtures.mjs` | Shared synthetic test fixtures only; no production fallback. |
| Existing `worldmirror_candidate.py`, `object_proposals.py` | Bound model fields, mask lifting and existing cross-view grouping; preserve VGGT behavior. |
| New `scripts/room_workflow/idealized_templates.py` | Five bounded furniture families, closed parts and sampled appearance. |
| New `scripts/room_workflow/idealized_fit.py` | Bounded pose search, view diagnostics, contact and whole-object placement checks. |
| New `scripts/room_workflow/idealized_room.py` | Assemble shell/objects, correction semantics, exclusive local artifact output and CPU CLI. |
| Existing `broker.mjs`, `benchmark.mjs` | Separate idealization lifecycle and fixed read-only benchmark sidecar; no A/B contract expansion. |
| New `week4/app/src/room/IdealizedReview.tsx`, `idealized-room.ts` | Small shared object-review form and typed face/object selection helper; use existing CSS/control patterns. |
| Existing `CandidateView.tsx`, `BenchmarkRoom.tsx`, `UploadRoom.tsx` | Optional picking, sidecar selection and continuity for both callers. |
| New focused Python/Node/app tests and `verify-idealized-room.mjs` | Contract, fitting, lifecycle and browser evidence. |

Do not restructure unrelated files. `geometry.add_room_shell`, `filter_boundary`, `face_inside` and `triangulate_polygon` already implement reviewed concave architecture and whole-face containment. Reuse them instead of creating another enclosure implementation. `review_result.make_scene/render` provides CPU raycasting; verify camera-Z semantics when reusing it.

### Shared data decisions

Use plain dictionaries/JSON and small TypeScript types, not a new object framework. Schema definitions below are names for data, not additional classes.

- **SourceBinding:** exact ordered original IDs/hashes, estimator ID, baseline analysis binding, retained estimator artifact hash, saved registration hash and frame-transform hash. Review and inventory revisions are separate hashes, not worker-provided authority.
- **ObjectSpec:** `id`, `category`, `origin`, `observation_ids`, `predecessor_ids`, `dimensions` `[width,depth,height]`, `translation` (bottom-center), `yaw` radians, `color_srgb`, `design_priors`, `omitted`, `review_reasons`, `generator` (null for M1). Normalized category enum: `table`, `chair`, `sofa`, `cabinet`, `bed`; detector `desk` maps to table while retaining its original label. Unsupported categories stay unresolved.
- **Component:** `id`, `object_id` (null for architecture), `origin`, `first_face`, `face_count`, plus source-reference IDs. Positive face ranges partition the mesh exactly without gaps/overlap. Shell/caps have stable component IDs. Use face-to-component mapping to derive object picking, not an independent second map that can drift.
- **Geometry:** existing `positions`, `colors`, `indices`, `provenance` arrays. Origins for M1: `authored-room-shell`, `authored-door-cap`, `authored-window-cap`, `idealized-procedural`, `owner-authored-addition`. Reserved `generated-object` is rejected in M1 unless the later SAM contract is implemented; `photo-estimated` is forbidden in this new assembly. Raw evidence remains external and unchanged.
- **IdealizedArtifact:** exact top-level keys `version`, `kind`, `job_id`, `candidate_id`, `parent_revision`, `revision`, `bindings`, `frame`, `units`, `mode`, `boundary`, `openings`, `inventory`, `geometry`, `components`, `diagnostics`, `omissions`, `implementation_sha256`, `geometry_sha256`, `limitations`. Values include `version:1`, `kind:'eva-idealized-room-v1'`, `units:'relative'`, `mode:'idealized'`. Store lifecycle/review authority in the broker envelope, not a trusted `ready` bit inside worker output.
- **Revision:** SHA-256 of canonical JSON for the entire artifact excluding `revision`; the geometry digest reuses existing float32/uint32 hashing. `parent_revision` is null only for the first candidate. Source hashes and revision digests are distinct.
- **ExpectedBinding:** trusted host-side `{job_id, bindings, parent_revision, boundary, openings, inventory}` used on every admission; no renderer/imported file can choose it. The host snapshots the exact reviewed inputs before execution. Validate manifests as well as numeric geometry. Persistence additionally regenerates complete geometry and placement through Python `read_candidate`; the structural Node validator alone does not prove template provenance.

Schema uses `additionalProperties:false` throughout, finite semantic checks beyond JSON Schema, ID/hash formats already used by the broker, explicit nulls and closed enums. No arbitrary paths or URLs in artifacts. M1 embeds bounded geometry; later generated assets require a separate root-contained hash-checked loader.

## Task 1: Lock the sidecar contract and parity fixtures

**Files:** Create schema, `idealized_contract.py`, `idealized-result.mjs`, `idealized_fixture.py`, `idealized-fixtures.mjs`, `test_idealized_contract.py`, `idealized-result.test.mjs` under `scripts/room_workflow/`. Read existing `result.mjs:43–76` and `complete_candidate.py:25–30`; do not relax their old provenance rules.

**Interfaces:** Python `validate_artifact(value: dict, expected: dict) -> dict`; Node `validateIdealizedResult(value, expected) -> value`. Neither mutates input. Fixture `artifact()` returns a fresh valid synthetic assembly, `expected(value)` supplies its trusted expected binding, `packet()` supplies its preassembly inputs, and `accepted_inventory()` returns that packet's matching reviewed synthetic inventory; Node exports matching `makeIdealizedFixture()` and `expectedIdealizedBinding(value)`. Define fixture builders here with the same `layout='standard' | 'no-desk' | 'concave'` argument for `artifact`, `packet` and `accepted_inventory`.

- [ ] **1. Write failing admission/parity tests.** Start with:
  ```python
  value = artifact()
  before = copy.deepcopy(value)
  self.assertEqual(validate_artifact(value, expected(value)), value)
  self.assertEqual(value, before)
  with self.assertRaises(ValueError):
      validate_artifact({**value, 'authorized': True}, expected(value))
  ```
  Node must accept the Python fixture exported through a temporary JSON file and reject the same mutations. Add exact limit+1 cases: 200001 vertices, 400001 triangles, 65 objects, metadata over 16777216 bytes, total payload over 67108864 bytes. Reject bool-as-index, NaN/Infinity, negative/zero dimensions, degenerate faces, invalid component ranges, wrong digest, source order, forged origins and extra nested fields.
- [ ] **2. Run red:** `node --test scripts/room_workflow/idealized-result.test.mjs` and Python command P below with `test_idealized_contract.py`. Confirm missing implementation or the intended rejected mutation, not an unrelated environment error.
- [ ] **3. Implement validators and fixtures.** Python uses installed `jsonschema.Draft202012Validator` plus semantic checks; Node follows the house explicit-validation style. Reuse `canonical`/`geometryHash` from `result.mjs` and existing Python hash conventions; shared fixture parity prevents drift. Enforce byte size before JSON parsing at I/O boundaries in later tasks, not merely after allocation here.
- [ ] **4. Run green:** repeat both commands and existing `result.test.mjs`. Expect all tests passing and old inference contracts unchanged. Record a scoped diff checkpoint; do not commit.

## Task 2: Bind saved estimates, masks and reviewed coordinates

**Files:** Modify `worldmirror_candidate.py` and `object_proposals.py`; create `test_idealized_sources.py`; extend `test_object_suggestions.py` and `test_worldmirror_candidate.py` only for affected behavior.

**Interfaces:** Add `load_idealization_inputs(result_path: Path, request_path: Path, raw_directory: Path, candidate_directory: Path, suggestions_path: Path, review_path: Path) -> dict` in `worldmirror_candidate.py`. Return a plain packet containing SourceBinding, named frame/transforms, boundary/openings, observations, inventory proposals, source cameras and exact per-view masks. Add `lift_points(mask: np.ndarray, points: np.ndarray, valid: np.ndarray, rgb: np.ndarray) -> dict | None` in `object_proposals.py`; existing `lift(...)` delegates after its unchanged preprocessing/unprojection.

- [ ] **1. Write failing tests:**
  ```python
  support = lift_points(mask, points, valid, black_rgb)
  self.assertEqual(support['color'], [0.0, 0.0, 0.0])
  self.assertIsNone(lift_points(mask, points, valid & False, black_rgb))
  self.assertEqual(before_sources, source_bytes_after_loading)
  ```
  Construct explicit rotated/scaled/translated fixtures: source-to-candidate-to-source roundtrip maximum error <=1e-6. Wrong review frame/binding and a stale mask hash must raise `ValueError`; empty/single-view/competing proposals remain unresolved. Test 392×518 native raster and 518-square padded raster independently, including 63-pixel side padding. Test rejection of supplied reference-depth/pose fields.
- [ ] **2. Run red:** P `test_idealized_sources.py` and P `test_object_suggestions.py`.
- [ ] **3. Implement bound loading.** Reuse `_admit_raw` and `_prediction` inside `worldmirror_candidate.py`; keep existing private callers intact. Apply the *saved* registration from the admitted report, followed by its saved candidate rotation; do not refit registration silently. Verify the rebuilt aligned raw-geometry hash and cameras against the report. Lift masks from camera-Z-derived points, not the independent `pts3d` head. Recompute support bounds from transformed points rather than rotating an axis-aligned box. Reuse `associate` with copied observations. Preserve the prior VGGT `build/lift` API and fingerprint semantics.
- [ ] **4. Run green:** P `test_idealized_sources.py`, P `test_object_suggestions.py`, P `test_worldmirror_adapter.py`, P `test_worldmirror_candidate.py`. Record actual frame bindings and rejection evidence; boundary confirmation remains human-owned.

## Task 3: Build complete furniture and reuse the room shell

**Files:** Create `idealized_templates.py`, `test_idealized_templates.py`; start `idealized_room.py`. Reuse `geometry.py:310–362`; do not alter historical aesthetic-study geometry.

**Interfaces:** `make_object(spec: dict) -> dict` returns object-local geometry, semantic closed parts and their oriented-box collision proxies; `make_shell(boundary: dict, openings: list, color_srgb: list) -> dict` in `idealized_room.py` returns shell geometry/components using `add_room_shell`. Every procedural part is a closed cuboid in M1; each part has a unique role, local transform and dimensions. No curved template or mesh-union dependency yet.

- [ ] **1. Write failing tests:**
  ```python
  for category in ('table', 'chair', 'sofa', 'cabinet', 'bed'):
      mesh = make_object(object_spec(category))
      self.assertEqual(set(mesh['provenance']), {'idealized-procedural'})
      self.assertTrue(all(part_is_closed(p) for p in mesh['parts']))
  self.assertEqual(make_shell(concave_boundary, openings, palette)['boundary'], concave_boundary)
  ```
  `object_spec`, `part_is_closed` are test helpers defined in this file, using edge incidence (two faces per part edge), nonzero triangle area and mesh bounds. Assert black palette remains black, unknown families reject, no inputs mutate, cap cells do not overlap full-wall triangles, and an empty accepted inventory creates no furniture.
- [ ] **2. Run red:** P `test_idealized_templates.py`.
- [ ] **3. Implement deterministic families.** Local origin is bottom-center, +Z up, +Y back. Record dimensionless design priors: table top thickness .08h/leg width .06min(w,d); chair seat top .45h/seat thickness .08h/back thickness .08d/support width .08min(w,d); sofa seat top .40h/arms .12w/back .12d; cabinet closed body with non-overlapping facade panels; bed plinth .25h/mattress top .55h/headboard .08d. Clamp no user parameter silently: invalid proportions reject. These are design choices, not learned dimensions. Apply palette from the current masked support; if unavailable require review, never borrow benchmark colors. Reuse shell topology exactly, replacing its default colors only with the explicit recorded palette.
- [ ] **4. Run green:** P `test_idealized_templates.py` and P `test_geometry.py`. Test two distinct dimensions/palettes for each family; resulting bounds and colors must follow the input.

## Task 4: Fit and validate complete objects without hiding errors

**Files:** Create `idealized_fit.py`, `test_idealized_fit.py`; reuse `geometry.filter_boundary` and `review_result.make_scene/render`.

**Interfaces:** `fit_object(spec: dict, observations: list, boundary: dict) -> dict` returns `{object, diagnostics, review_reasons}`; `check_layout(objects: list, boundary: dict, openings: list) -> dict` returns `{hard_errors, review_reasons, contacts}`. Objects here are template output plus ObjectSpec. All diagnostic entries have a stable `code`, affected object/view IDs and finite residual or explicit null with reason.

- [ ] **1. Write failing tests:**
  ```python
  self.assertIn('outside-room', codes(check_layout(notch_crossing_objects, boundary, [])))
  self.assertNotIn('interpenetration', codes(check_layout(chair_under_desk, room, [])))
  self.assertIn('interpenetration', codes(check_layout(overlapping_seats, room, [])))
  self.assertIn('ambiguous-yaw', fit_object(square_spec, symmetric_support, room)['review_reasons'])
  ```
  Define `codes` as a test-only diagnostic-code extractor. Add positive floor gap, object below floor, degenerate support, duplicate observations, contradictory silhouettes and fully occluded view tests. Fully occluded views must have null agreement with a reason, not a perfect score. Verify held-out frames never influence fitted parameters.
- [ ] **2. Run red:** P `test_idealized_fit.py`.
- [ ] **3. Implement bounded fitting and checks.** Normalize by D, the reviewed room-prism diagonal. Numerical epsilon=max(1e-9,1e-7D); contact tolerance=.002D; floor gap above .005D requires correction; door approach zone extends .05D inward; all are versioned `idealized-fit-v1` policy values, not validated physical thresholds. Search 24 yaw values at 15-degree spacing, width/depth multipliers {1,1.15,1.30}, and no free per-vertex deformation. Use 2–98% support quantiles only as *visible* extents, derive category proportions as explicit priors, and require dimension review where support is flat/incomplete. Tie within 1% of best normalized score gives ambiguous-yaw review. Preserve explicit owner dimensions/yaw; never optimize them away.
  Fit score uses mean support distance/D and mean occlusion-aware silhouette disagreement, equal weight after each is bounded to [0,1]. Record per-view values, not a confidence probability. For source masks, exclude pixels demonstrably occluded by other nearer support; mark unknown coverage explicitly. Require review for visible IoU below .50 or center disagreement above .10 of that view's image diagonal. All soft fitting remains review-required for the first real room even above these provisional limits.
  Whole-face room containment uses `filter_boundary` with *all* object faces required inside; never clip objects. For M1's closed cuboid parts, use oriented-box separating-axis tests after AABB broad phase, not object-level box overlap. Allow same-object intended assembly contacts; reject cross-object interior overlap deeper than numerical/contact tolerance. Support checks identify contact but do not claim physical stability. SAM arbitrary meshes are not admitted through cuboid proxies later.
- [ ] **4. Run green:** P `test_idealized_fit.py`, P `test_geometry.py`. Freeze policy values before looking at real candidate results; preserve any later policy change as a new revision with new evaluation.

## Task 5: Assemble, revise and save an exclusive CPU candidate

**Files:** Finish `idealized_room.py`; create `test_idealized_room.py`, `test_idealized_io.py`; document CLI in `scripts/room_workflow/README.md` without claiming model completion.

**Interfaces:** `assemble(packet: dict, inventory: list, parent_revision: str | None) -> dict` returns IdealizedArtifact; `apply_correction(inventory: list, correction: dict) -> list` is pure; `write_candidate(directory: Path, artifact: dict) -> Path` writes exclusive bounded output. CLI: `idealized_room.py --input <bound-packet.json> --output <new-directory>`; stdout is a bounded JSON diagnostic, not geometry. Input is local-only and grants no execution/review authority.

Correction union: `set` with object ID plus explicitly allowed category/dimensions/translation/yaw/color fields; `omit`/`restore`; `split` with predecessor and observation partitions; `merge` with predecessor IDs; `add` with owner-authored source note and explicit dimensions/pose; `restore-revision` is broker-side, not arbitrary path input. Cap text notes at 1000 characters and correction requests at 65536 bytes. Existing IDs survive ordinary edits; split/merge assigns new IDs with predecessor lineage. No automatic re-ID from the observation hash.

- [ ] **1. Write failing tests:**
  ```python
  result = assemble(packet(), accepted_inventory(), None)
  self.assertEqual(validate_artifact(result, expected(result)), result)
  self.assertEqual(raw_before, raw_after)
  with self.assertRaises(FileExistsError):
      write_candidate(existing_directory, result)
  ```
  Add no-desk, explicit addition origin, omitted-object absence, neighboring object preservation, invalid corrections, split/merge lineage, repeat deterministic output, and parent/source changes. Inject interrupted write before manifest rename: no ready manifest may exist and bounded diagnostics/partial files remain. Reopen after geometry/provenance tampering must fail.
- [ ] **2. Run red:** P `test_idealized_room.py` and P `test_idealized_io.py`.
- [ ] **3. Implement assembly and durable output.** Build shell plus accepted complete objects only. Never copy the raw fragmented mesh into the idealized render payload. Record source observations represented and omitted/unresolved inventory. Generate non-overlapping component ranges after concatenation; enforce aggregate caps. Use exclusive candidate directories, bounded JSON reads and writes, flush/close before final atomic manifest rename, and preserve rejected output. Reopening recalculates full revision and geometry hashes. Worker output includes diagnostics but cannot set broker readiness or approve new objects on the owner's behalf.
- [ ] **4. Run green:** P `test_idealized_room.py`, P `test_idealized_io.py`; round-trip the real CLI through a temporary synthetic packet and the Node validator. Assert no network/model/acquisition entry point was called.

## Task 6: Add private broker lifecycle and correction persistence

**Files:** Modify `broker.mjs` around `createBroker`, `publicJob`, `persist`, `underJobLock`, recovery/expiry and HTTP action handling; create `broker-idealization.test.mjs`. Reuse `broker-completion.test.mjs` fixture/runner patterns, not its old A/B artifact validator.

**Interfaces:** Add optional injected `idealizationRunner(envelope,{signal,inputSha256,outputDirectory})` to `createBroker`; production uses the existing `EVA_ROOM_COMPLETION_PYTHON` interpreter and the Task 5 CLI. Endpoint `GET /api/room-workflow/jobs/:id/idealization` returns `{status,revision,loaded_revision,candidate,review_reasons}` after revalidation. POST to the same endpoint accepts a closed discriminated body with `action`, `expected_revision` and action-specific data for `prepare`, `correct`, `review`, `undo`, `cancel`. `review` includes exact candidate/source/boundary/inventory hashes and explicit decisions; it is a host-owned user action, never an imported worker field.

Add `POST /api/room-workflow/jobs/import-idealization` with exactly `{source:'retained-seven-photo-room', expected_source_sha256:<digest>}`. Resolve this sole M1 source through a server-owned fixed catalog, never a client path/URL. Return `{job_id,revision:null}` for a new private owner-bound review job. Snapshot/revalidate retained originals, the original validated analysis and the separate WorldMirror binding; do not pass the benchmark's display-only result through the old worker validator or fabricate a completed inference. Imported review jobs cannot start model/Shado actions. Their boundary/opening/inventory decisions belong to the idealization sidecar, in its named frame, without changing old A/B results. Initial `prepare` requires `expected_revision:null`; subsequent mutations require the current revision. `review` accepts `{candidate_revision,source_sha256,boundary_sha256,inventory_sha256,decisions}`; boundary/opening edits are bounded review data, produce a new assembly revision and invalidate prior confirmation. `undo` accepts a retained revision hash, not a path; `cancel` grants no new execution.

- [ ] **1. Write failing tests:**
  ```js
  assert.equal(staleCorrection.status, 409);
  assert.equal((await getIdealization()).loaded_revision, previousRevision);
  assert.deepEqual(jobAfter.result, jobBefore.result);
  assert.equal(jobAfter.status, jobBefore.status);
  ```
  Define HTTP test helpers in this file using `makeSyntheticAnalysis` and the Task 1 idealization fixture. Cover fixed-source import with exact hashes, rejected client paths/unknown sources, no inferred model permission, owner mismatch, expired job, unknown action/extra authority field, changed source/review during worker run, two concurrent corrections, failed update, sidecar-only cancel, broker restart and GET tampering. A worker's forged `ready` bit must reject. Undo must append a new revision, not resurrect old execution authority.
- [ ] **2. Run red:** `node --test scripts/room_workflow/broker-idealization.test.mjs`.
- [ ] **3. Implement additive sidecar state.** States are `not-started`, `preparing`, `needs-review`, `ready`, `failed`, `cancelled`, while retaining `loaded_revision`. Only successful host review of the exact artifact can promote needs-review to ready; hard geometry errors cannot be waived. One active operation per job: existing job-keyed slots must reject concurrent Shado/completion work, not race it. Under `underJobLock`, reload, compare revision/source/review, validate, then persist; atomic file writes alone are not sufficient.
  Use sidecar cancellation that aborts its owned local worker without whole-job/Shado cancellation. Retain request, partial, rejected and prior admitted artifacts instead of the completion runner's temporary-file deletion. Exclude large/private sidecar data from `publicJob` rest-spread. Add root-contained private candidate-directory expiry cleanup: abort/settle owned work first, retain unresolved cleanup receipts until resolved, then apply the job's deletion policy. No symlink traversal or deletion outside the job directory.
- [ ] **4. Run green:** `node --test scripts/room_workflow/broker-idealization.test.mjs scripts/room_workflow/broker-completion.test.mjs scripts/room_workflow/broker-recovery.test.mjs scripts/room_workflow/broker-shado-v2.test.mjs`. Include the actual CPU CLI integration using the existing environment; report environment skips explicitly.

## Task 7: Admit the saved benchmark sidecar without changing model arms

**Files:** Modify `benchmark.mjs`, `benchmark.test.mjs`; add a fixed private `idealized-room-v1/` candidate location through the existing private-root pattern. No HTTP-write route for benchmark files.

**Interfaces:** `loadBenchmark(folder, completionFolder, profileId, ...)` keeps returning `{payload, photos}` and adds optional validated `payload.idealization` and `payload.idealizationError`. `payload.photos` contains public original IDs/hashes/URLs; outer `photos` contains private original bytes. Existing geometry remains at `payload.result.arms.A.geometry`. `benchmarkResource` serializes the admitted payload only; no new arbitrary asset route is needed for embedded geometry. Candidate selection is separate from estimator profile and raw/fused/completed variants. Reuse `validateIdealizedResult` from Task 1 with trusted same-photo bindings.

- [ ] **1. Write failing tests:**
  ```js
  assert.equal(result.payload.idealization.mode, 'idealized');
  assert.deepEqual(result.photos, baseline.photos);
  assert.deepEqual(result.payload.photos, baseline.payload.photos);
  assert.deepEqual(result.payload.result.arms.A.geometry, baseline.payload.result.arms.A.geometry);
  assert.equal(writeRequest.status, 405);
  ```
  These assertions use the actual `{payload, photos}` loader return; compare the public ordered originals and private original bytes as well as old model geometry. Also test missing sidecar, changed boundary/source, forged model identity, unknown path/profile, and sidecar change without baseline-file mtime change. Missing/rejected sidecar must leave original viewer data available, not silently substitute the authored aesthetic study.
- [ ] **2. Run red:** `node --test scripts/room_workflow/benchmark.test.mjs` with the new named cases.
- [ ] **3. Implement bounded read-only loading.** Keep `validateCompletion` and profile whitelist semantics unchanged. Include every sidecar dependency in cache invalidation and validate full source/revision hashes on reload. Bind any owner review record to the exact artifact, not an editable `boundary_confirmed:true` field. Synthetic fixtures use explicitly synthetic review records; actual review must come from the owner.
- [ ] **4. Run green:** same command plus `idealized-result.test.mjs`; verify GET-only benchmark behavior and no API execution/model call.

## Task 8: Shared idealized review and viewer continuity

**Gate:** Do not edit frontend files before a fresh scoped Weave packet is generated/inspected and approved within a new finite allowance, or an explicit current-pass waiver. Do not start the memory-stopped server without being asked. Neither gate is satisfied by this plan.

**Files:** Create `week4/app/src/room/idealized-room.ts`, `IdealizedReview.tsx`, `week4/app/tests/idealized-room.test.ts`, `week4/app/scripts/verify-idealized-room.mjs`; modify `CandidateView.tsx`, `BenchmarkRoom.tsx`, `UploadRoom.tsx`. Reuse house forms/styles and existing browser helpers; do not add CSS unless a demonstrated requirement cannot use existing classes.

**Interfaces:** `objectIdForFace(components: Component[], faceIndex: number): string | null`; optional `CandidateView` props `components`, `selectedObjectId`, `onSelectObject`. `IdealizedReview({candidate,status,selectedObjectId,onSelectObject,onCorrect,onReview,onUndo,onCancel})` is a shared controlled form, not another data store. `onCorrect` emits Task 5's closed correction union; UploadRoom owns the async POST/revision state. Benchmark is read-only and exposes source/identity details, with corrections handled through a private imported review job rather than benchmark writes.

- [ ] **1. Write failing tests:**
  ```ts
  assert.equal(objectIdForFace(components, firstChairFace), 'chair-1');
  assert.equal(objectIdForFace(components, firstShellFace), null);
  assert.equal(objectIdForFace(components, -1), null);
  ```
  Browser tests assert selected object ID, actual GPU view-matrix tolerance <=1e-5 across same-frame switches, retained contrast/source selection, stable loaded identity during error, and a correction's survival after reopen. Add black-furniture enhanced/source toggle with identical geometry hashes, boundary/frame reset, keyboard object list, focus on errors, touch layout and WebGL recovery. No source/model request may occur when merely switching representations.
- [ ] **2. Run red:** `node --test week4/app/tests/idealized-room.test.ts`; run the new browser assertions against the unchanged viewer only when a user-authorized server is available. Preserve the expected missing-control failure.
- [ ] **3. Implement the smallest shared controls.** Add Evidence/Idealized room selection without inventing arm C or repurposing B. Extend provenance text and mapping explicitly for the new origins; keep hollow cues and source/contrast behavior. Use component face ranges for raycast selection and the same object list for keyboard/touch. The ordinary old callers need no new props. Avoid remounting on same-frame upload selection; preserve existing reset behavior on actual frame/job changes. Render needs-review vs ready separately from quality acceptance. Corrections use bounded fields, optimistic concurrency and explicit error/retry; no regeneration on every keystroke.
  Use Task 6's `POST /api/room-workflow/jobs/import-idealization` to import the fixed retained source into a private review job; the UI sends only the fixed source ID and expected digest, never a filesystem path. Reuse the normal review controls to obtain missing boundary/inventory decisions. Task 9's local evidence-freeze step saves an exclusive copy of the admitted candidate and host-bound review record into Task 7's fixed location; browser requests never write the benchmark. A saved review cannot authorize model execution.
- [ ] **4. Run green:** app unit test, `npm.cmd run typecheck`, the new browser script and existing `verify-arkit-profiles.mjs`/`verify-room-review.mjs` into fresh evidence directories. Record viewport/DPI and source snapshots; no native/physical-phone claim from emulation.

## Task 9: Freeze, assemble and review the real first room

**Files:** Create actual evidence under `docs/design/revisions/idealized-room-v1/` and `docs/design/acceptance/idealized-room-v1.md`; update `PLANNING.md`, `docs/design/INDEX.md` and relevant README/research status only to match observed results. Private inputs/candidates stay under `.local/`, not public fixtures.

**Interfaces:** Use Tasks 2–8 without alternative hand-authored benchmark geometry. Record original hashes, parent/raw/fused hashes, review IDs, inventory/correction records, policy revision, source hashes and actual CLI/browser commands.

- [ ] **1. Run the real-input prerequisite check.** Freeze the seven originals and retained suggestion identities; verify boundary/frame conversion and ask for the actual missing room/inventory review through Task 8. A draft is allowed, but absent confirmation must leave needs-review. Do not fabricate a complete inventory to meet this milestone.
- [ ] **2. Assemble to a new exclusive candidate directory.** Run the Task 5 CPU CLI using retained artifacts only. Validate through Python and Node; raw hashes must remain unchanged. Retain every rejected fit and omission. No detector, WorldMirror or SAM run is implicitly allowed.
- [ ] **3. Capture the owner exercise.** Same cameras/settings for Evidence and Idealized room; include surface and high-contrast point views, reverse-side object views, provenance, correction/undo/reopen and failures. Freeze views before evaluating candidate quality, not after searching for flattering angles. Label in-sample and genuinely withheld evidence separately.
- [ ] **4. Run complete verification.** Commands below: full Python room suite, root `room:test`, `test`, `typecheck`, `build`, three browser regressions and `git diff --check` on owned files. Report each failure, warning and skip accurately. Finish with independent read-only review of the whole scoped change, not unrelated shared edits.
- [ ] **5. Record owner acceptance as pending until explicit review.** Acceptance must answer: recognizable layout, complete major objects, acceptable substitutions, no doubled fragments or wall penetration, readable dark furniture, and usable corrections. A script pass cannot make this decision.

## Task 10: Prepare independent SAM and automatic-upload follow-ups

This task produces bounded follow-up plans, **not model execution**. M1 can remain useful while these are blocked. No speculative SAM files are added to production.

**Files:** Update the existing `docs/research/WORLDMIRROR_SAM3D_COMBINATION.md`/`GENERAL_ROOM_COMPLETION.md` with actual new findings. Create separate plan files only when their prerequisites have been inspected, not empty placeholders.

**Interfaces:** Later SAM uses SourceBinding, ObjectSpec, raw mesh/decoded pose admission and the same review/lifecycle; it must implement actual mesh collision/containment, not M1 cuboid approximation. Later automatic-upload pipeline uses current job sources and normal automatic detector suggestions, never benchmark fallback data.

- [ ] **1. Prepare the SAM access/config decision.** Through an authorized secure channel, inspect pinned manifest/config and dependencies; do not download checkpoints, accept licenses, print credentials or infer cloud readiness. If access/config is unavailable, record the blocker and stop this follow-up only.
- [ ] **2. Write a one-object SAM implementation/execution plan for separate review.** Exact source/checkpoint/config/asset hashes; selected original/mask/pointmap; model-load parity tests; raw decoded pose and color-semantics checks; GPU/build resources, timeouts, cost arithmetic and maximum output; one attempt and no automatic retry; owned cleanup and preserved partial/rejected results. List failure tests proving prior procedural candidate survives rejected/generated output, invalid singleton ranks and late cancellation. Quote resources only after inspection; no made-up runnable price here.
- [ ] **3. Write the automatic-upload/transfer plan for separate review.** Own-current-job detector/mask stage, automatic identity/inventory population, correction only as needed, empty/no-desk/unsupported categories, actual upload privacy/execution consent and finite per-stage approvals. Freeze independently selected room/view sets before generation. Include one real normal-path upload and room 45261631 only if it meets input/boundary requirements; no claim of transfer from synthetic cases.
- [ ] **4. Review the follow-up boundaries with the owner.** Passing M1 is not permission for either run, arbitrary downloads or Shado replacement. Retain current source pins as research until a new executable plan is approved.

## Commands and checkpoints

All commands run from the repository root. In PowerShell, **P `<pattern>`** above expands to:

```powershell
& ".local/reconstruction/venv/Scripts/python.exe" -X utf8 -m unittest discover -s scripts/room_workflow -p '<pattern>' -v
```

Full checks after code changes:

```powershell
& ".local/reconstruction/venv/Scripts/python.exe" -X utf8 -m unittest discover -s scripts/room_workflow -p 'test_*.py'
npm.cmd run room:test
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Browser checks, only after the user requests starting/restarting the viewer and its other prerequisites are satisfied; each output directory must be new:

```text
node week4/app/scripts/verify-idealized-room.mjs <fresh-evidence-directory>
node week4/app/scripts/verify-arkit-profiles.mjs <another-fresh-directory>
node week4/app/scripts/verify-room-review.mjs <another-fresh-directory>
```

Every task ends with its actual test output and a scoped diff/source-hash checkpoint, **not a commit**. Red means the asserted missing behavior fails; an environment crash is not a valid red. Do not rewrite retained evidence or run a failed paid task again as a test.

## Spec coverage and self-review

- Spec §§1–3, first-room outcome/reuse: Tasks 1–3, 7 and 9.
- §4.1 source/frame integrity: Task 2; §4.2 automatic inventory and corrections: Tasks 2, 5, 6, 8, with actual automatic rollout deferred explicitly to Task 10.
- §§4.3–4.5 architecture, complete objects and joint placement: Tasks 3–5.
- §4.6 SAM: Task 10's separately reviewed plan; no false claim of SAM delivery in M1.
- §§5–6 contracts, persistence, cancellation, revisions and correction: Tasks 1, 5 and 6.
- §7 display, selection and accessibility: Tasks 7–8 with fresh visual gate.
- §§8–10 files, release gates and evidence: all tasks; Task 9 owns final regression, independent review and actual owner exercise.
- §11 blockers: Task 2/9 boundary and inventory review; Task 10 secure SAM configuration; all geometric metrics remain relative and quality acceptance explicit.

Self-review performed while authoring: signatures and origin enums align between tasks; every Review Focus item has an owning regression; old worker validators remain unchanged; code bodies are deferred to execution; no step grants a paid allowance. Generalized automatic upload and SAM execution are intentionally separate plans, not omitted M1 functionality.

## Approved M1 continuation — 2026-10-21

The owner selected the decisions recorded in [current scope](../../../PLANNING.md#demo-scope-and-approved-next-work--2026-10-21). Prepare the retained-room automatic inventory and preserve explicit user-authored additions for the 2026-10-22 visual demo. General uploads and SAM are deferred; new backend changes are not covered by the earlier accepted fingerprint. No frontend edit or service restart is authorized yet.

### Unexecuted Weave proposal

- **Design question:** a quiet room comparison with Evidence / Idealized switches, plus a separate private authoring view for reviewing proposals, correcting one object and adding a user-authored item. The public presentation stays free of technical dashboards; private controls retain exact review/provenance and errors.
- **Bounded pass:** shared M1 comparison, selection/review and Add item controls using existing house components. Keep the five procedural categories, explicit size/position/color and authored-source note. Preserve camera/selection during same-frame switching, keyboard/touch access, clear failure/needs-review states and existing reduced effects. No new animation; motion work would need a separately scoped video reference.
- **Reference deliverable:** one static image with three clearly separated panels: desktop comparison, private authoring/Add item state, and narrow-screen authoring. Generic illustrative room only; no uploaded private photographs, raw geometry or source artifacts. This reference is UI guidance, never reconstruction evidence.
- **Observed route:** official Figma Weave `weave_find_model` resolved GPT Image 2.5, model ID `2db90e64-51dd-45b2-870a-66d19a81118e` (`gpt-image-2.5`), on 2026-10-21. Its catalog estimate is **8 credits**. Account/workspace execution eligibility and final quote remain unverified.
- **Proposed settings:** `model: Flare`, `quality: medium`, `background: opaque`, `image_size: landscape_16_9`, `output_format: png`; prompt-only input, no images or mask. One generation attempt, no automatic retry. Proposed ceiling **8 credits**; a higher actual quote blocks submission and requires a new decision. This is a proposal, not an approved charge or dollar equivalent.
- **Prompt intent:** “Design a restrained memory-palace room interface on black, with sparse ordered pixel marks, fine contours, source-derived room colors and hollow marks for inferred objects. Show three clearly separated static reference panels: minimal desktop Evidence/Idealized comparison; separate private authoring with a source-linked proposal list, selected-object correction and Add item fields for category, dimensions, placement, color and a user-memory note; narrow-screen authoring with reachable controls. Retain Space Grotesk/IBM Plex typography, visible keyboard focus, explicit needs-review/error states and readable controls. User-added items are labelled authored, not detected. No progress theatrics, new animation, external brands or invented claims of reconstruction accuracy.”
- **Before any UI edit:** approve the finite generation, verify the actual quote/connected account, run once and inspect the actual output. Record run IDs/cost/settings, image/contact sheet and guidance under `docs/design/revisions/idealized-room-m1-v1/`. Capture the current before-state only after a separately authorized server restart; preserve all results including rejected output. No packet or inspected-reference claim exists yet.

G2-B memory inspection on 2026-10-21 observed 31.71 GiB total / 3.06 GiB available physical RAM. This is a point-in-time reading, not a leak diagnosis or restart approval. Keep services stopped. G6-A initially stopped before worker launch: 1,560,379,392 bytes available versus the 2,952,790,016-byte prerequisite. After headroom recovered, the single synthetic-object full-search calibration ran within the unchanged limits: **9.500 seconds**, **269,246,464 bytes sampled process-tree RSS**, **3,765,940,224 bytes minimum available memory**, exit 0. Limits were 60 seconds, 768 MiB sampled worker-tree RSS, 2 GiB available-memory floor, 0.1-second sampling and numerical-library threads requested as 1. Sampling can miss transient peaks/count shared pages twice; this is not an OS-enforced CPU quota, actual-room calibration or 64-object/multiworker capacity evidence. No service restart or unrelated process termination occurred.

### Retained inventory integration gap

Read-only source mapping confirmed that owner-authored additions already use the existing `add` correction and retain owner-only provenance. Reuse that path, not another add-object implementation. The missing automatic step is proposal-to-inventory derivation: existing `associate` conservatively groups observations, while `fit_inventory` requires complete numeric objects and does not create them.

Do not put null dimensions into the renderable-object schema, choose ambiguous identities silently, borrow benchmark furniture, or hide unsupported/unplaced observations. The remaining integration must retain a source/boundary/revision-bound draft ledger, turn only supported numeric hypotheses into review-required procedural objects, and require explicit resolution/omission of other drafts before readiness. Both private review and benchmark sidecar admission must bind those decisions. An empty explicit inventory must continue to mean no furniture, not automatic selection. The preview/provenance slice is now implemented as `idealized_prepare.py --draft-only`: it reuses source admission, retains every observation, derives only supported numeric proposals and writes an exclusive source/room/revision-bound draft ledger without fitting, assembly, candidate manifests or readiness. Synthetic derivation and real CLI-to-saved-file tests have passed. The draft is deliberately not accepted by candidate validators or broker preparation. The **promotion contract remains unimplemented**: exact per-draft resolution/omission, correction/undo binding and private/sidecar review must be connected before automatic candidate readiness. Neither this preview nor source discovery closes G4-A or completes M1.

The authenticated read-only `/api/room-workflow/idealization-source` endpoint now supplies the current fixed-source import hash and unconfirmed room/photo descriptors without a CPU worker or private source payload. Its continuation evidence is separate from the accepted backend fingerprint.

## Execution decision

Recommend **Native** execution for Tasks 1–9: their frame/contract/revision interfaces are tightly coupled, so one implementer avoids repeated context transfer, followed by a fresh independent review of the entire scoped change. Alternatively choose **Subagent-driven**, with fresh per-task implementation/review and isolated writers, at higher context cost.

Owner decision: **Native execution approved on 2026-10-21**. The CPU/backend tranche through Tasks 6–7 is implemented and has completed integrated read-only review plus a RED→GREEN fix pass; [verification and limitations](../../design/acceptance/idealized-room-backend-v1.md) records the exact evidence. This is not full M1 completion: automatic initial inventory population, shared viewer controls, real-room review and acceptance remain pending. Task 8 is blocked by its fresh approved Weave packet and server-restart gate; Task 9 additionally needs actual boundary/inventory decisions. Task 10 can inspect and document independent follow-up prerequisites offline but cannot claim authenticated SAM configuration or authorize execution. Unchecked task steps are not blanket completion claims.
