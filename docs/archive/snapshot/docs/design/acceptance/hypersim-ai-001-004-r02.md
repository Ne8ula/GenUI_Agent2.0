# Hypersim ai_001_004: offline baseline r02

- Date: 2026-10-18 (America/New_York).
- Scene decision: owner accepted Hypersim and selected `ai_001_004` in this conversation.
- Reconstruction decision: **pending owner review**. C-M0/C-M1 are not accepted.
- Scope: offline CPU TSDF integration using supplied synthetic depth/cameras; colored mesh, points, camera transforms and technical validation. No frontend changes, artistic pass, trained model, photo-only estimator, object anchors, conversation or navigation integration.
- Source baseline: git `6da266ede75b5ff1e0a1786580730949c0c5893b` plus the uncommitted source files fingerprinted in [source-hashes.json](../../research/hypersim/evidence/r02/source-hashes.json). Reconstruction script SHA-256 `67129b02eb59f3d07aa63758ca29831919b64cbbf3b93377877d56ac07b36277`.
- Dataset metadata revision: Apple Hypersim `3463c5c4a75f3cbfc65ed31cfd6e87204b3a2254`; selected archive entries identified and hashed in [input manifest](../../research/hypersim/evidence/r02/input-manifest.json).
- Actual routing: Codex lead implemented and executed local tools; one Codex subagent audited formulas and source read-only. This is not evidence of Astra/Claude-native role execution. The reviewer did not independently rerun the tests or metrics.

## Scenario and expected evidence

Follow the [reproduction commands](../../research/hypersim/README.md#reproduce-and-inspect) with a fresh run directory. Integrate the fixture's 20 frames, then evaluate the four predetermined withheld frames. Expect finite nonempty geometry, correct units/pose direction, complete accounting for every held-out view, hashes and honest coverage/error diagnostics. Do not equate successful export with usable whole-room reconstruction.

## Actual results

- **Passed:** 16 coordinate/TSDF/input/resource/path/interruption/output-preservation/evaluation-accounting tests. [Log](../../research/hypersim/evidence/r02/tests.txt).
- **Passed:** pinned environment dependency consistency. [Log](../../research/hypersim/evidence/r02/dependency-check.txt).
- **Passed:** input release checks, file hashes, two supplied-position consistency audits below the 1 cm p95 guard, offline cached-input verification and mesh/point export.
- **Observed:** 229,126 vertices / 443,923 triangles. r02 mesh SHA-256 `f3555f41ae4e7755a38d3db41b2981698f3a9c4b297ce989052f5bdc050373ec`, identical to r01. Raw outputs for both runs are retained locally; r01's source snapshot is retained with that run.
- **Coverage limitation / not accepted:** frames 0012, 0062 and 0087 have 99.59–99.83% hit coverage and 5.97–9.23 mm mean radial error on hits. Frame 0037 has 15.72% coverage and 513.14 mm mean error on hits. All four remain in the report. No complete-room claim is supported.
- **Visually inspected:** [source, actual mesh raycast and error comparison](../../research/hypersim/evidence/r02/evaluation.png). Cabinet surfaces are recognizable; thin details are softened/missing; the opening-facing view has substantial missing geometry. Fixed Reinhard/gamma color treatment is declared in the report.
- **Not run:** interactive browser/native UI checks, physical-scene validation, original-mesh geometry comparison, RGB-only reconstruction, hardware benchmarking, participant study. Native-call cancellation latency and hostile-input fuzzing were not tested; the downloader cancellation status path was tested with a simulated interrupt.

The [machine-readable run report](../../research/hypersim/evidence/r02/report.json) records every metric, output hash and environment version. Its `complete` status means the computation finished, not that owner acceptance passed. Supplied-position agreement is same-renderer consistency, and withheld views are from the same room/path. No generalization or historical-truth claim follows.

## Next owner exercise and decision

Inspect all four rows of the comparison, particularly frame 0037. Assess whether the cabinet-focused geometry is useful for a bounded first encounter or whether another input-coverage pass is needed before navigation integration. Any additional frames/configuration become a new recorded revision; preserve this baseline and evaluation failure. The future UI pass requires fresh scoped Weave output.

Owner feedback: pending. Owner decision/date on reconstruction: pending. Selecting this room does not accept these outputs or complete a major milestone.

## Owner follow-up and audit, 2026-10-19

Owner feedback: "Frame 0037 doesnt seem correct. Could you double check". Reconstruction acceptance remains pending.

The [diagnostic report](../../research/hypersim/evidence/frame0037-audit/report.json) and [comparison](../../research/hypersim/evidence/frame0037-audit/comparison.png) independently check the original preview, supplied world-position map and source-to-source overlap. They confirm a valid frame/camera association and inadequate coverage from the selected integration views. Only 0.80% of its sampled valid surface points match a training depth within 5 cm; its supplied-position consistency p95 is 3.56 mm. Recasting the original mesh reproduces the poor r02 metrics.

An explicitly labeled single-frame self-fit control gives 95.79% coverage and 1.71 mm mean error on hits. It is a diagnostic, not held-out evidence; no benchmark claim or baseline replacement follows. The original r02 mesh and inputs remain hash-identical. The immediate corrective work would be a new, coverage-aware selection of other input views, preserving 0037 as withheld and recording this development tuning.

Execution: Codex lead ran and visually inspected the diagnostic. A Codex read-only worker separately reproduced baseline raycasts and source-support measurements; no Claude-native routing was claimed. Reviewed source revision: `70ad76c6888a9bbcc98bea8c2756ed73db0f5132` plus the audit script fingerprint in its report. No UI change or milestone advancement occurred.
