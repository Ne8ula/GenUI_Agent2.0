# Interior-first panorama pass

Date: 2026-10-29. Owner acceptance: **pending**. Scope: interior opening/reset pose, stationary look controls, preserved evidence/pause/recovery and honest capture checks for the supplied Realsee v2 candidate. No geometry completion, exterior redesign, chair generation, Kimodo or new inference.

## Fresh Weave gate

Official Figma MCP direct model calls completed after structured, explicit cost approvals. Text-only fictional references; no private source uploads. One attempt each, no retries. Total charged: **117 Weave credits**. Waiting limits: 15 minutes still, 20 minutes video; no provider hard-timeout/cancellation guarantee. Both completed. Retain outputs; no publication. This approval does not include Modal execution.

- Nano Banana 2.1, `fal-ai/nano-banana-2/edit`; run `c1a97d48-1fb6-4c1a-ae59-99d196067694`, 5 credits. 2K, 16:9, PNG, minimal thinking, web search off. [Inspected still](references/images/interior-reference.png), 2752×1536.
- Seedance 2.5, `bytedance/seedance-2.5/image-to-video`; run `84e18729-a075-4da3-97cb-69eae2391629`, 112 credits. 4 seconds, 720p, 16:9, H.264, standard bitrate, no audio, US-hosted, no draft. [Actual video](references/videos/interior-reference.mp4), 1280×720, 24 fps, 97 decoded frames / 4.0417 seconds. CPU decoded the full clip and inspected nine half-second samples including the final frame in the [contact sheet](references/contact-sheet.png). This is sampled motion inspection, not continuous smoothness verification.

## Inspection and bounded guidance

Retain the still's interior-filling perspective, quiet controls, explicit trust labels, readable textures and dark voids. Reject fictional architecture, fake coordinates/camera identifiers, font-name labels, decorative full-frame focus and large overlaid controls. Keep the existing fonts, layout, provenance and accessible buttons rather than copying the generated chrome.

The video samples show an interior turn/translation with fixed controls, but continue changing through the last sample. Do **not** reproduce the continuing drift, missing Inferred label, tiny text or invented surfaces. Implement stationary-position looking, immediate stop on pause/release, no autonomous camera animation, and no motion inertia. Generated geometry, camera calibration and performance are not evidence.

**Fresh gate satisfied for this bounded pass before UI source edits.** Actual corrected scene appearance and interaction evidence still require a separately approved Modal run.

## Baseline and implementation criteria

Baseline is the unchanged v2 Modal output under `.local/reconstruction/crime-scene-realsee-render-v2/returned`, with the previous sealed source snapshot retained. Its interior image is a close-facing surface. [CPU diagnosis](../crime-scene-realsee-v1/REVIEW.md#interior-first-follow-up--cpu-diagnosis-no-ui-edits) confirms the bounds-center/+X camera faces a surface 0.198 model units away. No new before render was authorized. Compare the same native viewport/DPR and named interaction states after approval; changed initial camera is intentional, not a pixel-matched camera comparison.

Use the source package's origin as a candidate inspection viewpoint, not calibrated eye height or registered source-camera orientation. The retained observer metadata lists position zero; CPU axis probes show 2.348 model units of forward clearance there. Metadata is unverified and does not establish reconstruction accuracy. Keep the existing Y-up transform and geometry unchanged.

Affected implementation: `panorama.ts`, `PanoramaApp.tsx`, `panorama.css` only if input handling needs it; focused panorama tests and `crime-scene-panorama-capture.mjs`. Reuse the measured-scan viewer's pointer-capture pattern, not its Z-up/calibrated movement bounds. Opening and Home/reset should return inside; turning/dragging should not orbit or translate. Preserve keyboard/touch buttons, pause, cancellation, original-evidence camera continuity and fresh-canvas recovery. New tests must cover the actual interior navigation contracts; screenshots alone must not imply visual-quality acceptance.

Implementation: interior origin/reset, stationary look, height-preserving movement, immediate input interruption and updated instructions are implemented; CSS/geometry/textures unchanged. The capture now rejects nearly uniform interiors and records visual acceptance as pending, with its helper included in cloud snapshots. Verification: 17 focused tests, 454 repository tests, TypeScript and capture syntax passed; cloud packaging tests passed 9 with 1 Modal-SDK skip. Actual CPU Three.js probes at the new origin hit geometry at 1.7617–2.5251 units across nine samples; the prior failed PNG is rejected by the new contrast sentinel. [Acceptance record and limitations](../../acceptance/crime-scene-interior-v1.md).

The later separately approved Modal capture hit its 1,200-second client deadline; provider logs twice reported waiting for L4 capacity. Zero capture files returned; app shutdown and zero tasks confirmed. That one-attempt approval is consumed; no corrected-scene visual evidence or retry authorization exists. See the [capture outcome](../../acceptance/crime-scene-interior-v1.md#capture-outcome--capacity-wait-no-visual-evidence). Source revision: `0380e13efbdfa8c1ee29fe2c621927852b7766b7` plus dirty shared checkout, not HEAD alone. [Scoped tested source hashes](implementation-manifest.json) identify the ten implementation/test/packaging files, not a sealed full application snapshot.

## Independent review follow-up

The read-only reviewer reported no blocking/high-severity defect and one medium test gap: the evidence round trip compared home against home, so a missing restore could pass. The capture now turns and moves away from home, asserts a different image hash, then requires the same off-home image after returning. A CPU-only renderer lifecycle test exercises actual load/reset/restore, real Three.js cameras and controls, with synthetic decoded geometry and stubbed GPU/asset I/O. Removing position restoration, target restoration or orientation update in memory independently made the new test fail; the unchanged production renderer passes. No UI/runtime source changed in this review fix.

Deferred low items: the real-mesh clearance probe remains private scratchpad evidence rather than a committed regression; the SHA pin plus recorded CPU diagnosis and pending manual inspection guard the candidate-specific opening pose. Contrast alone can accept a close textured wall. Cloud staging paths still name the earlier revision; any newly approved attempt needs a fresh output directory and capture placement in this packet. High-resolution wheel behavior remains untested and unscaled. The video receipt records text-only input, but its image-to-video model identifier warrants provider input-metadata clarification; no new request was made. Unused argument/import/local cleanup is deferred. None grants execution or visual acceptance.
