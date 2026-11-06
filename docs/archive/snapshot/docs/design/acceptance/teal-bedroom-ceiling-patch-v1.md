# Teal bedroom ceiling patch v1

Decision: **pending owner acceptance**, 2026-10-22. No release, commit, publication or wider milestone advancement.

## Scope and revision

ARKitScenes **45261631**, ceiling fixture only. Generated image → Weavy Depth Anything V2 → source-calibrated Modal CPU relief → separate switchable viewer patch. Not full-room gap filling, recovered hidden geometry or physically calibrated reconstruction.

Baseline `c83fd4c04ca170ed38311b94cdcdebec779051b7` plus uncommitted scoped changes. Exact tested source hashes: [source manifest](teal-bedroom-ceiling-patch-v1.sources.json). Preserve unrelated concurrent work. [Review packet](../revisions/teal-bedroom-repair-v1/REVIEW.md) records approvals, route IDs, masking ruling and deferred findings; [provenance](../revisions/teal-bedroom-repair-v1/provenance.json) records input/output hashes. Implementation by the lead; final independent read-only `eva-reviewer` reported Opus 5.5. Ruflo coordination is not inference evidence.

## Reproduce

With existing dependencies and the local preview running (`npm.cmd run dev`), from repository root:

```text
npm.cmd --prefix week4/app run check
node week4/app/scripts/verify-bedroom-ceiling.mjs
python -I -B -X utf8 -c "import sys,unittest; from pathlib import Path; sys.path.insert(0,str(Path('scripts/reconstruction').resolve())); suite=unittest.defaultTestLoader.loadTestsFromName('test_bedroom_ceiling_depth'); result=unittest.TextTestRunner(verbosity=1).run(suite); sys.exit(not result.wasSuccessful())"
```

The browser verifier uses existing local source and patch files, not generation or network uploads. Default photo/checks destination: `.local/reconstruction/ceiling-verification/`. Optional `EVA_EVIDENCE_DIR` selects another local evidence directory. The source PLY must remain byte-identical, SHA-256 `d3296808e9cb9deec138fa1fce02495d5f84a0e894f56008d7013aedc7721bdc`. Patch SHA-256 `6678a4829bbb10b85186e4f3e9917a60a7709dc911732802990cf2116b189396`.

## Expected / actual

| Scenario | Actual evidence, 2026-10-22 |
| --- | --- |
| Typecheck, tests, build | Passed; 281 app tests, 17 synthetic Python tests. Existing Rust unused-code and Vite chunk-size warnings remain. |
| Admit exact patch; reject altered file | Passed; bad SHA leaves accepted patch visible. |
| Original/completed switch | Passed Enter, Space, click and emulated touch. Source camera-Z/RGB capture remains identical with completion on. |
| Camera and memory continuity | Passed unchanged camera on switch; teddy add/blue/remove/undo and anchor/color persist. |
| Repeated toggles | 20 toggles, geometry counter stable at 6; not a GPU-byte measurement. |
| Mobile/reduced effects | 390×844, controls in bounds and ≥44px; reduced-motion context, no added animation. |
| Interruption | Synthetic context-loss event followed by Reopen room restores patch and blue teddy; camera/mode reset as documented. |
| Actual visual shape | Inspected frontal Matrix/surface, oblique Matrix and mobile images: coherent two-lobed relief, residual ridges and surrounding ceiling holes visible. |

## Photos

- [Original Matrix](../revisions/teal-bedroom-repair-v1/implementation/after/ceiling-matrix-original.png)
- [Patched Matrix](../revisions/teal-bedroom-repair-v1/implementation/after/ceiling-matrix.png)
- [Patched surface](../revisions/teal-bedroom-repair-v1/implementation/after/ceiling-surface.png)
- [Oblique Matrix](../revisions/teal-bedroom-repair-v1/implementation/after/ceiling-matrix-oblique.png)

Matching original/completed captures retain the same camera. Earlier overlapping candidate remains retained, not selected. Fresh verifier images and its `checks.json` remain local; no public hosting.

## Owner exercise and decision

Open `http://127.0.0.1:1440/?scene=teal-bedroom`, select `.local/reconstruction/arkitscenes/45261631/scan-source-v1/mesh/45261631_3dod_mesh.ply`, then Sources & details → Choose ceiling patch → `.local/reconstruction/teal-bedroom-ceiling-result-v1/candidate/ceiling-patch.ply`. Choose Ceiling light and Matrix. Toggle Ceiling patch, turn the view, exercise all four teddy buttons. Decide whether the inferred fixture is a useful artistic replacement; do not interpret it as recovered source evidence.

Owner feedback/acceptance of this tested revision: **not yet received**.

Limits: screen/depth-based masking can hide other source fragments within its narrow ROI; off restores original. Replacement uploads may re-upload shared GPU buffers; repeated replacement VRAM was not measured. Reopening enables a retained patch even if previously hidden. Matrix is indicated by its pressed button but omitted from the completed-layer caption. Test assertion wording still references old bounds. Physical touch devices, true GPU resets, full-room repairs and native performance were not checked. Billing settlement was not queried; no more paid attempts were made.
