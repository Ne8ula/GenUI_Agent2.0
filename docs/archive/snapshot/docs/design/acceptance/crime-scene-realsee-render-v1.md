# Realsee panorama integration and render

Date: 2026-10-28 (session date; provider timestamps may be 2026-10-29 UTC). **Owner acceptance: pending. Actual Modal render: captured and inspected; visual/performance issues remain.**

## Scope and revision

Base HEAD `0380e13efbdfa8c1ee29fe2c621927852b7766b7`, dirty shared `crimescene` checkout. Preserve concurrent work, source assets, both GLBs and old receipts. HEAD alone is not the tested revision. Main coordinator: session-reported GPT-6 Astra; one `eva-researcher` read-only capture audit and one `eva-reviewer` requested with Opus for independent review. Configured routes are not proof of backend model identity. No delegated file writers.

Scope: actual supplied Realsee v2 GLB inside EVA's crime-scene route. No new inference, scale, scan registration, geometry repairs, chair generation, Kimodo, choreography or physics. Existing measured scan/photo viewer remains separate; no scan markers are applied to the unaligned GLB.

Candidate: `.local/reconstruction/ffs-th0028-realsee-v2/scene.glb`, 1,222,872 bytes, SHA-256 `138e407bcff0ca2c241860b80f48486bcafeb36038123099c0ca73a116fe5815`.
Report: adjacent `report.json`, 4,780 bytes, SHA-256 `55fc8a867152a586eebd044652186771ed7e6c319f4d7c0832c80d7b65b5765b`.
All 18 recorded input-file sizes/hashes rechecked unchanged in this session; source bundle identity remains `d5d16cc57dda4451f137031cd20d75555bd0cb03a298cbaa8f04137e002fd007`. [Original import evidence](crime-scene-realsee-import-v1.md).

## Changes and decisions

- `week4/app/src/crime-scene/panorama.ts`: reuse verifiedMesh and installed Three.js GLTFLoader/OrbitControls. Exact candidate identity, embedded-only resources, both decoded textures required; abort/late-load disposal; preserve existing Y-up root, compute overview from world bounds. Neutral PBR hemisphere lighting and two-sided display are approximations, not new surfaces.
- `PanoramaApp.tsx`, `panorama.css`, `week4/app/src/App.tsx`: panorama route entry, fixed inferred/unaligned/needs-review and unknown-units/surfaces labels; direct camera controls, pause, reset, cancellation/reopen; separate original evidence view and retained panorama camera. Reuse existing crime-scene typography/colors and scan/photo UI. No autonomous animation.
- `scripts/room_workflow/ffs-resources.json`: two separate hash/size-bound candidate entries; measured `scene.ply` and original catalog entries unchanged.
- `scripts/room_workflow/crime_scene_browser_cloud.py`: optional `--panorama` mode, distinct output folder, filtered snapshot (candidate/report, measured scan/tags and 13 original photos; no depth, generated object, figure or review assets), sealed source/snapshot hashes, existing bounded receive and one-use reservation/cleanup. Original v10 output remains untouched.
- `week4/app/scripts/crime-scene-panorama-capture.mjs`: real broker/browser verification, NVIDIA-only, 2560×1440 viewport at DPR 1, embedded texture upload checks, original evidence, keyboard/pause/reduced motion, camera continuity, narrow viewport, cancellation/reopen, bounded navigation frame sampling and screenshots/video. Native screenshot size is not a claim that the room canvas occupies the entire viewport or that the video is encoded at 60 fps.
- Focused tests: `realsee-resource.test.mjs`, `crime-scene-panorama*.test.ts`, panorama snapshot additions in `test_crime_scene_browser_cloud.py`.

Ruling: use the existing isolated crime-scene entry capture rather than upload unrelated application routes. It exercises the same production scene component, not the full multi-route shell; full-shell evidence remains not checked.
Ruling: free camera movement is inspection, not collision-aware or calibrated walking. No inferred physical eye height or wall collision.

## Fresh visual gate and spending

[Inspected Weave packet](../revisions/crime-scene-realsee-v1/REVIEW.md) / [provenance](../revisions/crime-scene-realsee-v1/provenance.json): one still (5 credits) and one four-second Seedance 2.5 video (112 credits), separately and explicitly approved, submitted once each. **117 credits charged**. Text-only fictional references, no private-source upload. No resubmission. Provider output inspected, mistakes rejected in guidance before frontend edits.

Modal execution, cloud image dependency installation and upload remain **unapproved**. Proposed one L4, 4 CPU, 16 GiB; 600-second function, 300-second startup, 1,200-second client timeout, one container, no retry, 64 MiB input/return caps and 40 returned files. Official [pricing](https://modal.com/pricing) read in this session: L4 $0.000222/s, CPU $0.0000131/core/s, RAM $0.00000222/GiB/s. Conservative 4 physical cores +16 GiB +L4 totals $0.00030992/s (~$0.186/600s, ~$0.279/900s), excluding build/cache/egress. Proposed $2 operational allowance is **not** a provider-enforced dollar cap. Final sealed plan/hash and exact input size must precede approval. No local scene rendering or local installation.

## Checks so far

- Importer/artifact/Argus offline tests: **86 run, 84 passed, 2 skipped**, no failures. No checkpoint research/execution.
- New resource admission + existing crime-scene broker: **15/15 passed**; missing candidate admission observed failing before catalog edit.
- New panorama tests: **4/4 passed**; loader/component absent before implementation. VM lifecycle test initially stopped before the async load began; corrected to await an explicit entered-load signal, not arbitrary microtasks.
- `npm test`: **103 core +338 app =441 passed**, zero failures.
- `npm run typecheck`: passed (three pre-existing Rust warnings during its build hook). Direct `node week4/node_modules/typescript/bin/tsc --noEmit -p week4/app/tsconfig.json` also passed after edits. An intermediate `npm exec` invocation used the wrong cwd and reported TS5058; corrected command above passed.
- Existing Modal client found at `.local/reconstruction/genrc-client/Scripts/python.exe`; `-I -m unittest discover -s scripts/room_workflow -p "test_crime_scene_*cloud.py"`: **12/12 passed**, including SDK construction without submission. System Python/other reconstruction venv lack Modal; no installation performed.
- `node --check week4/app/scripts/crime-scene-panorama-capture.mjs`: passed. This is syntax, not browser evidence.
- `git diff --check`: passed; LF/CRLF warnings only.
- `npm run room:test` baseline: **205 passed, 2 skipped, 0 failed (207)**. Latest post-change run: **204 passed, 3 failed, 2 skipped (209)**. Same unchanged CPU-worker tests fail: `actual isolated Python replay returns only needs-review with resource evidence`; `exact host bindings, unknown authority and missing manifest reject`; `configuration and failed spawn release the lock without claiming uncertain execution`. Each reports `CPU idealization failed, timed out or was cancelled.` at `cpu-review-worker.mjs:29:44`. Cause unproven; no guard weakened. A subsequent isolated `node --test --test-concurrency=1 scripts/room_workflow/scan-assisted.test.mjs` passed all six tests (13.36 seconds), including the three failures above; this does not establish their full-suite cause. Do not claim consistently green room regression.

Local logs: `C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-ClaudeAgent-GenUI-Agent\9166d11d-2ded-4fd9-aa1e-b63555befbc5\scratchpad\realsee-npm-test.log`, `C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-ClaudeAgent-GenUI-Agent\9166d11d-2ded-4fd9-aa1e-b63555befbc5\scratchpad\realsee-room-test.log`, `C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-ClaudeAgent-GenUI-Agent\9166d11d-2ded-4fd9-aa1e-b63555befbc5\scratchpad\realsee-room-final.log`.

## Independent review and fix pass

Read-only `eva-reviewer` completed (runtime-reported Claude Opus 5.5, `claude-opus-5-5`); no tests, browser or Modal execution by the reviewer. Lead verified the findings against source. No second review dispatched.

- **Fixed:** diagnostic starvation on media overflow. Extracted the existing bounded sender, preserving hash/chunk/cap validation, and ordered JSON/logs before PNG/WebM. A 65 MiB sparse-file regression failed with missing `result.json` under the old ordering and passed after the fix. Oversized media still fails closed; no raised allowance or silent partial-success claim.
- **Capture assertions added, not yet run:** mouse orbit and wheel zoom, touch-enabled 390px button taps with changed-image checks; pinch/right-drag and physical touch hardware remain unchecked. Reuse the same browser context and resource bounds.
- **Capture assertion strengthened, not yet run:** cancellation now waits until the GLB request enters its held route, rather than potentially cancelling only the earlier session request.
- **Fixed component identity; GPU check pending:** Reopen changes the canvas key. The emitted-component regression failed when the old canvas identity was reused, then passed. The planned Modal capture explicitly loses the graphics context, reopens and requires a new canvas plus ready state.
- **Ruling:** the reference packet covers these fixes within the same unaccepted panorama pass; no new design direction, generation, geometry or motion. Existing inspected references and all assets retained.
- **Ruling:** this is the first Realsee viewer implementation, so no runnable Realsee before-state exists under DESIGN.md's first-implementation exception. The original-scan capture includes the new return bar and is a separate source comparison, not a fabricated unchanged baseline or camera registration. Cost/limit: no visual regression claim against an unchanged scan shell.
- **Deferred minors:** duplicated capture-output path (actual integration will verify receipt location); generic notebook wording if session startup fails; Inside-view orbit instead of in-place yaw; retaining the current camera on resize rather than automatically reframing (Reset reframes); direct loader transform/external-URL tests beyond the existing exact-hash, framing and quaternion guards. No broader navigation redesign or extra abstractions.

Post-review checks: **442 application tests passed** (103 core +339 app); **5 panorama tests passed**; **13 cloud-adapter tests passed** without submission; TypeScript and capture syntax passed. Full room suite rerun again: **204 passed, 3 failed, 2 skipped**, the same three CPU-worker tests documented above. No root-cause claim or weakened guard. Logs: `realsee-review-tests.log` and `realsee-review-room-tests.log` in the session scratchpad directory named above.

## Sealed local proposal — not approved

Local-only preparation produced `.local/reconstruction/crime-scene-realsee-render-v1/plan.json` and its `snapshot/`. **74 files, 35,719,754 bytes**; every snapshot hash checked against the plan. No `receipt.json` exists; no upload, image build or Modal submission occurred. Plan SHA-256:

`7cecfa2ec3eeeb73edc5f4001cfdbafc39cce1c07fd4a92e3d6f05b2ce52765e`

Proposed upload: hash-listed scene code/broker/tests plus Realsee v2 GLB/import report, measured PLY/tags and 13 original photos. No source ZIP/OBJ, credentials, private vault/notebook state, depth, chair/figure models or unrelated app routes. The report includes the source project URL. The exact file list and source hashes are in the local plan.

Proposed execution remains **one L4, 4 CPU, 16 GiB**, one single-use container, no retries; 600-second runtime, 300-second startup and 1,200-second client deadline. Output: 2560×1440 DPR 1 screenshots, 390px touch-enabled check, WebM, diagnostics and frame timings; maximum 40 files /64 MiB returned. 60 fps is a measurement target, not a guaranteed result or video frame rate.

Cloud-only image build: `mcr.microsoft.com/playwright:v1.56.1-noble`, Python 3.12, apt `vulkan-tools`/`libvulkan1`, and npm with install scripts disabled: Playwright 1.56.1, Vite 7.3.7, TypeScript 5.9.3, React/React DOM 19.3.0, Three 0.180.0, Ajv 8.20.0 and IBM Plex Sans/Mono +Space Grotesk fonts 5.3.0. Top-level npm versions are pinned; apt/transitive resolution and the image tag are **not a full immutable dependency lock**. No local installation.

Estimate/allowance: ~$0.186 for 600 seconds or ~$0.279 for 900 seconds of the stated compute, excluding build/cache/egress; proposed **$2 operational allowance, not a provider-enforced dollar cap**. No model inference/provider calls. Browser traffic restricted to loopback; worker network blocked; no secrets, persistent volumes or public endpoint. Cleanup stops only the newly owned app and verifies stopped/zero tasks, preserving local sources/receipts. Provider-managed upload/image caches may persist; deletion cannot be promised. An uncertain stop or submission is not retry authority.

## Execution approval — 2026-10-28 session date

Owner explicitly approved: “Approve the modal upload, cloud build and render proposal with the operational allowance.” This authorizes only plan SHA-256 `7cecfa2ec3eeeb73edc5f4001cfdbafc39cce1c07fd4a92e3d6f05b2ce52765e`, one upload/build/render attempt with the stated $2 operational allowance and cleanup; no retry or new inference. The sealed plan remains byte-identical, including its pre-approval metadata. Immediately before invocation, plan/adapter/cleanup/snapshot hashes matched and no earlier receipt existed. Execution started through the existing Modal client; final receipt and cleanup are pending. Earlier “unapproved” statements above describe preparation, not the current authorization state.

## Modal outcome — failed, no render evidence

- Approved attempt: app `ap-1s6wLAJd8UOgeHR9gmY0tq`, function `fu-0bjYc63mdQ7sXvFwoN3tVa` (`verify`, 1 × L4). Provider lifecycle reports created 2026-10-28 21:04 and stopped 21:24 Eastern Daylight Time.
- Local client reported successful snapshot/adapter upload and function creation. It then reached the **1,200-second client timeout while awaiting the evidence generator**. Receipt status: `failed-or-uncertain`, `error_type: TimeoutError`. This does not establish whether a worker or renderer began; no root cause, queue delay or GPU execution claim is supported.
- `.local/reconstruction/crime-scene-realsee-render-v1/returned/` contains **zero files**. No screenshots, video, frame timings or worker result were retrieved; nothing is available for visual inspection.
- Receipt cleanup confirms `state: stopped`, `tasks: 0` for that exact owned app. Subsequent read-only `modal app info` independently reports stopped. A bounded `modal app logs --tail 200 --timestamps --show-container-id` retrieval returned only the stop event, no worker diagnostics. “user stopped from CLI” is the provider's label for the adapter's authorized cleanup, not evidence of a new user instruction.
- The **one-attempt approval is consumed**; no resubmission, extended timeout, additional spending or new installation is authorized. Actual billed cost was not exposed by these diagnostics and remains unverified; the $2 allowance was operational, not a provider-enforced cap.
- Retain plan, snapshot, receipt and inputs unchanged. Local client log: `C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-ClaudeAgent-GenUI-Agent\9166d11d-2ded-4fd9-aa1e-b63555befbc5\scratchpad\realsee-modal-approved-run.log`. Provider log: `C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-ClaudeAgent-GenUI-Agent\9166d11d-2ded-4fd9-aa1e-b63555befbc5\scratchpad\realsee-modal-provider-logs.txt`.

## Read-only diagnosis — scheduling, not renderer execution

The owner's follow-up requested diagnosis. Opened only this app's authenticated Modal dashboard and queried its existing call graph through the installed SDK; no new job or retry. New evidence supersedes the initial uncertainty about whether rendering started:

- Call `fc-01M62JZ7Y5Y21K4FKPH9R49GCK`, input `in-01M62JZ7Y8X97373VDGGGP76Z2`: **“No container assigned”**, status **Cancelled**. Created 2026-10-28 21:04:13.253 EDT; finished at cleanup 21:24:11.457 EDT. Started/execution duration are blank. The `0ms` in the call table is **startup**, not execution time.
- Container history: **“No matching containers found.”** Call logs: **“No logs found.”** Independent SDK `FunctionCall.from_id(...).get_call_graph()` returned `task_id: ""` and no children, corroborating no assigned container.
- Actual function details show L4, max containers **1** (not zero), CPU request/limit 4 cores, memory request/limit 16,384 MiB, default cloud/region, timeout 600s, network blocking enabled. Those inspected settings match the proposal.
- This app's usage page currently shows **$0.00 over the last 24 hours**, no usage, and 0 B network egress. This is observed dashboard usage, not a final-invoice guarantee.
- **Conclusion:** the call waited unassigned for approximately 19m58s until the 20-minute client deadline triggered cancellation and cleanup. The worker, browser, GLB load and renderer did not execute. Their code cannot explain an observed in-container failure because there was no container assigned to this call.
- **Still unknown:** why Modal did not allocate a container. L4 capacity, account quota/billing restriction and scheduler fault are possibilities, not verified causes. The inspected records expose no scheduler rejection reason. Do not patch rendering code, raise timeouts or assert a GPU shortage based on this evidence.
- Official [timeout documentation](https://modal.com/docs/guide/timeouts) explicitly excludes scheduling time from function timeout. Its startup-timeout description does not explicitly settle pre-assignment queue coverage. Thus the 600s render timeout is not evidence that rendering ran; the observed ending was the separate client deadline.

Local structured evidence: `.local/reconstruction/crime-scene-realsee-render-v1/diagnosis.json`, including inspected dashboard facts, SDK call-graph result and screenshot paths. Next useful step: a read-only scheduling/quota investigation with Modal or a support enquiry using the exact app/call IDs, before proposing another paid attempt. No support message sent, no new execution, no runtime source changes. The diagnostic browser tab was closed.

## Allocation/quota follow-up and second proposal — approval pending

Owner requested a read-only allocation/quota check followed by a new proposal. Authenticated workspace resource limits, all-environment metrics and usage/budget pages were inspected without changing settings. Current usage is zero containers and GPUs; displayed 30-day peaks remain below current concurrency limits. Visible usage/spend limits are not exhausted. Exact private account figures and inspected URLs are retained in `.local/reconstruction/crime-scene-realsee-render-v2/allocation-check.json`, not uploaded in the snapshot. Remaining credits do not constitute execution permission.

The [provider status page](https://status.modal.com/) reported all listed components operational (page update 2026-10-29 03:02 UTC), with no October 28–29 incident listed. Neither those pages nor [GPU documentation](https://modal.com/docs/guide/gpu) expose live L4 fleet capacity or this call's allocation rejection reason. Current headroom does not prove historical settings or exclude hidden restrictions. **Root cause remains unknown; no quota increase, billing change or renderer fix is justified by these observations.**

Ruling: propose one controlled repeat using the same L4 configuration, default region/cloud, exact scene snapshot and capture tests. This preserves the comparison and avoids speculative GPU fallback, weaker isolation, extra generation or timeout increases. Cost if the allocation issue persists: another bounded wait with no render evidence. A second allocation failure should go to provider investigation rather than an automatic third attempt. No support message sent.

New local-only proposal: `.local/reconstruction/crime-scene-realsee-render-v2/plan.json`.

- SHA-256: `b6a473d04afe01b31451ca4df9de8f595988038e369f92d60b2be0b00c44e0fb`.
- **74 files /35,719,754 bytes**, every snapshot and source hash identical to attempt one. Inputs remain Realsee v2 GLB/report, measured PLY/tags, 13 original photos and the reviewed application/broker/tests. No additional private inputs, credentials, account diagnostics, unrelated datasets or generated objects.
- **One additional upload/build/render submission**, one single-use L4 container, 4 CPU, 16 GiB; 300-second startup, 600-second function timeout, 1,200-second whole-client deadline including build/queue/receive. No configured retries, GPU fallback, local rendering or local installation. The already-inspected Weave packet covers the same unchanged panorama implementation; this is not a new UI pass.
- Cloud image/dependencies remain exactly as listed in the first proposal above: Playwright image 1.56.1, Python 3.12, Vulkan apt packages and pinned top-level npm dependencies. Provider cache reuse is possible, not guaranteed; image tag/apt/transitives remain incompletely locked.
- Same evidence: 2560×1440 DPR 1 screenshots, WebM, GPU/texture checks, navigation/keyboard/pause/reduced-motion/390px touch-button/cancellation/context-recovery checks and frame timings; **40 files /64 MiB maximum**. Inspect actual returned images/video before claiming visual quality; no guaranteed 60 fps.
- Current official prices rechecked unchanged. Conservative stated-resource compute estimate: **$0.186/600s or $0.279/900s**, excluding build/cache/egress. Request **$2 additional operational allowance**, not a provider-enforced dollar cap; remaining credits may not cover the full allowance. Existing workspace billing limits remain untouched and are not a per-attempt cap.
- Cleanup stops only the newly owned app and verifies stopped/zero tasks. Preserve both attempts' plans, snapshots, receipts and all original assets. No volumes, public endpoints or runtime provider calls; provider-managed caches may persist. An uncertain stop is not permission to retry.

Preparation reused the existing `prepare(output=..., panorama=True)` helper with the fresh output directory; no runtime source changes. Assert-based checks verified identical snapshot/source/package/resource/adapter/cleanup identities, exact counts/bytes, first plan/receipt unchanged and no second receipt/submission. Recheck those identities and current quota/billing headroom immediately before any approved invocation; invoke `execute(approved_hash, output=<v2 directory>)` explicitly because the unchanged `--panorama` CLI still targets the consumed v1 directory. **Proposal only: second execution is not approved or started.**

## Second execution approval — 2026-10-28 session date

Owner replied **“Approve.”** to the second finite proposal above. Approval binds only plan SHA-256 `b6a473d04afe01b31451ca4df9de8f595988038e369f92d60b2be0b00c44e0fb`, one additional upload/build/L4 render attempt, its $2 operational allowance and cleanup. No further retry, billing change, GPU fallback or new inference. The pre-submission check verified every source/snapshot/adapter/cleanup hash and the inspected Weave output identities, with no second receipt yet. The sealed plan's pre-approval metadata remains unchanged; this recorded owner instruction provides authorization. Outcome pending.

## Second attempt outcome — rendered, quality not accepted

- App `ap-NYASUKRlqfdQMVa2xqRa0o`, function `fu-ElDmjna50zj6OawIUnsgXQ`, one L4, created 23:09 and stopped 23:10 EDT on 2026-10-28. Receipt status `evidence-returned`; worker status `passed`. The identical configuration succeeded on this submission, but that does not prove the first allocation failure's cause.
- Returned **17 files /7,218,386 bytes** under `.local/reconstruction/crime-scene-realsee-render-v2/returned/`: nine PNG captures, one WebM, JSON and logs. SHA-256/size inventory and inspection findings: adjacent `evidence-manifest.json`. All image dimensions verified: desktop 2560×1440; mobile full-page 390×1053 from a 390×844 viewport. Actual desktop WebGL drawing buffer is **2560×1130**, not full 1440p canvas height.
- **52/52 remote unit tests passed**, zero failures/skips. NVIDIA L4 Vulkan renderer confirmed; both 2048×2048 and 1024×1024 textures uploaded; exact candidate GLB hash matched. Mouse orbit/wheel, keyboard focus/pause, evidence round-trip camera continuity, reduced-motion stability, touch-enabled button taps, held-download cancellation/reopen and fresh-canvas context recovery passed. Browser error list empty. Inside/reset is only an exercised control path, not a successful interior-visibility assertion.
- Worker step durations: GPU 0.33s, Vulkan 1.24s, unit tests 3.69s, Vite 0.46s, walkthrough 27.82s. These are step measurements, not a billed-duration estimate.
- **Actual visual finding:** overview is a photo-textured incomplete shell with conspicuous open/warped surfaces. The Inside-view screenshot is nearly featureless, with the scene area filled by a close-looking surface rather than a usable room interior. Its precise camera/geometry cause is not yet diagnosed. Do not accept the interior experience merely because capture assertions passed. Separate measured scan and original tag-18 photo are visibly available; they are not registered to the GLB. Mobile, reduced-motion, reopened and recovered captures retain the scene and controls.
- **60 FPS target not demonstrated:** 150 recorded navigation samples after 30 warmups; mean **23.14 FPS**, median **49.9ms**, p95/max **50.1ms**, all samples over 16.67ms. Mean dispatched draw plus synchronous GPU finish: **0.563ms**. Video recording and browser scheduling were active; these results do not isolate a rendering bottleneck or predict unrecorded/native performance. No unrecorded run was authorized or performed.
- Actual WebM: VP8, **2560×1440, 24.28s, 25 FPS, 607 decoded frames**, 3,075,664 bytes. SHA-256 `292fd90e4ebacdd8dd5cd85e6abb5b0e2fc003fe18bc8b2739277ce915cfa20b`. Local CPU decoding only; inspected 25 sequential samples at one-second spacing and the nine-still contact sheet, plus individual overview/inside/turned/mobile/scan/photo captures. Contact sheets retained privately in `crime-scene-realsee-render-v2/inspection/`. Sampling is not continuous smoothness verification. Recording contains automated orbit tests, loading/evidence switching and viewport transitions, not a polished user walkthrough.
- Cleanup receipt: **stopped, zero tasks**; independent `modal app info` confirms stopped. Client logged `ConflictError: App state is APP_STATE_STOPPED` from a heartbeat after intentional cleanup; evidence had returned, final command exited 0, and shutdown was independently confirmed. Actual billed cost remains unverified. Both finite approvals are consumed; **no third attempt authorized**.

## Render evidence and decision

The second approved Modal attempt completed real GPU rendering and returned inspected evidence. Integration and bounded interaction checks are evidenced; **visual quality remains unaccepted**, especially Inside view, and the recorded run did not meet the 60 FPS target. Owner acceptance remains pending. Next useful work is to diagnose interior framing/occlusion and separately isolate recording/scheduling overhead before proposing any changed visual pass or further paid measurement. Existing full-room-suite CPU-worker failures remain as recorded above; no claim that they were fixed or rerun here. No runtime/UI code changed during this execution/inspection, no new inference, commit, publication or destructive cleanup. Physical scale, scan alignment and unseen surfaces remain unverified.
