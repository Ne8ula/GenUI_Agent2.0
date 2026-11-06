# Teal bedroom completion

2026-10-22 · Implemented and browser-verified · owner acceptance pending.

## Scope / authorization

Owner requested the same authored treatment as the ceiling light for all other black gaps, retaining the automatically opening visual demo without uploads. They authorized a new **100 Weave credit ceiling** and explicitly approved the first exact **8-credit** quote. This pass adds room-specific authored backing geometry for architecture and existing furnishings, not reconstruction or a general upload feature. No Modal execution, new model downloads, commits or publishing.

## Fresh reference gate

Official Figma MCP authenticated successfully. `weave_run_model`, GPT Image 2.5 / Sunburst (`2db90e64-51dd-45b2-870a-66d19a81118e`), prediction `0050619d-054d-4fc5-892d-d6313290fa58`, completed. One public-dataset screenshot was uploaded using the official connection. High quality, landscape 4:3, opaque PNG. Tool-reported charge **8 credits**; 92 of this pass's ceiling remain uncommitted. Output 1024×768 retained at [room-reference.png](references/images/room-reference.png), visually inspected before product edits. No motion proposed; video generation not applicable.

Selected guidance: continuous ivory ceiling, pale sage walls, warm taupe floor, cream trim/cabinetry, teal curtains and bedding. Preserve existing recognizability and dark textiles. Reject the generated camera, changed furniture proportions, invented small accessories and exact wallpaper detail as geometry evidence. The generated image is appearance guidance only; no output pixels are projected onto source geometry.

## Implementation decision

Reuse the existing Three.js primitive assembly, display-only ceiling mask and bounded surface sampler. Add a small separate native completion mesh with walls/floor/ceiling, explicit window/door panels and backing solids inside existing furniture. Keep original source attributes, hash, source-only capture, teddy state and camera continuity. One completion switch restores original scan. No architectural redesign or new runtime inference.

Layout is authored approximation informed by existing furniture annotations and browser inspection of the supplied scan. Browser-only clipped plan and horizontal ray intersections support approximate orientation; these are viewing diagnostics, not a calibrated reconstruction batch. Axes follow bed alignment, not the full scan AABB (which contains corridor material). Do not create adjoining rooms. No claim of physical dimensions or recovered hidden geometry.

## Evidence

Before: matched 1440×900 screenshots retained from `../teal-bedroom-repair-v1/implementation/room-before/`. The three-left-turn baseline crosses a source wall; that image is a rejected viewing angle, not useful window evidence. Use reset, ceiling and right-oblique views for the matched comparison, and inspect additional interior angles separately.

## Verification / correction

Initial `candidate-v1` filled holes but overwrote 28.38% of supported bed-view pixels with approximated solids. Visually rejected and retained. Added a real browser pixel regression, observed its expected failure, then made source mesh/depth mark the stencil before completion renders. Completion mesh/depth/points draw only outside that source coverage; the existing narrow lamp replacement remains separate. This preserves source texture rather than claiming authored geometry is accurately fitted. Native geometry remains world-anchored, but visibility is missing-pixel-only. Hollow Matrix marks distinguish authored backing.

- `npm.cmd --prefix week4/app run check`: typecheck, **285/285 tests**, production build passed. Existing Rust unused-code and Vite large-chunk warnings remain.
- `node week4/app/scripts/verify-bedroom-completion.mjs`: bed **26,671/26,678** source-background pixels filled (99.974%); right-oblique **3,117/3,127** (99.680%); ceiling **111,879/111,879** (100%). Counts exclude canvas edges and overlaid controls. Existing supported interior pixel changes above 8/255 in any channel: 0.220% and 0.123% in bed/side views, within the 0.5% antialiasing/edge tolerance. Ceiling changes include the intentional lamp replacement and are not a source-preservation score. These are three-view presentation measurements, not geometric reconstruction accuracy or exhaustive room coverage. [Raw measurements](implementation/candidate-v2/coverage/coverage.json).
- `node week4/app/scripts/verify-bedroom-ceiling.mjs`: automatic loading/no uploads, completion and Matrix defaults, original source capture equality, keyboard/touch toggles, camera continuity, stable toggle geometry count, teddy undo, 44px/mobile bounds and simulated graphics recovery passed. [Checks](implementation/after/checks.json).
- `node week4/app/scripts/verify-bedroom.mjs` and `verify-bedroom-recovery.mjs`: keyboard focus/pan/Home, touch drag/pinch, details Escape, size/hash rejection, cancellation, actual browser `WEBGL_lose_context`, memory/history restoration, no uploads and no external runtime requests passed.
- Focused geometry tests failed on empty geometry before implementation, then passed for finite/bounded authored parts and distinct door/window ray hits. The integration assertion also failed before completion was attached.

Inspected photos: [room](implementation/after/views/bed.png), [ceiling](implementation/after/views/ceiling.png), [Matrix ceiling](implementation/after/matrix.png), [Matrix room](implementation/after/views/matrix.png), [wardrobe surface](implementation/after/wardrobe.png), [wardrobe Matrix](implementation/after/wardrobe-matrix.png). Matching raw/completed photos also live in `implementation/candidate-v2/coverage/`. Baseline images are copied under `implementation/before/`; original and rejected candidates are retained.

## Owner exercise / limits

Open `http://127.0.0.1:1440/?scene=teal-bedroom`; the room loads automatically. Use Reset view for the bed, Ceiling light for the ceiling, Surfaces/Matrix and Authored room for comparison. Teddy edits and camera remain during representation/completion toggles. [Acceptance record](../../acceptance/teal-bedroom-completion-v1.md).

This is a room-specific artistic backing layer, not reconstruction or model-generated 3D. Source fragments, material seams and dark photographed objects remain; Matrix intentionally retains black spacing. Existing orbit controls can cross walls, including the rejected three-left-turn baseline. The entry is capped within the authored room boundary, but untouched source fragments beyond it are not erased. Physical-device, native-performance, long-duration GPU memory and exhaustive all-angle quality checks were not run. No commits or publishing; owner acceptance remains pending.
