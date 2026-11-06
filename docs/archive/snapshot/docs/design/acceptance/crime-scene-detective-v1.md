# Room detail and detective treatment — acceptance pending

2026-10-26 · branch `crimescene` · base `0380e13` plus concurrent uncommitted work. Decision: **pending**, not ready for visual acceptance.

## Scope and owner feedback

Owner rejected the indistinct dotted room and approved labelled photo-guided approximation with an Arkham-inspired detective treatment rather than edge-breaking dithering. The candidate adds recognizable authored room parts, continuous shading, cool contour edges and warm linked-clue highlights. Original source scan, crop, provisional identities and unknown/unlocated markers are retained. This is not measured furniture reconstruction or forensic analysis.

[Reference, review and actual checks](../revisions/crime-scene-detective-v1/REVIEW.md) · [provenance](../revisions/crime-scene-detective-v1/provenance.json) · [candidate fingerprint/check manifest](../revisions/crime-scene-detective-v1/implementation/verification.json).

## Evidence and blockers

- Fresh text-only Weave still generated once and inspected before UI edits, consuming the separately approved 3.5 credits. No private uploads or further paid run.
- Pre-review-fix full check passed 103 core + 292 app tests, typechecks and build. Two initialization regression cases then failed before correction and passed after it.
- Final full-check attempt exited 1; output truncated before diagnostic/summary. Cause unresolved. Subsequent gated broker/FFS checks did not run. Syntax and whitespace checks passed separately.
- Browser launch held as physical memory fell to 2.5 GiB, then approximately 1.6 GiB. No current browser run, GLSL compilation observation or after captures. No session-owned dev server was started or restarted.
- Independent source audit and code review ran read-only. Review fixes address initial presentation state and overlay-sensitive smoke comparisons; browser behavior remains unverified.

## Cloud continuation — 2026-10-26

Owner approved one L4/16 GiB/10-minute Modal verification with a $2 operational allowance and required app/scene transfer, no retries. The initial tool invocation was blocked as a data-transfer action. After explicit owner continuation, the exact command executed but failed locally before cloud submission: Modal SDK 1.6.1 rejects a `retries` argument on generator functions, even zero. The failed receipt is retained with `app_id: null`; no upload, cloud job or capture resulted.

An offline real-SDK regression reproduced the error, then passed after removing the unsupported argument. Post-fix verification: **4 Python tests and 8 focused scene tests passed**, no skips; smoke syntax and whitespace checks passed. No browser or remote function ran. The frozen plan/receipt remain unchanged, and the corrected adapter no longer matches the frozen plan hash binding. Another submission requires explicit bounded owner authorization and a separate plan/receipt; none was attempted automatically. [Exact plan, failure and offline evidence](../revisions/crime-scene-detective-v1/CLOUD.md). The earlier candidate manifest remains a pre-cloud-tooling snapshot; GPU/browser fidelity and the final full-suite result remain unverified.

## Reproducible owner exercise after verification is unblocked

First obtain a complete final offline log (`npm.cmd run check`, `npm.cmd run room:test`, the FFS Python tests). With safe memory and a bounded local verification decision, run the existing dev app and `node week4/app/scripts/crime-scene-smoke.mjs`. The script owns its disposable key-disabled broker: do not run `room:service` alongside it. Do not use a real notebook store or live provider.

Expected: distinct floor/rug/sofa/chairs/cabinet; thin readable detective edges without dithering; source scan separately recoverable without camera reset/reload; approximation close-ups never mark evidence examined; source photos/original close-ups can. Check cutaway, selected highlights, camera return, panels, notebook drafts, cancellation, keyboard/focus, reduced effects and emulated touch; inspect and retain matching captures. Actual outcome: pending.

Native, physical-touch, screen-reader, performance and live-provider checks are not run. Approximation dimensions/placement remain authored estimates; visual readability and final regression health are not accepted. No commit, publication or phase advancement.
