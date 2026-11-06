# Room r03: reconstruction-first browser demo

Status: browser demo ready for owner review; owner acceptance pending.

## Scope and prerequisite

On 2026-10-19 the owner selected: “Reconstruction first: navigate the colored room, switch to points, and inspect source views (Recommended)” and “Waive Weave for this first room-demo pass”. This is an explicit waiver only for this bounded implementation and its corrections/verification, not a standing change to the visual workflow. No generation, paid run or reference-provider substitution occurred.

Uses the actual r03 reconstruction in meters, with supplied camera views, baked source color, reconstructed mesh vertices in point mode and inspectable source/provenance. Preserves the 0037 coverage warning. No artistic assembly, narrator, memory journal, completion, collision-safe movement or RGB-only inference claim.

Baseline: no runnable room route existed. Existing Paris/Rust routes remain available. Base commit: `70ad76c6888a9bbcc98bea8c2756ed73db0f5132`, plus preserved reconstruction and diagnostic changes. There is no matching room before-capture. [Provenance](provenance.json) pins current implementation and asset hashes.

Design guidance: room occupies the main stage; warm dark controls use existing bundled fonts, 44px touch targets, visible focus, direct movement without inertia/automatic motion, source panel preserves the current camera. Errors are explicit with retry. Dataset-derived assets retain attribution and CC BY-SA 3.0.

## Run and inspect

From the repository root: `npm.cmd run dev`, then open `http://127.0.0.1:1440/` or `?scene=hypersim-room`. The old root renderer remains at `?scene=rust`. Production: `npm.cmd run build`, then `npm.cmd --prefix week4/app run preview` on port 1441.

- [Desktop surfaces](implementation/after-v5/desktop-surfaces.png), [points](implementation/after-v5/desktop-points.png), [source inspection](implementation/after-v5/desktop-source.png), [doorway failure](implementation/after-v5/desktop-doorway-source.png).
- [Phone room](implementation/after-v5/phone-surfaces.png), [phone source panel](implementation/after-v5/phone-source.png), [keyboard focus](implementation/after-v5/desktop-keyboard-focus.png).
- [Graphics failure](implementation/after-v5/context-loss.png), [cancelled download](implementation/after-v5/cancelled.png), [incomplete download](implementation/after-v5/failed-download.png).
- [Production capture](implementation/production.png): packaged mesh and source image loaded; point selection worked; no page errors; development hook absent.

Final captures were inspected. Desktop: 1440×1000, DPR 1. Phone: 390×844, DPR 1, touch emulation and reduced motion. Fixed 4:3 scene framing matches supplied camera images. No automatic camera motion, inertia, reveal or staged loading animation.

## Verification

`npm.cmd run check`: passed TypeScript, 103 foundation tests, 250 app tests and production build; [full log](implementation/project-checks.txt). Existing Rust unused-code warnings remain. Initial Vite execution hit sandbox filesystem access restrictions; reviewed unsandboxed build/server execution succeeded.

`node week4/app/scripts/verify-room.mjs <fresh-directory>` against the running dev server: **14 browser checks passed**, zero page errors; [results](implementation/after-v5/checks.json). Includes actual mesh/point draw counts, exact reset, keyboard/mouse/touch, source continuity/focus, phone modal containment, reduced-motion idle, cancellation, invalid download and context loss both during/after loading. Headless Edge 155.0.4283.62 on Windows; no physical-phone or native Tauri claim. Initial ready time was 967 ms in this local run; this is not an FPS, network or device benchmark.

Earlier captures/results remain under `after`, `after-v2`, `after-v3`, `after-v4`. They document a failed context-recovery check and a first-tap-after-drag failure. Fixes replace the canvas on retry, prevent failed loading from restoring ready state, and prevent canvas touch gestures from consuming the next control tap. The final run passes those scenarios. Selected hover contrast and global fixed-height button interference were also corrected.

Read-only delegated audit: `/root/hypersim_audit` verified exported hashes/source JPEG reproduction and all four camera corner/center rays (maximum difference 7.14e-9), and identified the loading/context-loss race. The lead implemented all files and verified the browser. No external model or generated reference was used.

## Limits and owner exercise

Doorway frame 0037 remains 56.37% covered, with 38.74% of valid pixels within 5 cm. Other saved views exceed 99.95% coverage. Missing regions stay dark; surfaces are double-sided; navigation is bounded to the reconstructed bounds but has no wall collisions. Point mode displays the same mesh vertices, not trained Gaussian splats. The PLY is 23,791,416 bytes; no remote assets or private inputs are fetched.

Explore the cabinet and doorway, switch representations, compare sources, move away and reset. Record whether this is a useful first room demo in the [acceptance record](../../acceptance/hypersim-ai-001-004-r03.md). Acceptance remains pending.
