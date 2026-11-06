# Scene-first cutaway

Status: implemented and locally verified; owner acceptance pending. Branch `crimescene`, base `0380e13` plus retained uncommitted pass 1.

## Approved scope

Owner accepted a scene-first UI with Clues/Notes, a compact selected-marker inspector, one panel at a time, Details for secondary information and View controls for navigation/pause. Owner additionally requested an isometric feel because four enclosing walls obscure the room. Use an elevated three-quarter orthographic view and reversible display-only cutaway; keep Full scan available. Do not change source files, provisional marker identities or the retained crop. No pass-2 features, new animations, dependencies or live model replies.

One text-only 1K Weave still approved with maximum four credits/no retries; exact 3.5-credit quote approved separately. One bounded local verification session approved; check memory first and stop on recurring memory pressure, with no automatic restart.

## Fresh reference and inspection

[Reference](references/images/scene-first-cutaway.png) · [single-image contact sheet](references/contact-sheet.png) · [provenance](provenance.json)

Official Figma MCP direct Nano Banana 2.1 run `13c0eb6e-36aa-452d-a0eb-576436039a0b`, completed, 3.5 Weave credits. Lead visually inspected the returned 1376×768 image before UI edits.

Keep: elevated open-corner room composition, negative space, two main header actions, contextual inspector and discreet view controls. Retain visible staged-scene/cutaway/provisional-identity labels and actual API consent.

Reject: invented room/furniture, duplicate/arbitrary marker IDs, generated brand typography and implied geometric certainty. The reference is not th_0028 or source evidence. No new animation or motion choreography; existing direct camera interactions remain, so this reference pass is still-only.

## Implementation and verification

The room now fills the workspace with Clues/Notes closed by default. One supporting panel opens at a time; the existing mounted Notebook preserves drafts and undo. Selection returns when that panel closes. The compact inspector exposes the source photo; coordinates/provenance and view controls remain available on demand.

The orthographic camera starts at equal +X/-Y/+Z offsets. Zoom is included in saved/return camera poses. A shader attribute/uniform hides only display points: bottom 30% of crop height remains visible; above it the near +X/-Y quarter-width bands and points above 60% height are hidden. Full scan bypasses this aperture without refetching or deleting geometry. Source crop, marker identities and PLY hash are unchanged.

The first shallow aperture still looked enclosed; its nine captures remain in `implementation/first-cutaway/`. A failing low-edge assertion preceded the wider aperture. The previous pass-1 source/captures remain in `implementation/before/`. The first wider-aperture captures remain in `implementation/before-thumbnail-wait/`: clue images were incomplete with zero natural width immediately after opening. Waiting for visible images to load produced the final clue capture without a product-code change. The other eight final captures are byte-identical to their already inspected versions.

### Actual checks

- `node week4/app/scripts/crime-scene-smoke.mjs`: passed. Scene-first default; reversible cutaway without geometry reload; W zoom/Home reset; panel exclusivity, draft and selection continuity; Home/all arrows/W/S dwell cancellation; marker keyboard/focus; photos; Markdown save/reload/undo; loading/reply cancellation; plain-text/stale replies; inspect/pause/reopen/return restores exact overview including zoom; static reduced motion and emulated touch; no page errors or provider calls.
- `npm.cmd run check`: typechecks/build passed; 103 core and 290 app tests passed. Existing Rust unused-code warnings and large-bundle warning remain.
- `npm.cmd run room:test`: 163 passed, 0 failed, 2 existing skips (actual owned-process termination and actual CPU adapter integration).
- `python -I -m unittest discover -s scripts/room_workflow -p 'test_ffs*.py'`: 6 passed.
- Smoke syntax and tracked whitespace checks passed. Focused state tests: 3 passed; initial clean-default/missing-aperture/low-edge assertions were observed failing before implementation.

[Source fingerprint and capture hashes](implementation/verification.json). Local verification used the single approved dev session, Playwright Chromium and a disposable key-disabled broker, not the real notebook store. The session-owned dev task was stopped; ports 1440/1442 had no listeners. Free memory before the final smoke: 9,690,296 KiB physical / 16,587,888 KiB virtual; after shutdown: 9,505,680 / 17,041,264 KiB. These are point observations, not a peak-memory profile. No allocation failure recurred.

Lead implementation used the configured GPT-6 Astra route; one read-only `eva-researcher` geometry audit ran (configured Terra alias, resolved identity not independently established). Ruflo routing was advisory. No specialist UI execution or independent final code review is claimed.

### Inspected captures

Desktop 1440×960 and emulated touch 390×844, device scale factor 1. All nine final captures inspected, including byte-identical matches noted above:

[Overview](implementation/after/desktop.png) · [Full scan](implementation/after/full-scan.png) · [Clues](implementation/after/clues.png) · [Inspector](implementation/after/inspector.png) · [Source photo](implementation/after/photo.png) · [Notes](implementation/after/notes.png) · [Reduced motion](implementation/after/reduced-motion.png) · [Touch](implementation/after/touch.png) · [Touch notes](implementation/after/touch-notes.png)

### Limits and owner exercise

This is a fixed geometric aperture, not wall segmentation: it may hide evidence-bearing points above the retained low band. Rotate away from the intended angle and occlusion can return; Reset view restores the intended angle, Full scan restores every point inside the retained crop. The single-position scan remains sparse and incomplete, particularly at mobile scale. No invented geometry fills gaps. Mobile notes scroll internally; physical touch, screen-reader testing, native Tauri execution and peak-performance profiling were not performed.

Open the overview, compare Full scan, inspect a clue/photo, switch Notes → Clues → Notes without losing a draft, then use Return/Reset. Judge whether the room and primary actions are understandable. [Owner acceptance](../../acceptance/crime-scene-isometric-v1.md) remains pending. No new download, live reply, GPU job, pass-2 work, commit or publication occurred; the one 3.5-credit reference allowance is consumed.
