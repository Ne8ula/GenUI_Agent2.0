# Hypersim living-room baseline

The owner accepted Apple Hypersim and selected **ai_001_004** on 2026-10-18. This is a synthetic living room with one documented camera trajectory, cam_00. Scene selection is accepted; the reconstruction and research milestones are not yet owner-accepted.

**Current demonstration (2026-10-20):** [v5 refinement](evidence/room-refinement-v5/REVIEW.md) adds simplified dots and explicitly assumed adjoining spaces to [v4's all-view reconstruction](evidence/full-room-v4/REVIEW.md). All 100 views condition this demonstration; measurements are not held-out accuracy. The r03 experiment below and its original viewer route remain intact. [Visual review](../../design/revisions/room-refinement-v5/REVIEW.md); seamless hidden geometry and watertightness are not claimed.

## Bounded tooling decision

Implement an offline CPU baseline using supplied metric ray distances, camera poses and per-scene intrinsics. Use CPython 3.12 in `.local/reconstruction/venv` with the pinned [requirements](../../../scripts/reconstruction/requirements.txt): NumPy, h5py, Pillow and Open3D. Install only into this isolated environment. No model weights, training, CUDA setup, paid services or original mesh purchase are required. Frontend integration and artistic presentation are separate work subject to the fresh Weave prerequisite.

The [fixture](ai_001_004.json) freezes 20 integration frames and four distinct evaluation frames before reconstruction. Download only selected entries from Apple's scene archive, with a 512 MiB transfer limit and 1 GiB extraction limit. Keep large inputs/outputs and the environment under the git-ignored `.local/reconstruction/`; retain input hashes and a compact evidence report. Cancel with Ctrl+C; incomplete outputs must not be presented as completed runs.

## Method and evidence limits

Convert radial distance to planar camera depth using the official scene-specific ray matrix. Convert camera translations from asset units to meters. Hypersim cameras use x-right/y-up/z-back; Open3D integration uses x-right/y-down/z-forward. Fuse only integration-frame depth into a 2 cm TSDF, then extract a triangle mesh. Use source HDR color with an explicitly recorded tone mapping for display.

Audit reconstructed pixel positions against supplied position maps on two integration frames. This checks coordinate implementation, not independent geometry accuracy. Raycast the mesh at the four withheld camera poses and report depth error and hit coverage over valid reference pixels. These views come from the same synthetic scene and trajectory; this is within-scene reconstruction testing, not generalization or real-world validation. No scene completion, object detection, automatic memory anchors or photo-only reconstruction is claimed.

Raw output stays separate from any future artistic treatment and user memory. Unknown regions remain unknown. No original full asset mesh is bundled; its separate purchase is unnecessary for this bounded test. The downloaded upstream `LICENSE.txt` covers toolkit software; the dataset's CC BY-SA 3.0 statement is in its README. The run report records that statement at the pinned upstream revision and links the dataset license separately.

## Reproduce and inspect

Use an existing CPython 3.12 interpreter to create `.local/reconstruction/venv` with `python -m venv .local/reconstruction/venv`. The tested environment was Python 3.12.12 on Windows. The [full dependency lock](../../../scripts/reconstruction/requirements-lock-win-py312.txt) records the installed transitive versions; this does not install or start the optional notebook/web tools pulled in by Open3D as services.

From the repository root in PowerShell:

```powershell
$roomPython = '.local/reconstruction/venv/Scripts/python.exe'
& $roomPython -m pip install --only-binary=:all: -r scripts/reconstruction/requirements-lock-win-py312.txt
& $roomPython -m unittest discover -s scripts/reconstruction -p 'test_*.py' -v
& $roomPython scripts/reconstruction/hypersim.py fetch
& $roomPython scripts/reconstruction/hypersim.py reconstruct --output .local/reconstruction/runs/ai_001_004-owner-review
```

Use a fresh output directory for each run. Fetch resumes verified entries; completed cached inputs are hash-checked without network access. The script refuses unsupported intrinsics/dimensions, unreleased selected frames, invalid poses, mismatched hashes and overwriting an existing run. Ctrl+C leaves an incomplete/failed status; interruption during native fusion may not be handled until the current native call returns.

The recorded run is [r02](evidence/r02/report.json), with [all four source/mesh/error comparisons](evidence/r02/evaluation.png), [input hashes and provenance](evidence/r02/input-manifest.json), [source hashes](evidence/r02/source-hashes.json), [16 passing checks](evidence/r02/tests.txt) and [dependency check](evidence/r02/dependency-check.txt). Large local outputs are [mesh](../../../.local/reconstruction/runs/ai_001_004-r02/room-mesh.ply), [point cloud](../../../.local/reconstruction/runs/ai_001_004-r02/room-points.ply) and [camera transforms](../../../.local/reconstruction/runs/ai_001_004-r02/cameras.json); recreate them with the commands above in a new checkout.

## Observed result, 2026-10-18

20 integration frames produced 229,126 mesh vertices, 443,923 triangles and 220,002 exported points. The selected input package is 89,630,751 bytes; measured HTTP response-body transfer was 90,173,383 bytes, below the 512 MiB bound. Coordinate audit p95 discrepancy against supplied position maps was 3.97 mm and 4.16 mm (same-renderer consistency only).

| Withheld frame | Mesh hit coverage over valid reference pixels | Mean radial-depth error on hits | Within 5 cm, including missing pixels as failures |
| --- | ---: | ---: | ---: |
| 0012 | 99.59% | 5.97 mm | 98.59% |
| 0037 | 15.72% | 513.14 mm | 0.65% |
| 0062 | 99.68% | 9.23 mm | 97.95% |
| 0087 | 99.83% | 8.01 mm | 98.33% |

Frame 0037 faces an opening and substantial missing geometry. Do not average away or discard it, claim full-room recovery, or silently change the frozen evaluation set. r01 and r02 produced identical mesh hashes; r02 fixes zero-hit evaluation accounting and clarifies license provenance. The [owner review record](../../design/acceptance/hypersim-ai-001-004-r02.md) is pending.

## Frame 0037 double-check, 2026-10-19

The [targeted audit](evidence/frame0037-audit/report.json) and [visual comparison](evidence/frame0037-audit/comparison.png) confirm that frame 0037 matches Apple's original preview. Backprojecting its depth using its supplied camera agrees with its separately downloaded world-position map: median 1.24 mm, p95 3.56 mm over 738,562 finite pixels. The frame-to-pose index mapping is correct.

Only **0.80%** of valid sampled frame-0037 surface points agree with any of the 20 integration depth maps within 5 cm after reprojection (nearest pixel, stride 4, same 12 m planar-depth bound). The other evaluation views have 99.76–99.95% source support under this check. Among frame 0037's existing mesh hits, 95.88% are more than 5 cm behind the reference surface: missing foreground geometry lets rays hit farther surfaces. This supports inadequate directional coverage in the original every-fifth-frame input selection as the dominant cause, rather than a mislabeled image or incorrect pose conversion.

A separate **self-fit diagnostic control** integrates only frame 0037's own depth and obtains 95.79% coverage and 1.71 mm mean error on hits. This intentionally uses the evaluation image as input and is **not** a held-out improvement, an accepted replacement, or part of r02. The comparison labels it accordingly. Missing borders/invalid regions remain visible.

Reproduce with the existing environment:

```powershell
& .local/reconstruction/venv/Scripts/python.exe scripts/reconstruction/diagnose_frame37.py --fetch --output .local/reconstruction/frame37-owner-audit
```

`--fetch` retrieves only the original preview and position map into a separate diagnostic cache (64 MiB transfer cap), or verifies cached hashes. Use a fresh output directory. The original mesh, input manifest and evaluation split remain unchanged. A future reconstruction pass should choose other views with broader surface/directional coverage and retain 0037 as withheld; frame selection informed by this diagnosis must be reported as development tuning, not unseen-test generalization.

## Expanded development reconstruction, 2026-10-19

The requested visual-demo implementation now has an expanded [r03 fixture](ai_001_004-r03.json): all 96 released frames outside the same four evaluation frames. This is **development tuning after inspecting evaluation failures**, not an untouched benchmark. The original r02 fixture, cache and mesh remain intact. No evaluation depth or frame-0037 diagnostic position map was integrated.

The [report](evidence/r03/report.json), [inspected comparison](evidence/r03/evaluation.png), [input manifest](evidence/r03/input-manifest.json) and [18 passing checks](evidence/r03/tests.txt) record 312,015 vertices and 606,025 triangles. Additional transfer was 274,821,140 bytes, with 90,173,383 bytes from the reused original fetch accounted separately (364,994,523 bytes combined, excluding the separately capped diagnostic fetch).

| Withheld frame | Mesh hit coverage | Mean depth error on hits | Within 5 cm over all valid pixels |
| --- | ---: | ---: | ---: |
| 0012 | 99.957% | 5.52 mm | 99.097% |
| 0037 | 56.372% | 96.33 mm | 38.735% |
| 0062 | 99.982% | 8.30 mm | 98.556% |
| 0087 | 99.992% | 7.83 mm | 98.545% |

The doorway view remains incomplete despite broader inputs; full-room recovery is not established. The [browser demo](../../design/revisions/room-r03/REVIEW.md) now supports navigation, surfaces/points and source inspection under the owner's explicit first-pass Weave waiver. Reconstruction acceptance remains pending in the [r03 record](../../design/acceptance/hypersim-ai-001-004-r03.md).

```powershell
& .local/reconstruction/venv/Scripts/python.exe scripts/reconstruction/hypersim.py fetch --fixture docs/research/hypersim/ai_001_004-r03.json --data .local/reconstruction/data-r03 --reuse-data .local/reconstruction/data
& .local/reconstruction/venv/Scripts/python.exe scripts/reconstruction/hypersim.py reconstruct --fixture docs/research/hypersim/ai_001_004-r03.json --data .local/reconstruction/data-r03 --output .local/reconstruction/runs/ai_001_004-r03
```

Use fresh destination directories for reproduction. Omit `--reuse-data` to resume an existing expanded cache; omit it for a fresh full selected download if no r02 cache exists. The fetch preflights compressed member sizes plus conservative ZIP-header overhead before payload requests, then enforces actual transfer and extraction caps.

The public browser bundle is derived by `scripts/reconstruction/export_browser.py`; it verifies input/run hashes before copying the original PLY and encoding four source HDR views as JPEG. Reproduce into a fresh directory with `--run .local/reconstruction/runs/ai_001_004-r03 --data .local/reconstruction/data-r03 --fixture docs/research/hypersim/ai_001_004-r03.json --output <fresh-directory>`. The bundled `scene.json` records sizes, hashes, camera poses, source/license and evaluation data. The browser bounds and verifies the PLY download before parsing and rendering it.

## GenRC cloud completion pilot

The [Modal route](../../../scripts/reconstruction/GENRC.md) packages the verified r03 mesh and training-only depth checks for a separately labelled generated candidate. The first implementation adapts GenRC's perspective inpainting/depth modules to one central crop of camera 0037; it does not yet implement the paper's panoramic E-Diffusion or whole-room completion. The original r03 mesh and browser bundle remain unchanged. See [cloud acceptance](../../design/acceptance/genrc-cloud-pilot-v1.md) for executed checks, authorization and remaining blockers.

## Sources inspected

- [Official dataset README](https://github.com/apple-aiml-research/ml-hypersim): data layout, coordinates, release/license and original-asset boundary.
- [Official per-scene intrinsics](https://github.com/apple-aiml-research/ml-hypersim/tree/main/contrib/mikeroberts3000): ray matrix and pixel-center conventions.
- [Camera trajectory catalog](https://raw.githubusercontent.com/apple-aiml-research/ml-hypersim/main/evermotion_dataset/analysis/metadata_camera_trajectories.csv): scene and trajectory identity.
- [Open3D RGB-D integration](https://www.open3d.org/docs/release/tutorial/pipelines/rgbd_integration.html): TSDF and marching-cubes workflow.

Reading depth: official documentation and code/notebook excerpts; no new full-paper review. Dataset-derived evidence carries Apple Hypersim / Evermotion attribution and CC BY-SA 3.0. Preserve the original dataset license with downloaded inputs.
