# Hypersim room demo r03: browser review

Decision: **pending owner acceptance**, 2026-10-19. Reconstruction-first visual demo implemented and browser verified.

## Scope and reproducible revision

Owner requested continuing through a visual room demo. This intermediate revision expands supplied-depth/supplied-camera TSDF integration from 20 to 96 frames. Base commit `70ad76c6888a9bbcc98bea8c2756ed73db0f5132` plus the working changes to `hypersim.py`, its tests and the r03 fixture; the run report pins script and input-manifest SHA-256 hashes. The existing frame-0037 audit and r02 evidence are retained.

Run the commands in the [dataset guide](../../research/hypersim/README.md#expanded-development-reconstruction-2026-10-19). Expected: retain evaluation frames 12/37/62/87, bounded downloads, new mesh without overwriting previous output, all four views scored including missing geometry.

## Actual evidence

- [Report](../../research/hypersim/evidence/r03/report.json): complete CPU reconstruction, 312,015 vertices / 606,025 triangles.
- [Comparison](../../research/hypersim/evidence/r03/evaluation.png): visually inspected all four source/mesh/error rows. Cabinet-facing views improve; doorway still has substantial missing surfaces.
- [Tests](../../research/hypersim/evidence/r03/tests.txt): 18 passed, including analytic geometry, actual TSDF plane, resource/cancellation checks, preservation and exclusion of evaluation frames.
- [Input provenance](../../research/hypersim/evidence/r03/input-manifest.json): 274,821,140 additional HTTP bytes; separately records reused original fetch of 90,173,383 bytes.

Frame 0037 coverage rises from 15.72% to 56.37%; mean depth error on hits falls from 513.14 mm to 96.33 mm. Only 38.74% of its valid pixels are reconstructed within 5 cm. The other three views have greater than 99.95% coverage. These are same-renderer development checks after inspecting prior failures, not untouched evaluation or physical accuracy validation.

## Remaining and owner exercise

The owner chose reconstruction-first and explicitly waived Weave for this first room-demo pass on 2026-10-19. The [review packet](../revisions/room-r03/REVIEW.md) contains implementation hashes, inspected desktop/phone captures, production verification and actual check results. `npm.cmd run check` passed (103 foundation + 250 application tests, type checks, production build); 14 browser scenarios passed, including keyboard/mouse/touch emulation, source continuity and focus, reduced effects, cancellation and recovery. Earlier failing evidence is retained. No physical phone or native Tauri run was performed. No object-memory journal, voice, photo-only reconstruction or full-room completion is claimed.

Owner exercise: open `http://127.0.0.1:1440/`, explore the cabinet area and doorway, inspect their source views, reset the camera, switch representation and report whether the room is useful despite the documented gaps. Record that decision here against the final tested visual revision; silence and passing tests do not accept the milestone.
