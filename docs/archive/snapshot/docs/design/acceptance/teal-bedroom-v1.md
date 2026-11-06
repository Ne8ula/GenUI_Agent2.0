# Teal bedroom offline checkpoint

2026-10-21. **Implementation in progress; owner quality acceptance pending.** The owner approved the [design](../../superpowers/specs/2026-10-21-teal-bedroom-reconstruction-design.md) and [Native implementation plan](../../superpowers/plans/2026-10-21-teal-bedroom-reconstruction.md). This record is an offline checkpoint, not a reconstructed-room demonstration.

## Scope and revision

Shared `midterm`, base `c83fd4c04ca170ed38311b94cdcdebec779051b7`, with extensive pre-existing modified/untracked work. No commits, branch changes, stash/reset, evidence deletion or publication. The base alone does not reproduce the working tree. [Tested code fingerprints](teal-bedroom-v1.sources.json) identify the task-owned implementation and tests; they are not hashes of real room assets. Task-owned pre-edit snapshots for the resolver and planning documents are retained in this session's `teal-bedroom-baseline` scratch directory; the execution ledger is `teal-bedroom-progress.md` there.

- **Task 1 complete:** pure exact-revision inventory decisions in `idealized_sources.py`; nonmutation, omission reasons and explicit owner interpretation. No old-room promotion or broker/UI change.
- **Task 2 partial:** closed scan metadata/geometry schema, source/candidate validation and synthetic fixtures; fixed-bedroom acquisition catalog, optional frozen ETag/length download checks and bounded streaming PLY inspection. Actual assets and their pixel/geometry content remain uninspected.
- **Task 3 partial:** instance-bound VGA ZIP metadata preserving the older-room default; bounded supplied-trajectory parsing, axis-angle inversion, nearest-pose rejection, millimeter conversion, pixel-grid rotation, depth unprojection and rotated-grid projection. These do not establish actual sensor registration. `register_scan_inputs`, real RGB/depth alignment and the bedroom frame are not implemented/admitted yet.
- **Task 4 partial:** pure source-view-linked face association, closed inventory drafts/exact review, deterministic candidate assembly, pose/scale and omit/restore corrections, and exclusive recipe-backed save/reopen. Vertices and centroid must agree in two depth-visible conditioning views; overlap, contradictory identity, single-view and unobserved faces remain unresolved. Drafts retain every item and reject shared face claims/cyclic lineage; annotation boxes cannot claim surfaces. Assembly preserves raw inputs, removes only omitted ownership, keeps unresolved geometry unassigned and records original source face indices. Correction splits shared vertices so neighbors remain unchanged. This is sampled evidence, not a guarantee of continuous per-face segmentation. No real detector execution, admitted replacement, split/merge, host undo/review lifecycle or host promotion exists yet.
- **Tasks 5/7/8 pending; Task 6 partial:** source textures, complete private lifecycle admission, frontend integration and conditional generation remain unfinished. Private bounded host replay now exists (continuation below); structural candidate validation alone remains pure data admission. Offline save/reopen regenerates from the separately bound decoded recipe, but source file bytes, image decoding, calibration and exact evidence membership still require the later host layer. No production route exposes scan candidates.

## Execution evidence

All tests below use existing dependencies; no model installation or cloud computation.

| Check | Actual result |
| --- | --- |
| Existing inventory baseline | 8 run: 6 passed, 2 `resolve_inventory` missing-function errors |
| Expanded inventory RED | 9 run: 6 passed, 3 missing-function errors |
| Inventory GREEN | 9 passed |
| Task 1 full room Python suite | 339 run: 334 passed, 5 environment-dependent skips |
| New scan-source tests | 8 passed; synthetic HTTP only |
| New scan-contract tests | 6 passed |
| Calibration helpers | 5 passed after 5 missing-function errors |
| VGA range regression | 7 passed after missing descriptor support reproduced |
| Updated full room Python suite | 359 run: 354 passed, 5 environment-dependent skips |
| `npm.cmd run room:test` | 146 run: 144 passed, 2 skipped |
| `npm.cmd test` | Week 4 core 103 passed; app 268 passed |

Python command: `.local/reconstruction/venv/Scripts/python.exe -X utf8 -m unittest discover -s scripts/room_workflow -p 'test_*.py'`, with numerical thread counts set to 1 for full runs. Focused commands use `test_idealized_inventory.py`, `test_scan_source.py`, `test_scan_contract.py`, `test_scan_calibration.py` and `test_vga_rgb_range.py` instead. Expected rejection tests print argument-parser errors; suite exit codes were zero. These are test results, not actual room quality or hardware performance measurements.

The two Node skips were `actual owned parent and child processes stop together` and `actual CPU adapter runs through broker and admits a bound artifact`. The final verbose Python run repeated 359 tests, 354 passed and these five skips:

- `test_arkitscenes.ARKitScenesTests.test_symlink_frame_rejected`: host does not grant symlink creation.
- `test_cloud_sdk.CloudDefinitionTests.test_worker_is_module_level_and_registered_under_client_name`: Modal absent in this environment.
- `test_worldmirror_cloud.WorldMirrorCloudTests.test_sdk_definition_disallows_pickle_results`: requires existing genrc-client Modal environment.
- `test_worldmirror_transfer_probe.OperatorTests.test_real_sdk_keeps_chunk_records_inline_and_security_flags_enabled`: requires existing genrc-client environment.
- `test_worldmirror_transport.TransportTests.test_serialized_records_fit_verified_inline_size`: requires existing Modal client environment.

Documentation check before this continuation: five scope/plan/checkpoint documents, 54 local links/anchors, zero errors.

## Independent review and continuation

The read-only `eva-reviewer` completed the first checkpoint review and reported resolved model `claude-opus-5-5[1m]`. It reported no Critical/High defects. The lead reproduced the following issues with failing tests and treated them as important because they affect confinement, provenance or geometry:

1. Parent traversal escaped the intended output subtree. `_no_links` now rejects `..` before creating files or requesting data.
2. Shared depth/confidence could be labelled independent evaluation. Cross-role reuse now rejects that claim; common calibration/trajectory files remain valid.
3. Source-derived components could lack references, and owner additions could claim scan evidence. Objects and components now enforce the same provenance rule.
4. A swapped-then-restored mesh could produce a report from unverified bytes. PLY parsing now consumes the exact immutable bytes hashed by inspection. Permanent changes still reject on the second verification.
5. Raw integer millimeters could silently enter the meter unprojector. That input now rejects; explicit conversion remains required.

The regression run first produced eight failing assertions; a separate owner-object test also failed. All 25 then-current scan tests passed after fixes. Continued Task 3 added trajectory parsing and full-matrix projection (two missing-function assertion failures, then eight calibration tests passed). Continued Task 4 added source-view/mask association tests; its initial five tests failed on the absent module, then passed. Integer-overflow checks exposed an additional rejection of valid unsigned geometry and acceptance of an out-of-bound signed minimum; both were reproduced and fixed. Final continuation checks: **34 scan tests passed; full Python 374 run, 369 passed, the same five skips; Node room 146 run, 144 passed, the same two skips; root core 103 and app 268 passed.** All commands exited zero. The reviewer covered the earlier checkpoint; new trajectory/projection and face-association code has automated regression evidence, not a second independent review.

**Review disposition and limits:**

- Independence rejection is deliberately cross-role and claim-specific for depth/confidence, not a ban on identical confidence maps within conditioning views. RGB uniqueness is unchanged. Host source membership/byte validation remains mandatory.
- **Deferred minor:** failed acquisition preserves completed files and `.part` output but has no incremental receipt. Do not admit or resume such a directory; close this gap before real acquisition.
- Rotated-grid projection is now separate from the legacy positive-focal helper, so old RGB-only behavior is unchanged. Actual registration is still absent.
- Generated-texture/face-origin checks remain Task 5 work; maximum-size validator performance and host deadlines remain Task 6 work. Exact raw PLY count-limit acceptance and actual VGA/depth calibration rejection are not yet evidenced.
- The reviewer did not establish the cause of HTTP 403, official repository-route validity or real ETag formats. No network retry or provider substitution followed the review.
- Association is bounded to 200,000 input vertices and 400,000 faces, in 8,192-face chunks. Larger inputs reject rather than truncate. Its supplied decoded calibration/depth still require host byte verification; synthetic masks do not establish actual object identity.

## Inventory review and assembly continuation

The owner requested inventory review and candidate assembly after the reviewed checkpoint. The Native lead added `draft_scan_objects` / `resolve_scan_objects` in `scan_objects.py`, `assemble_scan` in `scan_room.py`, closed inventory schema definitions and fragment/disposition validation in `scan_contract.py`, plus `test_scan_room.py`. No new worker, installation or external execution was used.

- Exact review coverage and revision checks reject stale, duplicate, missing, foreign and authority-bearing decisions. Every disposition has a nonblank reason. Boxes remain weaker evidence and cannot claim face ownership.
- Retain/omit/unresolved are implemented; replacement explicitly rejects until an admitted completion exists. Parent-child records remain separate without treating touching bounding boxes as an error.
- Assembly validates **all** raw geometry before omission can hide malformed faces, converts the source frame once, removes only assigned omissions, compacts unused vertices, preserves unresolved/unassigned geometry and includes original source face indices. Vertex-color fallback is explicit; no photo texture is invented.
- Ruling: the plan's underspecified `objects` argument is a closed `{mesh_asset_id, geometry, boundary}` bundle of host-decoded source-frame geometry and a candidate-frame boundary. This keeps files/network outside the pure assembler. Cost/limit: the later host must prove those decoded arrays and observations came from the bound source bytes; these functions alone cannot admit a real source.
- At that checkpoint, pure assembly returned only an in-memory needs-review candidate. The later correction/persistence continuation below adds recipe replay and save/reopen; admitted replacement and Node host integration remain unfinished. There is still no actual bedroom candidate or owner quality acceptance.

**Verification:** seven inventory/assembly tests initially failed on missing draft/assembly functions. After implementation the scan suite passed 41 tests; an additional resealing regression then reproduced five fragment-map/disposition gaps and passed after shared validation was fixed. Final: **42 scan tests passed; full Python 382 run, 377 passed, the same five environment skips; Node room 146 run, 144 passed, the same two skips; core 103 and app 268 passed.** All final commands exited zero. No second independent review or browser/native check was performed.

[Continuation code fingerprints](teal-bedroom-inventory-v1.sources.json) overlay the retained earlier fingerprint record; the earlier hashes remain historical evidence, not claims about subsequently modified files.

## Correction and persistence continuation

The resumed Native lead recovered the approved task from this checkpoint and the current plan. The fresh baseline was **42 scan tests passed**. Only `scan_room.py` changed in production; `test_scan_persistence.py` and local documentation/evidence were added or updated. No UI, broker, legacy source or model-worker changes; no network requests, installations, service restarts, commits or publication.

- `correct_scan_candidate` supports absolute candidate-frame rigid pose/positive uniform scale, omit, restore and unresolved dispositions. It binds the current revision, preserves source identities, splits vertices shared with unchanged neighbors, and rebuilds from raw recipe arrays rather than accumulating edits. Out-of-bound geometry, invalid transforms, missing identities, authority fields and unsupported actions reject. Touching-object boxes are not used as collision rejection; intersection/support grading remains unfinished.
- `write_scan_candidate` exclusively writes candidate and recipe files, then flushes/commits the manifest last. Candidate plus recipe share a 64 MiB limit with 1 KiB reserved for the manifest. Interrupted files remain retained and cannot reopen as complete; existing directories cannot be overwritten or resumed. Traversal, linked parents and linked saved files reject.
- `read_scan_candidate` requires an external exact candidate binding plus typed recipe digest, verifies encoded file hashes and regenerates the whole candidate. Recomputing geometry/revision/manifest checksums does not bypass recipe replay. An earlier saved revision can be reopened only with its earlier binding; this is presentation restoration, not current host approval or verified history.
- The isolated `scan_room.py --input ... --output|--correct|--verify ...` CLI is exercised through real synthetic subprocesses. All successful reports remain `needs-review`. [Input and command contracts](../../../scripts/room_workflow/README.md#offline-scan-assisted-bedroom-candidate).

**Rulings:** kept the single shared-checkout writer to preserve the untracked implementation; no branch/worktree or commit operation. The write API requires a third `recipe` argument; correction requires a fourth recipe argument and returns `(candidate, recipe)`. Reopen's external binding adds `recipe_sha256`. This is necessary because a candidate has discarded omitted source faces and cannot regenerate itself. Cost: an additional bounded file/API argument, not a source-provenance guarantee. The current recipe contains host-decoded geometry; actual source-byte/observation verification remains mandatory before host admission. Implemented placement and disposition corrections first; split/merge, admitted replacement and owner additions remain explicit unfinished Task 4 work rather than coercing scan objects into procedural templates.

**Tests before independent review:** ten persistence/correction tests first produced 23 missing-function assertions, then all ten passed. An isolated CLI test failed because the entrypoint did not support isolated imports; the completed entrypoint passed. Scan suite **53 passed**; full Python **393 run, 388 passed, five skips**; Node room **146 run, 144 passed, two skips**; core **103 passed**, app **268 passed**. All final commands exited zero. Python/Node skipped tests are the same named environment-dependent cases above. No real bedroom, browser/native, maximum-size performance or source-asset admission evidence is implied.

[Pre-review continuation fingerprints](teal-bedroom-persistence-v1.sources.json) overlay the retained inventory checkpoint. The read-only `eva-reviewer`, configured alias `opus`, reported resolved model `claude-opus-5-5[1m]`. It found no blocking security defect in this offline scope, one concrete correction defect and unmeasured resource/capacity risks. This was code review, not a model-run, performance or actual-room validation.

**Important finding fixed:** a transformed object could become omitted/unresolved while still claiming placement in its metadata/diagnostics; a handwritten recipe could likewise place an annotation-only item. Two new regression tests reproduced five failures. Recipe assembly now rejects transforms on non-retained records; omit/unresolved clears the object's placement in the new recipe. Restore returns the source pose; the previous corrected candidate remains immutable. **55 scan tests passed** after the fix. Full post-fix regressions: **395 Python run, 390 passed and the same five skips; 146 Node room run, 144 passed and the same two skips; 103 core and 268 app passed.** All commands exited zero. [Post-review fix fingerprints](teal-bedroom-persistence-v2.sources.json) overlay v1. No second review was dispatched.

**Remaining review dispositions (not silently treated as fixed):**

- **Resource/capacity ruling (#2–3):** maximum-size time/RSS and saved-recipe overhead remain unmeasured, not demonstrated failures. The same 64 MiB store is intentionally stricter than the independent geometry shape caps. Keep real processing/host integration blocked until enforcing-worker measurements and any required storage revision; never silently raise limits. Large valid-shape candidates may reject or exceed an unenforced CLI runtime envelope.
- **Deferred minor (#4):** extreme JSON integers/nesting can produce an uncaught traceback instead of the normal CLI error. It rejects without a committed candidate; normalize errors before host exposure.
- **Deferred minor (#5):** exact replay is implementation/numeric-environment-specific; changes to code/schema or BLAS results can prevent old files reopening. No migration or cross-machine guarantee. This limit is now documented.
- **Deferred minor (#6):** diagnostic prefix/count caps reduce the accepted maximum transform reason length and count below the underlying 1000-character/64-record bounds. Align these before full inventory integration; current rejection is fail-closed.
- **Deferred minor (#7):** transforms are absolute about the candidate-frame origin, already baked into geometry and not hierarchical. Parent/child contact, collision/support grading and a two-transformed-owner shared-vertex case remain unverified. The renderer must not apply the object matrix twice; semantics are documented.
- **Deferred minor (#8):** local link checks are check-then-open, not a filesystem sandbox. Read-side link variants, concurrent link swapping and POSIX directory durability are not tested. Keep paths host-controlled and private; strengthen confinement before exposing a worker/HTTP route.
- **Contract ruling (#9):** keep encoded manifest SHA separate from typed host recipe digest; confusing them safely rejects rather than admitting. The plan API signatures and combined transform/inventory review hash are now documented. Host output-root confinement remains Task 6, not a property of the standalone CLI.

These rulings preserve the bounded offline checkpoint, not final Task 4 or quality acceptance. Real source admission, replacement/split/merge/additions, private lifecycle and measured resource gates remain required.

### Bounded host continuation

The owner requested bounded host verification followed by real assets. The lead added private `readScanCandidate` replay, extracted the existing Node subprocess invocation without changing legacy reports, and added a fixed-entrypoint Python resource supervisor using installed `psutil` (7.2.2; Python 3.12.12). `scan_source.py` now supports isolated imports for inspection. No broker route, UI, source registration or readiness promotion was added.

- The host verifies exact bindings, private-root containment, junction/link rejection, combined storage bytes, unchanged files and the candidate's full typed revision after Python recipe replay. Expected inputs and resource receipts remain retained.
- The reviewed CPU worker samples its own plus descendant RSS every nominal 50 ms; rejects above 768 MiB, below 2 GiB available RAM, after 150 seconds, or above 64 KiB per output stream; numerical thread settings are 1. Failed measurement rejects. Owned descendants are killed/waited on; uncertainty preserves locks. This is sampled monitoring, not an OS hard cap or arbitrary-code sandbox, and does not include the Node parent.
- Concurrency/uncertainty locks are per trusted private host root. All operator runs must use that same root. There is no automated cleanup reset; interrupted roots need independent owned-process termination evidence before an authorized manual recovery. Neither stopped parents nor expired deadlines establish descendant settlement.
- TDD: seven initial missing-supervisor failures; four missing-host failures; isolated source inspection reproduced the missing sibling import; the concurrency regression reproduced a launch despite an existing lock. These were corrected. A test initially assumed `status` existed inside the candidate; the existing contract instead has `kind`/`mode` and the separate CLI report carries `needs-review`. Tests now preserve that contract. A cancellation test was made deterministic with a real hanging subprocess: fast successful workers may settle before Windows termination returns, and such settlement must not be falsely labelled unknown.
- Pre-review suites: **404 Python run / 399 passed / five skips; 150 Node room run / 148 passed / two skips; 103 core and 268 app passed**, all exit zero. Skips remain the same environment-dependent cases listed above. Independent bounded-pass review and capacity probe were pending when this paragraph was written; final disposition follows separately.

**Rulings:** introduce a small Python supervisor because the extracted Node wrapper alone cannot measure process-tree RSS or available memory; reuse installed `psutil`, not a new dependency or duplicated platform code. Keep the old `idealized_prepare.py` entrypoint as well as `idealized_room.py`, plus the new supervisor: the plan's “two entrypoints” wording omitted an existing caller. Cost if wrong: legacy preparation could break; its regression tests remain required. Keep this a partial Task 6 private library/operator checkpoint, not premature HTTP/source admission. Full-size candidate replay/storage capacity remains a real-data gate.

**Review disposition:** the independent `eva-reviewer` reported execution as `claude-opus-5-5[1m]`. No Critical findings. Three Important findings were addressed: (I1) the supervisor's work deadline is now 135 seconds, leaving startup/cleanup room inside the unchanged 150-second host ceiling; (I2) definite configuration/spawn failures without execution evidence release the host lock, while a settled receipt with a retained Python lock still blocks; (I3) rejection tests assert the actual reason, lock removal and a final successful reopen, while path tests independently count launches. The supervisor's prelaunch receipt-collision lock leak (M1) was regraded Important because it also wedged subsequent work; an additional failing regression preserves the old receipt and proves the new lock is removed before any worker launches. I1/I2/M1 reproduced as four failing tests before their fixes; no second review was dispatched.

**Deferred minors:** M2, non-string hex inputs can pass the cheap JavaScript coercing regexp but reject in Python; M3, sampled descendant discovery is not OS job containment and does not cover a deliberately detached/reparented worker (only fixed reviewed scripts are supported); M5, Node does not compare the diagnostic stdout hash in the exclusive resource receipt; M6, the test's `pid_exists` assertion could theoretically encounter PID reuse. M4 was a plan-wording conflict, resolved by the documented entrypoint/supervisor ruling rather than claiming it was pre-existing acceptance. Private-path checks remain check-then-open, not a hostile-local-filesystem sandbox.

**Actual synthetic capacity probes on this Windows host:**

| Probe | Outcome | Sampled peak RSS | Minimum available memory | Elapsed |
| --- | --- | ---: | ---: | ---: |
| Binary PLY: 31,500,181 bytes, 1,000,000 vertices, 1,500,000 faces | Inspection passed | 98,234,368 bytes | 4,764,520,448 bytes | 2.000 s |
| Candidate input: 199,998 vertices / 400,000 faces | **Deadline rejection during assembly**, settled cleanup; no saved candidate | 264,351,744 bytes | 4,627,185,664 bytes | 150.047 s including stop |
| Smaller candidate input: 1,998 vertices / 4,000 faces | Assembly, exclusive save and Python reopen passed; 315,566 saved bytes | 77,848,576 bytes | 5,141,336,064 bytes | 10.891 s |

The first two used the pre-review 150-second supervisor default; the smaller probe used the corrected 135-second work default. Session scratch retains the generator scripts, JSON receipts and stage events. Geometry repeats simple in-bound triangles; these are bounded workload probes, **not** room quality, typical-case accuracy or certified maximum capacity. The large candidate did not finish even assembly, so its save/reopen capacity is unmeasured. Keep the limits; optimize/profile offline or obtain a separate heavier-processing plan rather than silently truncating geometry or extending runtime. [Final host code/test fingerprints](teal-bedroom-host-v1.sources.json) overlay the retained checkpoints.

**Final post-review verification:** **406 Python run / 401 passed / five skips; 152 Node room run / 150 passed / two skips; 103 core and 268 app passed** — **922 passes, seven skips**, all suite exit codes zero. Commands are the same full discovery/`room:test`/root test commands recorded above. This includes eleven supervisor tests and six scan-host tests. The intentional large-capacity probe failed at the enforced deadline; it is not counted as a passing workload. No real source, browser, native, production-service, typecheck/build or second independent-review claim is made by this backend checkpoint.

## Source-access checkpoint

`scan_source.py plan` attempted read-only public HEAD requests to freeze a first-source packet. The first request, the pinned official license URL, returned **HTTP 403 Forbidden**. It stopped before any asset download. No retry, alternate credential route, mirror or access bypass was attempted. Earlier successful Apple probes do not make the new frozen packet complete.

A complete acquisition packet is therefore **not ready for execution approval**. Keep the initial bounds: ≤128 MiB transfer, mesh ≤32 MiB, metadata/annotation/trajectory ≤2 MiB each, no full RGB archive or visit laser scans. A later separate packet may request lowres depth/confidence/calibration and selected RGB ≤384 MiB. Actual inspection still needs headroom/deadline/RSS enforcement and approval; offline helper tests do not authorize it.

The read-only `eva-researcher` continuation checked the official GitHub [commit metadata](https://api.github.com/repos/apple-aiml-research/ARKitScenes/commits/474aaa83d7b1c9080619d8485de2d7c885c01fc5), [LICENSE metadata](https://api.github.com/repos/apple-aiml-research/ARKitScenes/contents/LICENSE?ref=474aaa83d7b1c9080619d8485de2d7c885c01fc5) and [pinned downloader](https://raw.githubusercontent.com/apple-aiml-research/ARKitScenes/474aaa83d7b1c9080619d8485de2d7c885c01fc5/download_data.py). It confirmed the repository/revision/license path and catalog paths; no URL correction is indicated. The license metadata reports 4,796 bytes. It did **not** obtain fresh Apple HEAD/ETag/length evidence or establish the 403 cause. No binary transfer, credential workaround or automatic retry followed.

**Prepared exact source scope, not a frozen/approved transfer packet:**

| Asset | Exact URL | Maximum bytes |
| --- | --- | ---: |
| License | `https://raw.githubusercontent.com/apple-aiml-research/ARKitScenes/474aaa83d7b1c9080619d8485de2d7c885c01fc5/LICENSE` | 65,536 |
| Metadata | `https://docs-assets.developer.apple.com/ml-research/datasets/arkitscenes/v1/raw/metadata.csv` | 2,097,152 |
| Mesh | `https://docs-assets.developer.apple.com/ml-research/datasets/arkitscenes/v1/raw/Validation/45261631/45261631_3dod_mesh.ply` | 33,554,432 |
| Annotation | `https://docs-assets.developer.apple.com/ml-research/datasets/arkitscenes/v1/raw/Validation/45261631/45261631_3dod_annotation.json` | 2,097,152 |
| Trajectory | `https://docs-assets.developer.apple.com/ml-research/datasets/arkitscenes/v1/raw/Validation/45261631/lowres_wide.traj` | 2,097,152 |
| Low-res intrinsics | `https://docs-assets.developer.apple.com/ml-research/datasets/arkitscenes/v1/raw/Validation/45261631/lowres_wide_intrinsics.zip` | 2,097,152 |
| VGA intrinsics | `https://docs-assets.developer.apple.com/ml-research/datasets/arkitscenes/v1/raw/Validation/45261631/vga_wide_intrinsics.zip` | 2,097,152 |

Historical asset sizes plus the verified license size total 26,388,210 bytes excluding metadata; reserving the metadata maximum gives 28,485,362 bytes, **not** a new measured transfer length. One attempt, a new exclusive private destination, no RGB/depth/confidence/highres/laser archives. Fresh status/ETag/length freeze, exact packet approval and incremental failed-acquisition receipts remain prerequisites. The user's continuation requests progress toward real assets; it does not replace the approved plan's exact-packet gate. No real assets were processed by this continuation.

## Decisions and limitations

- Kept the single writer in the shared checkout because the approved plan depends on untracked current code and forbids branch changes/commits. Review must use file-level changes, not pretend HEAD contains this work.
- Extended existing `arkit_fetch.download` with an optional frozen metadata argument rather than duplicating the downloader. Existing callers keep their default behavior. This is a narrow deviation from the plan's "reuse unchanged" wording, required to check GET metadata against the frozen HEAD.
- Kept scan admission separate from RGB-only validation. Scan provenance and full revisions include texture/UV metadata; legacy geometry hashes retain their old meaning.
- Source inspection reports units/axes/coverage as unverified. Calibration helpers are not a license to resize VGA/depth grids into alignment or admit an unverified frame.
- Existing room candidates, two already-running services and prior spending allowances were not replaced, restarted or reused.

## Owner exercise and decision

No bedroom walkthrough is ready. Next checkpoint is a viable, exact source-acquisition packet and review of actual calibration evidence; visual work independently requires its fresh Weave prerequisite or an explicit scoped waiver. No paid object-generation trial is authorized.

Decision: **pending**. No new reconstruction quality, real-data calibration, UI/native behavior, performance or final acceptance claim.
