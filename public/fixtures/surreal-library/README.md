# surreal-library replay fixture

Recorded data, not live generation. Exported 2026-11-05 from the finished "surreal library" room (approved v17 final, white marble, afternoon sun), recorded 2026-11-05.

Source: the offline room batch (renderer.mjs, layout.mjs, out/state.json, out/decor.json), exported by `22-export-fixture.mjs` with the renderer's own scene-building code, so geometry matches the stage images. The hero models were generated earlier by Meshy and the paint by World Labs Atlas; nothing here calls a service.

- `models/room.glb`: static room with plain materials; every mesh node has `extras.role` (wall, floor, ceiling, column, plinth, baseboard, print, panel, light). Render effects (floor mirror, ceiling halos, contact shadow) and lights are not included.
- `models/<id>.glb`: one per hero, world transform baked into the vertices; place every file at the origin. Textures are at most 1024 px, JPEG.
- World frame: metres, y up, floor at y = 0, back wall at z = -6, front wall at z = 3, side walls at x = ±4.5.
- Camera: three.js PerspectiveCamera(fovDeg, width / height) at `position` looking at `lookAt`, then `setViewOffset(width, height, viewOffsetX, 0, width, height)`.
- Stage images (1280x720, that camera): wire.png (wireframe art), eva-lit.png (EVA render), atlas-paint.png (raw Atlas paint), final.png (approved end state).
- Masks: hero-mask.png is white where a hero is. column-mask.png is **black** where the columns and bases are (grown 2 px, heroes excluded), white elsewhere.
- Hero `order` follows the time each hero's current model arrived in state.json events.

## Clean plates (added 2026-11-05, free, `23-clean-plates.mjs`)

So objects and columns don't repeat on the room behind them when the view moves off-centre:

- `cleanStages` (`eva-lit-clean.png`, `atlas-paint-clean.png`, `final-clean.png`): projected on walls, floor and ceiling. Heroes, columns and bases are removed and the gap is filled from EVA's own render of the room with those objects drawn invisibly (their shadows kept), colour-matched to each stage from the same surface around the gap. Outside the gaps every pixel is the original stage image. Gaps in the final keep faint shadow outlines, because the final's afternoon-sun shadows are not reproduced by EVA's renderer.
- `architectureStages` (`*-columns.png`): projected on columns and bases; anything in front of them is replaced by their own surrounding colour.
- `masks.heroIds` (`hero-ids.png`): which hero is frontmost at each pixel (grey = (order index + 1) × 20, 250 = columns and bases, 0 = rest of the room), rendered from these GLBs. A hero surface the recorded image shows hidden behind something else uses its own texture instead.

## Revision: sun-matched fill, Atlas texture, behind images (2026-11-05)

- `cleanStages` paint/final gaps now take light and shadow from the stage's own pixels around each gap (per surface: floor, bookcase back panel, other walls) and fine texture from an Atlas painting of the empty room (World Labs atlasChisel, depth + prompt only, owner-approved paid run; source `room-batch/out/atlas-empty-0-image.png`). An earlier Atlas inpaint run with a gap mask painted new furniture into the gaps and was not used.
- `heroBehindStages` (`*-behind.png`): where the recorded image shows an object hidden behind something else, or within 6 px of an occluder that the paint drew slightly wider, that object's own surrounding paint carried in. Those edge pixels are 0 in `hero-ids.png`.
- Later the same day (owner: the bookcase shadow was blurred): paint/final gaps now take shadow shapes from EVA's render of the room under each stage's own light with the objects invisible but casting shadows, toned to the stage around each gap per surface, with the Atlas empty-room texture on top. The previous fill is kept as `room-batch/out/final-clean.v-pushpull.png`.
