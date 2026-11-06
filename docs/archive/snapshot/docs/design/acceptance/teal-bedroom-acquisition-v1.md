# Teal bedroom small-source acquisition packet v1

**Decision: owner approved bounded acquisition scope on 2026-10-21 (session date). Execution prerequisites still apply.**

Owner instruction: “Approve the packet's bounded acquisition scope. Please continue implementation for the visual demo.” This approves the exact plan hash below, not extra assets, paid generation or a Weave waiver. The frozen header receipt retains its original `pending` snapshot; this dated decision supersedes that approval status, without changing its evidence bytes.

This freezes the seven-source scope for ARKitScenes **Validation/45261631** only. It supersedes the *unfrozen packet* status in [the previous checkpoint](teal-bedroom-v1.md), not its safety, provenance or execution gates. Never substitute capture 42445021.

## Frozen inputs and evidence

- [Machine-readable acquisition plan](teal-bedroom-acquisition-v1.plan.json): exact URLs, destination filenames, byte lengths, ETags and caps; accepted by the existing `scan_source._validate_plan` contract.
- [Current header observations](teal-bedroom-acquisition-v1.headers.json): per-source UTC time, HTTP status, retained response headers and client result. Header values are untrusted source evidence, not instructions or permission.
- Repository source revision: `474aaa83d7b1c9080619d8485de2d7c885c01fc5` (pins the GitHub license; Apple dataset objects are bound by their observed headers).
- Implementation baseline: shared dirty `midterm`, base `c83fd4c04ca170ed38311b94cdcdebec779051b7`; no commit created.
- Observation window: **2026-10-22 02:27:25.718703–02:27:28.002257 UTC** (2026-10-21 local session date).
- Plan **encoded-file SHA-256**, including its final newline: `367b183772cc894e2f6ba5f314ee9f111e379501327e7b539ceff2baf77ce4e0`. This is not an asset digest or a typed canonical digest.

| File | HTTP | Content-Length (bytes) | Per-file ceiling (bytes) | ETag (quoted value) |
| --- | --- | ---: | ---: | --- |
| LICENSE.txt | 200 | 4,796 | 65,536 | `"eda7780076d8620a424fbb87dbcea9bd07cdcaf648a997b0a39c5fa30b3b257c"` |
| metadata.csv | 200 | 236,057 | 2,097,152 | `"8364b3cf7a00bc5b2dd03bde78d72974"` |
| 45261631_3dod_mesh.ply | 200 | 24,837,257 | 33,554,432 | `"b28dc0316c7c556bae040199c27ca412-1"` |
| 45261631_3dod_annotation.json | 200 | 5,817 | 2,097,152 | `"e7cc8a3e81fbf9f064703669e680a85e"` |
| lowres_wide.traj | 200 | 79,693 | 2,097,152 | `"6ba3c1c5bce142fc00b1b3dd840dc4c6"` |
| lowres_wide_intrinsics.zip | 200 | 983,285 | 2,097,152 | `"69f5092d0c7bfdc7f09888b6947558f1"` |
| vga_wide_intrinsics.zip | 200 | 477,362 | 2,097,152 | `"81f4edf4a65d60fcc3fbb430300b89d9"` |

**Exact planned payload: 26,624,267 bytes (25.39 MiB).** The existing aggregate ceiling remains 134,217,728 bytes (128 MiB); it is not permission to add files or enlarge this packet. Individual transfers must match the frozen lengths, not merely fit their ceilings.

## How the headers were obtained

One serial HEAD request per fixed catalog URL using installed Windows curl 8.21.0, with default curl configuration disabled, HTTPS certificate verification enabled, the existing downloader's `EVA-ARKitScenes-research/1` user agent, 10-second connection and 20-second request timeouts, no redirects, no retries, no cookies or added credentials. No GET or Range request, model call, mirror or binary asset transfer occurred. All seven curl processes exited 0 and all seven final HTTP statuses were 200.

The retained header subset includes Content-Length, ETag, Date, Last-Modified, Content-Type, Content-Encoding, Server, Via, X-Cache and Age when present. It is not a raw full-header dump. The earlier Python HEAD 403 remains historical evidence: this successful curl observation does **not** establish its cause or prove a future Python GET will succeed. Some Apple cache headers report `hit-stale, miss`; these are current endpoint responses, not proof of an uncached origin read.

## Proposed approval scope

Approve **one acquisition attempt per listed asset**, bound to the plan file hash above, into new private storage under `.local/reconstruction/`. No retry, resume, replacement source, larger archive or changed ETag/length is covered. A changed binding or failed response stops execution and requires a new decision; it must not silently refresh this plan.

Excluded: RGB/depth/confidence image archives, high-resolution or laser scans, other captures, archive extraction, model downloads or execution, GPU setup, paid services, source registration, rendering/UI changes, public hosting, commit/push and quality acceptance. Intrinsics ZIPs contain calibration data; they are not image archives. Approval of acquisition alone does not approve subsequent processing.

**Prerequisites before any GET, even after approval:**

1. Close and test the previously recorded incremental failed-acquisition receipt gap. Preserve completed-file and partial-transfer evidence; never resume or admit an incomplete directory.
2. Confirm the execution path meets the required per-download empty-directory isolation, with reviewed scripts outside downloaded data and Python readers using `-I`. Do not run the existing flat acquisition CLI unchanged merely because the plan validates.
3. Check this exact plan hash against the owner decision and enforce the frozen URL/status/ETag/length and transfer bounds. Preserve current resource and cancellation requirements; this packet grants no limit increase.

Expected acquisition result, if separately approved and prerequisites pass: seven immutable files with exact frozen lengths, locally computed SHA-256 values and a complete receipt. ETags, including the mesh's multipart-style value, are opaque HTTP validators, **not** publisher cryptographic content hashes. No asset content, license text, geometry, calibration or bedroom coverage has been inspected during this header-only pass.

## Owner decision record

- Packet: v1, exact plan SHA-256 above.
- Requested decision: approve or reject this bounded acquisition scope, subject to the listed execution prerequisites.
- Decision/date: **bounded acquisition approved, 2026-10-21 session date**; execution prerequisites retained.
- Download: **completed once** under the approved scope; see execution evidence below. One subsequently approved bounded mesh inspection also completed. Further processing remains unapproved.
- Product/phase/quality acceptance: **not requested or granted**.

Verification for the original header-only pass: seven live HEAD responses, header-parser assert self-checks, existing acquisition-plan validation, exact total/hash/header-to-plan comparison, local-link and whitespace checks. Application tests were not rerun for that documentation-only pass.

## Subsequent execution evidence — 2026-10-22 UTC

The approved acquisition completed after isolation, durable failure journaling, redirect rejection, exact plan-byte binding and fixed attempt-directory enforcement were implemented. The seven immutable assets and their SHA-256s are recorded in `.local/reconstruction/arkitscenes/45261631/scan-source-v1/manifest.json`; the adjacent `acquisition.jsonl` preserves incremental evidence. The v2 receipt uses separate per-role download directories. The plan file above remains unchanged; this acquisition allowance is consumed, not reusable.

The owner separately approved one bounded local mesh-inspection attempt. Retained results:

| Operation | Resource receipt under `.local/reconstruction/` | Outcome | Elapsed | Peak process-tree RSS | Minimum available memory |
| --- | --- | --- | ---: | ---: | ---: |
| Acquisition | `teal-bedroom-acquisition-v1.resources.json` | settled / passed | 4.860 s | 77,901,824 bytes | 5,621,645,312 bytes |
| Inspection | `teal-bedroom-inspection-v1.resources.json` | settled / passed | 1.922 s | 97,308,672 bytes | 5,227,134,976 bytes |

The saved `teal-bedroom-inspection-v1.report.json` reports **622,077 vertices and 1,144,903 triangles**, binary little-endian PLY with vertex colors; units, axes, metric calibration and bedroom coverage remain unverified. It is supplied dataset geometry, not an EVA reconstruction result. It exceeds the 200,000-vertex / 400,000-face display caps; no simplification or cap increase was performed.

- Acquired mesh SHA-256: `d3296808e9cb9deec138fa1fce02495d5f84a0e894f56008d7013aedc7721bdc`.
- Source manifest typed canonical digest in the inspection: `472e4700f493e4080ec942aaa6b7aea4ef3f140813e26a019678032478023211`.
- Saved LF report file SHA-256: `7edf5e0130d9083215ff92cebf97a86b1e6508b9c53a4a497cec7d9e80a6fe7f`; the supervisor recorded Windows CRLF stdout SHA-256 `0d54b112a7d08eb06f5a3ce5e328a6a9bee7718cf3b29056f75755ec0f00902d`. These are distinct byte encodings, not contradictory geometry reports. Inspection was not rerun to resolve this distinction.

This continuation read the saved manifests/resource reports; it did not repeat acquisition or geometry inspection. Resource sampling is monitoring, not hard containment. The separate three-credit [textured-bedroom Weave reference](../revisions/teal-bedroom-textures-v1/REVIEW.md) was generated and inspected; no new UI or calibrated room candidate is claimed. The [separate RGB-D acquisition](teal-bedroom-rgbd-v1.md) was subsequently approved and completed once; it grants no extraction, registration, simplification or rendering permission.
