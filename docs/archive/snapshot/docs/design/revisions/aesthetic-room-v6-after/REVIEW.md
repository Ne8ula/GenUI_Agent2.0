# Complete-object aesthetic study

2026-10-20. Owner acceptance **pending**. Uncommitted candidate over base `c83fd4c04ca170ed38311b94cdcdebec779051b7`; exact changed source hashes are in [source-snapshot.json](source-snapshot.json).

Open [the room](http://127.0.0.1:1440/?scene=arkitscenes-room&profile=vga-visual-v1), with the existing local room service and Vite running. Select **Desk and chair** or **TV and lamp**. Points open by default; surfaces, edges, provenance, and all earlier reconstruction candidates remain selectable.

## Scope and owner choices

The owner rejected disconnected furniture joined by flat wall fill. They selected uniform points, recognizable photographed shapes/proportions, simplified clutter, sampled photo colors on a dark background, and visibly different dots for inferred geometry. These choices are recorded in [DESIGN.md](../../../../DESIGN.md). The existing upload/reconstruction Weave waiver applies; no new reference generation or paid inference occurred.

This implementation is a **manually authored study of one public room**, not an automatic reconstruction or object-completion model. It deliberately contains no VGGT surface fragments. The room shell, continuous cabinet, desk, chair, sofa, TV, printer, lamp and closed window/door are authored solids. All geometry is inferred, so all study points have hollow centers. The photo estimate retains filled dots. Source-inspired visible parts are not falsely labeled measured.

Fourteen palette samples record original-image SHA-256, view number, crop rectangle and encoded RGB medians in `aesthetic-room.ts`; all fourteen were recomputed against the original photos. Authored shading and optional point contrast alter display colors. Camera layout and dimensions are approximate relative units. The study is offered only for the bound public capture/result and matching source hashes; arbitrary uploads never receive this hardcoded room.

## Visible changes and verification

- [Cabinet surfaces](desktop-cabinet-surfaces.png), [cabinet points](desktop-cabinet-points.png): one continuous top and body, doors and drawers.
- [Desk surfaces](desktop-desk-surfaces.png), [desk points](desktop-desk-points.png): complete tabletop, legs, chair and printer.
- [Default points](desktop-default.png), [phone points](phone-default.png), [provenance](desktop-provenance.png).
- [Before](../aesthetic-room-v1-before/desktop-default.png): same 1440×1100 viewport/DPR 1, prior fused-shell candidate. Coordinate frames/viewpoints differ; this is a visual workflow comparison, not registered geometric evaluation.

The initial point sampler suppressed visible cabinet panels and the TV screen because hidden bodies were within the minimum spacing. Authored primitive/facing partitions retain samples on both surfaces; depth testing selects the visible front. A regression fixture changed central TV-screen coverage from zero to 100 samples at the original diagnostic spacing. The final display uses 0.035 relative-unit spacing, 3.2 CSS-pixel hollow dots and the existing global resource caps. Separation is uniform within each partition; overlapping partitions are not claimed to have global minimum separation. Earlier v1–v5 captures remain as iteration evidence.

Actual checks:

- 13 focused geometry/sampling tests passed, including enclosure, camera bounds, continuous cabinet ray intersections, thin-panel coverage, provenance, deterministic output and resource limits.
- Root `npm.cmd run check` passed both TypeScript checks and both test suites; its final Vite build was blocked by sandbox ancestor-directory access. The authorized `npm.cmd run build` subsequently passed. Existing Rust warnings remain.
- [Eight browser check groups](checks.json) passed: actual saved result, points default, desk/cabinet views, keyboard, representations, retained fusion, interruption/reopen, phone touch and reduced-motion/overflow. No browser errors or non-GET workflow calls.
- [Retained point-display regression](retained-point-regression/checks.json) checks the original/fused/material candidates separately.

The browser interruption check dispatches the context-loss event and verifies remount recovery; it is not a physical GPU-failure test. Touch is emulated. This remains a simplified artistic approximation; clutter, precise furniture identity and measured dimensions are not recovered. General photo-to-complete-object inference is unfinished.

## Shado status

A fresh local audit found the main Shado checkout clean, the v2 bridge confined to its isolated worktree, and the running EVA broker reporting `shadoConfigured:false`. No real Shado video or A/B comparison exists. The prepared recipe is five seconds of silent 720p reference-based video, not a calibrated 360°/depth/marker package. The bridge needs deployment, exact origins, its dedicated secret, real account authentication and provider readiness. [Bridge evidence](../../../../integrations/shado/V2_STATUS.md) documents the completed and outstanding work.

## Owner exercise

Inspect the full cabinet and desk in points and surfaces. Assess shape fidelity, dot density, palette and the inferred-dot cue. Approve or revise this visual direction before treating it as the target for automatic object completion. No acceptance is inferred from passing tests.
