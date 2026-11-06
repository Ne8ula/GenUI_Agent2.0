# Idealized room reconstruction

2026-10-21 · Design specification v1 · **Owner-approved for implementation planning**

The owner selected **Idealized recreation**, approved the proposed hybrid approach, and subsequently approved this written specification on 2026-10-21: retain the photographed room's character, but permit cleaner replacement furniture, adjusted proportions and plausible invented details. The owner also approved Native execution of the [implementation plan](../plans/2026-10-21-idealized-room.md); offline implementation is now in progress. Visual prerequisites, real room/inventory review, paid execution and quality acceptance remain separate gates. The final presentation is limited to visual comparisons and switching buttons; explanations and authoring/review controls remain on the separate private route.

## 1. Outcome and scope

Produce a clean, coherent, editable single-room scene rather than expose a noisy scan as the finished experience. The reconstruction supplies spatial evidence; it is not the final object's topology. Complete room surfaces and furniture are authored or generated hypotheses, not recovered truth.

Two views remain available:

- **Evidence:** immutable original photos, raw VGGT/WorldMirror estimates and their diagnostics.
- **Idealized room:** a reviewed architectural shell and complete major furniture, with stable identities, readable materials and inspectable source links, substitutions and uncertainties.

"Complete" means the reviewed room shell and every object in the accepted major-object inventory have a valid representation. It does not mean every real object was detected, hidden surfaces are accurate, or the result is geometrically perfect. Coverage, source agreement and aesthetic approval are separate outcomes.

### First milestone

Build one separate candidate for the retained seven-original room **42445021**, using its admitted WorldMirror estimate and the existing VGGT arm for comparison. Construct complete procedural furniture before making SAM 3D a dependency. Use input-driven dimensions, palette and placement; no room-ID branches or imported benchmark layout.

The same assembly code must pass different synthetic layouts, including a no-desk room. This establishes reuse and failure behavior, not real-room generalization. A separately authorized transfer test on another real room follows before claims about arbitrary uploads. Room 45261631 remains a prepared transfer probe, not an executed result.

### Out of scope

Multi-room expansion, panorama generation, RealSee3D, a new room estimator, a full CAD editor, physics simulation, photorealistic texture generation, arbitrary asset search, conversational memory editing and new native deployment. The required real Shado comparison remains pending and is not replaced by this idealized candidate.

## 2. Decisions and alternatives

**Selected: reconstruction-guided scene assembly.** Use procedural architecture and furniture for reliable completeness; selectively upgrade objects through SAM 3D after its independent trial. This separates room coherence from any one model's success.

- Scan cleanup alone can denoise points but cannot supply coherent unseen furniture.
- SAM 3D alone supplies object hypotheses, not joint room contact, collision or identity guarantees.
- Unconstrained room generation may look polished while abandoning the source layout; it is not the selected route.

The new idealized mode permits shape simplification, hidden backs/supports, modest proportion changes and explicit replacement designs. It does **not** silently add an arbitrary furniture inventory to fill empty areas. A new object with no source support requires a specific owner-authored addition; it remains an authored addition, not a successful detection. This distinguishes permitted invented details from fabricated evidence.

Existing evidence-oriented completion behavior remains unchanged. The earlier [general completion requirements](../../research/GENERAL_ROOM_COMPLETION.md) still govern source isolation, automatic suggestions, corrections, boundaries and transfer evidence; the opt-in idealized mode relaxes literal shape fidelity, not those protections.

## 3. Existing foundation and gaps

These are inspected implementation seams and retained reports, not fresh runtime results from this specification pass.

| Reuse | Boundary of existing capability |
| --- | --- |
| [Object masks](../../../scripts/room_workflow/object_suggestions.py), [worker](../../../scripts/room_workflow/object_worker.py), [cloud runner](../../../scripts/room_workflow/object_cloud.py) | Source-bound automatic suggestions exist; one retained pilot contains wrong labels and missed objects. No new detection allowance is implied. |
| [Object proposals](../../../scripts/room_workflow/object_proposals.py) | Visible support and conservative grouping, not full extents. Currently tied to VGGT's 518 raster and analysis frame. Do not feed WorldMirror fields through it unchanged. |
| [WorldMirror adapter](../../../scripts/room_workflow/worldmirror_adapter.py) | Reversible image/camera/world/SAM transforms and pointmap checks; no SAM model execution or learned quality proof. |
| [Candidate conversion](../../../scripts/room_workflow/worldmirror_candidate.py) | Saved WorldMirror registration and separate raw/fused/shell candidates; boundary remains unconfirmed. |
| [CPU completion](../../../scripts/room_workflow/complete_candidate.py), [boundary review](../../../scripts/room_workflow/boundary.mjs) | Reviewed enclosure and caps; not furniture completion. |
| [Broker](../../../scripts/room_workflow/broker.mjs), [worker validator](../../../scripts/room_workflow/result.mjs), [benchmark loader](../../../scripts/room_workflow/benchmark.mjs) | Bound artifacts, local processing and interruption patterns. Existing strict reconstruction validators must not be weakened to disguise an idealized scene as an inference result. |
| [CandidateView](../../../week4/app/src/room/CandidateView.tsx), [point colors](../../../week4/app/src/room/point-colors.ts) | Shared surfaces, points, edges, provenance, dark-point contrast and camera continuity. Object selection/edit persistence and a closed idealized-artifact validator still need implementation. |

The [authored aesthetic study](../../../week4/app/src/room/aesthetic-room.ts) supplies a visual reference only. Its inventory, dimensions, coordinates and palette are not a production fallback. Small geometry-building patterns may be extracted only where truly reusable and covered by both old and new tests.

## 4. Pipeline

### 4.1 Freeze evidence and coordinate bindings

Bind the exact ordered original IDs/hashes, estimator artifact, preprocessing, cameras, registration, room review and correction revision. Do not mix the matched seven-photo set with the broader-view study. Supplied ARKitScenes depth/poses are evaluation-only and cannot enter generation, fitting or automatic object selection.

Use one named candidate frame, Z-up, in relative units. Record reversible transforms to each estimator's source frame. A mask follows its source image's actual normalization, resizing and padding; no independently resized pointmap. Reuse the existing arithmetic, with explicit estimator-specific field admission rather than a generalized provider framework.

The retained boundary/frame mismatch is a first-milestone blocker: either transform an existing review through a verified binding or obtain a new review in the correct frame. An unconfirmed boundary may yield a clearly marked draft preview, never a ready candidate. Remembered floor area is an uncertain scale prior, not permission to label relative coordinates as measured meters.

### 4.2 Propose and review the object inventory

Start from validated automatic detector/mask outputs. Associate observations using source-linked support and conservative cross-view identity; label single-view, conflicting and duplicate sightings. Keep stable object IDs independent of display names and mesh regeneration. Split/merge operations record predecessor IDs and invalidate dependent fits.

The normal future upload flow must not require manually drawing every object. In this first retained-artifact milestone, reuse compatible saved masks and offer targeted corrections for missing chairs, wrong labels and hallway detections. If a needed observation cannot be obtained from retained evidence, leave a review blocker or prepare a separately priced detector run; do not claim automatic detection succeeded.

Accept an explicit inventory of major objects. Small clutter may be omitted with a recorded reason. Unsupported categories or unresolved object identity remain review items, not generic furniture inserted silently.

### 4.3 Construct architecture

Reuse the reviewed concave boundary, floor/ceiling and opening records. Build clean continuous planar surfaces with consistent normals and readable source-derived palette. Do not assume all rooms are rectangular or snap every corner to 90 degrees. Any proposed boundary change requires renewed review before promotion.

Preserve the single-room door/window closure policy: openings remain identifiable architectural features with separately labelled caps, without exposing or inventing an adjoining room. Caps and the shell can be inspected separately from furniture in provenance. Reject self-intersections, invalid heights and internal disconnected wall fragments.

### 4.4 Create complete procedural furniture

Start with a closed, deliberately small family set: table/desk, chair, sofa, cabinet and bed. Families describe local topology, not a fixed room inventory. Their proportions, orientation, palette and placement come from this job's support and corrections. Hidden thickness, backs and supports are bounded design priors recorded as such; visible bounds are not asserted to be complete dimensions.

Each family produces coherent finished parts: for example, a table top and supports, a chair seat/back/supports, or a cabinet body with closed sides. No large flat bridges between unrelated fragments. Primitive parts may meet at declared assembly contacts; watertight union of an entire multi-part object is not required, but nonfinite, degenerate and unintentionally open parts are rejected.

Fit only a bounded set of parameters: dimensions, yaw, translation and family-specific proportions. Avoid uncontrolled vertex warping to noisy points. Identity and approximate footprint matter more than matching every scan irregularity. If fitting cannot produce a plausible complete object within constraints, mark it for correction rather than stretching it through walls.

M1 uses procedural geometry and sampled colors only. Third-party replacement assets are a later option requiring an approved local catalog, license/source record, hashes and resource admission; no automatic download or new dependency is needed for the first candidate.

### 4.5 Fit and assemble the room

Evaluate objects jointly after individual fitting. Check full meshes against the concave room volume, floor/support contact, other objects and opening clearances. Vertex-only or bounding-box-only containment is insufficient: edges/faces can cross a concavity with every vertex inside. Bounding boxes are a broad-phase check, not final admission.

Permit intended relationships, such as a chair under a desk, without treating overlapping bounding boxes as collisions. Contact tolerances and intended touching parts are explicit. No physical stability claim is made from contact alone.

Fit to all usable supporting original views with occlusion-aware silhouette/position checks. Separate the view used to condition a generated object, other conditioning photos and genuinely withheld evaluation photos. Unknown or occluded regions are not a mismatch score of zero. Idealization may change detailed silhouette, but large identity/layout disagreements require review. Record raw residuals rather than an invented confidence percentage.

Freeze scale-relative tolerances, scoring policy and manual review criteria before inspecting candidate results. The implementation plan must name these constants and calibration fixtures; they are not established quality thresholds today. Until calibrated and reviewed, soft-fit results remain review-required, even if hard safety/geometry checks pass.

The idealized view is a new assembly of shell plus admitted objects, not a noisy mesh with replacements pasted over it. Its manifest records which source fragments each object represents and what clutter was omitted. Ambiguous source assignments remain unresolved; they cannot remove evidence from the immutable raw view. This prevents doubled chairs and prevents random cleanup from deleting neighboring furniture.

### 4.6 Selective SAM 3D upgrade

Only after M1, trial one conservatively associated object. Bind one original RGB image, reviewed binary mask, exact compatible WorldMirror pointmap and reversible transforms. Preserve raw decoder mesh and decoded pose, then run the same placement and source-agreement checks as for procedural objects. Do not infer RGB from unverified mesh attributes or mistake exported GLB axes for decoder coordinates.

SAM failure or rejection retains the prior admitted procedural object and an explicit failure reason. It does not trigger another paid run, silently switch providers, change evidence labels or block reopening the scene. Acceptance compares the procedural and SAM versions under identical cameras and display settings.

The official interface and pinned research are documented in [WorldMirror + SAM 3D](../../research/WORLDMIRROR_SAM3D_COMBINATION.md). Authenticated configuration inspection, dependency review, runtime parity and a new resource plan remain prerequisites, not tasks completed by this spec.

## 5. Artifact and trust contract

Add a separate proposed `eva-idealized-room-v1` artifact, described by an EVA-owned JSON Schema Draft 2020-12 schema and semantic validation in Python and Node. Do not pass it through the old A/B worker envelope or reuse Shado's `generated-influenced` meaning to pretend authored furniture is upstream reconstruction.

The contract contains:

- Version, kind, job/candidate IDs, parent revision, source bindings and relative coordinate-frame transforms.
- Reviewed boundary/opening binding, inventory revision and mode `idealized`.
- Stable object records: category, source observations/mask hashes, visible support, family or generated asset reference, dimensions/pose, inferred-design parameters, material provenance and correction lineage.
- For generated objects only: pinned model/config/implementation hashes, seed, actual run/receipt reference and raw artifact hashes. A metadata record cannot grant execution authority.
- Face-to-object mapping and exact contiguous face ranges; every rendered face belongs to a shell, cap or object record. Provenance is assigned per face, never inherited through a shared vertex.
- Separate origins for estimated evidence, authored shell/caps, procedural idealization, model-generated object and owner-authored addition. A newly constructed object is inferred throughout, even where it resembles a photograph. A sampled color is not evidence of recovered hidden geometry.
- Fit diagnostics, rejection/review reasons, omissions, admitted display-geometry hash and explicit limitations.

Reuse the existing numeric budgets where applicable: at most 200,000 vertices and 400,000 triangles in an admitted render payload, bounded finite coordinates and RGB in [0,1]. Proposed M1 adds at most 64 object records, 16 MiB of metadata and 64 MiB total serialized candidate output. Validate encoded and decoded sizes before allocation, including archive expansion, array shapes, indices and referenced file hashes. Oversized results fail; no silent truncation.

Artifact references are root-contained, hash-bound local assets; reject traversal, remote URLs, unexpected fields, executable payloads and unrecognized provenance. No YAML/object deserialization of untrusted output. Keep data-only output, safe numeric arrays and validated JSON. The browser's permissive provenance fallback is not a trust boundary; the broker must enforce the closed contract first.

Write a fresh exclusive candidate directory. Save bounded diagnostics/partial or rejected output separately; commit the ready manifest last. Existing raw files, candidates and receipts are never overwritten. Reopening verifies bindings and hashes, not just the presence of a success flag.

## 6. Lifecycle and correction

Keep current reconstruction and Shado job states intact. The proposed idealization sidecar has its own state:

`not-started → preparing → needs-review | ready | failed | cancelled`

A ready candidate means it passed artifact/geometry checks and required room/inventory review; it is not owner quality acceptance. A draft may be inspectable in `needs-review` without being presented as completed.

Corrections support category, template choice, translation, yaw, dimensions, omission/restoration and explicit addition. Use simple existing form/control patterns, not a new gizmo framework. Undo restores a prior presentation revision; it does not restore cloud permission. Every edit creates a bound revision and reruns affected fitting plus room-wide collision checks before readiness.

Changing originals, masks, boundary or inventory invalidates dependent candidates. Late worker responses cannot replace a newer revision. A failed or cancelled refresh retains the last admitted candidate with honest loaded identity. Cancellation terminates only owned work; uncertain remote termination blocks another paid attempt until inspected. Saving/reopening must preserve edits, stable object IDs and explicit unresolved items.

## 7. Shared viewer integration

Reuse `BenchmarkRoom`, `UploadRoom` and `CandidateView`; no separate viewer or new rendering engine. Add an explicit idealized-candidate route/selection alongside raw and fused evidence, without changing the historical benchmark arms' identities. Prototype labels are **Evidence** and **Idealized room**, subject to the scoped visual review.

Preserve camera, source selection, representation, point style, contrast and selected object across same-frame switches. Source/frame changes retain the existing reset policy. A later object upgrade replaces only that identity, not the whole scene's navigation state.

Retain Paris matrix, uniform dots, surfaces, edges and provenance. Enhanced contrast remains available for black furniture. Keep hollow inferred marks in point modes and explicit status in surface mode; provenance is not conveyed by color alone. The idealized scene must also read as coherent in solid surfaces, not hide defects through sparse dots.

Object picking must use the face-to-object map; keyboard and touch get the same object list/details/corrections. Source links and inferred-design notes stay accessible without turning the primary scene into a diagnostics dashboard. No new animation is needed for M1; replacement is stable and reduced-effects behavior remains supported.

Before frontend changes, obtain the fresh scoped [Weave packet](../../design/FIGMA_WEAVE.md) or an explicit owner waiver covering this new pass. The specification is not that reference packet. Existing references and consumed credits do not authorize new generation.

## 8. Implementation boundaries

Implementation areas below define the intended boundaries; the plan and execution evidence track which files and behavior actually exist.

| Area | Proposed change |
| --- | --- |
| `scripts/room_workflow/idealized_room.py` | Deterministic shell/object assembly, bounded fitting and diagnostics; reuse existing geometry and boundary helpers. |
| `scripts/room_workflow/idealized-room.schema.json`, `idealized-result.mjs` | Closed artifact schema and host admission, sharing safe existing hash/numeric helpers where useful without weakening old contracts. |
| `scripts/room_workflow/object_proposals.py`, `worldmirror_adapter.py` | Finish estimator-specific mask lifting/frame binding with old VGGT behavior preserved; avoid a generic adapter hierarchy. |
| `scripts/room_workflow/broker.mjs`, `benchmark.mjs` | Add separately bound idealization sidecar/load path; preserve existing local completion and A/B semantics. |
| `week4/app/src/room/{BenchmarkRoom,UploadRoom,CandidateView}.tsx` | Reuse display/continuity; add object identity inspection and bounded corrections only after visual prerequisites. |
| Focused Python/Node/app/browser tests | Exercise real validators and shared callers, rejection and interruption, not just mocked successful meshes. |
| Later `sam3d_worker.py` and bounded cloud adapter | One pinned object-generation path; reuse transport/receipt patterns only after reviewing their documented limitations. |

Avoid adding a provider registry, workflow engine, external asset service or new state framework. Inspection during implementation may justify splitting a real distinct responsibility, not speculative scaffolding.

## 9. Stages and release gates

1. **Specification review (approved 2026-10-21):** owner approved this written specification. No application changes, new executions or runtime claims.
2. **Implementation plan (approved 2026-10-21):** Native execution selected. Preserve concurrent work; no automatic commit or publishing.
3. **Offline assembly:** schemas, frame binding, procedural families, corrections and placement checks with synthetic fixtures and retained artifacts. Reuse the existing CPU environment; no new model installation. A blocked real boundary or inventory review remains visible rather than being fabricated.
4. **First-room candidate and viewer:** reviewed 42445021 boundary/inventory, fresh visual prerequisite, real source-bound assembly, matching captures and owner exercise. Save a separate candidate and leave raw evidence selectable.
5. **One-object SAM trial:** verify secure access/config and freeze a plan with exact source/checkpoint/asset hashes, dependencies, hardware, timeouts, max outputs, attempt count, cleanup, upload scope and cost estimate. Request fresh finite approval before any acquisition/build/compute. No automatic retries or access-gate bypass.
6. **Upload and transfer:** connect automatic suggestions plus correction to the upload path; verify a normal automatic run and independently selected real layouts under separately approved execution. Do not claim general completion from M1.

The old detector, WorldMirror and Weave allowances are consumed. A single operator submission may be restarted by provider preemption; disclose that and the lack of a provider-enforced dollar cap in the later execution quote. Never ask for credentials in chat or print them. No local GPU setup is authorized.

## 10. Acceptance matrix

All rows below are **planned**, not passed tests from this pass.

| Gate | Required evidence |
| --- | --- |
| Source/frame integrity | Exact ordered RGB/hash binding; nontrivial frame/resize/crop round trips; wrong-frame review, stale masks and substituted images rejected; supplied depth/poses rejected as model inputs. |
| Geometry and limits | Every generated part finite and correctly indexed; no degenerate faces/unintended holes; aggregate resource caps enforced before allocation; malformed/oversized/unknown-origin payloads rejected. |
| Complete objects | Accepted inventory items represented by coherent full objects in surfaces and points; no large flat patch bridges, doubled fragments or room-specific hardcoded furniture. |
| Placement | Concave-boundary edge-crossing test, floor/support contact, chair-under-table noncollision, actual interpenetration rejection and opening-clearance review. Failed fits remain correctable. |
| Identity/correction | Split/merge, unsupported class, missed detection, single-view ambiguity and contradictory views; automatic suggestions first, corrections retained; undo/save/reopen and stale output do not duplicate objects. |
| Mode isolation | Raw artifact hashes and old VGGT/WorldMirror/Shado meanings unchanged; no-desk fixture gains no desk; explicit additions remain owner-authored. Procedural/SAM output never becomes photo-estimated. |
| Lifecycle | Cancellation before/during work, interrupted disk write, late response, stale review, invalid manifest and failed upgrade; previous admitted candidate remains available, no automatic billable retry. |
| Visual comparison | Fixed viewport, camera, geometry frame and controls for raw/fused/procedural and later SAM candidates; inspect multiple interior views, backs/sides, near/far, surfaces, provenance and dark-object contrast. Density is not accuracy. |
| Interaction | Keyboard/focus, touch emulation, reduced effects, object selection, context recovery, source/frame resets and shared upload regression. Physical-phone/native claims require their own actual runs. |
| Owner review | Recognizable room, coherent silhouettes, usable composition and acceptable substitutions; all major-object and room reviews resolved or visibly blocking. Record explicit decision against a tested source/candidate revision. |
| Generalization (later) | Independently frozen real rooms, no-desk and poor-overlap cases, withheld original views where available and an actual automatic upload path. Report failures; do not select only flattering views. |

Freeze image sets and evaluation criteria before generation. Report conditioning-view agreement separately from withheld-view results. Attractive coverage and fewer holes measure presentation completeness, not recovered truth. Keep rejected meshes, receipts and captures.

Implementation evidence belongs in `docs/design/revisions/idealized-room-v1/` and the decision in `docs/design/acceptance/idealized-room-v1.md`, created with actual implementation evidence rather than invented now. The source snapshot must cover the tested code, artifact hashes and configuration. Quality acceptance defaults to pending.

## 11. Known blockers and review decision

- Retained first-room boundary is unconfirmed and object-support/frame reconciliation is unfinished.
- Existing masks contain missed/wrong objects; no blanket automatic inventory success is established.
- SAM checkpoint access is owner-reported, not authenticated/runtime-verified; a complete pinned cloud plan cannot be quoted from the public README alone.
- Relative scale, unsupported hidden geometry and pose ambiguity limit fidelity. Idealization can make a room plausible, not guarantee it is historically exact.
- Runtime geometry quality, new UI, transfer and billing have not been checked during this documentation pass. The automatically stopped dev server is not restarted by preparing this spec.

**Decision recorded:** the owner approved this specification and then Native execution of the [implementation plan](../plans/2026-10-21-idealized-room.md) on 2026-10-21. Offline implementation is in progress. Neither approval authorizes new spending, downloads, external publication or a claim of quality acceptance.

## References

- [Current scope](../../../PLANNING.md) and [visual direction](../../../DESIGN.md).
- [General room completion](../../research/GENERAL_ROOM_COMPLETION.md).
- [Object suggestion pilot](../../research/OBJECT_SUGGESTIONS_PILOT.md).
- [WorldMirror/SAM interfaces, pinned source and actual execution record](../../research/WORLDMIRROR_SAM3D_COMBINATION.md).
- [Matched viewer evidence](../../design/revisions/worldmirror-viewer-v1/REVIEW.md).
- [Official SAM 3D Objects repository](https://github.com/facebookresearch/sam-3d-objects), read on 2026-10-21 for documented scope; not proof of EVA runtime compatibility.
