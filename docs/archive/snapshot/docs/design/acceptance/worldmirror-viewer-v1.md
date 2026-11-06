# Matched WorldMirror viewer — acceptance pending

2026-10-20. Scope: retained seven-photo **42445021** VGGT/WorldMirror comparison, backend path correction and same-frame camera/display continuity. No SAM 3D, second-room execution or upload orchestration expansion.

Revision: `midterm` base `c83fd4c` plus the scoped [source hashes](../revisions/worldmirror-viewer-v1/source-snapshot.json). [Review, commands and captures](../revisions/worldmirror-viewer-v1/REVIEW.md).

Expected: each model displays its own retained geometry on identical originals. Switching models preserves navigation, source and display controls; failed loads cannot relabel old geometry. Explicit source/frame changes and Home may reset the camera. Existing upload rendering must remain usable.

Actual: real isolated-broker browser checks passed, including matched raw/fused/enclosure camera matrices, source hashes, history, cancellation/failure, keyboard/touch/reduced motion and graphics recovery. Synthetic shared-upload checks passed. Root tests: 371 passed. Backend: 87 passed, two existing integration skips. Typecheck/build passed with three warnings in unchanged Rust files. No API writes or new reconstruction calls occurred.

Owner exercise: open `?scene=arkitscenes-room&profile=worldmirror-v1` with the local app and room service running. Navigate in raw/fused views, toggle models, compare the same source photographs, and inspect the separately labeled authored enclosure. Record preferred model and any source contradictions here before quality promotion.

Feedback/blockers: no post-implementation owner feedback yet. Both estimates remain sparse/incomplete; source-camera registration is not independent accuracy. Headless Edge/touch emulation does not verify native or physical-phone behavior. Boundary, quality, second-room transfer, SAM 3D and real Shado comparison remain unaccepted or unfinished.

Decision: **pending**. Implementation and one 8-credit reference were authorized; those approvals are not acceptance of this tested revision.
