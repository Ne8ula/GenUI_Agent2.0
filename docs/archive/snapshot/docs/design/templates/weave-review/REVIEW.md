# Weave reference review

**TEMPLATE ONLY — no generation, inspection, implementation or owner acceptance has occurred.** Copy this folder into a new phase revision when starting a scoped UI change. Replace guidance with actual results; do not leave success-like placeholders. No contact sheet or media is supplied by this template.

## Quick review

- Change/pass ID and source revision: not set.
- Status: not started; UI edits blocked until references are generated and inspected.
- Contact sheet: not generated. When real, link `references/contact-sheet.png` here.
- Selected image(s): none. Link exact files from `references/images/`.
- Selected video(s): none. Link exact files from `references/videos/`; motion work requires video.
- Selection made by: not set. Agent selection is not owner acceptance.
- Owner decision: pending; no decision date.
- Before/after comparison: not captured. Link matching captures side by side, with viewport/DPI and timing notes.

## Brief and scope

Record the requested change, accepted baseline or none, prior candidate, required identity/constraints, affected states, motion requirement, owned UI files and source revision. One packet covers this bounded pass only.

## Candidates

Add one row per real image/video. Use stable descriptive filenames, e.g. `img-01-soft-fold.png` and `vid-01-soft-fold.mp4`. Retain rejected candidates in place; mark selection here, not by copying files.

| Asset link | Kind | Run/prediction ID | Selected / rejected / unreviewed | Observed strengths and limits |
| --- | --- | --- | --- | --- |

Create the contact sheet from real generated image candidates, with filename labels and selection status. A successful provider job alone is not inspection. Record whether video was watched or temporally sampled; stop if required motion cannot be evaluated.

## Generation and inspection

Use direct Weave model calls OR reusable workflows; no manual graph is required per task. Fill `provenance.json` with the actual route, model/workflow/version, inputs/settings, approval and cost, prediction/run IDs, asset paths, inspector and observations. Leave unavailable fields null; do not invent version IDs or costs. Do not store credentials, private source URLs, expiring authenticated links or raw private inputs.

## Implementation guidance

List concrete geometry, material, color, layout and timing rules extracted from the selected outputs, reduced-motion equivalents and permitted deviations. Every UI writer must inspect the selected media before edits. Record their actual inspection, not assumed handoff completion.

## Implementation comparison

Use `implementation/before/` and `implementation/after/` for actual captures when supported. If an existing capture tool owns fixed immutable output paths, link them here and in provenance instead of changing the tool, moving files or duplicating evidence. Do not claim this template contains those captures.

Record matching fixture/seed, viewport/DPI, local capture commands, affected states, motion recording, focus/keyboard/reduced-effects checks, observed reference differences and unresolved blockers. Generated references remain separate from app evidence and do not prove behavior, native performance or owner acceptance.

## Review handoff

Once real references exist, add this revision's REVIEW.md to the phase design INDEX.md with a truthful status. Keep the contact sheet and selected assets at the top for quick review. Record explicit owner feedback, retest and acceptance separately; passing tests or agent selection do not accept a phase.
