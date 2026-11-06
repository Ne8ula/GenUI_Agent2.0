# Arkham-inspired measured scan and photo-depth intro — v2

Status: **implementation candidate; cloud depth, GPU check and demo not yet run.** Owner acceptance pending. 2026-10-27, branch `crimescene`, base `0380e13` plus uncommitted work.

## Owner direction

- Detective view should feel like Batman: Arkham Knight's detective mode: wireframe and matrix-like. Inspired by it; no game assets, logos or UI copied.
- Reconstruction should use depth maps; the room should be recreated as faithfully as the data allows.
- Loading should analyse the real crime-scene photos with quick scans and similar effects, then reconstruct into 3D.
- Rendering and demo run on a Modal GPU; the local PC's memory is insufficient.

Approved 2026-10-27: Weave still (3.5 credits) and clip (31 credits), one Modal L4 depth run ($1), one GPU browser check ($2), one interactive demo session of up to 60 minutes ($3), and removal of the authored furniture approximation. No retries.

## References (actual outputs, inspected before source edits)

- [Still](references/images/detective-wireframe.png): Nano Banana 2.1, 1376×768. **Adopt:** near-black blue void, cyan wireframe over fine point texture, brighter near surfaces, one horizontal scan band, faint falling data glints, amber bracket highlights, one small caption chip. **Reject:** invented layout (whiteboard, duplicate chairs, extra bottles). The geometry must come from the measured scan.
- [Clip](references/videos/loading-sequence.mp4) and [contact sheet](references/contact-sheet.png) (2 fps): Seedance V1.5 Pro, 5 s, 1280×720. **Adopt:** a photo carousel with the centre photo in focus, a horizontal scan bar sweeping it, a blue-to-amber depth overlay, the photo tilting into 3D, particles streaking inward, and the room building floor-up under a moving scan line. **Reject:** the generated bedroom photos (the real photos are used), the spinning empty cube, and that it never reaches the furnished final frame.

## Implementation

- `renderer.ts`: the measured laser scan is the only room geometry. In detective view, a 10 cm grid in the raw scanner axes (so axis-aligned walls are never lit edge to edge), depth-graded brightness, falling data lanes, a sweeping height band and a post-pass of depth-discontinuity outlines give the wireframe look. The selected marker region is amber; the display-crop box is drawn as thin lines. Source colours show the scan unchanged. Reduced motion freezes all time-based effects.
- `intro.ts`: on first open, the 11 evidence photos pass through a carousel. Each is scanned top to bottom, edge-traced, overlaid with its Depth Anything V2 Small depth map, lifted into relief and dispersed into particles. Meanwhile the measured scan is revealed floor-up, with a bright layer front. It runs about 15 s, can be skipped, and is skipped under reduced motion and on reopen. If any photo or depth map is missing, the room opens without the sequence.
- The authored illustration and its test are preserved under `implementation/before/source/`, not deleted.
- Captions state that the room is measured, photo depth is a model estimate, and the effects are display only. Examination still requires a source photo or a held Source colours close-up.

## Verification so far

- Offline: 8 focused app tests, including new intro timing/name tests and the updated initialization test. App typecheck passes; adding `scripts/browser-options.d.mts` fixed the only error, an untyped `.mjs` import from the previous pass. 11 cloud-adapter tests pass, including real Modal SDK construction of the depth, check and demo functions without submission. Smoke, kiosk and demo scripts pass a syntax check.
- Depth: the first Modal submission was blocked by Claude Code's auto-mode classifier before execution. After the owner requested it directly, it ran once on an L4 (app `ap-UIC6Snjcb0lVPSxQgzDwgj`, model revision `5426e4f`) and returned 13 photo/depth pairs, now registered in the hash-checked catalogue. The app stopped with 0 tasks. Three pairs were inspected: object boundaries are clean; depth is relative only.
- GPU check (plan `6b340262…`, app `ap-hBqHwnQeGJRJ5tvnjOeCEP`, stopped with 0 tasks): **failed on its single attempt**. WebGL ran on `ANGLE (NVIDIA, Vulkan 1.4.341 (NVIDIA L4))`; the GPU-device, Vulkan and 8 unit checks passed. The smoke passed through the intro (8 distinct frames, 11 depth maps), detective animation, display-only highlight, Source colours switch, cutaway, zoom/reset and clue images, then timed out at line 99 waiting for "Examined". Cause: a test defect. Close-up dwell now counts only in Source colours, and the smoke still expected it in detective view. The dwell-cancel loop before it had also become vacuous. Fixed offline by running those checks in Source colours; syntax-checked only, **not re-run**. Captures are in [after/](implementation/after/). Inspected: desktop, intro-2, intro-5, detective-selected. The detective grid, edges, scan band and amber selected region render as intended; the intro shows real photos, depth heat and relief. Inspector, photo, notes, touch, reduced-motion and reply steps remain unverified in the browser.
- **Not run:** the demo (plan `24cd5655…`).
