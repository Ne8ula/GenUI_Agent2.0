# Crime-scene replacement: Argus and Kimodo

2026-10-28 · **Written design approved by the owner for implementation planning.** The owner also explicitly approved retiring obsolete live catalog/playback dependencies as part of the coordinated cutover. Source: `crimescene`, `0380e13efbdfa8c1ee29fe2c621927852b7766b7` plus preserved uncommitted work. No replacement inference, model download or paid execution has run.

Execution handoff: [new-conversation prompt](../../development/CRIME_SCENE_REPLACEMENT_HANDOFF.md). The owner selected Modal for Argus, Kimodo and every GPU workload, and at most **five agents total, including the coordinator** for this replacement. This scoped limit supersedes the usual three-worker cap; reuse workers, with at most four workers concurrent. No finite paid-execution budget was supplied. Written implementation-plan review, exact execution budgets, the Weave prerequisite and quality acceptance remain separate gates.

## Outcome and boundary

Replace the crime-scene generation/motion workflow, not the rest of EVA. Use Argus scene reconstruction, Kimodo user-requested human motion and an evaluated complete-object generator. Preserve the Arkham Knight-inspired detective/matrix aesthetic, original evidence access and explicit hypothesis labelling. The first quality milestone is one complete source-matched chair and one precisely aligned contact sequence, with full-body framing and clear, smooth cloud-rendered playback.

Owner decisions: hypothetical styling applies to hypothesis playback; missing chair surfaces may be generated but must match the source as closely as possible and remain labelled inference. Controlled contact animation is required before general-purpose interactions or rigid-body simulation. Accidental contact versus deliberate reach/touch/release remains a choreography decision, not permission to infer an event from the scene.

Out of scope: other weeks; bedroom/Hypersim/VGGT/WorldMirror/GenRC/upload-room replacement; Godot migration; validated forensic physics; voice; unrestricted generation; automatic publication. Original photos/scans, provenance and failed-run receipts must survive cleanup. Historical approvals confer no current spending authority.

## Verified starting point

- The retained browser app uses React/TypeScript and Three.js. Its evidence/notebook UI, consent/cancellation, review and hash-bound asset admission are reusable. A change of scene/motion providers does not require changing rendering engines.
- [Argus source preflight](../../design/acceptance/crime-scene-argus-pilot-v1.md) completed, but panorama projection/valid-region admission is still false: the bottom blank band is at least 15.625% of preview height. Argus inference has not run. The previously inspected upstream demo exports confidence-filtered points, not a watertight textured mesh.
- [Legacy v10 evidence](../../design/revisions/crime-scene-matrix-v1/REVIEW.md#modal-result--v10-2026-10-28) proves functional L4 playback, not acceptable framing/contact or final visual quality. Its recording is 1440×960/25 fps; browser DPR is 1 and renderer MSAA is disabled. No GPU saturation or sustained-render-FPS measurement exists.
- Current human motion selects stock named clips. It has no chair-relative hand target. Kimodo integration, skeleton conversion and contact verification are absent.
- Legacy SAM2→TripoSR outputs are not an accepted complete-chair solution. Existing fit scores are not a comparison of generators or proof of unseen geometry accuracy.

## One active pipeline

### 1. Source admission and Argus scene reconstruction

Reuse the FFS bounded acquisition/provenance and exclusive Modal plan/receipt/cleanup pattern. Resolve the panorama's spherical coordinates and invalid region explicitly before inference; never stretch, paint over or silently interpret missing pixels as a floor. Verify official gated checkpoint access, licence, pinned code/weights and input hashes before proposing an exact one-attempt cloud job.

Argus output becomes a separately identified reconstructed-scene candidate. Retain camera/depth/confidence/point outputs needed to reproduce its interpretation. A tested geometry conversion and source-supported surface-completion stage is required if the selected representation needs surfaces; Argus alone is not promised to close hidden geometry. Compare against the preserved scan in an explicit aligned frame. Record alignment and metric-scale assumptions rather than calling inferred geometry measured.

The measured scan remains evidence/comparison, not a second active generation workflow. Never replace it on disk with an Argus result. If source admission or quality fails, show that failure; do not silently substitute an older generator.

### 2. Complete hypothesis objects

Use admitted source photographs and reviewed object identity/crops. Generate complete geometry independently of the matrix material, fit it to source-supported placement, and review silhouettes, thin legs/rails, occluded surfaces and floor contact from multiple viewpoints. Preserve source-derived fit metrics, but supplement them with completeness and visual review: a partial scan fit cannot establish the correctness of hidden surfaces.

**Proposed first evaluation candidate: Microsoft TRELLIS.2**, not a declared accuracy winner. Its official repository documents image-to-3D PBR GLB export, MIT code/weights and a minimum 24 GB NVIDIA GPU. Published H100 generation timings are upstream reports, not EVA measurements. Inspect third-party dependency licences and actual artifact limits before any download/run. If it fails the source-matched chair test, compare an explicitly selected alternative under a separate finite approval rather than an open-ended model search.

Retain the existing owner review and fail-closed asset loader where possible. Candidate registration is not approval. Model payload bounds should be based on a finite quality/resource test, not blindly inherit the legacy 2 MB/40k-face producer caps. Any increase requires parser/resource rejection tests; no unbounded GLBs, external asset URLs or executable model output.

### 3. User request to Kimodo motion

Keep the existing investigator's scanned-clue eligibility, provenance, request consent, quotas, cancellation and strict bounded-data validation. Resolve the user's permitted action into an explicit motion task: actor identity, duration, scene-coordinate root path, object/hand contact anchors and contact interval. Ground anchors in the admitted candidate geometry; do not ask a text model to invent arbitrary contact coordinates or expand authority.

Send only the authorized motion prompt and bounded constraints to the Kimodo worker. No scene solution document, unscanned identities, raw private scene data or secrets are included by default. Use a pinned official model and export format after licence review. Kimodo's documented end-effector/path/keyframe controls are useful inputs, not a guarantee of contact or collision safety.

Import the numeric skeleton motion through a reviewed converter. Explicitly bind skeleton/joint order, reference pose, rotation convention, units, sample rate and coordinate transform. The documented SOMA BVH path uses centimetres while source motion is metres; do not apply an unverified scale or y-up/z-up assumption. Kimodo does not supply the final skinned browser character. Reuse a licensed rig only if retargeting can be verified; a mesh's reuse does not justify retaining the old stock-clip motion path.

After retargeting, solve/check hand contact and foot support against the admitted geometry. Preserve a held contact interval, reject unreachable targets, and detect penetration rather than disguising it with particles. A constrained kinematic action is labelled authored/generated hypothesis animation, not simulated event physics.

### 4. Playback and visual quality

Replace stock-pose playback with admitted sampled motion; keep one deterministic scenario clock, seek/pause, Escape, cancellation and static reduced-motion steps. Reuse the existing Three.js scene and matrix vocabulary. Full human and chair must remain readable; particles/dissolution are a restrained surface treatment, never a substitute for intact geometry or contact.

Use Modal GPUs for both model work and quality rendering. Choose hardware from actual memory/latency requirements, not the largest available instance by default. **Proposed quality target: native 2560×1440, 60 fps delivery.** Verify the actual framebuffer size, antialiasing, recording cadence and encoded output. A 25 fps Playwright WebM re-encoded to 60 fps does not meet this target.

Measure render frame-time distribution, long stalls and duplicate/dropped recording frames separately. Compare matched before/after framing and motion. Add GPU effects only where they improve readability without breaking the cadence. No claim of H100/L4 performance follows from their names or upstream timings. Fresh change-specific Weave stills plus motion and a finite cloud approval precede this visual pass; the supplied video remains owner guidance, not a gate waiver.

### 5. Admission, failure and cleanup

Reuse existing hash-bound catalog/owner-review seams and immutable per-attempt records instead of adding a second orchestration framework. Bind each scene/object/motion result to input hashes, producer/code/weight versions, settings, transforms, licences, resource bounds and review state. Rendering accepts approved bounded data only.

Cancellation cannot restore consumed allowance or promote partial output. Preserve failed results/receipts, stop only the owned cloud app and confirm stopped/zero tasks. Do not retry automatically or fall back to legacy generation. A missing replacement asset must be reported unavailable, never presented as complete.

## Retirement boundary

Inventory is read-only evidence, not an instruction to delete whole folders. Before removal, recheck exact files and concurrent changes, freeze hashes and update all active references/tests together.

| Area | Decision and complete cutover |
| --- | --- |
| `scripts/room_workflow/ffs_objects_cloud.py` and `test_ffs_objects_cloud.py` | Retire the SAM2→TripoSR producer and model-specific tests. Preserve executed recipe/version evidence with existing run records first. Remove any live callers/commands; retain replacement-independent validation tests. |
| `.local/reconstruction/ffs-th0028-objects-v2/returned/models/tag-{13,18,69}.glb` | Approved deletion candidates, after inspecting exact payloads and removing their active catalog references. Preserve input/output hashes, fit metrics, review decisions, plans, receipts and source crops/provenance. `fits.json` is provenance, not disposable mesh payload. |
| `scripts/room_workflow/ffs-resources.json` | Atomically retire old model entries; keep source/photos/scan/depth/review records. No stale resource paths and no reuse of old approval for new candidates. |
| `figures.ts`, `playback.ts`, their renderer/app callers, investigator scenario schema and tests | Migrate as one motion contract, replacing the named stock-clip assumption. Do not delete these live modules wholesale or remove safety checks to make the new shape fit. |
| `.local/reconstruction/figure-ual-v1/` | Review mesh compatibility after Kimodo retargeting design. If replaced, retire only exact active mesh/catalog references; retain licence and source provenance. Do not treat this downloaded rig as generated scene evidence. |
| `ffs_argus.py`, `ffs_argus_cloud.py`, acquisition/cleanup helpers | Reuse source preflight and receipt safety; add actual Argus inference only after source admission and approved planning. |
| `ffs_fit.py`, scan/segment/depth tooling and evidence UI | Retain only what is still used for source evidence, evaluation or registration; delete dead functions after caller/test mapping, not by filename. |
| Existing revision/acceptance folders and cloud receipts | Preserve provenance, screenshots/recordings and failed-run receipts. Mark old plans inactive rather than breaking their historical links. |
| All other reconstruction workflows/weeks/worktrees | No deletion or migration in this pass. Exclude from default agent context. |

The existing app stays explicitly legacy until cutover. Removal does not need to wait for a universally best generator, but it must leave a consistent unavailable state or a verified replacement—not broken catalog fetches. Any visible unavailable-state change still follows the visual gate.

## Verification and acceptance

- **Cleanup:** exact removal manifest with hashes/classification; preserved-source/receipt hashes unchanged; no remaining active imports/catalog paths to deleted targets; all affected tests run. Broader checks still run where shared contracts change.
- **Argus:** valid-region/projection rejection tests; finite input/output/resource checks; actual approved cloud run; source-consistency evaluation and inspected surfaces. No complete-scene claim from point export alone.
- **Motion:** numerical retarget tests with known rotations/scales, deterministic seek/hold, unreachable-target rejection, cancellation and authority checks. Propose for the first static-chair contact: palm anchor within 1 cm during the contact interval, no known-proxy penetration beyond 5 mm, and planted-foot drift within 1 cm. These are animation acceptance tolerances, not forensic accuracy, and need visual review alongside the numerical checks.
- **Rendering:** matching captures, full-body/chair visibility, real target-resolution/cadence evidence, keyboard/focus/touch continuity, reduced effects and evidence return. No performance claim from unit tests.
- **Owner decision:** separately accept the complete chair, the chosen contact sequence and final visual clarity/smoothness against an immutable tested revision. Passing transport or technical tests does not accept quality.

## Implementation order after design review

1. Freeze the retirement/preservation manifest and a single active catalog boundary; remove isolated obsolete producer paths with their callers/tests accounted for.
2. Resolve Argus source admission; implement/test bounded inference and scene conversion contracts offline; present the exact execution proposal separately.
3. Evaluate the complete-chair candidate under a separately approved budget and review its geometry.
4. Implement/test Kimodo constraints, numeric conversion and retarget/contact verification; do not call it integrated before a real approved motion run.
5. Complete the fresh visual packet, migrate playback and record the actual high-quality Modal run; remove remaining obsolete motion dependencies in the same cutover.

No model installation, cloud execution or new Weave spend is authorized by approval of this document. The next implementation plan must name exact files, tests and separate execution gates rather than reuse the retired 2026-10-27 checklist.

## Official sources inspected — 2026-10-28

- [Argus repository](https://github.com/realsee-developer/Argus): panorama inputs, CUDA example, separate code/checkpoint licences; no verified EVA single-panorama quality or watertight-output claim.
- [Kimodo quick start](https://research.nvidia.com/labs/sil/projects/kimodo/docs/getting_started/quick_start.html): skeleton/model choices and documented memory options. No project installation performed.
- [Kimodo output formats](https://research.nvidia.com/labs/sil/projects/kimodo/docs/user_guide/output_formats.html): NPZ/BVH skeletal data, reference poses and units; no documented browser-ready skinned GLB on this page.
- [Kimodo limitations](https://research.nvidia.com/labs/sil/projects/kimodo/docs/key_concepts/limitations.html): possible foot skating and constraint misses; cleanup is not a physical-contact guarantee.
- [TRELLIS.2 repository](https://github.com/microsoft/TRELLIS.2): PBR GLB, NVIDIA 24 GB minimum, MIT implementation/model and separate rendering dependency licences. Published timings are not local measurements.
