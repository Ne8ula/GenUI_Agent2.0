# Two saved ARKitScenes reconstruction profiles

2026-10-20. Implemented under the owner's room-workflow visual waiver. Owner acceptance of reconstruction quality and the room boundary remains pending.

The existing `?scene=arkitscenes-room` route retains the original seven-photo result and completion as its default. `?scene=arkitscenes-room&profile=vga-visual-v1` opens the separately acquired and executed **Broader room views** experiment. The profile switch uses two closed literal identifiers; HTTP never supplies filesystem paths.

The new profile serves the frozen VGA request/result and corrected `vga/completion-v1/room-only-v2` candidate. Request/result, supplemental or same-run dense fields, source images and candidate geometry fingerprints are validated independently for each profile. The original profile keeps its supplemental export; the new profile uses dense fields from its own analysis. Neither is presented as a Shado result.

The new candidate begins at camera index 1 (UI source view 2), inside the provisional room. Camera index 0 (UI source view 1) is outside the corrected enclosure: selecting it explains why the assumed wall obscures the completed room. Its original photo and raw estimate remain available. Source 0 closure occlusion is captured explicitly, not concealed or interpreted as missing render output.

## Verification

- Seven `benchmark.test.mjs` tests pass: source/result integrity, completion provenance/hash rejection, unknown/path-like selectors, profile metadata/source URL separation, original default, and private read-only broker behavior.
- TypeScript checking and production build pass; existing Rust unused-code warnings remain.
- `verify-arkit-profiles.mjs` passed five grouped browser checks against actual saved results through a real isolated broker. No mocked geometry, paid call, new CPU completion or mutation request.
- Both profiles render surfaces, uniform-size points, fused geometry and provenance; all seven original photos load with profile-specific URLs. Actual image hashes, raw geometry and completion fingerprints differ across profiles as expected.
- Actual pixel comparisons verify movement/orbit changes and Home restoration. Keyboard focus, real WebGL context loss/reopen, reduced-motion touch emulation at 390×844, profile switching and unknown-profile failure were exercised.
- `checks.json` contains exact fingerprints, source hashes, elapsed worker times and empty error/mutation lists.

Inspected captures include the original and VGA completed interiors, VGA points, desktop/mobile layouts and the source-0 closure. Visible inferred flat wall/window areas and geometric seams remain. The broader visual coverage does not establish higher physical accuracy; guided iPad source frames do not validate casual phone capture. Browser checks use headless Edge and touch emulation, not a physical phone.

Reproduce with the local Vite app running:

```powershell
node --test scripts/room_workflow/benchmark.test.mjs
npm.cmd --prefix week4/app run typecheck
npm.cmd --prefix week4/app run build
node week4/app/scripts/verify-arkit-profiles.mjs <fresh-evidence-directory>
```

The capture harness owns a temporary private broker and cannot invoke cloud, Shado or completion runners. The regular room service must be restarted to load the revised backend module before normal use.
