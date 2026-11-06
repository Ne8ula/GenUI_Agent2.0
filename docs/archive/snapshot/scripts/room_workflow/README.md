# Private single-room upload candidate

Implementation candidate, 2026-10-20. This is a local development intake plus a deployed bounded VGGT worker and an undeployed Shado bridge candidate. It is **not an end-to-end validated photo reconstruction service**.

The owner-selected [ARKitScenes pilot](../../docs/research/ARKITSCENES_PILOT.md) now has a downloaded and inspected room, seven normalized photo inputs, seven withheld views, four successful bounded VGGT calls, full estimated depth fields and two CPU-fused one-room candidates. The third call used the deployed upload worker; the fourth tested a separate broader-view RGB selection. The original remains the default; `?scene=arkitscenes-room&profile=vga-visual-v1` opens the exploratory alternative. RealSee3D is excluded. Use `arkit_fetch.py`, `arkitscenes.py` and `pilot.py` for reproducible dataset preparation and explicitly authorized execution; these commands do not bypass the later boundary review or required Shado comparison.

## Run locally

From the EVA repository, in two terminals:

```powershell
npm.cmd run room:service
npm.cmd run dev
```

For the installed research adapters, start the service terminal with these explicit executables:

```powershell
$env:EVA_ROOM_PYTHON = (Resolve-Path .local/reconstruction/genrc-client/Scripts/python.exe).Path
$env:EVA_ROOM_COMPLETION_PYTHON = (Resolve-Path .local/reconstruction/venv/Scripts/python.exe).Path
npm.cmd run room:service
```

The first enables the Modal client; exact per-job cloud grants still apply. The second enables **Complete photo-based room locally** after boundary confirmation. It fuses the saved estimated depths on CPU and adds separately labeled boundary closures, without another model call. This artifact remains distinct from the pending Shado A/B result. These project-local environments were installed for the bounded research pass; the commands are not a general dependency-installation recipe.

Open <http://127.0.0.1:1440/?scene=upload-room>. Select 5–7 JPEG/PNG images, describe approximate area, and prepare the room. Photos are stored under the ignored `.local/room-workflow/`, never under public assets. The loopback broker uses a private session cookie, CSRF checks, job ownership, bounded image sets and a five-copy limit per session. This is not production authentication or encrypted storage.

Temporary copies expire after 24 hours; explicit saved copies after 30 days. Reopen from the same browser/session. Expiry cleanup runs each minute while the broker runs and on restart. Unresolved remote work retains local recovery records until resolved. Provider storage/deletion is separate; no provider-retention guarantee is made.

The saved actual pilot is at <http://127.0.0.1:1440/?scene=arkitscenes-room>. Its fixed private artifacts are validated by the broker and viewing incurs no cloud charge. See [run evidence](../../docs/research/ARKITSCENES_PILOT.md).

## Stages and evidence

1. Original photo intake; user-reported area remains an approximate annotation.
2. A bounded VGGT cloud analysis returns estimated cameras, depth-derived geometry and a proposed relative-coordinate outline.
3. The owner corrects and confirms the polygon and height. The initial axes use a camera-up heuristic, not a measured floor. Optional door/window rectangles become visibly authored closures. A simple polygon prevents adjoining-room expansion; it does not automatically recognize the right room.
4. **Authorize in Shado** opens its authenticated bridge page. A one-time nonce and exact origin bind the returned authorization to this photo set and task. Shado displays the actual quote, fixed one-room recipe and cap consent. No credentials appear in a URL.
5. **Continue with authorized Shado task** transfers originals and requests one actual video. Existing task IDs recover uncertain submissions; no replacement generation is automatic.
6. A second bounded cloud request reconstructs A from the originals and B from originals plus sampled Shado frames using the same estimator/configuration. B is aligned using original-view correspondences. A review hash must match the rerun before the boundary can be reused.
7. Inspect surfaces, uniformly sampled points, edges and provenance. Raw estimates remain separate from bounded meshes with authored envelopes. All B estimates are conservatively generated-influenced. No metric-ground-truth or trained-3DGS claim is made.

One short video is not a guaranteed 360-degree scan. A failed B must remain visible as failed/partial; it must not be replaced with a mock or omitted from evaluation.

## Cloud execution and deployment

`cloud.py` requires full immutable source/checkpoint revisions and fails closed if missing. A researched, **noncommercial research-only** VGGT profile is in [research-profile.json](research-profile.json). The original weights have CC-BY-NC-4.0 terms; a commercial product needs separately reviewed eligible weights/access. The official repository distinguishes [original and commercial checkpoints](https://github.com/facebookresearch/vggt#updates).

The image candidate has pinned dependencies in `requirements-cloud.txt`, A100-40GB, 4 CPUs, 32 GiB RAM, 600-second function timeout, one container, zero configured retries. Image builds and startup are separate from the function timeout. Model acquisition currently happens inside `execute()` and consumes that timeout; there is no persistent model-cache volume. A cold container may reacquire the checkpoint. The first approved ARKitScenes image build succeeded, but function creation failed on a client/image Python serialization mismatch before any GPU call. The corrected module-level worker passed two real ephemeral Modal calls, including pinned weight acquisition and GPU inference. The same pinned worker is now deployed as private Modal function `eva-room-workflow/run`, with zero minimum containers; lookup and zero-task idle state were verified. An actual seven-public-photo upload through that persistent deployment completed; its original browser harness exited early and the existing result was recovered without another call. Full provider retention and cost readiness are prerequisites to private-photo activation.

For the verified deployment, the operator sets `EVA_ROOM_PYTHON` to a reviewed Python executable with Modal access. The broker computes the request hash and pauses. A local operator grant in `run-approvals.json` must match that exact request:

```json
[{
  "jobId": "the-local-job-uuid",
  "operation": "analyze",
  "requestSha256": "the-64-character-hash-shown-in-the-job",
  "expiresAt": 0,
  "maxSeconds": 600,
  "used": false
}]
```

This example is intentionally expired. A grant is consumed before launch. `reconstruct` requires its own grant. Only the fixed deployed 600-second bound is accepted; a shorter local client timeout would not bound remote GPU use. This file is an operator mechanism, not a production billing authorization API.

The client reserves `<job>-<operation>-request.receipt.json` before submission. A lost acknowledgement is uncertain and cannot be blindly replayed. Cancel asks Modal to terminate the existing receipt-bound call; a request is not proof of remote termination. Unknown outcomes retain recovery records. Successful late output is discarded after cancellation.

If the local helper fails to start or exits without creating a reservation, the broker clears submission intent and permits a fresh allowance or local deletion. The consumed allowance is not refunded or retried automatically. Any existing reservation, including one without a call ID, remains unresolved.

The standalone client waits at most 630 seconds for the existing call, below the broker's 660-second outer deadline. A timeout or interruption requests cancellation of that same call and preserves its receipt; it does not spawn a replacement or claim confirmed termination. Existing definitive receipts and recovered output files are protected from overwriting. These are operational lifecycle bounds, not a provider-enforced dollar cap; infrastructure restart can occur independently of configured input retries.

Before consuming an allowance, the broker runs `image_preflight.py` in the configured CPU environment. It fully decodes the originals, checks static JPEG/PNG dimensions and byte limits, applies EXIF orientation for validation, and rejects identical normalized pixels even when metadata differs. The exact original request remains unchanged. A failed or cancelled check does not launch a model or consume the allowance. This is image admission, not automatic verification that the photographs cover one room.

After an interrupted submission, **Check existing cloud call** uses the preserved exact request and receipt to read the existing Modal call only. It accepts no browser-supplied path or call ID, consumes no new allowance and never submits a replacement. Pending, unavailable and conclusively returned results remain distinct. Cancellation discards late geometry and retains only small outcome/binding records. A legacy job whose exact request is missing remains unresolved; the broker does not regenerate that evidence. A real read-only retrieval of the fourth pilot call returned exactly its saved result; interrupted-job UI scenarios use separately labeled synthetic fixtures.

## Shado activation, not yet deployed

The active integration is [eva-room-bridge-v2.patch](../../integrations/shado/eva-room-bridge-v2.patch), based on Shado `e9dca6c0fe334162392d1a3c5681067846ab04d6`, plus a separate [Windows build compatibility patch](../../integrations/shado/shado-windows-build-compat.patch). Apply v2 instead of the retained v1 patch. Its isolated source is `.local/worktrees/shado-bridge/`. The owner's Shado main checkout has not been modified. The EVA broker uses the v2 client: upload authorization precedes sealed-input quotation; generation requires a separate exact-quote grant; recovery only observes/stops an existing task.

Apply/review in Shado with its own checks before deployment. Configure a dedicated bridge signing secret and exact `SHADO_EVA_ALLOWED_ORIGIN=http://127.0.0.1:1440`, plus Shado's existing authenticated provider/billing environment. Set EVA's `EVA_SHADO_ORIGIN` to the exact deployed HTTPS Shado origin, without a trailing slash. Authorization is performed by the user's Shado session, not an operator-owned substitute identity. Expired grants must be renewed for the same task.

Restart and expired-authorization states expose renewal for that same frozen task. Verified sealed originals and the bound quote are retained; authorization renewal does not silently replay upload or generation. An interrupted result check becomes explicitly available to check again after restart.

New room requests namespace media IDs by job; renewal preserves previously frozen IDs. A definite submission rejection clears submission intent and requires fresh authorization, allowing local deletion. Lost acknowledgements, server-side uncertainty and a failed stop after acknowledged submission retain the existing task for recovery.

The isolated locked dependency installation, full Shado typecheck and production build passed. The built unconfigured service returned explicit configuration errors and rejected unauthenticated requests. Portable protocol tests and a mocked-provider browser exercise passed; neither establishes real Clerk/account/provider readiness. See [exact evidence and remaining checks](../../integrations/shado/V2_STATUS.md).

## Known unfinished work

The separate [automatic object suggestion pilot](../../docs/research/OBJECT_SUGGESTIONS_PILOT.md) implements Grounding DINO-to-SAM 2 prompts, source-linked masks and CPU lifting/association. It is an offline-tested operator CLI, not a deployed upload feature or full-shape completion. Model execution needs its own reviewed plan and allowance. Existing `inference.py` and deployed VGGT fingerprints are unchanged.

- Before another paid upload exercise, resolve the remaining review findings: serialize allowance admission and Shado completion against cancellation; retain returned-but-invalid detector output as quarantined evidence instead of treating it as an unfinished call. Existing source-based detector fingerprints also need a compatibility strategy before editing shared model files.
- Viewer review still needs fixes for opening-edge indices after polygon topology edits, per-job view-state reset and camera continuity when toggling candidates. The saved-copy browser harness also references a removed caption.
- Shado deployment/account authorization and an actual A/B room run. Actual model acquisition, GPU inference and a persistent-worker public-photo upload succeeded; private-photo provider retention remains unverified.
- CPU TSDF fusion of full estimated depths runs in `complete_candidate.py` and through the broker's separate local-completion stage. Bounded bundle-adjustment code exists, but the original seven images failed its SIFT connectivity/support gate, so no fitted refinement is claimed.
- SAM2 prompt/mask processing exists in the worker but is not yet exposed through the upload UI/broker. It has not run.
- ArUco detection is optional when real tags are present. No measured tag size/calibration is requested, so detections do not establish metric scale.
- Automatic floor/wall fitting is provisional. An independent reference-depth diagnostic has run; global pose/fusion accuracy, casual-photo transfer and provider retention remain unverified.
- Final point appearance must be judged on actual reconstructed rooms. Synthetic sampling tests do not establish parity with the first Hypersim pass.

## Offline idealized candidate

The separate `idealized_room.py` CPU CLI assembles an explicit inventory into complete procedural table/chair/sofa/cabinet/bed parts and a reviewed-frame room shell. It never copies the fragmented reconstruction into that mesh, calls a model, or infers room/inventory approval. Inputs come from the source-bound loader plus explicit inventory decisions; synthetic fixtures are tests only, not a real-room fallback.

```powershell
& ".local/reconstruction/venv/Scripts/python.exe" -X utf8 scripts/room_workflow/idealized_room.py --input <private-bound-packet.json> --output <new-private-candidate-directory>
```

The parent directory must exist and the candidate directory must not. Output is `candidate.json` plus a hash-bound `manifest.json`, published locally only after the candidate has been flushed. Failed writes retain partial files and cannot be reopened as complete. `read_candidate(directory, expected)` requires the host's exact `{job_id, bindings, parent_revision, boundary, openings, inventory}` snapshot. Save and reopen regenerate the shell, complete templates, face ownership and placement checks, so changing a file and recomputing its checksum cannot relabel or move geometry. The structural Python/Node validators alone are **not** full geometry admission; future broker/benchmark readers must also pass the Python reopen gate. CLI status remains `needs-review`; a valid manifest does not grant readiness or quality acceptance.

The subprocess bridge in `idealized-adapter.mjs` runs assembly and then this same Python reopen check before Node structural admission. It retains exclusive assembly requests and partial/rejected outputs, bounds runtime and stdout, and cancels only its owned process tree. The private broker and fixed benchmark reader reuse this bridge. Read-only CLI admission accepts the trusted expected-binding JSON, not a worker-chosen review flag:

```powershell
& ".local/reconstruction/venv/Scripts/python.exe" -X utf8 scripts/room_workflow/idealized_room.py --input <host-expected-binding.json> --verify <private-candidate-directory>
```

Successful verification still reports `needs-review`. Recomputed checksums cannot admit geometry that disagrees with the procedural templates. A failed check does not rewrite the candidate.

`idealized_fit.py` provides conservative support fitting and camera/mask silhouette diagnostics; missing/occluded evidence remains unresolved. `assemble` preserves the supplied inventory parameters rather than silently refitting owner corrections. Whole-object containment, part-level collision and floor-gap failures reject assembly.

### Fit retained evidence offline

`idealized_sources.py` connects the admitted WorldMirror camera-Z estimates, saved similarity transform, source masks and candidate-frame cameras to that fitter. It reads existing files only; no model, network, GPU or dataset depth/pose input is used. Padding is excluded from comparison, the object's mask is excluded from estimated occluders, and selected masks from the same image are scored as one union. These are conditioning-view diagnostics, not independent reconstruction accuracy.

```powershell
& ".local/reconstruction/venv/Scripts/python.exe" -X utf8 scripts/room_workflow/idealized_sources.py --result <saved-analysis.json> --request <saved-request.json> --raw-directory <retained-worldmirror-directory> --candidate-directory <saved-worldmirror-candidate-directory> --suggestions <saved-suggestions.json> --review <candidate-frame-review.json> --inventory <bound-inventory-selection.json> --output <new-private-candidate-directory>
```

The review uses the loader's exact `{version: 1, coordinate_frame: "worldmirror-candidate", analysis_binding, candidate_report_sha256, suggestions_sha256, boundary, openings}` format. The selection requires exactly `{job_id, bindings, boundary, openings, inventory, parent_revision}`: copy the first four values from `load_idealization_inputs(...)` after reviewing the saved frame; use `null` for an initial parent revision. `inventory` contains explicit [ObjectSpecs](idealized-room.schema.json), not the loader's tentative region proposals. Categories, initial proportions and observation grouping must be supplied explicitly; this command does not invent or approve inventory. Owner-set pose/dimensions/colors remain unchanged. A `masked-source` palette is derived as the component-wise median of the selected observations' masked support colors; absent support requires an explicit owner color instead. Omitted objects and owner-authored additions are not fitted. Empty inventory produces only the shell. Unknown observations, stale bindings and authority fields reject.

The output uses the same exclusive candidate/manifest persistence and Python reopen gate described above, with fitting diagnostics and unresolved source reasons retained. CLI status is always `needs-review`. Snapshot the **fitted** inventory for later reopen admission; the input selection is not the post-fit snapshot. Do not feed already-fitted non-owner dimensions back into the search: it rejects that case to prevent repeated size growth. Apply corrections through assembly, or explicitly confirm dimensions as owner-set before refitting pose. Insufficient support retains `pose-unfitted`/`dimensions-unfitted` review reasons for non-owner placeholders. Parent revisions in this standalone CLI are operator declarations, not verified ancestry; the private broker instead validates them against its stored history. The default loader still returns plain JSON-compatible data; `with_fitting_views=True` adds NumPy runtime rasters for fitting only, never for serialization.

### Preview automatic retained inventory

`idealized_prepare.py --draft-only` uses the same retained-source admission and saved coordinate transform to propose an initial inventory without manual object marking. Supply a fresh imported source snapshot and a review JSON containing exactly `{boundary, openings}` in the candidate frame; the boundary remains unconfirmed. This is a separate **preview**, not a candidate or review record:

```powershell
& ".local/reconstruction/venv/Scripts/python.exe" -X utf8 scripts/room_workflow/idealized_prepare.py --draft-only --result <saved-analysis.json> --request <saved-request.json> --raw-directory <retained-worldmirror-directory> --candidate-directory <saved-worldmirror-candidate-directory> --suggestions <saved-suggestions.json> --source-snapshot <private-imported-source.json> --review <private-room-draft.json> --output <new-private-draft-ledger.json>
```

The output file and its sibling binding file must not already exist; their parent must exist. Keep both private. Every source observation is retained exactly once in the draft ledger. Supported, unambiguous multi-view groups with finite positive visible extents get numeric proposals; `desk` maps to `table` while retaining its original label. Colors come from masked support, including black. Visible bounds, floor-supported height and zero yaw are unconfirmed starting priors, not measured full dimensions or fitted poses. Unsupported, ambiguous, single-view, ungrouped, outside-room and missing-size/support observations stay unresolved instead of disappearing or acquiring fallback furniture. The preview does not render geometry, fit objects, call models, assemble a room or write a candidate manifest. Its revision binds the source hash, frame, room, proposed inventory and unresolved drafts; it always reports `needs-review`.

This CLI does **not** feed the broker's ready path. Per-draft resolution/omission and exact broker/sidecar decision binding remain required integration work. Do not strip the ledger and treat its inventory as an approved automatic result. Existing explicit `inventory: []` behavior stays unchanged. Owner-authored additions still use the existing `add` correction, never invented detection support.

### Private lifecycle and read-only benchmark admission

The broker now supports the retained-room backend through authenticated, owner-bound routes. This is CPU reconstruction post-processing, not a new model call. The existing `EVA_ROOM_COMPLETION_PYTHON` environment selects the CPU executable. Do not restart the memory-stopped application server without owner instruction.

- `GET /api/room-workflow/idealization-source` discovers the one retained source before import. It requires a session and same-origin inspection, accepts no query selectors or writes, and revalidates the source on every request under the existing intake lock, serializing discovery with imports. The response contains only the source key/hash, original photo IDs/hashes and existing photo URLs, the named Z-up relative frame, and the explicitly unconfirmed boundary/openings. It returns no local paths, image bytes, masks, numerical rasters or review authority, and launches no fitting worker. Unavailable/rejected source data returns a generic 503; no fallback is selected.
- `POST /api/room-workflow/jobs/import-idealization` takes exactly `{source: "retained-seven-photo-room", expected_source_sha256}`. Paths are fixed by the host. It snapshots the admitted originals, analysis, separate WorldMirror evidence, exact suggestions-file SHA and observation references into a new private working copy; model, paid and Shado actions are disabled on that copy. Preparation checks the frozen suggestions bytes; both broker and benchmark check registration, mask references and the composed coordinate frame. Older snapshots without this binding fail closed and require a fresh import, not an inferred migration.
- `GET /api/room-workflow/jobs/<id>/idealization` reopens through Python regeneration and returns the loaded candidate, revision and unresolved reasons. Pending CPU cleanup instead returns `candidate: null`, `cleanup_pending: true` and retained revision IDs without launching another verifier. Generic job listings omit the private candidate and source snapshot.
- `POST` to that same path takes `action` and `expected_revision`, plus only the action's fields: `prepare` uses explicit `boundary`, `openings`, `inventory`; `correct` uses `correction`; `undo` uses a retained `revision`; `cancel` has no additional fields. Preparation binds existing source masks/cameras/depth and fits the explicit inventory. Room correction is `{action: "room", boundary, openings}`; object corrections use the existing Python semantics.
- `review` additionally requires `candidate_revision`, `source_sha256`, `boundary_sha256`, `inventory_sha256`, and exact `decisions: {boundary: true, inventory: true, review_reasons: [...]}` matching the current response. The broker adds session ownership/time and alone sets `ready`. That means exact artifact/input review, **not owner quality acceptance**.

All mutations require session/CSRF/origin checks. Stale revisions reject. Correction invalidates confirmation, preserves prior candidates and clears old source-fit residuals without silently refitting; inventory review reasons survive and placement diagnostics regenerate. Each working copy allows at most 32 attempts, failed attempts included. Interrupted/unconfirmed cleanup blocks retries and deletion; expiry aborts and waits for owned work before removing private files, without traversing directory links. Recovery records remain when termination is uncertain. An unsafe expired directory retains its job with `cleanupError`; that job's removal failure does not prevent another job from being listed/imported.

The original and `worldmirror-v1` benchmark JSON responses may expose a separate `idealization` field from the fixed private `.local/reconstruction/arkitscenes/42445021/idealized-room-v1/` directory. They never replace model arms, original bytes or photo URLs; `vga-visual-v1` cannot use this sidecar. Benchmark HTTP remains GET-only. No real sidecar has been created or exported by this implementation.

An operator-frozen `review.json` beside the candidate/manifest must contain exactly `{version: 1, expected, fit_diagnostics, review}`. `expected` is the host-owned six-field binding described above; `fit_diagnostics` comes from that revision's trusted preparation envelope; `review` is the matching broker review record, including its owner and timestamp. Do not construct these values from unreviewed worker output or treat a synthetic test record as actual approval. There is no automatic benchmark export or HTTP path selector.

Each benchmark JSON request independently validates that record, current ordered originals/model/source digest, exact room/inventory/reasons and Python-regenerated geometry, then rechecks source/review stability. Private review metadata is not returned. Missing/rejected sidecars leave raw evidence available; rejected admission returns `idealizationError`. One verifier runs at a time; concurrent inspection returns evidence plus a busy error rather than launching another process. Unconfirmed termination latches further verification off for that process and retains the request: the operator must confirm cleanup **before** restarting, not retry blindly.

Synthetic CPU subprocess, source-preparation/HTTP integration, correction/reopen, rejection/race and directory-junction tests have run. Shared viewer controls, automatic initial inventory selection, actual room review and quality acceptance remain pending. UI work still requires its fresh approved Weave packet; no browser/native/real-room evidence or new paid allowance is implied.

### Operator recovery after uncertain CPU termination

There is no HTTP cleanup reset and no reliable persisted process identity across restart. A timeout, stopped broker, absent parent PID or successful `taskkill` request alone is not proof that all owned descendants stopped. Do not clear the latch or relaunch verification based on a model/worker assertion.

1. With owner authorization, stop the affected broker and keep it stopped during inspection. Establish termination of its exact owned process tree using independent OS evidence and retained launch records. Do not kill unrelated Python/Node processes. If process ownership cannot be established, leave recovery blocked; an owner-controlled host restart is an alternative, not an automatically authorized action.
2. Once termination is established, preserve a private backup of the affected job JSON, its idealization directory, sibling verification requests and partial/rejected outputs. Keep the backup outside the broker's expiry root and out of public evidence. Record job ID, inspection time, termination evidence and backup location in a private operator note. Expired jobs become eligible for removal once their latch is cleared.
3. Only then, while the broker remains stopped, an operator may change that job's `idealization.cleanup_pending` to `false`, set `idealization.status` to `failed`, and remove `idealization.review`. Do not change source bindings, revision IDs, history, attempts, ownership or expiry; do not set `ready` or erase partial requests. This manual repair trusts the operator's OS verification, not JSON self-attestation. For the process-only benchmark latch, no review-file edit is needed; restart only after the same cleanup verification.
4. Restart only when authorized. A retained candidate still requires Python geometry/source admission. Retry an allowed correction/undo (or first preparation when no revision exists), then perform a fresh exact review; recovery itself grants neither review nor model authority. Preserve the failed attempt. An expired copy may be removed by normal expiry, so use the backup for inspection and a fresh source import for new work.

This is an inspection procedure, not a tested automatic recovery tool. For a retained `cleanupError`, inspect unexpected entries/links without following or recursively deleting their targets; keep the job blocked until the operator resolves that specific filesystem condition.

## Offline scan-assisted bedroom candidate

`scan_room.py` continues the separate **45261631** scan-assisted implementation. It does not admit real source bytes, register sensors, fetch assets or expose a benchmark/HTTP route. Only synthetic fixtures have exercised this path; [checkpoint and remaining gates](../../docs/design/acceptance/teal-bedroom-v1.md).

```powershell
& ".local/reconstruction/venv/Scripts/python.exe" -I -X utf8 scripts/room_workflow/scan_room.py --input <private-host-decoded-recipe.json> --output <new-private-directory>
& ".local/reconstruction/venv/Scripts/python.exe" -I -X utf8 scripts/room_workflow/scan_room.py --input <host-expected-binding.json> --verify <saved-private-directory>
& ".local/reconstruction/venv/Scripts/python.exe" -I -X utf8 scripts/room_workflow/scan_room.py --input <private-correction-packet.json> --correct <new-private-directory>
```

The closed recipe is `{source, review, objects, parent_revision, transforms}`. `source` is the scan contract; `review` is exact inventory resolution; `objects` is `{mesh_asset_id, geometry: {positions, colors, indices}, boundary}`. Start with `parent_revision: null` and `transforms: {}`. Actual geometry and observations must eventually be verified against the source bytes by the host; a self-sealed recipe cannot establish that provenance.

Persistence writes `candidate.json`, `recipe.json`, then the commit `manifest.json`, exclusively into a new directory whose parent already exists. Candidate plus recipe share the 64 MiB ceiling with 1 KiB reserved for the manifest. No overwrite/resume of partial attempts. Reopening requires the host's exact `{source_sha256, frame_sha256, parent_revision, inventory_sha256, review_sha256, revision, recipe_sha256}`. The last value is the typed `idealized_contract.digest(recipe)`, not the encoded-file SHA in the storage manifest. Every reopen regenerates geometry, ownership, transforms and diagnostics; incompatible implementation revisions reject instead of silently migrating.

A correction packet contains exactly `{candidate, recipe, correction, expected_revision}`. Supported corrections use `{action, object_id, reason}` with `omit`, `restore` or `unresolved`; `transform` additionally requires a 4×4 positive-uniform-scale rigid transform. It is absolute about the candidate-frame origin, not repeatedly accumulated or hierarchical. Moving a parent does not move its child; contact needs separate review. Geometry already contains the placement: a later renderer must not apply `objects[].transform` again. Placement splits shared vertices so neighboring objects do not move. Omit/unresolved clears that object's placement in the new recipe; restore returns its raw source faces at the source pose. The earlier placement remains only in the immutable preceding candidate. All corrections yield a new parent-linked needs-review candidate and recipe; undo reads an earlier immutable candidate with its matching external binding, never reviving host permission. Standalone ancestry is not host history validation. With transforms, `review_sha256` binds both the inventory review and the transforms, not just the original inventory-review revision.

Exact replay requires the same implementation and compatible numeric environment. New code/schema revisions or floating-point differences can reject old files; no migration or cross-machine compatibility is implemented. The bounded continuation measured a near-shape-cap candidate failing at the deadline during assembly and a smaller candidate completing save/reopen; see the checkpoint. Maximum candidate-plus-recipe capacity is still not established, so the 200k-vertex/400k-face shape caps do not promise that a candidate of that size will fit. Before real candidate processing, profile/optimize under the same bounds or obtain a separate heavier-processing plan; do not lift limits or reduce geometry silently.

Textures, split/merge, admitted replacement, owner additions, collision/support grading and private lifecycle integration remain pending. Whole-face room containment is checked; acceptance of intended contact does not establish absence of object intersections. Do not connect these helpers to a ready/public route before source admission and host review gates are implemented.

### Bounded private scan verification

`scan-assisted.mjs` exports `readScanCandidate(directory, expected, options)`. The caller owns the private root (default `.local/reconstruction`), exact binding, Python executable, cancellation signal and process-tree termination callback. These are developer/host inputs, never browser-selected paths. The function rejects outside-root, linked and multiply linked files; checks the combined storage budget; serializes verification; invokes isolated Python recipe replay; then checks unchanged files and the full typed candidate revision. A returned candidate grants no readiness or source-byte/metric admission.

`cpu-review-worker.mjs` holds the existing invocation once; old idealization callers retain their prior report/deadline/cancellation behavior. Scan verification additionally uses `cpu_review_worker.py` and installed `psutil`: 50 ms nominal sampling, 135-second work deadline with cleanup inside the 150-second host ceiling, ≤768 MiB sampled supervisor/worker-tree RSS, ≥2 GiB available-memory floor before launch and during execution, numerical thread settings 1, and ≤64 KiB per output stream. Sampling is **not** an OS hard memory reservation or an arbitrary-code sandbox; it excludes the Node parent's memory and cannot observe sub-sample peaks. Only reviewed scan replay, source inspection and fixed-catalog acquisition entrypoints are allowed by that Python CLI.

The operator-only inspection command below is for an **already approved, acquired** private source receipt; it neither downloads assets nor authorizes acquisition:

```powershell
& ".local/reconstruction/venv/Scripts/python.exe" -I scripts/room_workflow/cpu_review_worker.py --operation inspect --input <private-acquisition-manifest.json> --receipt <same-private-host-root/new.resources.json>
```

Use one trusted receipt root, not different roots to evade serialization. `.scan-worker.lock` (Node) and `.scan-cpu.lock` (supervisor) persist on uncertain interruption. Do not remove them because a parent PID disappeared or a timeout elapsed; retain expected-input/resource receipts and confirm the exact owned process tree stopped before an authorized manual recovery. No automatic recovery or public route is implemented. Failed settled attempts retain their receipts without granting admission. The standalone `scan_room.py` commands above still lack these resource controls: use them only for bounded synthetic development, not real-data processing.

### Bounded scan acquisition

The [seven-asset packet v1](../../docs/design/acceptance/teal-bedroom-acquisition-v1.md) binds the owner's acquisition approval to an exact plan-file SHA-256. Validate that binding before launch; CLI arguments or an acquisition receipt are not authority. The fixed `fetch` operation uses the same resource supervisor and one trusted receipt root:

```powershell
& ".local/reconstruction/venv/Scripts/python.exe" -I scripts/room_workflow/cpu_review_worker.py --operation fetch --input <approved-frozen-plan.json> --output-dir <new-private-source-directory> --receipt <same-private-host-root/new.acquisition.resources.json>
```

The source directory is fixed to `.local/reconstruction/arkitscenes/45261631/scan-source-v1` and must not exist; the CLI also enforces the exact approved plan-file hash. Each asset is downloaded in its own new `<role>/` directory; filenames and remote bindings in the frozen plan remain unchanged. The append-only, fsynced `acquisition.jsonl` records the plan before any network request, each start, completed transfer hash, and caught failure/partial size. A killed worker may leave only its last started event plus a `.part`; preserve both and the supervisor receipt. No retry/resume follows, even in a new directory, without a new owner decision. HTTP redirects reject before contacting their destination. Completed assets commit `manifest.json` last with `kind: eva-scan-acquisition-receipt-v2`; the inspector also retains support for earlier flat v1 receipts.

This command acquires only the fixed seven sources; it does not extract archives, inspect geometry, register a frame or create/render a candidate. Inspection/processing and new RGB-D acquisition retain their separate gates. Run Python readers with `-I` from the reviewed repository, never from downloaded-data directories.

### Separate RGB-D acquisition

The owner-approved [two-archive RGB-D packet](../../docs/design/acceptance/teal-bedroom-rgbd-v1.md) has its own exact file hash and **144,833,824-byte** transfer ceiling. It does not raise the seven-asset limit or authorize an RGB archive, extraction, decoding, calibration or candidate processing. `scan_rgbd_source.py` checks the frozen proposal bytes, retained metadata bindings and the one fixed `.local/reconstruction/arkitscenes/45261631/scan-rgbd-source-v1` destination. The operator uses `cpu_review_worker.py --operation fetch-rgbd --input <approved-frozen-proposal.json> --output-dir <fixed-rgbd-source-directory> --receipt <same-private-host-root/new.rgbd.resources.json>`; never invoke the unsupervised helper for real downloads. See the packet's execution record before running anything: an existing attempt cannot be replayed.

Both paths reuse the same isolated per-asset writer and bounded transfer. Frozen transfers reject duplicate binding headers, content transformation, transfer encoding and redirects; reads never request beyond remaining Content-Length. RGB-D output reserves the exact payload lengths plus two 64 KiB metadata limits inside its 160 MiB disk ceiling; payloads are streamed and renamed rather than copied. Low free disk rejects before a GET, with a retained failed journal. The distinct receipt kind is `eva-rgbd-acquisition-receipt-v1`; it is acquisition evidence, not an admitted calibrated source or a legacy mesh-inspection input. The JSON snapshot's `approval: pending` is historical metadata, not the authority decision; operator authorization remains external.

### Local RGB-D directory inspection

Decision 2 authorizes the bounded local stages in the [calibration packet](../../docs/design/acceptance/teal-bedroom-rgbd-calibration-v1.md), not downstream source admission. The implemented first stage is `cpu_review_worker.py --operation rgbd-directory --input .local/reconstruction/arkitscenes/45261631/scan-rgbd-source-v1/manifest.json --output-dir .local/reconstruction/arkitscenes/45261631/scan-rgbd-directory-v1 --receipt .local/reconstruction/teal-bedroom-rgbd-directory-v1.resources.json`, invoked with the existing Python executable and `-I` from repository cwd. Check the packet's execution status, unused output/receipt and memory headroom before consuming the sole attempt. Never use the unsupervised helper for real archives.

`scan_rgbd_prepare.py` pins the three retained manifests, streams archive hash checks, bounds ZIP directory parsing before allocation and selects at most four members per conditioning RGB timestamp within 5 ms. Missing/tied matches produce a blocked metadata report, not a guessed calibration. Only directory metadata is parsed: no ZIP payload inflation, raster decoding or held-out pixel access. The exclusive output retains a bounded fsynced journal and writes its report as `manifest.json` last; interruption is not permission to retry. A selected report means **selected-not-decoded**, never source admission. Stage 1 has passed and its allowance is consumed; do not replay it.

### Selected RGB-D extraction and numerical calibration

The separate fixed `rgbd-prepare` operation uses the existing Python executable with `-I`, the same supervisor limits and trusted receipt root:

```powershell
& ".local/reconstruction/venv/Scripts/python.exe" -I scripts/room_workflow/cpu_review_worker.py --operation rgbd-prepare --input .local/reconstruction/arkitscenes/45261631/scan-rgbd-directory-v1/manifest.json --output-dir .local/reconstruction/arkitscenes/45261631/scan-rgbd-prepare-v1 --receipt .local/reconstruction/teal-bedroom-rgbd-prepare-v1.resources.json
```

Check the packet's current execution status before using this command: it grants no retry. **The real v1 attempt is now consumed and failed on all six pose correspondences before extraction; do not rerun it or change its tolerance.** The stage pins the completed directory report and source manifests, validates selected local ZIP headers/deflate/CRC, and writes only six depth PNGs, six confidence PNGs and twelve pincam files under fixed basenames. Raw source archives and both heldouts stay untouched. Whole output is bounded below 64 MiB; each encoded member is at most 4 MiB, the selected payload at most 32 MiB and each journal/report at most 64 KiB. Failed partials remain, with no committed manifest.

The checker requires 256×192 uint16 depth in millimeters, uint8 confidence 0–2, matching finite pincam grids, six byte-bound 640×480 RGB originals and exact 90°-clockwise normalized pixels. It checks all six unique supplied-pose matches within 5 ms using decimal timestamp differences before extraction; each failed match is journaled with its nearest residual. It reuses the existing axis-angle inversion and full rotated-intrinsics math, checks raw-to-rotated point-grid correspondence independently, and then checks finite positive-depth numerical roundtrips. The report labels loader-based assumptions/numerical conventions and leaves VGA-to-depth pose correspondence unverified; emitted poses apply only to the depth checks. Source/output hashes are rechecked before the final manifest. **Prepared-not-registered** is an inspection result, not physical RGB/depth alignment, metric candidate admission or texture readiness. No sensor resizing, fusion, geometry, public route or held-out evaluation is implemented by this stage.

### Modal timestamp investigation (not yet executed)

The owner's 2026-10-22 direction moves real-room processing to Modal. `scan_correspondence_cloud.py` is a separate, metadata-only diagnostic, not a retry of either consumed local stage and not a calibration correction. It leaves the 5 ms gate unchanged and reports bracketing timestamps without applying or interpolating a pose. No GPU is needed for timestamp text; reconstruction GPU work remains separately scoped.

Offline planning only (a fresh destination is required):

```powershell
& ".local/reconstruction/genrc-client/Scripts/python.exe" -I scripts/room_workflow/scan_correspondence_cloud.py --plan <new-private-plan.json>
```

Planning reads only two pinned manifests and implementation source, not the trajectory or pixels, and contacts no provider. Execution additionally requires `--confirm-billable --approved-plan-sha256 <exact-hash> --approved-dollars 1` after explicit owner approval of the [new packet](../../docs/design/acceptance/teal-bedroom-rgbd-calibration-v1.md#modal-correspondence-investigation--2026-10-22). Those flags attest to approval; they cannot manufacture it. Only the 79,693-byte public trajectory and six frozen timestamps would be sent. The fixed private `scan-correspondence-modal-v1` directory consumes the attempt before build; copying the plan cannot authorize another submission. Failed/unconfirmed receipts and returned reports stay retained. A stopped app is not a provider data-deletion guarantee. No source/candidate manifest or HTTP route is produced.

## Verification

```powershell
node --test scripts/room_workflow/*.test.mjs integrations/shado/*.test.mjs
.local/reconstruction/venv/Scripts/python.exe -m unittest discover -s scripts/room_workflow -p test_geometry.py
npm.cmd run check
node week4/app/scripts/verify-room-upload.mjs docs/design/revisions/room-upload-new-evidence
```

The browser script uses public Hypersim inputs and real private local intake. It does not invoke models. See the [review](../../docs/design/revisions/room-upload-v1/REVIEW.md) and [pending acceptance](../../docs/design/acceptance/room-upload-v1.md).
