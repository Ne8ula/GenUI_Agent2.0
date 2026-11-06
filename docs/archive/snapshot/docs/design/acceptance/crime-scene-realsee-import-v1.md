# Realsee scene import — offline evidence

Date: 2026-10-28. **Owner quality acceptance: pending.**

## Scope and revision

The owner supplied `.local/room-workflow/sources/realsee-Ae44j89x` as the continuation input after using the Realsee website. This pass packages its existing OBJ and two JPEG textures into a standalone GLB. It does not execute the supplied converter/SDK, reconstruct new surfaces, render a scene or promote a live catalog entry. The exact model/pipeline that produced the website asset is unverified; it is not evidence of running the pinned Argus checkpoint.

Branch `crimescene`, base HEAD `0380e13efbdfa8c1ee29fe2c621927852b7766b7` plus substantial retained dirty/untracked work. HEAD alone is not the tested revision.

- [Importer](../../../scripts/room_workflow/ffs_realsee.py) SHA-256: `e178f2e38343ee365997fffc953904d86a2aa57139a2b8f2830f19d63b6493f3`.
- [Shared GLB validator](../../../scripts/room_workflow/ffs_artifacts.py), unchanged, SHA-256: `84fb02d50ed79f6f3df076cf0751d2a748eb4056debacbe5abdb2ad28f6b1ceb`.
- [Synthetic tests](../../../scripts/room_workflow/test_ffs_realsee.py) cover preservation, exact transform/sampler, malformed input, identity changes and exclusive outputs.
- Local Python 3.14, NumPy 2.4.4, Pillow 12.2.0; installed Three.js 0.180.0 loaders. No installation, weight download, network request or paid job in this packaging pass.
- Coordinator implemented/verified; reused workers `ae535aa77655c1aa9` for read-only SDK audit and `afade2f5b89255c0d` for independent read-only review. Four agents total including coordinator across the replacement. Configured model aliases are not independently verified provider identities.

## Inputs and retained outputs

All paths below are repository-relative private working assets; do not publish the source HTML/page-data receipts. Public accessibility is not a redistribution licence.

Input directory: `.local/room-workflow/sources/realsee-Ae44j89x`.
The fixed 18-file inventory binds the native model, original textures, six cubemap faces, OBJ/MTL/textures, manifest, conversion receipt, converter bytes and SDK/package bytes. Downloaded scripts are hashed, never imported or executed.

Canonical bundle SHA-256: `d5d16cc57dda4451f137031cd20d75555bd0cb03a298cbaa8f04137e002fd007`.

Current candidate: `.local/reconstruction/ffs-th0028-realsee-v2/scene.glb`.

- GLB SHA-256: `138e407bcff0ca2c241860b80f48486bcafeb36038123099c0ca73a116fe5815`.
- Size: 1,222,872 bytes; 11,330 triangles; 10,855 source vertices, expanded to 33,990 triangle-corner vertices; zero zero-area triangles detected.
- Two embedded JPEGs, byte-identical to input; aggregate decoded RGBA8 texture size 20,971,520 bytes.
- Adjacent `report.json` records every input identity, implementation/validator hashes, source-frame bounds and limitations. Status `needs-review`, classification `inferred`, calibration false, alignment null, complete-surface false.
- First candidate `.local/reconstruction/ffs-th0028-realsee-v1` remains preserved. Its sampler defaults and provenance label were corrected in v2; do not promote v1. Its GLB hash is `4dc80b8701b052540d372bbf129805e0ea52de79663751692719425abc9b9ac6`.
- Preserved `.local/reconstruction/ffs-th0028-scene-v2/{scene.ply,returned-report.json,plan.json,receipt.json}` hashes were rechecked unchanged against the earlier [panorama record](crime-scene-panorama-trial-v1.md). The PLY is voxel-reduced measured scan evidence, not original LAS bytes.

## Decisions and bounds

- Preserve source coordinates and winding in mesh accessors; apply the SDK's proper Z-up to Y-up rotation once at the root: `(x,y,z) -> (x,z,-y)`. No scale change or inferred camera registration.
- Flip OBJ V to glTF V once; preserve JPEG bytes without recompression. Match source clamp-to-edge and linear filtering without mipmaps.
- Retain flat shading with no invented source normals. PBR metallic 0 / roughness 1 is an **authored lighting approximation**, not the website's unlit shader. The shared validator's extension policy remains unchanged.
- Native vertex marks and panorama-projection behavior are not represented by OBJ/GLB. Observer metadata is not applied; its serialized `$-0` values and coordinate convention need separate validation.
- Fixed two-material triangular OBJ subset only. Reject unexpected directives/material maps, nonfinite or out-of-range numbers, invalid indices and missing/extra/corrupt textures. Do not silently repair geometry.
- Input inventory: at most 4 MiB/file and 16 MiB total; OBJ at most 2 MiB; each texture at most 2 MiB; MTL at most 4 KiB. Output validator: 8 MiB GLB, 20,000 faces, 60,000 vertices, 32 MiB decoded textures. These are application bounds, not OS-enforced process memory/time limits.
- Reject source/output symlink or junction ancestors, output inside source, changed bundle identity and existing output directory. No source overwrite or automatic deletion. Identity binding does not grant source admission or owner acceptance.

## Verification and reproduction

From the repository root, inspect the fixed input inventory:

```text
python -I scripts/room_workflow/ffs_realsee.py .local/room-workflow/sources/realsee-Ae44j89x
```

Package into a **new, nonexistent** output directory; this is the command that produced v2, and rerunning unchanged intentionally refuses to overwrite it:

```text
python -I scripts/room_workflow/ffs_realsee.py .local/room-workflow/sources/realsee-Ae44j89x --output .local/reconstruction/ffs-th0028-realsee-v2 --expected-sha256 d5d16cc57dda4451f137031cd20d75555bd0cb03a298cbaa8f04137e002fd007
```

Post-fix focused verification:

```text
python -I -c "import sys,unittest; sys.path.insert(0,'scripts/room_workflow'); suite=unittest.TestSuite(unittest.defaultTestLoader.discover('scripts/room_workflow',pattern=p) for p in ('test_ffs_realsee.py','test_ffs_artifacts.py','test_ffs_argus*.py')); result=unittest.TextTestRunner(verbosity=1).run(suite); sys.exit(not result.wasSuccessful())"
```

Actual: **86 run, 84 passed, 2 skipped, zero failures**. Sampler and inferred-label regressions were observed failing before the fixes. Directory-symlink creation and an optional SDK check were skipped in this environment; no platform-coverage claim for those skips.

Independent parse-only verification used the application's installed OBJLoader and GLTFLoader:

```text
node "C:\Users\alexx\AppData\Local\Temp\claude\c--Users-alexx-Documents-ClaudeAgent-GenUI-Agent\da00bdaf-e4ba-42b9-8254-d3d0062c1db6\scratchpad\verify_realsee_loaders.mjs" . .local/room-workflow/sources/realsee-Ae44j89x .local/reconstruction/ffs-th0028-realsee-v2
```

Actual: both meshes parsed, all triangle-corner positions/winding exact, material assignments preserved, both embedded JPEG payloads exact, all 18 input hashes unchanged. Source manifest and conversion-receipt file hashes cross-checked. Maximum UV error `2.9802322387695312e-8`; maximum root world-coordinate error `4.440892098500626e-16` (Three.js quaternion recomposition roundoff). World extent in **unverified units**: `[5.278134047985077, 2.3873300552368173, 3.7295700311660775]`.

The checker stubs browser texture loading with placeholder Texture objects and rejects network fetches. Actual JPEG decoding is checked separately by the Python validator. This proves serialization/loader compatibility, **not rendered appearance or independent AT3D reconstruction semantics**. An initial exact world-coordinate assertion failed on roundoff; only that comparison was changed to a `1e-12` tolerance, not local coordinate comparisons.

Broader tests earlier in this same importer pass, before the final Python sampler/report fix:

- `npm test`: 103 core + 334 app passed (437 total).
- `npm run room:test`: 202 passed, **3 failed**, 2 skipped, 207 total. Failures in unchanged `scan-assisted.test.mjs`: `actual isolated Python replay returns only needs-review with resource evidence`; `exact host bindings, unknown authority and missing manifest reject`; `configuration and failed spawn release the lock without claiming uncertain execution`. All reported `CPU idealization failed, timed out or was cancelled.` at `cpu-review-worker.mjs:29:44`. Cause unproven; no resource guard weakened. The same failures occurred in earlier passes; this is not a green full-suite claim.
- Logs retained under `C:\Users\alexx\AppData\Local\Temp\claude\c--Users-alexx-Documents-ClaudeAgent-GenUI-Agent\da00bdaf-e4ba-42b9-8254-d3d0062c1db6\scratchpad\realsee-npm-test.log` and `C:\Users\alexx\AppData\Local\Temp\claude\c--Users-alexx-Documents-ClaudeAgent-GenUI-Agent\da00bdaf-e4ba-42b9-8254-d3d0062c1db6\scratchpad\realsee-room-test.log`.

## Pending owner exercise and decision

Next: obtain the fresh panorama-specific [Weave prerequisite](../FIGMA_WEAVE.md) and finite execution approval for the bounded visual/render pass, then integrate the candidate through reviewed viewer/catalog contracts. Inspect geometry, missing surfaces, orientation, texture seams and lighting against the supplied panorama and separate scan. Do not normalize or align without an explicit, recorded transform and evidence. Record acceptance against the exact candidate/revision after inspection.

Not checked: rendered appearance, keyboard/focus/touch behavior, scale/scan alignment, hidden-surface completeness, native 1440p/60 fps. No frontend change, live catalog switch, GPU render, new inference, deletion, commit or publication. Chair/Kimodo remain paused. **Decision: offline packaging verified; full-room demo and owner acceptance remain pending.**

### Continuation — panorama viewer preparation, 2026-10-28

The separately approved 117-credit panorama Weave packet is now inspected. Candidate v2 has been integrated as an inferred, unaligned viewer, with original scan/photos separate and root orientation preserved. [Render acceptance](crime-scene-realsee-render-v1.md) records the independent review, focused fixes, passing application/cloud checks, unresolved CPU-worker regression failures and exact sealed local Modal proposal. The owner subsequently approved that exact proposal. Its single attempt reached the 1,200-second client timeout without returning images, video or worker results; the app is confirmed stopped with zero tasks and no retry authorized. Actual rendered appearance and billed cost remain unknown. The importer evidence above remains historical to its packaging-only pass.
