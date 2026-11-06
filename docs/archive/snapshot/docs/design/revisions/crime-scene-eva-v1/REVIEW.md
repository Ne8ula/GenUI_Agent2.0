# EVA investigator: object holograms, Ask EVA and reconstruction playback — Weave packet v1

Status: **references generated and inspected; implementation in progress.** Owner acceptance pending. 2026-10-27, branch `crimescene`. [Spec](../../../superpowers/specs/2026-10-27-eva-investigator-design.md) · [plan](../../../superpowers/plans/2026-10-27-eva-investigator.md).

## References (actual outputs, inspected before UI edits)

### [Still](references/images/eva-investigator.png)

Nano Banana 2.1, 1376×768, text only. No FFS photos or game footage were uploaded.

- **Adopt:**
  - The chair as a *solid, complete* translucent icy-blue model (not points), with bright rim edges, a horizontal scanline band, particles crumbling from its edges and a blue floor glow.
  - Generic featureless mannequin figures with small A/B tags.
  - The Ask EVA panel: question field, then Answer, Inconsistencies, Look for, Sources.
  - The amber "EVA's hypothesis — not evidence" badge above a "Hypothetical reconstruction" scrub bar with play/pause.
- **Reject:**
  - The invented room (desk, bookshelf, corkboard); the real room is the measured scan.
  - The side rulers and HUD scales.
  - The lorem-ipsum text.

### [Clip](references/videos/playback.mp4) and [contact sheet](references/contact-sheet.png)

Seedance V1.5 Pro, 5 s, 720p, no audio; first frame is the still. Contact sheet at 2 fps.

- **Adopt:**
  - Figures interpolating smoothly between a few poses.
  - The chair ghost rotating between states, with a particle burst and a floor ring of light where it lands.
  - The playhead advancing while the panel and badge stay fixed.
- **Reject:**
  - The chair ending upright, the reverse of the scenario; playback direction comes from the scenario's states.
  - Figures intersecting the chair.
  - The garbled panel text.

## Implementation notes

The UI tasks (renderer model holograms, figures, Ask EVA, playback bar) follow this guidance. Before/after captures are added when the browser check runs.
