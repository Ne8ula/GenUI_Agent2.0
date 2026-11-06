# Authored ceiling light demo

2026-10-22 · Owner acceptance pending · baseline c83fd4c plus uncommitted changes.

Owner rejected the depth-relief fixture and expressly requested artistic freedom, a recognizable light and immediate demo without uploads. This is a feedback correction within the existing waived ceiling-repair pass, not a new reconstruction/model trial. No paid calls, publishing or commits.

## Delivered

- `week4/app/src/bedroom/light.ts`: complete native Three.js canopy/stem/ivory dome/brass rim/opal diffuser, 5,999 colored vertices. Authored, not source evidence.
- `renderer.ts` and `ceiling.ts`: reuse display-only replacement and add a bounded authored clearance box to hide intersecting scan shards; original geometry remains intact. Light toggling restores it. Initial camera is inside the room at `[-.15,2.7,.15]`, looking toward `[-.34,3.36,.8]`.
- `BedroomApp.tsx`: automatic opening, Matrix/light defaults, no file inputs. Teddy history and hidden-light choice survive graphics reopen.
- `vite.config.ts`: one exact retained-mesh route and explicit build asset; no directory-wide exposure. SHA-256/size admission remains in renderer. Existing room-workflow proxy retained.
- Browser capture/recovery scripts updated for automatic loading. No dependencies added.

## Evidence

`npm.cmd --prefix week4/app run check`: typecheck, **283/283 tests**, build passed. Existing Rust unused-code and Vite large-chunk warnings remain. Authored clearance regression failed (3 source indices instead of 0) before the fix, then passed.

`node week4/app/scripts/verify-bedroom-ceiling.mjs`: automatic load, no file inputs, keyboard/touch toggle, source-only capture equality, camera continuity, stable toggle geometry count, teddy add/blue/remove/undo, mobile bounds/44px targets and simulated recovery passed with no page errors. Final run 2026-10-22T18:55:11Z. Set `EVA_EVIDENCE_DIR` to a new local directory to retain reruns.

`node week4/app/scripts/verify-bedroom.mjs` and `node week4/app/scripts/verify-bedroom-recovery.mjs`: keyboard/focus, touch drag/pinch, details Escape, wrong-size/hash rejection, cancellation and actual browser `WEBGL_lose_context` recovery passed. These ran immediately before the final clearance change; the focused ceiling browser verifier and full app suite were rerun after it.

Photos: [Matrix](../revisions/teal-bedroom-repair-v1/implementation/authored-light-v2/matrix.png), [surface](../revisions/teal-bedroom-repair-v1/implementation/authored-light-v2/surface.png), [oblique](../revisions/teal-bedroom-repair-v1/implementation/authored-light-v2/oblique.png), [mobile](../revisions/teal-bedroom-repair-v1/implementation/authored-light-v2/mobile.png), [checks](../revisions/teal-bedroom-repair-v1/implementation/authored-light-v2/checks.json). Matrix/surface images visually inspected. Earlier candidate cameras, including one blocked by a wall, remain retained and rejected.

## Exercise / limits

Open `http://127.0.0.1:1440/?scene=teal-bedroom`; no files to choose. Toggle Surfaces/Matrix and Authored light; Reset view returns to the bed for the teddy demonstration.

Surrounding room holes remain; no whole-room ceiling repair. Authored clearance may hide other tiny source fragments within its box while on. No physical-device, native-performance or long-duration GPU measurement. Historical PLY, source and generated images retained. Owner acceptance not yet received; no separate fresh independent review of this rapid correction claimed.
