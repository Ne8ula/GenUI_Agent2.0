# Scene investigation — pass 1 acceptance

**Decision: pending.** Session date: 2026-10-24. No owner acceptance or phase advancement is implied.

## Scope and revision

Route: `?scene=crime-scene`. Branch `crimescene`, base `0380e13` plus retained uncommitted work. [Source fingerprints](../revisions/crime-scene-v1/implementation/verification.json) identify the final checked files; this is not a committed revision. Existing planning, acquisition and unrelated working-tree changes were preserved.

Implemented: private retained laser-scan points in the static matrix treatment; detected markers and all 11 documented clues; source-photo dialog; page-session-only examined status; private Markdown notes, tag chips, save/reopen and 32-edit undo; an opt-in, server-side Opus 5.5 reply endpoint. No photos enter provider requests. Missing-key state leaves notes usable. Runtime output is text, never actions or HTML.

Excluded: hypothesis figures, timeline, consistency checks, Attinger bench/stringing, reconstruction, downloads, Modal/GPU work, dependencies, publishing and commits. No live Claude requests or additional Weave generation/spending occurred.

Prior implementation session: Claude Code, configured GPT-6 Astra route. Its independent read-only review used `eva-reviewer`, reporting resolved `claude-opus-5-5[1m]`; source inspection only, not an independent test run. Final verification session `6183edb3-7b5f-4429-a6ca-b3dabd090d18`: lead executed PowerShell/Node/Playwright and inspected captures directly; no worker invoked. Ruflo routing was advisory, not proof of model execution. Only smoke coverage and evidence changed in this continuation; application source hashes are unchanged.

## Inputs and provenance

[Weave packet](../revisions/crime-scene-v1/REVIEW.md): four existing stills and one existing video; writer inspected the contact sheet and video frame sheet. Its keep/exclude table guided this bounded pass. Generated rooms are not scene data.

FFS th_0028: Daudigny & Grussenmeyer (2026), University of Lausanne, CC BY-NC-SA 4.0. Already acquired private inputs remain under `.local/reconstruction/`; nothing was placed in public app assets. The [fixed resource catalog](../../../scripts/room_workflow/ffs-resources.json) pins sizes and SHA256. Single-position scan: 712,312 points; SHA256 `f72bf4ff75ee242e4327d442e02ae9bb11ee779ba2b0c8684efe0ab571e984c0`. Display rotation/crop do not alter that source; gaps stay empty.

Nine colour-cluster candidates: eight provisionally hand-associated numbers and one unidentified marker. In marker-ID order: `17, 69, 12, 22, 13, unidentified, 18, 21, 32`. Tags 1, 11 and 20 have no position. The detector does not assign identities. Numbering and crop require owner review against the retained panorama/photos; they are not validated forensic results. Reddish traces were applied by instructors; no blood identification or spatter analysis is performed.

## Checks and actual results

Windows 11, Node v24.14.0, installed Chrome through Playwright. All commands below reran successfully in the final verification session:

| Command/scenario | Expected | Actual |
|---|---|---|
| `npm.cmd run check` | Typechecks, core/app tests and build succeed | Pass: 103 core + 289 app tests; production build succeeds |
| `npm.cmd run room:test` | Broker/protocol suite succeeds | 163 passed, 0 failed, 2 skipped (165 total) |
| `node --test scripts/room_workflow/crime-scene.test.mjs` | Fixed-resource, notebook and reply guards hold | 13 passed, including six provider-response subtests; fake network only |
| `python -I -m unittest discover -s scripts/room_workflow -p 'test_ffs*.py'` | FFS preparation/detection checks succeed | 6 passed |
| `node --check week4/app/scripts/crime-scene-smoke.mjs` | Browser script parses | Pass |
| `git diff --check` | No whitespace errors | Pass; existing LF/CRLF warnings remain |
| `node week4/app/scripts/crime-scene-smoke.mjs` | Final post-review interactions pass with disposable, key-disabled broker | Pass; 1440×960 desktop and 390×844 emulated touch, device scale factor 1; no provider call |
| Home, all four arrows, W and S | Movement cancels close-up examined-state dwell | Pass for every key after waiting 2.15 seconds |
| Inspect → pause → reopen → Return | Restore overview | Pass: canvas PNG bytes equal the captured overview |
| Cancel reply; close/reopen Notes during reply | Cancellation message and remaining quota update | Pass for both; browser-intercepted replies/status only |
| Mocked HTML-like reply; edit notes after reply | Render as text only; label stale reply | Pass: no image element or injected flag; changed-notes label visible |

The full smoke also passed Tab/Enter/Escape and focus return, clue-row bounds and marker non-overlap, stationary close-up examination, source-photo loading, missing-key notes, Markdown save/reload, undo, clearing examined state on reload, loading cancellation, byte-identical static reduced-motion captures, and touch emulation without horizontal page overflow. Physical-touch/native behavior is not established.

### Earlier failure and bounded restart

The earlier expanded run failed on Home before the keyboard fix, then later hit `RangeError: Array buffer allocation failed` during a run containing a large screenshot-buffer comparison. The retained `.equals()` comparison avoids constructing a huge assertion diff. The assertion-diff diagnosis remains probable, not a measured heap profile. Earlier non-browser results and captures are retained in [earlier-before-reverification](../revisions/crime-scene-v1/implementation/earlier-before-reverification/); they do not prove the final interaction fixes.

The owner authorized one local restart for this continuation. Before startup (2026-10-24 21:13:38 −04:00), memory was 12.06 GiB physical / 18.74 GiB virtual available; ports 1440 and 1442 were free before launch. The final expanded smoke passed without allocation failure. After smoke (21:16:25 −04:00), available memory was 11,085,932 KiB physical / 18,165,424 KiB virtual of 33,245,948 KiB physical total. These are point observations, not peak profiling. The disposable broker/browser closed and its temporary store was removed. The session-owned dev task was stopped; no listeners remained on 1440/1442. No second restart occurred.

Evidence consistency: 15 source hashes, the aggregate fingerprint, six final capture hashes, preserved candidate hashes and 105 local Markdown links passed validation. A temporary validator initially failed because it used locale-aware sorting; reproducing both sort orders confirmed the mismatch. Lexical code-unit sorting matches the recorded fingerprint; no source hashes were changed to conceal the failure.

Suite skips: `actual owned parent and child processes stop together`; `actual CPU adapter runs through broker and admits a bound artifact`. Build warnings: Rust unused `STRIDE`, dead `stance`/`contact`, unused `finite`; Three.js chunk approximately 531 kB exceeds Vite's 500 kB warning threshold.

## Captures and visual inspection

[Before](../revisions/crime-scene-v1/implementation/before/desktop.png) records the same URL and desktop viewport falling through to the old fixture; no prior investigation page existed. After: [desktop](../revisions/crime-scene-v1/implementation/after/desktop.png), [photo](../revisions/crime-scene-v1/implementation/after/photo.png), [notes](../revisions/crime-scene-v1/implementation/after/notes.png), [reduced motion](../revisions/crime-scene-v1/implementation/after/reduced-motion.png), [touch](../revisions/crime-scene-v1/implementation/after/touch.png), [touch notes](../revisions/crime-scene-v1/implementation/after/touch-notes.png). All six were regenerated by the successful final-revision smoke and visually inspected in this continuation. The corresponding earlier captures and prior verification record remain in [earlier-before-reverification](../revisions/crime-scene-v1/implementation/earlier-before-reverification/). [Capture hashes](../revisions/crime-scene-v1/implementation/verification.json) distinguish the final run. Camera/reply assertions are browser execution evidence; the stills do not themselves record those transitions.

Observed: scan points dominate, clue thumbnails and word statuses remain legible, photo and missing-key notes are usable, and the touch layout stacks rather than horizontally scrolling. Early [clipping candidate](../revisions/crime-scene-v1/implementation/after/desktop-first-candidate.png) and [exterior-camera candidate](../revisions/crime-scene-v1/implementation/after/desktop-exterior-candidate.png) remain reviewable. Fixed inherited fixture heights and overlapping marker buttons; retained source walls rather than inventing geometry. Some markers lie outside the current view; numbered items remain accessible from the clue list.

## Review decisions and remaining limits

- Keyboard dwell: prior fix cancels OrbitControls arrow keys and custom Home/W/S/+/- keys. Final browser coverage passes Home, every arrow and W/S; this continuation added the missing key cases only.
- Return continuity: retained camera snapshot preserves the overview return pose across renderer recreation. Final inspect → pause → reopen → Return regression passes with byte-identical overview canvas captures.
- Reply interruption: retained close/cancel behavior updates its message and quota, completed requests clear their controller, and all reply outcomes refresh status. Final mocked success/plain-text/stale/cancel/close browser cases pass.
- Provider boundary: confirmed and fixed arbitrary upstream `.status` errors escaping sanitation and malformed non-string text being coerced into an answer. Both regressions ran red then green. Malformed/truncated/oversized/non-JSON/HTTP-error responses, abort, virtual 45-second timeout, concurrent-operation rejection and note limits now pass offline tests.
- Spending ruling: retained the explicitly requested **five requests per private session**, not an unapproved global allowance. A new cookie creates a new session and cap; this is not an account-wide or installation-wide spending budget or anti-abuse control. Each reply requires explicit consent. No paid test was made. Public/multi-user deployment is out of scope and would require a separate aggregate budget and authorization decision.
- Request-shape ruling: kept the documented raw Messages API route selected by the owner. Actual model availability, live API compatibility, cost, latency and answer quality remain untested. Failed/uncertain submissions consume allowance before network I/O; no automatic retries.
- Weave ID ruling: the non-hex Veo model ID is an opaque identifier, not a promised UUID. It matches the original `weave_run_model` calls in session `5d6d8ab7-d692-4530-a4fe-b87c166a0f6a`; retain it unchanged. No new provider call was needed.
- Smoke isolation: the script now creates its own disposable, key-disabled broker on 1442; it refuses an occupied port and cleans up only its own store. Earlier actual runs also used a separate key-disabled scratch broker, not the owner's notebook store. The standalone final run passed and cleaned up its disposable store; the owner's notebook store was not used.

Deferred review minors: Vite-to-broker abort propagation is unverified (the 45-second server timeout still bounds work); failed atomic rename may leave private temp files; hand-edited/CRLF Markdown fails closed with no in-app repair; expired/cleared cookies leave orphaned private notebooks; heavily JSON-escaped text can hit the 64 KiB request limit and lone surrogates normalize on disk; undo is per edit/keystroke and index keys can transfer tag-picker expansion; thumbnails use full source photos and repeated integrity hashing; retry can briefly show the old error; the unidentified marker has no secondary list entry (Reset view restores its initial view); manual numbering is retained in private tags data, not a reusable binding script; POST origin checking is redundant. No unrelated refactors were made for these.

## Reproduction and next owner exercise

Prerequisite: retained private files must match the catalog. Do not re-download or regenerate them just to run these checks.

For a separately authorized future reproduction, check available memory, then run `npm.cmd run dev` from the root. With port 1442 free, run `node week4/app/scripts/crime-scene-smoke.mjs` in a second terminal. The script owns its isolated broker and disables real provider access; it replaces the listed smoke captures, so preserve those first. Keep review candidates. **Do not run `room:service` simultaneously with this script.** Stop session-owned servers if allocation failure or memory pressure recurs; do not restart automatically. This continuation's single restart authorization is consumed.

For manual local review instead, run `npm.cmd run room:service` beside the dev server and open `http://127.0.0.1:1440/?scene=crime-scene`. Notes use the existing private broker directory and browser session. A root `.env` key enables the consent-gated reply path; do not submit a paid request without a finite owner-approved exercise.

1. Review the final captures and passing regression record, especially inspect → pause → reopen → Return, keyboard dwell cancellation, and closing/cancelling EVA replies.
2. Review room framing, crop and all eight provisional numbers against source imagery; confirm the unknown remains unidentified and tags 1/11/20 remain unlocated.
3. Save/reopen a synthetic note, test undo and focus/touch on the intended device, then separately decide whether to authorize a bounded live reply test.
4. Record feedback, blockers and an explicit acceptance/rejection decision against the fingerprint above. Until then, acceptance stays pending.

Not checked: live Claude calls, physical touch, native performance, graphics-loss recovery, actual Windows rename failures, symlinked notebook tests or peak-memory profiling. Material risks: provisional marker/crop interpretation and per-session-only spending limits; technical verification does not grant owner acceptance.
