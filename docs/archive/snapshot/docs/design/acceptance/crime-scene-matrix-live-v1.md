# Interactive Matrix room — acceptance pending

Date: 2026-10-29. Owner decision: **pending**.

## Revision and scenario

Dirty `crimescene` based on `0380e13efbdfa8c1ee29fe2c621927852b7766b7`; sealed source plan `9716a38c992a1d7ac5be09e711c1a61a52021f8a22cba0b5c4d3df2e4296c3a9`. Same source GLB `138e407bcff0ca2c241860b80f48486bcafeb36038123099c0ca73a116fe5815`.

Expected: controllable room, outward reveal of the retained dithered Matrix aesthetic, stable inspection, original source photo, reversible normal appearance; replay must preserve the explored viewpoint. Explicit owner waiver of fresh Weave for this correction. No geometry replacement or registered evidence anchors.

## Actual evidence

- `npm test`: 460 passed; `npm run typecheck`: passed.
- Existing Modal-client Python environment: `python -m unittest scripts.room_workflow.test_crime_scene_browser_cloud scripts.room_workflow.test_crime_scene_demo_cloud`: 22 passed, no skips.
- `node --check week4/app/scripts/crime-scene-kiosk.mjs`: passed.
- Modal app `ap-rJHhvrfqK2PGUMGpQh2f9D` rendered on NVIDIA Tesla T4. Browser checks passed: keyboard/pointer camera control, replay continuity, pause, sweep settling, photograph decode, Escape/focus return, exact central-crop normal restoration, mobile touch/no-overflow and reduced-motion settling. No page/shader errors.
- [Six inspected captures, provenance and limitations](../revisions/crime-scene-matrix-live-v1/REVIEW.md). Temporary password-protected interactive viewer delivered in-session; not a video-only handoff.

## Limitations and owner exercise

Current captured viewpoint still faces a window/wall, rather than establishing the whole room. Fine dither is dense on light surfaces. Source geometry is soft, incomplete and unaligned; no collision-aware walking. Opening headful captures are 1599×812; live handoff is 1600×900, not 1440p. Runtime FPS, end-to-end noVNC latency and new temporal recording were not measured.

Owner: navigate to the preferred angle, toggle Matrix/original, replay from there and judge density and readability. Functional pass does not grant aesthetic acceptance.

One approved submission used, no retries; $2 operational allowance is not a hard billing cap, actual cost unknown. Session ended normally; terminal receipt records `stopped`, zero tasks. No deployment, renewal, model inference or further paid execution authorized.

Continuation: wider 70° FOV, slight downward opening pitch, reduced Matrix coverage and faint source-color backing were implemented afterward under the same bounded waiver. 460 tests and typecheck passed again. These changes are **not GPU-verified** and are not represented by the retained live-session captures.
