# EVA investigator v1 — pending acceptance

2026-10-27 · branch `crimescene`, HEAD `0380e13` plus the uncommitted crime-scene base (nothing committed). [Spec](../../superpowers/specs/2026-10-27-eva-investigator-design.md) · [plan](../../superpowers/plans/2026-10-27-eva-investigator.md) · [Weave packet](../revisions/crime-scene-eva-v1/REVIEW.md). **Owner acceptance: pending. Latest v8 walkthrough and smoke passed on L4; the video is recorded but the cropped hypothesis figure blocks presentation readiness.** Earlier sections preserve their historical checkpoints; the [v8 result](#v8-recording-result--2026-10-27) supersedes their pending-execution statements.

## Scope

Approved segment holograms, owner review record, fitted object models (when generated and approved), the Ask EVA panel, rigged hologram figures and the hypothetical-reconstruction playback bar in the first-person crime scene. This does not advance any other phase and is not forensic validation.

**Deviation from plan Task 11:** the `model-hologram.png` and `model-source.png` captures are deferred to a later owner-approved check. No generated model is owner-approved yet, so this pass captures `segment-hologram.png` instead.

**Models hidden for the browser check:** the pre-approved browser check runs with every generated model hidden (`review.md` `models` stays `{}`, coverage threshold 1). Owner decision 2026-10-27: all three generated models rejected ([model review](../revisions/crime-scene-eva-v1/models-v1/REVIEW.md)); segment holograms stay.

**Demo: Ask EVA uses a labelled canned mode** (owner decision 2026-10-27): pre-written replies through the real validation pipeline, each starting "Canned demo reply — written in advance, not generated live."; no API key or provider spend. Owner also approved one v6 GPU browser check (≤ $2) and the demo session (≤ $3).

## What exists (evidence)

| Item | Evidence |
| --- | --- |
| Weave references | Still `984ded07` (3.5 credits) and clip `9ff68c78` (31 credits), owner-approved and inspected before UI edits; [packet](../revisions/crime-scene-eva-v1/REVIEW.md). |
| Segmentation v1 | Owner-approved $1 Modal CPU run: plan `ce821188`, app `ap-E17lS7kuQLrRBNqWVbu2hg`, segments returned, app stopped with 0 tasks. Previews in [segments-v1](../revisions/crime-scene-eva-v1/segments-v1/). Retained as `segments-v1/` in the catalogue. |
| Segmentation v2 (tightened) | Plan `52400e36`, app `ap-kAhRraZfxU4x2xoWPkJvSY`, segments returned, app stopped with 0 tasks; registered as `segments/`. Previews in [segments-v2](../revisions/crime-scene-eva-v1/segments-v2/). |
| Owner review | From preview images, 2026-10-27: segments approved for markers 07, 02, 05, 08, 01 (tags 18, 69, 13, 21, 17); rejected 03, 04, 09, 06. Crops approved for tags 18, 69, 13. `review.md` sha `1e3d3777…`; `models` empty; coverage threshold 1. Owner input, not source evidence. |
| Figure asset | UAL Standard mannequin, CC0, catalogue key `figures/human.glb` (sha `1b7bf678…`, 6.67 MB); [licence](../revisions/crime-scene-eva-v1/FIGURE-LICENCE.md). |
| Object models | **Generated; owner rejected all three (2026-10-27).** Preflight v1 (plan `d97615dc`) failed at image build (torchmcubes linked with clang++; no GPU used; app `ap-xcluck5NXoNtq0ipi2v7sr` stopped). Preflight v2 built (plan `72b1e3f4`, app `ap-YbMgK6eXGFSTkjn3w31h6I`, all build checks passed). The pre-approved generation returned (app `ap-Lh9SBfjyJwYiZg60vezCsY`, stopped with 0 tasks): tag 69 coverage 0.488 / 2.20 cm, tag 18 0.401 / 3.19 cm, tag 13 0.026 / 11.89 cm; [model review](../revisions/crime-scene-eva-v1/models-v1/REVIEW.md). Tags 18, 69 and 13 show segment holograms. |
| Offline checks (final-review fix wave) | App `npm test` 327/327, `npm run typecheck` exit 0, `vite build` OK; `scripts/room_workflow/*.test.mjs` 192 pass, 2 skip, 0 fail of 194, including `eva-investigator.test.mjs` 24/24. `test_crime_scene_browser_cloud.py` rerun: 5 pass, 1 skip (adapter unchanged; the investigator's digest it uploads changed). Demo adapter tests not rerun (7/7 combined in Task 11). |
| Browser smoke | Extended (below). The local PC cannot hold the WebGL scene; it runs only in an approved L4 check. |
| GPU browser check v5 (failed) | Owner pre-approved ≤ $2, one attempt: plan `60206845…`, app `ap-XxF01FxP5EZFbQOwXqnlA8`, stopped with 0 tasks. NVIDIA L4 via ANGLE/Vulkan; GPU device, Vulkan, crime-scene unit tests (40/40) and Vite passed; smoke failed after 18.3 s at "Beacon moves to the next photographed clue". Observed in [captures](../revisions/crime-scene-eva-v1/implementation/gpu-v5-failed/): the scan hologram highlights the chair's own measured points (`hologram.png`); from the scanner position both tag 13 and tag 22 lie outside the view, so only the edge chevron (a DOM element hidden from the canvas comparison) moved. Smoke defect, not a product defect. Steps after it (source colours, clues, Ask EVA fixtures, playback) did not run. |
| Smoke fix after v5 | The step now asserts that the chevron moves on E and returns on Q; `node --check` OK; adapter now writes `crime-scene-browser-v6` (tests 6/6). **Not run**: a v6 check needs a new owner approval. |

## Browser check plan (v5 stopped at the timeline step; the rest not run)

`week4/app/scripts/crime-scene-smoke.mjs` keeps its earlier first-person checks (five double-encoded `·` characters left by a post-v4 edit were repaired) and adds:

- only the approved segments (markers 01, 02, 05, 07, 08) are fetched; tag 18 is not shown as an "approximate region";
- Ask EVA is disabled until a clue is scanned;
- browser-boundary fixtures for `crime-scene/investigation` and `crime-scene/ask` (never the broker's provider). The fixture reply is schema-checked against `eva-investigation.schema.json` and moves tag 18 from `upright` to `current` with actors A and B. Because `review.md` records no upright rotation for tag 18, the upright ghost is not shown (renderer rule); the figures still play;
- the ask body is exactly question, scanned tags, history revision and consent; Sources read "citation (verification: …)"; the count goes 20 → 19 → 18 left;
- the badge text is exactly "EVA's hypothesis — not evidence"; play advances the reconstruction clock (slider value > 0); the first Escape pauses, and the clock holds;
- while paused, with reduced motion freezing the effects, moving the clock from 0 to 8 s (the step where figure B appears) changes the canvas; this is the playback-driven canvas check, because normal-motion sparkle changes the canvas regardless;
- the second Escape removes the bar and returns focus to Ask EVA;
- under reduced motion there is no autoplay, a step holds still and Next step moves the clock to 4 s;
- an invalid-reply fixture shows "EVA's reconstruction was invalid" with no reconstruction;
- a failed run still saves `failure.png`; the worker records per-step durations in `result.json`;
- captures: `segment-hologram.png` (taken 1.8 s after the scan so the build has settled), `eva-answer.png`, `playback.png`, plus the existing set including `source-colours.png`, into `../revisions/crime-scene-eva-v1/implementation/after/`.

Cloud adapters: `crime_scene_browser_cloud.py` now writes to `crime-scene-browser-v6` (v5 used once, above), uploads the segments, review, figure and (when catalogued) `ffs-th0028-objects-v2/returned/` assets, all `crime-scene*.test.ts` tests and the investigator's schema and digest; its upload cap rose from 40 to 64 MiB because the existing assets alone total 40 MiB. `crime_scene_demo_cloud.py` writes to `crime-scene-demo-v3`. Earlier folders keep their used receipts.

## Object states and the upright convention

- `current` is the measured pose; `upright` is the owner-authored standing pose (the reply's position is not used); `displaced` moves the ghost so its measured bottom (base) rests at the reply's `[x, y, z]`, with z the resting height (0 = floor). EVA's system prompt states the same.
- `review.models[tag].upright` is XYZ Euler radians (three.js default order) in the display z-up frame, applied about the hologram's bounding-box centre (the approved segment's, else the marker), then re-floored so the ghost keeps its measured bottom height. It is honoured whenever the owner recorded one, whatever the model status, so segment-point ghosts use it too; the model status gates only the generated-mesh display.

## Runbook

- Restart the room broker after any catalogue registration or `review.md` save: the broker reads `ffs-resources.json` once at start, so a running broker keeps the old hashes and refuses the new `review.md` or misses newly registered entries.
- Do not save the review while a registration is running (no cross-process lock).

## Not yet verified

- Rendering beyond the v5 captures (scan hologram on the chair segment verified): shaders with skinning, figure poses, ghost pivot, landing ring/burst, label sprites, panel and bar layout, focus order and touch.
- Fitted models and the model label: model captures are deferred to a later owner-approved check.
- Live EVA reply quality, latency and cost (no live call has been made).
- Figures stand at z = 0, not the fitted floor (about 2.7 cm higher in `segments/summary.json`); parked because the renderer does not load the summary.

## Offline continuation — 2026-10-27

Scope: resume the recorded canned-demo decision above, not a new visual pass or an execution of the recorded cloud allowances. HEAD remains `0380e13` plus the preserved uncommitted base. Lead: session-reported Astra; independent read-only review: `eva-reviewer`, requested Opus and reported Opus 5.5. Ruflo routing was advisory only. No commits, downloads, provider requests or paid execution.

Changed implementation:
- `scripts/room_workflow/eva-investigator.mjs`: explicit server-only `demo: true` returns pre-written, labelled replies through the existing schema/crop/scanned-tag validator, consent/revision checks, reservation, cancellation and bounded transcript. Credential, photo and provider readers are not called. Demo transcripts/counters use separate `*.eva-demo.*` files, so a later live session cannot treat canned history as model output.
- `scripts/room_workflow/eva-investigator.test.mjs`: five new tests cover provider exclusion, labels, scanned-only replies, validation failures, durable limits, isolation and authenticated HTTP/CSRF behavior.
- `week4/app/scripts/crime-scene-demo.mjs`: opts only the demo investigator into canned mode; notes remain provider-disabled. Both local and Modal demo launchers use this script. Neither was launched here.

The bounded demo has two authored examples: a chair-contact possibility only when tag 18 is scanned and the question names the chair, otherwise an explicitly generic inspection example that **cannot evaluate free-text hypotheses**. The chair remains in its measured pose. This is not live EVA reasoning or an event reconstruction.

Verification on the current sources:

| Command | Actual result |
| --- | --- |
| `node --test --test-name-pattern="canned demo" scripts/room_workflow/eva-investigator.test.mjs` before implementation | Four new tests failed because the missing mode invoked the credential reader (RED). |
| `node --test scripts/room_workflow/eva-investigator.test.mjs` | 29/29 pass after implementation, including the fifth, HTTP integration test (GREEN). The HTTP fixture initially used the wrong origin; corrected to the broker's existing permitted app origin, without changing production origin rules. |
| `node --check week4/app/scripts/crime-scene-demo.mjs` | Pass. |
| `npm.cmd run room:test` | Default parallel run failed: first 194 pass / 3 fail / 2 skip; second 196 pass / 1 fail / 2 skip. Failures were `scan-assisted.test.mjs`: “actual isolated Python replay returns only needs-review with resource evidence”, “exact host bindings, unknown authority and missing manifest reject”, and “configuration and failed spawn release the lock without claiming uncertain execution”, with “CPU idealization failed, timed out or was cancelled.” Only the first failed on the second run. |
| `node --test scripts/room_workflow/scan-assisted.test.mjs` | 6/6 pass in isolation. |
| `node --test --test-concurrency=1 scripts/room_workflow/*.test.mjs` | 197 pass / 2 existing skips / 0 fail (199 total). Parallel sensitivity remains unresolved; this does not make the default command green. |
| `npm.cmd test` | 103 core + 327 app tests pass. |
| `npm.cmd run typecheck` | Pass, including the existing Rust/WASM build hook; three Rust unused-code/import warnings remain. |
| `python -I -m unittest discover -s scripts/room_workflow -p test_crime_scene_demo_cloud.py` | 2 pass / 1 skip: real Modal SDK construction unavailable in this Python environment. No cloud submission. |

Tested SHA-256 fingerprints (for this continuation, not the whole dirty branch): investigator `fa82ec4bc205f706ace7466f530a9387896dea8c10ed9d9280e5175cc3cc2382`; investigator tests `d65d48d8499c0ec5c252ad98deb37e1223ffdcdb78d423d98ec2d808c06b4894`; demo launcher `4aad0ecb1ec3cb947bf1259c0a65083391b36f1c797bba104c5a3670aa54a359`. Tracked diff whitespace check and scoped implementation whitespace check pass; 61 local links across this record and PLANNING resolve.

Independent review found no important defects in the canned backend or launcher. It was read-only, not execution evidence; the fifth HTTP test was added during review and was verified by the lead afterward, not independently reviewed.

**Deferred limitations / release hold:** unchanged Ask EVA UI still describes Opus, sending photos and possible remote cost before showing the explicit canned answer. Correct mode-specific copy needs a separately gated UI pass; do not present the demo as live AI. The authored push pose is at the room centre rather than aligned to the chair, and `current` creates no visible moved-chair ghost; browser quality is unverified. Minor review caveats retained: wording “who moved it” could better say “whether it was moved”; the chair trigger is singular-only; provider exclusion relies on the explicit server flag (unit tests enforce no access), rather than redundant launcher credential/fetch guards. The always-present staged-trace warning matches the base policy, not a newly discovered clue.

**Authority reconciliation:** this record's earlier paragraph says v6/demo were approved, while its older gates say otherwise. This continuation did not independently recover that approval or consume either allowance. The original pass-1 peer session confirmed it held no newer authority. Treat execution as held until the owner confirms an exact fresh snapshot and finite run. No paid plan was prepared here. Owner acceptance stays pending.

Next owner exercise: choose whether to authorize a mode-copy UI pass (fresh Weave packet or explicit bounded waiver), then confirm a bounded GPU check of the resulting snapshot. Free-text reasoning still requires separately approved live calls; canned behavior is not evidence of reply quality.

## Gates

The L4 browser check was owner pre-approved on 2026-10-27 (one attempt, ≤ $2) and was used by v5 (failed, above); a v6 check needs a new approval and runs with models hidden. The object-generation run (pre-approved, ≤ $10) has run once and returned; any further generation, the interactive demo and any live EVA calls each need their own owner approval.

## Walkthrough preparation — 2026-10-27

Owner request: complete and record the scan-based walkthrough first. The owner explicitly selected **“Approve bounded waiver (Recommended)”** for canned-mode labels, consent and cancellation wording only, preserving live-provider wording and all layout/styling. This is the change-specific exception to fresh Weave generation; no Weave run is claimed, and it does not authorize geometry, pose, animation or other visual changes. Cloud execution still needs a fresh finite approval; neither the consumed panorama allowance nor historical demo allowances carry forward.

Implemented under that waiver:
- [Investigator](../../../scripts/room_workflow/eva-investigator.mjs) exposes server-configured `demo` on status; the ask request remains exactly its original four fields. Client input cannot enable demo mode.
- [AskEva](../../../week4/app/src/crime-scene/AskEva.tsx) and [copy helper](../../../week4/app/src/crime-scene/investigation.ts) disclose authored examples before consent, remove model/photo-reasoning claims in canned mode, and use truthful working/success/cancellation copy. Live text remains unchanged. No CSS, scene, renderer or playback changes.
- [Walkthrough driver](../../../week4/app/scripts/crime-scene-walkthrough.mjs) runs the real private broker in canned mode with credential/photo/provider readers disabled, not intercepted AI replies. It records a 1440 × 960 WebM plus eight checkpoint PNGs: room → scanned chair → source photo → temporary note → canned consent → answer → paused hypothesis → source evidence. It asserts keyboard photo focus return, note save/undo, labelled answer/count, playback advancement, Escape pause/clear/focus, reduced-motion stepping, and NVIDIA hardware rendering. The driver refuses to launch without the cloud NVIDIA requirement.
- [Cloud adapter](../../../scripts/room_workflow/crime_scene_browser_cloud.py) includes the driver in its explicit snapshot, runs it with a 90-second subprocess bound **before** the separate existing 330-second smoke check, and returns WebM under the same 40-file / 64 MiB aggregate integrity/path/no-overwrite limits. Synthetic smoke answers are not part of the walkthrough video. Earlier outputs remain untouched; the proposed output is `crime-scene-browser-v7`.

Proposed execution, **not authorized or run**: one isolated Modal L4, 4 CPU cores, 16 GiB RAM, 600-second function timeout, 300-second startup timeout and 1,200-second client deadline; one container, no configured retries. **$2 operational allowance**, not a provider-enforced dollar cap or billed-total quote. Build reuses the pinned Playwright image and lockfile package versions (cloud npm install with scripts disabled); no local installation or new model downloads. Explicit hash-checked snapshot ≤64 MiB contains the retained app/broker/catalogued public scene assets and tests, not private notes, credentials, raw scan or evidence spreadsheet. Catalogued but rejected generated objects remain hidden by the retained review record. No public endpoint, persistent volume, provider secrets or runtime network; provider-managed upload/image caches may persist. Stop only the owned app and verify stopped/zero tasks, preserving failed/uncertain receipts. No automatic retry on failure.

Fresh offline evidence:
- New mode/copy tests first failed for missing status metadata/helper; then passed. Existing exact status expectations were updated for the added server field. `node --test scripts/room_workflow/eva-investigator.test.mjs week4/app/tests/crime-scene-investigation.test.ts`: **36/36 pass**.
- New recording transport test first failed because the recording driver was absent from the snapshot. After implementation, `genrc-client/Scripts/python.exe -I -m unittest discover -s scripts/room_workflow -p "test_crime_scene_*cloud.py"`: **10/10 pass**, including Modal SDK construction without submission, snapshot exclusions and bounded WebM receipt. Binary test payloads test transport, not video decoding.
- `node --check week4/app/scripts/crime-scene-walkthrough.mjs`: pass. The driver's runtime assertions have **not** run.
- `npm.cmd test`: **103 core + 328 app pass**. `npm.cmd run room:test`: **198 pass, 2 existing skips, 0 fail** (200 total); skipped “actual owned parent and child processes stop together” and “actual CPU adapter runs through broker and admits a bound artifact”. Earlier parallel sensitivity remains historical, not evidence of a permanent fix.
- `npm.cmd run typecheck`: pass; Rust build hook still emits three unused-import/dead-code warnings (`STRIDE`, `stance/contact`, `finite`).

Recording acceptance remains pending: inspect actual returned video/screenshots and hardware/cleanup receipt, confirm readable timing, keyboard/focus/touch/reduced-motion/interruption behavior and return to evidence. No before/after browser capture, browser execution or video decoding has occurred for this correction. The broader smoke still contains fixture-only provider/error checks, not live-AI evidence. Notes are disposable in this runner; the demonstration note explicitly says so because the general notebook copy still describes computer/session storage. Figure placement, stationary chair, ~2.7 cm floor mismatch and lack of live reasoning remain unchanged limitations. A plausible authored animation is not evidence of an event.

## Frozen recording proposal and review

Independent `eva-reviewer` (reported `claude-opus-5-5[1m]`) performed a static, read-only review, not a browser run. Lead disposition:
- Fixed figure failures logged at warning level being ignored. A regression executes the driver's real console listener and failed before the predicate fix, then passed.
- Fixed capture racing the figure download: install the response wait before Play, require a successful completed GLB response, restart playback after download, then reach 1.5 seconds before pausing. A script-order regression failed before the change and passed afterward; it is not GLB parse/render evidence. Actual figure visibility still needs visual inspection.
- Measured retained v6 evidence without treating that folder as new authority: 22 files, **9,531,588 bytes**, largest PNG **766,182 bytes**. Adding eight PNGs at that maximum plus an estimated 10 MiB video gives **26,146,804 bytes**, below the unchanged **67,108,864-byte** cap. This is planning arithmetic, not a bound on video compression. Retain the cap and ordering; an oversized run can still lose later files and is a failed attempt, not permission to rerun.
- Replaced the hard-coded `provider_calls: 0` report field with `provider_access: "disabled by throwing stubs"` so configuration is not reported as a measured count. Added the existing image-decode readiness wait before the final evidence capture.
- Deferred minor copy: demo history can still say “earlier turns in context” even though canned answers do not use it; the generic playback badge says “EVA's hypothesis” and collapsed Sources & details describes the live reasoning route. The preceding canned disclosures/title/captions remain explicit. No wider playback UI change is inferred from the waiver.
- Deferred timing improvement: summed subprocess bounds leave about 15 seconds for other work within the 600-second function timeout. A hard function/subprocess timeout may prevent finalization and lose the video/report; ordinary caught driver errors attempt a partial capture. No partial recording is guaranteed. The current attempt must stop rather than retry if this occurs.

Final checks after review corrections: **103 core + 330 app tests pass**, typecheck passes with the same three Rust warnings, **10/10 cloud-adapter tests pass**, recording syntax passes. The two added recording regressions are offline listener/order checks only. The prior 198-pass/2-skip room suite remains the latest backend run; no backend code changed during the review fixes.

Offline preparation command executed once (no upload, build or cloud submission):

```powershell
& ".local/reconstruction/genrc-client/Scripts/python.exe" -I scripts/room_workflow/crime_scene_browser_cloud.py
```

Frozen plan: `.local/reconstruction/crime-scene-browser-v7/plan.json`; SHA-256 **`2b17459ae77b178cf27091c06007b78cc260ba74d0896d4dc7a9acbc142c7e4a`**. Snapshot: **117 files, 45,673,911 bytes**. Exact snapshot, source, adapter and cleanup hashes independently rechecked locally. `execution_authorized` is false; no `receipt.json` or returned output exists. This pins HEAD `0380e13` plus the captured uncommitted inputs, not a clean commit or a claim that the whole branch was reviewed.

**Execution authorized:** the owner subsequently said “Approve Modal attempts.” Applied only to the presented exact v7 plan: one attempt with a $2 operational allowance, not an open-ended retry allowance. Immediately before invocation, all frozen snapshot/source/adapter/cleanup hashes matched and no attempt receipt existed. The following command was invoked once and exited 1; the initialization failure and confirmed cleanup are recorded below:

```powershell
& ".local/reconstruction/genrc-client/Scripts/python.exe" -I scripts/room_workflow/crime_scene_browser_cloud.py --execute-approved-plan-sha256 2b17459ae77b178cf27091c06007b78cc260ba74d0896d4dc7a9acbc142c7e4a
```

No browser recording, paid execution, live AI call, commit or publication had occurred at the preparation checkpoint above. The subsequently approved attempt is recorded next; acceptance remains pending.

## v7 attempted; UTF-8 correction prepared

- Owner approval “Approve Modal attempts.” was applied to the presented single v7 attempt with its $2 operational allowance, not unlimited retries. Exact hashes were rechecked before invocation.
- The invocation exited **1** during Modal app initialization. Rich tried to print `✓` through the Windows `cp1252` stream and raised `UnicodeEncodeError`. This occurred before entering the app context and calling the recording worker. No recording or returned evidence directory was produced.
- Retained `.local/reconstruction/crime-scene-browser-v7/receipt.json` records `failed-or-uncertain`; its cleanup confirms app **`ap-q4Kb3hTr6Rb4g0dYaRCKu2` stopped, zero tasks**. The top-level `app_id` remains null because the exception preceded that assignment; the cleanup entry records the actual owned app. Preserve the original receipt, plan, snapshot and hash-matched `executed-adapter.py`. Actual charges are unverified. The one-attempt authorization is consumed, even though no walkthrough ran.
- Offline reproduction: a new CLI subprocess test forced stdout/stderr to `cp1252`, invoked `--help` (no cloud work), then required UTF-8 output and a checkmark; it failed before the fix. The CLI now reconfigures both streams to UTF-8 before initializing Modal. A separate redirected Rich check with `-X utf8` also passed locally. **11/11 shared browser/demo adapter tests pass** after the fix, including SDK construction without submission. No application, scene or recording-flow code changed in this correction; earlier application checks remain the latest results, not a new run.
- Fresh **unsubmitted v8 proposal**: `.local/reconstruction/crime-scene-browser-v8/plan.json`, SHA-256 **`31c274fbaf0f7ef3784ad2a889da7ad092cacda9566dcbcf663043c51e2c0c3f`**. Same 117-file / 45,673,911-byte app snapshot and exact resources as v7; only the launcher encoding fix and new output reservation changed. Snapshot/adapter/cleanup hashes verified; no v8 receipt or returned directory exists. `execution_authorized` remains false.

A further **one-attempt $2 operational allowance** is proposed for v8 with the same 600-second L4 function / 300-second startup / 1,200-second client bounds, no automatic retry, network-isolated worker, and cleanup verification. This is not a provider-enforced dollar cap. Fresh owner approval is required; the plural word “attempts” was not treated as permission for an unspecified number of submissions.

**v8 execution approved:** the owner replied “Approved” to the corrected one-attempt $2 proposal. Exact snapshot/source/adapter/cleanup hashes were rechecked and the output had no previous receipt. The following command was invoked once and exited 0; returned results and cleanup are recorded below:

```powershell
& ".local/reconstruction/genrc-client/Scripts/python.exe" -I -X utf8 scripts/room_workflow/crime_scene_browser_cloud.py --execute-approved-plan-sha256 31c274fbaf0f7ef3784ad2a889da7ad092cacda9566dcbcf663043c51e2c0c3f
```

No automatic retry, local scene rendering, live model call, commit or publication occurred. v8 ran only after its separate approval.

## v8 recording result — 2026-10-27

**Technical recording complete; presentation readiness and owner acceptance pending.** The approved command above exited 0 using the exact v8 plan `31c274fbaf0f7ef3784ad2a889da7ad092cacda9566dcbcf663043c51e2c0c3f`, HEAD `0380e13` plus its frozen 117-file snapshot. No scene or camera changes were made after execution.

- [Receipt](../../../.local/reconstruction/crime-scene-browser-v8/receipt.json): `evidence-returned`, result `passed`; owned app **`ap-yp8CHuZDvPD0yaCJQ31dsE`**, cleanup **stopped, zero tasks**. The one-attempt $2 operational allowance is consumed as authorization, not a statement of billed cost. Actual charges remain unverified; no further attempt is authorized.
- All worker stages exited 0: GPU device **0.32 s**, Vulkan **1.44 s**, unit tests **2.61 s**, Vite **0.45 s**, walkthrough **37.11 s**, smoke **75.74 s**. These are stage durations, not total job time or billing measurements. Remote unit log: **43 tests, 43 pass, 0 fail, 0 skip**, separate from the earlier full local suites.
- [Walkthrough report](../../../.local/reconstruction/crime-scene-browser-v8/returned/walkthrough.json): real canned backend, provider access disabled by throwing stubs; eight checkpoints completed and error list empty. Actual renderer: `ANGLE (NVIDIA, Vulkan 1.4.341 (NVIDIA NVIDIA L4 (0x000027B8)), NVIDIA)`.
- [Separate smoke log](../../../.local/reconstruction/crime-scene-browser-v8/returned/smoke.log): PASS for look/walk/Home, scan cancellation/no-evidence, approved segments, source/detective switching, panel/draft continuity, keyboard/focus, photos, notes/undo, reply cancellation/staleness, reduced motion, emulated touch and fixture-based Ask EVA/playback/error cases. This is synthetic-provider browser evidence, not live reasoning, physical-touch testing or an independent accessibility audit.
- [Recording](../../../.local/reconstruction/crime-scene-browser-v8/returned/walkthrough.webm): **35.12 s, 1440 × 960, 25 fps, VP8 WebM, 4,058,615 bytes**, no audio stream reported. SHA-256: `fdc554b7ba278b9fcfde3e5f3b2da1218b6f19273c017d3bf264739f4851db77`. Returned directory: **33 files, 18,725,862 bytes**, below the existing 40-file / 64 MiB cap.

Local media verification (decoding returned media, not local scene rendering):

```powershell
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of json ".local/reconstruction/crime-scene-browser-v8/returned/walkthrough.webm"
ffmpeg -v error -i ".local/reconstruction/crime-scene-browser-v8/returned/walkthrough.webm" -f null -
```

Both exited 0; full decode emitted no errors. Visual inspection covered full-resolution [consent](../../../.local/reconstruction/crime-scene-browser-v8/returned/walkthrough-consent.png), [paused hypothesis](../../../.local/reconstruction/crime-scene-browser-v8/returned/walkthrough-paused.png) and [return-to-evidence](../../../.local/reconstruction/crime-scene-browser-v8/returned/walkthrough-evidence.png) captures, plus a chronological contact sheet sampled at one frame per two seconds (`fps=1/2,scale=480:320,tile=4x5`). The contact sheet was inspected in session scratch; its two trailing empty cells are padding, not black video frames. This is sampled visual review and full decode, not real-time viewing of every frame.

Observed: the sequence reaches room → chair scan → source photo → disposable saved note → explicit canned consent → labelled authored answer → paused figure → original evidence. Pre-consent text correctly says replies/poses are written in advance, arbitrary questions cannot be evaluated, and no provider/photo-reasoning upload occurs. The final photograph is identified as a source photograph with attribution, not generated completion.

**Presentation blocker:** during hypothesis playback the figure dominates the close-up view and its upper body/head is cropped by the viewport. Download completion and clock assertions passed, but do not establish appropriate framing, scale or pose alignment. The known room-centred pose, stationary measured chair and approximately 2.7 cm floor mismatch remain unresolved; no specific root-cause fix was tested. The visible “1 earlier turn in context” label also remains misleading for canned replies, as already deferred above. The short recording leaves limited reading time for the answer.

Ruling: preserve this as technical walkthrough evidence, not a polished demo or event reconstruction. Fixing figure/camera/pose presentation is outside the wording-only waiver and requires the applicable fresh visual prerequisite or a new explicit bounded exception; another cloud run needs its own finite approval. Argus calibration/inference and live EVA remain held. Evidence files are local ignored artifacts, not published or guaranteed to accompany a clone.

## Decision

Pending as of 2026-10-27. Next owner exercise: review the linked recording, especially the canned disclosure and cropped figure, before selecting a separately scoped presentation correction. Technical checks do not constitute owner acceptance.
