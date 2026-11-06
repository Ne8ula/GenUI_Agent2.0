# Upload workflow v1 — pending acceptance

- Date: 2026-10-20.
- Scope: first code candidate for 5–7-photo, one-room reconstruction with required Shado comparison.
- Basis: EVA `c83fd4c04ca170ed38311b94cdcdebec779051b7`; Shado patch based on `e9dca6c0fe334162392d1a3c5681067846ab04d6`. Working changes are uncommitted.
- Authorization: architecture and implementation approved; fresh Weave waived for this pass. The initial UI pass granted no paid execution; the later $5 ARKitScenes allowance and overnight iteration are recorded in the pilot.
- Evidence: [review and reproducible commands](../revisions/room-upload-v1/REVIEW.md).

Expected local exercise: open the upload route with the private service running; select five public room images; describe an uncertain area; prepare/reopen/delete the copy. Requesting cloud work without an exact allowance must remain unrun.

Actual: local intake, retention/reopening contracts, boundary/closure fixture controls and rendering checks pass. The browser exercise does not produce an actual neural reconstruction.

Expected later exercise: authorize one bounded Shado generation, recover its real receipt/video, run paired VGGT reconstruction and compare both arms with raw/completed geometry and source provenance. Check that door/window caps remain inside one room and points form recognizable furniture.

Actual paired comparison: not run. The later overnight pass deployed the VGGT worker and completed an actual public seven-photo upload through it; [pilot evidence](../../research/ARKITSCENES_PILOT.md) records the cloud receipt and the browser-harness interruption. Separate CPU completion is implemented. Shado's v2 bridge passes isolated typecheck/build and protocol checks, but authenticated deployment/generation remains pending. Mask correction UI remains unfinished. No room-accuracy, 360-degree, point-quality or provider-deletion acceptance is claimed.

The later [continuation refinement](../revisions/room-recovery-v2/REVIEW.md) passes seven synthetic browser scenarios: existing-call checks, cancellation, boundary reload, local photo validation and Shado authorization expiry without reloading. The real existing-call client also retrieved an unchanged completed pilot result without inference; the actual CPU completion adapter and local image-decoding adapter passed. Source-request preservation, cancellation races and receipt binding have backend regression coverage. These checks do not turn synthetic UI states into a live Shado comparison or establish original-session recovery for the earlier interrupted harness.

Decision: **pending owner review and live evidence**. Implementation approval does not constitute phase acceptance, publication approval or a paper result.
