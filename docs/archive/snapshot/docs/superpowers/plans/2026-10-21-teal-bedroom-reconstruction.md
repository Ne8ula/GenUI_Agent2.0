# Teal Bedroom Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans after owner approval of this plan. Retain the owner's Native execution preference; do not ask them to select it again. Tasks use checkbox steps. No automatic commits, publishing, downloads, model execution or service restarts.

**Goal:** Produce a source-faithful, scan-assisted reconstruction of ARKitScenes 45261631 with separately reviewable objects, photographic surface detail and an optional matrix view.

**Architecture:** Inspect and import the supplied scan before reconstructing or generating anything unnecessarily. Keep scan-assisted assets in their own closed contract, reuse existing geometry, source binding, private review lifecycle and renderer, and complete only objects whose observed geometry is inadequate. The older RGB-only candidates and their validators remain separate.

**Tech Stack:** Existing Python 3.12/NumPy/Pillow/Open3D CPU environment; JSON Schema Draft 2020-12, Node/Ajv, React/TypeScript/Three.js. Existing cloud transport only after a separately approved pinned execution plan.

**Spec:** [Approved bedroom design](../specs/2026-10-21-teal-bedroom-reconstruction-design.md), owner-approved 2026-10-21. **Owner approved this plan and Native implementation on 2026-10-21.** Acquisition, real-processing, visual and paid-execution gates below remain separate. No elapsed-time, model-quality or completion promise is made.

## Global constraints

- Preserve shared dirty `midterm` work at inspected base `c83fd4c04ca170ed38311b94cdcdebec779051b7`; a base commit does not reproduce untracked working files. Snapshot task-owned file hashes. Do not reset, stash, clean, switch branches, commit or publish.
- Target **45261631**, never substitute 42445021's geometry, transforms, masks, inventory or review. Preserve the older room and its tested checkpoint.
- Supplied scan/depth/poses may condition this **scan-assisted** candidate. They remain forbidden inputs to RGB-only inference. Dataset reconstruction, RGB-D fusion, generated geometry, authored closure and owner additions have distinct origins.
- Preserve photographic layout/design; generated hidden geometry is plausible completion, not recovered truth. No fabricated inventory. Every reviewed item needs a representation or an explicit unresolved/omitted disposition, including visible small items.
- Detailed photo-textured surfaces are the new candidate default; matrix is optional and uses the same geometry. Preserve camera, selection, review history and source inspection. Do not hide geometric defects with point sparsity.
- No new rendering engine, provider registry, arbitrary remote assets, runtime-generated code or generalized workflow system. Reuse existing helpers only when their input/coordinate/provenance contracts actually fit.
- New UI work requires a fresh scoped Weave packet or explicit waiver for this textured-bedroom pass. The previous inventory-authoring reference and consumed two-credit allowance do not automatically cover it. No new motion.
- Generation/model acquisition stays cloud-only, with pinned code/checkpoints/licenses, source upload scope, resource limits, finite cost approval, one-attempt policy and confirmed owned-work cleanup. No local GPU/model installation, credentials in chat, automatic retries or inherited allowances.
- Model/worker output never grants readiness. Host-owned exact source/frame/inventory/review revisions do. Save immutable candidates; commit the manifest last, preserve failed output and reject stale late results. Undo restores presentation, not authority or spending.
- Preserve general-upload hold and the separate pending Shado comparison. Owner quality acceptance remains pending until a reproducible actual-room exercise.

## Plan boundaries and known starting state

This is an **offline implementation plan with explicit real-data checkpoints**, not permission to run the listed acquisition/model/browser commands. Approving implementation permits synthetic checks and code changes; separate source acquisition/real-processing, visual and paid gates below must be met before their side effects.

Actual inspection: the room has six prepared RGB inputs/two withheld images locally; no executed EVA bedroom result was found in the checked locations. Apple asset headers confirm a 24.8 MB supplied mesh, calibration, trajectory, low/high-resolution depth, confidence and visit-level laser scans. Their contents/quality remain uninspected. Existing `CandidateView` supports vertex colors, not photo textures or stable object picking. Existing source routes and idealization admission hardcode the older room. The old draft-promotion work has two known failing tests because `resolve_inventory` is missing; do not delete, skip or conceal them.

**Ruling:** Finish only that already-tested pure resolver as a shared-worktree prerequisite (Task 1); do not finish the old-room promotion/UI project. This small repair permits meaningful full-regression checks while preserving unfinished work.

## Resource and evidence policy

These are proposed initial safety bounds, not measured capacity or accuracy claims. A limit violation stops the stage; it never silently truncates, downloads a larger source or expands an allowance.

| Stage | Bound / check |
| --- | --- |
| First source inspection | New private directory; mesh ≤32 MiB; metadata/annotation/trajectory ≤2 MiB each; ≤128 MiB aggregate transfer; no full RGB or laser archive |
| Additional calibrated inputs | Separate bounded acquisition packet: ≤384 MiB transfer for lowres depth/confidence/calibration and selected RGB; highres depth and each laser scan require separate escalation |
| RGB sampling | ≤24 admitted conditioning views; retain the two earlier withheld identities; existing bounded ZIP range reader, ≤32 MiB RGB transfer; no automatic full-archive fallback |
| Archive safety | Retain existing per-member/expansion/path/link/CRC checks; input directory exclusive; source hashes and frozen ETag/length required; one attempt, partial files preserved |
| Local real-data inspection | One CPU process, numerical threads 1, ≤150 seconds, ≤768 MiB sampled process-tree RSS, ≥2 GiB available-memory floor; require headroom before launch; synthetic tests separate |
| Heavier source processing | Do not extend the local deadline/RSS silently. Prepare a finite cloud CPU/GPU processing plan if the source cannot fit this envelope; model execution always cloud-only |
| Display candidate | ≤200,000 vertices **after UV seam splits**, ≤400,000 triangles, ≤64 object records, metadata ≤16 MiB, candidate JSON + encoded texture files ≤64 MiB |
| Textures | Local PNG/JPEG only; ≤8 atlases, each ≤2048×2048; ≤128 MiB total decoded RGBA base levels; include mipmaps and temporary arrays in measured browser memory; no unbounded embedded data URLs |
| Raw PLY inspection | File bound before parsing; bounded header; ≤1,000,000 vertices/2,000,000 faces; finite numeric fields, safe index ranges and supported element layout; larger assets stop for a revised plan |

Geometry safety: reject nonfinite coordinates, invalid/degenerate triangles, unknown ownership/material/provenance, mixed-object triangles and outward room-boundary crossings. Keep whole-face concave containment from `geometry.py`; do not use vertex-only containment. Legitimate object contacts must not be rejected merely because bounding boxes overlap.

Initial **review bands**, frozen before real fitting: RGB/depth timestamp mismatch >5 ms rejects pairing; missing/tied nearest poses reject instead of taking an arbitrary last match. Reprojection round-trip error ≤0.5 pixel. Source-visibility depth test uses `max(0.02 m, 0.01 × depth)`; exceedance means no supported texel/face assignment, not permission to stretch geometry. These are engineering admission bands, not claimed sensor accuracy; calibration failure stops and produces a dated policy revision before further fitting. Report actual residuals and missing coverage, not an invented confidence score.

## Review focus

1. **Coordinate mismatch:** 90° rotated RGB, different sensor intrinsics, axis-angle trajectory and depth in millimeters. Task 3 pins a nonidentity synthetic scene and rejects simple resizing as an unverified alignment.
2. **False object separation:** overlapping cabinet boxes, pillows touching a bed and a triangle spanning two identities. Task 4 retains ambiguous faces as unresolved evidence and prevents duplicate replacement/removal of neighbors.
3. **Texture leakage:** a cabinet photo projected onto a wall, atlas bleed, unknown UV/material references and a replacement at the same path. Tasks 2/5/6 bind assets and test depth/normal visibility, padding and cache identity.
4. **Evidence leakage:** supplied scan or texture reference relabelled as RGB-only inference, or conditioning scans used as independent evaluation truth. Tasks 2/3/6 reject relabelled artifacts and label diagnostics explicitly.
5. **Resource/continuity failure:** UV splits exceed old limits, late image decoding attaches stale textures, interruption loses selection or cancellation admits a late result. Tasks 5–7 test actual lifecycle and browser behavior; no success inferred from a fixture alone.

## Files and interfaces

New units below each own an actual responsibility; do not split them further unless implementation reveals a distinct job.

| Unit | Responsibility |
| --- | --- |
| `scripts/room_workflow/scan-room.schema.json`, `scan_contract.py` | Closed source/candidate schemas, geometry/asset semantics, exact review and full revision sealing |
| `scan_source.py` | Bounded source plan/acquisition/inspection, calibration, named coordinate conversion and input manifest |
| `scan_objects.py` | Source-linked object observations, association, exact inventory decisions and face ownership |
| `scan_room.py` | Derived scan assembly, correction, save/reopen and verification CLI |
| `scan_texture.py` | Visibility-tested source texture atlas and bounded UV seams |
| `scan-assisted.mjs` | Scan-specific Node admission and fixed source/texture resources, not another server |
| `cpu-review-worker.mjs` | Extract the existing bounded subprocess invocation once, used by old and scan paths |
| `scan_fixture.py`, `scan-fixture.mjs`, `test_scan_*.py`, `scan-assisted.test.mjs` | Small synthetic calibration/object/texture fixtures and cross-runtime rejection tests |

### Closed data contracts

`ScanSource` has `kind: 'eva-scan-source-v1'`, `version: 1`, `capture_id`, exact source assets `{id,role,path,bytes,sha256}`, ordered RGB/depth/confidence/calibration/pose references, input/evaluation roles, registration policy and reversible frame binding. No model permission/readiness field. An inspection report is not yet an admitted `ScanSource`; registration must establish conventions and units first. Maximum 128 source asset records and 24 conditioning views; evaluation views are separate and never silently added to conditioning.

`ScanCandidate` has `kind: 'eva-scan-room-v1'`, `mode: 'scan-assisted'`, `units: 'm'`, source/frame/parent/inventory/review bindings, geometry, object/component records, local material/texture references, source-fragment assignments, diagnostics, implementation hash and full revision. Source/frame hashes and the private host's expected review are passed separately to admission. Closed origins: `dataset-reconstruction`, `rgbd-fused`, `generated-completion`, `authored-room-shell`, `authored-door-cap`, `authored-window-cap`, `owner-authored-addition`. A supplied mesh is a dataset reconstruction, not per-face certified LiDAR measurement.

Geometry retains `{positions,colors,indices,provenance}` and adds `uvs` (two finite values per vertex in [0,1]), `face_object_ids` (object ID or null for shell), and `face_material_indices` (-1 for explicit vertex-color fallback). Face counts agree exactly. `objects` include stable ID, source refs, optional parent/lineage, transform, representation origin and unresolved reasons; parent and child cannot both claim the same active source faces. Assets are addressed by validated local IDs, not model-supplied URLs. Preserve legacy `geometryHash`; it does **not** cover UVs/provenance/materials. Full scan revision binds all fields and referenced bytes using existing typed digests.

---

## Task 1: Establish a truthful baseline and finish the interrupted pure resolver

**Files:** modify `scripts/room_workflow/idealized_sources.py`; existing `test_idealized_inventory.py`, `test_idealized_sources.py`; task ledger in session scratch. Do not change old-room broker/UI or accepted fingerprint manifest.

**Interface:** `resolve_inventory(draft, expected_revision, decisions) -> (inventory, review)` as already required by the two retained tests. It does not fit, assemble, grant readiness or write files.

- [x] Run existing focused tests first; record the two missing-function errors if still present. Recheck concurrent edits before writing.
- [x] Implement exact current-revision/coverage checks, accepting only `accept`, `resolve`, `omit`; reject duplicate/missing/unknown decisions and authority fields. `accept` requires a proposed item. `resolve` requires the full explicit owner object/note, preserving observation IDs and owner-origin priors. `omit` preserves a nonempty reason and source IDs. Reuse `_inventory`, `digest`, size checks and existing schema.
- [x] Confirm existing assertions: accepted inventory equals the draft; all a/b/c observations survive review; missing dimensions/note, altered boundary, stale hash and unresolved acceptance raise `ValueError`. Add one nonmutation assertion and invalid-number/oversize rejection if absent.
- [x] Run focused tests and the full Python suite; record counts and all failures. Stop treating the baseline as green if other failures appear. No old-room promotion follows.

Run: `.local/reconstruction/venv/Scripts/python.exe -X utf8 -m unittest discover -s scripts/room_workflow -p test_idealized_inventory.py`, then `-p test_*.py`. Expected: focused missing-function failures first, then zero failures; existing environment skips reported separately.

## Task 2: Add the separate scan contract, source acquisition plan and inspection

**Files:** create `scan-room.schema.json`, `scan_contract.py`, `scan_source.py`, `scan_fixture.py`, `test_scan_contract.py`, `test_scan_source.py`. Reuse unchanged `arkit_fetch.download/extract`, `idealized_contract.digest`, `complete_candidate.geometry_hash`; do not weaken RGB-only validators.

**Interfaces:** `validate_scan_source(value) -> dict`; `validate_scan_candidate(value, expected) -> dict`; `plan_source(video_id, split) -> dict`; `acquire_source(plan, output_dir) -> Path`; `inspect_source(manifest_path) -> dict`. CLI: `scan_source.py plan|fetch|inspect` with fixed-source plan file and explicit new output directory, never arbitrary HTTP file paths.

- [ ] Write synthetic tests: `test_scan_contract_rejects_rgb_only_relabel`, `test_revision_binds_uv_provenance_and_texture_bytes`, `test_source_acquisition_is_exclusive_and_bounded`, `test_ply_header_caps_before_native_parser`, `test_changed_source_during_inspection_rejects`. Assert `capture_id == '45261631'`, rejected unknown `approved/ready` keys, exact budget boundary acceptance and +1 rejection, unchanged earlier output and retained interrupted `.part`.
- [ ] Run those tests RED, then implement closed schemas and cheap byte/header/shape caps before array/native decoding. Bind source asset roles and hashes; reject links/junction escapes, redirects, duplicate/case-conflicting paths, mutable source races and unsupported PLY layouts. No permissive unknown-property fallback.
- [ ] Prepare a source-only acquisition plan for license, metadata, mesh, annotation, trajectory and required calibration. Pin Apple code revision `474aaa83d7b1c9080619d8485de2d7c885c01fc5`; retain URL/ETag/length and actual transfer hashes. HEAD evidence alone is not integrity verification.
- [ ] **Real-data gate:** present the exact ≤128 MiB acquisition/inspection packet for approval. After approval only, fetch and inspect in `.local/reconstruction/arkitscenes/45261631/scan-source-v1/`. If missing attributes or geometry exceed bounds, retain evidence and stop—no implicit large-scan escalation.
- [ ] GREEN: contract and source tests; full Python suite. Record actual source content limitations separately from synthetic checks.

Run each RED/GREEN file with `.local/reconstruction/venv/Scripts/python.exe -X utf8 -m unittest discover -s scripts/room_workflow -p test_scan_contract.py` and `-p test_scan_source.py`.

## Task 3: Calibrate scan/RGB-D and freeze the bedroom frame

**Files:** modify `scan_source.py`, `vga_rgb_range.py`, their tests; create `test_scan_calibration.py`. Reuse `worldmirror_adapter.camera_to_world/world_to_camera/project` only after converting to their documented OpenCV convention; reuse `arkitscenes.prepare` for RGB identity, not its evaluation-only metadata as a scan permission.

**Interfaces:** `register_scan_inputs(manifest, selected_views, policy) -> ScanSource`; `unproject_scan_depth(depth_m, intrinsics, camera_to_world) -> (points, valid)`; `RangeSource(archive=None)` keeps the old frozen archive as default and accepts one validated `{video_id,split,url,bytes,etag}` descriptor for the new source. `directory(source)` uses that instance's bound metadata, not global mutations.

- [ ] RED: `test_axis_angle_world_to_camera_is_inverted_once`, `test_rotated_rgb_calibration_round_trip`, `test_millimeters_and_zero_depth`, `test_nearest_pose_five_ms_gate_and_ties`, `test_vga_depth_alignment_requires_calibration`, `test_range_source_preserves_old_default_and_rejects_foreign_members`. Assert a nonidentity translated/rotated fixture recovers known metric points to 1e-6 m and projects within 0.5 pixel; swapped axes, stale intrinsics, 6 ms gaps and ties reject. Never resize depth alone to match RGB.
- [ ] Implement timestamp association, unit conversion, supplied-pose parsing and exact image-grid transforms. The inspected Apple loader inverts world-to-camera extrinsics and divides depth by 1000; its last-match fallback and fixed padding are not reusable calibration guarantees. Verify the pinned official loader and archive calibration against actual selected assets. Missing registration yields an inspection report, not an admitted metric frame.
- [ ] Freeze up to 24 coverage-selected conditioning views; retain prior withheld identities. If supplied whole-scene mesh may include withheld views, label those diagnostics **not independent**. Do not call scan-conditioned reconstruction photo-only.
- [ ] Acquire lowres depth/confidence and selected RGB only through a separate approved ≤384 MiB packet. Use exact range requests, CRC/decompression caps and no full-archive fallback. Optional highres/laser data stays deferred until a written coverage deficit justifies it.
- [ ] GREEN: calibration/source/range tests and legacy ARKitScenes tests. Actual calibrated room boundary remains owner-review-required.

Run: Python discover with `-p test_scan_calibration.py`, `-p test_vga_rgb_range.py`, `-p test_arkitscenes.py`, followed by the full suite.

## Task 4: Separate source objects and assemble a reviewable scan candidate

**Files:** create `scan_objects.py`, `scan_room.py`, `test_scan_objects.py`, `test_scan_room.py`; extend scan schema/fixtures. Reuse `object_suggestions.decode_mask`, source-bound observation patterns, `geometry.filter_boundary/add_room_shell`, and compatible layout helpers. Preserve `object_suggestions.py` v1 fingerprints: changing its global labels/source list would invalidate old saved results.

**Interfaces:** `draft_scan_objects(source, observations) -> dict`; `resolve_scan_objects(draft, expected_revision, decisions) -> dict`; `assemble_scan(source, review, objects, parent_revision) -> ScanCandidate`; `write_scan_candidate(directory, candidate, recipe)`; `read_scan_candidate(directory, expected)` (expected adds the host's typed `recipe_sha256`); `correct_scan_candidate(candidate, correction, expected_revision, recipe) -> (ScanCandidate, recipe)`. The recipe/API refinement is recorded in the [checkpoint](../../design/acceptance/teal-bedroom-v1.md#correction-and-persistence-continuation); it preserves omitted source faces for exact replay without giving saved output host authority.

- [ ] RED: a fixture has two touching cabinets, a bed/pillow parent-child pair, one cross-object triangle and an unassigned region. Tests `test_annotation_boxes_do_not_claim_masks`, `test_mixed_identity_faces_stay_unresolved`, `test_contact_is_not_interpenetration`, `test_replacement_removes_only_owned_faces`, `test_review_requires_every_draft`, `test_correction_undo_reopen_binds_source` assert unique active face ownership, exact review coverage and unchanged raw arrays.
- [ ] Produce automatic initial observations from the existing detector/mask route where supported and coarse scan annotations as explicitly weaker hints. Real detector execution is separately gated. For small-item categories unsupported by v1, prepare a separate versioned scan-only detector policy; never mutate old global labels or silently omit those items. Raw scan baseline may remain viewable while masks are unavailable; it is not a completed object inventory.
- [ ] Associate per-object masks through calibrated geometry. Initial face assignment requires vertices and centroid to agree on one identity in at least two depth-visible views; single-view/contradictory/unassigned faces remain unresolved. Record this conservative policy and preserve all raw faces. No automatic weld or hole fill between identities.
- [ ] Apply exact `retain`, `replace`, `omit`, `unresolved` dispositions tied to draft/source/review revision; `replace` requires an admitted asset bound to that object, `omit` requires a reason, and unresolved items block final completeness. Corrections support rigid pose/uniform scale, omission/restoration and reviewed split/merge assignments; source geometry is never overwritten. Reuse existing procedural `add` logic only for explicit owner additions within its supported families; do not coerce scanned lamps/pillows into those families.
- [ ] Write exclusive candidate files and final manifest last; reopen reconstructs derived geometry/ownership from admitted source/recipe, not merely a self-resealed hash. Reuse existing process/report shape `{status:'needs-review',revision,objects}` for the later host adapter. Failed assembly preserves previous candidates and review reasons.
- [ ] GREEN: new tests plus `test_idealized_*.py` regressions via full discovery. Inspect actual inventory only after approved source/mask acquisition; no synthetic review counts as owner review.

Run: Python discover with `-p test_scan_objects.py` and `-p test_scan_room.py`, then `-p test_*.py`.

## Task 5: Add visibility-tested photographic textures without changing source geometry

**Files:** create `scan_texture.py`, `test_scan_texture.py`; extend scan contract/schema. Reuse installed Pillow/NumPy/Open3D and existing raycasting patterns from `review_result.py`; do not import Hypersim's scene-specific material orchestration or add a UV library prematurely.

**Interface:** `texture_scan_candidate(candidate, calibrated_views, output_dir) -> ScanCandidate`. Deterministic best-visible-source triangle projection, vertex duplication at UV seams, padded source-image atlases and explicit vertex-color fallback for unobserved areas. No invented high-resolution detail and no generative texture step by default.

- [ ] RED: `test_occluder_blocks_background_projection`, `test_triangle_geometry_unchanged_after_uv_split`, `test_atlas_padding_prevents_cross_material_bleed`, `test_black_source_texels_stay_black`, `test_unseen_face_keeps_explicit_fallback`, `test_seam_split_and_decoded_texture_budgets`, `test_texture_mutation_invalidates_revision`.
- [ ] Assert physical triangle positions remain byte-equivalent after remapping, RGB source IDs/hashes are exact, an occluded face receives material index -1, and changed asset bytes/unknown materials reject. Test correct image-origin/UV orientation using a four-color calibration image.
- [ ] Rank only depth-visible front-facing source views; use the frozen visibility band, reject partial/ambiguous projected triangles rather than paint through objects, and pack original-resolution images into ≤8 padded atlases. Measure post-seam vertices and base/mipmap/temporary texture allocation. If limits cannot retain required detail, record a reviewed display simplification or stop for a revised resource plan; never quietly reduce quality or raise caps.
- [ ] Bind atlas bytes, UVs, material references, face origins and full candidate revision. Original vertex colors remain available for legacy points/matrix; texture-backed matrix appearance must be sampled from the same bound atlas, not an unrelated palette.
- [ ] GREEN: texture and contract tests plus full Python suite. Source-projected texture is not PBR estimation; baked illumination and unseen surfaces remain documented limits.

Run: Python discover with `-p test_scan_texture.py`, then full suite.

## Task 6: Integrate closed scan admission with the existing private lifecycle

**Files:** create `scan-assisted.mjs`, `scan-assisted.test.mjs`, `scan-fixture.mjs`, `cpu-review-worker.mjs`; modify `idealized-adapter.mjs`, `broker.mjs`, `benchmark.mjs` and their tests. Keep the old `result.mjs` contracts unchanged.

**Interfaces:** `validateScanCandidate(value, expected) -> value`; `readScanCandidate(directory, expected, options) -> Promise<value>`; `loadScanSource() -> Promise<ScanSource>`; `scanResource(pathname, options) -> Promise<{type,body}|null>`. Extract `idealized-adapter.mjs`'s `invoke` into `invokeCpuReview(args, options, script)` with the same bounded stdout/deadline/termination and report validation. **Continuation ruling:** retain both existing `idealized_room.py` and `idealized_prepare.py` callers, and allow the new fixed-operation `cpu_review_worker.py` supervisor for scan replay/inspection; the old invocation alone does not enforce memory limits. [Bounded host checkpoint](../../design/acceptance/teal-bedroom-v1.md#bounded-host-continuation).

- [ ] RED: `scan-assisted.test.mjs` tests source/capture swaps, UV/provenance resealing, texture path traversal/junctions, changed assets between validation and response, malformed decode sizes, incomplete manifest and Python/Node rejection parity. Legacy RGB-only admission must reject every scan fixture.
- [ ] Add fixed `/api/room-workflow/benchmark/arkitscenes/profiles/scan-45261631-v1` and ID-only child photo/texture resources, without old seven-photo index assumptions. No request-provided filesystem path or remote URL. Payload is explicitly scan-assisted, with no fake `result.arms.A`, estimator execution time or WorldMirror receipt.
- [ ] Add private `GET /api/room-workflow/scan-source`, `POST /api/room-workflow/jobs/import-scan` and `POST /api/room-workflow/jobs/:id/scan`; import accepts exactly `{source:'arkitscenes-45261631-scan-v1',expected_source_sha256}`. Extend existing owner/session/origin, intake serialization, revision/history, cancellation and expiry paths with `kind:'scan-review'`. Share only actual common lifecycle mechanics; keep source/geometry verifiers separate explicit branches.
- [ ] Actions are `prepare`, `correct`, `review`, `undo`, `cancel`, using existing optimistic revision rules. Review binds source, frame, boundary, complete inventory dispositions, geometry, textures and diagnostics. Reopen and sidecar display require current host review; an artifact's `ready` claim is never sufficient. Review writes are private; benchmark reads cannot promote anything.
- [ ] Preserve persisted uncertain-cleanup locks and termination receipts. Add HTTP tests for cross-owner requests, wrong origin, late results, source races, cancelled texture writes, restart with unknown worker settlement and undo invalidating freshness. Old routes/defaults and old candidate hashes stay unchanged.
- [ ] GREEN: focused Node tests and full room suite, followed by actual synthetic-file → Python verification → HTTP → reopen integration. No service starts inferred from unit tests.

Run: `node --test scripts/room_workflow/scan-assisted.test.mjs scripts/room_workflow/idealized-adapter.test.mjs scripts/room_workflow/broker-idealization.test.mjs scripts/room_workflow/benchmark.test.mjs`, then `npm.cmd run room:test`.

## Task 7: Integrate textured surfaces, object inspection and matrix continuity

**Files:** modify `week4/app/src/room/{BenchmarkRoom,CandidateView}.tsx`, `matrix-style.ts`, `surface-points.ts`, relevant room CSS; create `week4/app/tests/room-scan-materials.test.ts` and extend provenance/sampler tests and `week4/app/scripts/verify-arkit-profiles.mjs`. Add a small `scan-materials.ts` only if texture admission/loading/disposal is a distinct reusable unit used by surface and matrix paths.

**Interfaces:** extend `CandidateGeometry` additively with optional scan UV/material/object fields; old callers retain exact behavior. `CandidateView` gains stable selected-object input/callback and validated texture resources. `BenchmarkRoom` consumes an explicit scan/legacy payload union, never populates fake ML fields. Source/frame identity, not only ordered photo hashes, controls resets.

- [ ] **Visual gate first:** obtain fresh scoped Weave output/inspection or explicit owner waiver, record packet and matching before captures. Missing access or budget blocks this task, not offline Tasks 1–6.
- [ ] RED unit assertions: UV/resource cardinality rejection, only enumerated scan origins treated as source-derived, generated faces retain inferred cues, same object identity survives a revision, legacy geometry still renders without materials. Test texture source sRGB handling and upright four-color UV fixture. Unknown origin rejects instead of receiving a trusted default.
- [ ] Implement textured `MeshBasicMaterial` paths first to preserve photographic appearance without falsely claiming physical materials. Reuse Three.js, existing depth occlusion/navigation/context recovery and matrix style. Matrix samples the same bound texture when present; non-textured legacy palettes remain unchanged. Respect aggregate geometry/draw-call/resource bounds.
- [ ] Object picking maps triangle ownership to stable IDs; keyboard/touch use an equivalent object list. Keep compact comparison/style switches on the main scene and explanations/review/corrections on the private authoring route. No modal-alert interruption or new gizmo framework.
- [ ] Abort/ignore stale image decodes, key assets by content hash, dispose textures/materials on replacement/context loss/unmount, and retain the last admitted candidate on failed updates. Style/object-version switches preserve camera and selection; source/frame changes reset deliberately.
- [ ] GREEN: app tests, typecheck/build, then actual desktop/mobile-emulated walkthrough with fixed cameras, solid/matrix comparison, cabinet close-up, bed/pillow review, object selection, keyboard/focus/touch, reduced effects, context loss, interruption and reopen. Inspect actual captures, not just script exit codes. Measure loaded/decoded textures and browser/native limits honestly.

Run: `node --test week4/app/tests/room-scan-materials.test.ts week4/app/tests/room-surface-points.test.ts week4/app/tests/room-provenance-style.test.ts`; `npm.cmd --prefix week4/app test`; `npm.cmd run typecheck`; `npm.cmd run build`. After separately authorized/headroom-checked services: `node week4/app/scripts/verify-arkit-profiles.mjs <new-evidence-directory>` with added scan cases. Existing two services may already be running; inspect, do not duplicate or restart shared services silently.

## Task 8: Selective object-generation checkpoint, final review and acceptance

**Files:** create evidence-scoped `docs/research/teal-bedroom/object-trial-v1.md` only when the scan deficit and exact source object are known; record actual implementation evidence in `docs/design/revisions/teal-bedroom-v1/` and acceptance in `docs/design/acceptance/teal-bedroom-v1.md`. Conditional model-specific workers get a short pinned sub-plan at this checkpoint, not speculative scaffolding now.

**Interface for an admitted completion:** `{object_id,source_sha256,frame_sha256,mask_sha256,model_revision,code_sha256,seed,receipt_sha256,geometry,materials,object_to_room,diagnostics}`; it can only enter Task 4's explicit `replace` decision after validation. Generated geometry/materials never inherit scan provenance.

- [ ] Inspect the real separated/texture baseline. If adequate, skip generation and document why. If deficient, identify one bedside cabinet with clear masks and multiple support views; compare bed/soft fabric only after the rigid-object result is reviewed. Do not claim all objects completed from one pilot.
- [ ] Prepare the smallest justified comparison: scan baseline versus one generation candidate; add the second model only if comparison is necessary and separately budgeted. SAM 3D uses an exact aligned pointmap where valid; TRELLIS.2 uses an isolated crop and separate room fitting. Current `worldmirror_adapter.external_pointmap` rejects every invalid pixel—do not fill missing scan depth with zero or claim it already handles sparse LiDAR. Pin any validity-handling change and test it before SAM execution.
- [ ] Before model acquisition/build: verify official code/weight revisions, license and secure access, input mask/crop/depth conventions, GPU/dependency compatibility, uploads, resource/output bounds, no automatic retry and cancellation. Quote build/startup/storage/transfer as well as inference, with a finite requested ceiling. No current cost or runtime estimate is certified by this plan.
- [ ] The model-specific sub-plan must name exact worker files, pinned environment and RED tests for mesh/texture export, pose conversion, source binding, resource failure and interruption; it requires owner approval before model execution. If a route is inaccessible, disclose it; do not silently change providers or execute an unapproved alternative.
- [ ] Grade every attempted object at matched views using source silhouettes, visible detail/palette, support/contact, intersections and withheld-view limitations. Keep failures/raw artifacts. Promote only a reviewed improvement and rerun replacement/save/reopen tests.
- [ ] Run full Python, Node room, root app/core and Shado protocol regressions; typecheck/build and actual viewer checks. Request one fresh-context independent review of task-owned changes; fix confirmed important findings RED→GREEN. Do not review or overwrite unrelated dirty work as if authored by this pass.
- [ ] Record source/code/artifact hashes, actual commands/results/skips, model participation, costs if known, browser limits and remaining items. Owner exercises bedroom identity/layout, cabinets, bed/headboard/pillows and available smaller details; each unresolved/omitted item is explicit. Final quality acceptance defaults to pending. Do not delete evidence, commit or publish.

Full commands: Python `-m unittest discover -s scripts/room_workflow -p test_*.py`; `npm.cmd run room:test`; `node --test integrations/shado/*.test.mjs`; `npm.cmd test`; `npm.cmd run typecheck`; `npm.cmd run build`. Numerical threads 1 where applicable. Any inherited failures are reported and block a clean-suite claim; environmental skips remain named, not counted as passes.

## Implementation handoff and approval

**First implementation block approved on 2026-10-21:** Tasks 1–3 offline code/tests and a concrete small-asset acquisition packet. Source downloads/real processing wait for that packet's approval; no large scans or model calls. Tasks 4–6 can proceed with synthetic fixtures while external gates are pending. Task 7 waits for its visual gate. Task 8 is conditional, not an automatic SAM/TRELLIS comparison bill.

This plan itself was prepared by the lead with one read-only code-mapping worker; Ruflo routing was advisory. No reconstruction, downloads, model tests, runtime changes or final quality judgments were performed by writing it. The owner subsequently approved Native implementation; [checkpoint evidence](../../design/acceptance/teal-bedroom-v1.md) tracks actual progress separately. Task 1 is complete; Tasks 2–4 have offline foundations but are not complete real-data stages. The checkpoint review's five safety/evidence/unit findings were reproduced and fixed; bounded trajectory parsing, rotated-grid projection and conservative two-view face association are tested. Task 4 now also has pure inventory drafts, exact retain/omit/unresolved review, candidate assembly, absolute pose/uniform-scale and omit/restore corrections, and exclusive recipe-backed persistence with isolated CLI verification. Source acquisition/registration, admitted replacement, reviewed split/merge and owner additions, host undo/review integration, Tasks 5/7/8 and quality acceptance remain pending. Task 6 has private bounded replay and persistent uncertainty locks, but not source/texture admission, HTTP lifecycle or ready/benchmark routes. The recipe and API ruling is recorded in the [correction/persistence checkpoint](../../design/acceptance/teal-bedroom-v1.md#correction-and-persistence-continuation); these synthetic helpers do not admit real source bytes.
