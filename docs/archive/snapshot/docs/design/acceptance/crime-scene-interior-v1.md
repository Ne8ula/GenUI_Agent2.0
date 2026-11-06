# Interior-first panorama acceptance — pending

Date: 2026-10-29. Owner decision: **pending**. No corrected-scene Modal capture exists yet. Approval of the fresh visual-reference gate is not acceptance of this implementation or authority for a new Modal run.

## Scope and revision

Owner prioritizes the inside of the room over the exterior. The pass changes only panorama camera/navigation, related tests and capture preparation. The GLB remains `138e407bcff0ca2c241860b80f48486bcafeb36038123099c0ca73a116fe5815`, 1,222,872 bytes. No geometry repair, new objects, model inference, source registration or calibrated walking.

Source HEAD `0380e13efbdfa8c1ee29fe2c621927852b7766b7` plus dirty shared `crimescene` checkout; HEAD alone is not the tested revision. New changes are not committed or published. Prior baseline source and real captures remain in `.local/reconstruction/crime-scene-realsee-render-v2/`. [Fresh packet and provenance](../revisions/crime-scene-interior-v1/REVIEW.md).

## Changes

- `panorama.ts`: opening/reset uses the retained origin as an explicitly uncalibrated inspection viewpoint, looking +X, not the mesh-bounds center. Drag/turn looks from a stationary position; forward/back stays at the current height. Pause cancels the active drag; cancellation, lost capture, blur and disposal stop pointer input. No inertia or autonomous animation. Source geometry/material loading and verification unchanged.
- `PanoramaApp.tsx`: one Reset inside control replaces exterior reset plus redundant Inside view. Help/accessibility text describes look/move, not orbit/zoom. Original evidence and lifecycle/recovery behavior retained.
- `crime-scene-panorama-capture.mjs` and `panorama-quality.mjs`: interior-first/forward/reset capture checks, central image contrast sentinel, explicit pending visual acceptance. A successful screenshot alone no longer passes the interior check. Contrast cannot establish a recognizable or accurate room.
- `crime_scene_browser_cloud.py`: includes the capture-check helper in the sealed snapshot; no resource, authority, execution, retry or spending-bound changes.
- Focused tests cover origin, stationary look, movement height, Home, paused input, pointer interruption/ownership, cleanup, flat-frame rejection and snapshot completeness. Component tests cover camera-save/cancellation and new canvas on reopen. The added CPU renderer lifecycle test covers restoration of non-home position, target and orientation after loading; GPU drawing and asset I/O are stubbed. The capture script now requires a non-home starting image before testing the evidence round trip, but has not run on Modal.
- [Scoped tested source hashes](../revisions/crime-scene-interior-v1/implementation-manifest.json) identify the ten implementation/test/packaging files; they do not replace a sealed full application snapshot. Whitespace, local links and the three reference hashes were checked.

## Verification performed

| Check | Actual result |
|---|---|
| RED before camera/control implementation | 9 expected failures, 2 passing existing checks |
| RED before contrast sentinel | 3 expected failures |
| RED before packaging inclusion | Panorama snapshot test rejected missing helper |
| `node --test week4/app/tests/crime-scene-panorama*.test.ts` | 17 passed after review fix |
| `npm test` | Week 4 foundation 103 passed; app 351 passed; 454 total, no failures/skips |
| In-memory restore mutations | Removing position restore, target restore or orientation update independently fails the new renderer lifecycle test; production file unchanged |
| `node week4/node_modules/typescript/bin/tsc --noEmit -p week4/app/tsconfig.json` | Passed; earlier compiler invocations used nonexistent root/app paths, corrected to installed `week4/node_modules` without installing anything |
| `node --check week4/app/scripts/crime-scene-panorama-capture.mjs` | Passed; syntax only, not browser execution |
| `python -I scripts/room_workflow/test_crime_scene_browser_cloud.py` | 9 passed, 1 skipped: Modal SDK construction check unavailable in that Python environment; no submission |
| CPU smoke of actual `framePanorama` against retained GLB, using Three.js Raycaster | Candidate hash unchanged. Nine frustum probes hit existing geometry 1.7617–2.5251 model units away; central ray 2.3482, versus previous 0.1979. No textures, WebGL or scene rendering used |
| Retained failed interior PNG, CPU decode/crop | New contrast sentinel rejected it at luma stddev 2.232, threshold 4. This replay used a central crop of the full image; the future browser check uses the canvas crop |

The private CPU scripts, JSON and test log remain in the session scratchpad. These are offline checks, not browser/native evidence. The earlier room-service suite's three CPU-worker failures were not rerun by `npm test`; they remain reported in the [prior render acceptance](crime-scene-realsee-render-v1.md).

## Owner exercise after separately approved Modal capture

At native 2560×1440/DPR 1, inspect the new opening interior, turn both ways, look up/down, move forward/back, reset, pause during a drag, switch to source evidence and return, cancel/reopen and recover a lost graphics context. Repeat keyboard, touch and reduced-motion checks. Inspect lossless PNGs and direct video, not a blurred VM desktop. The generated references are fictional guidance, not those actual scene captures.

Check room recognition, visible texture detail, openness/missing surfaces and whether movement remains understandable. Flat-frame detection is only a sentinel; it does not grant visual acceptance. Performance remains unverified; the previous 23.14 FPS result is not improved by assertion. Current capture timing still includes recording and synchronous GPU finish, not an isolated benchmark.

Before the approval below, no local scene rendering, new Modal upload/build/GPU/capture, full-shell verification or physical touch-device testing occurred in this pass. Both prior Modal attempts remain consumed. Free camera can cross surfaces and has no collision guarantees. Camera pose is uncalibrated, and holes/distortions in the supplied mesh remain.

## Fresh Modal capture approval — 2026-10-29

Owner requested interior appearance/navigation capture, then explicitly selected **Approve exact $2 attempt** for sealed plan SHA-256 `44d07507af00f365ee536657b3eaf47926b001fbc769f915d8063010e3443c5b` at `.local/reconstruction/crime-scene-interior-render-v1/plan.json`. Its pre-approval metadata remains unchanged; this approval binds only that plan and one new attempt.

Inputs: 77 files /35,734,144 bytes of hash-listed reviewed code/tests, unchanged Realsee v2 GLB/report, measured scan/tags and 13 original photos. No credentials, vault records, source archive, generated chair/figure assets or unrelated routes. One cloud image build and one single-use L4 container, 4 CPU, 16 GiB; startup 300s, execution 600s, entire client 1,200s; no retries. Cloud Playwright/Vulkan/npm setup only; no local install. Top-level versions are pinned in the plan; image tag, apt and transitive dependencies are not fully immutable.

Outputs: native 2560×1440 DPR 1 PNGs, WebM, navigation/continuity/interruption/recovery checks and logs; max 40 files /64 MiB returned privately. No guaranteed 60 FPS, full-shell or physical touch coverage. Inspect actual images/video before any appearance claim. Existing remote staging paths remain internal; returned evidence belongs to this fresh attempt.

Official pricing rechecked: L4 $0.000222/s, physical CPU $0.0000131/core/s, RAM $0.00000222/GiB/s. Conservative stated compute $0.186/600s or $0.279/900s, excluding build/cache/egress. **New $2 operational allowance, not a provider-enforced cap.** No inference, public endpoint, secrets or runtime external network. Stop only the newly owned app and verify stopped/zero tasks; preserve all source assets and receipts. Provider caches may persist. No retry on uncertain submission/cleanup.

Preparation verified every snapshot hash and scoped tested source hash. The existing Modal-client environment passed all **10 cloud adapter tests**, including SDK construction without submission. The earlier one-test SDK skip is resolved by using that environment, not installation.

## Capture outcome — capacity wait, no visual evidence

The one approved attempt uploaded the sealed snapshot and created app `ap-P757gHoZNKNyu1Khbn8bRx`, function `fu-ggYEkPaJb7iXXR7XjCuzsN` (one L4). It reached the **1,200-second client deadline** while waiting for the evidence generator; receipt status is `failed-or-uncertain`, `TimeoutError`. The fresh `returned/` directory contains **zero files**. There are no corrected-scene images, video, remote test results or timing measurements to inspect.

Bounded provider logs explicitly report at **01:01:06 and 01:15:07 EDT on 2026-10-29** that the function is waiting to be scheduled on a `GPU_L4` worker and Modal is acquiring capacity. At 01:18:28 the app stops. This is evidence of an L4 scheduling/capacity wait, not an observed renderer defect. No call graph was inspected, and this does not retroactively establish the cause of an earlier attempt.

Receipt cleanup confirms **stopped, zero tasks**; independent `modal app info` also confirms stopped (created 00:58, stopped 01:18 EDT). “User stopped from CLI” is the provider label for the adapter's authorized cleanup. Actual billed cost remains unknown. Plan/snapshot/receipt and the read-only diagnosis are retained under `.local/reconstruction/crime-scene-interior-render-v1/`; no source assets were changed or removed.

The one-attempt approval is consumed. **No retry, alternate GPU, longer deadline or additional spending is authorized.** Recommend provider capacity investigation before proposing another attempt; no support message sent. Interior appearance, browser navigation and owner quality acceptance remain pending.
