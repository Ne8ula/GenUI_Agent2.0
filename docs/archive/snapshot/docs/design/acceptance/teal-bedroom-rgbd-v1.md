# Teal bedroom RGB-D acquisition proposal v1

**Decision: owner approved decision 1, explicitly including the larger transfer ceiling, on 2026-10-22. Execution prerequisites still apply.**

Owner instruction: “Approve decision 1, including the larger transfer ceiling, and continue.” This grants the exact two-archive scope and plan hash below, not extraction or other later decisions. The frozen JSON files retain their original pending/non-executable snapshot flags; this decision and subsequent implementation record supersede those statuses without changing their bytes.

## Proposed decision

Approve one serial acquisition attempt for **two archives only**, for ARKitScenes **Validation/45261631**: supplied low-resolution depth and depth confidence, **144,833,824 bytes total (138.12 MiB)**. Retain the existing six RGB originals and previously acquired calibration/trajectory for later separately approved admission. This is acquisition preparation for the scan-assisted demo, not an RGB-only reconstruction or a calibrated RGB-D result.

Approval must explicitly include this packet's exact transfer ceiling: it exceeds the earlier 128 MiB ceiling by **10,616,096 bytes**. Do not raise the old seven-asset downloader's global limit or reuse its consumed allowance. No paid service budget is requested.

- [Frozen machine-readable proposal](teal-bedroom-rgbd-v1.plan.json), encoded-file SHA-256: `ddc5df0ab9dd2b85049fe6d5050da1bd622cf0361cb3b17d36125ce91745f951`.
- [Header receipt](teal-bedroom-rgbd-v1.headers.json), encoded-file SHA-256: `0086620481aa6be8aa2d51cebdf033a020dab96c39e419b698fddc539383d54a`.
- Baseline: shared dirty `midterm`, base `c83fd4c04ca170ed38311b94cdcdebec779051b7`. The original header/proposal pass changed no production code; the subsequent executor and tested fingerprints are recorded below.
- This is a **proposal contract**, not an input accepted by the existing `scan_source.py fetch` CLI. That CLI intentionally remains bound to the earlier seven assets, old limit and consumed output directory.

## Observed source headers

One HEAD per fixed Apple URL, serial, using installed `curl.exe` with default curl configuration disabled, HTTPS certificate verification, the existing `EVA-ARKitScenes-research/1` user agent, 10-second connect and 20-second request ceilings. No redirects, retries, Range requests, cookies or added credentials. Request timestamps: **2026-10-22 05:01:18.318385–05:01:19.024616 UTC**. All three clients exited 0 and returned HTTP 200. The receipt retains selected headers, not a full raw-header dump.

Base URL: `https://docs-assets.developer.apple.com/ml-research/datasets/arkitscenes/v1/raw/Validation/45261631/`.

| File | Content-Length (bytes) | ETag | Proposed disposition |
| --- | ---: | --- | --- |
| `lowres_depth.zip` | 139,266,078 | `"40f73db1ee3f3b1e5ae26711946b2481-3"` | Acquire once; exact per-file ceiling equals length |
| `confidence.zip` | 5,567,746 | `"daff6fe7db9b698132303a109500915c"` | Acquire once; exact per-file ceiling equals length |
| `vga_wide.zip` | 821,105,856 | `"801c5f612225e5d343acb4d39f09b4dc-13"` | **Excluded**, including partial/Range acquisition |

All advertise `Accept-Ranges: bytes`; this does not prove Range behavior, authorize a partial download, or justify probing one. ETags are opaque HTTP validators, not publisher SHA-256 hashes. A successful HEAD does not prove a future GET will succeed or establish archive integrity, member alignment or calibration.

## Existing inputs, not new downloads

The proposal binds the encoded bytes of two retained manifests:

- `.local/reconstruction/arkitscenes/45261631/pilot-rgb-six-v1/manifest.json`: `dc64fe061408e30bc81181471f4342d5fdf7d24521f6a36333e03a3e637e3426`. It records six originals, two held-out views, 640×480 source images and a 90-degree clockwise upright normalization. Those are manifest declarations; image bytes were not decoded or rehashed in this pass. The six source timestamps are 56036.835, 56056.860, 56066.856, 56076.886, 56086.915 and 56096.911. No depth timestamp match is yet verified. Preserve held-out views and the original RGB-only input/evaluation separation; never inject supplied depth/poses into that benchmark.
- `.local/reconstruction/arkitscenes/45261631/scan-source-v1/manifest.json`: `fb7ff713a6e0c9310ae20f32c7397377c7ac62a123214179dc2262091bd37a2f`. It retains license, metadata, supplied mesh, annotation, trajectory and two intrinsics archives from the [previous acquisition](teal-bedroom-acquisition-v1.md). No reacquisition or extraction is included here.

The source manifest's encoded-file hash above differs deliberately from its previously reported typed canonical digest. Neither manifest hash proves its referenced payloads are unchanged; later admission must rehash each used file and verify provenance/calibration. Six RGB views may be insufficient for complete photographic coverage. Do not compensate by inventing textures or consuming the held-out views.

## Finite acquisition scope, conditional on approval

- One attempt total; at most one GET per listed asset, in the listed order; at most two GETs. Stop the sequence on the first failure. No retry, resume, mirror, redirect, changed binding or automatic plan refresh.
- Create exactly `.local/reconstruction/arkitscenes/45261631/scan-rgbd-source-v1/` exclusively. An existing root or attempt record stops execution, including after cancellation or failure. No alternate attempt directory is covered.
- Each download has its own newly created empty directory: `depth/` and `confidence/`. Keep reviewed scripts outside downloaded data, use repository cwd and isolated Python `-I`; downloaded material is untrusted. Reject symlinks/junctions and path escapes.
- Bind the exact proposal file hash to the owner decision before network activity. Require the fixed URL, HTTP 200, exact Content-Length and ETag, no content transformation, streamed length enforcement and final exact byte counts; record a local SHA-256 per payload. Fail closed on missing/changed/ambiguous headers, truncation, overrun or interruption. Never load whole archives just to hash them.
- **Body transfer ceiling: 144,833,824 bytes**, including partial bytes, not an allowance for other URLs. **Output disk ceiling: 167,772,160 bytes (160 MiB)** for both archives, partials and bounded receipts; partial-to-final rename must not duplicate payloads. Protocol headers/TLS overhead are not included in the body count.
- Preserve the existing host envelope: one worker; numerical threads 1; 135-second work deadline within the 150-second host ceiling; at most 768 MiB supervisor/worker-tree RSS; at least 2 GiB available host memory; 64 KiB each for stdout/stderr. Retain nominal 50 ms resource sampling and cancellation/owned-process cleanup. These are monitored limits, not hard OS containment; no increase is requested. Slow transfer may consume the sole attempt without finishing.
- Write durable started/per-file/completed/failed journal events. Preserve partial files, completed hashes, bounded errors and resource evidence on rejection/cancellation; write the complete manifest last. No automatic recovery, public route or admission of an incomplete directory.

## Implementation and acceptance gates

Before either GET, implement and test a separate, closed two-asset path that reuses the existing safe transfer, isolation, journal and supervisor mechanisms without weakening the seven-asset contract. Required rejection evidence: wrong capture/URL/path, altered proposal bytes, alternate/reused attempt root, changed or ambiguous headers, redirect before destination contact, overrun/truncation, first-file failure preventing the second request, cancellation/deadline/resource failure and partial retention. Validate disk accounting, streaming hashes and final receipt binding with synthetic fixtures first. Approval of this packet does not imply that this new executor already exists or passed those tests.

Expected successful result: exactly two immutable ZIP payloads with matching frozen lengths/ETags, locally computed SHA-256s, complete acquisition journal/manifest and settled resource evidence. This establishes **acquisition only**, not archive safety, aligned RGB-D, metric accuracy, room coverage, visual readiness or owner quality acceptance.

Excluded even if acquisition is approved: ZIP listing/extraction, raster decoding, registration/calibration/fusion, texture projection, mesh simplification, candidate assembly, display-cap increases, other RGB/depth/laser archives, models/GPU/paid execution, source uploads, frontend edits, publication and commits. Those need their own bounded decision. The supplied mesh remains above display limits; the [inspected visual reference](../revisions/teal-bedroom-textures-v1/REVIEW.md) does not waive data/resource gates. No new reference generation occurred here.

## Implementation verification — 2026-10-22

The new `scan_rgbd_source.py` executor pins the proposal's encoded-file hash, fixed attempt directory and retained metadata hashes. The supervisor now has a fixed `fetch-rgbd` operation. Both acquisition paths reuse the same per-role journal/writer; the seven-asset validator, plan hash and 128 MiB limit remain unchanged. Shared frozen downloads now reject duplicate binding headers and transformed/chunked bodies and bound each read to the remaining approved Content-Length. Disk accounting bounds the exact payloads plus two 64 KiB receipts; no whole-archive allocation or extraction is used.

TDD: ten new tests initially produced 13 expected assertion failures (missing RGB-D route/supervision, permissive duplicate/encoding headers and oversized read requests). After implementation, **43 focused tests passed**, including a full-size synthetic two-archive stream, hashes, isolation, no replay, altered bindings, partial retention, truncation/cancellation and low-disk rejection. The existing redirect test exercises an actual loopback server and verifies the destination is not contacted; supervisor tests use real subprocesses for time/RSS/output limits and cleanup. Synthetic stream fixtures do not establish real server behavior.

Full regressions, with numerical thread environment variables set to 1:

- `python -I -m unittest discover -s scripts/room_workflow -p 'test_*.py'`: **424 run, 419 passed, 5 skipped**.
- `node --test scripts/room_workflow/*.test.mjs integrations/shado/*.test.mjs`: **184 run, 182 passed, 2 skipped**.
- `npm.cmd test`: **103 core + 268 application passed**, no skips.

These are local/synthetic test results, not a calibrated bedroom or visual demo.

### Independent review and execution baseline

One read-only `eva-reviewer` pass used configured alias `opus`, reporting actual model `claude-opus-5-5[1m]`. It found no high-severity code defect. Its medium process finding cited an older pending-decision snapshot. **Ruling:** the live record already contains the owner's exact approval, date, larger ceiling, frozen plan hash and test results (rechecked before GET); no new owner approval is inferred from the reviewer. The frozen JSON pending flags remain historical evidence, not authority.

A direct isolated `python -I scripts/room_workflow/scan_rgbd_source.py --help` exited 0; the fixed attempt directory was confirmed absent immediately before launch. Source-file encoded SHA-256s for this tested/reviewed dirty revision:

| File under `scripts/room_workflow/` | SHA-256 |
| --- | --- |
| `arkit_fetch.py` | `83f715bf3cb9abcc966c797c580832ebedc6d0e51a1dd71fef1fbeac15388a7f` |
| `scan_source.py` | `2abf0bb92b53c15b64aab5e40cdf028d9029f7dadf23b14065468a4b08c31f9f` |
| `scan_rgbd_source.py` | `dd989586d853b631c08d63ea224928eb0f9395aee065a289e372b9f88ca4a157` |
| `cpu_review_worker.py` | `123f1f664be37e40760832ea074a77eac06c3de3eedad6fbb9564131ea302c04` |

Deferred minors: the supervised negative test only distinguishes worker failure, not its exact cause, and uses the real fixed destination (positive CLI startup and absence were separately checked); frozen-header/length rejection uses mocked response objects rather than a real-socket frozen-transfer matrix; payload `.part` files are closed but not fsynced before rename (existing behavior, later byte rehash required). No code fix was needed for the stale process finding. No second review ran. The 135-second deadline can consume the only attempt; sampled monitoring is not hard containment.

## Execution record

Preflight: exact plan hash matched; output directory, resource receipt and shared CPU lock were absent. The installed environment reported 88,177,041,408 free disk bytes and 3,542,614,016 available memory bytes; the supervisor rechecks memory at launch and throughout. The two-archive attempt was authorized; extraction and later processing were not.

Executed once from the repository with the existing `.local/reconstruction/venv/Scripts/python.exe`, Python `-I` and numerical thread variables set to 1:

```text
scripts/room_workflow/cpu_review_worker.py --operation fetch-rgbd --input docs/design/acceptance/teal-bedroom-rgbd-v1.plan.json --output-dir .local/reconstruction/arkitscenes/45261631/scan-rgbd-source-v1 --receipt .local/reconstruction/teal-bedroom-rgbd-v1.resources.json
```

**Result: settled / passed; one attempt consumed.** Total 144,833,824 bytes; 5.609 seconds elapsed; peak supervisor/worker-tree RSS 76,075,008 bytes; minimum available memory 3,001,225,216 bytes. The shared CPU lock was absent after settled cleanup. No retries, redirects, RGB download, ZIP listing/extraction, raster decoding, calibration, mesh processing, model execution, service restart or UI changes occurred.

| Acquired file | Bytes | SHA-256, transfer and independent streaming rehash |
| --- | ---: | --- |
| `depth/lowres_depth.zip` | 139,266,078 | `403a3edc94443e412e2f584e9fee53c695c91f827e8908c91d0669433675069f` |
| `confidence/confidence.zip` | 5,567,746 | `65350d498ccedd09d72b060239aa51b9dcc91c26f582ec33cd3d831d417be208` |

The fixed output directory retains both per-role payloads, `acquisition.jsonl` and `manifest.json`; the resource receipt is under `.local/reconstruction/`. [Byte verification and source fingerprints](teal-bedroom-rgbd-v1.sources.json) record exact payload/header/plan binding, streamed rehash, complete journal order, output-disk bounds, settled resources and unchanged retained metadata. Verification UTC: 2026-10-22T05:23:59.686739+00:00. Manifest encoded-file SHA-256: `891220c930e61fe553e90ad3ec75eabdedf48b2b97fb423b5b4525cbbde20f73`. These are local transfer/integrity hashes, not publisher digests or archive-content safety evidence. Do not rerun the command under this consumed allowance.



## Verification and decision record

Header receipt assertions verify all three successful HEAD observations and the exact two-asset total. Offline packet checks bind all URLs, lengths, ETags and file hashes; confirm the proposed destination is unused, excluded RGB is absent from the acquisition list, and the current seven-asset validator rejects this proposal. Local-link, JSON and whitespace checks apply to the documentation, not application behavior. No application suite or real archive processing was run for this documentation-only pass.

- Owner decision/date: **approved, 2026-10-22**, including the larger packet-specific transfer ceiling; exact plan hash above.
- Execution: **completed once; settled / passed**, with matching byte rehashes. Acquisition allowance consumed; no extraction or calibration performed.
- Next owner exercise after acquisition: review a separately bounded extraction/calibration proposal. Those processing stages remain unapproved.
- Final demo/phase/quality acceptance: **not established by acquisition**.

### Retrospective owner acceptance — 2026-10-22

Owner instruction after the completed acquisition/evidence report: “Continue implementation for decision 2. Approve everything that has been done.” This accepts the completed, disclosed work through decision 1: the bounded executor, recorded tests/review limitations, two acquired archives and byte/resource evidence. It also accepts the previously reported acquisition/inspection and inspected visual reference as those bounded deliverables. It does not turn supplied assets into calibrated reconstruction evidence, certify an unimplemented viewer, or erase deferred findings. Decision 2 (bounded local extraction and RGB-D calibration checks) is now authorized separately; later mesh reduction, candidate processing, model spending and publication remain outside that instruction.
