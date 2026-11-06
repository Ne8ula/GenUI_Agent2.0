# GenRC cloud pilot v1: acceptance pending

Date: 2026-10-19 (America/New_York). Base Git revision: `70ad76c6888a9bbcc98bea8c2756ed73db0f5132`, plus the preserved working-tree r03 viewer/reconstruction and this uncommitted cloud implementation. No commit or deployment was requested.

## Decision and scope

Owner selected current-room/existing-furniture completion and allowed small seam adjustments in a separate candidate. Raw r03 remains immutable. The owner then requested implementation of the GenRC cloud route and explicitly approved up to $5 for **one image build and one five-minute GPU compatibility test**, no model generation and no automatic retry. This is compute authorization, not reconstruction-quality acceptance.

The implementation is a GenRC-adapted perspective pilot at frame 0037, using the 768px central crop scaled to 512px. Panoramic E-Diffusion, textual inversion, full-room expansion and viewer integration are outside this initial adapter. No UI edits or new Weave pass occurred.

## Reproduction and evidence

- [Commands and implementation](../../../scripts/reconstruction/GENRC.md).
- GenRC source: `86d19cf15904522e01d9a09436f079c6d3fb6c2f`.
- PyTorch3D source: `3145dd4d16edaceb394838364b8e87a440f83c10` (v0.7.2).
- EfficientNet source: `771ce082b2ce6d033f55b3d47c1f77389ad3c180`.
- Verified local input: `.local/reconstruction/genrc-pilot-input-v1/input.zip`, 14,126,178 bytes. Includes original mesh, pose/calibration and 96 training-frame depth probes; no withheld RGB/depth.
- Local smoke definition: `.local/reconstruction/genrc-dry-run-v1/dry-run.json`.
- Local generation definition: `.local/reconstruction/genrc-generate-dry-run-v1/dry-run.json`. Uses an explicit dummy model key for syntax validation only; no cache-access or model-validity claim.
- Live compatibility submission: `.local/reconstruction/genrc-smoke-v1/`, run ID `bcae667894c045a49b7bf18e6a135e8b`; Modal app `ap-Cs65QVbv2avVMb59z0IqF5`.

## Actual checks

| Check | Expected | Actual |
| --- | --- | --- |
| Geometry/contract suite | Reject invalid resource/authority/provenance inputs; correct metric projection and guarded fusion | 17 tests passed, including cloud-result serialization regression |
| Real preparation | Verify r03 inputs, preserve source mesh, exclude withheld RGB/depth | Passed; 96x48x64 training-depth array validated |
| Python compilation | All new modules compile | Passed |
| Modal dry runs | Construct smoke and generation definitions without submitting | Passed |
| CUDA/container compatibility | Actual GPU arithmetic, rasterizer kernel, full GenRC imports and mesh I/O | Third authorized attempt passed on A100-SXM4-40GB; 992 pixels at expected depth |
| Model acquisition/load | Provenance, file integrity and strict state dictionaries | Passed using official IronDepth downloads and owner-approved pinned SD2 mirror; original SD2 equivalence unverified |
| Generation/visual quality | Separate candidate, matching views, intact source geometry, coherent openings/seams | Execution and source preservation passed; quality failed review due to invented content and remaining holes |
| Cancellation | Terminate active container and retain last committed artifacts | Implemented, not exercised on a live job |

Read-only implementation review by the available `reconstruction_methods` worker identified missing model-key binding/completeness checks, post-snap triangle checks and nested NPZ size checks. These were fixed; the lead also added NPY-header checks before allocation. This was actual available-agent review, not claimed Astra/Terra routing. Checkpoint compatibility and inference were subsequently exercised in the first generation pilot below.

### Executed build outcome

The approved app ran 2026-10-19 23:02:16-23:04:50 EDT. Base CUDA, OS prerequisites and Torch installation succeeded. PyTorch3D compilation failed at `subprocess.check_output(['which', 'clang++'])`; the compiler was not installed. Failed image: `im-WxX4dCU0O9xLH0GyPD2K0G`. The CUB header-location warning was also recorded. This failure does not establish whether CUDA 11.7 kernels work on Modal's GPU hosts: no GPU function was submitted.

Read-only verification returned app state `stopped`, tasks `0`. Local evidence: `.local/reconstruction/genrc-smoke-v1/image-build.log`, `apps-after.json`, `source-hashes.json`, `submission.json`. Actual monetary charges were not available in those outputs and are not claimed. No retry, inference or model download occurred.

The reviewed correction explicitly sets `CC=/usr/bin/gcc`, `CXX=/usr/bin/g++`, `CUDAHOSTCXX=/usr/bin/g++`, `CUB_HOME=/usr/local/cuda/include`, and checks compiler/header availability before building PyTorch3D. Client/build failures now also write a local failure record. At that point, corrected definitions required a new scoped cloud attempt and GPU compatibility remained unverified.

### Second authorized attempt

The owner's reply `Authorized.` approved one corrected build and one compatibility test within an additional $5 allowance. App `ap-X3Ubg8eBYac0XXgBpOVsMa`, run `db53663ff1fd443c8e59e3a349e6047c`, started 2026-10-19 23:10:36 EDT. The compiler/header check passed using GCC/G++ 11.4.0. PyTorch3D 0.7.2 compiled successfully in image `im-ZQCloKlaWuNP46vqCbYgsK` (215.63 seconds); wheel SHA-256 `02e4232c8b4000871e8454e8e86a9467aad001b6a560b031a0f262fd7db4a738`.

During the next dependency layer, pip selected a newer Torch and CUDA stack. Public PyPI metadata confirmed `pyequilib 0.6.0` requires `torch>=2.8`, while 0.5.8 declares only `numpy`. The lead stopped the app rather than let an incompatible ABI reach the GPU. State was verified `stopped`, tasks `0`, at 23:16:33 EDT. The client exited with an image-build external-shutdown error. No GPU call, model generation or automatic retry occurred. Actual charges remain unverified.

Evidence directory: `.local/reconstruction/genrc-smoke-v2/` contains `authorization.json`, `source-hashes.json`, `submission.json`, `client-failure.json`, `apps-after.json` and `resolved-linux-requirements.txt`. Some image log requests returned no logs; the compilation result and dependency upgrade above were observed directly in the live command output, not inferred from those empty log responses.

The local correction uses `pyequilib==0.5.8`, hard Torch/NumPy/setuptools constraints, a fully resolved Linux/Python-3.10 dependency file consumed by the image, and build-time version assertions. Local cross-platform dependency resolution passed without installing Linux packages or starting cloud compute. The corrected image definition also passed a local dry run. The third attempt required and received separate authorization below.

### Third authorized attempt: build and GPU checks passed

The owner requested `Run the corrected dependency build and one GPU test.` within the offered additional $5 allowance, without automatic retry or generation. App `ap-l9eZw5V0ahyYJeehE3vOto` ran 2026-10-19 23:25:52-23:27:47 EDT; run `a2b84a7da461425286af4e45fbd6d222`, call `fc-01M5BNJPM75YX5SVYMT36W9N77`. Cached CUDA/Torch/PyTorch3D layers were reused. Dependency image `im-yXquEjhOIAxfm5uhjuFGgu` built in 56.45 seconds. Source-check image `im-jrCPNsqjMzsbkT5mDRRc0O` passed `pip check` and exact Torch/PyTorch3D/pyequilib version assertions; final image `im-fRDzErCkzyWeB93guz6scf` built successfully.

The single remote smoke passed on **NVIDIA A100-SXM4-40GB**, Torch **1.13.1+cu117**, CUDA **11.7**. It imported the full GenRC pipeline, executed CUDA matrix arithmetic, rasterized **992 pixels** with camera-Z depth 2m within 1e-4 tolerance, checked half-pixel unprojection and round-tripped a two-triangle Open3D mesh. No model weights were loaded and no scene generation occurred.

The local CLI exited with `DeserializationError` after remote completion because `torch.__version__` is a Torch-defined string subclass and Torch is intentionally absent from the lightweight client. The persisted ZIP was retrieved read-only; it contains a passing `summary.json` and `runtime.json`, with no failure record. This is a passed GPU test with a failed client result handoff, not a clean end-to-end CLI invocation.

The worker now normalizes its summary through JSON before returning, removing library-specific subclasses. A local regression executes the worker with a deliberately unpicklable string subclass and mocked GPU work, verifies the portable returned result and persisted ZIP, and checks both volume commits. All **17 tests** and Python compilation pass. At the end of the compatibility phase, this reporting-only correction had not been rerun remotely; the subsequent generation phase below verified it live.

Evidence: `.local/reconstruction/genrc-smoke-v3/` retains authorization, pre-correction source hashes, submission/call identity, client failure, dependency/source build logs and `apps-after.json`; `.local/reconstruction/genrc-smoke-v3-recovered/` contains the downloaded `artifacts.zip` and inspected JSON files. Read-only app inventory confirmed **stopped, zero tasks**. Actual charges have not been retrieved and are not equated with the allowance. Owner acceptance remains pending.

### First authorized generation pilot

The owner requested model acquisition and a bounded generation pilot, then explicitly selected the reviewed, pinned `sd2-community` mirror because the original SD2 endpoint returned HTTP 401. Acquisition, licenses, hashes, executed source identity, outputs and visual findings are recorded in the [pilot review](../../research/hypersim/evidence/genrc-pilot-v1/REVIEW.md).

One A100-40GB invocation ran in app `ap-pbsoUqhooPFupMqvg3UCwI`, 2026-10-19 23:36:17?23:37:17 EDT, with 1,800-second execution and 300-second startup limits. Runtime networking was blocked; no automatic retry occurred. It returned `candidate-awaiting-review` and 84,967 added triangles. Independent checks verified all original vertices, faces and colors, observed RGB, output hashes and provenance. The plain-JSON return fix passed live. All 17 local tests and Python compilation passed before submission.

The model cache is 5,743,703,953 bytes; key `225acf65a7bac771d229eba9f3ed8a66d32c996bdbb7a3ee653bd5a04cbd08f5`. Original IronDepth files were publisher-linked and locally hashed; SD2 mirror files matched published revision hashes. This establishes the documented acquisition identity and runtime compatibility, not independent authenticity or equivalence to inaccessible original SD2 weights.

The 512px central-crop raycast coverage increased from 59.03% to 75.27%. However, source-view inspection revealed invented window grilles and a chair-like form; the filtered mesh still has large holes. **Lead recommendation: do not promote this candidate. Owner acceptance: pending.** The viewer and r03 source remain unchanged. Candidate meshes and diagnostic images are retained. App inventory confirmed stopped with zero tasks; actual charges remain unverified.

## Limits and owner exercise

Model hashes establish local file identity, not independent publisher authenticity. Sparse training-depth probes cannot establish true hidden geometry or ensure every doorway remains open. The adapter preserves original arrays and adds a separate completion layer; only new boundary vertices may snap within 2cm. A generated candidate is not an observed scene or a fresh held-out reconstruction result.

After successful cloud compatibility and explicitly scoped model access/generation, inspect the original and candidate from the same camera and adjacent views, including the doorway. Check openings, furniture continuity, source/added-face provenance and seam displacement before expanding scope. **Owner acceptance: pending.**
