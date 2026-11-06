# Arkham-inspired measured scan and photo-depth intro — acceptance pending

2026-10-27 · branch `crimescene` · base `0380e13` plus concurrent uncommitted work. Decision: **pending**.

[Review and references](../revisions/crime-scene-arkham-v2/REVIEW.md) · [provenance](../revisions/crime-scene-arkham-v2/provenance.json). Supersedes the [authored-approximation candidate](crime-scene-detective-v1.md), whose failed v1 cloud receipt remains preserved.

## Evidence

- Offline only: focused app tests, typecheck, adapter tests with real Modal SDK construction, script syntax. See REVIEW.md.
- Depth maps (L4, $1): returned, 13 pairs, registered.
- GPU browser check (L4, $2): failed once on a test defect after the intro, detective view and presentation checks passed on NVIDIA WebGL. Fixed offline, not re-run; later browser steps are unverified.
- Interactive demo (L4, ≤60 min, $3): pending, plan `24cd5655…`.

## Owner exercise

Open the demo link and password printed by the demo command. Watch the intro (press F5 in the stream to replay it), use Skip intro, then orbit, zoom, cutaway, clues, Source colours, photos and notes. Expected: real photos scanned, traced and overlaid with depth, then dispersing as the measured room assembles floor-up; detective view as cyan grid, outlines and moving scan lines; amber only on the selected marker. Actual outcome: pending.

Not covered: physical touch, screen readers, native performance, live provider replies. Photo depth is relative and unaligned. The room is the measured single-position scan with its original gaps. No commit, publication or phase advancement.
