# Point contrast display experiment

2026-10-20. Implementation review complete; owner acceptance pending. This pass uses the owner's current UI-workflow waiver and the parent's bounded approval for a point-only linear-luminance floor of 0.14.

The enhanced setting makes dark sofa and chair points easier to distinguish from the dark background in the inspected saved ARKitScenes views. It is now the point-view default. **Source colors** remains available beside **Enhanced contrast**, with a visible explanation that the enhancement affects points only. The default representation remains Surfaces.

Parameters and manual regions were frozen in [frozen-parameters.json](frozen-parameters.json) before browser capture. Only sampled linear RGB below luminance 0.14 is mixed toward white. Brighter colors remain exact. Circular dots remain 1.8 CSS pixels; sampling, point positions, depth-only occlusion geometry, surface colors, provenance and source artifacts are unchanged.

## Evidence

The first experiment is retained in this directory. The final default was independently exercised in [final-default/checks.json](final-default/checks.json).

| Same camera and candidate | Source colors | Enhanced contrast |
| --- | --- | --- |
| Inferred wall colors, camera index 1 | [Before](final-default/material-camera1-source.png) | [After](final-default/material-camera1-enhanced.png) |
| Provisional completion, camera index 6 | [Before](final-default/completed-camera6-source.png) | [After](final-default/completed-camera6-enhanced.png) |
| Original profile, camera index 0 | [Before](final-default/original-camera0-source.png) | [After](final-default/original-camera0-enhanced.png) |
| Touch-emulated 390px viewport | [Before](final-default/phone-source.png) | [After](final-default/phone-enhanced.png) |

All three VGA candidates—completed, fused and optional wall colors—were checked. For material camera index 1, the frozen sofa rectangle's median non-background-pixel contrast rose from 1.210 to 1.524; the fraction below 1.5:1 fell from 68.49% to 33.28%. Its wall rectangle remained exact (median 2.743). The sampled pixel count in both rectangles was unchanged. These include antialiased pixels, so they are lower than the dot-core luminance-floor contrast.

Visual inspection found clearer dark furniture contours in both VGA views and the original profile, without an apparent bright-wall color change. This is a display preference, not evidence of recovered objects or improved reconstruction accuracy. Dark colors are intentionally lightened; exact original point appearance remains one click away.

## Verification

- `node --test week4/app/tests/point-colors.test.ts`: passed. Input arrays and bright colors remain exact; dark colors reach the bounded floor and retain channel ordering.
- `npm.cmd --prefix week4/app run typecheck`: passed.
- `npm.cmd --prefix week4/app run build`: passed with existing Rust warnings.
- `node week4/app/scripts/verify-point-contrast.mjs docs/design/revisions/arkit-point-contrast-v1`: passed initial experiment, five grouped browser checks.
- Same command with `docs/design/revisions/arkit-point-contrast-v1/final-default`: passed final state, six grouped checks, no page errors.
- Actual surface/provenance framebuffer hashes were identical before and after each candidate's contrast toggle. Returning to Source colors reproduced each point framebuffer exactly. The full benchmark API response digest also remained unchanged.
- Actual W movement, arrow orbit, Home reset, keyboard activation/focus, graphics interruption/reopen, mobile touch controls, reduced-motion setting and no-horizontal-overflow checks passed. The recovered enhanced camera-6 framebuffer matched the pre-interruption framebuffer exactly.
- `git diff --check` for the changed source files: passed.

The harness uses saved real model results through a separate read-only broker. Cloud, completion and Shado runners throw if invoked; all API requests must be GET. No main broker was restarted. Browser evidence is headless Edge with touch emulation, not a physical-phone test. Manual rectangles are not semantic segmentation, and camera-1 ROI names should not be interpreted as object masks for other viewpoints. No depth-buffer readback or geometry-accuracy claim is made.
