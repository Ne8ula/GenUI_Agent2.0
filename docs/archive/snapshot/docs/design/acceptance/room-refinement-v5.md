# Room refinement v5: pending owner acceptance

Date: 2026-10-20. Feedback: simplify the dense dots and fill the empty space between walls. Scope: refine the existing room-completion pass; its explicit Weave waiver remains applicable. No new paid activity.

Expected: clearly separated points, real depth behind the three source-background openings, preserved existing geometry and camera context, and inspectable assumptions.

Actual: a 6 cm voxel selection displays 108,923 round dots, including assumed space, versus the previous 1,613,659 vertices. Surface detail is retained. An east room/return and two alcoves fill the openings with authored geometry. Lavender provenance and a keyboard/touch-accessible checkbox expose the assumptions. Disabling it restores the original v4 triangle range without moving the camera.

Tested browser mesh: `ad73b2b5087fc37de1e1c5a9363531706946ca4a50fb252a4caa660ec0319f79`. [Exact source hashes](../../research/hypersim/evidence/room-refinement-v5/source-hashes.json). No commit or publication.

Passed: 53 Python tests; 103 core and 253 app tests; typechecks/build; 19 browser checks; original-route regression; production file verification. The independent all-100-view full-resolution audit found exact v4 array preservation and zero newly assumed faces violating the stated existing-hit/source-depth tolerances. All four portal centerlines remain clear.

[Matching screenshots, reproduction and evidence](../revisions/room-refinement-v5/REVIEW.md).

Limitations: adjoining layout/materials are authored guesses, not recovered source geometry. Background coverage of 99.8487% is not accuracy. Existing seams and small gaps remain. Headless desktop and emulated phone checks only; no watertight-solid or wall-collision claim.

Owner exercise: compare Points around the blue room, turn toward the previously white gap, walk into the added space, and hide/show assumed adjoining spaces in Sources & details.

**Decision: pending owner acceptance.** This does not advance a research, native-product or study milestone.
