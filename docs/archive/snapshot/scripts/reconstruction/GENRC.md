# GenRC on Modal: bounded perspective pilot

This implements the 2026-10-19 room-completion decision in [PLANNING.md](../../PLANNING.md). It is a **GenRC-adapted single-view perspective completion pilot**, not the complete paper's panorama/E-Diffusion or textual-inversion pipeline. It targets one 512px central crop of frame 0037 before attempting wider coverage. No viewer/UI edits are included.

## Status

- Local input preparation, geometry/contract tests, Python compilation and Modal job-definition dry runs passed.
- The prepared r03 input bundle is `.local/reconstruction/genrc-pilot-input-v1/input.zip` (14,126,178 bytes).
- The first authorized build failed on missing `clang++`. The separately authorized second attempt verified GCC/G++/CUB availability and successfully built PyTorch3D 0.7.2 in 215.63 seconds.
- The second attempt was stopped before GPU submission because `pyequilib==0.6.0` requires `torch>=2.8` and pip began replacing the compiled extension's Torch 1.13.1 ABI. App `ap-X3Ubg8eBYac0XXgBpOVsMa` was verified stopped with zero tasks. No automatic retry occurred.
- The separately authorized third build passed with `pyequilib==0.5.8`, ABI constraints, resolved Linux/Python-3.10 requirements and build-time version assertions. `pip check` reported no broken requirements.
- The single GPU smoke **passed** on NVIDIA A100-SXM4-40GB with Torch 1.13.1+cu117 / CUDA 11.7: full GenRC imports, CUDA arithmetic, 992 rasterized pixels at expected depth, projection and mesh I/O. App `ap-l9eZw5V0ahyYJeehE3vOto` is stopped with zero tasks.
- The client failed to deserialize Torch's version-string subclass after remote success. Saved JSON/runtime artifacts were recovered without another compute run. Return values now normalize to plain JSON; all 17 local tests pass, including a regression for this boundary. The reporting correction subsequently passed in the first generation invocation.
- The separately authorized first generation pilot **completed**: both models loaded, 30 diffusion steps and depth prediction ran, and a separate 84,967-triangle completion was exported. The plain-JSON result handoff also passed live. All original mesh arrays were independently verified unchanged.
- Visual review found invented window grilles and chair-like content; substantial gaps remain after filtering. **Do not promote this candidate.** See the [review and provenance](../../docs/research/hypersim/evidence/genrc-pilot-v1/REVIEW.md). The app is stopped with zero tasks; no automatic retry occurred. Actual charges have not been retrieved.
- Public Hugging Face metadata for the required official `stabilityai/stable-diffusion-2-inpainting` returned HTTP 401 on 2026-10-19. This does not establish that the weights are unavailable to an authorized account. The owner subsequently approved the explicitly unaffiliated `sd2-community` mirror. Revision `5f74973cbb64c8568780732c17f43eb269d63a0d` was downloaded and verified against its file hashes; original equivalence remains unverified. Publisher-linked IronDepth checkpoints were also acquired and loaded successfully.
- A separate project-local client contains Modal 1.6.1 and NumPy 2.2.6. The original reconstruction and Folio environments remain unchanged. Local GPU inference packages were not installed.

## Architecture and evidence

`genrc_prepare.py` verifies the existing Hypersim input/run hashes and packages the original colored mesh, frame-0037 **pose only**, and camera-Z depth probes from all 96 training frames. Withheld frames 0012/0037/0062/0087 contribute no RGB or depth conditioning. The evaluation remains development-tuned, not a fresh held-out benchmark.

The 1024x768 source camera is cropped at x=128 to 768x768 and scaled to 512x512. Intrinsics use half-pixel centers and OpenCV camera coordinates. Source ray distances are converted to camera Z depth before sampling the training observations.

`genrc_worker.py` loads immutable source arrays, renders the cropped camera, generates RGB only in holes intersecting the requested pixel ROI, and gives IronDepth all missing depth as untrusted. A hole outside the ROI is not incorrectly treated as fixed zero depth. Inpainting mask expansion and global mesh cleaning are disabled. The custom prompt is applied after the upstream constructor, which otherwise overwrites it.

New geometry is limited by existing room bounds, 10cm triangle edges, finite 0.1-12m camera depth, nonzero triangle area and vertex/centroid checks against training depth. Newly generated boundary vertices may snap by at most the configured 0-2cm to existing vertices; geometry checks run again afterward. Original vertices/faces are not moved or removed. This uses less freedom than the owner's permitted small candidate adjustments.

Outputs include `candidate.ply`, `completion.ply`, face/vertex provenance, before/generated/mask images, metric depth arrays, views 0036/0037/0038 and a result manifest with hashes, source/model identity, runtime and peak VRAM. Sparse depth probes and bounding boxes do not guarantee correct openings, semantics or unseen shape. Review the doorway from multiple angles before extending this pilot. Original mesh and browser assets are never overwritten.

## Reproducible commands

Run from the repository root in PowerShell. Existing project-local environments:

```powershell
$reconPy = '.local/reconstruction/venv/Scripts/python.exe'
$cloudPy = '.local/reconstruction/genrc-client/Scripts/python.exe'
& $reconPy -m unittest discover -s scripts/reconstruction -p test_genrc.py -v
& $reconPy scripts/reconstruction/genrc_prepare.py --output .local/reconstruction/genrc-pilot-input-v2
& $cloudPy scripts/reconstruction/genrc_modal.py smoke --dry-run --output .local/reconstruction/genrc-smoke-plan-v2
```

Fresh client setup if needed: `uv venv --python 3.12 .local/reconstruction/genrc-client`, then `uv pip install --python .local/reconstruction/genrc-client/Scripts/python.exe modal==1.6.1 numpy==2.2.6`. Use existing Modal authentication; do not put tokens in this repository.

**Executed third-attempt command (historical; do not rerun into this existing directory):**

```powershell
& $cloudPy scripts/reconstruction/genrc_modal.py smoke --confirm-billable --output .local/reconstruction/genrc-smoke-v3
```

This built the pinned GenRC/PyTorch3D/EfficientNet sources in a CUDA 11.7/Python 3.10 image, then tested CUDA arithmetic, actual PyTorch3D rasterization, full GenRC imports and mesh I/O without model weights. A100-40GB, one container, 4 physical CPU cores, 32GiB RAM, 300-second execution timeout and 300-second startup timeout; no configured automatic retries. All three authorized one-attempt allowances have been used. Compatibility passed; further compute needs its own scoped authorization. Do not automatically retry a failed paid build/run; inspect saved evidence and expenditure first.

The Linux dependency resolution is reproducible without a cloud call or package installation:

```powershell
uv pip compile scripts/reconstruction/genrc-cloud-requirements.in --python-version 3.10 --python-platform x86_64-manylinux_2_28 --extra-index-url https://download.pytorch.org/whl/cu117 --index-strategy unsafe-best-match --output-file <fresh-lock-path>
```

The retained resolved file pins transitive package versions; it is not a wheel-hash lock. PyTorch3D and EfficientNet remain separate source-pinned builds. Successful resolution does not establish native-library or runtime compatibility.

At listed 2026-10-19 rates the requested GPU/CPU/RAM baseline is $2.543424/hour: five minutes is about $0.212, before startup/build/actual resource overhead. This is not a provider-enforced dollar cap. Build time, platform billing and unrelated workspace activity remain separate. A later generation invocation has a 1,800-second execution timeout. See [Modal pricing](https://modal.com/pricing) and [CUDA compatibility](https://modal.com/docs/guide/cuda).

## Model cache (first acquisition completed)

The first cache is `.local/reconstruction/genrc-models-v1`, sealed as `225acf65a7bac771d229eba9f3ed8a66d32c996bdbb7a3ee653bd5a04cbd08f5` and uploaded to the separate model volume. Acquisition evidence is in `.local/reconstruction/genrc-acquisition-v1/`. Future acquisitions must record their actual sources. The original sources are [Stable Diffusion 2 inpainting](https://huggingface.co/stabilityai/stable-diffusion-2-inpainting) and the [official IronDepth checkpoint links](https://github.com/baegwangbin/IronDepth). Do not execute arbitrary model repositories or substitute an unreviewed mirror. The cache must contain:

```text
models/
  normal_scannet.pt
  irondepth_scannet.pt
  stable-diffusion-2-inpainting/
    model_index.json
    unet/ ...
    vae/ ...
    text_encoder/ ...
    tokenizer/ ...
    scheduler/ ...
    ...all other components declared by the original pipeline...
```

Create a separate sources JSON with keys `irondepth` and `stable-diffusion-2-inpainting`; each value records the actual `url`, exact `revision` (or publisher artifact identity), and applicable `license`. Do not invent a revision or infer weight rights from repository code licenses. Materialize HF cache symlinks into ordinary files first. Then:

```powershell
& $cloudPy scripts/reconstruction/genrc_models.py --models .local/reconstruction/genrc-models --sources .local/reconstruction/genrc-model-sources.json
& $cloudPy scripts/reconstruction/genrc_modal.py upload-models --models .local/reconstruction/genrc-models --output .local/reconstruction/genrc-model-upload-v1
```

Sealing hashes every file; upload uses a separate `eva-genrc-models-v1` Volume and the manifest hash as a directory key. It never touches `glm-53-flash-research`. Hashes establish file identity, not independent publisher authenticity. Structural checks reject missing core SD components; strict checkpoint loads and real inference are still needed to establish compatibility. The two IronDepth checkpoints use PyTorch serialization and must come from trusted originals.

The worker verifies the model manifest's hash against its directory key and each file before loading. Runtime networking is blocked. Both hidden Torch Hub calls are redirected to pinned local EfficientNet architecture code with `pretrained=False`; strict final state dictionaries supply parameters. Missing SD files fail offline rather than fetching a replacement. `stable-diffusion-2-1` is not needed for this existing-mesh pilot.

Historical generation procedure; the v1 output now exists. Any subsequent run requires a fresh scoped decision and output directory:

```powershell
# Replace the value with the actual key in upload.json; do not use a placeholder.
$modelKey = '<64-character verified model manifest hash>'
& $cloudPy scripts/reconstruction/genrc_modal.py generate --dry-run --input .local/reconstruction/genrc-pilot-input-v1/input.zip --model-key $modelKey --output .local/reconstruction/genrc-generation-plan-v1
& $cloudPy scripts/reconstruction/genrc_modal.py generate --confirm-billable --input .local/reconstruction/genrc-pilot-input-v1/input.zip --model-key $modelKey --output .local/reconstruction/genrc-candidate-v1
```

Use a fresh output directory for every invocation. `submission.json` is written before submission; `submitted.json` records the actual call/app IDs. `summary.json` and `artifacts.zip` are retrieved on return. Failures return a nonzero CLI exit and preserve diagnostic artifacts. Ctrl+C requests call cancellation and container termination; do not assume cancellation is instantaneous. The Results Volume (`eva-genrc-results-v1`) stores checkpoints after rendering and depth generation. Forced termination can prevent the final ZIP; inspect the last committed run directory with Modal's Volume tools. Completed/handled-failure ZIPs can be retrieved with:

```powershell
& $cloudPy scripts/reconstruction/genrc_modal.py download --run-id '<run_id from submitted.json>' --output .local/reconstruction/genrc-retrieved-v1
```

No app is deployed, scheduled or exposed as a public endpoint. Do not interpret a valid definition, successful authentication or passing smoke as a generated-room result. Full candidate acceptance remains pending.
