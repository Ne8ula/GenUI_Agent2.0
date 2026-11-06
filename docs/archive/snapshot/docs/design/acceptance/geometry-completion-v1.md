# Geometry-first floor repair: pending owner acceptance

Date: 2026-10-20. Scope: local alternatives to the failed GenRC/Weave floor edit. User requested continued implementation and different approaches. No paid run, new installation, UI edit or phase acceptance is implied.

Tested source revision: dirty shared checkout, with exact script hash and source/candidate hashes in the [report](../../research/hypersim/evidence/geometry-completion-v1/report.json). Recommended mesh SHA-256: `b1ba54d0640de0210dedfd298fe63c263931f6d8da284ac20dbd8f6e500f2552`. Original r03 assets and all preceding candidates are retained.

Expected: repair the 9,409-pixel floor gap with fixed camera/metric depth, preserve original mesh arrays and protected target RGB, reject training free-space contradictions, and inspect nearby views.

Actual: all 9,409 repaired, original arrays and known target RGB unchanged, no >2 cm known-surface occlusion, no training-depth rejections. Post-freeze held-out depth MAE 0.874 mm, p95 1.698 mm. Target and +/-10 cm lateral renders inspected. Narrow two-pixel overlap improves the seam. 42 local tests passed.

[Images, reproduction commands and alternatives](../../research/hypersim/evidence/geometry-completion-v1/REVIEW.md).

Limitations: only 62.61% central-crop coverage overall; floor appearance remains softly inferred. Whole-room and hidden-object completion remain unresolved. Broad floor extension was explicitly rejected after high held-out error despite higher coverage. No browser integration, interactive acceptance, motion/accessibility validation or Weave depth-node execution is claimed.

Owner exercise: compare the before/after floor, orange inferred region and nearby views; assess seam continuity and whether the inferred material is acceptable. Decision: **pending**. The subsequently approved 8-credit single-target appearance-only Weave test [failed its raw-image gate](weave-room-v2.md); this geometry candidate remains unchanged.
