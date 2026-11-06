# First-person detective scan with interactive reconstruction — acceptance pending

2026-10-27 · branch `crimescene` · base `0380e13` plus concurrent uncommitted work. Decision: **pending**.

[Review and references](../revisions/crime-scene-arkham-v3/REVIEW.md) · [provenance](../revisions/crime-scene-arkham-v3/provenance.json). Follows the [v2 candidate](crime-scene-arkham-v2.md), whose evidence remains unchanged.

## Evidence

- Offline: app typecheck; full app suite 297/297; 7 cloud-adapter tests; smoke syntax check. See REVIEW.md.
- GPU browser check (L4, $2, plan `4ba0da9c…`): failed once at the first browser assertion (test defect: the first beacon starts behind the viewer). Fixed offline, not re-run; no captures.
- Second GPU check (L4, $2, separately approved): shaders compile; the load, edge arrow, hold-to-scan detection, depth card and hologram animation passed on NVIDIA. It then failed on an ambiguous test locator (fixed offline, not re-run). Later browser steps are unverified.
- Interactive demo (L4, ≤60 min, $3): ran 2026-10-27 from 13:02. The owner exercised it and ended the session; the app was confirmed stopped with 0 tasks. The owner reported having enough evidence to direct fixes; specific feedback has not been recorded yet.

## Owner exercise

In the demo:
1. Look around (drag or arrows) and walk (WASD) from the scanner position.
2. Hold Space or "Hold to scan" on a marker, and also on empty space and the ceiling.
3. Step the timeline with Q/E and follow its beacon.
4. Check the evidence card, Source colours, photos and notes.

Expected:
- A darkened, cool real room.
- An icy hologram condensing over each scanned clue, with particles and floor spill.
- "No evidence" when nothing is aimed at.
- The capture-order timeline moving the beacon.

Actual outcome: pending.

Not covered: physical touch, screen readers, native performance, live provider replies. Holograms highlight points near markers, not segmented objects. The timeline is capture order, not events. No commit, publication or phase advancement.
