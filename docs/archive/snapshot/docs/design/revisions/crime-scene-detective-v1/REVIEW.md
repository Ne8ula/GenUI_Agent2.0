# Room detail and detective view

2026-10-26. Status: implementation candidate present; final regression and browser verification incomplete; owner acceptance pending. `crimescene`, base `0380e13` plus concurrent work. Baseline fingerprint `702056d2eede779c174b0695269b2958a77f70e40000e6574c25da89b54a89e5`.

## Approved scope

Owner rejected the indistinct dotted room, approved explicitly labelled photo-guided approximation and requested an Arkham-inspired detective shader without edge-breaking dithering. Preserve scene-first controls, raw scan, crop and provisional/unlocated/unknown marker identities. No new animation, forensic inference, pass-2 capability, provider replies, GPU work or dependencies.

The owner separately approved one text-only Weave still (maximum four credits, one attempt/no retries), exact 3.5-credit quote, and one bounded local verification session with a memory check and stop/no restart on renewed allocation failure. No private-photo uploads, publication or commits.

## Fresh reference

[Image](references/images/room-detective.png) · [contact sheet](references/contact-sheet.png) · [provenance](provenance.json).

Official Figma MCP, Nano Banana 2.1, prediction `d3dc318e-5f69-4bf2-9e3f-c01ae949154e`, 3.5 workspace Weave credits, completed. Lead inspected actual 1376×768 PNG before implementation edits. Still only: static material/geometry changes and direct existing camera interaction, no temporal scan effect.

Keep: continuous shaded object surfaces, contrasting floor/rug/furniture, thin cool contour edges, restrained warm selected-object highlight, elevated open-corner overview. Reject: generated placement, duplicate chairs/tables, invented marks, generated typography and presumed measurements. Reference is illustrative design guidance, never source geometry.

Inspected retained local panorama and source photos: grey armless sofa with separate cushion; overturned tubular-frame chair; wood floor and bordered rug; narrow dark drawer unit; upright pale chair; round side table. Local source assets remain local. Approximate shapes, placements and extents must be labelled authored/photo-guided, not detected or reconstructed. Existing marker centroids refer to coloured tags, not object centres; do not invent placements for unlocated tags.

## Implementation and evidence

Previous matching captures, application sources and verification are preserved under `implementation/before/`. No current implementation capture exists: `implementation/after/` remains empty, not evidence of a visual pass.

- Added `illustration.ts`: separate authored floor/planks, rug, sofa/cushion, upright and overturned chairs, bottles, cabinet, side table and low enclosing boundaries. Installed Three primitives and RoundedBoxGeometry are reused. Photo filenames and approximation provenance accompany surfaces; object sizes, placement and missing surfaces are estimates, not registered geometry.
- `renderer.ts` keeps hash-verified original points separate and toggles visibility/materials without replacing geometry or camera state. Continuous surfaces, cool feature edges and warm linked-object highlights replace Bayer dithering on this route only. Other room routes are untouched.
- `CrimeSceneApp.tsx` labels approximation and offers Detective view / Original scan inside existing View controls. Authored close-ups do not mark evidence examined; source photos and original-scan dwell retain that role. Source/crop/marker identities and notebook code remain unchanged.
- Added two geometry/provenance/style/disposal tests (observed fail before implementation, then pass). Independent `eva-researcher` read-only source audit informed conservative anchors; no claim of measured furniture geometry.
- Independent `eva-reviewer` read-only review identified initial presentation synchronization and misleading overlay-sensitive smoke comparisons. Initial controls now apply before loading; both component-effect regression cases failed before the fix and passed after it. This harness exercises the real transpiled effect with mocked hooks/renderer, not React scheduling or WebGL. Smoke canvas comparisons now temporarily hide overlays rather than counting caption changes. Shader-related console errors are collected. Updated smoke has not run.

### Actual checks and stop condition — 2026-10-26

1. Before the final review fix: `npm.cmd run check` passed, 103 core + 292 app tests, typechecks and production build. Existing Rust unused-code and Vite large-chunk warnings remain.
2. After the initialization fix: `node --test week4/app/tests/crime-scene-initialization.test.ts` passed 2/2.
3. Final sequential command began with `npm.cmd run check` but exited 1; returned output was truncated before a diagnostic/summary. Cause is unresolved, not established as allocation failure. The gated `room:test`, Python FFS and build completion are not claimed for this final attempt.
4. Standalone `node --check week4/app/scripts/crime-scene-smoke.mjs` and `git diff --check` passed; line-ending notices only.
5. Free physical memory declined from 2,575,196 KiB at the browser hold to 1,711,576 KiB after the failed final command (free virtual 12,426,172 KiB). These are point observations, not peak measurements. No browser/dev server was started for this pass; no automatic restart or further heavy retry followed.

Next verification needs safe headroom, a retained full log of final offline checks, then the bounded dev/smoke exercise using its disposable key-disabled broker only. Do not run `room:service` alongside the smoke or use the real notebook store. Inspect matching source/illustration/detective captures, selected edges, cutaway, camera/panel/notebook continuity, interruption, keyboard/focus, reduced effects and emulated touch. Actual GLSL compilation and visual readability are unverified. Native, physical-touch, screen-reader, peak-performance and live-provider checks remain not run. Owner acceptance stays pending; no commit or publication.
