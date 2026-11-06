# Teal bedroom teddy

2026-10-22 · implemented and browser-verified · owner acceptance pending.

## Bounded scope

Owner approved a more realistic authored plush teddy for the existing visual demo and matching point rendering in Matrix. Preserve bed anchor, identity, cream/blue recolouring, remove/undo, camera continuity, source scan and room completion. No new animation, runtime AI, model downloads or reconstruction pipeline. Files: bedroom/memory.ts, bedroom/renderer.ts, focused memory tests and browser verification; existing room sampler reused.

## Fresh reference

Official Figma Weave direct model: GPT Image 2.5 / Sunburst, model `2db90e64-51dd-45b2-870a-66d19a81118e`, prediction `a97703f1-a245-4041-baca-55f59f044c5c`. Owner separately authorized up to 8 of the previously unspent 92 credits for this teddy pass and approved the exact 8-credit quote. Completed, tool-reported charge 8 credits. Total from original 100-credit authorization: 16; 84 uncommitted, not authority for another pass. No uploads: text-only generation, high quality, opaque landscape 4:3 PNG, 1024×768.

[Inspected reference](references/images/teddy-reference.png) · [Contact sheet](references/contact-sheet.png). No video: no motion added.

Adopt pear-shaped stuffed torso, connected drooping arms, broad seated feet, inset ears, small dark eyes, cream protruding muzzle, triangular nose, mouth seams, fabric pile and warm restrained palette. Matrix retains the same shape using small square marks; preserve authored provenance rather than claiming recovered detail. Generated bedroom, dimensions and camera are not geometry evidence. Procedural fabric/short pile is a bounded approximation, not simulated groomed fur.

## Before / evidence criteria

1440×900, device scale 1, reduced motion: [Surfaces](implementation/before/surface.png), [Matrix](implementation/before/matrix.png), [blue Matrix](implementation/before/matrix-blue.png). Existing bear is smooth spheres and stays solid in Matrix.

Require geometry/material tests, true Matrix point rendering with depth occlusion, no visible solid bear in Matrix, recolouring in both modes, unchanged anchor/history/camera, stable resources through toggles, disposal, browser keyboard/touch/recovery, and matched after photographs. No physical-device or photorealism claim. No commit or publication authorized.

## Implemented / verified

Native deformed plush parts, procedural fabric bump texture, short static fibre strokes, inset ears, muzzle, stitched mouth/paw seams and glossy eyes replace the previous plain spheres. The retained room sampler produces **7,580 points** from the same teddy surfaces. Matrix keeps depth-only teddy meshes for occlusion, hides surface fibre strokes and displays hollow square points; Surfaces restores materials. Cream/blue fur and points share colour changes. Anchor remains `[0.2, 3.4, -0.6535833283188413]` in the tested room. Texture, mesh, point and fibre resources are disposed on teardown.

Candidate v1 was visually inspected and retained: its 31,119 points were too dense relative to the room. The final candidate uses wider spacing, lower-contrast pile and subtler paw stitching. [Final Surfaces](implementation/after/surface.png) · [Final Matrix](implementation/after/matrix.png) · [Blue Matrix](implementation/after/matrix-blue.png). All three inspected at matching 1440×900/device scale 1. The generated reference is not the implemented renderer or a claim of matching photorealism.

- `node --test week4/app/tests/bedroom-memory.test.ts`: two new tests first failed for missing Matrix samples and missing fabric detail, then all **7 passed**. Checks bounded finite geometry/samples, both representations, hidden-surface depth, recolouring, removal and identity/anchor/resource reuse.
- `npm.cmd --prefix week4/app run check`: **287/287 tests passed**, typecheck/build passed. Existing Rust unused-code and Vite large-chunk warnings remain.
- `EVA_BEDROOM_EVIDENCE=docs/design/revisions/teal-bedroom-teddy-v1/implementation/interaction node week4/app/scripts/verify-bedroom.mjs`: passed actual renderer point draw counts and zero teddy surface-colour writes in default Matrix; 20 representation changes reused geometry. Keyboard, touch drag/pinch, reduced motion, recolour/remove/undo, source counts, camera/anchor, Escape, 44px targets and mobile overflow passed. [Checks](implementation/interaction/checks.json).
- `node week4/app/scripts/verify-bedroom-recovery.mjs`: passed wrong-size/hash rejection, cancellation, actual browser context loss/reopen, memory/history restoration, no uploads/external requests. [Recovery checks](../teal-bedroom-demo-v1/implementation/recovery-1792698392749/checks.json).
- `git diff --check`: passed tracked changes; current teddy files are untracked and separately checked before handoff.

## Independent review

Actual read-only reviewer: Opus 5.5 (`claude-opus-5-5[1m]`), Read/Glob/Grep; no reviewer test/browser execution. No blocking/high-severity finding. Lead browser evidence above subsequently covers the review's pending-mode/default/after-photo checks.

Deferred minor: paw rings sit slightly in front of their pads (about .006–.008 in authored coordinate units); mouth stitching has a smaller offset. They read as seams at the presentation view but can separate at close side angles. No physical-unit calibration is implied. Debug `teddyPoints` counts configured visible point layers even when the parent bear is removed; consumers must also read `teddyVisible`. No measured startup/native-performance claim.

## Owner exercise / limits

Open `http://127.0.0.1:1440/?scene=teal-bedroom`, choose Reset view, Add teddy, and compare Surfaces/Matrix. Make it blue, remove it and undo; the anchor and camera stay fixed. Existing scan and room completion are unchanged by this pass. [Acceptance](../../acceptance/teal-bedroom-teddy-v1.md) remains pending.

This is a more detailed authored plush approximation, not photorealistic scanned/groomed fur. Thin fibre strokes and material detail are display approximations; placement is manually anchored, not physical calibration. No animation, collisions, new runtime model, physical-device testing or long-duration GPU soak. The preceding room-completion Matrix-density concern remains outside this teddy pass; no fix or exhaustive room-quality claim is made here.

