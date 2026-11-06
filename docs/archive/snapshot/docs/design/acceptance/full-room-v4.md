# Room-wide reconstruction candidate: pending acceptance

Date: 2026-10-20. Scope: complete the room-wide visual demonstration using available source data and explicit inference, integrate it into the viewer, retain original evidence, and verify actual interaction. Owner explicitly waived fresh Figma Weave for this room-completion pass. No additional paid runs or installations occurred.

Tested revision: `full-room-v4`, uncommitted implementation over Git base `70ad76c6888a9bbcc98bea8c2756ed73db0f5132`; [exact source hashes](../../research/hypersim/evidence/full-room-v4/source-hashes.json). Browser mesh SHA-256: `b0db49e5a2198cd887ea6e4182200fe2495d45a8044078dfa9f143a886a46770`.

Expected: navigable colored room with room-wide structural completion, recovered source detail, inspectable inference provenance, preserved openings and a separate original reconstruction. Inspect full-turn views, not only source-camera renders.

Actual: all 100 RGBD views fused; 266,083 inferred architectural faces and 1,095,839 source-recovered detail faces added to the 1,180,653-face all-view TSDF. The source-derived and inferred categories are independently visible in the viewer. Source-visible background openings receive an explicit veto. Mean valid-depth source coverage is 99.9947%, worst view 99.8706%, doorway 99.9480%; mean per-view depth MAE is 3.809 mm. These are conditioning-view consistency measurements, not held-out accuracy.

Evidence: [visual review, before/after and browser tour](../revisions/full-room-v4/REVIEW.md); [method, measurements, alternative attempts and reproduction commands](../../research/hypersim/evidence/full-room-v4/REVIEW.md).

Passed: 51 Python tests; 103 core and 250 app tests; typechecks; production build; 16 development browser checks; original-route regression; production catalog size/hash checks and actual rendering. The first sandboxed build hit a directory-access restriction; the approved local rerun exited 0. Desktop/headless Edge and emulated touch only; no native or physical-phone claim.

Limits: inferred rectangles/materials are plausible hypotheses; hidden object geometry is not established. Color seams and fine-boundary artifacts remain. Source recovery increases foreground conflicts over the TSDF baseline. Exterior scenery is absent. Unwelded/overlapping patches are not a watertight solid. All four formerly withheld cameras condition this separate demonstration; r03 evaluation is preserved unchanged.

Owner exercise: open the default room, inspect frame 0037, make a full turn, inspect the adjoining ceiling, compare provenance and source views, and open the original 96-view route.

Feedback/blockers: prior generated-image attempts were visually rejected; this pass avoids those outputs. Full memory-palace conversation and editable object-linked memories remain outside this reconstruction pass.

**Decision: pending owner acceptance.** Implementation/test completion does not accept the research, full product or any study milestone.
