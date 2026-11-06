# Realsee panorama review

Date: 2026-10-28. Owner acceptance: **pending**. Scope: supplied Realsee v2 GLB in EVA, with separate original evidence and bounded room exploration. No chair generation, event playback, Kimodo, calibration or geometry completion.

## Fresh Weave prerequisite

Official Figma/Weave MCP account and direct-model contracts checked in this session. No reusable workspace tools were listed. No private source imagery uploaded; both prompts describe fictional design references, not the supplied scene.

- Still: Nano Banana 2.1 (`fal-ai/nano-banana-2/edit`), 2K, 16:9, PNG, minimal thinking, web search disabled. Owner explicitly approved 5 Weave credits; charged once. Run `6bf9c40f-1ac5-450e-bb50-989538f17e44`. [Actual image](references/images/panorama-review.png), 2752×1536, inspected.
- Motion: Seedance 2.5 (`bytedance/seedance-2.5/image-to-video`), text-only, 4 seconds, 720p, 16:9, H.264, standard bitrate, no audio, US-hosted, no draft. Quote-only permission was obtained after a tool permission denial; no bypass. Owner then explicitly approved 112 credits; charged once. Run `34f33f9e-89fc-4268-ac1d-4f64d064bea5`. [Actual video](references/videos/panorama-navigation.mp4), H.264, 1280×720, 24 fps, 4.041667 seconds. Inspected eight sequential samples at 0.5-second intervals in the [contact sheet](references/contact-sheet.png): restrained turn, then final stationary framing. Local CPU video decoding only, not local scene rendering.
- Total authorized and charged: **117 Weave credits**. One attempt each, no retries. Waiting limits: 15 minutes still / 20 minutes video; provider cancellation/hard timeout unavailable through this model tool. Retain outputs and receipts, no publication or deletion. No Modal spending authorized yet.

**Fresh reference gate satisfied for this bounded panorama pass; implementation and Modal evidence remain pending.** Generated video geometry and smoothness are not reconstruction/performance evidence. Reject its tiny low-contrast labels, glowing pill styling, extra room partitions and apparent mesh changes. Implement immediate user-driven camera movement, no autonomous sweep or geometry animation, and a stable paused/reduced-effects view.

## Still inspection and guidance

Retain readable neutral room textures, dark negative space behind missing surfaces, explicit inferred/unaligned/needs-review wording, cyan focus, and original evidence separated from the unaligned mesh. Reuse EVA's fonts and controls.

Reject generated room geometry and source thumbnails as evidence; they are fictional. Reject invented camera/mesh numbers, duplicated controls, fake desktop chrome, extraneous grid and capture timeline. Do not implement the image's calibration cube or imply that the panorama is registered to scan markers. Keep navigation user-driven and stoppable; holes remain holes.

## Implementation and evidence

The current scan viewer is Z-up and pinned to the measured PLY. Do not replace that identity with the GLB or rotate the GLB twice. Use its existing Y-up root unchanged; keep the measured scan accessible separately. Browser textures, physical units, scan alignment, completeness and PBR lighting are unverified.

Baseline: first Realsee viewer implementation, with no runnable Realsee before-state (DESIGN.md's first-implementation exception). The measured scan remains available and will be captured separately on Modal with the new return bar; that is a source-evidence comparison, **not** an unchanged before capture or an aligned camera match. No fabricated before image. Planned capture target: 2560×1440, DPR 1; 60 fps is a target only. Real frame intervals, GPU identity, texture upload, screenshots and interaction results must be reported.

Independent read-only Opus review completed. Within this same bounded pass, reopen now mounts a fresh canvas; the capture includes mouse drag/wheel, touch-enabled button taps, a held-GLB cancellation barrier and graphics-context-loss recovery. Diagnostics stream before media without increasing the 64 MiB limit. Offline tests pass for canvas identity and diagnostic retention; these browser assertions remain unexecuted until Modal approval. Pinch, right-drag, physical touch hardware and full-shell behavior are not checked. Detailed rulings, regressions and pending approval are in [render acceptance](../../acceptance/crime-scene-realsee-render-v1.md).

## Approved Modal attempt outcome

The owner subsequently approved the exact sealed upload/cloud-build/render proposal and $2 operational allowance. Its one attempt (`ap-1s6wLAJd8UOgeHR9gmY0tq`) reached the 1,200-second client timeout waiting for evidence and returned zero files. Upload/function creation were reported. Follow-up authenticated dashboard inspection and the SDK call graph establish **no container was assigned**; the worker and renderer did not execute. The call remained queued until client-timeout cleanup cancelled it. Why allocation did not occur remains unknown; no GPU-capacity or quota cause is asserted. Receipt and read-only provider inspection confirm the app stopped; receipt records zero tasks. No actual images/video exist to inspect. The app usage page currently shows $0.00, not a final-invoice guarantee, and no retry is authorized. See [full outcome and retained receipt](../../acceptance/crime-scene-realsee-render-v1.md). Earlier pending/unapproved wording describes preparation; the attempt is now consumed, not accepted.

## Second approved attempt — actual render inspection

The owner separately approved the identical-snapshot v2 proposal (`b6a473d04afe01b31451ca4df9de8f595988038e369f92d60b2be0b00c44e0fb`) after quota inspection. App `ap-NYASUKRlqfdQMVa2xqRa0o` returned 17 files /7,218,386 bytes: nine screenshots, 24.28-second 1440p VP8 video and diagnostics. NVIDIA L4 and both embedded texture uploads verified; 52 remote unit tests and bounded interaction assertions passed. Receipt and independent CLI inspection confirm stopped; receipt records zero tasks. No further attempt authorized; actual billed cost unverified.

Inspected the actual overview, inside, turned, mobile, original-scan and original-photo images individually, all nine stills in a contact sheet, and 25 sequential one-second samples of the 607-frame video after CPU decoding. These private outputs and hash manifest remain under `.local/reconstruction/crime-scene-realsee-render-v2/`; no source-derived images copied to public evidence or published.

**Quality is not accepted:** overview shows an incomplete photo-textured shell with open/warped surfaces; Inside view fills the scene with a nearly featureless close-looking surface, not a useful interior. The automated capture did not assert interior visibility. Original measured scan/photos remain visibly separate; mobile/recovery/reduced-motion captures retain scene and controls. Recording includes automated orbit, loading and viewport transitions rather than a polished walkthrough. Sampled inspection does not establish continuous motion smoothness.

Recorded navigation measured 23.14 mean FPS, 49.9ms median and 50.1ms p95, versus the 60 FPS target. Mean draw plus GPU finish was 0.563ms; recording/scheduling overhead is not isolated. Viewport is 2560×1440, canvas 2560×1130; video is 25 FPS. Diagnose Inside view and isolate performance measurement before another visual change or paid run. The [acceptance record](../../acceptance/crime-scene-realsee-render-v1.md) carries exact evidence, limitations and the remaining full-suite failures. Earlier pending/no-output language describes the first attempt, not this result.

## Interior-first follow-up — CPU diagnosis, no UI edits

Owner feedback prioritizes the room interior, not exterior inspection. On 2026-10-28, inspected the current renderer, component, capture and framing tests against the exact retained v2 GLB. This is diagnosis after the previous bounded visual pass, not reuse of its spent allowance.

- `framePanorama()` supplies the world bounding-box midpoint to `enter()`, which looks along +X without checking nearby surfaces. After the existing GLB root transform, that position is `[2.1422230303, -0.0195950270, 0.1808549762]`.
- CPU double-sided ray/triangle intersections against all 11,330 triangles put the center-ray surface **0.1979182360 model units** away. Nine sparse frustum probes at NDC X/Y `[-0.9, 0, 0.9]`, vertical FOV 50 degrees and canvas aspect `2560/1130` all hit material 0 at distances **0.1979182360–0.3025925684**. These hits are beyond the near plane, `0.0034448417`; this is a close-facing surface, not evidence that near-plane clipping removed the room. Physical units remain unverified.
- The same position's -X axis has 2.5275044689 units of clearance. Origin/+X has 2.3481962714 units, but the origin is only a diagnostic alternative, **not a calibrated or accepted viewpoint**. Sparse rays do not establish collision-free walking or complete visibility.
- `turn()` rotates the camera position around its target. It is orbit navigation, not stationary interior looking. The capture clicks Inside view and saves an image but never asserts useful interior visibility; existing framing tests cover exterior fitting, not interior placement.

The CPU probe checked the exact GLB length/hash, root matrix, triangle count and finite coordinates; synthetic hit, reversed-winding, miss and near-cutoff assertions passed. It rechecked the source hash after inspection. No texture decoding, GPU use, local scene rendering, asset edits or new paid execution occurred. The diagnostic script and JSON remain in this session's private scratchpad; the numbers and method above are the repository record. No application tests were rerun for this documentation-only diagnosis.

Next bounded correction: make a reviewed interior pose the opening/reset view, turn about the camera rather than orbiting it, preserve pause/evidence/recovery continuity, and require useful interior evidence in the Modal capture. Do not alter source geometry to hide a camera defect. Exact pose and visual quality remain pending inspection, not established by these probes.

Fresh model discovery succeeded for Nano Banana 2.1 and Seedance 2.5. A text-only 2K still **quote request** (no `acknowledgedCost`) was denied by the tool permission gate before a quote or run result was returned; no retry or alternate route was attempted. No new generation was started by this session. The fresh image/video prerequisite, exact cost approval and subsequent separately sealed Modal render remain blocked/pending. Existing allowances remain consumed.

[Import acceptance and retained assets](../../acceptance/crime-scene-realsee-import-v1.md).
