# Generated object models v1: controller inspection, owner decision pending

- **Run:** 2026-10-27, owner pre-approved single L4 attempt (≤ $10). Plan `72b1e3f4…`; Modal app `ap-Lh9SBfjyJwYiZg60vezCsY`; status objects-returned-review-pending; stopped with 0 tasks.
- **Build check:** passed beforehand (app `ap-YbMgK6eXGFSTkjn3w31h6I`). The first build check, in `objects-v1/`, had failed on a compiler setting; it was fixed before this run.
- **Models used:** TripoSR (MIT; code `107cefdc`, weights `5b521936`) and SAM 2.1 Hiera Tiny (Apache-2.0).
- **Inputs:** owner-approved crops; v2 segments.
- **Renders:** [models-sheet.png](models-sheet.png), plus one image per tag. Each row shows the model from two views, then the model darkened with the scan segment overlaid in cyan.
- **Rendering method:** a local numpy/Pillow flat-shaded, painter-sorted render using the GLB's own texture and the fit matrix.
- **Render checks:** each GLB has one mesh, no node transforms and no interleaved vertex data, so the renders reflect the geometry.

| Tag | Faces | Coverage | Mean distance | Observation |
|---|---|---|---|---|
| 69 bottle | 15,852 | 0.488 | 2.20 cm | The mesh is only a half-shell: x spans 0.004–0.156, so the back of the bottle is missing. It doesn't read as a bottle. |
| 18 chair | 38,000 | 0.401 | 3.19 cm | A lumpy blob with no legs or seat structure. The source photo is dark and shot from above. |
| 13 shoes | 37,999 | 0.026 | 11.89 cm | A hollow, frame-like shell, not shoes. The fit is also dominated by the door-jamb strip in the segment. |

**Controller assessment:** none of the three models meets the spec's target that objects look "almost like a 3D model made for this scene". The likely causes:

- single, partial, low-light photos;
- tight crops;
- TripoSR's single-image limits on cluttered real photos.

**Recommendation:** reject all three. Keep the scan-segment holograms, which are measured data, for the chair, bottle and shoes. If generated models are still wanted, a better input is needed: multi-view photos, a different licence-compatible image-to-3D model, or owner-cleaned cutouts. Any further generation is a separate decision. **Owner decision (2026-10-27): reject all three.** `review.md` `models` stays `{}` (a rejected entry would need an owner-authored upright pose), so no generated mesh is shown; the catalogued `models/*` files remain only as retained evidence.
