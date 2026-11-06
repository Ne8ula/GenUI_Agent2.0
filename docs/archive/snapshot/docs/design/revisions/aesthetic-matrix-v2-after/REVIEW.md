# Paris matrix room refinement

2026-10-20. Owner acceptance pending. Applies to the existing room-study pass under the owner's upload/reconstruction Weave waiver. No paid generation, new model, geometry inference or asset acquisition.

The owner asked to preserve the final Week 4 Paris dithered matrix appearance. Inspected the accepted [R18 quiet capture](../../../../week4/docs/design/revisions/w4-20261016-hover-overlays-r18/implementation/after/check-03/settled-qhd.png), its [review](../../../../week4/docs/design/revisions/w4-20261016-hover-overlays-r18/REVIEW.md), the retained scan renderer's mark families, and `render/patterns.ts` Bayer order. This is an adaptation of that visual vocabulary, not a claim that this simpler authored room reproduces Paris's image detail.

## Implemented

The complete-object study opens in **Points → Paris matrix**: three-CSS-pixel cells, 4×4 Bayer-based density with fixed grain, hollow square marks, sparse architectural coverage, subtle dashed contours, and a nearly black background. Photo-sampled hues are retained; shading and grain affect display lightness. Hollow marks label inferred geometry in normal viewing. **Uniform dots** restores the preceding hollow-circle treatment without moving the camera.

`matrix-style.ts` is development-authored shader code. It renders the same complete 3D object surfaces through a display mask; it is not a new point-cloud reconstruction or geometry measurement. Full depth occlusion keeps rear objects from showing through sparse marks. Architecture is still closed even where the presentation shows black space. No time uniform or animation loop is introduced; the text/controls remain undithered.

The original raw/fused/material candidates, source inputs, room geometry, camera presets, palette samples, provenance and solid rendering are preserved. The manually authored room study remains distinct from automatic ML completion.

## Evidence and checks

- [Before](../aesthetic-matrix-v1-before/desktop-default.png) / [after](desktop-default.png): same 1440×1100 viewport, DPR 1 and doorway preset.
- [Cabinet](desktop-cabinet-points.png), [desk](desktop-desk-points.png), [phone](phone-default.png), [uniform comparison](desktop-uniform-comparison.png).
- [Nine browser check groups](checks.json): default matrix mode, keyboard toggle, changed pixels, identical solid frame, deterministic restoration, interior views, retained fusion, navigation, graphics-event recovery, reduced motion, phone touch and overflow. No page or shader errors. Read-only saved public capture, no provider calls.
- TypeScript check and production build passed. App tests passed. Existing Rust warnings remain.
- [Retained reconstruction point regression](retained-point-regression/checks.json) checks original candidates separately.
- Source revision is uncommitted over `c83fd4c04ca170ed38311b94cdcdebec779051b7`; [source hashes](source-snapshot.json) identify this pass. The geometry module matches the preceding study snapshot.

The first matrix attempt had excessive wall coverage and is retained in `../aesthetic-matrix-v1-after/`. The final revision reduces wall coverage instead of removing or opening walls. Browser checks use emulated touch and event-based interruption, not native-device or physical GPU-failure validation. Pixel sampling can change with viewpoint; static mode is not a promise of identical rasterization across GPUs.

Owner exercise: inspect the doorway, cabinet and desk, switch Paris matrix / Uniform dots, and judge whether the mark density and black space match the intended Paris character. Acceptance remains pending; no automatic-completion or Shado milestone is implied.
