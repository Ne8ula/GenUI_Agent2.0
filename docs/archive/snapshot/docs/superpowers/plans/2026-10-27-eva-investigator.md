# EVA Investigator Implementation Plan

> **Retired 2026-10-28 — historical execution record only.** Do not execute this checklist, its skill directives or its spending statements. [Current scope](../../../PLANNING.md) selects Argus scenes and Kimodo motion; the [replacement design](../specs/2026-10-28-crime-scene-argus-kimodo-design.md) is owner-approved. Retain reusable evidence/security contracts, but do not continue this plan as a parallel generation workflow.

> **Historical worker instruction (inactive):** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. The unchecked boxes below are historical text, not a current task queue.

**Goal:** Turn scanned th_0028 clues into scene-specific object models. Let the user ask EVA free-text questions, answered from research and the clues they have found, and play EVA's hypothetical reconstruction as holograms in the first-person room.

**Architecture:** Offline Python steps run once on Modal under exclusive receipts:
- segmentation (CPU);
- object generation and scan fitting (GPU).

Their outputs are hash-registered in `ffs-resources.json`; the owner then reviews them through a private review route. A new broker module calls Claude with only the scanned context, a bounded absence tool and a research digest. Its output is a schema-validated scenario, which the React/Three.js app renders as hologram meshes, rigged figures and a scrub bar.

**Tech Stack:**
- Python 3.12 with numpy on Modal SDK 1.6.1; image-to-3D and SAM 2 run on the GPU.
- Node broker (`broker.mjs`, `crime-scene.mjs`) with installed `ajv`.
- React 19 and Three.js 0.180, using the installed `three/addons` `GLTFLoader`.
- Tests: `node --test` and Python `unittest`.

**Spec:** [docs/superpowers/specs/2026-10-27-eva-investigator-design.md](../specs/2026-10-27-eva-investigator-design.md) (v1.1, owner-approved)

## Global Constraints

- **No commits, pushes or publication**: the owner instruction overrides the skill's commit steps. Each task ends with verification and an evidence note instead.
- **Ponytail full** (AGENTS.md):
  - reuse existing helpers: `ffsResource`, `verifiedMesh`, the `ffs_depth_cloud.py` receipt pattern, the notebook lock and counter;
  - no new dependency unless a task says so.
- **Weave gate**: no UI edit (Tasks 8–10) before the `crime-scene-eva-v1` packet exists and has been inspected (Task 0).
- **Modal**:
  - Modal SDK `1.6.1`, one attempt per approval, an exclusive `receipt.json` before build, `stop_app` cleanup.
  - Generator functions take no `retries` kwarg.
  - Each new approval gets a new output folder; failed receipts are never edited.
- **Approved allowances**: segmentation Modal CPU **$1**; object generation Modal GPU **$10**. The GPU browser check, the demo session and live EVA calls each need separate approval.
- **EVA calls**: model `claude-opus-5-5`, `max_tokens` 8,192 (raised by controller ruling, Task 6), 60 s timeout, **20 requests per page session**. The counter is reserved before submission; failures count; no automatic retry; per-request consent.
- **EVA never receives** `IPC_Th_0028.xlsx`, unscanned item names or positions, notes, raw scan data or secrets.
- **Blood rule**: the reddish traces are the scenario's stand-in for blood. EVA always flags them as staged applications, and no physics may be inferred from them.
- **Labels (exact copy)**:
  - "EVA's hypothesis — not evidence"
  - "Generated from source photo, fitted to scan (coverage N %, mean X cm)"
  - "approximate region"
- **Seven object targets**: tags 17, 69, 12, 22, 13, 18, 32. Tag 21 keeps the segment hologram only.
- **Segmentation constants**: floor/wall band 1.5 cm, voxel 1.5 cm, seed radius 6 cm, max reach 1.2 m, max height 2.2 m, floor-contact band 0–3 cm.
- **Fit**: 24 axis-aligned rotations, then ICP. Coverage is the share of segment points within 2 cm of the mesh.
- **Asset limits**: GLB ≤ 2 MB each; at most 3 actors; 1–8 steps; caption ≤ 140 chars; answer ≤ 1,200 chars; question ≤ 500 chars; history of the last 6 turns.

## Review Focus

1. **A question that names an unscanned item**, e.g. "was the key used?" before tag 1 is found. EVA must answer without confirming its location, and the request must not carry tag 1's name. Test in Task 6.
2. **A model reply placing an actor outside the crop, or moving an unscanned tag.** It is rejected, counts against the cap and shows "EVA's reconstruction was invalid" with no retry. Test in Task 6.
3. **Reopening or reloading after a review is saved.** Approved segments and models apply without a rebuild, and rejected ones fall back to the sphere. Test in Task 3 (record round-trip) and Task 8 (fallback).
4. **A generated model with low coverage, or a missing GLB.** The object falls back to the segment hologram and the label disappears; nothing breaks. Test in Task 8.
5. **Playback while the user scans, walks or presses Escape, or with reduced motion.** Escape stops playback, walking does not reset the scrubber, and reduced motion shows stepped frames. Test in Task 9.

---

### Task 0: Weave packet `crime-scene-eva-v1` (blocks Tasks 8–10)

**Files:** Create `docs/design/revisions/crime-scene-eva-v1/{REVIEW.md, provenance.json, references/images/, references/videos/, contact-sheet.png}`.

- [ ] Step 1: Quote, approve and run the Nano Banana 2.1 still (text only; no FFS photos or game footage uploaded). It shows:
  - the first-person room, with the chair as a complete icy hologram model with a rising scanline;
  - two generic hologram figures labelled A and B mid-step;
  - the "Ask EVA" panel with Answer, Inconsistencies, Look for and Sources sections;
  - the "Hypothetical reconstruction" scrub bar and the "EVA's hypothesis — not evidence" badge.
- [ ] Step 2: Quote, approve and run a Seedance V1.5 Pro clip of 5 s at 720p with no audio, using the still as its first frame. It shows the scanline sweeping the chair, figures moving through 2–3 poses, and the chair ghost tipping from upright to its current position.
- [ ] Step 3: Build a contact sheet at 2 fps with ffmpeg. Inspect the still and the sheet, then write adopt/reject notes in REVIEW.md and the run IDs, settings and costs in provenance.json.

Expected: the packet exists with the inspected outputs recorded.

### Task 1: Scan segmentation core

**Files:** Create `scripts/room_workflow/ffs_segment.py` and `scripts/room_workflow/test_ffs_segment.py`.

**Interfaces:**
- Produces:
  - `display(points: np.ndarray, rotation_z: float) -> np.ndarray`, mirroring `displayPoint` in `state.ts` (rotate XY, then z − 349.2).
  - `fit_plane(points, band=0.015, iterations=400, seed=0) -> tuple[normal: ndarray(3), offset: float, inliers: ndarray[bool]]`.
  - `segment(points: ndarray(N,3) display coords, seeds: dict[str, ndarray(3)]) -> dict[str, dict]`. Each value is `{'indices': ndarray[uint32], 'bbox': [[x,y,z],[x,y,z]], 'height': float, 'count': int, 'flags': list[str]}`, with flags drawn from `'empty'`, `'oversized'` and `'overlap:<id>'`.
  - Indices refer to the input order, which is the original PLY vertex order.

- [ ] Step 1: Write the failing tests `test_box_on_floor_by_wall`, `test_touching_objects_flag_overlap`, `test_empty_marker_flagged` and `test_reach_and_height_limits`. Use synthetic points: a 1.5 cm floor grid, one wall plane and a 40×40×80 cm box. Assert:
  - the box indices are ⊇ 95 % of box points and include no wall points;
  - floor points are included only under the box footprint and only within 0–3 cm;
  - the second seed touching the box gets `overlap:<first id>`;
  - a seed 50 cm from anything is flagged `empty`;
  - nothing is beyond 1.2 m from the seed or above 2.2 m.
- [ ] Step 2: Run `python -m unittest test_ffs_segment` from `scripts/room_workflow`. Expected: FAIL (module missing).
- [ ] Step 3: Implement it with numpy only.
  - Fit planes by RANSAC on random triples. Fit the floor first, then up to two vertical walls (normal z < 0.2) holding ≥ 5 % of the remaining points.
  - Voxelise with `np.floor(p / 0.015)` keys and grow by BFS over 26-neighbour voxel keys from the voxels within 6 cm of the seed.
- [ ] Step 4: Re-run the tests. Expected: PASS (4).

### Task 2: Segmentation Modal adapter and catalogue registration

**Files:** Create `scripts/room_workflow/ffs_segment_cloud.py` and `scripts/room_workflow/test_ffs_segment_cloud.py`.

**Interfaces:**
- Consumes: `ffs_segment.display`, `segment`; the catalogue entries `scene.ply` and `tags.json`.
- Produces outputs under `.local/reconstruction/ffs-th0028-segments-v1/returned/`, registered as catalogue keys:
  - `segments/summary.json`: `{params, revision, floor: {normal, offset}, markers: {id: {tag, count, bbox, height, flags}}}`;
  - `segments/<marker-id>.u32`: little-endian uint32 indices into the original PLY order.

- [ ] Step 1: Write the failing tests:
  - `test_plan_bounds`: resources are `{'cpu': 2, 'memory_mib': 4096, 'timeout': 600, 'operational_allowance_usd': 1}`, there is no GPU, and the output folder is new.
  - `test_real_sdk_construction`: build the function with the real Modal 1.6.1 SDK without submitting, as `test_ffs_depth_cloud.py` does.
  - `test_receive_validation_no_overwrite`: name regex `(summary\.json|marker-\d\d\.u32)`, ≤ 4 MiB each, written with `xb`.
  - `test_register_adds_without_replacing`.
- [ ] Step 2: Run them. Expected: FAIL.
- [ ] Step 3: Copy `ffs_depth_cloud.py`'s structure (`prepare`, `worker` generator, `receive`, `register`, `create`, `execute`, CLI).
  - The image is `debian_slim` with `numpy==2.2.6`, plus the scan and tags as `add_local_file`, with `block_network=True` and `restrict_modal_access=True`.
  - Parse the PLY header and binary body with numpy, without plyfile; the reference decoder is the existing `PLYLoader` path.
- [ ] Step 4: Re-run the tests. Expected: PASS (4).
- [ ] Step 5: Prepare the plan with `python -I -X utf8 scripts/room_workflow/ffs_segment_cloud.py`. Give the owner the plan hash and the command; it is already approved at $1. After the run, inspect the receipt and summary: flags, and counts for markers 01–09.

### Task 3: Owner review record and review route

**Files:**
- Create `scripts/room_workflow/scene-review.mjs` and `scripts/room_workflow/scene-review.test.mjs`.
- Modify `scripts/room_workflow/broker.mjs` around lines 814–826 to add routes.

**Interfaces:**
- Produces `createSceneReview({path, catalogPath}) -> {read(): Promise<Review>, save(body: Review & {revision}): Promise<{review, revision}>}`.
  - `Review = {segments: Record<markerId, 'approved'|'rejected'>, crops: Record<photoName, [x0,y0,x1,y1] in 0–1>, models: Record<tag, {status: 'approved'|'rejected', upright: [rx,ry,rz] radians}>, coverage_threshold: number 0–1}`.
  - It is stored as Markdown with one fenced `json` block at `.local/reconstruction/ffs-th0028-review-v1/review.md`.
  - `save` rewrites only the catalogue key `review.md` (path, sha256, bytes).
- Broker routes: `GET|POST /api/room-workflow/crime-scene/review`. The broker serves them only when started with `reviewEnabled: true`, an option of `createBroker`; the demo and smoke brokers stay false.

- [ ] Step 1: Write the failing tests:
  - `round trip keeps revision and catalogue hash in sync`;
  - `rejects unknown fields, bad marker ids, crops outside 0–1, unknown tags, threshold out of range`;
  - `stale revision → 409`;
  - `route absent unless reviewEnabled`.
- [ ] Step 2: Run `node --test scripts/room_workflow/scene-review.test.mjs`. Expected: FAIL.
- [ ] Step 3: Implement it, reusing `boundedFile`- and `atomic`-style writes. Export them from `crime-scene.mjs` rather than copying them.
- [ ] Step 4: Re-run the tests, plus `node --test scripts/room_workflow/crime-scene.test.mjs`. Expected: PASS.

### Task 4: Mesh-to-scan fitting

**Files:** Create `scripts/room_workflow/ffs_fit.py` and `scripts/room_workflow/test_ffs_fit.py`.

**Interfaces:**
- Produces `fit(vertices: ndarray(V,3), faces: ndarray(F,3), segment: ndarray(S,3), floor_z: float) -> {'matrix': list[16] column-major, 'coverage': float, 'mean_cm': float, 'rotation_index': int}`, and `ROTATIONS: list[ndarray(3,3)]` with length 24.

- [ ] Step 1: Write the failing tests:
  - `test_recovers_known_rotation_scale_translation`: an asymmetric L-shaped mesh, transformed by a known rotation, scale 0.37 and offset, sampled to points. Assert coverage > 0.95, mean < 0.5 cm and the matrix within 1e-2 of the truth.
  - `test_ground_contact`: the fitted mesh's minimum z is within 3 mm of `floor_z`.
  - `test_poor_match_low_coverage`: a sphere mesh against box points gives coverage < 0.6.
- [ ] Step 2: Run them. Expected: FAIL.
- [ ] Step 3: Implement it with numpy only.
  - Use area-weighted surface samples (5k), a bounding-box scale estimate, and 24 rotations.
  - Pick the best rotation by mean nearest distance, then run 20 point-to-point ICP iterations: SVD, with the z translation clamped to the floor.
  - Use chunked brute-force nearest neighbours, since the segments have ≤ 50k points.
- [ ] Step 4: Re-run the tests. Expected: PASS (3).

### Task 5: Object generation Modal adapter

**Files:** Create `scripts/room_workflow/ffs_objects_cloud.py`, `scripts/room_workflow/test_ffs_objects_cloud.py` and `docs/design/acceptance/crime-scene-objects-v1.md`.

**Interfaces:**
- Consumes:
  - the review `crops` and `segments` (Task 3);
  - the segment index lists (Task 2);
  - the full-resolution catalogued `photos/*`;
  - `ffs_fit.fit` (Task 4).
- Produces, under `.local/reconstruction/ffs-th0028-objects-v1/returned/`:
  - `models/tag-<n>.glb` (≤ 2 MB);
  - `models/fits.json` `{tag: {matrix, coverage, mean_cm, model, revision, crop_sha256}}`.

  Both are registered as `models/*`.

- [ ] Step 1: Choose the image-to-3D model.
  - Read the official repositories and licences of TRELLIS (MIT) and TripoSR (MIT), and note any regional or commercial restrictions; exclude restricted models.
  - Record the chosen model, its pinned revision and the commit SHA of its official code in the acceptance file.
  - Use SAM 2 (Apache-2.0) with the owner's crop box as its prompt.
- [ ] Step 2: Write the failing tests:
  - `test_plan_bounds`: L4 or A10G, `operational_allowance_usd: 10`, timeout ≤ 1,800 s, `retries` absent, and only the seven targets 17, 69, 12, 22, 13, 18 and 32;
  - `test_requires_review_crops_and_approved_segments`;
  - `test_receive_glb_size_and_names`;
  - `test_register_models`;
  - `test_real_sdk_construction`.
- [ ] Step 3: Run them. Expected: FAIL.
- [ ] Step 4: Implement it on the `ffs_depth_cloud.py` pattern.
  - The worker: crop → SAM 2 mask → image-to-3D → decimate to ≤ 2 MB → `fit()` against the segment points (sent as `.npy` inputs) → yield records.
  - Weights are baked into the image at build time, and the function uses `block_network=True`.
- [ ] Step 5: Re-run the tests. Expected: PASS (5).
- [ ] Step 6: After the owner has saved crops and segment approvals (Task 3 route), prepare the plan and give its hash. The run is already approved at $10. Afterwards, inspect the receipt and `fits.json`, and render each GLB to PNG offline with a three.js script under `week4/app/scripts/` for the owner's model review.

### Task 6: EVA investigator backend

**Files:**
- Create:
  - `scripts/room_workflow/eva-investigation.schema.json`
  - `scripts/room_workflow/eva-research.json`
  - `scripts/room_workflow/eva-investigator.mjs`
  - `scripts/room_workflow/eva-investigator.test.mjs`
- Modify the routes in `scripts/room_workflow/broker.mjs`.

**Interfaces:**
- Produces:
  - `createSceneInvestigator({directory, key, scene, review, research, fetcher}) -> {status(owner): Promise<{available, remaining, max_tokens: 8192}>, ask(owner, body, {signal}): Promise<{investigation: Investigation, transcript_revision, remaining}>}`.
  - `documentedEvidence(kind: string, evidence: Evidence[], scanned: number[]) -> {result: 'documented-and-scanned', tag} | {result: 'documented-not-yet-found'} | {result: 'not-documented'}`.
- Routes: `GET crime-scene/investigation` (status plus the transcript of the last 6 turns) and `POST crime-scene/ask`.
- `Investigation` is defined by the schema, exactly as in spec §4 "Output contract" (`hypothetical: const true`, `additionalProperties: false`).

- [ ] Step 1: Research digest, delegated to `eva-researcher` (read-only). Verify each candidate in spec §6 from primary or official sources, plus sources for glass fracture sequencing, firearm/cartridge-case evidence and furniture displacement. Write the entries `{id, citation, url_or_doi, access, verification: 'full-text'|'abstract'|'bibliographic', principles: string[] ≤ 4, paraphrased}`. Unverifiable sources are dropped.
- [ ] Step 2: Write the failing tests, all with a fake `fetcher`:
  - `request body omits unscanned item names and positions and never opens IPC_Th_0028.xlsx` (spy on `boundedFile` and `readFile` paths);
  - `includes scanned clue photos as base64 image blocks from depth/photo-*`;
  - `absence tool: dog fur → not-documented; glass with 22 unscanned → documented-not-yet-found without name`;
  - `tool loop stops after 3 calls`;
  - `final submit_investigation input validated: positions outside crop rejected, unscanned object tag rejected, hypothetical false rejected` (each counts against the cap, error "EVA's reconstruction was invalid");
  - `cap 20, reserved before submit, restart keeps count`;
  - `consent and exact fields required`;
  - `history capped at 6 turns, client cannot inject assistant turns`;
  - `502 no retry`.
- [ ] Step 3: Run `node --test scripts/room_workflow/eva-investigator.test.mjs`. Expected: FAIL.
- [ ] Step 4: Implement it.
  - Tools: `documented_evidence` and `submit_investigation`, whose `input_schema` is the schema file. Require `submit_investigation` as the final call.
  - Validate with ajv, and keep the transcript as Markdown in `directory`.
  - Reuse the notebook's `locked`, `count`-style counter (a separate file, limit 20), `responseJson` and key provider.
  - The system prompt follows spec §4 "System prompt (summary)" plus the blood rule, verbatim from Global Constraints.
- [ ] Step 5: Re-run the tests, plus `node --test scripts/room_workflow/*.test.mjs`. Expected: PASS.

### Task 7: Scenario playback model (pure)

**Files:** Create `week4/app/src/crime-scene/playback.ts` and `week4/app/tests/crime-scene-playback.test.ts`.

**Interfaces:**
- Produces:
  - `POSES` (8 names from the schema);
  - `type Scenario`, matching the schema's `reconstruction`;
  - `frameAt(s: Scenario, t: number) -> {step: number, actors: {id, pose, next, blend: 0–1, position: [x, y], facing}[], objects: {tag, from, to, blend}[]}`;
  - `duration(s) -> number`;
  - `steppedFrame(s, index)` for reduced motion.

- [ ] Step 1: Write the failing tests:
  - `interpolates position and facing between steps, blending pose names`;
  - `holds the last step after the end`;
  - `objects blend from previous state to the step's state`;
  - `actor absent before first appearance`;
  - `steppedFrame returns exact step states`.
- [ ] Step 2: Run `node --test --experimental-strip-types tests/crime-scene-playback.test.ts` in `week4/app`. Expected: FAIL.
- [ ] Step 3: Implement it. Facing interpolates along the shortest arc.
- [ ] Step 4: Re-run the tests. Expected: PASS (5).

### Task 8: Renderer: segment and model holograms (after Task 0)

**Files:** Modify `week4/app/src/crime-scene/renderer.ts`. Create `week4/app/src/crime-scene/models.ts` and `week4/app/tests/crime-scene-models.test.ts`.

**Interfaces:**
- Produces:
  - `segmentAttribute(keptOriginalIndex: Uint32Array, lists: Map<number /*marker index*/, Uint32Array>) -> Float32Array` (−1 when not in a segment);
  - `modelVisible(fit: {coverage}, review, threshold) -> boolean`;
  - `loadModels(data, review, signal) -> Promise<LoadedModel[]>`, which fetches through `FFS + 'models/…'` with the same integrity path as `verifiedMesh`.
- Renderer gains:
  - `setReview(review)`;
  - a per-point `segment` attribute replacing sphere membership;
  - a hologram `ShaderMaterial` for meshes (fresnel rim, sparkle, rising scanline over the segment height, edge particles);
  - a textured material in Source colours;
  - hiding of an object's segment points when its model is shown.

- [ ] Step 1: Write the failing tests:
  - `segmentAttribute maps original PLY indices through the crop filter`;
  - `unapproved segment → -1 (sphere fallback)`;
  - `modelVisible false below threshold, rejected, or missing GLB`;
  - `label text "Generated from source photo, fitted to scan (coverage 87 %, mean 1.2 cm)"`.
- [ ] Step 2: Run them. Expected: FAIL.
- [ ] Step 3: Implement it.
  - Keep `originalIndex` while filtering the PLY in `load`.
  - Load GLBs with `GLTFLoader.parse` from verified bytes.
  - The scanline is a uniform `scan` (0–1) per marker, animated in `draw` alongside `amounts`; reduced motion shows the completed state.
- [ ] Step 4: Re-run the tests, plus `npm run typecheck` and `npm test` in `week4/app`. Expected: PASS.

### Task 9: Rigged figures and playback in the renderer (after Task 0)

**Files:** Create `week4/app/src/crime-scene/figures.ts` and `docs/design/revisions/crime-scene-eva-v1/FIGURE-LICENCE.md`. Modify `renderer.ts` and `scripts/room_workflow/ffs-resources.json` (key `figures/human.glb`).

**Interfaces:**
- Consumes `frameAt` and `steppedFrame` (Task 7).
- Produces `createFigures(scene, glb) -> {apply(frame), dispose()}`, with bone-rotation tables for the 8 poses. The renderer exposes `setScenario(s: Scenario | null)`, `setPlayback(t: number)` and `stopPlayback()`.

- [ ] Step 1: Verify and record the licence of one CC0 rigged human (e.g. a Quaternius base character) from the creator's page. The asset download needs owner confirmation of that exact URL. Hash it and register it under `figures/human.glb`.
- [ ] Step 2: Write the failing test `pose tables cover all 8 POSES with known bone names`, in `crime-scene-playback.test.ts`.
- [ ] Step 3: Implement it.
  - Clone the skinned mesh per actor and apply the hologram material.
  - Ghost objects are cloned model meshes (or a segment point subset) transformed by the `upright`, `current` and `displaced` states.
  - Escape and `stopPlayback()` clear the figures. Walking and scanning do not reset `t`.
- [ ] Step 4: Run `npm run typecheck` and `npm test`. Expected: PASS.

### Task 10: App UI: Ask EVA, playback bar, review view (after Task 0)

**Files:**
- Modify:
  - `week4/app/src/crime-scene/CrimeSceneApp.tsx`
  - `crime-scene.css`
  - `api.ts`
  - `week4/app/tests/crime-scene-initialization.test.ts`
- Create `week4/app/src/crime-scene/AskEva.tsx` and `week4/app/src/crime-scene/SceneReview.tsx`.

**Interfaces:**
- Consumes the routes from Tasks 3 and 6 and the renderer methods from Tasks 8–9.
- `AskEva` props: `{csrf, scanned: number[], onScenario(s: Scenario | null)}`.
- `SceneReview` is rendered when `?review=segments` is present. It shows segment isolation, crop-box drawing on photos and model approval with upright rotation sliders.

- [ ] Step 1: Write the failing test: extend the initialization fixture so that `setReview` is called before `load`, with the hook count updated.
- [ ] Step 2: Run `npm test`. Expected: FAIL.
- [ ] Step 3: Implement it.
  - **Ask EVA panel:** available after the first scan.
    - Inputs: a question field limited to 500 characters, consent text exactly "Send this question, your scanned clues and their photos", and a remaining count of 20.
    - Answer sections: Answer, Inconsistencies (with basis), Look for, Sources (with verification level) and "Play reconstruction". Everything renders as plain text.
  - **Playback bar:** labelled "Hypothetical reconstruction", with play/pause/range, and the badge "EVA's hypothesis — not evidence" shown while a scenario is loaded.
  - **Model labels:** in the clue panel and in Sources & details.
- [ ] Step 4: Run `npm run typecheck` and `npm test`. Expected: PASS.

### Task 11: Browser smoke, cloud adapters and evidence

**Files:**
- Modify:
  - `week4/app/scripts/crime-scene-smoke.mjs`
  - `scripts/room_workflow/crime_scene_browser_cloud.py`: `OUTPUT` becomes `-v5`, `CAPTURES` points to `crime-scene-eva-v1`, ASSETS gains the segments, objects, review and figure folders, and the test list gains the new tests;
  - `crime_scene_demo_cloud.py`: `OUTPUT` becomes `-v3`;
  - `docs/design/INDEX.md` and `PLANNING.md`.
- Create `docs/design/acceptance/crime-scene-eva-v1.md`.

- [ ] Step 1: Extend the smoke with browser-boundary fixtures for `crime-scene/ask`, never a live provider:
  - the scan of tag 18 shows the model hologram (canvas differs from the segment-only baseline);
  - asking returns a fixture scenario; the badge appears; play advances the canvas; Escape clears the figures;
  - an invalid-reply fixture shows "EVA's reconstruction was invalid";
  - the remaining count decrements;
  - captures: `eva-answer.png`, `playback.png`, `model-hologram.png`, `model-source.png`.
- [ ] Step 2: Run `node --check` on the smoke and the Python adapter tests. Expected: PASS.
- [ ] Step 3: Prepare the GPU check plan, then request separate owner approval before running it. Separately request approvals for the demo and for any live EVA calls.
- [ ] Step 4: Record the results in the acceptance file, REVIEW.md, INDEX.md and PLANNING.md. The decision stays pending.

---

## Self-review notes

- **Spec coverage:**

  | Spec section | Tasks |
  |---|---|
  | §3 Segmentation | 1, 2, 3, 8 |
  | §3.1 Object models | 4, 5, 8 |
  | §4 EVA investigator | 6 |
  | §5 Playback | 7, 9, 10 |
  | §6 Research digest | 6, step 1 |
  | §7 Weave, verification and gates | 0, 11 |

- **Deviation:** the review record is Markdown wrapping one JSON block (spec: "small Markdown record"). This is kept machine-readable without a second format.
- **Owner gates inside tasks:**
  - segmentation run (approved);
  - segment and crop review;
  - generation run (approved);
  - model review;
  - figure download URL;
  - GPU check, demo and live calls (separate approvals).
