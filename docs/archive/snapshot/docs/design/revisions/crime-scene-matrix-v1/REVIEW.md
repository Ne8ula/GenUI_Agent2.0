# Matrix figures and complete chair

## Quick review

- Pass: crime-scene-matrix-v1; branch `crimescene`, source `0380e13efbdfa8c1ee29fe2c621927852b7766b7` plus preserved uncommitted work.
- Status: figure shader and clip-timing subpass verified in the v10 L4 walkthrough and fixture smoke; framing/staging, chair generation and quality acceptance remain pending. The v9 timeout cause remains unknown.
- Owner approved the bounded design and maximum **400 Weave workspace credits**, one attempt for each of two stills, one Seedance 2.5 motion clip and one Meshy V6 chair. No automatic retries. Exact tool quotes require per-run structured approval.
- [Contact sheet](references/contact-sheet.png) and [selected artistic still](references/images/matrix-figure.png): material/framing only. [Motion reference](references/videos/matrix-motion.mp4) and [temporal samples](references/videos/matrix-motion-samples.png) inspected.
- Owner quality acceptance: pending; design/spending approval is not candidate acceptance.
- Baseline: [v8 recording and limitations](../../acceptance/crime-scene-eva-v1.md#v8-recording-result--2026-10-27), not an accepted final appearance.

## Brief and scope

Owner feedback: more artistic, abstract matrix-like figures, smoother animation, and an entire chair model rather than the partial scan segment, using AI generation if needed. Approved direction: sparse cyan/teal pixel marks and broken contours instead of the bright solid mannequin; full-body framing and chair-relative placement; time-driven rig animation with eased transitions and deterministic pause/scrub; complete chair geometry fitted to measured support, with unseen surfaces labelled generated. Keep original scan/photos and rejected models immutable. Matrix styling cannot conceal incomplete geometry.

Reuse `crime-scene/renderer.ts`, `figures.ts`, `playback.ts`, their callers/tests and the existing model catalog/admission path; map exact affected contracts before editing. Live reasoning and Argus are excluded. No local scene rendering. Model fitting, turntable inspection and a new Modal app recording require a separately bounded execution plan and approval. Model integration requires review; do not silently approve a generated candidate.

## Candidates and spending

| Output | Route/model | Prediction | Quoted / reported credits | Status |
| --- | --- | --- | --- | --- |
| [Artistic matrix still](references/images/matrix-figure.png) | direct Weave / GPT Image 2.5 Flare | `a15bb902-ad7c-4c1c-b6ec-81f0f7d43ce5` | 8 / 8 | Completed, downloaded and inspected; select material/framing, not invented chair geometry |
| Photo-guided chair reference | direct Weave / GPT Image 2.5 | none | not quoted / 0 | Source upload pending |
| [Motion reference](references/videos/matrix-motion.mp4) | direct Weave / Seedance 2.5 | `4a1fb610-30f4-42c4-acfe-9f2f7bc0b3dd` | 280 / 280 | Completed; H264, 1284 × 718, 24 fps, 10.041667 s, no audio stream; full decode passed and 40 temporal samples inspected |
| Chair mesh | direct Weave / Meshy V6 | none | not quoted / 0 | Wait for inspected photo-guided reference and provider/license checks |

Reported spend: **288 credits**; remaining task ceiling: **112 credits**. Discovery estimates are not charges or final quotes. No Modal allowance carries forward.

## Inputs and provenance

Chair source: retained public Fictional Forensic Scenes th_0028 photograph `IMG_20240306_133552.jpg`, Daudigny & Grussenmeyer (2026), University of Lausanne, CC BY-NC-SA 4.0; [source](../../../../.local/reconstruction/ffs-th0028-media-v1/th_0021-0040/img/th_0028/IMG_20240306_133552.jpg). Catalog SHA-256 `a4ca75ea2d5936ce2e8eeace460f51f16e1ffab8ec1c37aab8c5026384c34095`. Visually inspected: overturned tubular metal chair, dark seat/back, substantial occlusion and low lighting. A clean upright reference would be a generated interpretation, not recovered evidence or a source photograph. Actual upload awaited through the official Weave file picker; no credentials or upload tokens are recorded here.

The artistic still uses an authored text prompt, no photograph. Complete prompts/settings and actual inspection results belong in [provenance.json](provenance.json). Generated references do not prove source accuracy or app behavior.

## Implementation guidance and comparison

Pending chair-source inspection, but the figure references are now usable. Lead inspected the full still and [40 chronological motion samples](references/videos/matrix-motion-samples.png) at 4 fps; full ffmpeg decode passed. This is temporal sampling, not real-time playback or evidence of app frame rate. The clip shows a slow lean (roughly first 3 s), held gesture and return toward the initial stance in the final seconds, with a stationary chair and stable contours. Initial headroom is tight; do not copy that flaw. Select restrained cyan hollow squares, fine broken contours, body-anchored marks, no flashing, smooth eased transitions and complete readable silhouette. Do not import the generic reference chair as scene geometry.

Lead-owned figure subpass: `week4/app/src/crime-scene/{playback,figures,renderer}.ts` and focused tests. Reuse rig clips and the single playback clock; sample clip time deterministically so pause/scrub/reduced motion cannot drift. Camera/figure-to-chair staging and complete-chair admission remain subsequent parts of this approved pass, not completed by shader work. Preserve Escape pause/clear, focus return, source-photo access, stable selection/camera context and static reduced motion. The v10 GPU captures below verify the current subpass, not full-body staging or calibrated motion performance.

Read-only `eva-researcher` audit found the current tag-based catalog/review cannot select between immutable rejected and new chair candidates. Treat that as an implementation finding, not new owner authority: preserve rejected assets, bind any new candidate to exact source/output/fit hashes, and keep candidate review separate from registration. Provider output limits and licensing/retention terms need verification before chair submission. No chair admission code has changed.

Matching before-state is the retained v8 1440 × 960 / DPR 1 recording and [paused checkpoint](implementation/before/walkthrough-paused.png). The v10 [paused after checkpoint](implementation/after/walkthrough-paused.png) uses the same walkthrough viewport/state and shows the matrix figure, still cropped at head and feet. The [evidence return](implementation/after/walkthrough-evidence.png) retains source-photo access. Full-body staging and multi-angle complete-chair captures remain missing; v9's intermediate checkpoints remain retained separately.

## Figure subpass evidence

- `playback.ts`: smoothstep interpolation for actor/object transitions; actor-local elapsed time does not reset at same-pose keyframes and stops at scenario duration. Reduced motion uses static representative poses.
- `figures.ts`: sample rig clips from timeline time rather than frozen clip frames. Loops wrap deterministically; single-shot clips clamp, and lie remains the final clip pose. No second clock, clip download or dependency.
- `renderer.ts`: figure-only shader branch uses sparse, antialiased hollow squares anchored in bind space, restrained teal/cyan and broken contours. No temporal sparkle in that branch; measured scan and object materials keep their existing branches. The v10 captures below verify this branch renders on L4; they do not establish physical accuracy.
- RED: two new focused behavior tests failed on the original frozen clip and linear interpolation. GREEN: focused suite 17/17. A real Three mixer/track test exercises forward time, backward seek, repeated paused draws, same-pose keyframes, terminal hold and reduced motion without rendering.
- `npm test` after review fixes: **103 core + 333 app tests passed**, zero failed/skipped; [full log](implementation/offline/matrix-final-tests.log).
- `npm run typecheck` after review fixes: passed; existing Rust warnings remain for `STRIDE`, `stance`/`contact`, and `finite`; [full log](implementation/offline/matrix-final-typecheck.log).
- `npm run build` after review fixes: passed; the same Rust warnings and Vite's >500 kB chunk warning remain; [full log](implementation/offline/matrix-final-build.log). Build does not compile GLSL on a GPU.
- Independent read-only `eva-reviewer` (reported resolved route `claude-opus-5-5[1m]`) identified frozen incoming loops and prematurely completed reach/strike gestures. Both reproduced in a real mixer regression (expected `[.2109375, 1.5]`, actual `[.6328125, .5]`) and were fixed: loop entry samples backward from the arrival phase, gestures hold their semantic anchor, fall continues and lie stays at its endpoint. Final focused suite **18/18**; changing-pose continuity, one-shot hold and terminal poses now covered. No second review ran.
- Reviewer grid-unit concern checked against retained GLB metadata: mesh-local height 1.829178 with no centimetre-to-metre mesh scaling. Packet-status findings were already corrected while the review ran. Foot contact/distance-matched gait remain unverified; v10 supplies shader captures but no no-sliding claim is made.
- Packet check: local links, scoped whitespace, 288/400 credit arithmetic and both generated-media hashes passed; `git diff --check` passed with existing LF/CRLF warnings.
- The offline figure work made no provider call or scene render. The subsequent v9 cloud attempt failed before returning figure evidence; the separately approved v10 succeeded below. Perceived smoothness, physical rig contact and native performance remain unverified. Full-body framing, chair-relative staging and the earlier floor offset are still outstanding. No complete chair candidate exists.

## Modal result — v9

The owner requested the next Modal execution, then selected **Approve v9** after the exact plan/hash, $2 operational allowance, resources, upload and retention limits were presented. Its single attempt is consumed: walkthrough failed, cleanup confirmed. Actual billed cost is unverified.

- [Plan](../../../../.local/reconstruction/crime-scene-browser-v9/plan.json): SHA-256 `7a3725d242a853ae50848186fceac6fda3677aea6469229119a8f6cde5ad752d`; 117 snapshot files, 45,680,654 bytes. Source/snapshot/adapter/cleanup bindings verified.
- One L4, four CPU cores, 16 GiB; 600-second function, 300-second startup and 1,200-second client deadlines; one container, no automatic retries; proposed **$2 operational allowance**, not a provider-enforced dollar cap.
- Existing real canned walkthrough/video and separate fixture smoke, including shader-error detection and playback/reduced-motion checks. Current source is recorded as-is: no chair generation, live reasoning, full-body framing repair or inferred quality acceptance.
- Private network-isolated worker, no provider secrets, volumes or public endpoint. Only catalogued public scene assets and the explicit application snapshot are uploaded; provider-managed cache retention is possible. Cleanup must confirm the owned app stopped with zero tasks.
- Adapter output reservation advanced to v9; v8 adapter retained with its consumed evidence. Eleven cloud-adapter tests passed. No frontend edits for this preparation.
- [Receipt](../../../../.local/reconstruction/crime-scene-browser-v9/receipt.json): transport returned evidence, but the technical result is **failed**. GPU-device/Vulkan checks exited 0; [remote unit log](../../../../.local/reconstruction/crime-scene-browser-v9/returned/unit.log) reports 46/46 passed. The walkthrough exceeded its 90-second subprocess deadline; fixture smoke did not run.
- Six intermediate PNGs returned, through the [canned answer](../../../../.local/reconstruction/crime-scene-browser-v9/returned/walkthrough-answer.png). Lead inspected that screenshot: measured room and disclosed authored answer are visible, but no figure. No finalized WebM, paused/evidence checkpoint or walkthrough report returned; walkthrough log is empty. The exact blocking operation and cause remain unknown, not a proven shader failure.
- Cleanup confirmed app `ap-k1E5NPTWm4jz4zp42t5TDh` stopped with **zero tasks**. Client exit 0 means evidence transport completed, not that the walkthrough passed. The subsequent heartbeat conflict reports an already-stopped app, not the walkthrough's cause.

## Offline diagnostic follow-up — 2026-10-28

- Lead changed only the walkthrough driver, its test and the cloud output reservation/test. Existing application visuals, figures and scene data are unchanged; no provider call, new cloud execution or local rendering.
- Confirmed evidence-loss defect: the driver wrote its report only after browser cleanup, which the outer deadline can interrupt. A stalled-screenshot regression first failed with a missing report; it now verifies real on-disk progress plus console/page errors before capture completion. The driver checkpoints figure opening/loading, rewind/play/advance/pause, reduced motion and recording cleanup. Failure state is saved before attempting the failure screenshot; success is recorded only after cleanup finishes. This fixes observability, **not the unresolved v9 stall**.
- Focused walkthrough tests: **3/3 passed**; script syntax check passed. Full `npm test`: **103 core + 334 app passed**, zero failures/skips ([log](implementation/offline/matrix-diagnostics-tests.log)). `npm run typecheck` passed with the same three Rust warnings ([log](implementation/offline/matrix-diagnostics-typecheck.log)). Eleven cloud-adapter tests passed. Production build was not rerun for this non-UI change; the subsequently approved GPU exercise is recorded below.
- [Prepared v10 plan](../../../../.local/reconstruction/crime-scene-browser-v10/plan.json): SHA-256 `4ec4f7186fe9941b474b4971d7cbb11b4f262202567f5e40648145febe017cea`; 117 snapshot files, 45,683,628 bytes. Owner subsequently selected **Approve v10** for this exact plan and one-attempt $2 operational allowance on 2026-10-28; its single attempt passed and cleanup was confirmed below. One L4/four CPU/16 GiB, unchanged 90-second walkthrough, 600-second function/300-second startup/1,200-second client limits, no retries; allowance is not a billing cap. Same isolated upload/privacy/retention scope as v9; no further attempt is authorized.
- Follow-up diagnosis before v10: the actual retained GLB parsed all 46 clips and sampled 248 timeline frames plus reduced motion with finite world matrices in a CPU-only probe; this did not render the scene or establish GPU behavior. All 21 focused playback/figure/driver tests passed. A separate read-only `eva-reviewer` (reported `claude-opus-5-5[1m]`) found no proven stall cause; it confirmed the UI/driver/assets are unchanged between v8/v9 and identified first figure draw or browser cleanup as hypotheses. No speculative shader change was made.
## Modal result — v10, 2026-10-28

- [Receipt](../../../../.local/reconstruction/crime-scene-browser-v10/receipt.json): **passed**, with 47/47 remote unit tests, real canned walkthrough in 36.03 seconds and separate fixture smoke in 74.09 seconds. ANGLE/Vulkan reports NVIDIA L4. [Walkthrough report](../../../../.local/reconstruction/crime-scene-browser-v10/returned/walkthrough.json) reaches `complete` with eight captures and no recorded browser errors; [checkpoints](../../../../.local/reconstruction/crime-scene-browser-v10/returned/walkthrough.log) preserve playback and cleanup progress.
- [Fixture smoke log](../../../../.local/reconstruction/crime-scene-browser-v10/returned/smoke.log) verifies keyboard/focus, emulated touch, cancellation/continuity, clock-driven figure change, pause/clear and static reduced-motion stepping. These are browser/synthetic checks, not native performance or forensic validation. No provider call occurred.
- [Returned recording](../../../../.local/reconstruction/crime-scene-browser-v10/returned/walkthrough.webm): VP8, 1440 × 960, 25 fps, **34.20 seconds**, 4,136,207 bytes; SHA-256 `ff799520c70bb3209f74273e65ab771300c5e20bfa063b355c80565f89bc4d5f`. `ffprobe` metadata and full `ffmpeg -v error -i <recording> -f null -` decode passed. Lead inspected paused/evidence checkpoints and [24 chronological samples](implementation/after/playback-samples.png), 4 fps over seconds 25–31: matrix marks follow the changing gesture, followed by a stable pause. Sampling is not full-rate perceptual smoothness or an app frame-rate measurement.
- Source/plan bindings verified; paused/evidence captures retained byte-exactly. The figure still dominates the close chair view and is cropped at head and feet. Original evidence photo remains accessible after clearing playback. Complete chair, full-body framing, chair-relative staging, floor alignment and contact/gait calibration remain unfinished.
- App `ap-igm6W6OWHgRHE2mCZ8e2xI` confirmed **stopped with zero tasks**. The one-attempt approval is consumed; actual billed cost is unknown. No further cloud attempt is authorized.
- v10 ran the same app source as v9 with an instrumented driver. Playback worked in this run; the intermittent v9 timeout was not reproduced or diagnosed. Only the lost-diagnostics defect is claimed fixed.
- Next owner exercise: watch the recording and compare before/after paused captures for matrix readability and motion; assess framing and chair completeness separately. Quality acceptance remains **pending**.
