# Matched Matrix room check — desktop recording available; acceptance pending

2026-10-29. Continuation of the bounded reused-code Matrix correction. No new visual direction, model inference or application UI changes in this session.

## Scope and revision

Dirty `crimescene` based on `0380e13efbdfa8c1ee29fe2c621927852b7766b7`. Sealed upload plan SHA-256 `9ce5ea9d75df60e51bd5c7b599fbee2bf1be6b184b76622c5baa1c6807f3609a`; 35,771,692 bytes. The existing 70° FOV, sofa/chair heading, approximately 27° downward pitch, local text backplates and luminance-weighted Matrix v3 shader are now GPU-rendered together.

The original session record `776f0643-db66-4e6f-ad74-41f2ff84491e`, 2026-10-29T16:03:25.684Z, records the owner answering “Reuse code; waive Weave” to the bounded dithered Matrix correction. This check continues that correction only. No new Weave outputs or implied waiver for a redesign.

Changes are confined to `crime-scene-kiosk.mjs` (matched opening/mobile pairs, resume/full-sequence checks, opening-view handoff), `crime_scene_demo_cloud.py` (new v3 destination), its destination regression, and this evidence packet. Original assets, prior captures, receipts and concurrent application edits are preserved.

## Authorization

Owner selected **Approve one session** in this session: one T4/L4/A10G GPU in that availability order, one container, 4 CPU/16 GiB, 900-second worker, 300-second worker-start wait and 1,200-second execution-client timeout; upload and returned evidence each ≤64 MiB; $2 operational allowance, not a provider-enforced billing cap. Existing cloud dependency build permitted if uncached; no local installation. No automatic retries, renewal, volume or deployment. Temporary password-protected streamed viewer only. Provider cache retention and actual billed cost are unknown. Credentials and temporary viewer URL are excluded from repository evidence.

## Evidence and visual judgment

- [Desktop normal](implementation/after/opening-normal.png) and [desktop Matrix](implementation/after/opening-matrix.png): matching 1600×900, DPR 1, unchanged default camera. Both individually inspected. Sofa, overturned chair and cabinet form a readable desktop arrangement; chair legs are no longer buried under the full-width bottom shading. Matrix retains sparse hollow-square marks and dark negative space, but the chair and its legs remain low contrast. This is not semantic furniture/wall separation.
- [Portrait normal](implementation/after/mobile-normal.png) and [portrait Matrix](implementation/after/mobile-matrix.png): matching 390×844, DPR 1, same camera, reduced motion. Both individually inspected. Controls/text fit, but the chair is clipped at the right and the cabinet is outside the view. **Portrait composition does not meet the complete-chair target**, despite interaction/no-overflow checks passing.
- Nine PNGs retained. The other five are interaction captures; this review does not claim that each was visually inspected.
- Earlier v2 PNGs predate the current pitch/contrast correction and do not provide a matched normal/Matrix comparison at this opening angle. They remain untouched; no artificial before-state is presented.

## Verification

CPU: `npm test` passed 460 tests (103 foundations + 357 app); `npm run typecheck` passed. Cloud adapter suites passed 22 tests with no skips. `node --check week4/app/scripts/crime-scene-kiosk.mjs` passed. The v3 destination regression failed against v2 before the runner was changed.

GPU: [result](implementation/after/result.json) reports NVIDIA A10 via Vulkan, 1600×900 drawing buffer, 12 interaction checks passed and no reported page/shader errors. Checked opening toggle/restoration, explored-view replay continuity, pause/resume, source decode/Escape/focus, pointer/keyboard navigation, 390px touch/source dismissal/no overflow, reduced motion and the complete 28-second normal → scan → Matrix → photograph → normal sequence. Exact pixel restoration assertions cover the central crop, not the whole UI. This is a cloud browser check, not physical-phone testing or measured FPS/streaming latency.

## Live handoff and decision

Modal app `ap-Dg1cdPyEKNxfSRNqCB0eHg` started its worker at 17:39:17 UTC and handed off the live viewer at 17:40:00 UTC. The owner received the link/password immediately with recording instructions. The live viewer was left at the checked desktop opening view; no coordinator browser interaction or source change interrupts their recording.

Cleanup: [final receipt](implementation/after/receipt.json) confirms the session ended normally and app stopped with zero tasks. No retry or renewal was started; actual billed cost remains unknown.

Owner acceptance remains **pending**. Next owner exercise: record on desktop, judge chair leg readability and Matrix darkness, and exercise source return/replay. Portrait framing and additional Matrix contrast correction remain open; no unverified UI patch was substituted into the live recording. Any later GPU run needs a new exact approval.

No physical registration, complete reconstruction, object detection, event inference, collision-aware walking, 1440p/60-fps or native-mobile claim.
