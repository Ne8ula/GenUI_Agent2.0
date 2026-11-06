# Idealized room backend — bounded acceptance

Date: 2026-10-21. **Decision: owner accepted the tested backend checkpoint only (D3-A).** This acceptance applies to the 28-file fingerprint below, with documented limitations. It does not cover subsequent changes, the blocked viewer, actual room quality, resource capacity or production release. Those decisions remain pending.

## Scope and revision

- Branch/base: `midterm`, `c83fd4c04ca170ed38311b94cdcdebec779051b7`, with uncommitted/untracked changes. The base commit alone does not reproduce this work; retain the working files. The [28-file source fingerprint](idealized-room-backend-v1.sources.json) identifies the tested backend bytes (manifest SHA-256 `fcd119f7ba12d1686c6c7091d60ba72d3d578a65ec9baff0cbe8108333bc43a4`); it is not a source archive or dependency lock. No commit or publication was made.
- Approved [specification](../../superpowers/specs/2026-10-21-idealized-room-design.md) and [Native implementation plan](../../superpowers/plans/2026-10-21-idealized-room.md), backend Tasks 1–7. Prior offline checkpoints remain separate from this integrated check.
- Main integration files: `scripts/room_workflow/{broker,benchmark,idealized-adapter,idealized-result}.mjs`, `idealized_prepare.py`, `idealized_room.py`, their source/contract/template/fitting modules and focused tests. [Operator contracts](../../../scripts/room_workflow/README.md#private-lifecycle-and-read-only-benchmark-admission).
- Actual execution: native implementation tools, Node test runner and installed Python CPU environment on Windows. The integrated `eva-reviewer` invocation requested Opus and reported `claude-opus-5-5[1m]`; its read-only inspection completed, followed by one Native RED→GREEN fix pass. The reviewer did not run tests. Ruflo routing was advisory, not worker execution.

## Scenarios and observed results

| Scenario | Expected | Observed |
| --- | --- | --- |
| Fixed retained-source import | Exact source digest; private session-owned copy; no model permission | HTTP tests pass; source bytes remain unchanged |
| Preparation and reopen | Existing RGB-derived camera/depth/mask inputs; explicit inventory; regenerated geometry | Actual synthetic saved-file → Python preparation → HTTP prepare/GET passes |
| Review/correction/undo | Exact current source, room, inventory, reasons and revision; retained prior candidates | Tests pass; stale/forged inputs reject; owner corrections survive reopen |
| Corrected room | Same object inventory, changed boundary/openings, new review required | CPU assembly/reopen test passes; malformed edits retain prior candidate |
| Cancellation, expiry and restart | No late admission; stop owned work; preserve uncertain cleanup records | Tests pass, including unconfirmed termination and actual Windows directory junctions |
| Read-only benchmark sidecar | Separate candidate; no changes to raw arms or public/private originals | Tests pass for original/WorldMirror; broader-view profile cannot read this sidecar |
| Sidecar trust boundary | Reject changed source/review/geometry and unknown authority; bound verifier concurrency | Tests pass, including resealed mesh forgery, races, directory link and uncertain-stop retry rejection |
| Owned process tree | Stop only the test parent/child | Explicit Windows smoke passes; no shared service stopped |

Synthetic review records are test inputs, not actual owner review. Retained benchmark GET tests inspect existing real source artifacts but do not create or approve a real idealized candidate.

## Reproduction and verification

Run from the repository using the existing environments; no installation is implied:

```powershell
& '.local/reconstruction/venv/Scripts/python.exe' -X utf8 -m unittest discover -s scripts/room_workflow -p 'test_*.py'
npm.cmd run room:test
node --test integrations/shado/*.test.mjs
npm.cmd test
$env:EVA_PROCESS_TREE_SMOKE='1'
node --test --test-name-pattern='actual owned parent and child' scripts/room_workflow/broker-completion.test.mjs
```

Observed after the integrated review fix pass:

- Python: **327 run, 322 passed, 5 environment skips**, exit 0, 65.645 seconds (`b03ub533r`). Expected negative CLI usage messages occurred; no suite failure.
- Node room workflow: **141 run, 139 passed, 2 opt-in skips**, exit 0, 36.466 seconds (`bwaeiz2l5`). The skipped parent/child smoke was separately explicitly enabled and passed **1/1** earlier in this backend pass. The older full CPU completion integration remains not run; new idealization CPU preparation/assembly/admission integrations did run, including the nonidentity source-frame fixture.
- Shado protocol: **32/32**; root core: **103/103**; app: **268/268**, exit 0 (`bwaeiz2l5`).
- `npm.cmd run typecheck` and `npm.cmd run build`: exit 0 (`b9iig4mf6`). Existing Rust warnings: unused `STRIDE`, unused `Leg.stance/contact`, unused `V3.finite`. Vite built 87 modules in 2.21 seconds. No server was started.
- Focused review regressions passed before the full run: verifier uncertainty/restart **2/2**, adapter **7/7**, Node diagnostics/admission **7/7**, Python I/O **8/8**, cleanup/expiry **5/5**, broker/benchmark **50/50**. The new rejection cases were observed failing before their fixes.
- Refreshed hygiene: **34 files** without trailing whitespace, **81 local links** and **12 heading anchors** resolve, and all **28 source fingerprints** match the retained manifest. Tracked `git diff --check` passed with existing LF/CRLF warnings.

Test logs are session-local tool evidence, not retained private source/photo data. These results establish backend test behavior, not a reviewed real room or owner acceptance.

## Integrated review disposition

The important findings were reproduced and fixed in one pass:

1. **Uncertain verifier cleanup:** persist launch intent, retain it across restart, suppress subsequent verification and block deletion/expiry while settlement is uncertain.
2. **Verification request inside frozen candidate directory:** normalize the directory path before creating a sibling request, including trailing-separator inputs.
3. **Injected diagnostics:** match the entire trusted fit list, including empty lists; allow only fit codes after the exactly regenerated layout prefix.
4. **One expired job blocking other jobs:** isolate locked cleanup failures per job, preserve evidence and expose a generic operator-inspection error.
5. **Incomplete source binding:** snapshot exact suggestion bytes and observation references, verify them in preparation, and share registration/frame/source admission across broker and benchmark. Resealed unrelated observations or frames reject.

Rulings and limits:

- Old source snapshots lacking the new suggestion binding fail closed; fresh import is required. No migration invents missing evidence, and old files are not deleted.
- Composed frame comparison permits `1e-9 * (1 + abs(expected))` floating-point error; exact typed frame digest and inverse/similarity checks still apply. This is numerical tolerance, not geometric accuracy.
- Uncertain CPU recovery is [offline operator inspection](../../../scripts/room_workflow/README.md#operator-recovery-after-uncertain-cpu-termination), not an HTTP reset. No reliable durable process identity exists across restart; recovery cannot trust a model assertion. The procedure has not been exercised as an automatic recovery tool.
- Local host files and frozen review records remain operator-trusted, unsigned inputs. Their hashes detect mismatches but do not authenticate a hostile local operator. This loopback development scope is not a multi-user production security claim.
- Historical-version reopening/migration, maximum resource load and all actual UI/real-room/SAM quality judgments remain outside this evidence. No acceptance or production release is inferred from their absence.

Deferred minors at the accepted checkpoint: broad sidecar `ENOENT` handling can conceal a missing interpreter as an absent sidecar; a failed/cancelled edit retains the old geometry but loses its previous ready status; shell palette is regenerated consistently but not independently host-bound; source admission rereads large inputs. At that checkpoint, source/proposal discovery had no HTTP route and automatic initial inventory remained an integration blocker, not a completed minor feature. The first continuation below adds source discovery; the separate inventory continuation adds an unapproved draft preview.

## Limitations and blockers

- No fresh approved Weave packet, frontend change, browser interaction, native-rendering measurement or dev-server restart. Viewer controls and continuity/accessibility acceptance remain blocked.
- No actual room boundary/inventory confirmation, fitted real-room candidate, benchmark sidecar export, owner quality acceptance or general-upload claim. Candidate inventory remains explicit; automatic preview exists only through the host CLI and is not integrated into candidate promotion.
- Source-fit residuals are bound to trusted preparation but not regenerated on reopen. Corrections clear stale residuals, retain unresolved inventory reasons and regenerate placement diagnostics; they do not silently refit.
- Benchmark verification is single-process, single-flight. Concurrent inspection can return raw evidence with a busy error; uncertain termination requires operator cleanup before restarting. Private broker verification is per-job, not globally serialized: the 20-job service limit can still allow multiple workers. Maximum 64-object fitting time, cross-job load and peak memory are unmeasured; keep broader activation blocked until calibrated, especially on the memory-constrained development host.
- Existing offline deferred items include derived-ID length limits, some cross-runtime numeric/pattern edge parity, omission wording, floor-gap review band and broader boundary/near-byte-limit cases. These are not claimed resolved by this record.
- No paid/model execution, model installation/download, credentials requested/printed, permission bypass, commit or publication. Dataset-supplied depth/poses remain excluded from RGB-only model inputs. Existing paid allowances remain consumed.

## Next owner exercise and decision

The owner selected D1-A (fresh imports; preserve old evidence), D2-A (manual verified cleanup) and D3-A (bounded backend acceptance) on 2026-10-21. The owner also authorized retained-room automatic proposals, a Weave proposal without generation, memory inspection without restart and bounded single-worker calibration. SAM is deferred. General-upload work is on hold until after the 2026-10-22 visual demo; passing that date alone does not authorize a new run.

After the visual prerequisite and a reproducible tested revision are available, review the actual retained-room boundary and source-linked inventory, exercise user-authored additions/correction/undo/reopen and compare the distinct idealization against unchanged raw evidence. Record expected/actual results, feedback and an explicit dated decision in the real-room acceptance record. Actual room, UI, capacity and release acceptance remain **pending**; the accepted backend fingerprint above is not retroactively extended to new changes.

## Post-acceptance continuation — 2026-10-21

**Decision: pending.** This continuation changes `broker.mjs` and `broker-idealization.test.mjs`, not the retained accepted manifest. The source-discovery GET returns the current fixed-source import digest, safe photo descriptors and unconfirmed room data; it does not assemble, approve inventory or grant model permission. The existing intake lock serializes discovery with imports. Three new HTTP behavior/rejection tests failed on the absent route before implementation; two concurrency tests then reproduced overlapping source loads before the lock fix. All five focused tests now pass. Independent read-only review requested Opus and reported `claude-opus-5-5[1m]`; the reviewer ran no tests. The final regression task (`bh9kn1yzr`) exited 0; both logs were inspected. Serial Node room workflow: **146 run, 144 passed, 2 opt-in skips**, zero failures, 68.260 seconds. The skips remain the owned-parent/child smoke and older CPU completion integration; neither was enabled again in this continuation. Root `npm.cmd test`: core **103/103** (0.213 seconds), app **268/268** (1.493 seconds), zero failures or skips. Numerical-library threads were requested as 1 for the room run. Python full suite, Shado protocol, typecheck and build were not rerun for this two-file endpoint change; their earlier results above remain historical.

- `scripts/room_workflow/broker.mjs` continuation SHA-256: `7da7d50e98503707e54f56ea2f714219428368ab7f9ca58c02f133927c65c5c9`.
- `scripts/room_workflow/broker-idealization.test.mjs` continuation SHA-256: `72a3b280397d4d974891de68acee7f0bf16cbac4fedbf8cc5230ab28914b15e0`.
- Hygiene: 34 files without trailing whitespace, 83 local links and 14 anchors resolved. The accepted manifest hash is unchanged; only these two of its 28 source files differ. `git diff --check` passes with existing LF/CRLF warnings.

G6-A first stopped at the headroom gate before starting a worker (1,560,379,392 bytes available; 2,952,790,016 required). After memory recovered, one synthetic-object full-search calibration passed: 9.500 seconds including supervision, 269,246,464 bytes sampled process-tree RSS and 3,765,940,224 bytes minimum available memory. The worker exercised 24 yaws × 9 dimension pairs, source-driven translation and saved-candidate reopen. Bounds stayed at 60 seconds, 768 MiB worker-tree RSS, 2 GiB available-memory floor and 0.1-second sampling, with numerical threads requested as 1. Sampling is not a guaranteed peak or OS-enforced CPU quota. This does not calibrate real-room, 64-object or cross-job capacity; services stayed stopped.

Automatic candidate inventory remains unfinished: unsupported categories, ambiguous associations and missing dimensions need exact disposition binding before readiness. The separate preview continuation below retains these drafts without granting readiness. Existing owner-authored `add` corrections are reused, not replaced. The [unexecuted Weave proposal](../../superpowers/plans/2026-10-21-idealized-room.md#unexecuted-weave-proposal) is one prompt-only static image, proposed ceiling 8 credits, one attempt/no retry; execution approval and account/quote verification remain pending. No frontend change, real-room review, general-upload/SAM execution, commit or publication occurred.

## Inventory preview continuation — 2026-10-21

**Decision: pending.** `idealized_sources.py` now derives a source-bound, revision-sealed preview; `idealized_prepare.py --draft-only` exposes it through the existing host CLI. Focused coverage is in `test_idealized_inventory.py` and `test_idealized_sources.py`; operator instructions and the implementation plan describe the incomplete integration. This continuation does not change or extend the accepted manifest.

- Every admitted observation appears exactly once, in an associated draft or an unresolved singleton. Unsupported categories, ambiguous identity, single-view-only evidence and missing/invalid support do not become fabricated furniture.
- Supported groups propose procedural numeric specs from visible source bounds and masked colors. Floor support and zero yaw are explicitly unverified priors; dimensions and pose require review. Black source color remains black.
- Preview output is `needs-review`, not a candidate. It contains no geometry or candidate manifest, invokes neither fitting nor assembly, and is rejected by candidate admission. Exclusive output creation preserves earlier evidence.
- Existing explicit inventory, including `[]`, retains its meaning. User-authored additions continue through existing `add` corrections. Exact per-draft resolution/omission, broker readiness and benchmark-sidecar integration remain unfinished.
- Focused checks observed before full regression: derivation **6/6** (0.016 seconds), source suite **15/15** (46.875 seconds), including actual synthetic-file CLI invocation, unchanged source bytes, stale/unknown-field rejection and no candidate emission. Missing function/flag failures preceded implementation. Fresh pre-change Python baseline: **327 run, 322 passed, 5 skips**, exit 0 (69.034 seconds).
- Full serial regression (`b5507ypap`) exited 0; all three logs were inspected. Python: **335 run, 330 passed, 5 environment skips**, 78.541 seconds. Node room workflow: **146 run, 144 passed, 2 opt-in skips**, 70.932 seconds. Root core: **103/103**, 0.233 seconds; app: **268/268**, 1.668 seconds. Zero failures. Numerical-library threads were requested as 1. Node skips remain the owned-process smoke and older CPU completion integration; neither was enabled again. Shado protocol, typecheck and build were not rerun for this Python-only implementation.
- Independent read-only `eva-reviewer` requested Opus and reported `claude-opus-5-5[1m]` (`ae74edda1ffd6f230`); no tests were run by the reviewer. Its missing race-test finding is addressed by `test_preparation_rejects_snapshot_or_review_changes_before_output`: snapshot and review rewrites reject in both draft and explicit modes without an output file. All four cases failed when the final recheck was removed in memory; the unmodified implementation passed (9.214 seconds). Full Python/root rerun after this test addition (`bu9untp53`) exited 0: Python **336 run, 331 passed, 5 skips**, 82.325 seconds; core **103/103**, 0.229 seconds; app **268/268**, 1.625 seconds. Logs show zero failures. Production code was unchanged after the preceding Node room run.
- Hygiene: **35 files**, **83 local links**, **14 heading anchors** passed; tracked `git diff --check` passed with existing LF/CRLF warnings. The accepted manifest is unchanged. Five retained source files now differ (the two discovery files plus `idealized_sources.py`, `idealized_prepare.py`, `test_idealized_sources.py`); `test_idealized_inventory.py` is new.

Preview source fingerprints (not acceptance):

| File under `scripts/room_workflow/` | SHA-256 |
| --- | --- |
| `idealized_sources.py` | `99751444ad2560c4e59586d2688ce1ef584f7cb770f8dc74cd4a6441b8d1081c` |
| `idealized_prepare.py` | `89ae5114b6f16ebda573ab5de36cc2acfe583d676e00f037c8a240b3b4aa3143` |
| `test_idealized_inventory.py` | `89978a793c3725ede656ea573ef63636d05e8a15d8ca426ef29a2dfc58cf2d71` |
| `test_idealized_sources.py` | `049db72bc72cd475ad0d77ba24fb47ced606c3c404b80ac572ec80f7a87d4606` |

Review limitations retained for integration:

- `source_sha256` is a host-recorded import identity, not independently recomputed by this CLI. Exact suggestion/report digests remain in the sibling binding file, not the preview envelope. Keep these records together; preview is not an admission contract.
- Draft/object IDs hash ordinal observation IDs, so IDs alone cannot identify a detection across suggestion runs. Future decisions must bind exact source, revision and evidence, never draft ID alone.
- Desk/table labels associate separately before normalization and can yield overlapping proposals. Weak-score and image-edge warnings are retained but do not block proposals. Actual source review remains required.
- The reused schema calls non-owner pose origin `fitted`; here the mandatory `pose-unfitted` reason and source note identify an unfitted prior. A preview must not be presented as fitted geometry.
- Existing raw-directory/raw-geometry post-load rechecks remain out of scope; failed preparation can retain the sibling binding file. Use a fresh output basename and preserve failed evidence.

No frontend edit or service restart was made. Actual retained-room quality, maximum-capacity behavior, accessibility/continuity and the full M1 demo remain unverified.
