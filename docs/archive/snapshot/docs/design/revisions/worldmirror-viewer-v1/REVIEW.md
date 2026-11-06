# Matched WorldMirror viewer

2026-10-20. Status: implemented; matched-view and shared-upload browser checks passed. Owner approved the bounded integration and one 8-credit reference; [quality acceptance remains pending](../../acceptance/worldmirror-viewer-v1.md).

## Reference and scope

- [Contact sheet](references/contact-sheet.png) · [selected image](references/images/matched-viewer.png) · [provenance](provenance.json).
- Base: shared `midterm`, `c83fd4c` plus concurrent uncommitted work. Preserve every existing candidate and source artifact.
- Compare retained seven-photo room **42445021**: original VGGT versus the backend-admitted WorldMirror candidate. Room 45261631 is a separate unfinished transfer test, not this fixture.
- Reuse `BenchmarkRoom`, `CandidateView`, existing controls and rendering. Fix the backend candidate-directory mapping; add model selection; preserve camera and presentation across matched same-frame switches. No dependencies, new model runs, SAM 3D completion or publication.
- Keep broader-view/authored aesthetic studies distinct: different inputs are not matched model arms. Raw analysis and rotated candidate coordinates are different frames; explicit frame/source changes may reset the camera.

## Generation and inspection

Official Figma Weave direct model call, **GPT Image 2.5 / Flare**, model identifier `gpt-image-2.5`, catalog ID `2db90e64-51dd-45b2-870a-66d19a81118e`. Run `5d8f9367-e02f-4941-986f-01740683bb4e` completed, one 1088×608 PNG, **8 Weave workspace credits**. Cost was quoted and separately confirmed with the structured Approve choice before execution. No retry. Text-only brief; no photos or private artifacts uploaded. No new animation is planned, so no motion-reference video was generated.

The lead inspected the actual image before UI source edits. Selected guidance: quiet model controls above the room; clear selected/focus outline; dark viewport; readable grouping of estimate, fused and authored enclosure modes; relative-scale/same-input subtitle; separate broader-study link; explicit unconfirmed-boundary and no-SAM-3D note. Reuse the house typography and controls rather than replicate a new layout. Generated room geometry, any inaccurate text, invented furniture and inferred geometry coverage are rejected as implementation evidence. The image is a control-layout reference only, never a reconstruction result.

## Evidence and acceptance

[Baseline checks](implementation/before/profiles/checks.json) passed through the existing `verify-arkit-profiles.mjs` with a real isolated read-only broker. The lead inspected [the original desktop capture](implementation/before/profiles/original-desktop.png). The new selector regression then failed on the unchanged UI ([retained failure](implementation/before/selector-red/checks.json)). After integration, [expanded browser checks](implementation/after/profiles-final2/checks.json) passed; [actual GPU camera matrices](implementation/after/profiles-final2/continuity.json) match across raw/fused/enclosure model roundtrips. All seven source hashes match between model arms; raw and completed geometry fingerprints differ. No API writes occurred.

Changes: `benchmark.mjs` maps the closed WorldMirror route to the actual retained directory; its regression checks real files, model identity and source hashes. `BenchmarkRoom.tsx` supplies matched-model controls, guarded loading and loaded-result labels, history support and explicit frame/source reset keys. `CandidateView.tsx` preserves position/target/up and display state while replacing geometry, and replaces only the canvas for graphics recovery. Upload callers keep their existing behavior. No candidate data was edited.

The UI worker was `eva-ui-designer`, reported resolved model `claude-fable-5-1[1m]`, writing only the two components in an isolated worktree after inspecting this packet and baseline. The lead verified both baseline blob hashes before applying the patch. [Source snapshot](source-snapshot.json) binds the tested implementation and scripts.

## Independent review corrections

Read-only `eva-reviewer` (reported resolved model `claude-opus-5-5[1m]`) identified history-dependent point spacing and a matched-photo note incorrectly shown on the broader study. Both were reproduced in retained failing browser runs: [sampling regression](implementation/after/sampling-red/checks.json) and [label regression](implementation/after/label-red/checks.json). The first integrated [browser run](implementation/after/profiles/checks.json) passed its original assertions but lacked these checks; it is not the final revision's evidence.

The benchmark now resets sampling by model/variant identity, independently of camera/display continuity. It uses the existing automatic spacing rule per geometry (fixed `.035` only for the authored study), so uniform dots are deterministic regardless of which model loads first. This is the same sampling policy, not equal point counts or equal spatial pitch across models. Matrix treatment is unchanged. UploadRoom does not pass the new sampling key and retains its previous shared-spacing semantics. The matched-input note is restricted to the actual two matched profiles.

Display mode/style intentionally persist across explicit source/frame changes; only the camera resets. Failed model loads use the existing explicit **Retry loading** control, not an implicit retry by clicking the already requested model again. The stale-response test waits for delayed delivery and cleared loading status before checking the loaded original identity; cancellation guards remain in production code.

## Actual verification

With the existing app at `http://127.0.0.1:1440`, run from the repository root; browser output directories must be new:

```text
node week4/app/scripts/verify-arkit-profiles.mjs <fresh-evidence-directory>
node week4/app/scripts/verify-room-review.mjs <another-fresh-directory>
npm.cmd run room:test
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

- Matched browser: all three saved profiles, same-frame camera/source/variant/display continuity, history back/forward, source/Home resets, cancelled late response, controlled 503 plus retry, keyboard focus, touch/reduced-motion layout and WebGL context loss/reopen passed. Unknown profile fails without loading a fallback.
- [Shared upload regression](implementation/after/upload-final/checks.json): eight checks passed with invented API/geometry fixtures, including two layouts and preserved raw/completed navigation. This is not actual upload reconstruction evidence.
- Room backend: 89 tests, **87 passed, 2 skipped** (owned process-tree integration and actual CPU adapter). Root tests: **103 foundation + 268 app passed**, no skips/failures.
- Typecheck and production build: exit 0. Three warnings in unchanged Rust files: unused `STRIDE`, unread `stance`/`contact`, unused `finite`. No native application run is implied.

## Visual inspection and owner exercise

Matching before/after state (original model, provisional completion, source 1, Surfaces): [before](implementation/before/profiles/original-completed-interior.png) and [after](implementation/after/profiles-final2/original-completed-interior.png). Desktop overviews are also retained, but their final representation differs because display choices now persist instead of remounting. Matched model captures: [VGGT fused](implementation/after/profiles-final2/matched-fused-vggt.png) and [WorldMirror fused](implementation/after/profiles-final2/matched-fused-worldmirror.png). Also inspect [WorldMirror desktop](implementation/after/profiles-final2/matched-fused-worldmirror-desktop.png), [phone](implementation/after/profiles-final2/matched-phone.png) and [load failure](implementation/after/profiles-final2/matched-load-failure.png).

The lead inspected the matched fused pair and desktop/phone captures. Controls retain the house styling and readable model/provenance labels; phone controls wrap without horizontal overflow. Both geometry estimates remain sparse and incomplete. Matching pose does not establish a quality winner.

For owner review, run `npm.cmd run room:service` and `npm.cmd run dev` if not already running, then open `http://127.0.0.1:1440/?scene=arkitscenes-room&profile=worldmirror-v1`. Select a source and representation, navigate, and toggle VGGT/WorldMirror. Home deliberately resets to the active model's source camera. Review raw estimates separately from the authored unconfirmed enclosure.

Limitations: headless Edge and emulated touch, not physical-phone/native calibration. Geometry accuracy, actual billing, SAM 3D, second-room transfer and real Shado comparison were not verified. Owner acceptance remains pending; no commit, publication or new reconstruction call occurred.
