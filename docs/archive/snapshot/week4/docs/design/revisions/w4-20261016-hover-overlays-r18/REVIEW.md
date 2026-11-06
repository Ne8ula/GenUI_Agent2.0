# R18: hover information and right-side bounds

**Owner accepted this bounded refinement on 2026-10-16.** Feedback: ?Perfect. Commit and push to Week 4 branch.? Prior accepted baseline: none; prior candidate: R17. Source was `565b5ad` plus R17/R18 working changes. This is retained historical evidence, not a new midterm result.

- [Quiet scene](implementation/after/check-03/settled-qhd.png) ? [sign hover](implementation/after/check-03/hover-stop-sign-qhd.png) ? [before](implementation/before/settled-qhd.png).
- [Upper window](implementation/after/check-03/hover-upper-window-qhd.png) ? [doorway](implementation/after/check-03/hover-right-doorway-qhd.png) ? [shopfront](implementation/after/check-03/hover-shopfront-board-qhd.png) ? [narrow focus](implementation/after/check-03/focus-stop-sign-390.png).
- [9.68-second recording](implementation/after/check-03/hover-focus-interactions.webm) ? [temporal samples](implementation/after/check-03/interaction-samples.png).
- [Final browser checks](implementation/after/check-03/checks.json) ? [source/build fingerprints](implementation/source-manifest.json) ? [provenance](provenance.json) ? [acceptance/exercise](../../acceptance/w4-hover-overlays-r18.md).
- [Owner reference contact sheet](../w4-20261015-archive-tracking-r17/references/contact-sheet.png).

## Scope and historical verification

Replace always-visible information with hover/focus/touch detail; add stationary right-side targets while preserving the scene. Eight thin authored rectangles remain visible. No detector, exact historical object match or new generation is implied. The owner explicitly permitted reference reuse for this pass only.

Recorded final checks: 250 app tests, typecheck/build and 99 browser assertions passed. These covered hover, transparent interiors, keyboard/Escape/reopen, local source links, touch, 2560/1024/390-width layouts, reduced motion and cleanup/failure paths. Thirty [discovery checks](implementation/after/discovery-regression/checks.json) passed on the preceding description-placement candidate; do not relabel them as a final-candidate rerun.

Before/after used QHD/DPR 1 at construction 30 seconds / idle 0. Historical review inspected quiet, sign and narrow states and sampled the recording. This was browser evidence, not native desktop, real-time performance, real detection or reconstruction.

Configured main was Astra in Claude Code; a Terra-configured native researcher read references. Transport attribution was not independently audited. Full original report and intermediate failures/captures are recoverable from the pre-cleanup commit.

## Cleanup note ? 2026-10-18

The owner authorized historical reduction. This summary retains final evidence, original provenance/source manifest and the acceptance record. Intermediate check-01/check-02 captures, duplicate raw recordings, copied before-source files and full R17 packet moved out of the checkout into [Git history](../../../../../docs/HISTORY.md). Earlier fixes (missing JSX tag, hover fill, description overlap) remain documented in that original report. No new acceptance or application verification is asserted by this condensation.
