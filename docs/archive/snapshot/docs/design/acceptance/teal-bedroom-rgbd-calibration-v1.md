# Teal bedroom RGB-D calibration v1

**Decision 2 authorized on 2026-10-22. Stage 1 passed; stage 2 failed closed on all six pose matches before extraction. Both attempt allowances are consumed.**

Owner instruction: “Continue implementation for decision 2. Approve everything that has been done.” The [completed acquisition record](teal-bedroom-rgbd-v1.md#retrospective-owner-acceptance--2026-10-22) records retrospective acceptance of the disclosed work. This new pass does not imply acceptance of results not yet produced.

## Scope and execution bounds

Target only ARKitScenes Validation/45261631. Reuse the six conditioning RGB originals and their retained normalization record, the acquired depth/confidence ZIPs, the earlier two intrinsics ZIPs and supplied trajectory. Preserve all raw files and both held-out RGB views; do not read held-out pixels as conditioning data. Keep this scan-assisted preparation separate from the RGB-only benchmark. No downloads, external uploads, model calls, GPU, paid generation, mesh reduction, source-to-candidate registration, fusion, photographic texture projection, renderer/UI changes, service restarts, commits or publication.

Two sequential local stages are bounded separately: (1) inspect ZIP directory metadata and freeze exact selected member names/timestamps; (2) extract only the selected six-view depth/confidence/calibration members and validate their decoding, pixel-grid conventions and trajectory correspondence. Each real stage gets one attempt, an exclusive output directory and its own resource receipt. No retry or increased limits are inferred from a failure. Each retains the existing 135-second work / 150-second host ceiling, one worker, numerical threads 1, 768 MiB sampled process-tree RSS, 2 GiB available-memory floor and 64 KiB per output stream. Sampling is monitoring, not hard OS containment.

ZIP directory admission must precede member reads: bound directory bytes to 8 MiB and entries to 20,000 per archive; reject traversal, absolute/Windows-special paths, links, duplicate case-folded names, encryption, unsupported compression/multidisk/ZIP64 layouts, invalid offsets and oversized members. No whole-archive extraction. At most six depth, six confidence and twelve calibration members may be selected; selected encoded payloads total at most 32 MiB and each member at most 4 MiB. The whole preparation output is capped at 64 MiB, with no copied full archives. Read trusted scripts from the repository, downloaded data only as explicit inputs under isolated Python `-I`; selected outputs stay separate from scripts in a new private directory. Source hashes and acquisition bindings must match before and after reading.

## Evidence criteria

- Metadata report: exact source/manifest hashes, bounded member inventory summary, chosen or missing timestamp correspondences and explicit rejection reasons. Directory metadata is not decoded content or proven calibration.
- Preparation report: source RGB integrity and normalization consistency, selected member bytes/hashes/CRC, supported depth/confidence dimensions/types, intrinsics dimensions/finiteness, unique timestamp/pose matches, explicit camera/pixel rotation and depth-unit conventions grounded in official evidence, and finite positive-depth projection/unprojection checks.
- Numerical self-consistency is not independent physical accuracy. Do not claim a named calibrated candidate frame, registration, texture alignment or complete coverage solely from a round trip. Missing/ambiguous calibration fails closed; preserve reports/partials rather than guessing, interpolating or borrowing another room's transform.
- No ready source/candidate is promoted by this operator report. Actual downstream source admission, reviewed room boundary/inventory and later candidate processing remain separate.

## Implementation and verification

Stage 1 is implemented in `scripts/room_workflow/scan_rgbd_prepare.py`, with a fixed `rgbd-directory` operation in the existing supervisor. It pins all three acquired/retained manifest byte hashes, streams archive integrity checks, bounds directory allocation, rejects unsupported ZIP layouts and unsafe names, and produces exact six-view metadata selections or explicit missing/tied-match reasons. It does not open/inflate members or read held-out pixels. The exclusive directory preserves a bounded fsynced journal and writes its report last. All four archive bindings and the retained manifests are rechecked before that final report.

TDD: five initial metadata tests failed because the module was absent; four selector/operator tests then failed because the selector was absent. Additional regression tests caught a repeated-trailing-slash alias and a missing final cross-archive integrity check; both went RED to GREEN. **12 preparation tests passed** using synthetic ZIPs, and isolated `python -I scripts/room_workflow/scan_rgbd_prepare.py --help` exited 0. The fixed supervisor route's initial RED test failed at the missing operation as expected. Actual subprocess checks additionally encountered the existing memory-floor gate; these are not counted as passing resource evidence. Full regressions initially completed with failures, detailed below. Independent review and its fix pass are recorded below; the post-fix full rerun passed: **990 passed, 7 skipped, no failures** (442 Python run / 437 passed / 5 skipped; 184 Node run / 182 passed / 2 skipped; 103 core and 268 app passed). The same commands were rerun serially after restored headroom. Logs use the `rgbd-directory-fixed-` prefix in the same scratchpad. This clears the regression gate, not real-data or owner acceptance.

### Full regression results — 2026-10-22

Run serially, without real-room processing:

| Command | Observed result |
| --- | --- |
| `python -I -m unittest discover -s scripts/room_workflow -p 'test_*.py'` (numerical threads 1) | 437 run: 424 passed, 7 failures, 1 error, 5 skipped |
| `node --test scripts/room_workflow/*.test.mjs integrations/shado/*.test.mjs` | 184 run: 179 passed, 3 failed, 2 skipped |
| `npm.cmd test` | 103 core + 268 application passed |

The seven Python failures all explicitly returned `memory-floor`: `test_actual_isolated_source_inspection`, `test_excess_report_is_rejected_and_process_stopped`, `test_fetch_rejects_alternate_destination_inside_bounded_worker`, `test_rgbd_directory_runs_fixed_isolated_worker`, `test_rgbd_fetch_rejects_unapproved_plan_inside_bounded_worker`, `test_rss_limit_is_measured_on_real_process`, and `test_timeout_kills_owned_descendants`. `test_actual_process_has_single_numerical_threads_and_resource_receipt` errored while parsing empty stdout as JSON; its log does not independently retain the receipt outcome. All eight are in `test_cpu_review_worker.py`.

Three `scan-assisted.test.mjs` cases failed with the generic `CPU idealization failed, timed out or was cancelled` error: `actual isolated Python replay returns only needs-review with resource evidence`; `exact host bindings, unknown authority and missing manifest reject`; `configuration and failed spawn release the lock without claiming uncertain execution`. Memory pressure is consistent with these failures, but their retained output does not prove that cause. Do not call the full suite green or weaken assertions/resource gates to hide these failures.

Full logs are retained in session `836690aa-03f6-4444-9ecf-450f17792897`'s scratchpad as `rgbd-directory-python.log`, `rgbd-directory-node.log` and `rgbd-directory-app.log`. Fifteen local documentation links resolved; task-owned files had no trailing whitespace. `git diff --check` passed with existing LF/CRLF warnings. These checks are not application/visual or physical calibration evidence.

Initial regression code fingerprints, before review fixes (encoded SHA-256, shared dirty base `c83fd4c04ca170ed38311b94cdcdebec779051b7`):

| File under `scripts/room_workflow/` | SHA-256 |
| --- | --- |
| `scan_rgbd_prepare.py` | `12f614f2553907dca2c62c709111b72f54c78e2a6f54942c9e33e9dda9d2e76e` |
| `test_scan_rgbd_prepare.py` | `985bbe6279ac6ec194b6f558611afd8bcb8495806fc13b7403b1623b9487ebd5` |
| `cpu_review_worker.py` | `8fdb2ada2595d1a6a0f5f1833e734479b20b18b3ac212bc8954ea4594b1e8b69` |
| `test_cpu_review_worker.py` | `fd5064e6b8ee33f640816701ed11723efc23929cba8f3fbb18461adcd9710f4a` |

### Independent review and fix pass

One read-only `eva-reviewer` pass used configured alias `opus`, reporting resolved model `claude-opus-5-5[1m]`. It inspected the scoped code and retained manifest metadata, not ZIP payloads or runtime behavior. No second review was requested.

- **Fixed, RED → GREEN:** `load_inputs` doubled the role directory for RGB-D records whose `path` already included `depth/` or `confidence/`. It now mirrors the acquisition writer's `role/Path(path).name` layout. A positive test exercises both retained manifest layouts and the full synthetic directory stage without mocking the loader.
- **Fixed, RED → GREEN:** floating-point seconds could select an equidistant member or reject an exact 5 ms boundary at realistic timestamps. Comparisons now use integer milliseconds; tests reproduce the wrong selection at 56036.800 s and false rejection at 56036.804 s.
- **Ruling:** promote the review's low-priority compressed-byte accounting finding to a resource-contract defect — bound each selected member by the maximum of compressed and expanded size, rather than expanded size alone. A 33.6 MB compressed / 31.2 MB expanded fixture went RED → GREEN. The cost is conservatively rejecting a selection whose two separate totals fit but their per-member maxima do not.
- Added rejection coverage for encrypted/data-descriptor flags, unsupported compression, ZIP64 extra records, invalid/overlapping offsets, trailing central data, backslashes, alternate streams and non-ASCII names. Removed ineffective `zipfile` mocks from tests of a manual parser; the directory-bound test now guards the actual member-name parser. Windows `ZipFile` normalizes backslashes when creating fixtures, so that test mutates encoded directory bytes instead.
- **17 focused tests passed** after the fixes. This establishes synthetic behavior, not real archive compatibility or calibrated pixels. Post-fix encoded SHA-256: `scan_rgbd_prepare.py` = `7ff1b619d9f20860eb9513bae43342d3c63bc41f0bdda13baaaba199dc872979`; `test_scan_rgbd_prepare.py` = `82ec3fbb6f24f9f7a93280da2164135ac62c49769a2bb1df41ead12264ee73e8`. Supervisor and supervisor-test hashes remain as listed above.
- A metadata-only real preflight verified all three retained manifest pins and existence/size of the five used source files via the corrected loader; it did not read ZIP contents or trajectory bytes. The directory attempt, its resource receipt and the shared lock remained absent.

Deferred minor: the journal writes `complete` before the final report; a report-write failure can leave `started, complete, failed`. Only the final manifest commits a result, and no consumer is connected to these journal events. Keep failure precedence when interpreting it. The review also noted incomplete generic Windows-special-name coverage and a hash/reopen race; the fixed capture/member-name allowlist makes those names unreachable in this stage, while before/after hashing is not protection against a malicious host deliberately swapping and restoring files between reads. Stage 2 must still use fixed output basenames and its own local-header/decoding checks.

### Resource blocker and execution status

Before any real directory attempt, available host memory measured **1,352,179,712 bytes**, below the required **2,147,483,648 bytes**. Existing supervisor tests returned `memory-floor` rather than launching their workers. No limit was lowered and no shared service was stopped. Both real output paths (`scan-rgbd-directory-v1`, proposed `scan-rgbd-prepare-v1`), the directory-stage resource receipt and the shared CPU lock were confirmed absent. Neither real stage had run at that checkpoint; both attempt allowances remained unused. After the review fixes, available memory measured **8,055,570,432 bytes** without this session stopping services or changing limits. A full regression rerun was launched; real directory execution still awaits its result and a fresh supervised preflight.

Ruling: defer selected-member decoding/calibration implementation and execution until the bounded directory stage can inspect actual member conventions — guessing names or relaxing host headroom would violate the packet; the cost is a delayed decision-2 result. This is an incomplete decision-2 checkpoint, not calibrated-source acceptance. The next step is adequate host headroom, then the reviewed single directory attempt under the unchanged supervisor, followed by exact selection review and the separate bounded preparation stage.

No real ZIP content, RGB pixels, trajectory, geometry or UI was inspected in this checkpoint. No model/network activity, downloads, commits or publication occurred.

### Stage 1 real execution — passed, 2026-10-22

After the passing regression rerun, the single authorized directory attempt ran once:

```text
python -I scripts/room_workflow/cpu_review_worker.py --operation rgbd-directory --input .local/reconstruction/arkitscenes/45261631/scan-rgbd-source-v1/manifest.json --output-dir .local/reconstruction/arkitscenes/45261631/scan-rgbd-directory-v1 --receipt .local/reconstruction/teal-bedroom-rgbd-directory-v1.resources.json
```

Exit 0, `selected-not-decoded`, `source_admitted: false`. Preflight: 4,843,991,040 bytes available memory and 81,309,253,632 bytes free disk. The settled/passed receipt measured **0.953 seconds**, **85,049,344 bytes peak sampled RSS**, and **4,680,908,800 bytes minimum available memory**. Its `report_sha256` (`65333aab680422917843470da00b60eabebdd54fd71fa65960a3288633990d78`) binds stdout, not the manifest.

The saved journal records start at `2026-10-22T05:54:07.912578+00:00` and completion at `05:54:08.385127+00:00`. Independently rehashed saved outputs: manifest `bbbd8c288774abaca779967f3aef3c5cd49016a38a8122fd2900fea275370cdd`; journal `ec60c456fced3251b78210db21a0c9d407fe821bc9f30bf94d8813742207ca1f`.

All 24 selected members match the six conditioning timestamps exactly: `56036.835`, `56056.860`, `56066.856`, `56076.886`, `56086.915`, `56096.911`. Selected encoded/expanded budget: **228,382 bytes**. Depth/confidence each contain 4,812 directory entries (4,811 frames); depth intrinsics 4,813 entries (4,812 frames); RGB intrinsics 2,407 entries (2,406 frames). No selection rejection occurred. No member inflation or calibration occurred in this stage. The stage-1 allowance is consumed; the earlier awaiting-execution checkpoint above is historical, not current.

Ruling: reuse the existing bounded deflate/CRC decoder and scan calibration helpers for stage 2, with local-header checks and pinned directory evidence — no second directory attempt, generic extraction framework, fusion or candidate output is needed. Physical RGB/depth registration remains unestablished even if numerical checks pass.

Implementation scope: preparation script/tests, fixed supervisor route/tests, operator README and this evidence record. No frontend/config/exports or application callers change. Verification requires synthetic malformed-input rejection, a six-view end-to-end fixture, regression tests, and the separately supervised one-attempt real preparation receipt. Preserve all input bytes and failed partials.

### Stage 2 implementation and source conventions

The fixed `rgbd-prepare` supervisor route now calls isolated `scan_rgbd_prepare.py prepare`. It accepts only the completed stage-1 manifest's byte hash and the new `scan-rgbd-prepare-v1` output. It verifies all archive/trajectory bindings, selected local headers and CRC, preserves exactly the 24 selected raw members under fixed basenames, verifies all six retained RGB pairs pixel-for-pixel under their declared 90° clockwise rotation, and reports numerical calibration without source admission. Final checks rehash manifests, archives, trajectory, RGB inputs and emitted members. No unselected payload or held-out pixels are read.

The already-inspected official Apple revision `474aaa83d7b1c9080619d8485de2d7c885c01fc5` supplies conventions: [DATA.md](https://raw.githubusercontent.com/apple/ARKitScenes/474aaa83d7b1c9080619d8485de2d7c885c01fc5/DATA.md), [raw README](https://raw.githubusercontent.com/apple/ARKitScenes/474aaa83d7b1c9080619d8485de2d7c885c01fc5/raw/README.md), and [tenFpsDataLoader.py](https://raw.githubusercontent.com/apple/ARKitScenes/474aaa83d7b1c9080619d8485de2d7c885c01fc5/threedod/benchmark_scripts/utils/tenFpsDataLoader.py). Those prior inspections establish unsigned 16-bit PNG millimeters, unsigned 8-bit confidence 0–2 (no invented meaning for level 1), pincam width/height/fx/fy/cx/cy, axis-angle radians and translation meters. The loader inverts world-to-camera extrinsics once and divides depth by 1000. Its fallback/padding behavior is not reused as calibration evidence. This continuation recovered the retained source-inspection record locally; it made no new network request.

Tests first failed at seven missing extraction/calibration capabilities, then exposed Pillow's `getexif()` loading pixels before `verify()`. Moving EXIF checking to the second, decoded open resolved that failure without weakening verification. The new supervisor-route test failed before the route existed, then passed. **24 preparation tests and 15 supervisor tests passed** in the retained Python **3.12.12** environment. An initial accidental default-Python 3.14 supervisor test could not import `psutil`; no dependency was installed, and all checks were rerun with `.local/reconstruction/venv/Scripts/python.exe`. Full serial regressions and independent read-only review are pending at this checkpoint. No real stage-2 attempt has run yet.

Non-processing preflight during regression execution: available memory **2,140,143,616 bytes**, below the unchanged **2,147,483,648-byte** floor; real extraction was not launched. Stage-2 output, receipt and shared lock were absent. Free disk was 59,864,973,312 bytes. Runtime versions: Python 3.12.12, NumPy 2.2.6, Pillow 11.3.0, OpenCV 4.10.0. Recheck headroom after regressions settle; do not stop shared services or lower the floor.

Pre-review stage-2 SHA-256: preparation `d42ecbb6e90622ba6d9bc499007f52c9c8c1832f73f3174be3fcf58768c86f6c`; preparation tests `a988459bed5b279b2024fac2da6d9a08ac4a9aa1fa005b3c348a5fc8eb9ed588`; supervisor `4f7e02234ab7ef6462f371d4ee812b8803c397dc22c5a7b40e7f8e44245c4342`; supervisor tests `e4295627f15ccf2d73393b7873d19d0774d79ef80a03afb512a8587b83a5eddc`.

### Stage 2 first full regression run — 2026-10-22

The serial run completed: Python **449 tests run, 8 failure reports (including both preparation-route subtests), 1 error, 5 skipped**; Node **182 passed / 184 run / 2 skipped**; core **103 passed** and app **268 passed**. Python failed; this is not a green full regression gate.

All eight failure reports explicitly show `memory-floor`: `test_actual_isolated_source_inspection`, `test_excess_report_is_rejected_and_process_stopped`, `test_fetch_rejects_alternate_destination_inside_bounded_worker`, `test_rgbd_fetch_rejects_unapproved_plan_inside_bounded_worker`, both `rgbd-directory` and `rgbd-prepare` cases of `test_rgbd_preparation_routes_run_fixed_isolated_worker`, `test_rss_limit_is_measured_on_real_process`, and `test_timeout_kills_owned_descendants`. `test_actual_process_has_single_numerical_threads_and_resource_receipt` errored parsing empty stdout; its output does not preserve the receipt outcome independently. All are in `test_cpu_review_worker.py`. No test/resource policy was weakened.

Commands: `.local/reconstruction/venv/Scripts/python.exe -I -m unittest discover -s scripts/room_workflow -p 'test_*.py'` with all four numerical thread variables set to 1; `node --test scripts/room_workflow/*.test.mjs integrations/shado/*.test.mjs`; `npm.cmd test`. Full logs are the `rgbd-prepare-python.log`, `rgbd-prepare-node.log`, and `rgbd-prepare-app.log` files in session `836690aa-03f6-4444-9ecf-450f17792897`'s scratchpad. Fifteen local documentation links and documentation whitespace checks passed; `git diff --check` passed with existing line-ending warnings.

### Stage 2 independent review and fix pass

One read-only `eva-reviewer`, configured `opus`, reported resolved model `claude-opus-5-5[1m]`. It inspected the scoped preparation/supervisor code, reused calibration/decompression helpers, tests and retained metadata, but no real ZIP payloads, RGB pixels or trajectory. It found no blocking trust-boundary or coordinate-math defect; its pose-density estimate was explicitly an unverified inference.

- **Ruling:** treat the first-pose abort as an important diagnostic gap, not evidence of actual missing poses. Check all six pose correspondences *inside* the single supervised preparation attempt before extraction; journal each rejected view/residual and fail once with all affected IDs. No unsupervised real-data preflight, interpolation or relaxed tolerance. Cost: unavailable poses stop extraction entirely, preserving the attempt's full correspondence diagnosis but not decoded rasters. The all-missing synthetic test went RED → GREEN.
- **Fixed, RED → GREEN:** a mutated depth rotation previously passed the self-roundtrip. The preparation now independently unprojects raw pixels with raw intrinsics, rotates that point grid and validity mask, and compares them with the normalized-depth unprojection. The wrong-rotation test now rejects and preserves the partial members/journal without a manifest. This proves numerical grid correspondence, not physical registration.
- **Fixed, RED → GREEN:** the result now carries the pinned official file/revision references, identifies camera-Z and lowres intrinsics/trajectory association as loader-based assumptions, labels integer-center/OpenCV-like axes as numerical conventions, and explicitly leaves VGA-to-depth pose correspondence unverified. The emitted pose is for depth checks only. No physical RGB alignment is inferred.
- **Deferred minors:** no dedicated stage-2 final-rehash mutation test yet (checks exist, stage 1 has its own mutation test); no stage-level malformed-decoder partial-retention test (decoder rejection is tested separately). The missing-pose and wrong-rotation tests now cover their own stage failure/partial retention. Some `zlib`/OpenCV errors may produce a traceback instead of argparse's clean error, but remain journaled and fail closed. The earlier `complete`-before-manifest journal ordering remains; only the manifest commits a result.

**26 preparation tests passed** after this one fix pass. Available memory recovered to **4,017,606,656 bytes** without stopping services or changing limits. A fresh full serial regression run is required before real execution; no second review is planned. The earlier below-floor checkpoint is historical. The stage-2 allowance remains unused at this point.

### Post-review regression checkpoint

The post-fix full Python suite passed: **451 run, 446 passed, 5 skipped**. Core/app again passed **103 + 268**. The concurrently scheduled Node test files produced **180 passed, 2 failed, 2 skipped**: `actual isolated Python replay returns only needs-review with resource evidence` and `exact host bindings, unknown authority and missing manifest reject`, both in `scan-assisted.test.mjs`, reported the generic `CPU idealization failed, timed out or was cancelled`. Their temporary resource receipts are removed by test teardown, so memory pressure is plausible but not independently established for these two failures. No claim that the full gate passed at this checkpoint.

Ruling: rerun the full Node suite with `--test-concurrency=1` — its default file-level concurrency launches competing Python workers and is unnecessary for acceptance. This changes scheduling, not assertions, fixtures, application concurrency or any supervisor bound; cost is longer tests. Logs retain the failed `rgbd-prepare-fixed-node.log` and the serial rerun uses `rgbd-prepare-serial-node.log`. Python and app logs use the `rgbd-prepare-fixed-` prefix. The source remained unchanged during these runs.

Final code fingerprints: preparation `63d0e14acc648ca840b04570559c5753b3e0c9e9548a6d8ae26ba183ec154394`; preparation tests `537f9d3dc9e24bc4bc45583575ff9ad93195c416daa7ade7c424e53c284e6e4e`; supervisor `4f7e02234ab7ef6462f371d4ee812b8803c397dc22c5a7b40e7f8e44245c4342`; supervisor tests `e4295627f15ccf2d73393b7873d19d0774d79ef80a03afb512a8587b83a5eddc`. Isolated CLI help and whitespace checks on all four code/test files passed.

### Final regression gate and single real stage-2 attempt — 2026-10-22

The serialized full Node rerun passed **182 / 184, 2 skipped**. With the unchanged post-review Python **446 / 451, 5 skipped**, core **103 / 103** and app **268 / 268**, the final suites total **999 passed, 7 skipped, zero failures**. Earlier failed logs remain retained. This is test evidence, not successful real calibration.

Fresh preflight: **4,567,236,608 bytes available memory**, **59,851,771,904 bytes free disk**; output directory, resource receipt and shared lock absent; preparation script hash matched the post-review fingerprint. The owner-authorized single attempt then ran:

```powershell
& ".local/reconstruction/venv/Scripts/python.exe" -I scripts/room_workflow/cpu_review_worker.py --operation rgbd-prepare --input .local/reconstruction/arkitscenes/45261631/scan-rgbd-directory-v1/manifest.json --output-dir .local/reconstruction/arkitscenes/45261631/scan-rgbd-prepare-v1 --receipt .local/reconstruction/teal-bedroom-rgbd-prepare-v1.resources.json
```

**Exit 2, resource receipt `settled` / `worker-failed`.** The worker started at `2026-10-22T06:27:34.051392+00:00` and journaled failure at `06:27:34.531790+00:00`. All six nearest trajectory samples violated the unchanged 5 ms correspondence requirement:

| Conditioning RGB timestamp (s) | Nearest pose residual (ms) |
| --- | ---: |
| 56036.835 | 33.56425 |
| 56056.860 | 33.49046 |
| 56066.856 | 33.53704 |
| 56076.886 | 16.24279 |
| 56086.915 | 16.71154 |
| 56096.911 | 16.66604 |

The supervisor measured **1.094 seconds**, **81,199,104 bytes peak sampled RSS** and **4,523,118,592 bytes minimum available memory**. Resource limits held; this was a calibration-correspondence rejection, not a resource failure. The stdout hash is the empty-byte hash because the worker returned no success report.

Retained evidence: `.local/reconstruction/teal-bedroom-rgbd-prepare-v1.resources.json` (236 bytes, SHA-256 `3a9a55f8f676e4c8cacc3878db1dd83fac4b26d50bcece9bf26a86ccaff16f4e`) and `.local/reconstruction/arkitscenes/45261631/scan-rgbd-prepare-v1/preparation.jsonl` (1,508 bytes, SHA-256 `de1d565b853b3cbdd5a6f70fd55d2c594cdb73edf07403558bbf43dd5afe20d5`). Independent post-run metadata inspection found only that journal in the output directory, no manifest or extracted members, and no retained shared lock. No real raster or RGB normalization check ran because all-pose admission precedes member extraction. The trajectory and archive bindings were checked during the attempt; no source-write path exists in this operator.

**Decision 2 remains incomplete: its two single-attempt allowances are now consumed.** Do not delete the failed directory, rerun under another name, widen the time threshold, interpolate poses, change conditioning views or promote a source. The next owner exercise is to review these six residuals and authorize a separately bounded correspondence investigation/revised preparation attempt if desired. Recommended next scope is local inspection of bracketing trajectory metadata and official sensor/timestamp conventions, with no extraction/generation and no presumption that interpolation is valid. No new allowance or approval is inferred here.

## Modal correspondence investigation — 2026-10-22

The owner subsequently instructed: “Also you should be using Modal for their Cloud GPU instead of my local PC. Fix calibration and please continue implementation.” Real-room processing now targets Modal; local work is limited to source editing, metadata-only plan preparation, byte-integrity/transfer operations and bounded synthetic tests. No new cloud allowance was specified. The consumed local attempts above remain immutable.

**Diagnosis, not a calibration fix:** a fresh read-only research pass inspected the pinned Apple sources linked above. The loader's fallback is strictly `< 0.005` seconds and retains the last qualifying key, not a unique nearest sample. The raw README distinguishes the color streams and does not supply the required VGA-to-lowres clock mapping or extrinsics in the inspected material. This does not justify increasing EVA's 5 ms limit, applying an offset or interpolating poses. The existing rejection is correct; its underlying stream/timestamp cause remains unresolved.

Ruling: implement the smallest prerequisite diagnostic instead of disguising a tolerance increase as a fix. `scan_correspondence.py` reports the exact before/after samples, bracket span, nearest ties/residual and the **unchanged** existing 5 ms result for each of the six frozen timestamps. It does not compute/apply poses, decode images or establish registration. Cost: real calibration remains blocked until correspondence evidence supports a correction.

`scan_correspondence_cloud.py` prepares a byte-pinned plan using only the retained acquisition and directory manifests. Execution requires the exact saved plan hash and a fresh $1 operator attestation; CLI flags do not constitute owner approval. It uploads only the hash-bound supplied trajectory (at most 2 MiB) plus six timestamps, never RGB/held-out images, archives, geometry or credentials. The diagnostic uses the Python standard library in Modal; a GPU would be idle. Local acquisition/normalization helpers are not invoked. The fixed new `scan-correspondence-modal-v1` directory reserves the attempt before build, retains source/plan snapshots and rejected returned bytes, and prevents copied-plan replay. Existing owned-app stop verification is reused. Only `diagnostic-returned-and-stopped` after provider cleanup is a successful lifecycle result; no candidate/source manifest is written.

### Proposed new decision — not authorized or executed

- One Modal CPU diagnostic submission for **45261631**, no retry, extraction, interpolation, tolerance change, source admission, model or GPU.
- 1 CPU, 512 MiB, 30-second function timeout, 120-second startup timeout, 180-second result deadline; one single-use container, zero configured retries, US East, no secrets, runtime network/Modal access blocked. Image startup/build overhead is separate; no dependency/model installation is requested.
- At most 2 MiB trajectory input; one JSON report at most 64 KiB using restricted CBOR output. No persistent volume. Stop only the created app and require provider-confirmed stopped/zero tasks; uncertain cleanup blocks further execution. Provider retention/deletion is not guaranteed by stopping compute.
- **$1 proposed operational allowance**, not a provider-enforced dollar ceiling or verified actual charge. No inherited allowance. Any subsequent corrected preparation or GPU reconstruction needs its own bounded scope.
- Acceptance exercise: inspect all six brackets/residuals and primary-source clock/extrinsic evidence. A diagnostic alone cannot authorize a mapping or establish physical alignment.

Initial TDD: four timestamp tests failed before the diagnostic existed, then passed. Five cloud lifecycle/approval tests failed before the route existed, then passed. The first existing-Modal-client run exposed an unavailable `jsonschema` dependency through unnecessary calibration imports; the new route was made standard-library-only rather than installing packages. The focused suite then passed **10/10** in the retained Modal client, including actual SDK definition/CBOR serialization without submission. Full serial regression and independent review are pending at this checkpoint. No real trajectory payload was read and no cloud call launched.

The first serial regression batch completed with exit 0 before the two review fixes: Python 461 run / 455 passed / 6 skipped, plus the Node and root application commands returning 0. Those logs remain under the session scratchpad's `correspondence-` prefix; they are not final-revision evidence. A fresh post-fix batch uses `correspondence-fixed-`. Expected rejection-test CLI errors in Python stdout/stderr are not test failures.

### Review fixes and frozen proposal

Independent read-only review ran through `eva-reviewer` with explicit `opus`, reporting resolved `claude-opus-5-5[1m]`. Its initial snapshot preceded the stdlib import correction. Two remaining defects were reproduced and fixed in one pass:

- **RED → GREEN:** Modal's import-by-module worker could import client-only siblings absent from the image. The remote entrypoint now lives in the stdlib-only `scan_correspondence.py`, explicitly included with `add_local_python_source`. An isolated `-I -S` subprocess imports/runs only the shipped worker; the previous implementation failed with `ModuleNotFoundError: pilot`. No cloud test was inferred from this subprocess.
- **RED → GREEN:** startup failure before entering `app.run`'s body omitted owned-app cleanup. The executor now records any available locally created app ID and verifies its stop when the lifecycle has not already attempted cleanup. An unavailable ID remains explicitly unconfirmed; no unrelated app is selected. The synthetic startup failure initially observed no stop; after correction it retains the failed receipt and stopped/zero-task result.

The reviewer also identified the heavy post-return JSON import and stale code list; the stdlib-only correction already removed those imports and narrowed the pinned code set. **12/12 focused tests passed** in the retained Modal client after the fixes. No second review was run.

Rulings/deferred limits: the pinned directory bytes already bind exactly six millisecond targets, so a configurable target-count preflight was not added; the diagnostic's Decimal gate intentionally matches `scan_rgbd_prepare.select_pose`, not the shared float helper on arbitrary timestamps. Returned bracket values are untrusted diagnostics with envelope validation, not a fully admitted calibration contract. A malicious concurrent source swap between hashing and SDK upload is not prevented; operator approval is external, and the fixed attempt directory is not an authentication system. These limits do not permit a downstream source/candidate admission. Actual container startup and provider cleanup remain untested for this new route.

Offline plan saved at `.local/reconstruction/arkitscenes/45261631/scan-correspondence-modal-v1.plan.json`, SHA-256 **`d5a4de9d514540030d65b1643befddbbca169a1cb0bfa314d04e6242d4427ae7`**. Manifest metadata binds the **79,693-byte** trajectory, SHA-256 `6392a64025fcbfef52a68d2778f3e7c8e26c3c471e06a4403a55806fdb9a466b`; planning did not read its payload. Worker SHA-256 `d1ea8f6ba3ac3d29c0e338a46446c9337a26c16c23064883da62fa2927e20560`; client `3c2bbf027888bc5a245b46230c5d3c52458a8c2adcee798ce279b263f41d9b6e`. The plan records `execution_authorized: false`; no new attempt directory or cloud app was created.

### Final offline verification

The unchanged post-fix code completed the serial regression batch with exit 0: Python **463 run / 457 passed / 6 skipped**; Node **184 run / 182 passed / 2 skipped**; core **103 passed**; application **268 passed**. Total **1,010 passed, 8 skipped, zero failures**. The new actual-Modal-SDK test is skipped in the general environment but passed in the separate **12/12** retained-client run. Commands: isolated unittest discovery with numerical threads 1; `node --test --test-concurrency=1 scripts/room_workflow/*.test.mjs integrations/shado/*.test.mjs`; `npm.cmd test`. A preliminary version-only command named a nonexistent `venrc-client` directory; it did not run, and the actual test commands used the correct existing interpreters. No dependencies were installed.

Logs are in session `836690aa-03f6-4444-9ecf-450f17792897`'s scratchpad as `correspondence-fixed-python.log`, `correspondence-fixed-node.log`, and `correspondence-fixed-app.log`. Sixty-one local documentation links, task-file whitespace, frozen plan/code hashes and isolated CLI help passed. `git diff --check` passed with existing line-ending warnings. The new real attempt directory remains absent. No real trajectory analysis, image processing, cloud build/job, GPU, UI/browser exercise, service restart, commit or publication occurred. Calibration and owner acceptance remain pending.

## Owner acceptance

Completed earlier deliverables: accepted as recorded in the acquisition packet. This pass's implementation and failed real calibration result: **owner review pending**. No blanket future spending, retry, cap increase or release allowance.
