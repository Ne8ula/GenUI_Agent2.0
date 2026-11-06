# Matched Matrix desktop demo — acceptance pending

Date: 2026-10-29. Owner decision: **pending**.

## Revision and scope

Dirty `crimescene` based on `0380e13efbdfa8c1ee29fe2c621927852b7766b7`; sealed cloud plan `9ce5ea9d75df60e51bd5c7b599fbee2bf1be6b184b76622c5baa1c6807f3609a`. Continuation of the owner-waived reused-code Matrix correction, not a new direction. No application UI edits in this session; updated capture checks and a separate v3 run destination preserve previous snapshots.

Expected: readable sofa/chair/cabinet composition, visible chair legs on desktop and mobile, restrained Matrix marks, unchanged evidence access and camera/replay continuity.

## Actual results

- [Review and matched captures](../revisions/crime-scene-matrix-live-v3/REVIEW.md); [provenance](../revisions/crime-scene-matrix-live-v3/provenance.json).
- CPU: `npm test` passed 460 tests; `npm run typecheck` passed; 22 cloud adapter tests passed; kiosk script syntax passed.
- Modal NVIDIA A10: 12 interaction checks passed, no reported page/shader errors. Native 1600×900 drawing buffer, matching 390×844 portrait captures. Complete 28-second scan/Matrix/photo/normal sequence, pause/resume, replay, keyboard/pointer/touch, source dismissal/focus, pixel-crop restoration and reduced motion checked.
- Visual inspection: desktop chair legs visible above controls; sofa/chair/cabinet together. Matrix chair remains low contrast. Portrait clips the chair at the right and excludes the cabinet; **mobile composition remains unmet**, not accepted by the no-overflow test.
- Temporary interactive viewer handed to owner for recording; actual owner video/quality acceptance not observed. Live source kept unchanged to avoid interrupting recording.
- One $2 operational allowance, 900-second worker; no retry/renewal. Actual bill unknown. Final receipt confirms the session ended normally and stopped with zero tasks.

## Owner exercise and limits

Record on desktop with Reset → Play demo, then inspect free camera, Detective Mode and Source photograph return. Judge Matrix darkness before accepting. Portrait framing remains a follow-up, requiring matched GPU verification under a new exact approval if another session is needed.

No full-shell, physical-phone, physical registration, reconstruction completeness, collision-aware movement, measured FPS or streaming-latency claim. No new inference, geometry or evidence anchors.
