# Teal bedroom completion acceptance

2026-10-22 · **Pending owner acceptance** · baseline c83fd4c plus uncommitted work; tested source SHA-256 fingerprints in the [provenance manifest](../revisions/teal-bedroom-completion-v1/provenance.json).

## Requested / delivered

Owner asked to extend the authored ceiling-light treatment to the remaining black gaps, keeping the immediately opening visual demo and no file uploads. Native room-specific architecture and backing solids now fill missing surfaces behind the supplied scan, with distinct window/door panels and an Authored room toggle. Original source bytes/geometry and the teddy interaction remain unchanged. This is artistic completion, not a new reconstruction.

Fresh official Weave run completed and was inspected before implementation. Owner approved a new 100-credit limit and the exact first 8-credit run. Reported spend: **8 credits**, **92 uncommitted**. No Modal computation, new model downloads, commits or publication.

## Scenario / evidence

1. `npm.cmd run dev` (existing loopback preview, not restarted); open `http://127.0.0.1:1440/?scene=teal-bedroom`.
2. Expected: automatic source admission, completed ceiling, no upload input. Observed in actual browser.
3. Select Reset view, Surfaces/Matrix, Authored room, Ceiling light; add/recolour/remove/undo teddy. Expected: camera and memory continuity, original comparison. Passed.
4. Wrong-size/hash assets, cancellation and browser WebGL context loss must fail safely and reopen with memory/history. Passed via `verify-bedroom-recovery.mjs`; no external runtime requests or uploads observed.
5. `node week4/app/scripts/verify-bedroom-completion.mjs`: all three checked views exceeded 99.6% source-background fill; supported bed/side interior pixel changes below 0.5%. Initial overlapping candidate failed at 28% source-detail changes; retained and corrected using stencil-limited completion. No exhaustive all-angle or reconstruction accuracy claim.
6. `npm.cmd --prefix week4/app run check`: **285 tests passed**, typecheck/build passed. Existing Rust unused-code and Vite chunk warnings remain.

[Full review and reproducible commands](../revisions/teal-bedroom-completion-v1/REVIEW.md) · [Room photo](../revisions/teal-bedroom-completion-v1/implementation/after/views/bed.png) · [Ceiling photo](../revisions/teal-bedroom-completion-v1/implementation/after/views/ceiling.png) · [Matrix](../revisions/teal-bedroom-completion-v1/implementation/after/matrix.png).

## Limitations / decision

Authored placements, hidden surfaces and physical scale are unverified. Missing-pixel stencil protects source-supported appearance but cannot make approximated geometry metrically correct. Material seams, scan fragments and photographed dark objects remain. Matrix intentionally has dark space between marks. Existing orbit controls can cross walls; no new collision system. Physical devices, native performance and long-duration GPU behavior were not checked.

Owner feedback on this revision: not yet received. Decision/date: **pending**, no phase advancement inferred.
