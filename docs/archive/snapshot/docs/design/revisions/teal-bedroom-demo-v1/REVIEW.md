# Teal bedroom scripted demo

Status: local demo implemented; after-v4 browser evidence retained. Final review-fix browser verification is blocked by the system stopping the preview for critical memory pressure. No public deployment or owner acceptance.

## Scope and authorization

- Source baseline: `c83fd4c04ca170ed38311b94cdcdebec779051b7`, shared dirty worktree; preserve all concurrent changes.
- Owner Start: 2026-10-22T07:07:09.676Z. Deadline: 2026-10-22T15:07:09.676Z (11:07 EDT), or earlier completion/owner stop/return or budget exhaustion.
- Bounded demo: ARKitScenes 45261631 supplied dataset reconstruction, deterministic authored teddy placement/recolour/removal/undo. Never substitute 42445021 or claim live generation/RGB reconstruction.
- Aggregate authorization: US$20 cloud and 200 Weave credits; no permission bypass. Real-room processing/model installation/GPU workloads stay in cloud. Static browser viewing is presentation, not reconstruction processing.
- Publication scope: only cleared public-data/demo assets; exclude private photos, credentials, internal records and unrelated working-tree contents.
- Loop invocation was denied earlier; no substitute scheduler installed. Active-session execution only. A temporary, process-bound keep-awake and the local preview were later stopped by the harness for critical system memory pressure. Neither was restarted; restart requires an owner request.

## Resource ledger

| Operation | State | Reserved/spent |
| --- | --- | --- |
| Nano Banana 2 Lite reference, `e416cd67-6b5a-41f7-94c7-26185a614413` | Submitted after structured Approve response | 3 Weave credits |
| Cloud compute | Not submitted | US$0 |

Remaining task allowances: 197 Weave credits and US$20 cloud. Provider workspace balance is not this task's allowance. Every Weave run still requires the connector's structured approval.

## Design question

A quiet, surface-first bedroom encounter with a clearly authored teddy and four preset requests; preserve room/camera identity across edits. Static transitions only for this pass; no motion reference requested. Source vertex colors are not photo-texture mapping. Calibration repair and photographic texturing remain outside this demo shortcut.

## Reference inspection

Fresh output completed and visually inspected: [reference](references/images/bedroom-teddy-reference.jpg), [contact sheet](references/contact-sheet.png), [provenance](provenance.json). Adopt central scan composition, dark negative space, compact preset tray and warm distinct teddy material. Reject generated room geometry/placement as evidence; anchor against the actual supplied scan. Increase tap targets to 44px. No animation is planned, so no motion reference is needed. This packet covers the bounded demo implementation and verification refinements. No previous packet used as a replacement.

## Implementation and evidence

Reuse installed Three.js and existing bounded download/navigation patterns. Keep supplied scan immutable and teddy separate. Separate route, no backend or shared candidate-cap changes. Session-only history, explicit provenance and source credits. Verify exact source hash/counts, deterministic state/history, keyboard/touch, camera continuity, cancellation/recovery and reduced motion. Matching screenshots required; publication waits for applicable dataset rights verification.

No runnable before-state exists for the new bedroom route. Existing routes must remain intact.

## Checks and acceptance

- Added `week4/app/src/bedroom/{BedroomApp.tsx,renderer.ts,memory.ts,bedroom.css}`, lazy `?scene=teal-bedroom` routing in `App.tsx`, focused tests and two browser verification scripts. Extracted the existing bounded download/hash logic into `room/verified-mesh.ts`; the existing room caller retains its caps. No dependencies added.
- The user selects the local scan; it is not bundled or uploaded. Admission requires 24,837,257 bytes and SHA-256 `d3296808e9cb9deec138fa1fce02495d5f84a0e894f56008d7013aedc7721bdc`. Decoded counts: 622,077 vertices and 1,144,903 triangles.
- Teddy is separate authored geometry. Fixed horizontal bed anchor `(0.2, 3.4)` contacts the scan by downward raycast; observed height `-0.6535833283188413`. This is not physical registration. Memory retains 32 edits in the open page only.
- [after-v4 checks](implementation/after-v4/checks.json) contain actual snapshots, identical cameras across recolour/removal/undo and display switching, and zero captured desktop page errors. [Cream teddy](implementation/after-v4/02-teddy.png), [blue teddy](implementation/after-v4/03-blue.png), [matrix](implementation/after-v4/04-matrix.png) and [mobile](implementation/after-v4/06-touch.png) are retained. Earlier candidates `after`, `after-v2`, `after-v3` were rejected for camera/placement and remain available.
- Full `npm.cmd run check --prefix week4` completed before the final review fixes: core 103/103, app 276/276, TypeScript and production build passed. Rust reported unused `STRIDE`, unread `stance`/`contact`, and unused `finite` warnings. This is not a clean-warning run or verification of subsequent edits.
- Final focused run: `node --test week4/app/tests/bedroom-memory.test.ts week4/app/tests/verified-mesh.test.ts` passed 8/8; both browser scripts passed `node --check`. Tracked diff whitespace check passed (Git emitted CRLF conversion warnings).
- Independent Opus review (`ab877f7b8dd58162f`) found no Critical defects but important evidence gaps. Snapshot assertions are now mandatory and the main capture script uses unique output directories. Ctrl-minus and disabled-hover regressions were reproduced in `review-red` and `contrast-red`; modifier/CSS fixes, canvas semantics and caption backing are implemented but their final browser rerun is **blocked**, not passed.
- New touch orbit/pinch assertions and `verify-bedroom-recovery.mjs` (size/hash rejection, cancellation, graphics loss/reopen, retained history and network boundary) are syntax-checked only, **not executed**. Recovery's fixed output directory still needs non-overwrite protection before repeated runs. Deferred minor findings: undo wording can imply restoration after recolour; explicit WebGL context release on disposal is not implemented. Repeated-reopen resource behavior remains unverified.
- Preview and keep-awake were stopped by the harness for critical memory pressure. No restart, replacement server or browser launch attempted afterward. This was not a diagnosed application memory fault.
- Ruling: keep the scan browser-local. Public staging was denied and raw-mesh redistribution clearance remains unresolved; no alternate publication route was used. Cost: the prototype needs a local scan selection and is not a public one-click demo.
- [Acceptance record](../../acceptance/teal-bedroom-demo-v1.md): pending, final verification blocked. RGB-D physical registration, photo textures, live AI and new reconstruction are not claimed.
