# Teal bedroom reconstruction

2026-10-21. **Owner-approved design for implementation planning.** The owner explicitly approved this revised written specification on 2026-10-21, after selecting scan-assisted fidelity and detailed surfaces with an optional matrix toggle. The [implementation plan](../plans/2026-10-21-teal-bedroom-reconstruction.md) and Native offline implementation were subsequently approved on 2026-10-21; acquisition/real-processing, visual, paid execution and final quality acceptance remain separate gates.

## Outcome and scope

Make ARKitScenes **45261631** recognizable as the photographed teal bedroom, with detailed appearance and distinct, editable objects instead of surfaces stretched between furniture. The owner typed 452616131 once; the supplied filenames and dataset metadata identify 45261631.

This supersedes the first-room target and procedural-first priority of the [earlier idealized-room specification](2026-10-21-idealized-room-design.md) for the next demo. Preserve that work, its accepted backend fingerprint and the older 42445021 candidates; do not discard or relabel them. Reuse valid source binding, review, cancellation, correction and rendering machinery. No general-upload expansion or Shado execution is part of this pass.

Use supplied scan geometry/depth/poses in a separately identified **scan-assisted** candidate. Existing RGB-only benchmark inputs and results stay unchanged. Prefer fidelity to photographed shape, layout and appearance; hidden geometry may be completed, but cannot become measured evidence. No new objects without source support or explicit owner-authored additions.

## Verified starting point

Read-only local inspection found a six-input/two-withheld RGB preparation under `.local/reconstruction/arkitscenes/45261631/pilot-rgb-six-v1/`, not an executed EVA reconstruction. Originals are 640×480, normalized upright to 480×640. The supplied nine-frame contact sheet is a sampling preview, not nine executed reconstruction inputs. No estimated cameras/depth, candidate mesh or model receipt was found for this room in the checked project and referenced scratch locations. This is a bounded search, not a global absence claim.

Live Apple metadata and HTTP HEAD checks on 2026-10-21 establish Validation capture 45261631, visit 468076, and availability:

| Asset | Reported bytes | Meaning |
| --- | ---: | --- |
| `45261631_3dod_mesh.ply` | 24,837,257 | Supplied scene reconstruction, not an EVA model result |
| `lowres_depth.zip` | 139,266,078 | Supplied depth |
| `confidence.zip` | 5,567,746 | Depth-confidence data |
| `lowres_wide_intrinsics.zip` | 983,285 | Calibration |
| `vga_wide_intrinsics.zip` | 477,362 | Calibration for the RGB selection |
| `lowres_wide.traj` | 79,693 | Supplied camera trajectory |
| `highres_depth.zip` | 187,307,789 | Higher-resolution reference depth; exact alignment/coverage requires inspection |
| `45261631_3dod_annotation.json` | 5,817 | One bed and four cabinet labels; not a complete object inventory |

The visit mapping lists laser scans 177993, 177997 and 178000 with poses. Their PLY sizes are 1,882,939,104; 1,904,871,476; and 1,898,705,580 bytes. These are visit-level assets: individual bedroom coverage is not yet verified. Do not download/load all three by default. Metadata/annotation bodies and headers were inspected; large assets were not downloaded or geometrically inspected. Successful availability probes do not establish reconstruction quality.

## Proposed pipeline

1. **Inspect the smaller supplied mesh first.** Acquire into a separate evidence directory with URL, license, bytes and SHA-256; bound downloads, parsing and allocations. Inspect units, axes, color attributes, bedroom coverage and errors. It is a baseline, not automatically the final scene.
2. **Admit aligned RGB-D and poses.** Reuse the existing arbitrary-ID RGB preparation where appropriate. Verify timestamp matching, image rotation, intrinsics, depth units, confidence and reversible frame transforms using actual assets. Keep a named metric frame only after calibration checks; never copy the older room's transform or boundary. High-resolution reference data and laser scans are optional escalation if smaller inputs prove insufficient.
3. **Separate shell and objects.** Use coarse dataset annotations as hints, then source-linked automatic masks and multiview association. An annotation box is not a pixel mask or precise object boundary. Every reviewed visible item needs a disposition: retained scan geometry, generated completion, owner-authored representation, or explicit unresolved/omitted reason. Major furniture alone does not imply every lamp, pillow or ornament was recovered. Use hierarchical parts where separable evidence supports them; do not claim hidden separate pillow geometry from a bed-shaped blob.
4. **Preserve observed geometry; repair within an object.** Reject connections across distinct object boundaries. Preserve intended contact, such as pillows on a bed or objects on a cabinet. Inspect raw depth and alignment before choosing repair; the reported screenshot alone does not diagnose the precise failure. Room closure remains single-room, with separately identified inferred caps and no invented adjoining rooms.
5. **Complete only deficient objects.** First compare one bedside cabinet's scan baseline with a bounded generated candidate. SAM 3D Objects and TRELLIS.2 are alternatives, not mandatory stages. Do not replace good observed surfaces simply to claim model usage. Then evaluate the bed separately; success on a rigid cabinet does not establish bedding quality. Failure preserves the preceding candidate and produces no automatic retry or provider switch.
6. **Fit, texture and assemble.** Fit completed objects into the shared room frame using visible support, multiple source views, contact and intersection checks. Remove only the source fragments assigned to the replaced object in the derived candidate; raw evidence remains immutable. Project photographs onto visibility-consistent geometry. Record generated materials and reused/inpainted appearance separately from source-backed texture. Preserve stable object identity, sources, parent revision and undo/reopen behavior.

## Generator decision

Official material inspected on 2026-10-21 supports these roles, not an empirical ranking:

- **SAM 3D Objects:** image + mask and optional aligned H×W×3 XYZ pointmap. External points bypass internal depth estimation and must use its expected camera convention. A raw LiDAR file is not a direct input. Placement/refinement needs explicit integration; depth guidance is not a dimensional-accuracy guarantee.
- **TRELLIS.2:** single-image asset generation with detailed geometry and PBR materials. The inspected official README does not document external depth or multiview conditioning. Independent pose/scale fitting is required; high output resolution does not establish source fidelity.
- **Hunyuan3D-2mv:** optional alternative when actual directional object views are available. Its documented front/left/back inputs are not equivalent to arbitrary room frames. It is a different model from the 2.1 PBR pipeline.
- **Open3D RGB-D integration:** candidate reuse for measured-surface fusion, not automatic segmentation or unseen-object generation. Inspect the installed environment and existing helpers before adding a dependency.

Choose the model by matched-source visual and geometric checks, not repository screenshots. Freeze conditioning/evaluation views before a trial. Scans used to condition an object cannot also count as independent ground truth; report conditioning agreement separately from genuinely withheld evaluation.

## Presentation and contracts

Default to detailed photo-textured solid surfaces, with the existing matrix style as an optional rendering of the same object geometry. Preserve camera and selection across style switches. Do not hide defects by making the point display sparse. Inferred geometry stays identifiable in both modes; scan-derived data needs its own honest provenance, not the existing RGB-estimated label.

Reuse `BenchmarkRoom` and `CandidateView`, not a new viewer. Current `CandidateView` accepts positions/colors/indices/provenance and renders vertex-colored surfaces; photo textures are **not implemented by selecting surfaces**. Add only the needed bounded UV/texture/object references through the closed host contract, with validated image dimensions/decoded sizes, root-contained files and hashes. No arbitrary remote assets or executable model output. Derive bounded display geometry from retained high-detail source assets; do not feed multi-gigabyte scans to the browser or silently raise existing render limits.

The benchmark loader and idealization import currently hardcode 42445021. Introduce an explicit, source-bound bedroom identity through callers and tests, rather than replacing that directory or reusing its inventory. Separate scan-assisted admission from RGB-only admission; preserve the latter's rejection of supplied depth/poses.

Before any frontend edit, obtain a fresh scoped Weave packet or explicit waiver covering this new scan-assisted, textured-object pass. The previous static inventory-authoring packet is not automatically coverage for it. No new motion is proposed.

## Stages, safeguards and acceptance

- **Design approved:** the owner approved this specification on 2026-10-21. The concrete implementation plan and Native execution were subsequently approved. Acquisition, visual and paid-execution gates remain separate.
- **Source baseline:** bounded acquisition, calibration, source-mesh inspection and exact bedroom identity. Do not imply dataset assets are an EVA reconstruction.
- **Object baseline:** separated observed geometry and source-linked inventory, followed by one rigid-object completion comparison and a separate bed evaluation if needed.
- **Viewer:** textured surfaces/matrix continuity, source/inference inspection, keyboard/focus/touch, reduced effects, interruption, save/reopen and matching before/after captures.
- **Acceptance:** review door/window layout, bed/headboard, cabinets and individually resolved details from multiple interior and object-close-up views. Require no unintended cross-object bridges, duplicate fragments or gross intersections. Readiness and owner quality acceptance are separate. Quantitative tolerances and resource limits must be fixed in the implementation plan and calibrated before candidate grading; none are invented here.

Model acquisition/build/generation remains cloud-only and needs an exact pinned plan: input/checkpoint/code hashes, license/access check, GPU and memory, finite time/output bounds, attempt count, cleanup and cost estimate. No new paid run, automatic retry, local model/GPU installation, credentials in chat, commit or publication. Previously consumed allowances stay consumed. Preserve all concurrent work and rejected candidates.

## Sources and reading depth

- [Apple repository](https://github.com/apple/ARKitScenes), [download implementation](https://github.com/apple/ARKitScenes/blob/main/download_data.py), and live [metadata](https://docs-assets.developer.apple.com/ml-research/datasets/arkitscenes/v1/raw/metadata.csv): official documentation/code, exact capture row, asset headers and annotation labels inspected; not full scan content.
- [SAM 3D wrapper](https://github.com/facebookresearch/sam-3d-objects/blob/main/notebook/inference.py) and [pointmap pipeline](https://github.com/facebookresearch/sam-3d-objects/blob/main/sam3d_objects/pipeline/inference_pipeline_pointmap.py): official implementation inspected via fetched text; not run.
- [TRELLIS.2](https://github.com/microsoft/TRELLIS.2): official README inspected; no checkpoint or empirical furniture comparison.
- [Hunyuan3D-2mv](https://huggingface.co/tencent/Hunyuan3D-2mv): official model card inspected; license terms/runtime still require review before execution.
- [Open3D integration](https://www.open3d.org/docs/release/tutorial/pipelines/rgbd_integration.html): official tutorial inspected, not an EVA integration result.

These mutable upstream references must be pinned before any implementation depends on their interfaces. No new academic performance or user-study claim is made.
