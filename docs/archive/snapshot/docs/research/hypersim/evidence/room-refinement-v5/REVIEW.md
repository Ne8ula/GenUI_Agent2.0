# v5: assumed adjoining space and simplified display

2026-10-20. [Full before/after review, implementation and reproduction](../../../../design/revisions/room-refinement-v5/REVIEW.md).

This candidate preserves every v4 vertex, face and color, then adds 72,044 explicitly assumed faces behind the east, west and south background openings. Their layout and materials are authored hypotheses. This intentionally changes v4's empty-background policy in response to owner feedback; it does not reclassify those pixels as source-derived geometry.

The [independent audit](audit.json) covers all 100 full-resolution source cameras. No newly assumed surface moves a v4 hit forward by more than 5 mm or violates source depth by more than 20 mm. The three strict raycast differences belong to unchanged original triangles near shared edges and are documented. Source-background coverage is 99.8487%; finite-depth source consistency remains a conditioning-view measurement.

[Specification and iterative rejection log](assumed-space.json), [identical-mesh reproduction](reproduction.json), [report](report.json), [consistency](consistency.json), [asset manifest](scene.json), [source hashes](source-hashes.json). The frontend point display is a separate 6 cm spatial selection, leaving the full surface mesh intact. Acceptance is pending.
