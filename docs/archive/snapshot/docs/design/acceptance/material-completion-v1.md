# Independent material adapter: pending acceptance

Date: 2026-10-20. Owner requested creation and implementation of the fix after two rejected Weave room edits. Scope: local material preparation and appearance application on the fixed repaired floor. No paid run or frontend integration.

Tested candidate SHA-256: `fe0eeafff8f9def467bb7f2044fc8df0b3d9617c636c7a1f4cb561d01f562a49`. Exact builder hash, material/source hashes, parameters and input geometry hash are recorded in the [report](../../research/hypersim/evidence/material-completion-v1/report.json).

Expected: a separate material asset drives surface appearance; camera and geometry stay fixed; overlap/observed colors remain unchanged; source visibility and provenance are checked; nearby views stay spatially coherent.

Actual: depth-verified 40 cm material tile from training frame 0005 applied using world XY UV and bounded detail transfer. All vertices/faces and all original vertex colors remain unchanged after export/reload. Zero protected target pixels changed. Depth renders match exactly at the target and +/-10 cm camera offsets. All three appearance renders and the source tile were inspected. Forty-seven tests passed.

[Visual comparisons, commands and limitations](../../research/hypersim/evidence/material-completion-v1/REVIEW.md).

Limitations: material reuse is inferred; repeated/mirrored patterns and blend quality need visual judgment. Only the repaired floor patch changed appearance. Overall room coverage remains incomplete. No generated-material run/import, native texture renderer, browser integration or full-room completion is claimed.

Owner exercise: compare the floor grain and seam in the target and two nearby views. Decision: **pending owner acceptance**. The original reconstruction, previous repaired floor and rejected Weave outputs remain available.
