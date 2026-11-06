# General room completion: implementation boundary

2026-10-20. Owner requirement: the fix must work from each uploaded room, not reproduce the seven-photo benchmark. The owner explicitly selected **automatic object suggestions, with corrections only when needed**. Mandatory manual furniture marking is not an acceptable first-version substitute.

The normal path must propose objects and their photo regions automatically, associate repeated sightings across views, and proceed without requiring users to label every object. Offer targeted correction for uncertain identity, masks, duplicate/split objects or conflicting placement. Unsupported objects remain unresolved rather than acquiring generic benchmark furniture. This decision sets product behavior; it does not establish that the proposed models are integrated or authorize a new paid run.

## Implemented and verified

The shared `CandidateView` now supplies Paris matrix rendering for upload jobs as well as the saved benchmark. Uploads open in points. Geometry, colors, cameras and per-face provenance come from the selected job; the renderer does not import the authored furniture study. Filled marks identify photo-derived estimates, while inferred/generated faces use hollow marks. Surface samples retain their source triangle so the same distinction works in uniform dots. A shared vertex cannot transfer an inferred label to its neighboring photo-derived face.

The authored `aesthetic-room.ts` scene remains an explicitly labeled benchmark-only visual study. Its fixed room dimensions, furniture inventory, placements and palette must never be an upload fallback. Rendering a complete authored cabinet establishes an aesthetic target, not a learned method for completing a different cabinet.

[Verification and limits](../design/revisions/general-room-style-v3/REVIEW.md).

## Still missing

The [automatic suggestion operator route](OBJECT_SUGGESTIONS_PILOT.md) is implemented and offline-tested: Grounding DINO prompts SAM 2 masks, and CPU code lifts/associates source-linked regions using saved VGGT fields. One approved model attempt returned 18 validated suggestions; actual 3D association, upload UI integration and corrections remain unverified or unfinished. This is not full-shape generation.

The current deployed VGGT route estimates cameras and depth. CPU fusion and boundary closures do not identify or complete furniture. No automatic arbitrary-room full-shape completion has been implemented or demonstrated. No renderer change repairs the underlying fragmented desk.

The next implementation must derive all object inventory, bounds, placement and colors from the current job's inputs and reviewed corrections. There must be no capture-ID branches, fixed photo ordinals, benchmark palette, known desk coordinates, prescribed furniture count or default furniture inserted into an unrecognized room.

## Proposed automatic completion route

1. Detect object suggestions in every eligible original photo. Grounding DINO is a candidate for text-conditioned object boxes; a configurable list is not proof that all furniture was recognized. Unsupported or ambiguous regions must remain unresolved.
2. Obtain masks using SAM 2 from automatically detected prompts; require no manual box/mask on the normal path. Permit correction when needed. A mask is a photo region, not a complete 3D object or stable cross-view identity.
3. Lift masks through the existing VGGT depth/camera fields, applying the actual per-image resize/padding transform. Associate sightings using geometric overlap and appearance, with explicit split/merge correction. Preserve source IDs and hashes.
4. Complete each accepted object with a model intended for occluded objects, then fit its pose and relative scale against all supporting original views. **SAM 3D Objects is a candidate to evaluate**, not an integrated dependency. Its official repository describes single-image masked-object shape, texture and layout prediction. Outputs are hypotheses; independent views must check silhouette and alignment.
5. Admit whole objects only inside the confirmed single-room volume, including concave boundaries. Reject or request correction for crossing objects rather than clipping them into new fragments. Preserve door/window caps and never add adjoining rooms.
6. Store a separate candidate, its model revision, source masks, fit residuals and generated-part provenance. Keep the raw estimate and failures. Use the shared renderer for matrix, dots, surfaces and edges.

SAM 3D Objects' [official setup](https://github.com/facebookresearch/sam-3d-objects/blob/main/doc/setup.md) requires Linux, an NVIDIA GPU with at least 32 GB VRAM and approved/authenticated checkpoint access. The owner's latest 2026-10-20 report says access is approved, superseding the earlier no-access report. A local check found no existing standard HF credential, so authenticated checkpoint access remains unverified. Its code is public under the SAM License; checkpoint access is a separate requirement. No checkpoint acquisition, new cloud deployment or paid object-completion run occurred in this pass. Prepare a bounded compatibility/generation quote after access is established; do not reuse the previous VGGT allowance as authorization for a new model.

Primary references inspected: [Grounding DINO documentation](https://huggingface.co/docs/transformers/v4.49.0/en/model_doc/grounding-dino), [SAM 2 repository](https://github.com/facebookresearch/sam2), [SAM 3D Objects repository](https://github.com/facebookresearch/sam-3d-objects). These establish available interfaces and authors' claims, not EVA runtime compatibility or room quality.

## Acceptance before claiming general completion

- Evaluate multiple independently selected rooms with different furniture, layouts, lighting and photo counts within the supported 5–7 input range. Freeze selection before results; retain failures. The seven-photo capture is a regression case, not the sole quality test.
- Include a partially occluded continuous desk, an unsupported object category, a room without a desk, duplicate views, poor overlap and contradictory room states. The no-desk case must not acquire benchmark furniture.
- Exercise a normal upload without manual furniture labels and verify that actual detector suggestions and masks populate it. Exercise ambiguous cases separately: corrections must update the associated object without duplicating it, and unresolved cases must not silently trigger template furniture or fabricated success.
- Check continuity and recognizable shape across held-out original views where available. Do not validate generated geometry solely against generated views or its own renderer.
- Test source/hash/review binding, stale masks, camera transforms and padding, duplicate identities, resource limits, cancellation and rejection of late output. Never counterfeit a photo-derived face to satisfy the existing worker validator.
- Test complete object containment against concave boundaries. A remembered “around 300 sqft” is only an uncertain scale prior, not measured dimensions or evidence of rectangular shape.
- Compare the required real Shado arm separately. The current bridge is unconfigured; neither an authored study nor a synthetic API fixture counts as its execution.

“Generalizable” means one input-driven pipeline with explicit failure/correction behavior. It cannot mean guaranteed accurate completion from every possible room/photo set.

## Offline follow-up boundary

2026-10-21. Local prerequisite inspection for Task 10 of the [idealized-room plan](../superpowers/plans/2026-10-21-idealized-room.md#task-10-prepare-independent-sam-and-automatic-upload-follow-ups) found reusable detector/mask contracts and source-bound CPU fitting. This is a bounded follow-up sequence, not implemented upload orchestration, an executable cloud plan or permission to run it. The [backend checkpoint](../design/acceptance/idealized-room-backend-v1.md) still requires explicit inventory; it does not satisfy the automatic normal path above.

### 1. Current-job source and execution boundary

Reuse the pinned [detector/SAM 2 manifest](../../scripts/room_workflow/object-models.json), [suggestion contract](../../scripts/room_workflow/object_suggestions.py), [lifting/association](../../scripts/room_workflow/object_proposals.py) and existing job locks, private storage and one-attempt receipts. Resolve only the authenticated owner's current originals/analysis and separately admitted estimator evidence. Do not expose a caller-selected path or reuse `retained-seven-photo-room` as an upload fallback. Before another paid upload, resolve the [existing lifecycle blockers](../../scripts/room_workflow/README.md#known-unfinished-work): cancellation versus allowance/Shado completion, returned-but-invalid detector quarantine, and source-fingerprint compatibility.

Required rejection tests: a foreign job, reordered/replaced original, stale mask/model fingerprint, supplied dataset pose/depth, generated-view input, duplicate normalized photo, unknown authority field and expired approval all reject before submission. Simultaneous requests consume one exact allowance. Cancellation before submission consumes none; after submission it retains the receipt and verifies only the owned work. Lost acknowledgements prohibit retry. Runtime logs are not allowed to expose private photos or credentials.

### 2. Automatic inventory, then targeted corrections

Use current-job region associations to propose stable object identities and source references. Normalize supported detector labels to the five procedural families while preserving original labels. Derive visible extents/colors from admitted support; incomplete dimensions are explicit priors, not measured full shape. Unsupported/ambiguous associations remain unresolved. Populate proposals automatically before asking for targeted corrections; never require manual labels merely to start. Keep boundary confirmation and exact inventory review distinct from candidate quality acceptance.

Required tests: an empty/no-desk room creates no default desk; unsupported labels create no template; repeated sightings do not duplicate furniture; same-image masks union correctly through the full loader; split/merge preserves source lineage and unresolved reasons; black support remains black; owner edits survive save/reopen. Test stale source/revision changes during fitting and that rejected updates leave the last valid candidate intact. A proposed source/proposal discovery contract still needs definition before UI wiring; none exists on HTTP today.

### 3. Freeze transfer inputs before any execution

Independently choose and freeze each 5–7-photo room, ordered original hashes, withheld views and intended boundary-review procedure before looking at generated output. Keep dataset depth/poses in evaluation-only storage. The current WorldMirror route rejects mixed processed rasters; either retain that explicit unsupported-input result or first review/test a common-raster policy. Do not silently distort image/camera/pointmap alignment.

Room 45261631 is not yet a qualified transfer case: the retained six-photo selection has weak overlap and an unconfirmed boundary. It needs a separately reviewed input/boundary decision, not a success label. Include a real normal-path upload with no manual furniture labels, then the empty/no-desk, unsupported and contradictory cases listed above. Each new model stage needs a freshly frozen executable plan, source/config pins, current resource estimate and its own finite approval; consumed detector/WorldMirror allowances are unavailable.

### 4. Release evidence and remaining gates

First prove source contracts, admission, lifecycle and CPU fitting offline. Only after fresh scoped Weave evidence and an authorized server restart, exercise private corrections and shared-view continuity/accessibility using actual current-job results. Preserve every failed input/run, matching before/after states and raw estimates. Release decisions require actual normal-upload and independent-room evidence plus owner review; synthetic tests alone cannot close them. SAM completion remains a separate [configuration-gated follow-up](WORLDMIRROR_SAM3D_COMBINATION.md#idealized-room-follow-up-checkpoint), and the real Shado comparison is neither removed nor replaced.

No endpoint, model worker, raster-policy change, study result or new spending approval is established by this sequence. The exact implementation plan and executable per-stage plans remain pending their prerequisites and separate review.
