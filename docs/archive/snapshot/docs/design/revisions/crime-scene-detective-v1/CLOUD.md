# Modal browser verification

2026-10-26. Owner approved one L4 GPU container, 16 GiB RAM, maximum ten-minute verification run, $2 operational allowance (not a provider-enforced dollar cap), required application/retained-scene transfer, no credentials/personal notebooks, no retries. This follows the local memory hold; it does not authorize another Weave generation or publication.

## Route

The adapter is `scripts/room_workflow/crime_scene_browser_cloud.py`. Existing Modal SDK 1.6.1 is available in `.local/reconstruction/genrc-client/`. No local dependency installation or browser launch is needed.

The private snapshot contains the crime-scene component and its dependencies/styles/fonts entry, four focused test files, existing smoke script, broker's static module dependencies, resource catalogue, the 712,312-point retained PLY, tags and 13 source photographs. It excludes other private stores, credentials, .env files, node_modules and the rest of the reconstruction assets. Source files are explicitly enumerated and hashed. Scene assets must match the retained catalogue; input is capped at 40 MiB.

To avoid copying unrelated room assets, the cloud entry directly mounts the actual CrimeSceneApp with the existing main entry's styles/fonts/StrictMode. A private Vite config retains localhost proxying to the smoke's disposable key-disabled broker. This is not a full multi-route application build. Runtime outbound network is blocked; package installation occurs only while building the cloud image, before the private snapshot mount. No public web endpoint or persistent volume is created. Provider-managed uploaded files/image caches may outlive the container; ephemeral execution does not promise server-side deletion.

One container: L4, 4 CPU, 16 GiB, 600-second function limit, 300-second startup limit, one container, zero retries. The client has a 1,200-second outer timeout including startup/build waiting and attempts to stop only its owned app. The exclusive receipt is reserved before image build; a failed/uncertain attempt cannot automatically resubmit. Capture/log return is chunked at 1 MiB, at most 40 files/64 MiB, with filename, length and SHA-256 validation and no overwrite. Provider stopped/zero-task confirmation is required; bills remain separate from resource estimates.

## GPU evidence gate

[Chromium's hardware-headless guidance](https://chromium.googlesource.com/chromium/src.git/+/main/docs/gpu/using-gpu-hardware-in-headless-chrome.md) and [Chrome's Vulkan configuration](https://developer.chrome.com/blog/supercharge-web-ai-testing) inform the explicit GPU flags. No SwiftShader or unsafe-WebGPU switch is enabled. The existing smoke obtains the renderer from the application's actual WebGL2 context and requires NVIDIA, rejecting software/llvmpipe/SwiftShader. `nvidia-smi` alone is insufficient. [Modal's CUDA documentation](https://modal.com/docs/guide/cuda) does not establish headless Chromium graphics compatibility. Failure of that gate is a failed GPU verification, not successful visual evidence.

At [listed Modal rates](https://modal.com/pricing), 600 seconds of one L4 + four physical cores + 16 GiB is approximately $0.186 of requested-resource compute. Build/startup/shutdown overhead can add cost; this is arithmetic, not an observed charge or hard dollar ceiling. The approved $2 is an operational allowance.

## Status

Offline boundary/return tests: two observed failures before the adapter, then two passes. Independent read-only review found missing AJV/schema dependencies and a shallow-container-path import failure; both were reproduced and corrected. Three Python boundary/import tests and one GPU-options test now pass. Playwright's installed launcher confirmed that omitting `channel` selects headless-shell; cloud mode now explicitly selects full Chromium. The copied snapshot's broker imports successfully with installed dependency resolution. No browser/server was started locally.

Review also led to an explicit Vite font-directory allowlist, a writable `/work` copy of the private `/snapshot` mount, an explicit browser binary directory, shorter diagnostic timeouts and independent recording of unit-test versus smoke outcomes. Top-level npm versions are pinned; transitive npm resolution remains a reproducibility limit.

The unsubmitted first snapshot is retained under `.local/reconstruction/crime-scene-browser-v1-preflight/`. The corrected snapshot and plan are under `.local/reconstruction/crime-scene-browser-v1/`: **34,275,135 bytes**, plan SHA-256 `81ace5d1827966ccd75b6067208deef7c89e77351c2280b468cea6a801e60d00`, adapter SHA-256 `eedc1e8960c08aa5c0ce8e110f30f31a1258f9adf1769ec464149693646b094f`.

**Attempt failed locally before cloud submission.** Initially, Claude Code's auto-mode classifier denied the PowerShell execution as Data Exfiltration; that invocation did not run. After the owner's explicit continuation, the exact approved-plan command executed but Modal SDK 1.6.1 rejected `retries=0` when registering the generator: `InvalidError: Generator Functions do not support retries.` This happened before `app.run`, upload or image build. The preserved `.local/reconstruction/crime-scene-browser-v1/receipt.json` records `failed-or-uncertain`, the plan hash above and `app_id: null`. No cloud job or returned captures resulted. No permission bypass was used.

Offline repair extracted the existing declaration into `create()` for a real installed-SDK regression test. The test first reproduced the same error (four tests, one error), then passed after removing only the unsupported SDK retry argument. Omission leaves no configured retry policy; the declared resource policy remains zero retries. Post-fix checks on 2026-10-26:

- `.local/reconstruction/genrc-client/Scripts/python.exe -I -m unittest discover -s scripts/room_workflow -p test_crime_scene_browser_cloud.py`: **4 passed**, no skips, including actual SDK declaration construction without submission.
- `node --test --test-concurrency=1 week4/app/tests/browser-options.test.ts week4/app/tests/crime-scene-initialization.test.ts week4/app/tests/crime-scene-illustration.test.ts week4/app/tests/crime-scene.test.ts`: **8 passed**.
- `node --check week4/app/scripts/crime-scene-smoke.mjs` and `git diff --check`: passed; Git emitted existing LF/CRLF warnings.

The frozen plan, snapshot and failed receipt are retained unchanged. The repaired adapter no longer matches that plan's pinned adapter hash. **No automatic resubmission:** another attempt requires explicit bounded owner authorization and a separately identified plan/receipt, preserving this attempt. Offline SDK construction does not establish remote image, NVIDIA WebGL, shader compilation or visual compatibility. The previous incomplete full-suite check remains unresolved.

Existing Modal authentication was confirmed read-only. The unrelated deployed `eva-room-workflow` app had zero tasks and was not modified. Actual GPU/WebGL compatibility, cloud visual quality and owner acceptance remain pending.
