# Teal bedroom teddy acceptance

2026-10-22 · **Pending owner acceptance** · baseline c83fd4c plus uncommitted work; tested fingerprints in [provenance](../revisions/teal-bedroom-teddy-v1/provenance.json).

## Scope / result

Owner requested a more realistic authored teddy for the visual demo, also rendered in Matrix like the room. Approved native plush refinement and a new teddy-scoped allowance of up to 8 credits from the remaining 92, then approved the exact 8-credit Weave quote. One reference completed and was inspected before edits; this pass cost 8 credits, cumulative 16 of 100, 84 uncommitted. No further generation, download, cloud compute, commit or publication.

Implemented softer stuffed proportions, fabric bump/pile, inset facial features, stitched details and seated paw pads. Surfaces shows those materials; Matrix shows 7,580 surface-sampled points with depth-only geometry, retaining anchor, recolour, removal, undo and camera continuity. The source scan and room geometry are unchanged by this pass. This is artistic authored geometry, not recovered source evidence.

## Reproduction / evidence

1. Existing preview: `http://127.0.0.1:1440/?scene=teal-bedroom`. Reset view → Add teddy → Surfaces/Matrix → Make it blue → Remove teddy → Undo.
2. Expected/observed: no solid teddy in Matrix, matching pose, blue fur in both modes, stable camera/anchor/history and no geometry growth after repeated switches. Browser checks passed.
3. `node --test week4/app/tests/bedroom-memory.test.ts`: two new failures first observed, then 7/7 passed.
4. `npm.cmd --prefix week4/app run check`: 287/287 tests, typecheck and build passed; existing Rust unused-code and Vite chunk warnings remain.
5. `node week4/app/scripts/verify-bedroom.mjs`: actual render counts, keyboard/touch/reduced motion, mobile bounds, camera continuity and resource reuse passed.
6. `node week4/app/scripts/verify-bedroom-recovery.mjs`: size/hash rejection, cancel/reopen, actual browser graphics loss, memory/history restoration and no external runtime requests/uploads passed.

[Full review / commands / checks](../revisions/teal-bedroom-teddy-v1/REVIEW.md) · [Surface photo](../revisions/teal-bedroom-teddy-v1/implementation/after/surface.png) · [Matrix photo](../revisions/teal-bedroom-teddy-v1/implementation/after/matrix.png) · [Blue Matrix](../revisions/teal-bedroom-teddy-v1/implementation/after/matrix-blue.png).

## Limits / decision

Procedural plush approximation, not photorealistic groomed fur. Deferred minor seam offsets can be visible in close side views. No physical-device/native-performance/long-duration GPU test. Separate room-completion density review remains outside this pass. Independent read-only Opus review found no blocker; actual browser evidence was produced by the lead.

Owner feedback on implemented candidate: not yet received. Decision/date: **pending**. No phase advancement inferred.
