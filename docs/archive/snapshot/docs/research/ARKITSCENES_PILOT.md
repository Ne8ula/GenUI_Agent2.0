# ARKitScenes single-room pilot

2026-10-20. Owner approved ARKitScenes as the first real-room benchmark and explicitly excluded RealSee3D. ScanNet++ may supplement evaluation later if access is granted. The owner approved the $5 Modal pilot, then authorized routine unattended iteration under that existing allowance. **Four actual VGGT inference calls succeeded, including the deployed upload route and a separate broader-view experiment. Two fused, bounded room candidates are available in the browser.** Shado generation and owner quality acceptance remain pending.

## Selected input and evidence

Capture **42445021**, Validation, visit 421380, from Apple's depth-upsampling archive. Public metadata reports laser-scanner references and depth-upsampling membership. Fourteen 1920 x 1440 RGB frames were acquired and visually inspected: one furnished room with a sofa, desk, TV cabinet and an open doorway. The doorway reveals space that must be excluded from the final room. This is a sparse sample of a guided iPad scan, not independent casual phone photography, and does not prove sufficient overlap or complete coverage.

- Repository revision: `474aaa83d7b1c9080619d8485de2d7c885c01fc5`.
- Archive: `https://docs-assets.developer.apple.com/ml-research/datasets/arkitscenes/v1/upsampling/Validation/42445021.zip`.
- Archive bytes: `37592437`; SHA256: `da7a20f832dfae0701ccbed45102673b4fd5bc3b46b5f7e615d38378cb16bee3`.
- Acquisition manifest and retained license: `.local/reconstruction/arkitscenes/42445021/acquisition.json` and `LICENSE.txt`.
- Prepared bundle: `.local/reconstruction/arkitscenes/42445021/pilot-v1/`.
- [Inspected contact sheet](../../.local/reconstruction/arkitscenes/42445021/pilot-v1/contact-sheet.jpg): seven originals followed by seven withheld frames.
- RGB request: `analyze-request.json`, 17,582,769 bytes; SHA256 `bc6407f753ffe3759de253e5333b17bc6a946b47954f218a24477d5b4b1fd2b5`.

Sorted source indices **0, 2, 3, 5, 6, 9, 11** condition reconstruction. Indices **1, 4, 7, 8, 10, 12, 13** remain withheld from inference and Shado. Selection used RGB inspection to retain furnishings and differing directions, not depth or geometry. Held-out frames include near-neighbor views and blank walls: this is a convenience feasibility set, not an unbiased benchmark.

The images are rotated 90 degrees clockwise, consistent with the metadata's `Left` sky direction and visual inspection. Source bytes are preserved unchanged; normalized lossless RGB PNGs have separate hashes and transform provenance. All seven normalized inputs are 1440 x 1920. The uncertain "around 300 sqft" statement can be exercised in intake, but it does not provide measured scale or enter this estimator request.

The archive also contains confidence, low-resolution depth and FARO-derived high-resolution depth. They remain outside the request. No FARO point-cloud archive, camera trajectory or intrinsics were acquired, so global camera/mesh reference evaluation is not ready. A separate post-freeze reference-depth diagnostic is recorded below. Never substitute the supplied scan for a generated result. Local hashes document transfer integrity; they are not a publisher-provided digest.

## Implemented components

- [arkit_fetch.py](../../scripts/room_workflow/arkit_fetch.py): one bounded public capture acquisition, retained license/metadata, immutable download paths, archive path/link/size validation and local hashes.
- [arkitscenes.py](../../scripts/room_workflow/arkitscenes.py): explicit 5–7 input selection, withheld split, source-preserving rotation, duplicate and path rejection, contact sheet and validated RGB-only worker payload.
- [pilot.py](../../scripts/room_workflow/pilot.py): offline plan binding request, code, dependencies and checkpoint configuration. Execution requires explicit billable confirmation plus the exact request hash, reserves a receipt before build, uses an ephemeral Modal app and does not automatically retry.

The existing worker supplies estimated cameras and depth-grid surface patches, with a boundary proposal requiring review. The cloud result itself has no bundle adjustment or multiview fusion; a separate CPU TSDF completion stage now fuses its full estimated depths. A proposal that includes the hall must be corrected before completion. Door/window caps and any enclosing shell remain authored geometry. B remains pending until an actual authorized Shado video is available; no placeholder video or fabricated successful comparison is allowed.

## Reproduction

Use a fresh output path for acquisition or preparation. Existing outputs are intentionally not overwritten.

```powershell
$py = '.local/reconstruction/venv/Scripts/python.exe'
& $py scripts/room_workflow/arkit_fetch.py --video-id 42445021 `
  --output-dir .local/reconstruction/arkitscenes/42445021

$frames = Get-ChildItem '.local/reconstruction/arkitscenes/42445021/extracted/42445021/wide/*.png' | Sort-Object Name
$originals = @(0,2,3,5,6,9,11) | ForEach-Object { $frames[$_].Name }
$heldout = @(1,4,7,8,10,12,13) | ForEach-Object { $frames[$_].Name }
& $py scripts/room_workflow/arkitscenes.py prepare `
  --images-dir .local/reconstruction/arkitscenes/42445021/extracted/42445021/wide `
  --originals @originals --heldout @heldout --video-id 42445021 `
  --output-dir .local/reconstruction/arkitscenes/42445021/pilot-v1 `
  --source-revision 474aaa83d7b1c9080619d8485de2d7c885c01fc5 --rotate-clockwise 90

& $py scripts/room_workflow/pilot.py `
  --request .local/reconstruction/arkitscenes/42445021/pilot-v1/analyze-request.json `
  --plan .local/reconstruction/arkitscenes/42445021/pilot-v1/cloud-plan.json
```

The saved plan uses official `facebook/VGGT-1B`, source `a288dd0f14786c93483e45524328726ab7b1b4ce`, checkpoint `860abec7937da0a4c03c41d3c269c366e82abdf9`, under its research-only CC-BY-NC-4.0 terms. This is not commercial-product activation.

## Executed cloud runs and bounded iteration

The original local definition failed before remote submission. `cloud-plan-v3.json`, app `ap-8GdzBjV2KBw0TshB857rp4`, built image `im-z8HYHAmXRDJVvgytVf6Rst`, then rejected serialized client Python 3.12 code against its Python 3.11 image. No GPU call occurred. The correction uses a module-level, nonserialized worker with explicit `run` registration and separate operator configuration.

Following the owner's overnight authorization:

| Plan | Actual result |
| --- | --- |
| `cloud-plan-v4.json` | App `ap-h34YqhcSmn43xMUZNQ6I6X`, call `fc-01M5C5H2Q6FZ6A0NYET48ZYR8V`; `pilot-v1/analysis-result.json` |
| `cloud-plan-fields-v1.json` | App `ap-fcO8LLbq8A0Wju7ChpxiSU`, call `fc-01M5C5YNK2VKQR9MCR8FW06WAY`; `pilot-v1/analysis-fields-result.json`, including full numerical estimated depth/confidence/RGB/validity |
| Deployed upload, `upload-live-v2/` | App `ap-TCLfvy5IeRWMlwj13cW1z5`, call `fc-01M5C7YM0SRF62A845XSJHY938`; seven actual public originals through intake and the deployed worker; complete in 79.021 seconds |
| Broader-view RGB experiment, `visual-room-seven-v1/vga/request/` | Same deployed app, call `fc-01M5C9RRHHFM9GGT8X26V5J6FH`; seven separately selected same-capture RGB frames; complete in 65.639 seconds |

The three earlier ephemeral apps were verified **stopped, zero tasks**. Failed attempts, plans, receipts and outputs remain preserved. The same pinned worker was then deployed as `eva-room-workflow/run`, app `ap-TCLfvy5IeRWMlwj13cW1z5`, function `fu-TyBZ5YlOpEr92GQYeHFp89`; its identity was verified before the fourth call. Minimum containers remain zero. The deployment receipt is saved beside the plans. Each call had A100-40GB, 4 CPUs, 32 GiB, a 600-second function limit, one container and zero configured retries. Build/startup are outside that timeout. No SAM2 or Shado generation ran.

First successful inference: **55.655 seconds**, **13,892,074,496 bytes** peak allocated CUDA memory, A100-SXM4-40GB and torch 2.5.1+cu124. Raw estimate: **29,687 vertices and 54,924 triangles**.

- First result SHA256: `a3c7aa3265c3c1680a83fb2b417718964a430e8a9d6c6ac906fbe04db944f713`.
- Raw geometry SHA256: `b56f8a432368289ca9190aa7d3b47d4c37e751b4adc69a68635e3ad7aef53f9d`.
- Original-input fingerprint: `6a95d7a01f174fae2f340c0c3201e60be8a0cb485058b1409699fa8cf1e2a7ab`.

The numerical-field run returned exactly matching raw geometry, cameras, image transforms and checkpoint. These are checked before combining artifacts. Numerical archives have bounded compressed/expanded sizes, array shapes/types, hashes and pre-allocation header validation.

The third call belongs to private local job `4f2d3dfb-59c5-4c66-9b13-0c21120ccb81`, with request SHA256 `4c54343efa25453606f62295ab3fd2e0d1cfc39620a0f4fe934217b0f3ebc887`. Its receipt reports complete and its geometry matches the first two calls. The browser harness exited early because its polling condition admitted a nonterminal response; the already-running call completed and was recovered from the private job without resubmission. This proves intake-to-deployed-worker execution, not uninterrupted browser recovery. Later UI evidence uses an explicitly isolated test-owner copy of that real result; the original job ownership is preserved.

The 09:00 UTC billing check reported **$0.29291343** across the earlier build, two ephemeral model calls and deployed-worker upload through the completed 08:00 UTC interval. The deployed worker had zero active tasks; the three ephemeral apps were stopped. Current partial hours and late usage may be excluded, so this is **not final cost**. The $5 allowance is operational, not a provider-enforced cap. CPU alternatives below require no further VGGT inference; the separately prepared learned-matching diagnostic has its own bounded plan.

## Dense fusion and one-room completion

CPU TSDF fusion now uses full model-estimated depth, estimated cameras and source RGB. RANSAC fits plausible floor/wall planes from model geometry. A provisional orthogonal boundary clips the hallway. An explicitly authored floor, ceiling and walls close remaining architectural gaps, including door/window openings. No adjoining room is added.

All alternatives remain under `.local/reconstruction/arkitscenes/42445021/`: initial over-clipped `completion-v1/`, improved `completion-v1/refined-v2/`, full-field `completion-v2/`, and its `confidence-0/` and `confidence-10/` variants. The frozen selection is `completion-v2/selection.json`.

| Lower confidence excluded | Fused triangles | Source-camera fused ray coverage | RGB MAE on hits, 0-255 |
| --- | ---: | ---: | ---: |
| **0%, selected** | 156,584 | 87.06% | 8.65 |
| 5% | 142,264 | 83.99% | 8.86 |
| 10% | 133,467 | 80.81% | 8.90 |

These are **in-sample diagnostics**, not held-out accuracy. The selected version better retains chair legs, lamp silhouette and wall coverage, but retains low-confidence errors too. Confidence is not a calibrated probability.

The selected candidate adds **12 authored shell triangles**, totaling **156,596**. Geometry SHA256: `eb69dfe4972ec5839faab7f793f809afdaa0c6baf3fa9c69be69c0aa5d78daa9`. Full source-ray coverage from that shell is coverage by construction, not recovered physical geometry. Unknown hidden object backs, fine texture and unseen layout remain unresolved. Units remain relative and the boundary is unconfirmed.

Inspect [source/candidate comparisons](../../.local/reconstruction/arkitscenes/42445021/completion-v2/confidence-0/candidate-source-review.jpg), `candidate.ply`, `uniform-surface-points.ply` and `report.json` in the same folder. All seven source IDs are retained without claiming unique per-face attribution.

## Independent reference-depth diagnostic

After freezing the preferred candidate, `evaluate_arkit_depth.py` compared model depth with supplied high-resolution reference depth. The [paper, section 3.2 page 6](https://datasets-benchmarks-proceedings.neurips.cc/paper_files/paper/2021/file/66f041e16a60928b05a7e228a89c3799-Paper-round1.pdf#page=6) identifies orthographic camera depth. The [pinned official loader](https://github.com/apple-aiml-research/ARKitScenes/blob/474aaa83d7b1c9080619d8485de2d7c885c01fc5/depth_upsampling/dataset.py) pairs matching files, rotates RGB/depth together and converts millimeters to meters.

**7/7** views had overlap: **1,303,474 / 1,421,392** pixels. Missing reference: **117,918**; invalid positive model predictions at valid reference pixels: **0**. One global posthoc scale of **1.704477638 meters/relative-unit** gives **5.127 cm MAE**, **6.606 cm RMSE**, and **3.568% mean absolute relative error**. The original selected-confidence subset gives 4.670 cm MAE using that same scale. Per-view median scale ratios span 1.62136-1.76194; no separate per-view correction was applied.

This checks local depth shape after scale alignment. It does not validate camera poses, fusion, completed surfaces or held-out views. Reference depth never entered inference or changed geometry. These are conditioning RGB views with independent reference depth, not held-out RGB evaluation. Pretraining overlap is unassessed. Evidence: `pilot-v1/reference-depth-diagnostic.json`.

## Held-out RGB registration diagnostic

A separate CPU-only SIFT/mutual-descriptor/PnP-RANSAC experiment registered withheld RGB images against original-view estimated 3D points. Policy, hashes and candidate selection were frozen before query processing. Query intrinsics use the median of the original estimated intrinsics; no reference pose or depth enters registration. The previous training-only scale is reused unchanged. OpenCV 4.10.0.84 was installed only in the project-local CPU environment for this check. [OpenCV matching](https://docs.opencv.org/4.10.0/d5/d6f/tutorial_feature_flann_matcher.html) and [PnP conventions](https://docs.opencv.org/4.10.0/d5/d1f/calib3d_solvePnP.html) document the methods.

Only **1/7** queries passed the fixed gates. All six failures remain counted and explicitly labeled **not rendered because registration failed**. They are not mislabeled as measured geometric misses. The failures include insufficient matches, concentrated matches, single-source support and PnP failure. Thus broad novel-view validation is not established.

At the one accepted, estimated query pose:

| Variant | Conditional ray coverage | Depth MAE on its valid overlap | Depth MAE on identical 97,612 pixels |
| --- | ---: | ---: | ---: |
| Raw | 55.93% | 4.45 cm | 4.44 cm |
| Fused | 70.80% | 4.92 cm | 4.55 cm |
| Completed | 100% | 10.88 cm | 4.55 cm |

The differing per-variant overlaps must not be treated as matched accuracy comparisons. The shell leaves the shared pixels unchanged; its newly filled regions add error and uncertainty. Results combine reconstruction, estimated-query-pose and assumed-intrinsic error, and are not a ground-truth camera evaluation. No candidate or registration threshold was tuned against these queries. Nearby scan frames also do not prove casual-phone transfer.

Evidence: `pilot-v1/heldout-evaluation-v1/frozen-policy.json`, `report-v2.json` and [actual comparisons](../../.local/reconstruction/arkitscenes/42445021/pilot-v1/heldout-evaluation-v1/heldout-review.jpg). The original report remains preserved; v2 clarifies failure labels/coverage denominators and adds common-pixel metrics without rerunning pose registration or modifying geometry.

## Original-photo refinement and capture coverage

The original-only SIFT bundle-adjustment attempt stopped at its fixed support gate. There were 147 usable tracks, but support per camera was `[121,26,26,121,0,0,0]` and the graph had five disconnected components. No optimization or candidate modification occurred. The bounded SciPy solver is implemented and tested, but these images do not establish a successful refined result. Evidence: `bundle-refinement-v2/`, including policy, resource measurement and explicit `not-run-insufficient-track-support` status.

A subsequent RGB-only exploratory check examined all 91 pairs across the 14 downloaded frames. Four conservative epipolar-supported links formed a largest component of four images; no supported connected seven-image selection was found. Some rejected pairs have localized real overlap, so rejection is not proof of absent physical overlap. This analysis includes previously withheld images and is capture-design research after evaluation, not a new blind benchmark. The original split and candidates remain unchanged. See [overlap review](../../.local/reconstruction/arkitscenes/42445021/overlap-selection-v1/REVIEW.md).

For casual uploads, neighboring photographs should share recognizable furniture and room corners, with views connecting one side of the room to the next. Seven isolated wall/object photographs are not equivalent to a connected seven-view capture. Missing correspondence must remain an uncertainty rather than be repaired with invented matches.

### Learned-matching diagnostic

A separate original-only [LoFTR](https://github.com/zju3dv/LoFTR) diagnostic uses the authors' endorsed Kornia implementation, pinned public weights and all 21 original-image pairs. Its pre-run plan freezes source hashes, model provenance, image transforms and downstream track gates. This is correspondence testing, not generative completion or an independent validation of the room.

The first attempt (`learned-matching-v1/`, app `ap-608wlQ46cnW8fyZgaxNxAX`, call `fc-01M5C8YWJTKVR03JFCHSAN29EQ`) failed during module import before observed model execution. The operator cancelled the call and stopped the app; the provider subsequently reported stopped with zero tasks. Logs and the failed receipt remain. This exposed a distinction in [Modal's failure policy](https://modal.com/docs/guide/retries): zero configured input retries does not disable infrastructure restart after a container-import crash. The corrected runner must therefore bound client waiting and cancel the existing call as well as setting function/startup limits. No uncertain call is blindly replayed.

The corrected attempt (`learned-matching-v2/`, app `ap-IGDrLfOB7PfnM89xhGjbgD`, call `fc-01M5C9C1MKNSHXYNBX20SZGJXC`) actually ran LoFTR in **6.547 seconds**, with **1,094,284,288 bytes** peak Torch-allocated CUDA memory. Its saved output was recovered after the client could not deserialize Torch's string-version subclass; no model rerun or local Torch installation was needed. The remote return boundary now normalizes the entire response to plain JSON values. The recovered result SHA256 is `8b81f144cd1ef1119419d61ec2ec8f084943ac95b14297e1bff9ef58f86da89a`. Both LoFTR apps are stopped with zero tasks.

The frozen original-only CPU gates accepted **346 tracks**, confined to camera pairs 0–3 and 1–2. Cameras 4, 5 and 6 still lacked supported links. Bundle adjustment therefore remained **not run**, and no geometry changed. The largest apparent new connection had only 49 epipolar inliers among 267 matches, below its predeclared fraction threshold. [Actual matching evidence and review](../../.local/reconstruction/arkitscenes/42445021/learned-tracks-v1/REVIEW.md) distinguish raw matches, geometric inliers and accepted tracks. Consistency with estimated VGGT depth is not independent ground truth.

## Denser RGB capture investigation

A separate exploratory input-design pass acquired the official same-capture `lowres_wide` RGB archive: 2,899 frames, 187,269,832 compressed bytes. It inspected 97 temporal samples and 192 finer transition samples, keeping all failed matching links. Conservative feature gates still left disconnected sectors. These failures do not establish that reconstruction or physical overlap is impossible.

A visually reviewed seven-frame proposal includes TV/window/floor, window/sofa, sofa, sofa/desk, desk/chair, doorway and TV/lamp. Only its selected VGA RGB members were subsequently acquired by validated HTTP ranges, totaling **3,111,009 response-body bytes** including ZIP metadata. No full VGA archive, supplied camera or depth input was used. Three timestamps match exactly and four substitute frames within 17 ms. The normalized 480×640 inputs and their limitations are recorded in the [VGA acquisition review](../../.local/reconstruction/arkitscenes/42445021/raw-rgb-selection-v1/visual-room-seven-v1/vga/REVIEW.md).

This proposal deliberately tests broader visible furniture/floor coverage, not verified camera connectivity or a new blind benchmark. It preserves the original pilot and original withheld evaluation. Its request SHA256 is `5cf948e767aa8ee147a55411d09276a2c12512314eed8b201a91861f0cbfb9b5`. The fourth VGGT call completed in **65.639 seconds**, with **13,892,074,496 bytes** peak Torch-allocated CUDA memory. Result SHA256: `41f6046566503ee37e98ff66e3d0266d2e872c728b016876b5627cad9506db0c`; raw geometry SHA256: `f8393ff6f318f90857076367b9fb64c2962c8ca183a142e20fe293f1dcd4244a`. Request, frozen plan, receipt and validated result remain in `vga/request/`.

Its initial automatic boundary included the outside camera and part of the hall. The retained correction, `vga/completion-v1/room-only-v2/`, closes the room at the supported end wall and contains **72,205 fused plus 12 authored shell triangles**. Candidate SHA256: `93d55772240ff28680c0850b1f2d99743211d712319304b03c5deccc0eec3f21`. Every triangle is inside the provisional boundary. Camera 0 remains outside and is occluded by the closure; the viewer starts at interior camera 1 and retains the outside source/raw comparison. The original candidate was not modified.

The [candidate review](../../.local/reconstruction/arkitscenes/42445021/raw-rgb-selection-v1/visual-room-seven-v1/vga/completion-v1/room-only-v2/REVIEW.md) shows actual source, fused, completed and point renders. Floor/furniture coverage is broader, while soft colors, seams, jagged object edges and assumed architecture remain. [Two-profile browser evidence](../design/revisions/arkit-profiles-v1/REVIEW.md) verifies separate source/result bindings, original default, interior startup, source-0 closure, uniform dots, navigation, touch emulation and graphics-context recovery. Seven loader tests, typecheck/build and five browser verification groups passed.

## Separate appearance experiments

A CPU-only [source-projected color candidate](../../.local/reconstruction/arkitscenes/42445021/appearance-v1/REVIEW.md) changes colors on eligible original-pilot photo-estimated vertices while preserving every other geometry field. Across identical first-hit photo pixels, in-sample RGB MAE changed from 9.023 to 8.285 on a 0-255 scale. Two views worsened. It remains an unpromoted alternative: sharper appearance in some views does not establish better geometry or globally better colors. Runtime was 4.672 seconds; no cloud model ran.

A separate [inferred wall-color candidate](../../.local/reconstruction/arkitscenes/42445021/raw-rgb-selection-v1/visual-room-seven-v1/vga/completion-v1/room-only-v2/material-v1/REVIEW.md) uses supported nearby estimated faces to choose flat colors for two existing authored wall planes. Four planes retain their exact fallback colors because support gates fail. The hallway cap remains unchanged. All physical triangles, photo-estimated vertex colors and seven rendered depth arrays are identical to the broader-view base. Runtime was 2.969 seconds, and six tests pass. This is inferred appearance on assumed architecture, not generated texture or recovered unseen material.

The broader-view profile exposes this as the optional **Inferred wall colors** variant; its default completion and the original profile remain unchanged. [Actual browser evidence](../design/revisions/arkit-material-v2/REVIEW.md) verifies visible appearance changes and identical nonblank provenance drawing buffers. Eight loader tests and six browser verification groups pass. The earlier page-screenshot comparison failed because layout placed the canvas at a different subpixel crop position; that failed evidence remains, and the corrected check compares the actual WebGL drawing buffers.

## Local reproduction and viewer

Start `npm.cmd run room:service` and `npm.cmd run dev`, then open <http://127.0.0.1:1440/?scene=arkitscenes-room>. The original remains the default; <http://127.0.0.1:1440/?scene=arkitscenes-room&profile=vga-visual-v1> opens **Broader room views**. Raw, fused and completed geometry, source-camera presets, original photos, surfaces, points, edges and provenance are available. Private read-only broker routes validate source/result/candidate bindings; no photos are copied into public assets and viewing makes no paid call.

The selected CPU completion can be reproduced with a fresh output directory:

```powershell
.local/reconstruction/venv/Scripts/python.exe scripts/room_workflow/complete_candidate.py `
  --result .local/reconstruction/arkitscenes/42445021/pilot-v1/analysis-result.json `
  --request .local/reconstruction/arkitscenes/42445021/pilot-v1/analyze-request.json `
  --fields-result .local/reconstruction/arkitscenes/42445021/pilot-v1/analysis-fields-result.json `
  --confidence-percentile 0 `
  --output .local/reconstruction/arkitscenes/42445021/reproduction-new
```

The independent depth CLI takes `--result` (fields result), `--manifest` (pilot manifest), `--depth-directory` (extracted highres_depth) and a fresh `--output` JSON path. It never modifies predictions.

## Final overnight verification

The private service was restarted with the reviewed implementation. An actual GET-only check through the Vite proxy verified both saved profiles, their exact geometry fingerprints, the optional wall-color variant and configured cloud/CPU/preflight adapters. Shado configuration remains absent. Viewing either saved room starts no model call.

The [point contrast pass](../design/revisions/arkit-point-contrast-v1/REVIEW.md) makes dark furniture easier to see without changing dot size, sampling, geometry, surface colors or provenance. **Enhanced contrast** is the point-view default; **Source colors** restores the original rendered point pixels exactly. Actual source-view screenshots, framebuffer comparisons, keyboard movement, touch emulation and graphics interruption/recovery passed. This is display treatment, not improved reconstructed geometry.

The [workflow recovery pass](../design/revisions/room-recovery-v2/REVIEW.md) fixes existing-call recovery, local admission feedback, boundary reload selection and authorization expiry while the page remains open. Its browser states are explicitly synthetic. Separately, the real cloud recovery client retrieved the fourth completed call and returned exactly the saved result, without submission or inference. CPU preflight decoded all seven actual originals in 0.515 seconds. Cancellation and restart tests cover frozen request identity, allowance consumption, stale recovery checks, the final launch barrier and discarding cancelled late payloads.

Final checks at this source revision:

- Repository check: **103 core + 259 application tests pass**, typechecks and Rust/WASM/app builds pass.
- Python room-workflow suite: **188 pass, 2 skip** (Modal absent in the CPU environment; host symlink-creation privilege unavailable).
- Node room-workflow/Shado suite: **108 pass, 2 optional checks skip** in the ordinary suite. Those actual CPU-adapter and Windows process-tree checks were executed separately and passed. The CPU adapter took 25.4 seconds. The process-tree check first failed under sandbox restrictions; its exact disposable processes were cleaned up, and the approved platform run passed in 0.480 seconds.
- Current browser evidence: actual saved-room/material/point checks and seven synthetic recovery scenarios pass; no page exceptions in the successful final captures.
- `git diff --check` passes; existing line-ending and Rust unused-code warnings remain.

The reproducible uncommitted source snapshot covers 102 implementation, test and integration files at base `c83fd4c04ca170ed38311b94cdcdebec779051b7`: [manifest](../../.local/reconstruction/arkitscenes/42445021/pilot-v1/final-source-snapshot.json), SHA256 `95009c823e86ed6b449413cf4c9b9744bec0186076a09798720a87c9046719ea`. Check logs and live-service verification remain beside it. No commit or publication was made.

The temporary system-awake helper permits the display to turn off and ends at **09:00 America/New_York, 2026-10-20 (13:00 UTC)**. A separate read-only monitor records usage and state for only the six apps in this pass through that time; it cannot start model work. At 09:51 UTC, all five ephemeral apps were stopped and the persistent deployment had zero tasks. Reported usage was still $0.29291343, excluding the incomplete 09:00 UTC billing interval and possible delayed charges; subsequent immutable `usage-monitor-*.json` snapshots provide later reports. No guarantee is made that the host or agent session will survive power, network or application interruption.

The [10:02 UTC usage snapshot](../../.local/reconstruction/arkitscenes/42445021/pilot-v1/usage-monitor-20261020T100200Z.json) reports **$0.40281599 of the $5 operational allowance**, now including the completed 09:00 UTC interval and both LoFTR attempts. Every app returned by the current listing has zero tasks; the oldest failed-build app was previously verified stopped and no longer appears in that listing. Delayed reporting remains possible, so this is reported usage rather than a final invoice. No further model jobs are scheduled.

[Acceptance](../design/acceptance/arkitscenes-pilot-v1.md) remains pending. Actual screenshots are retained under `docs/design/revisions/arkit-live-v1` through `arkit-live-v5`, plus `arkit-profiles-v1`; these verify uniform screen-size dots, depth occlusion and actual rendered changes during navigation. Shado's sealed-input quotation repair is recorded in [bridge v2 status](../../integrations/shado/V2_STATUS.md). No authenticated Shado deployment, video or A/B improvement result exists.

Official sources: [dataset formats/downloads](https://github.com/apple-aiml-research/ARKitScenes/blob/474aaa83d7b1c9080619d8485de2d7c885c01fc5/DATA.md), [raw conventions](https://github.com/apple-aiml-research/ARKitScenes/blob/474aaa83d7b1c9080619d8485de2d7c885c01fc5/raw/README.md), [depth-upsampling assets](https://github.com/apple-aiml-research/ARKitScenes/blob/474aaa83d7b1c9080619d8485de2d7c885c01fc5/depth_upsampling/README.md), [license](https://github.com/apple-aiml-research/ARKitScenes/blob/474aaa83d7b1c9080619d8485de2d7c885c01fc5/LICENSE).
