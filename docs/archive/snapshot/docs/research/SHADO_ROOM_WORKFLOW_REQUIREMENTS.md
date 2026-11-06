# Single-room photo workflow: Shado requirements and temporary substitutes

Date: 2026-10-20. Status: **architecture approved; photo-only cloud pilot executed; Shado comparison and owner acceptance pending**.

This document specifies the missing systems needed to compare a photo-only reconstruction with a Shado-assisted reconstruction in the first upload workflow. It does not establish that Shado can generate calibrated room geometry. The original research pass performed no model/application work. Following explicit approval, the [implementation review](../design/revisions/room-upload-v1/REVIEW.md) records the initial code/test pass. The later [ARKitScenes pilot](ARKITSCENES_PILOT.md) records actual pinned VGGT acquisition, four successful bounded VGGT calls, dense CPU fusion and browser evidence. No Shado paid generation has occurred.

Fresh 2026-10-20 status check: the running EVA service reports `shadoConfigured:false`. The isolated v2 bridge passed typecheck/build and unconfigured-runtime checks, but it has not been deployed or authenticated. Its prepared recipe is a five-second, silent, 720p reference-based video, not a calibrated 360-degree/depth/marker export. Activation requires the reviewed bridge in a deployment, exact EVA/Shado origins, a dedicated bridge secret, and the existing authenticated account/provider/media/billing services. See [actual bridge evidence](../../integrations/shado/V2_STATUS.md). The separately authored aesthetic study does not substitute for the required real Shado comparison.

## Current sequencing decision — 2026-10-20

The owner now prioritizes the matched VGGT / WorldMirror / WorldMirror + selective SAM 3D viewer comparison, followed by complete upload integration. This changes implementation order, not the requirement for a real Shado comparison. The geometry/object milestone neither satisfies nor cancels that separate gate. The existing room/upload Weave waiver continues for this pass; there is no inherited paid allowance.

## Accepted scope

The later [general room completion requirement](GENERAL_ROOM_COMPLETION.md) applies to this upload route: the authored seven-photo furniture study is not a reusable reconstruction solution. Rendering is shared; automatic object completion and the real Shado comparison remain separate unfinished capabilities.

- Accept approximately **5–7 photos from different angles of one room**. This is the intended input experience, not a guarantee of reconstructability.
- Accept uncertain recollections such as “probably around 300 sqft.” Preserve the user's wording and uncertainty.
- Process in the cloud. Exact providers, retention and bounded run costs still need concrete decisions.
- Include the Shado comparison in version one; it cannot be silently deferred or replaced by a fabricated video.
- Ask the user to confirm/correct the room boundary and doorway/window closures.
- Produce exactly one selected room. Close an empty doorway with a simple door, and a window with a pane or opaque fill; do not reconstruct a corridor, adjacent room or exterior.
- Use the first Hypersim point view as the visual reference: consistent dots, recognizable furniture and thin objects, natural perspective sizing. The later coarse 6 cm sampling is not the accepted visual target.
- The owner waived fresh Weave generation for this upload/reconstruction workflow.
- The owner reviewed this document and approved implementation after clarification. D1–D5 use the recommended choices, with real ArUco detection where markers exist. D6 selects **automatic EVA-to-Shado integration** for version one. The question table below preserves the alternatives considered.

## What the inspected code establishes

Inspected revisions: EVA `c83fd4c04ca170ed38311b94cdcdebec779051b7`; Shado `e9dca6c0fe334162392d1a3c5681067846ab04d6`. Both tracked checkouts were clean before this documentation pass. Paths beginning `shado/` below are relative to the sibling checkout `../shado`, not files in EVA.

| Component | Evidence and limit |
| --- | --- |
| Shado photo-conditioned video | `shado/src/lib/model-catalog.ts:113–127,235–239` exposes Seedance 2.5 reference-to-video: up to 30 ordered image references and 4–30 second video settings. `shado/worker/runtime/seedance.mjs:15–23` validates reference shape. This supports an attempted generation, not guaranteed room identity, trajectory or geometric consistency. |
| Shado depth processing | `shado/worker/provider/additional-video.mjs:16,39` constructs and requires `include_raw_depths:false`; `shado/src/lib/model-catalog.ts:255–258` identifies depth visualization video. The current route does not hand EVA numerical depth arrays or calibrated poses. Enabling a provider option would still not establish metric calibration. |
| Shado camera control | `shado/worker/runtime/additional-video-contract.mjs:3` includes categorical motion controls for LTX. No calibrated full-turn trajectory or room-loop acceptance mechanism was found. |
| Shado 3D providers | `shado/docs/nara-3d-models.md` describes object-model routes and excludes Hunyuan World from that integration. An object GLB does not establish room reconstruction. |
| Shado application handoff | `shado/src/lib/generation-client.ts` and `shado/src/app/api/{quotes,generation-tasks,workspace-media}/route.ts` implement versioned media and authenticated application jobs. They are not an already-authorized generic EVA service API. |
| EVA reconstruction | [full_room.py](../../scripts/reconstruction/full_room.py) requires all 100 Hypersim poses and supplied depths. [renderer.ts](../../week4/app/src/room/renderer.ts) loads fixed scene manifests. Arbitrary-photo camera/depth inference and upload jobs are absent from this route. |
| Existing completion | [adjacent_space.py](../../scripts/reconstruction/adjacent_space.py) adds scene-specific adjoining spaces. That policy must not be reused for the new single-room workflow. Preserve the existing candidate as history. |

Targeted source, worker and documentation searches found no Shado implementation of calibrated fiducial tracking, room-wide pose/depth export, scene-consistency selection or the complete reconstruction handoff. This is a finding about these checkouts, not proof that an external provider or unpublished research system lacks those capabilities. No live provider/account readiness or customer generation quality was tested in this pass.

Shado currently orchestrates provider models. Attribute each result to both the Shado workflow revision and the actual generator/checkpoint; do not describe provider output as a newly trained Shado model.

## Required systems and proposed substitutes

The substitutes below would be real algorithms or explicit human-assisted steps with their own provenance. They must never emit mock “successful” depth, cameras, markers or reconstruction.

| ID | Needed system / output | Current gap | Proposed first-version substitute and limit | Decision |
| --- | --- | --- | --- | --- |
| R01 | Photo intake, overlap/state diagnosis, immutable source IDs | Shado accepts media but does not establish that 5–7 photos depict a reconstructable room state | EVA hashes/orients inputs, checks duplicates/blur and matches overlapping features; user selects one consistent room state when conflicts appear. Retain rejected inputs and reasons. Poor overlap can stop reconstruction. | D1 |
| R02 | Room-preserving video with a controlled, extensive camera path | No validated calibrated 360-degree room generator contract | One bounded Shado reference-video attempt with all eligible photos, an explicit one-room prompt and motion with translation. Sample keyframes deterministically, estimate achieved coverage, and report partial coverage or failure honestly. Do not call a panorama or in-place spin a sufficient reconstruction capture. | D2 |
| R03 | Intrinsics, extrinsics, shared coordinate system and point tracks | Not exported by the video adapter | Run a pinned **VGGT** camera/depth/tracking route with geometric refinement on both comparison arms. Keep original photo anchors in the augmented arm. **ViPE** is an optional video diagnostic, not an unnoticed replacement estimator for only one arm. | D1 |
| R04 | Numerical depth, validity, uncertainty and aligned normals | Shado's depth output is currently visualization video | Export float depth and validity from the common estimator; derive normals from calibrated depth/geometry. Record z-depth versus ray distance, coordinate conventions and scale. Scores are model scores, not calibrated probabilities. Never decode a colorized movie as trustworthy metric depth. | D1 |
| R05 | Rigid marker IDs, known size/placement, camera fit and independent scene checks | No fiducial pipeline; ordinary uploaded photos may contain no markers | Use natural feature tracks for the real-photo comparison. In a **separate controlled synthetic fixture**, render known ArUco boards and use OpenCV detection/pose fitting to test the future marker contract. Generated/projected tags cannot certify the real room. | D3 |
| R06 | Stable room/object masks, portal masks, mirror/window exclusion | No room-specific segmentation handoff | **SAM 2** prompted masks plus user correction; propagate masks through video where useful. Fit a floor polygon/wall planes and review height/openings. Masks do not by themselves identify a closed 3D room or distinguish a mirror from a doorway. | D4 |
| R07 | Single-room constraint and completion mechanics | Prompt controls alone cannot enforce topology; previous EVA candidate expands outside openings | Enforce the approved room volume during geometry admission and navigation. Author planar doors/window closures; reject outside/disconnected room geometry. Keep inferred closures separately labeled. If the boundary cannot be established, request correction instead of exporting additional rooms. | D4 |
| R08 | Physical scale and uncertainty | Neither uncalibrated images nor remembered area establish measured dimensions | Retain arbitrary reconstruction units; apply an editable **approximate scale prior** for presentation. A measured length can later calibrate scale. Do not infer exact wall lengths, rectangular shape or ceiling height from area alone. | D5 |
| R09 | Geometric consistency, frame selection, loop checks and rejection | No demonstrated Shado room-wide validator | Feature reprojection, original-photo anchor residuals, cross-view depth agreement, coverage, duplicate detection and first/last overlap where present. Check scene regions outside markers. Freeze thresholds before the comparison; reject inconsistent frames without silently regenerating. | D1, D2 |
| R10 | Surfaces, dots, edges, texture and spatial provenance | No common room representation delivered by Shado | EVA fuses accepted estimated geometry, fits conservative architecture and exports one mesh with source associations. Surface sampling supplies dots; mesh creases/boundaries supply geometric edges. Image edges remain separate diagnostics. These views are derived from geometry, not independent evidence. | D4 |
| R11 | Authenticated Shado-to-EVA bundle, hashes and recoverable cloud jobs | Application APIs exist, but the external handoff is not implemented | Start with an actual Shado video export plus run/recipe metadata imported into EVA's cloud reconstruction job. Later replace the manual transfer with a scoped authenticated service contract. Do not copy browser cookies or credentials. | D6 |
| R12 | Paired evidence and reproducible experiments | No first-version photo-versus-Shado experiment implemented | Required A/B workflow below, including unsuccessful Shado attempts, original/candidate comparison, equal downstream settings and explicit compute differences. | D1, D2 |
| R13 | Learned geometric improvements and marker-free transfer | No training/transfer implementation or evidence found in the inspected integration | No trained-model placeholder. Keep the future selection/post-training/held-out transfer system specified and unimplemented. Version one evaluates augmentation through Shado, not improved Shado model weights. | D3 |

Ownership follows the [condensed research plan](EVA_RESEARCH_IMPLEMENTATION_PLAN.md): Shado owns upstream generation, marker validation, selection and learning; EVA owns reconstruction, spatial rendering and HCI. Some temporary geometry estimators can run in EVA's cloud adapter without claiming Shado itself acquired those capabilities.

## Required first-version comparison

### Conditions

- **A — Original photos:** the eligible original photos pass through the common camera/depth estimator, refinement, reconstruction and single-room completion.
- **B — Shado-assisted:** the same original photos plus admitted frames from an actual Shado-generated video pass through the same downstream stack. Original photos remain identifiable anchors. Generated contributions remain independently inspectable and removable.
- A synthetic renderer video, repeated input photos or a previously unrelated clip must not be substituted for condition B. Such inputs can test plumbing only, under a separate fixture label.
- If B produces no usable frames or fails geometry checks, show that failure with A still available. “Comparison required” means the workflow and actual attempt are accounted for; it does not mean manufacture a successful candidate.

This compares the practical effect of generated-view augmentation. It does **not** by itself test a learned Shado improvement or satisfy C-E6's paired upstream baseline/treatment requirements. A future upstream comparison needs independently evidenced Shado variants, matched generation settings where supported, the same downstream pipeline and separate human-outcome evaluation.

### Controls and accounting

Freeze input IDs, image preprocessing, common estimator/checkpoint, refinement policy, mesh resolution, room envelope, closure policy, scale prior, rendering/sampling rules, camera review paths, manual-edit allowance and diagnostics before evaluation. Do not tune one arm against the evaluation views.

Both arms use the same original-photo-derived boundary and scale transform, established before Shado generation. Adding frames may affect joint estimation: retain both raw estimates and registered candidates, quantify original-camera/surface movement, and reject source conflicts under the same frozen policy. The original result is never overwritten.

B deliberately receives additional generated views. Record selected frame count, temporal correlation, total frames attempted/rejected, all paid attempts, GPU time, latency, peak resources and manual work. Do not interpret that resource difference as an isolated model-quality effect. A fixed shared resource ceiling may stop B early; record that outcome. Equal-count resampling of originals is an optional control, not independent new evidence.

Report camera registration success, original-view consistency, accepted/rejected frame counts, boundary violations, missing coverage, source conflicts, surface artifacts, thin-object preservation and time/cost. Report raw reconstruction separately from authored closure/completion, so a filled hole cannot masquerade as an accuracy gain.

With all 5–7 photos conditioning generation, comparisons back to those photos are **conditioning consistency**, not held-out accuracy. For an independent test, reserve extra captures that neither reconstruction nor generation sees, or use a controlled synthetic room with known geometry. If only 5 photos exist, do not quietly sacrifice one and leave the coverage consequences unreported. No metrically accurate physical-room claim follows from an estimated area.

Formal paper results require a frozen multi-scene protocol, independent geometry/reference evidence where claimed, all-attempt reporting and separate HCI/study authorization. This first version is an integration/feasibility comparison.

## Approximate area mechanics

Store the statement “probably around 300 sqft” as a user-reported estimate. Its nominal area is about **27.9 m²**, not a measured 27.9 m² floor.

If a confirmed reconstructed floor polygon has area `A` in reconstruction units, a nominal uniform display scale could be `sqrt(27.870912 / A)`. This is an authored normalization to remembered area. It cannot recover an unknown aspect ratio, hidden wall, ceiling height or the user's uncertainty interval. Reject zero/invalid area; retain the unscaled candidate and the applied transform.

Show “Approximate scale — based on your remembered area.” Allow correction or an optional measured length. Do not invent a statistical confidence interval from “probably.” Keep model-estimated scale and user-prior scale separate; compare both arms under the same transform rather than rescaling each to flatter its result.

## One-room boundary and visual acceptance

The confirmed envelope is a floor polygon plus reviewed wall/ceiling surfaces and opening masks; do not assume every room is a rectangular box. Clip/reject inferred contributions outside it, remove geometry visible through openings, and cap those openings at the selected room's boundary. Glass need not reveal a modeled exterior: a pane or opaque appearance can close the boundary.

Closures deliberately differ from photos showing an open door. Report them as authored exclusions/completion, never as recovered surfaces. Record opening masks once and apply the same evaluation mask to A/B; report closure appearance separately. The envelope must contain one selected room, not merely one connected mesh: several rooms joined by a door are connected too.

Surface, point and edge modes share the same accepted geometry, source associations and camera. Test against the [first Hypersim point capture](../design/revisions/room-r03/implementation/after/desktop-points.png) at matching views. Proposed point method: dense surface sampling with a consistent world-space spacing target, explicit thin-object preservation and perspective-scaled dots. Open3D provides uniform and Poisson-disk mesh sampling as candidate building blocks; a whole-scene low point count is not the objective. Freeze common rendering rules across A/B so density does not favor either condition.

## Handoff contract to implement after decisions

Use a versioned, bounded data schema and private artifact manifest, not generated executable code:

- Room/job/condition IDs, parent/source IDs, content hashes, input eligibility and processing permissions.
- Provider/model/workflow/checkpoint versions; prompts, selected references, seed when supported (explicitly unavailable otherwise), run IDs, quotes/receipts and timestamps.
- Frame IDs/timestamps, original versus generated origin, camera matrices, distortion/preprocessing transforms, coordinate handedness, pose direction and units.
- Numerical depth, validity and model scores; depth convention, normal convention, image/geometry masks, track associations and marker metadata only where present.
- Boundary revision, opening closures, user-confirmed assumptions, uncertain area statement, scale source/transform.
- Raw and completed geometry, texture/appearance provenance, per-face or per-sample source contributions; generated-influenced mixed regions must not be labeled original-only.
- Diagnostics, rejection reasons, missing fields, failure/cancellation state, all-attempt counters and artifact integrity/size limits.
- Private artifact lifetime, deletion status and export policy. Public evidence excludes personal room photos by default.

Suggested cloud phases: intake -> eligibility -> photo estimate -> boundary review -> paired job definition -> actual Shado video -> frame checks -> A/B reconstruction -> comparison/export. Each phase exposes its real status. Existing Shado billing and Modal inference are distinct costs. Prepare an exact bounded quote before a paid pilot; previous GenRC/Weave allowances do not carry over. No blind retries after an uncertain paid submission.

Proposed allocation: keep video generation in the existing Shado provider workflow; run the pinned geometry estimator, segmentation and Open3D stages in a separate Modal job. This reuses the established cloud direction without claiming that the old GenRC image supports the new stack or that current credentials, quotas and provider readiness have been verified.

Recommend transient cloud copies with deletion after successful download or a short stated expiry, and optional explicit private project retention. Provider retention must be verified separately; deleting EVA storage is not proof of provider deletion. Do not promise a retention period before the providers and storage lifecycle are configured and tested.

## Decisions reviewed before implementation

These decisions cover the gap table. The owner accepted D1–D5 recommendations and automatic integration under D6, then authorized implementation. Approximate area remains an annotation until a separately reviewed scale transform exists. Natural-feature refinement and SAM2 correction UI are still unfinished.

| Decision | Recommended choice | Alternative / clarification |
| --- | --- | --- |
| **D1 — Common geometry substitute** (R01/R03/R04/R09/R12) | Use VGGT plus geometric refinement for both A and B. Treat original images as anchors; keep ViPE as a separate optional diagnostic. | Require a video-specialized ViPE arm too; this adds a third condition and compute, rather than changing only B's estimator silently. |
| **D2 — Missing guaranteed 360-degree generation** (R02/R09/R12) | Start with one bounded real Shado video attempt; report achieved coverage and accept a visible failed/partial comparison if it drifts. | Require several separately bounded overlapping clips in version one. More clips increase generation cost and cross-clip consistency work; they still do not guarantee 360-degree geometry. |
| **D3 — Missing marker/learning system** (R05/R13) | Natural feature tracking on ordinary photos, plus a separate synthetic ArUco fixture for testing the marker mechanics. No training/transfer claim. | Require physical measured markers in new captures, or prioritize a separate marked-versus-unmarked generated-video research experiment before the upload demo. |
| **D4 — Masks, closures and scene outputs** (R06/R07/R10) | SAM 2 suggestions with user corrections; geometric room fitting and simple authored door/window closures; mesh-derived surfaces/dots/edges. | Manual masks and boundaries first to reduce model dependencies. Neither option generates adjoining rooms. |
| **D5 — Uncertain scale** (R08) | Use remembered area only as editable approximate presentation scale; preserve original units and disclose uncertainty. | Require a measured length before presenting metric dimensions; the room can otherwise remain at relative scale. |
| **D6 — Handoff and private cloud lifecycle** (R11) | Actual Shado export/import for the first comparison, then scoped service integration. Default to transient cloud artifacts and explicit opt-in saved projects. | Require automatic EVA-to-Shado dispatch in version one; this needs a new scoped integration. Clarify whether private originals/results should persist for later reopening. |

Approval of these architecture choices is not an open-ended paid-run allowance. The initial clip/model/runtime settings and cloud quote will be made concrete before execution.

## Source verification and readiness

Primary documentation inspected on 2026-10-20; API/readme/tutorial review, not a new full-paper evaluation or execution of these models:

| Source | Verified capability / practical limit |
| --- | --- |
| [VGGT official repository](https://github.com/facebookresearch/vggt) | Camera/depth/point/track prediction and COLMAP export with optional bundle adjustment. Original and commercial checkpoints have different terms; pin the selected checkpoint and review access/license before acquisition. Newer VGGT-Omega is linked upstream, but is not selected or evaluated here. |
| [COLMAP official tutorial](https://colmap.github.io/tutorial.html) | Feature matching, geometric verification, camera recovery and dense reconstruction. Overlapping translated viewpoints matter; an in-place rotation alone is poor capture guidance. |
| [ViPE official repository](https://github.com/nv-tlabs/vipe) | Video camera/intrinsic and near-metric depth estimation, including panoramic footage. Outputs remain estimates; third-party model licenses vary. Not installed or tested for this project. |
| [SAM 2 official repository](https://github.com/facebookresearch/sam2) | Promptable image masks and video mask propagation. Does not establish semantic room boundaries or metric geometry on its own. |
| [OpenCV ArUco tutorial](https://docs.opencv.org/4.13.0/d5/dae/tutorial_aruco_detection.html) | Marker detection and pose machinery requiring calibration/marker geometry for meaningful pose interpretation. Decodable generated tags are not independent scene validation. |
| [Open3D mesh tutorial](https://www.open3d.org/docs/release/tutorial/geometry/mesh.html) | Uniform and Poisson-disk surface sampling. Existing EVA Open3D use does not establish the quality of the proposed new sampler. |

Before model acquisition: pin source/checkpoint hashes, inspect exact licenses, select a cloud image and finite resource limits, and test one actual bounded end-to-end input. Do not silently reuse GenRC's old CUDA/PyTorch environment for a different model stack.

The original document was checked through source/readme inspection, local links, diff/whitespace and consistency review. Subsequent application, protocol, geometry and browser checks are recorded in the [implementation review](../design/revisions/room-upload-v1/REVIEW.md). Actual VGGT cloud execution is recorded in the [pilot](ARKITSCENES_PILOT.md); authenticated Shado generation has not run. Visual acceptance, reconstruction accuracy and paper milestones remain pending.
