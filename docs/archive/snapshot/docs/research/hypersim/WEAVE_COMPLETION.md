# Weave room-completion workflow v1

Latest resolution, 2026-10-20: the [room-wide v4 implementation](evidence/full-room-v4/REVIEW.md) now completes source-supported architectural structure and recovers fine detail locally, with a working browser demo. No new Weave generation occurred. This document retains the earlier Weave specification and rejected runs; it is not the active completion method.

Status: **one approved image edit completed; rejected for target-camera and mask drift**. See the [raw output and review](evidence/weave-room-v1/REVIEW.md). The owner rejected the SD2 pilot visually and requested Weavy/Weave image generation with depth, edge and mask nodes. The owner has no existing flow URL and asked for this specification plus the directly callable image-edit stage. This does not create a Weave graph or change the viewer.

## Callable first stage

Current local resolution: the [independent material adapter](evidence/material-completion-v1/REVIEW.md) now extracts a depth-verified source floor tile and applies its detail to fixed geometry, with unchanged protected pixels and three-view depth checks. This bypasses masked room-image generation for the bounded floor appearance pass. It is not a repaired Weave mask implementation, generated-material run or node workflow.

2026-10-20 follow-up: [geometry-first experiments](evidence/geometry-completion-v1/REVIEW.md) repair the bounded floor without image/depth generation. `scripts/reconstruction/validate_image_edit.py` rejects raw outside-mask drift before any protected-pixel composite. The owner then approved the single-target-image revision for 8 credits. It completed but returned an almost-black output with a small floor rectangle; the gate rejected it and no texture was applied. [v2 evidence and verified input hashes](evidence/weave-room-v2/REVIEW.md). Its executed private request is `.local/reconstruction/weave-room-v2/image-edit-request-private.json`. No automatic retry, Weave extractor execution or graph authoring followed.

Use **GPT Image 2.5 / Sunburst**, high quality, square HD PNG, opaque background. The connected Weave model ID is `2db90e64-51dd-45b2-870a-66d19a81118e`. Its actual contract supports multiple image references and a mask. The owner approved the **8 Weave credit** quote for one image, and the provider reported that charge. Prediction `14171e1c-6afc-4780-aef7-82de0b86a3df` completed with a 1024?1024 image. It adopted reference-like framing rather than the target camera and changed areas outside the mask. No depth/mesh run or automatic retry followed.

[Exact prompt, settings and uploaded asset IDs](weave-room-v1-request.json). The complete callable request, including provider asset URLs, is retained locally at `.local/reconstruction/weave-room-v1/image-edit-request-private.json`; this is the executed request, not authorization to submit again. Any new run needs a fresh quote and structured Approve/Cancel confirmation. Do not automatically retry.

The first input is the unchanged 512×512 r03 render at frame 0037. References are **training frames 0005 and 0035**, visually inspected for matching floor/wall materials. No withheld RGB/depth from 0012/0037/0062/0087 is conditioning. Reference 0039 was inspected but not included in the request.

The editable region is deliberately small: missing pixels within `x=0..256, y=416..512`, **9,409 pixels**, intended to continue the floor at the lower left. This is a manually bounded candidate region, not a semantic proof of floor extent. Alpha-mask transparent pixels indicate the proposed editable area; a white-editable grayscale mask is also retained. Confirm mask interpretation on the returned raw output.

The prompt preserves the exact target camera, walls, jamb and opening, uses reference materials rather than reference composition, and forbids adding furniture/grilles. It explicitly keeps other unknown black regions unchanged. This tested the new image stage before paying for larger coverage or another mesh; it failed the registration/mask gate.

## Intended node workflow

| Stage | Inputs and output | Availability / requirement |
| --- | --- | --- |
| Import | Target render, selected training photos, explicit mask, camera identity | Import is documented; assets for the image stage were uploaded through the official connector |
| Protected region | Missing-coverage mask intersected with a wall/floor region; subtract openings | Mask Extractor / Mask By Text and Matte Grow/Shrink are documented; this pass uses a local bounded mask, not an executed Weave segmentation |
| Image edit | Target + references + mask + tight patch-specific prompt → candidate RGB | GPT Image 2.5 direct model ran once; output failed camera/mask preservation |
| Compare and composite | Compare raw candidate with input; then restore exact source RGB outside the edit mask | Compare, Compositor and Merge Alpha are documented; raw output must be reviewed before compositing |
| Depth extraction | Exact accepted candidate RGB → declared depth/disparity map and valid mask | **Extractor node/model is not yet exposed by the connector.** Bind and verify it in a published flow before claiming execution |
| Edge extraction | Same RGB → edge map, with method/thresholds recorded | **Extraction node is not yet exposed.** Flux Canny Pro is an image generator, not this extractor |
| Surface normals | Calibrated depth + camera → normals, or an explicitly named normal model | No normal-estimation model was found through direct-model discovery; optional diagnostic, not an assumed capability |
| Export | RGB, raw depth, mask, edges, optional normals, camera/crop and provenance | Export is documented. Preserve common dimensions and exact registration |
| Geometry adapter | Calibrate inferred depth against existing meter-scale anchors; fuse only accepted additions | Separate downstream implementation/run; existing r03 remains immutable |

The live connector lists **zero published workflows** in the connected workspace. It can run direct models and existing published workflows, but exposes no graph-authoring operation. No browser workaround or invented workflow/node IDs were used. The full extraction chain requires a real published flow with an inspected input/output contract.

## Prepared geometry guides

Files under `.local/reconstruction/weave-room-v1/`:

- `input-room.png`, `edit-mask-alpha.png`, `edit-mask-white.png`.
- `observed-depth-camera-z-m.npy`: existing rendered depth in meters, NaN where unknown.
- `observed-depth-preview.png`: normalized display only; its range is recorded in `inputs.json`.
- `observed-normal-camera.npy` and preview: camera-space finite differences of existing depth; invalid at unsupported neighborhoods.
- `observed-rgb-gradient.png`: finite-difference RGB gradient with invalid neighborhoods removed; not Canny or semantic boundaries.
- `train-reference-0005.png`, `train-reference-0035.png`, `train-reference-0039.png`.
- `inputs.json`: camera/crop, provenance, mask bounds and map conventions.

These guides were computed locally from the existing reconstruction. They are **not Weave-node outputs**, and have not been uploaded as extra control inputs to the quoted image request. The model contract has image references and a mask, not native metric-depth or ControlNet ports.

## Acceptance before geometry

1. Inspect the raw output at the original framing. Reject camera/layout drift, new objects or changed openings. A stronger image model is not assumed accurate.
2. Restore exact original RGB outside the accepted mask and record the changed-pixel footprint. If the returned resolution differs, map it uniformly back to the original camera grid without cropping or warping.
3. Inspect maps extracted from that exact image. Generated edges/depth are correlated model outputs, not independent evidence of correctness.
4. Establish depth semantics: metric Z, ray distance, relative depth or inverse depth; near/far polarity, precision and normalization. A grayscale depth preview cannot be unprojected directly as meters. Fit relative estimates to existing metric anchors and check residuals on withheld anchors and different planes.
5. Preserve source geometry and free-space/opening constraints. Reject unsupported triangles; retain unknowns where a depth fit is not defensible.
6. Review the new mesh from the target camera and small pose offsets around the same patch. Sequential Hypersim frame numbers do not imply neighboring views.

For a direct-model-only continuation, IronDepth could still supply constrained depth without using Stable Diffusion. That fallback would need an explicit depth-only adapter/cache contract; it is not the requested Weave extraction chain and has not been substituted silently.

## Sources and evidence

- [Weave node types](https://help.weavy.ai/en/articles/12292386-understanding-nodes)
- [Mask and matte tools](https://help.weavy.ai/en/articles/12414117-matte-tools)
- [Editing tools](https://help.weavy.ai/en/articles/12268186-editing-tools)
- [Import / export helpers](https://help.weavy.ai/en/articles/12268300-helpers-overview)
- [Failed SD2 pilot and source-preservation evidence](evidence/genrc-pilot-v1/REVIEW.md)

Use actual callable contracts over static catalog prices. Input scene: public Apple Hypersim `ai_001_004`, synthetic rendered content, CC BY-SA 3.0, underlying scene assets by Evermotion. No private room photographs were uploaded. Approval/credit handling follows [the repository's Weave policy](../../design/FIGMA_WEAVE.md#connection-and-spending).
