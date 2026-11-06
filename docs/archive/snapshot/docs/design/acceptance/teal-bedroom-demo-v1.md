# Teal bedroom demo acceptance

Decision: **pending** — 2026-10-22. No owner acceptance received. Final browser verification is blocked.

## Scope and revision

ARKitScenes 45261631 supplied scan with separately authored teddy: add, blue recolour, remove and undo; surface/matrix views; session-only history. Baseline `c83fd4c04ca170ed38311b94cdcdebec779051b7` plus uncommitted scoped changes. This is not a frozen accepted revision. Existing concurrent changes remain untouched.

[Review, file inventory, costs and limitations](../revisions/teal-bedroom-demo-v1/REVIEW.md) · [Weave provenance](../revisions/teal-bedroom-demo-v1/provenance.json) · [earlier browser evidence](../revisions/teal-bedroom-demo-v1/implementation/after-v4/checks.json).

## Reproduction, once restart is requested

The system stopped the local preview and temporary keep-awake for critical memory pressure. Do not automatically restart either. Once the owner requests resumption and resources permit:

1. From the repository root, run `npm.cmd run dev` and open `http://127.0.0.1:1440/?scene=teal-bedroom`.
2. Choose `.local/reconstruction/arkitscenes/45261631/scan-source-v1/mesh/45261631_3dod_mesh.ply`. The file stays browser-local; no scan is bundled in public assets.
3. Use Add teddy → Make it blue → Remove teddy → Undo. Expected: blue teddy returns at the same anchor; camera and source geometry do not change. Switch Matrix/Surfaces; inspect provenance and keyboard navigation.
4. Run `node week4/app/scripts/verify-bedroom.mjs` for a fresh capture directory. Run the recovery script only into a new evidence directory (its current fixed output path needs non-overwrite protection before repeated execution).
5. Rerun `npm.cmd run check --prefix week4` after the final review fixes, inspect desktop/mobile captures, and record a tested source snapshot before acceptance.

## Actual evidence

- Earlier after-v4 browser run: presets, undo, unchanged camera, 622,077 source vertices / 1,144,903 triangles, matrix continuity, keyboard navigation, touch presets, mobile overflow and 44px buttons. Desktop page-error list empty. Captures were visually inspected for teddy contact/visibility.
- Earlier full check: core 103/103 and app 276/276 tests, TypeScript and production build passed, with three Rust unused/dead-code warnings. This run predates final review fixes.
- Latest focused tests: 8/8 passed. Both browser verification scripts syntax-check successfully. These do not prove browser recovery or final visual corrections.
- Final keyboard-modifier/disabled-hover fixes and semantics/caption changes: implemented, final browser rerun not executed. Touch orbit/pinch and rejection/cancellation/context-loss recovery: assertions authored, not executed.

## Blockers and owner exercise

Final browser verification stopped at the resource gate; no replacement server was launched. Public deployment is blocked by unresolved scan redistribution clearance and the denied public-staging operation. No public prototype link exists. The local URL is inactive while its preview is stopped.

After verified resumption, inspect the cream and blue teddy, use all four presets, orbit/zoom on keyboard and touch, and interrupt/reopen graphics. Record expected/actual outcomes and the owner's accept/revise decision here.

Limitations: supplied vertex-colored reconstruction, not EVA photograph reconstruction or photo textures; missing surfaces preserved; authored visual bed placement, not calibrated physical accuracy; no collision detection, live AI, persistence across page reload or completed physical-registration repair. Repeated-reopen resource behavior is unverified; explicit context release and clearer undo-recolour wording remain deferred. No release or broader milestone acceptance is implied.
