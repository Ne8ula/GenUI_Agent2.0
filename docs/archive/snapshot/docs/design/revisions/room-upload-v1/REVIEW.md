# Single-room upload implementation candidate

Date: 2026-10-20. Owner authorized implementation after reviewing the Shado requirements. Fresh Weave was explicitly waived for this upload workflow. This is an uncommitted candidate based on EVA `c83fd4c04ca170ed38311b94cdcdebec779051b7`, not a release or accepted reconstruction result.

## Implemented

- Private local 5–7-photo intake; approximate remembered area; temporary/saved working copies and same-session reopening.
- A cloud-worker candidate with VGGT camera/depth inference, optional real ArUco detection and optional SAM2 prompts. Exact model/source pins are mandatory.
- Human review of a simple room polygon and height. Door/window rectangles become authored caps; the polygon bounds estimated geometry and an authored shell. No adjacent rooms are added.
- Paired A/B processing, original-view alignment, reviewed-geometry binding, raw estimates and provenance. Generated influences never become source-only evidence.
- Shado exact-photo authorization, frozen recipe, quote/cap consent, one stable task, authenticated transfers and receipt-bound result retrieval. Source changes remain isolated in [the bridge patch](../../../../integrations/shado/eva-room-bridge.patch).
- Surfaces, points, edges, provenance, raw/completed and A/B controls. Surface sampling gives deterministic separated dots with barycentric colors; it does not yet establish the first Hypersim visual quality.
- Cancellation requests propagate to receipt-bound Modal/Shado calls. Unknown submissions keep recovery records and cannot automatically start a replacement. Limits, CSRF, owner checks and validation precede later stages.

## Evidence and limits

| Verification | Result and scope |
| --- | --- |
| Broker, result validation and Shado client | 36 passing synthetic/contract tests, including concurrent submission, late-result cancellation, expiry and same-task authorization renewal. No live provider authentication inferred. |
| Python geometry/worker contract | 29 tests pass: clipping, nonconvex shell/caps, alignment, video bounds, provenance, integrity and mocked cancellation. |
| Python → JavaScript result interoperability | Real `execute()` control flow with mocked predictions produces analysis and reconstruction results accepted by the broker validator. No neural model ran. |
| Application | Typechecks and 361 application/foundation tests pass (103 core, 258 app). Production build passes outside the restricted filesystem sandbox; the sandboxed attempt failed on Vite config access. Existing Rust warnings remain. |
| [Real intake browser checks](../room-upload-v1-browser-final/checks.json) | Eight checks using public Hypersim images and the actual local broker, including count rejection, upload, approximate area, allowance gate, cancel/delete, keyboard and phone touch emulation. |
| [Synthetic review browser checks](../room-upload-v1-synthetic/checks.json) | Four interaction checks: outline/closure submission, authorization gate, point/camera rendering, A/B/raw/representation controls. Explicit invented triangle fixture, not reconstruction evidence. |
| Shado patch | Applies to `e9dca6c`; native grant/handoff and actual project-construction fixtures pass. Full Shado application build and signed-in popup/provider checks not run because that checkout has no installed dependencies. |

Inspected [desktop intake](../room-upload-v1-browser-final/desktop-intake.png), [phone intake](../room-upload-v1-browser-final/phone-intake.png), [synthetic boundary](../room-upload-v1-synthetic/synthetic-boundary.png) and [synthetic points](../room-upload-v1-synthetic/synthetic-points.png). The initial mobile capture exposed a global fixed-height style conflict; the final capture verifies the corrected dark page height. Prior captures remain in `room-upload-v1-browser/`.

Headless Edge on Windows is browser evidence only. Touch is emulated. No actual uploaded-room result, physical-room accuracy, complete 360-degree coverage, provider deletion, GPU latency/cost or perceptual-quality acceptance is established.

## Still required

1. Review/activate the Shado patch in its own repository and pass its full build and signed-in authorization flow.
2. Confirm model-license eligibility, build the pinned cloud image, verify acquisition and run one separately budgeted compatibility/pilot sequence.
3. Implement and test natural-feature/geometric refinement and mask correction UI. Current geometry is confidence-filtered depth-grid patches, not fused/bundle-adjusted geometry.
4. Test orientation/room-boundary quality and density on actual photo reconstruction, retain failures, measure A/B coverage and source contradictions.
5. Verify private provider/storage lifecycle before admitting personal photos to live services.

The original `facebook/VGGT-1B` checkpoint is noncommercial; the prepared metadata-only research profile is not approval for commercial use. No installation, deployment, model download, paid API call or publication occurred in this pass.

Reproduction and activation instructions: [room workflow README](../../../../scripts/room_workflow/README.md). [Owner acceptance](../../acceptance/room-upload-v1.md) remains pending.

The [source manifest](source-manifest.json) identifies this uncommitted implementation by file hashes. Check counts summarize tools actually run; they do not certify the missing live stages.
