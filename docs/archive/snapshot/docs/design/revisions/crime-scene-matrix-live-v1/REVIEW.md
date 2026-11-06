# Interactive Matrix correction — in progress

2026-10-29; dirty `crimescene` checkout based on `0380e13efbdfa8c1ee29fe2c621927852b7766b7`. Owner acceptance pending.

## Bounded direction and visual prerequisite

Owner rejected the video-only deliverable and broad contour aesthetic, requesting camera control and the retained Week 2–4 dithered Matrix appearance. Explicit answers: **“Reuse code; waive Weave”** for this correction and **“Approve one live session.”** No fresh generation or additional Weave spending. Earlier references and captures remain untouched.

The read-only research pass inspected `week4/app/src/room/matrix-style.ts` and the retained crime-scene Matrix figure/walkthrough images. Reuse the Bayer order, 3px static cells, hollow inferred marks, photographic hue, rim light and dark negative space. Do not transplant legacy geometry or pretend the unaligned GLB is measured. Keep one outward pulse revealing a stable dithered room, not continuously moving rings. Keep the existing quiet chrome and typefaces.

## Implementation and evidence criteria

- Same pinned GLB and two embedded textures; no new geometry, generated objects or scan-coordinate anchors.
- Matrix treatment changes fragments only; depth remains intact behind dark gaps. Normal mode is reversible.
- Replay retains the explored viewpoint; explicit Reset still returns home.
- Interactive cloud Chromium through password-protected noVNC, not a WebM substitute.
- Before launch: focused shader/control/adapter tests, repository tests and typecheck. In the single worker: NVIDIA check, actual camera interaction, Matrix/normal comparison, replay continuity, source-photo decode and keyboard dismissal; retain screenshots and diagnostics before handing over control.

Baseline: earlier contour capture retained under `../crime-scene-inspection-demo-v1/implementation/after/`; not a fresh matching baseline. New same-revision normal/Matrix/restored captures will establish treatment continuity, not reconstruction accuracy.

## Finite authorization

One Modal submission; GPU preference T4/L4/A10G, one GPU and container, 4 CPU, 16 GiB, 900-second worker, 300-second worker-start wait, 1200-second client. $2 operational allowance, not a provider-enforced dollar cap. No retry. Scoped snapshot ≤64 MiB. Existing cloud Xvfb/x11vnc/noVNC dependencies only; temporary internet-accessible password-protected viewer, no deployment or persistent volume. No local scene rendering. Password/temporary viewer link stay out of repository evidence. Provider-managed cache retention and actual billed cost are unknown.

## Returned evidence and review

- `npm test`: 103 core + 357 app tests passed. Typecheck passed. 22 Python adapter tests passed without skips; kiosk syntax check passed. Initial renderer-fixture failure from the new shared import was fixed and the full suite rerun.
- Modal app `ap-rJHhvrfqK2PGUMGpQh2f9D`, plan SHA-256 `9716a38c992a1d7ac5be09e711c1a61a52021f8a22cba0b5c4d3df2e4296c3a9`: observed NVIDIA Tesla T4. Worker acknowledged at 16:21:46 UTC; viewer ready at 16:22:02 UTC. One submission, no retry.
- [Actual browser checks](implementation/after/result.json): keyboard camera movement, pointer drag in Matrix mode, replay viewpoint continuity, pause, sweep settling, original-photo decoding, Escape/focus return, exact normal-mode central-crop restoration, 390px touch/dismissal/no-overflow and reduced-motion settling passed. Page/shader errors: none.
- Native screenshots inspected: [normal](implementation/after/room-normal.png), [Matrix](implementation/after/room-matrix.png), [source](implementation/after/room-source.png), [restored](implementation/after/room-restored.png), [mobile](implementation/after/room-mobile.png), [live handoff](implementation/after/room-live.png). Copies hash-verified against returned files.
- Headful opening viewport was **1599×812**, not the requested display dimensions. Matching normal/Matrix/restored captures share that viewport. After mobile verification the live viewport is explicitly **1600×900**; mobile is **390×844**. No 1440p or runtime-FPS claim.

The broad contours are gone; fine hollow dither cells, photographed hue and dark gaps are visible. This remains a wall/window-facing composition rather than a convincing whole-room establishing view. Dither is visually dense on broad light surfaces, and source mesh softness/faceting remains unchanged. Functional success is not visual acceptance.

## Status and next owner exercise

The temporary viewer **ended normally**; its terminal receipt records `state: stopped`, `tasks: 0`. No persistent deployment or renewal is authorized. The expired viewer URL and password were delivered in-session and are intentionally omitted here.

### Continuation correction — offline only

After the owner requested continued implementation, the remaining approved session was used to inspect the real noVNC view: original appearance exposed a sofa/window corner after turning. F11 restored the full cloud-browser display; the session then reached its time limit. An eight-frame browser-review GIF was downloaded as `matrix-room-framing-review.gif`; it is not a render of the subsequent code change.

Within the same owner-waived Matrix correction, `panorama.ts` now uses a 70° vertical FOV (was 50°), a roughly 12° downward opening pitch, reduced broad-surface coverage (0.10 + 0.14√luminance, retaining the rim term), and a faint source-color backing beneath the marks. Source geometry, camera origin, controls and provenance are unchanged. These adjustments are **not** in sealed live snapshot `9716a38…`; all existing captures remain evidence of the preceding shader/view only. Three regression assertions failed before implementation; the full 460 tests and typecheck passed afterward. No subsequent GPU run or visual-quality claim.

Owner exercise: drag/turn/move, compare Matrix with original appearance, then replay from the chosen angle. Judge density and room readability; acceptance remains pending. No extra capture submission, geometry repair, new inference or new generation. No new motion recording; the outward sweep retains its prior timing and was checked for reaching its settled state, not frame-by-frame smoothness.
