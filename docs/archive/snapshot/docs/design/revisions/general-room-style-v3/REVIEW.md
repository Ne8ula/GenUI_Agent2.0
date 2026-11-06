# Shared room rendering and generalization audit

Date: 2026-10-20. Owner acceptance pending. The owner's existing upload/reconstruction Weave waiver covers this bounded pass.

## Scope

Removed the benchmark-only matrix switch from the shared renderer; uploaded candidates now open in Paris matrix points. Face-local provenance survives shared vertices. Uniform samples retain their originating face and use hollow marks for inferred/generated geometry. The benchmark furniture and dimensions are not imported into uploads. The upload text now explicitly states that boundary closure does not complete furniture.

This is **general rendering**, not general object completion. The [implementation boundary and next model route](../../../research/GENERAL_ROOM_COMPLETION.md) specify the missing work.

## Verification

- TypeScript typecheck and production build pass. Existing Rust unused-code warnings remain.
- 268 application tests pass, including new shared-vertex provenance checks across different scales, placements and provenance combinations.
- [Upload browser checks](../general-room-style-v4/checks.json): two invented layouts with different colors and mixed provenance; matrix defaults, uniform switching, deterministic framebuffer restore, keyboard control, representations and A/B/raw controls. API requests are restricted to fixture reads and boundary submission. These screenshots are synthetic UI evidence, not ML output.
- [Saved-room regression](../general-room-style-regression-v2/checks.json): six groups pass, including retained real geometry/colors, source/enhanced point display, matching surface/provenance rasters, camera movement, interruption/reopen and 390px touch-emulated layout.
- [Authored-study regression](../general-room-study-regression-v1/checks.json): nine groups pass, including Paris/default rendering, desk/cabinet views, representation switching, keyboard, context recovery and touch-emulated phone.
- Visually inspected the second synthetic matrix layout and saved study captures. The matrix distinguishes filled and hollow marks while retaining dark negative space; synthetic shapes are deliberately minimal.

Retained failed attempts: `general-room-style-v1` stopped on an obsolete Shado button assertion; v2 used screenshot equality that was affected by page layout/scrolling. The corrected script verifies drawing-buffer hashes at a fixed home camera and passes in v3. Neither failed attempt is reported as a product pass.

Final refinement preserves CSS dot sizes across device pixel ratios. The upload checks pass again in v4 and saved-room/phone checks in regression-v2; the production bundle was rebuilt successfully. The separate all-inferred study uses its unchanged existing point material.

## Limits and owner exercise

No new models or paid runs. No second real room reconstruction, automatic semantic object completion, authenticated Shado run or physical phone validation. Prior benchmark captures provide comparison for the retained study; there is no matching pre-change arbitrary-upload matrix capture. Aesthetic acceptance remains pending.

Open `?scene=upload-room`, inspect a saved job and compare **Paris matrix**, **Uniform dots**, **Surfaces** and **Provenance**. Confirm the appearance independently of whether the underlying candidate's furniture is complete. The latter remains unresolved.
