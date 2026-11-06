# EVA: scene investigation

The active work is the **crime-scene reconstruction replacement**: Argus scene generation, Kimodo user-requested human motion, complete hypothesis objects selected through evaluation, and the Arkham Knight-inspired detective/matrix aesthetic. This is the selected architecture, **not a claim that the replacement is implemented**.

Start with the short [current scope](PLANNING.md) and [agent rules](AGENTS.md). Preserve original photographs/scans, provenance and failed-run receipts while retiring superseded crime-scene code/candidates. Other weeks and reconstruction experiments are outside this change and should not enter agents' default context. [Visual prerequisites](docs/design/FIGMA_WEAVE.md), finite execution approvals and owner acceptance remain required.

## Historical demo reference — not the active workflow

The remaining route descriptions document retained earlier demos only. Do not follow them as a competing crime-scene pipeline. The prior memory-palace direction and execution ledger are preserved in [planning history](PLANNING_HISTORY.md); read those only for an explicitly relevant historical question.

The earlier room demo contains a [room-wide reconstruction/completion candidate](docs/design/revisions/room-refinement-v5/REVIEW.md) of Hypersim `ai_001_004`: all 100 supplied RGBD views, inferred architecture, recovered source detail and explicitly assumed adjoining spaces. It is not the Argus/Kimodo replacement.

## Run the retained foundation

The application remains in [week4/](week4/README.md), alongside the retained Paris/eye fixtures.

```powershell
npm.cmd ci --prefix week4
npm.cmd run dev
```

Open **http://127.0.0.1:1440/** for the reconstructed room (also `?scene=hypersim-room`). Drag to look, scroll to move, or focus the room and use W A S D / arrow keys. Home resets the selected view. Touch supports dragging, pinching and movement buttons. Choose **Sources & details** to inspect source images and coverage limits.

The new **[single-room upload candidate](scripts/room_workflow/README.md)** is at <http://127.0.0.1:1440/?scene=upload-room>. Also run `npm.cmd run room:service` for private local intake and reopening. The deployed cloud worker has processed an actual seven-photo upload. Boundary review and CPU completion are implemented; authenticated Shado deployment and actual A/B reconstruction remain pending. The page does not silently run paid work.

An **actual seven-photo VGGT room** is now available at <http://127.0.0.1:1440/?scene=arkitscenes-room>, also requiring the local room service. A separate [broader-view candidate](http://127.0.0.1:1440/?scene=arkitscenes-room&profile=vga-visual-v1) adds an optional inferred wall-color treatment. Compare raw ML, dense fused surfaces and provisional completion; inspect source views, uniform dots and provenance. Enhanced point contrast makes dark furniture clearer, with exact source colors still available. The hallway is excluded, missing architecture is explicitly assumed, scale is relative, and Shado comparison remains pending. [Run evidence and limitations](docs/research/ARKITSCENES_PILOT.md).

Retained routes: `?scene=paris-arrival` for the eye fixture and `?scene=rust` for the procedural Rust scene. Rust/WASM tooling is required by the app build; see [setup and checks](week4/README.md).

The broader-view route now opens a [complete-object aesthetic study](docs/design/revisions/aesthetic-room-v6-after/REVIEW.md): continuous furniture, sampled photo colors, uniform hollow dots for inferred shapes, optional surfaces, and four interior viewpoints. This is an authored interpretation of the public capture, **not automatic object completion for uploaded photos**. The raw and fused candidates remain available.

Its default point style now uses the [Paris-inspired dithered matrix treatment](docs/design/revisions/aesthetic-matrix-v2-after/REVIEW.md). **Uniform dots** preserves the preceding look; hollow marks distinguish inferred geometry in both.

The [shared room renderer](docs/design/revisions/general-room-style-v3/REVIEW.md) now applies that matrix treatment to uploaded candidates too, using each job's own geometry, palette and face provenance. It does not reuse benchmark furniture. [Automatic furniture completion remains unimplemented](docs/research/GENERAL_ROOM_COMPLETION.md); boundary closure and a reusable renderer do not resolve that gap.

`npm.cmd run check` checks the TypeScript application; `npm.cmd run rust:test` checks the Rust workspace.

The [current room review and before/after captures](docs/design/revisions/room-refinement-v5/REVIEW.md) document the room-completion refinement under its existing Weave waiver. [Acceptance](docs/design/acceptance/room-refinement-v5.md) is pending. The original 96-view reconstruction remains at `?scene=hypersim-room&room=r03`, with its [original review](docs/design/revisions/room-r03/REVIEW.md). The [R18 acceptance](week4/docs/design/acceptance/w4-hover-overlays-r18.md) covers only the earlier hover/overlay refinement. The separate photo-only ARKitScenes pilot has now run; general casual-photo quality, live conversation and editable memory annotations remain upcoming work.

## Repository map

- `week4/app`: React host, eye, renderers, source inspection and tests.
- `week4/core`, `schemas`, `fixtures`, `tests`: bounded data/behavior contracts.
- `week4/renderer`: authored Rust/WASM graphics; `week4/broker`: mock desktop policy.
- `docs/design`: Weave workflow and evidence index.
- `docs/research`: one long-term plan and the supplied seven-step chart.
- [History and recovery](docs/HISTORY.md): superseded material and recovery commit.

Weeks 1?3, superseded Week 4 handoffs and most historical media were removed from this checkout on the owner's 2026-10-18 instruction. Git history remains intact. Retrieve old material only for a specific recovery task.
