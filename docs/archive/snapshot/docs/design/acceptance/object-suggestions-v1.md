# Automatic object suggestions — acceptance pending

Date: 2026-10-20. Bounded scope: operator-run automatic box/mask proposals and CPU lifting/association. No completed furniture or upload UI integration is claimed.

Revision: [source hashes](../revisions/object-suggestions-v1/source-snapshot.json). Scenario/commands, expected/actual results and limitations: [pilot record](../../research/OBJECT_SUGGESTIONS_PILOT.md).

Expected offline behavior: no manual box prompts, source-bound proposals, bounded resources, no template furniture on empty detections, exact coordinate transforms and no billable submission until a separate frozen-plan decision. Actual: 13 synthetic/contract tests pass, compilation/diff checks pass, real-photo offline plan and local Modal SDK declaration checks pass. No model execution.

Runtime update: the owner approved the $5 pilot and one attempt completed on 2026-10-20. All seven photos returned 18 source-validated masks; every mask was visually inspected in the [contact sheet](../revisions/object-suggestions-v1/mask-contact-sheet.jpg). Desk masks in three views are useful, but wrong categories, cabinet/door confusion, an out-of-room suggestion and a missed chair remain. The original offline statement above records the pre-run baseline. See the pilot record for exact app/call IDs and result hash. The app is stopped with zero tasks.

Required next evidence: corrected category/identity handling, separate 3D proposal inspection, then independent-room transfer and correction interactions. SAM 3D access remains pending; the current stage cannot repair hidden furniture.

Owner acceptance: **pending**. Paid-run approval, if granted, is permission to test, not acceptance of output quality.
