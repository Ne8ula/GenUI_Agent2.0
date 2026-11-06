# R18 hover information and right-side bounds

Date: 2026-10-16. Status: **owner accepted the bounded R18 refinement**. Prior accepted baseline: none. This acceptance covers the tested R18 hover/overlay revision only; it does not accept Week 4 Steps 1–6 or any research phase.

## Requested change and authority

Reveal object information on hover rather than constantly; add rectangles around the sign and other right-side objects. The owner explicitly approved **Reuse existing references (Recommended)** for this bounded adjustment without fresh generation. No generation spend or new runtime capability.

Source HEAD `565b5ad` plus uncommitted R17/R18 work. [Review and source evidence](../revisions/w4-20261016-hover-overlays-r18/REVIEW.md).

## Owner exercise

Open `http://127.0.0.1:1467/?scene=paris-arrival` (preview: `npm --prefix week4/app run preview -- --port 1467`). Reload an already open tab to receive the rebuilt bundle. Submit the default request or type `skip`.

- Settled: eight thin rectangles, four on each side. No unsolicited titles, descriptions or photo insets.
- Hover the sign, upper window, dark doorway and shopfront board on the right. Each reveals only its own title, illustrative description and available contextual photo. The rectangle interior stays transparent.
- Hover the photo, follow its source/credit link, or move away to clear hover information. Clicking/focusing an object retains it while that object has focus; click the prompt or press Escape to dismiss.
- Tab through the object targets and their contextual links. Escape from a photo should return focus to its object without reopening the information. Enter reopens it.
- On narrow/touch view, tap a rectangle; tap the prompt to dismiss. The prompt remains usable. Reduced motion does not auto-open information.
- `return` and `photos` remove every object hit region and stale detail. `skip` brings back quiet rectangles.

## Evidence and limitations

Initial app check: corrected one missing JSX closing tag; rerun passed 250 tests and typecheck/build. Initial browser checks passed, but screenshot inspection caught an inherited global button-hover fill covering the selected object. A local transparent-hover override and a browser regression assertion were added. Initial captures are recoverable from the pre-cleanup commit documented in the review. Final verification: **250 app tests, typecheck/build and 99 overlay browser checks passed**; **30 discovery regression checks passed** before the final description-placement-only correction. QHD/narrow captures, a 9.68-second interaction recording and source/build hashes are linked from the review. The sign's description/photo overlap was corrected and all 24 object/viewport non-overlap assertions pass.

Browser-only authored 2.5D fixture, not native desktop or real object detection/reconstruction. The sign's small markings are unresolved, so its description says “Street sign” rather than asserting a historical traffic-sign identity. Context photographs are not exact matches. No provider/generation requests at runtime; existing archival credits preserved.

## Owner decision

**Accepted by the owner on 2026-10-16**, against the R18 check-03 candidate and its source/build fingerprint manifest. Owner response: “Perfect. Commit and push to Week 4 branch.” This accepts the bounded hover-information/right-side-overlay refinement, not historical rejected candidates, broader Week 4 steps or any new phase. The owner subsequently selected **Week 4 only (Recommended)** as the commit scope; separate Track C research/planning remains uncommitted.
