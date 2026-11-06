# Scene-first isometric refinement

Date: 2026-10-24. Decision: **pending owner acceptance**. Branch `crimescene`; base `0380e13` plus uncommitted work. Exact tested file hashes and aggregate revision: [verification](../revisions/crime-scene-isometric-v1/implementation/verification.json).

## Scope and feedback

Owner: “Too many UI. Try to make the UI more intuitive.” They accepted a scene-first layout and requested an isometric feel so enclosing walls do not obscure the room. Implemented: Clues/Notes on demand, one supporting panel, compact inspector, elevated orthographic camera and reversible display-only cutaway. Source/crop/provisional identities, actual source photos, notes/undo, consent and cancellation remain intact. No pass-2 capability added.

The separate fresh Weave still was approved at 3.5 credits (maximum 4, one attempt, no retries), generated and inspected before UI edits. That allowance is consumed. [Reference, decisions, captures and limitations](../revisions/crime-scene-isometric-v1/REVIEW.md).

## Reproduction and actual results

Within the owner-approved single local verification session: `npm.cmd run dev`, then `node week4/app/scripts/crime-scene-smoke.mjs`. The smoke owns a disposable key-disabled broker on 1442; do not start `room:service` alongside it. It uses synthetic notes and mocked reply routes, not the private notebook store or a live provider. Session servers are now stopped; ports 1440/1442 were checked clear. Another local restart is not authorized by this record.

Expected and observed: clean overview; Full scan changes visible geometry and returns exactly without refetch; W/Home zoom/reset; keyboard movement cancels dwell; panel switching preserves drafts and selected clue; photo close restores focus; save/reload/undo works; pause/reopen/return restores camera and zoom; loading and reply cancellation work; reduced motion stays static; emulated touch fits without horizontal overflow. Browser smoke passed with no page errors. Blank initial clue thumbnails were a screenshot-readiness issue: final capture waits for visible source images.

- `npm.cmd run check`: typechecks/build, 103 core tests and 290 app tests passed. Existing Rust unused-code and bundle-size warnings remain.
- `npm.cmd run room:test`: 163 passed, 2 existing environment-dependent skips, no failures.
- `python -I -m unittest discover -s scripts/room_workflow -p 'test_ffs*.py'`: 6 passed.
- Smoke syntax and whitespace checks passed. All nine final captures visually inspected; previous source and candidates retained.

## Limits, next exercise and decision

The cutaway is fixed coordinate clipping, not detected walls. It can hide non-wall points; rotating can reintroduce occlusion. Full scan restores only the retained crop, not the entire uncropped source. The source remains incomplete and mobile geometry is small. Marker numbering is provisional; unknowns stay unknown. Instructor-applied reddish traces are not blood evidence.

Next owner exercise: compare the overview with Full scan, open Clues and a source photo, write a draft, switch panels, and Return/Reset. Assess whether primary actions and room layout are clearer. Record feedback against the linked fingerprint before acceptance.

Not checked: physical touch/screen reader, native Tauri, peak performance, live-provider quality or forensic validity. Two broker tests skipped actual owned-process termination and CPU-adapter integration. No renewed spending, generation, GPU work, source downloads, commit or publication is authorized. No acceptance date or approval is inferred from passing tests.
