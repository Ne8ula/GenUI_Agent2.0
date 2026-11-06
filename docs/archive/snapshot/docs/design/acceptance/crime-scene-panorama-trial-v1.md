# Panorama reconstruction trial — preparation

2026-10-28 · `crimescene` · HEAD `0380e13efbdfa8c1ee29fe2c621927852b7766b7` plus preserved dirty/untracked work. Panorama-only continuation of [Task 2](../../superpowers/plans/2026-10-28-crime-scene-argus-kimodo.md). Owner quality decision: **pending**.

**Reconstruction remains partial, not executable or approval-ready.** The owner approved the frozen **$1 CPU-only native-padding inspection** and its sole attempt completed (see execution below). Native exact-white padding is measured; angular calibration and the remaining valid rectangle are **not resolved**. No source admission or model inference occurred. That CPU allowance does not transfer to another stage; GPU/model/render spending remains **$0 authorized**. Chair and motion work remain paused.

## What changed

[ffs_argus.py](../../../scripts/room_workflow/ffs_argus.py) adds two offline preparation helpers, covered by [test_ffs_argus.py](../../../scripts/room_workflow/test_ffs_argus.py):

- `inspect_padding(image)` inspects native RGB rows, reporting only a **candidate** contiguous exact-white bottom band. Other rows are **unclassified**, not automatically valid. White walls, mixed boundary rows, coloured padding, top padding and interior holes cannot be resolved by this detector. It never admits a source or emits geometry. Native real-media use belongs on Modal; only synthetic images were processed here.
- `plan_bottom_crop(native_height, valid_rows)` proposes a full-width, bottom-only crop after **full-panorama OpenCV INTER_AREA downsampling to 560×280**. It retains top row 42, rounds the stop down to a complete 14-row patch, and rejects any included area-resampling footprint crossing the supplied valid-row boundaries. Caller-supplied rows are not calibration evidence. The result never grants admission or execution.

At the initial helper-only snapshot below, these helpers had **no production worker callers** and the historical preflight worker/receiver were unchanged. The later continuation wires padding inspection only; strict partial-region rejection remains unchanged. Neither pass completes an inference adapter. Prior preflight outputs/plans remain untouched; their consumed approval cannot authorize changed code.

Initial helper-only source snapshots (historical; superseded by the frozen continuation plan):

| File | SHA-256 |
| --- | --- |
| `ffs_argus.py` | `80e9107d130523a8dee3633904f2352232064820b2faed63a7679a2b4ea48458` |
| `test_ffs_argus.py` | `dd7df818182cba967314389d7ca7cb1738a74c9cdd6826cbc3c933c5ceaf67c0` |

## Calibration finding and smallest adapter

The [official FARO export page](https://knowledge.faro.com/Software/FARO_SCENE/SCENE/Exporting_Panoramic_Images), whose tags include SCENE 2023, confirms bottom white padding but provides no quantitative angular bounds, native valid-row boundary or source pose. Its fetched last-updated field is empty; do not rely on the search snippet's date. Earlier source/export investigation is retained in [execution prerequisites](crime-scene-execution-prerequisites-v1.md#panorama--padding-explained-calibration-not-established). A 2:1 raster and a visually plausible panorama do not close this gap.

Pinned Argus commit `a7333c0a6d1e370260ebf47ac0f8adce272f3083`:

- [Demo preprocessing](https://github.com/realsee-developer/Argus/blob/a7333c0a6d1e370260ebf47ac0f8adce272f3083/demo_gradio.py#L152-L182) resizes the **entire** panorama with `cv2.INTER_AREA`, then takes rows `[42,238)`.
- [Unprojection](https://github.com/realsee-developer/Argus/blob/a7333c0a6d1e370260ebf47ac0f8adce272f3083/argus/utils/geometry.py#L57-L103) uses original-grid row `v+42`, latitude `((v+42)/280 - .5)*pi`, longitude `(u/560 - .5)*2*pi`; there is no `+.5` pixel-centre correction. Depth is radial, not camera-z. World conversion executes `R*p+t`; do not invert it based on the contradictory pose docstring.
- Therefore **shortening only the bottom** does not require rewriting unprojection. This narrows the earlier general crop-adapter proposal. Changing the top, resizing the crop, or replacing INTER_AREA with a wider filter would invalidate this reasoning.
- Example only: `[42,224)` produces a 560×182 input, 13×40 patches, and at most 101,920 points. **224 is not a measured FFS valid boundary.** Native footprint safety must be computed from a separately verified source rectangle.
- [Patch embedding](https://github.com/realsee-developer/Argus/blob/a7333c0a6d1e370260ebf47ac0f8adce272f3083/argus/layers/patch_embed.py#L65-L78) and [DPT head](https://github.com/realsee-developer/Argus/blob/a7333c0a6d1e370260ebf47ac0f8adce272f3083/argus/heads/dpt_head.py#L188-L249) use actual dimensions in multiples of 14. This is source-level shape compatibility, **not a successful forward pass**. Learned positional context changes with crop shape; quality may worsen.

### Evidence needed to resolve the real source

1. Bind native inspection to the recorded PNG hash, verify header/CRC/decode, then inspect exact native rows and boundary patches. Do not run the new detector on the lossy 2048×1024 preview and scale its rows up. Do not treat its unclassified rectangle as a verified mask.
2. Obtain source-bound SCENE export/scanner calibration establishing angular mapping, pixel convention and orientation. If that cannot be obtained, use an explicitly reviewed **scan-assisted empirical calibration**, not an assumed 360×180 mapping: record at least 12 architectural 2D–3D correspondences spread across azimuth and elevation, fit on eight and hold four out. Fit only the declared camera/projection parameters; no arbitrary image warp, inferred floor or semantic clue labels. Record residuals in native and 560×280 pixels, parameter uncertainty and the fitting/held-out split. This procedure is proposed, not implemented, run or accepted; its numeric acceptance thresholds must be frozen before fitting. A fit is an estimated calibration, not recovered manufacturer metadata.
3. Bind the resulting calibration, validity mask, original dimensions, resampling method, integer crop and review to the exact input and adapter hashes. Admit a partial source only through that reviewed adapter contract. The current v1 validator continues rejecting it.

**Result:** missing-region treatment is specified and its crop arithmetic tested; actual source calibration still requires unavailable evidence or separately approved cloud calibration work. No claim of resolution is made.

## Preserved comparison and explicit labels

Only read-only hashes/metadata were inspected locally. The retained measured-scan display copy and its provenance match the preservation manifest:

| Retained file under `.local/reconstruction/ffs-th0028-scene-v2/` | Bytes | SHA-256 |
| --- | ---: | --- |
| `scene.ply` | 10,684,860 | `f72bf4ff75ee242e4327d442e02ae9bb11ee779ba2b0c8684efe0ab571e984c0` |
| `returned-report.json` | 630 | `e685edbe36d06c6652dff0fc7bdbb3b18f2b6466b2ce10c3b9be95f74e1d68af` |
| `plan.json` | 2,045 | `0900a230e262358d056b758137349bf555777da065236dabc8bd097320a3f726` |
| `receipt.json` | 941 | `d301111f3467008c919e3bea35419c6a06e0e8e1638bf604b68f7943d29ce3e8` |

This PLY is **712,312 voxel-averaged display points** derived from the original 43,849,337-point `th_0028_coul.las`, not the original LAS bytes. No original evidence, PLY, catalog entry or receipt was overwritten or removed. The original LAS remains at its recorded source; no new full-LAS transfer or integrity verification is claimed.

Required trial labels, not yet wired into a viewer:

- **Source evidence:** original panorama and measured scan; identify the PLY reduction explicitly.
- **Inferred:** every Argus depth/point, including visible-image predictions. Confidence is a model score (`1+exp(logit)`), not a probability or source-validity mask.
- **Unknown / no geometry:** invalid pixels, omitted crop bands, occlusions, hidden/back surfaces and rejected/nonfinite predictions. No floor, caps, hole filling or watertight claim.
- **Scan-assisted alignment:** separately stored transform and fit/held-out evidence; preserve raw Argus outputs. Alignment does not establish independent metric accuracy. Never substitute scan points for missing predictions.

## One bounded Modal reconstruction trial — draft envelope

This is one **future GPU attempt**, not a batch, retry allowance, rendering job or permission to download. It cannot be submitted until the blockers below close and an executable, hash-bound plan receives exact owner approval.

| Item | Proposed bound |
| --- | --- |
| Conditioning input | Only `pano_th_0028_coul_full.png`, 208,807,902 bytes, 20288×10144; expected SHA-256 `7729a11c25a7f72c56c1b88ad4071c848078474611f2778fa9acc8c3bc654708`; exact Zenodo member/range/CRC from `ffs_argus.SOURCE`, reacquired into temporary Modal storage |
| Comparison upload | Only the 10,684,860-byte hash-bound PLY above, for evaluation, never model conditioning; no solution sheet, clue inventory, ordinary photos, credentials or source upload to an image-generation service |
| Code / model | Argus code pin above, Apache-2.0; official HF repository `RealseeTechnology/argus-realsee3d`, revision `5fcd9669f5aa4d438941b4728919a3182b620ddc`, CC-BY-NC-4.0/manual access gate |
| Checkpoint | `argus_realsee3d.pt`, exactly 2,621,544,324 bytes; expected LFS SHA-256 `b76d117c65c8e569f5ac9a90b1b412fe96a104b8b6246700d2b664a80f09c300` from [pinned public metadata](https://huggingface.co/api/models/RealseeTechnology/argus-realsee3d/revision/5fcd9669f5aa4d438941b4728919a3182b620ddc?blobs=true). Payload not downloaded/verified; account entitlement and owner agreement not established |
| Compute | One Modal A100 40 GB, four physical CPU cores, 16 GiB requested RAM; one container, one submission, retries zero; 600-second function timeout, 300-second startup timeout, 1,200-second client deadline; no larger-GPU fallback |
| Inference | One panorama, one forward pass, full resize560×280, fixed top42, independently reviewed patch-aligned stop at or below238; no generated viewpoints, repeated seeds, motion or meshing |
| Output limits | At most109,760 inferred points; fixed-name non-object numeric depth/confidence/pose/image arrays ≤4 MiB, points ≤2 MiB, diagnostics ≤4 MiB and JSON report ≤256 KiB. Receiver must bound decoded shapes/bytes, reject pickle/object arrays, unknown fields/names, nonfinite/empty/missing heads, and validate hashes. Receiver/converter not implemented yet |
| Retention | Exclusive new attempt directory; preserve raw output, rejected output identity and failed/uncertain receipt; never reuse the old preflight directory. Source/checkpoint only in temporary cloud storage, no persistent volume. Provider cache/log retention is not independently controlled here |
| Cleanup | Cancellation/deadline stops only the created app; verify stopped/zero tasks, preserve uncertainty, never resubmit an ambiguous attempt. No credential in image/log/receipt; approved secret route needed only for gated acquisition, no inference network or auto-download fallback |
| Proposed operational allowance | **$2 for the GPU trial**, currently **$0 authorized**; not a provider-enforced hard-dollar cap and not transferable to calibration, image builds, download stages or UI capture |

At the [published Modal rates](https://modal.com/pricing) recorded on 2026-10-28, requested GPU+CPU+RAM for600 running seconds is approximately **$0.402552**, or **$0.603828** for900 seconds including a full300-second startup. These are resource-rate calculations, not billed totals or performance evidence; actual usage, startup, region, storage, transfer and other charges can differ. No provider budget setting was inspected or changed. GPU memory adequacy/runtime are untested; OOM or timeout ends the sole attempt.

**Separate prerequisites, not hidden spending in the $2:** any native source/calibration inspection, model acquisition or image build needs its own exact finite approved stage. The separate native CPU inspection worker/receipt is now implemented in the continuation below, but has not run; calibration evidence is still absent. Native inspection alone cannot invent angular calibration. No model image build is proposed as executable while a full compatible package/hash/base-image lock is absent. Upstream only pins torch2.6.0, torchvision0.21.0 and numpy1.26.1; those three versions are not dependency closure.

### Submission blockers

- Source-bound angular calibration and reviewed native validity rectangle absent.
- Partial-source adapter admission, actual preprocessing/model call, numerical converter, bounded receiver and scan comparison not integrated/tested.
- Gated checkpoint agreement/access and actual payload verification absent. Use safe weights-only loading and checked state keys; do not import the Gradio demo with its import-time download/load or silently fall back to unpinned assets.
- Complete package/wheel hashes, licences, base-image digest and acquisition/build stages not frozen.
- Exact executable-plan digest and fresh finite approval absent. No execution command is supplied because none is ready.

## Verification and decision

- TDD: four padding tests failed for missing `inspect_padding`, then passed. The oversized-IHDR fixture initially lacked a PNG body and was corrected before implementation. Four crop tests failed for missing `plan_bottom_crop`, then passed; an additional real OpenCV synthetic resampling check passed.
- Default Python: **39 Argus tests,38 passed,1 skipped** (Modal SDK). Existing `genrc-client` Python: **39 tests,38 passed,1 skipped** (OpenCV). The latter constructs the actual existing Modal SDK function without submitting; it is reused solely as a client environment, not as an alternate reconstruction route. OpenCV4.13.0.92/NumPy2.4.4 in the default interpreter supplied the synthetic area-resampling check; this is not a tested cloud dependency lock.
- `npm test`: **103 core +334 app tests passed**. `npm run room:test`: **207 tests,204 passed,1 failed,2 skipped**. Failure: `actual isolated Python replay returns only needs-review with resource evidence`, reporting `CPU idealization failed, timed out or was cancelled`. Its single-test diagnostic rerun passed; the full-suite failure remains recorded and its cause unproven. No guards weakened or unrelated code changed.
- Reused existing Argus worker for pinned-source inspection and existing reviewer for a read-only audit of the two helpers/tests. Reviewer found no verified defects; highlighted absent live callers, filter/source binding requirements and changed-crop quality uncertainty. No new agents. Configured model aliases are not independent provider-identity evidence.
- Preserved scan/receipt hashes above verified; no local real-scene geometry processing. Helpers do not establish calibration or a working demo. No frontend change, Weave generation, model download, installation, Modal run, deletion, commit or publication.

**Decision: pending / hold execution.** Next owner exercise is review of the actual source-calibration evidence and the subsequently frozen executable plan—not acceptance of a guessed mapping or this draft resource envelope.

## Native-padding continuation — 2026-10-28

The owner requested continued implementation toward the full room. This does not supply a finite execution allowance. Reused the existing preflight lifecycle rather than adding a second launcher. [ffs_argus_cloud.py](../../../scripts/room_workflow/ffs_argus_cloud.py) now accepts `--regions`; its worker measures native rows before preview resizing and both worker and receiver bind results to the preserved panorama SHA-256. Stage-specific plan/result kinds, app name and exclusive output directory prevent reuse of the old attempt or approval. No inference or source admission is enabled.

### Frozen CPU-stage proposal — not submitted

Offline plan: `.local/reconstruction/ffs-th0028-argus-regions-plan-v1.json`, SHA-256 **`a3dae6e560666afed3fda480187ece4eb4886655981ada8ffe6b6ebca7cbdbac`**. Created with:

```text
python -I scripts/room_workflow/ffs_argus_cloud.py --regions --plan .local/reconstruction/ffs-th0028-argus-regions-plan-v1.json
```

- **Scope:** one CPU-only Modal attempt, including its existing image recipe; no model, GPU, scan upload, scene rendering or calibration fit. Download only the 208,807,902-byte panorama member/range/CRC already recorded above from Zenodo into temporary cloud storage. Upload only reviewed worker modules, not evidence photographs or secrets.
- **Resources:** two physical CPU cores, 8,192 MiB RAM, one single-use container, zero configured retries; 300-second function and 300-second startup limits, 900-second client deadline. Infrastructure restart behavior is not an exactly-once guarantee.
- **Recipe:** existing Modal SDK1.6.1; Debian slim/Python3.12.12; Pillow11.2.1. FFS source licence CC-BY-NC-SA-4.0; Pillow uses its HPND licence. No model terms apply. Package versions are pinned, but the image/base/transitive artifacts are not a complete digest-locked environment; no build has verified compatibility.
- **Returns:** only JPEG preview ≤1 MiB/2048×1024 and JSON diagnostic ≤16 KiB, plus local plan/receipt. Exact-white bottom rows are candidates; everything else remains unclassified. No geometry emitted.
- **Retention:** new `.local/reconstruction/ffs-th0028-argus-regions-v1/`, reserved before build with exclusive creation; retain failed/partial outputs and receipts. Existing preflight and measured scan stay untouched. Temporary source removed on normal worker exit; no persistent volume. Provider caches/log retention are not independently controlled.
- **Cleanup:** stop only this created app, require confirmed stopped/zero tasks through the existing helper, retain failed-or-uncertain status on cancellation or unconfirmed cleanup. Never retry an ambiguous submission.
- **Proposed allowance:** **$1 operational**, currently **$0 approved**; no transfer to GPU inference, further calibration, model acquisition or UI references. This is not a provider-enforced dollar cap. At the official rates rechecked 2026-10-28 (CPU $0.0000131/core-second; RAM $0.00000222/GiB-second), 600 seconds of requested CPU/RAM costs approximately **$0.026376**, excluding image-build, transfer, cache and other charges. The pricing page does not supply a distinct image-build rate; total cost is not guaranteed. The two-second scaledown window is configured.
- **Code binding:** plan hashes six actual source/helper files. Current `ffs_argus.py`: `c8daee4c2c56264781e56cb03a75bf9a954a04324a66ed0675713abdf32403c5`; `ffs_argus_cloud.py`: `0d7eb3148e60f51c0084f35b3503c3d84bdfcef0a38a583d5ddc5e864b97d136`. Changed code invalidates this proposal.

This stage measures the native missing-band candidate; **it does not finish angular calibration or produce the requested 3D room**. The reconstruction blockers above still apply. No execution command with approval flags is issued without an actual owner decision.

### Continuation verification

- New routing tests initially failed for missing mode/signatures/output constant. Two additional malformed-numeric cases reproduced acceptance of boolean row coordinates and floating dimensions; explicit padding type checks fixed both.
- Full focused suite: default Python **48 run,47 passed,1 SDK skip**; existing Modal-client Python **48 run,47 passed,1 OpenCV skip**. Thus actual synthetic OpenCV area-resampling and both real SDK function constructions were checked across the two environments, without submission.
- `npm test`: **103 core +334 app passed**. `npm run room:test`: **207 run,205 passed,0 failed,2 skipped** (owned-process-tree and actual CPU-broker-adapter checks). Earlier full-suite failure remains historical evidence, not silently erased. Logs: session scratchpad `panorama-regions-npm-test.log` and `panorama-regions-room-test.log`.
- Reused the existing read-only reviewer, no new worker. No blocking findings. Two low-severity limitations deferred: source SHA is compared after bounded decoding (but before any return), and some pre-existing top-level numeric receipt fields use equality rather than strict integer typing. Neither grants admission; neither was presented as fixed. Real native timing/mounts and cloud cleanup remain unrun.
- **Owner decision at preparation: pending; hold execution.** No new spend, install, model acquisition, frontend edit, deletion, commit or publication occurred in that preparation pass. The subsequent approval/execution is recorded below.

## Approved native inspection and scene converter — 2026-10-28

Owner response to the exact frozen CPU proposal: **“Approved. Continue implementation until full 3D room.”** This approved that $1 operational CPU stage, not the unpriced/unready GPU, calibration or visual stages.

Executed once with the existing client:

```text
.local/reconstruction/genrc-client/Scripts/python.exe -I scripts/room_workflow/ffs_argus_cloud.py --regions --plan .local/reconstruction/ffs-th0028-argus-regions-plan-v1.json --approved-plan-sha256 a3dae6e560666afed3fda480187ece4eb4886655981ada8ffe6b6ebca7cbdbac --approved-dollars 1 --confirm-billable
```

**Observed:** exit0; app `ap-Ce8m3ZUZ9ueHenrlixQ9wA`; receipt status `regions-returned-and-stopped-needs-review`; cleanup reports **stopped, zero tasks**. Source is exactly 208,807,902 bytes with the expected SHA-256. Native contiguous exact-white band is **[8453,10144)**, 1,691 rows. Rows [0,8453) remain **unclassified**, not calibrated/valid by implication. Preview was visually inspected; it matches the retained preflight preview byte-for-byte. No geometry or inference ran. Actual provider-billed cost/duration/peak RAM were not returned; $1 is the approved allowance, not a measured charge. The one-attempt authority is used and cannot authorize a retry or another stage.

Returned evidence under `.local/reconstruction/ffs-th0028-argus-regions-v1/`:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `plan.json` | 2,276 | `a3dae6e560666afed3fda480187ece4eb4886655981ada8ffe6b6ebca7cbdbac` |
| `report.json` | 1,002 | `60c5309e9a8df707eea49e30aa11bd91f179f1fc299a30cb15bd305e6c2c72ce` |
| `receipt.json` | 1,251 | `f2ced042776ffa819f3714f1383e82749c1fc008c64dd30e289013ddfbb2b26c` |
| `preview.jpg` | 166,363 | `ffe28e4537d5ed7877a1821ca9134f315b390b2eb42646cc3b0b85977a6572a6` |

Conditional arithmetic, **not admission**: if the entire upper rectangle were independently validated, `plan_bottom_crop(10144, [0,8453])` gives grid rows **[42,224)** and native row footprint **[1521,8116)**. This avoids the observed band; it cannot establish the angular mapping or classify other missing pixels. Original measured-scan PLY and all three provenance hashes above were rechecked unchanged.

### Offline conversion implemented

Added [ffs_argus_scene.py](../../../scripts/room_workflow/ffs_argus_scene.py) and [seven focused tests](../../../scripts/room_workflow/test_ffs_argus_scene.py). `convert_scene(points, confidence, cameras, admission, *, input_sha256)` uses the existing source validator, requires exact native float32 arrays, validates all points before filtering, checks proper camera rotations and applies a fixed linear-median confidence filter. Points remain in Argus model-world coordinates; no second metric scaling, scan alignment, mesh, cap, floor or hidden-surface completion. Raw points/confidence and cameras are preserved as detached arrays. Raw depth/images/pose must additionally be retained by the future producer.

Ruling: retain only upstream's default single-image **196×560** crop until a calibrated partial-source adapter is integrated; accepting arbitrary smaller arrays now would omit their reviewed crop binding. **The real FFS panorama cannot pass this converter today.** The additional required `input_sha256` keyword binds the independently verified input hash rather than trusting the admission's self-reported hash. Hash-bound source review still requires a trusted current owner record, not a model-authored dictionary.

`pixel_indices` are flattened positions in the 196×560 crop: full-grid row=`index//560+42`, column=`index%560`; they are not native-image indices. Conversion reports are in-memory diagnostics, not standalone hash-bound artifacts. Future producer/receiver must bind numerical payload hashes, checkpoint, calibration, crop and settings before any promotion.

Source SHA-256: `ffs_argus_scene.py` **`1fe4d54b9f3c31db5ea714038f45fd750d2af574f1c31af7742782bc56553481`**; test **`7bd8561653eab7ac4b34096693639d16e5dc6cad444af9bbe53b5b7f5efd87b2`**. The six source files in the executed CPU plan were not edited during execution or this converter pass.

Verification: seven converter tests failed because the module did not exist, then passed. Full focused suite in both environments: **55 run,54 passed,1 skipped** each (default SDK skip; client OpenCV skip). Reused Argus worker for contract advice and existing reviewer for independent read-only review; reviewer found no verified defects. Configured aliases are not independently verified inference identities. Limits retained: pixel convention is documented here rather than embedded in the report; artifact provenance binding and model/receiver integration remain unfinished.

`npm test`: **103 core +334 app passed**. Latest `npm run room:test`: **207 run,202 passed,3 failed,2 skipped**. All three failures report `CPU idealization failed, timed out or was cancelled` in unchanged `scan-assisted.test.mjs`: `actual isolated Python replay returns only needs-review with resource evidence`; `exact host bindings, unknown authority and missing manifest reject`; `configuration and failed spawn release the lock without claiming uncertain execution`. Cause is not established by this run. No guards weakened and no passing rerun substituted. Full logs: session scratchpad `argus-scene-npm-test.log` / `argus-scene-room-test.log`.

**Full room remains incomplete.** Next real-data prerequisite is source-bound angular calibration (or an explicitly reviewed scan-assisted fit), then the partial-source adapter. Checkpoint entitlement/terms, reproducible model build, inference/export receiver and panorama-specific visual approval remain open. No GPU/model/visual execution is authorized by the consumed CPU approval. Owner geometry/visual acceptance remains pending.
