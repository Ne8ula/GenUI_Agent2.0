# Room continuation and boundary review

2026-10-20. Owner acceptance remains pending. Existing overnight UI waiver applies.

The implementation adds an explicit check of the existing cloud call, with separate pending, unavailable and cancellation messages. It does not submit another model call. Cancellation retains its unresolved state until the broker validates a conclusive existing result. The UI offers same-task Shado authorization renewal after grant expiry or service restart. Local photo validation is labeled separately from inference.

Reloading an estimated outline now resets its selected corner and coordinate frame, clears confirmation and opening edits, and keeps keyboard adjustment working. The boundary editor also clamps an obsolete selected index defensively. Intake guidance asks for overlapping furniture/corners inside one room, rather than isolated detail photographs.

## Reproduction and checks

- `node week4/app/scripts/verify-room-recovery.mjs .local/room-recovery-ui-before-v1 before`: passed baseline assertions. The actual browser reproduced the stale fifth-corner exception after reloading a four-corner proposal. Screenshots also show the absent recovery action.
- `node week4/app/scripts/verify-room-recovery.mjs .local/room-recovery-ui-after-v4 after`: see `checks.json` for actual outcome and the complete intercepted request log. Tests cover existing-result recovery, pending/unavailable outcomes, cancellation and reload, local-photo preflight cancellation, expired Shado permissions, boundary reload, keyboard focus and 390px touch/reduced-motion behavior. There are no analyze, compare or video-submit requests.
- `node ../node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` from `week4/app`: passed.
- `npm.cmd run build` from `week4/app`: passed, including Rust wrapper. The initial sandbox run was blocked by esbuild's parent-directory read; the authorized run outside that restriction succeeded. Existing Rust unused/dead-code warnings remain.

These screenshots are real headless Edge browser captures of explicitly synthetic API fixtures. They do not show generated rooms or establish live Shado/account behavior. Touch is emulated, not a physical-phone test. Screenshot matching names in the before/after directories provide direct comparison. Browser exceptions are retained in the before checks and must be absent from the after checks.

The parent separately exercised the real read-only Modal result retrieval for an already-completed call and verified that its recovered result matched the existing analysis and that the original definitive receipt stayed unchanged. That independent retrieval is not a new model run and is not the source of these UI fixture screenshots.
