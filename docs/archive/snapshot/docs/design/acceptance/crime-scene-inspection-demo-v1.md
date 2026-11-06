# Single-room contour demo — acceptance pending

Date: 2026-10-29. Owner decision: **pending**, not accepted as a polished whole-room presentation.

## Tested revision and scenario

Dirty `crimescene` checkout based on `0380e13efbdfa8c1ee29fe2c621927852b7766b7`. Exact uploaded source is identified by sealed plan SHA-256 `cfe04e3a1d039053ba9d07df6d97bf7b7811b4e239e1acad74bcc5a361c40f7b` under `.local/reconstruction/crime-scene-inspection-final-v1/`. Original GLB remains `138e407bcff0ca2c241860b80f48486bcafeb36038123099c0ca73a116fe5815`.

Expected: same room → outward contour pulse → settled Detective Mode → original tag-18 photograph → dismiss → normal appearance, with pause/manual takeover/replay and reduced motion. No automatic analysis, registered clue placement or geometry replacement.

## Evidence

- `npm test`: 103 core + 356 app tests passed; `npm run typecheck` passed.
- `python -m unittest scripts.room_workflow.test_crime_scene_browser_cloud scripts.room_workflow.test_crime_scene_demo_cloud`: 19 passed in the existing client environment.
- Modal app `ap-K6hmsxV4FyibLd7dzHZTbj`: selected Tesla T4 through approved L4/A10G/T4 fallback. Worker and browser checks passed. Stopped with zero tasks; independently confirmed with `modal app info`.
- [Video, stills, checks and limitations](../revisions/crime-scene-inspection-demo-v1/REVIEW.md#returned-visual-evidence). Video is 29.08 seconds, 2560×1440, encoded at 25 fps; runtime FPS not measured.
- Source photograph decode, exact central-crop restoration, pause/resume, manual takeover, keyboard dismissal/focus return, 390px touch/no-overflow and reduced-motion settling passed. Page/shader error list empty.
- Explicit owner waiver of fresh Weave for the supplied outward-contour reference; earlier generated references retained unchanged.

## Limitations and next exercise

Starting camera faces a wall/doorway, not a wide furniture composition. Mesh softness/faceting is unchanged. Mobile still precedes full photo decoding; video includes opening/closing frames. Pre-edit baseline capture failed on L4 scheduling capacity; retained normal/detective comparisons are same-revision states. No wider scene fidelity, full-shell, collision walking, registered anchors or 60-fps acceptance.

Owner exercise: watch the retained clip, judge the outward pulse and select a wider opening composition before any separately approved recapture. One successful $2 operational attempt is consumed; actual billed cost unknown. No retry or ongoing GPU session remains active.
