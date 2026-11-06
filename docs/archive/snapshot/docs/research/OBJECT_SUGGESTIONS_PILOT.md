# Automatic object suggestions: bounded pilot

2026-10-20. Status: **one approved cloud attempt completed; all seven photos returned validated masks; semantic quality needs correction**.

## Actual approved attempt

The owner approved the separate $5 detector/mask allowance. The frozen plan below ran once, without retry. Model acquisition/hash verification, image build and the GPU function completed. App `ap-gG1LPoWyaw7bLC1datxX8f`, call `fc-01M5CZ7F3T5YSQ5B8DKSQN8TB3`; Modal reported the app stopped with zero tasks at 11:35:40 EDT on 2026-10-20.

Private result: `.local/reconstruction/object-suggestions-v1/result.json`, SHA-256 `3401530d031054f04a25c51278b5df6067ec09bc71d78138471bf0d99d999aac`. Receipt: `plan.receipt.json` alongside it. The validated result contains 18 detections across all seven photos. Its 4.364-second timer covers the image-processing loop, excluding acquisition, model loading, build and startup; it is not end-to-end latency. Actual billed cost has not been retrieved.

Inspected every suggestion in the [mask contact sheet](../design/revisions/object-suggestions-v1/mask-contact-sheet.jpg); [labels, scores and flags](../design/revisions/object-suggestions-v1/detection-summary.json) are retained. The desk is detected in views 03, 04 and 05, with useful tabletop/support masks. Printers, windows and a lamp also have recognizable masks. Failures remain: a sofa fragment is labeled bathtub, sofa views are labeled bed, cabinet fronts are labeled door, and the chair is missed. A plant suggestion belongs to the adjoining hallway. Door categories therefore cannot automatically define architectural closures, and suggestions must be checked against the room boundary.

This verifies runtime compatibility, not correct automatic room interpretation. No mask was silently corrected, no completed mesh was generated, and no 3D association was promoted from these results. Next work should address category/identity review and boundary filtering before selective shape generation. The separate [WorldMirror/SAM 3D proposal](WORLDMIRROR_SAM3D_COMBINATION.md) now has real WorldMirror capture, offline conversion and backend admission; viewer comparison, SAM 3D execution and selective object completion remain unfinished.

The owner requires automatic suggestions with corrections only when needed. This stage proposes visible object regions from each uploaded room. It never reuses the benchmark furniture or turns a missing detection into an authored desk.

## Implemented

- `object_suggestions.py`: original-only 5–7 photo admission; EXIF normalization; Grounding DINO boxes automatically prompt SAM 2 masks. Same-label duplicates are suppressed; at most 12 suggestions per photo. Empty results remain `no-suggestions`. Source hashes, original/resized sizes, binary PNG masks, model fingerprint and uncalibrated scores are validated. Cut-off and weak masks carry correction flags.
- `object-models.json`: official repository revisions and published SHA-256/LFS or Git blob hashes. Only listed files can be acquired; every file is verified before loading. Grounding DINO uses safetensors/local-only loading without remote code; SAM 2 uses its pinned loader's `weights_only=True`. No SAM 3D checkpoint is included.
- `object_cloud.py` and `object_worker.py`: offline planning and separate one-attempt ephemeral Modal app. Exact plan, request and source changes invalidate the attempt. A receipt exists before build. Timeout requests cancellation of the existing call before context exit; output is validated before saving. Uncertain outcomes cannot be automatically replayed.
- `object_proposals.py`: CPU lifting through the saved VGGT cameras/depth and exact resize/padding transforms. Conservative cross-view associations refuse same-photo duplicates and competing matches. Insufficient depth and outside-room support remain flagged. A concave room boundary cannot be replaced with its bounding rectangle.

**These are visible-region proposals, not completed furniture.** Bounds cover estimated visible support, not hidden extents. Identity association uses geometry and category, without a learned appearance matcher; it can miss matches or merge lookalikes. No new complete-object mesh is emitted.

This is an operator CLI path, not a live upload-page feature. Correction flags are implemented; editing masks/identities in the UI is not. Integrate the job-bound route and corrections after an actual model result validates the contract. The deployed VGGT worker, its model fingerprints and existing candidates are unchanged.

## Prepared attempt

Private local plan: `.local/reconstruction/object-suggestions-v1/plan.json`.

- Plan SHA-256: `69e4edbf312c3b7f5e74257470a445902167ea581696cdf37cc05ce270d50436`.
- Input: the retained public seven-photo ARKitScenes broader-view request. This is a compatibility/regression pilot, not evidence of transfer to other rooms.
- Grounding DINO: `IDEA-Research/grounding-dino-tiny` at `a2bb814dd30d776dcf7e30523b00659f4f141c71`.
- SAM 2: `facebook/sam2.1-hiera-small` at `ee5bba1d82bb8749febdf90f45e84b687142ba03`; source `2b90b9f5ceec907a1c18123530e92e794ad901a4`.
- Both model repositories report ungated access and Apache-2.0 metadata. Retain their pinned model cards with the acquired files.
- One image build, one submitted GPU call, A100 40 GB, four CPU cores, 16 GiB RAM, 600-second function limit, 630-second client wait, one container and no application retry. Provider infrastructure rescheduling and image-build/startup time are outside the function limit.
- Resource estimate for 600 seconds: about **$0.40**, using [Modal's published rates](https://modal.com/pricing), before build/startup, additional actual usage and network overhead. Proposed operational allowance: **$5**, not a provider-enforced dollar cap. This is a separate detector/mask attempt from the previous VGGT allowance.

The existing local Modal client received only `Pillow==11.3.0` for CPU image validation. No Torch/model/GPU installation occurred locally. Modal SDK declaration construction passed without running the app; this does not verify the image build or model runtime.

Offline planning:

```powershell
.local/reconstruction/genrc-client/Scripts/python.exe scripts/room_workflow/object_cloud.py --request <saved-original-analyze-request.json> --plan <new-plan.json>
```

Only after approval of that exact frozen plan:

```powershell
.local/reconstruction/genrc-client/Scripts/python.exe scripts/room_workflow/object_cloud.py --plan .local/reconstruction/object-suggestions-v1/plan.json --approved-plan-sha256 69e4edbf312c3b7f5e74257470a445902167ea581696cdf37cc05ce270d50436 --output .local/reconstruction/object-suggestions-v1/result.json --confirm-billable
```

After a successful run, inspect every photo's detections/masks and retain missed or confused objects. Use `object_proposals.py --request ... --analysis ... --suggestions ... --reviewed ... --output ...` to create a separate 3D proposal artifact with a matching reviewed boundary. Do not auto-promote a guessed room boundary.

## Full-shape model access

SAM 3D Objects has [public code and released checkpoints under the SAM License](https://github.com/facebookresearch/sam-3d-objects). Public source does not remove its [checkpoint access requirement](https://github.com/facebookresearch/sam-3d-objects/blob/main/doc/setup.md). The owner's later 2026-10-20 report confirms approved access, superseding the earlier no-access report. A standard local HF credential was unavailable during the follow-up check, so authenticated checkpoint access remains unverified; this does not contradict account approval. No access request, license acceptance or checkpoint download was performed on the owner's behalf. Automatic detection/masking can be tested independently.

## Verification and remaining gates

Fourteen focused tests pass:

```powershell
.local/reconstruction/venv/Scripts/python.exe -m unittest discover -s scripts/room_workflow -p test_object_suggestions.py -v
```

Tests inject synthetic detector/mask outputs; they do not execute neural networks. They cover the full bound proposal conversion as well as source/model/mask rejection, no-desk/empty cases, duplicate pixels, masks/padding/rotated cameras, insufficient depth, ambiguous identities, concave containment, receipt-before-build, no repeat, and cancellation before app teardown. Python compilation and diff checks pass. [Acceptance and revision](../design/acceptance/object-suggestions-v1.md).

Initial local imports exposed an unavailable Shapely dependency; the final containment check reuses the existing geometry validator. Sandbox restrictions initially blocked the Modal client's imports; the local SDK/planner checks passed with approved execution outside that restriction. The attempted parallel audit hit its usage limit and supplied no findings; the lead inspected the code directly.

### CPU support diagnostic — 2026-10-20

Corrected the proposal join to match the actual analysis fingerprint (`images` plus empty `masks`), and test observed support against the room polygon instead of rejecting empty corners of an axis-aligned box in a rotated room. These fixes do not change the frozen detector/VGGT model fingerprints.

The unchanged real mask result and saved VGGT numerical fields passed validation. CPU `lift` and `associate` returned 18 supported observations, 15 tentative groups and three multi-view groups. Two desk groups remain; semantic mistakes described above were not corrected. The separate private diagnostic is `.local/reconstruction/object-suggestions-v1/support-diagnostic-v1.json`, SHA-256 `c7c7a18c8fef7c1de7f58a844660d36457ec16e86ee57ad641eff927fc03c9d6`.

This was **not** the full boundary-filtered proposal CLI: the retained room-only boundary is provisional and in rotated candidate coordinates, not analysis coordinates. The diagnostic explicitly records `boundary_checked: false` and `candidate_promoted: false`; no guessed boundary, new model call or completed shape was introduced.

Not checked: boundary-filtered real proposals, identity correctness, second real-room transfer, correction UI, full-shape generation, or live Shado comparison. No frontend change was made in this pass.

Primary implementation references: [Grounding DINO v4.49 documentation](https://huggingface.co/docs/transformers/v4.49.0/en/model_doc/grounding-dino), [pinned SAM 2 loader](https://github.com/facebookresearch/sam2/blob/2b90b9f5ceec907a1c18123530e92e794ad901a4/sam2/build_sam.py), [SAM 2 predictor](https://github.com/facebookresearch/sam2/blob/2b90b9f5ceec907a1c18123530e92e794ad901a4/sam2/sam2_image_predictor.py).
