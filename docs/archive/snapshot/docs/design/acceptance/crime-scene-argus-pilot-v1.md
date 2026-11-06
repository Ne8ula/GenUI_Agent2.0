# Crime-scene Argus pilot — source preflight

2026-10-27 · branch `crimescene`, HEAD `0380e13` plus preserved uncommitted work. Owner initially approved the bounded pilot design, then explicitly approved the proposed one-attempt CPU panorama check with its $1 operational allowance. That attempt completed and its allowance is consumed. Checkpoint terms, GPU inference, UI changes and candidate acceptance remain unapproved. Current scene remains unchanged.

## Scope and decisions

Use the supplied th_0028 panorama for one separately approved Argus feasibility attempt, then compare its estimates against the existing scan. A single viewpoint cannot reveal hidden surfaces. Preserve raw estimates and the measured scan separately; no generated clues, automatic promotion or claim of forensic validity.

The immediate implementation is **stage 1, source preflight only**, not an Argus inference worker. It reuses the existing range-stream/CRC and owned-Modal-app cleanup helpers. Source inspection is needed before pinning an inference job because the preview JPEG is not a full 2:1 raster, and the full export may contain missing-image regions.

Changed files:
- [Panorama validation and preview](../../../scripts/room_workflow/ffs_argus.py).
- [Bounded CPU preflight CLI](../../../scripts/room_workflow/ffs_argus_cloud.py).
- [Input tests](../../../scripts/room_workflow/test_ffs_argus.py) and [cloud-boundary tests](../../../scripts/room_workflow/test_ffs_argus_cloud.py).

No broker, catalogue, UI, renderer, dependency manifest or existing scene asset changed. Argus inference, scan alignment/evaluation, surface meshing and viewer integration are **not implemented by this stage**.

## Input evidence

- Inspected retained `pano_th_0028_coul.jpg`: 1,621,037 bytes, 10,307 × 4,267; JFIF only, no EXIF/XMP projection metadata. Do not stretch it into Argus's spherical camera model.
- Read only the remote ZIP directory/local header and PNG IHDR (142,650 range bytes per metadata inspection; two such inspections). Full member `th_0021-0040/scan/th_0028/pano_th_0028_coul_full.png`: **208,807,902 bytes, 20,288 × 10,144, RGB8, non-interlaced**, exact 2:1. Byte range `[14421625759, 14630433661)` of the 42,264,875,521-byte archive; recorded CRC-32 decimal `2548873164`.
- At preparation, only the header was inspected: not full-file acquisition, CRC verification, visual review or calibration. The later approved cloud acquisition is recorded below; the full PNG was never saved locally. [Source archive](https://zenodo.org/records/17164106), FFS CC BY-NC-SA 4.0.
- [FARO's official export guidance](https://knowledge.faro.com/Software/FARO_SCENE/SCENE/Exporting_Panoramic_Images) warns that full-color panorama exports can contain a white stripe at the bottom. A 2:1 header alone does not establish valid spherical coverage. Inspect the returned preview before inference; ambiguous projection/blank areas remain a stop condition.

## Upstream findings and stage-2 gates

Read-only research by the actual `eva-researcher` worker inspected Argus commit [`a7333c0a6d1e370260ebf47ac0f8adce272f3083`](https://github.com/realsee-developer/Argus/commit/a7333c0a6d1e370260ebf47ac0f8adce272f3083). This is source inspection, not a model run.

- [Demo](https://github.com/realsee-developer/Argus/blob/a7333c0a6d1e370260ebf47ac0f8adce272f3083/demo_gradio.py): 560 × 280 preprocessing, then a 15% crop from each vertical end (effective 560 × 196). [Geometry](https://github.com/realsee-developer/Argus/blob/a7333c0a6d1e370260ebf47ac0f8adce272f3083/argus/utils/geometry.py) restores crop coordinates into spherical 360° × 180° rays. No panorama calibration metadata is read.
- The model accepts an S-frame tensor and demo rejects empty inputs, without a dedicated single-frame rejection. This supports a one-frame **probe**, not a successful one-frame quality claim. [Model](https://github.com/realsee-developer/Argus/blob/a7333c0a6d1e370260ebf47ac0f8adce272f3083/argus/models/argus.py).
- Demo GLB contains a confidence-filtered **point cloud**, optionally camera-marker meshes; it is not a reconstructed watertight, textured surface. Additional meshing would require a separate tested choice.
- Code is Apache-2.0. The official [RealseeTechnology/argus-realsee3d checkpoint](https://huggingface.co/RealseeTechnology/argus-realsee3d) is gated and labelled CC BY-NC 4.0. The user's checkpoint access, agreement and exact checkpoint revision/hash are unverified. No gate bypass or third-party mirror is authorized. Distribution rights for derived artifacts require review; nothing is published.
- Upstream requires CUDA for its demo but publishes no tested GPU/VRAM minimum. A Modal GPU choice and finite allowance must be proposed after source/access checks; no GPU budget or hardware success is inferred here.

Stage 2 will use the reviewed original panorama as the sole conditioning image, not synthetic views or the 13 ordinary documentation photos. Preserve input/checkpoint/code hashes, preprocessing, finite predictions, resource measurements and uncertainty. Keep scan-assisted alignment distinct from raw Argus metric-scale claims. Quality and source consistency need evaluation before any viewer change.

## Stage-1 scope — approved once and executed

- **One CPU-only Modal submission**, no configured retry; 2 physical CPU cores, 8 GiB RAM, 300-second function timeout, 300-second startup timeout, 900-second client deadline; at most one container.
- **Approved operational allowance: $1, consumed by the one attempt.** No provider-enforced dollar cap is claimed. At the [published rates](https://modal.com/pricing) read on 2026-10-27, requested CPU/RAM for five running minutes is approximately $0.0132; this excludes startup/build and other charges and is not a billed-total quote. Actual billed total remains unverified.
- Source acquisition goes directly from the pinned Zenodo byte range to temporary cloud storage. Verify the full CRC, bounded PNG header and decode, then compute SHA-256. No models, GPU, credentials, scan, evidence inventory or persistent volume.
- Return only a JPEG preview (at most 2,048 × 1,024 and 1 MiB), report (at most 16 KiB), and receipt. Validate names, exact fields, hashes, decoded pixels and conservative claims before reporting success. Never auto-register the preview or authorize inference.
- Reserve output before image build; exact plan hash and current implementation hashes required. Existing output prevents a second attempt. Stop only the locally created app, verify stopped/zero tasks, and retain failed/uncertain receipts. Cleanup uncertainty is not success.
- The full panorama is intentionally not retained on Modal by this inspection stage. A later inference job must separately reacquire and bind it to this result's source hash.

Frozen offline plan: `.local/reconstruction/ffs-th0028-argus-preflight-plan-v1.json` (ignored local file), SHA-256 `cb6069815daae1d37ad48041a6e64bb3b68ce7d4f8d4f445c556b2893e00e287`. Its `execution_authorized` remains false. The CLI compares both exact plan bytes and all six current implementation/helper hashes before submission.

Preparation command executed locally (exclusive creation; do not overwrite the retained plan):

```powershell
& ".local/reconstruction/genrc-client/Scripts/python.exe" -I scripts/room_workflow/ffs_argus_cloud.py --plan .local/reconstruction/ffs-th0028-argus-preflight-plan-v1.json
```

The following execution command was run once after the owner's explicit approval: “Approved the panorama check.” It is retained for reproduction evidence, **not authorized for retry**; the output reservation and consumed allowance prohibit another attempt. This approval did not cover Argus inference.

```powershell
& ".local/reconstruction/genrc-client/Scripts/python.exe" -I scripts/room_workflow/ffs_argus_cloud.py --plan .local/reconstruction/ffs-th0028-argus-preflight-plan-v1.json --approved-plan-sha256 cb6069815daae1d37ad48041a6e64bb3b68ce7d4f8d4f445c556b2893e00e287 --approved-dollars 1 --confirm-billable
```

The acquired source SHA-256 would be a **first observation**, not a match against an independently trusted SHA. The recorded ZIP CRC and source range remain separate integrity evidence.

## Offline verification before execution

- TDD: input and cloud tests first failed for absent implementation; inspection tests then failed for absent preview function. Additional regression tests exposed three real gaps: truncated JPEG accepted, cancellation status left submitted, and failed cleanup left a success status. Those gaps were fixed and the focused suite rerun.
- Independent `eva-reviewer` review (observed Opus 5.5) found a blocking container import: shipping the launcher evaluated repository-relative parents at `/root`, raising `IndexError`. `test_worker_module_imports_from_flat_container_layout` reproduced it before the fix. Moved the worker and frozen source into `ffs_argus.py`; the image now ships only the worker and acquisition helper, following the existing scene-worker pattern. The regression then passed. This simulates the flat import layout locally, not a Linux/cloud execution.
- Existing `genrc-client` environment, Modal 1.6.1: **18/18 pass** with `-I -m unittest discover -s scripts/room_workflow -p "test_ffs_argus*.py"`, including actual SDK function construction **without submission**. Client Pillow is 11.3.0; cloud image pins 11.2.1. Cloud build/decode has not run.
- `npm.cmd test` rerun after the fix: **103 core + 327 app pass**.
- Initial full room-workflow run on default Python: **545 tests, 2 failures, 20 errors, 12 skips**. Traces expose missing `open3d`, `psutil` and `modal`; one WorldMirror subprocess error lacks its child stderr in that run. No dependency installation or unrelated repair was made.
- Full rerun with `.local/reconstruction/venv/Scripts/python.exe -I -m unittest discover -s scripts/room_workflow -p "test_*.py"`: **560 tests, 7 errors, 12 skips**, no assertion failures. All errors are missing Modal in four `test_ffs_objects_cloud` tests: `test_build_preflight_and_gpu_gate` (four errors including subcases), `test_build_recipe_contains_native_and_glb_guards`, `test_plan_bounds`, and `test_real_sdk_construction`. The earlier geometry/WorldMirror/CPU-worker failures do not recur in this environment. This is still a failed full-suite command, not a green monolithic suite.
- The nine object-cloud tests affected by missing Modal pass in `genrc-client`; the three shared `ffs_fetch` tests also pass there.
- Exact saved plan/hash versus current `prepare()`, Python syntax and changed-code whitespace checks pass; execution output does not exist.
- Deferred minor review suggestion: require exactly 2,048 × 1,024 on receipt. Current receiver accepts smaller bounded 2:1 JPEGs; the worker targets 2,048 × 1,024 for this full-size source, and visual acceptance remains mandatory. No source is automatically admitted.
- Not checked remotely: actual build/import, full 208 MB transfer/CRC/decode, live Zenodo range/redirect behavior, elapsed time, billed total and this job's actual stop/zero-task confirmation.

## Approved execution and source review

- One invocation of the frozen plan completed with exit code 0. Modal app `ap-jFyJiPxlaNQwR1lZMRPAUP`; final receipt `preview-returned-and-stopped-needs-review`. Provider cleanup check recorded **stopped, zero tasks**. No automatic retry.
- Acquired **208,807,902 bytes** directly into temporary cloud storage; range/byte-count and CRC-32 checks passed, followed by bounded header validation and full Pillow decode at **20,288 × 10,144**. First-observation source SHA-256: `7729a11c25a7f72c56c1b88ad4071c848078474611f2778fa9acc8c3bc654708`.
- Returned JPEG: **2,048 × 1,024**, **166,363 bytes**, SHA-256 `ffe28e4537d5ed7877a1821ca9134f315b390b2eb42646cc3b0b85977a6572a6`. Retained ignored output directory `.local/reconstruction/ffs-th0028-argus-preflight-v1/` contains `preview.jpg`, `report.json`, `receipt.json` and the exact `plan.json`; no full PNG was returned locally. Independent local hash/receipt/report checks passed.
- Actual preview visually inspected: room, curtain, sofa, overturned chair, upright chair and doorway are visible, with a hard white band across the bottom. A bounded preview-only pixel check found **160 consecutive full-width bottom rows with every RGB channel ≥250**, at least **15.625%** of the image height. This is not a calibrated missing-area mask, nor evidence of a white floor. The stripe may begin above the threshold-selected rows.
- Argus's inspected default 15% bottom crop cannot be assumed to remove this entire band. Source spherical coverage/calibration and treatment of missing pixels remain unresolved; **hold inference** rather than stretch, fill or silently reinterpret the raster. Both `source_admitted` and `projection_verified` remain false; `inference_run` remains false.
- Modal logged a heartbeat `ConflictError: App state is APP_STATE_STOPPED` during shutdown. The same invocation returned the complete validated artifacts and confirmed stopped/zero tasks; the warning is retained here, not treated as a reason to rerun. Actual billed total and detailed runtime/resource measurements were not retrieved.

## Acceptance

Approved CPU source check completed; one-attempt allowance consumed. Technical transfer/decode success is not source calibration or reconstruction-quality acceptance. Next owner exercise: inspect the retained preview; resolve projection/valid-region handling before a separate checkpoint-access and finite GPU proposal. No Argus model download/inference, UI edit, scene replacement, commit or publication occurred. Existing unrelated full-suite environment failures and parallel Node scan-assisted instability were not repaired by this work.
