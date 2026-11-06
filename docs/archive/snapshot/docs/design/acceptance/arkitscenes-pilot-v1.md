# ARKitScenes pilot v1 acceptance

Date: 2026-10-20. Owner decision: **pending**.

Scope: actual seven-photo VGGT inference, CPU fusion/completion and browser evidence. EVA base `c83fd4c04ca170ed38311b94cdcdebec779051b7` plus uncommitted implementation. Plans freeze exact worker/request/model hashes. Preferred candidate geometry hash: `eb69dfe4972ec5839faab7f793f809afdaa0c6baf3fa9c69be69c0aa5d78daa9`.

The owner approved the $5 pilot, then unattended routine iteration and waived visual prerequisites for this pass. This permits the recorded bounded experiments and fixes under that allowance; it does not establish quality acceptance, authenticated Shado authority or unlimited spending.

## Expected and actual

| Scenario | Actual result |
| --- | --- |
| Same-room inputs with provenance | Capture 42445021; source bytes/license/metadata/hashes retained; seven selected RGB inputs and seven withheld |
| RGB-only inference | Four successful bounded VGGT calls, including the deployed upload route and exploratory broader-view selection; no reference depth/poses in requests |
| Failed-run recovery | Dependency image retained; Python serialization mismatch corrected; uncertain calls not replayed |
| Cloud lifecycle | Three ephemeral apps stopped; persistent worker deployed with zero minimum containers; partial billing is not final cost |
| Raw model output | 29,687 vertices, 54,924 triangles, estimated cameras and full numerical fields |
| Improved surfaces | TSDF fusion and three confidence variants; preferred candidate retains chair/lamp/wall detail |
| Single-room closure | 156,584 fused + 12 authored envelope triangles; hall clipped, boundary still unconfirmed |
| Dots | Fixed 1.8 CSS-pixel dots, spatially sampled surfaces and depth occlusion; original Hypersim parity is not assumed |
| Reference evidence | Seven-view depth diagnostic after one global scale fit: 5.127 cm MAE; not camera/fusion/completion or held-out accuracy |
| Withheld RGB diagnostic | Only 1/7 queries registered under frozen SIFT/PnP gates; failures retained. Common-pixel depth MAE: raw 4.44 cm, fused/completed 4.55 cm. Shell additions remain uncertain |
| Browser | Actual model artifacts; raw/fused/completed, source presets, surfaces/points/edges/provenance, keyboard/touch and WebGL recovery |
| Shado | Required actual comparison pending authenticated deployment/video; no mock B |
| Original-only refinement | SIFT and learned LoFTR tracks failed frozen connectivity gates; bundle adjustment did not run |
| Broader capture audit | All 91 pairs from 14 RGB frames checked; no conservatively supported connected seven-set; exploratory, not a new blind evaluation |
| Broader-view candidate | Separate seven-frame RGB selection, 65.639-second inference, 72,205 fused + 12 authored triangles; corrected hall cap, outside camera retained and labeled |
| Candidate isolation | Original stays default; fixed broader-view profile opens interior camera 1 and verifies independent source/result/candidate hashes |

## Reproduction and evidence

See [pilot record](../../research/ARKITSCENES_PILOT.md) for run IDs, hashes, paths, primary sources and commands. Start `npm.cmd run room:service` and `npm.cmd run dev`, then open <http://127.0.0.1:1440/?scene=arkitscenes-room>.

Actual browser captures remain under `docs/design/revisions/arkit-live-v1` (raw), `arkit-live-v2` (sparse completion), `arkit-live-v3` (dense completion) and `arkit-live-v4` (uniform dots). Each includes screenshots and `checks.json`.

At dense-v3: typecheck/build, 258 application tests, six benchmark loader tests and six browser checks passed. Dot-v4 also passed typecheck/build and six browser checks. Browser coverage includes representations/source presets, keyboard navigation, phone/touch/reduced motion and actual WebGL loss/recovery. A subsequent v5 verification also asserts actual rendered-pixel changes for orbit/zoom/movement/representations and exact restoration by Home; it passed. Later upload/bridge changes need their separate final check record.

The [actual upload follow-through](../revisions/actual-upload-isolated-v2/REVIEW.md) passed five checks using unchanged real model output in isolated test ownership and a synthetic boundary decision. Real CPU completion took 22.97 seconds. A renderer teardown race was fixed; failed v1 evidence remains. The original job was unchanged and no extra GPU/Shado call occurred. The root check passed 103 core plus 258 application tests, typechecks and Rust/WASM/app builds; the narrow renderer fix also passed typecheck/build.

The [two-profile viewer](../revisions/arkit-profiles-v1/REVIEW.md) passed seven loader/protocol tests, typecheck/build and five actual-browser verification groups with zero page errors or API mutations. Both candidates remain available, and the broader candidate's outside source is explicitly occluded by the closure. Explore <http://127.0.0.1:1440/?scene=arkitscenes-room&profile=vga-visual-v1>. Broader coverage is not evidence of more accurate reconstruction.

The subsequent [optional wall colors](../revisions/arkit-material-v2/REVIEW.md) and [point contrast](../revisions/arkit-point-contrast-v1/REVIEW.md) preserve physical geometry and provenance. Source point colors remain accessible; the enhanced display improves dark furniture visibility in inspected views. Final repository verification passes 103 core and 259 application tests plus typechecks/builds. The room suites pass 188 Python and 108 Node checks with two documented skips each; actual CPU and Windows process-tree checks passed separately. The exact 102-file uncommitted source snapshot and limitations are recorded in the [pilot's final verification](../../research/ARKITSCENES_PILOT.md#final-overnight-verification).

## Owner exercise and limits

Inspect sofa/window, desk/chair and doorway presets, then move away from the source cameras. Compare raw, fused and completed surfaces; toggle provenance and points. Confirm the hallway cap and assumed wall/ceiling extent describe the intended **one room**. Judge point spacing and object silhouettes explicitly.

Unknown object backs, coarse texture, jagged edges, unmeasured scale and assumed architecture remain. Closed-envelope coverage does not establish reconstruction accuracy. Casual-phone transfer, actual Shado comparison and downstream memory interactions remain unverified. No study, product release or owner quality acceptance is inferred.
