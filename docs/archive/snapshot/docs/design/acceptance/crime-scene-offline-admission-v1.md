# Crime-scene offline admission checkpoint

Date: 2026-10-28. **Owner quality acceptance: pending. Replacement integration: incomplete.**

Scope: the offline portion of the [approved implementation plan](../../superpowers/plans/2026-10-28-crime-scene-argus-kimodo.md), not acceptance of geometry, motion or visual performance. Branch `crimescene`, HEAD `0380e13efbdfa8c1ee29fe2c621927852b7766b7` plus preexisting dirty/untracked source. No commit identifies this snapshot; hashes below bind the affected executable files.

## Changes and preservation

- Added [shared artifact validation](../../../scripts/room_workflow/ffs_artifacts.py): caller-owned GLB byte/face/vertex/decoded-texture limits, embedded PNG/JPEG admission, static indexed geometry and provenance-bound fits. Extracted the legacy caller without relaxing its caps. Its plans now bind the helper hash, and its image recipe includes that helper. Historical plans are not rewritten and fail closed if the new binding is absent.
- Added [Argus source-record validation](../../../scripts/room_workflow/ffs_argus.py): exact fields, source/revision/calibration binding and owner-record digest. **Integrity is not authority:** a future caller must retrieve current trusted approval/calibration evidence, check actual bytes and enforce freshness/revocation. No inference caller exists. Partial valid regions are rejected because the inspected Argus forward path has no mask input; the real panorama remains unadmitted.
- Added [read-only retirement verification](../../../scripts/room_workflow/crime-scene-retirement.mjs) and a [103-file manifest](../../../scripts/room_workflow/crime-scene-retirement.json). Verified **71,532,183 bytes; zero files removed**. Every catalog entry must match its recorded path/hash/size; preserved catalog keys must remain present. The manifest allows only three named generated payloads and two named producer files as future removal targets. Passing this snapshot never authorizes deletion or prevents later edits.
- Archived the actual pre-extraction producer, producer tests and fitter under `.local/reconstruction/ffs-th0028-objects-v2/producer-source-v1/`, with exclusive creation and manifest-bound hashes. Original evidence, licences, crop/fit/review records and failed receipts remain intact.
- No live catalog, frontend, runtime motion schema or playback change. Producer retirement waits for replacement caller migration. Deliberate retirement of a preserved historical file's *catalog pointer*, such as `models/fits.json`, needs an explicitly reviewed manifest-key update at cutover; it does not permit deleting the provenance file.

## Tested source hashes

Paths below are relative to `scripts/room_workflow/`; SHA-256 was computed from the final primary-checkout bytes after review fixes.

| File | SHA-256 |
| --- | --- |
| `ffs_argus.py` | `6fcebf3db7a142daaa2ca23544df20e44510a6ee2f45b64cefe7ac3ff78bd523` |
| `test_ffs_argus.py` | `3747f0713a14f30a7587eaf64dc3b3f2741c37b6a5bf413059d7bfdea1d1ca86` |
| `ffs_artifacts.py` | `84fb02d50ed79f6f3df076cf0751d2a748eb4056debacbe5abdb2ad28f6b1ceb` |
| `test_ffs_artifacts.py` | `2c87608976b3de6c1b3914c8c7605107aba48402041efec1373b2949ba155de8` |
| `ffs_objects_cloud.py` | `da25ef89f063128c565a1cebc7846de5924a11b1f53df7390029908a4ecd60fa` |
| `test_ffs_objects_cloud.py` | `faf5e52555276c8a319fa9669f311dd778396a186fe62546234a0b872046aa0d` |
| `crime-scene-retirement.mjs` | `08702f85a56631193e9bb25f519411b0026dd778f19fe4c788c09a31648844da` |
| `crime-scene-retirement.test.mjs` | `8e562b704cdf95a3884280424c144d12ffb119bc83842edfa9b1a572aa5d982e` |
| `crime-scene-retirement.json` | `764983d49576120d1b0f00f71a2239d332937118216fc6d073618f5f18f0f23c` |

## Verification

Commands ran locally on synthetic CPU fixtures or bounded metadata/hash inspection. Python 3.14, numpy 2.4.4, Pillow 12.2.0; Node 24.14.0. No new dependency installed.

| Check | Expected | Actual |
| --- | --- | --- |
| `node --test scripts/room_workflow/crime-scene-retirement.test.mjs` | Reject changed bytes, bad paths/catalog bindings and removed evidence | 7 passed |
| `python -m unittest discover -s scripts/room_workflow -p test_ffs_artifacts.py` | Reject malformed/resource-exceeding payloads | 20 passed |
| `python -m unittest discover -s scripts/room_workflow -p "test_ffs_argus*.py"` | Source validation and retained preflight checks | 30 run: 29 passed, 1 SDK-construction skip |
| `python -m unittest discover -s scripts/room_workflow -p test_ffs_fit.py` | Preserve existing fit behavior | 10 passed |
| `python -m unittest discover -s scripts/room_workflow -p test_ffs_objects_cloud.py` | Legacy caller and real SDK construction | **Failed: 11 run, 7 errors**; installed `modal` distribution metadata missing |
| Explicit synthetic object lifecycle harness | Exercise lifecycle without claiming SDK integration | 10 passed; mocked Modal/version, excluded real SDK construction |
| `npm test` after fixes | Core/application regressions | 103 core + 334 app passed; zero skips/failures |
| `npm run room:test` after fixes | Full room regression suite | **207 run: 202 passed, 3 failed, 2 skipped** |
| Full room suite with test-only child-stderr diagnostics | Identify rejection, without altering policy | **204 passed, 1 failed, 2 skipped**; remaining failure reports `memory-floor; settled` |
| Isolated failing replay test with diagnostics | Reproduce outside full-suite load | 1 passed; full-suite failure remains reported |
| `verifyRetirement(entries, {root, catalog})` against current files | All manifest files/catalog bindings unchanged | `{verified:103, removed:0}` |
| Separate `stat(...,{bigint:true})` identity check | Detect aliases in this actual snapshot | 103 distinct `(dev,ino)` identities |
| `git diff --check` | No tracked whitespace errors | Passed; Git emitted existing LF/CRLF conversion warnings |

Full room failures on the ordinary post-fix run, all in unchanged `scan-assisted.test.mjs`:

1. `actual isolated Python replay returns only needs-review with resource evidence`
2. `exact host bindings, unknown authority and missing manifest reject`
3. `configuration and failed spawn release the lock without claiming uncertain execution`

The diagnostic rerun retained only failure 1 and exposed the supervisor's memory-floor rejection. It does not retrospectively prove the cause of failures 2 and 3. No memory threshold, test, timeout or out-of-scope pipeline was weakened. Earlier room tests passed before the final reruns; the latest full-suite result is **not green**.

Missing-Modal errors include `test_build_preflight_and_gpu_gate` (four error contexts), `test_build_recipe_contains_native_and_glb_guards`, `test_plan_bounds`, and `test_real_sdk_construction`. Synthetic lifecycle success is not a substitute for the missing SDK/build checks.

Logs and diagnostic scripts are session-local under `C:\Users\alexx\AppData\Local\Temp\claude\c--Users-alexx-Documents-ClaudeAgent-GenUI-Agent\da00bdaf-e4ba-42b9-8254-d3d0062c1db6\scratchpad`; relevant logs: `objects-suite.log`, `room-final.log`, `room-diagnostic.log`, `app-final.log`. They are not published artifacts or durable acceptance evidence. Reproduction of the ordinary commands above does not require the diagnostic harness.

## Independent review and decisions

Four agents total including coordinator; no nested delegation. Two isolated `eva-implementer` workers (configured Astra/high) supplied scoped source with before/after hashes. Coordinator rechecked those hashes before integration and ran the primary-checkout verification. Read-only reviewer `afade2f5b89255c0d` used `eva-reviewer` (configured Opus; self-reported `claude-opus-5-5[1m]`). Configured/self-reported models are not independent provider identity verification. Ruflo routing was advisory, not additional model execution.

Two review findings were reproduced and fixed by the coordinator in one fix pass:

- Missing preserved catalog key: regression failed with `Missing expected rejection`; verifier now requires each preserved key. Candidate keys may still retire. Final focused suite: 7/7.
- Corrupt PNG IDAT CRC: regression reproduced Pillow `SyntaxError`; validator now normalizes it to its documented `ValueError` rejection. Final focused suite: 20/20.

Deferred minor findings:

- Generic manifest verification detects duplicate spelling, not case-insensitive/hard-link aliases. The current 103 entries have distinct file identities, checked separately. Recheck identity uniqueness before any future deletion; no automated deletion capability exists here.
- Dedicated cases for duplicate GLB JSON keys, top-level animation/skin fields and oversized JPEG headers remain absent, although corresponding checks exist. CRC coverage was added. Progressive-JPEG CPU cost has not been measured; decoded RGBA accounting is not total renderer/process memory.

Rulings retained from execution:

- Keep legacy live review shape until coordinated visual-gated cutover; cost: replacement promotion remains blocked, rather than borrowing old approval.
- Do not promote synthetic geometry/motion fixtures; cost: source and paid-execution blockers remain visible.
- No live motion/schema migration before Weave; cost: old playback remains until an atomic replacement is ready.
- Coordinator preserves the dirty shared checkout; isolated writers receive exact scoped source copies. Cost: integration requires content hashes, not HEAD alone.
- Retain a scratch ledger/content hashes rather than commit-based skill bookkeeping; cost: no commit-level reproducibility until the owner authorizes a commit.
- Do not invent Argus conversion/inference around an unsupported partial panorama or wire TRELLIS defaults into incompatible limits. Cost: Tasks 2–3 remain partial pending real contract decisions.

## Upstream blockers and next owner exercise

Worker-inspected official Argus code at [`a7333c0a6d1e370260ebf47ac0f8adce272f3083`](https://github.com/realsee-developer/Argus/tree/a7333c0a6d1e370260ebf47ac0f8adce272f3083) accepts images, not validity masks. Its demo crops 15% top/bottom, less than this source's observed blank bottom band; changing crop alone does not establish calibrated rays. Its output is points, not a completed mesh. Code is Apache-2.0; checkpoint metadata is CC-BY-NC-4.0/manual-gated. Checkpoint bytes/access and valid spherical calibration remain unverified.

Worker-inspected TRELLIS.2 code at [`75fbf0183001ed9876c8dbb35de6b68552ee08bd`](https://github.com/microsoft/TRELLIS.2/tree/75fbf0183001ed9876c8dbb35de6b68552ee08bd) and main weights revision `af44b45f2e35a493886929c6d786e563ec68364d` do not close dependency licences/access/pins. DINOv3 and RMBG dependencies are gated; NVIDIA rendering dependencies carry separate terms. Default million-face/4096-texture/WebP-extension export is incompatible with current admission and fitter bounds. No exact reviewed chair crop or revised resource policy was selected here. TRELLIS.2 remains an evaluation candidate, not a quality winner.

[Official Kimodo quick start](https://research.nvidia.com/labs/sil/projects/kimodo/docs/getting_started/quick_start.html), read without installation, documents about 17 GB VRAM for GPU-resident generation, or under 3 GB with CPU text encoding. These are upstream estimates, not EVA measurements or a finite execution quote. No skeleton conversion, rig compatibility, contact or export result exists here.

The owner selected **deliberate reach → touch → hold → release against a static chair** on 2026-10-28. CPU decoding/inspection of the supplied 1280×720/24 fps reference informed that choice; it is not a Weave packet or contact proof.

Next exercise: resolve admitted panorama/calibration and exact chair input, close model/dependency rights and pins, then review one consolidated finite proposal with separate Weave, build/download, inference and Modal capture allowances. No new dollar/credit allowance has been supplied. Do not submit until each stage has exact inputs, resources, one-attempt/time/output/retention limits, cleanup and a current quote.

**Not run:** model inference, installs/downloads/image builds, paid Weave generation, UI/motion implementation, GPU rendering, browser/interaction checks, native 1440p/60 capture, typecheck/build. No files deleted, commits or publication. Geometry/contact/visual quality and owner acceptance remain pending.
