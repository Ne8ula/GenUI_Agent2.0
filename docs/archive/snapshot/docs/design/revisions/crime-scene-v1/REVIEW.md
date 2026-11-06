# Scene investigation v1 — Weave reference packet

Status: **pass 1 implemented; final post-review browser and non-browser verification passed; owner acceptance pending.** 2026-10-24, branch `crimescene` at `0380e13` plus uncommitted work. The one owner-authorized local restart completed without another allocation failure; session-owned servers are stopped. [Final captures and fingerprints](implementation/verification.json) are separate from the [preserved earlier evidence](implementation/earlier-before-reverification/). Only smoke key coverage and evidence changed in the continuation; no pass-2 work or application correction.

## Reference packet scope

The references cover the broader FFS scene th_0028 concept:
- the laser-scan room in the dithered matrix style
- evidence tags and the clue list inside the existing Sources & details panel
- a toggleable notepad that EVA cites
- one user hypothesis reconstructed in 3D, with a timeline scrubber and evidence-consistency results
- a separate Attinger lab-bench view with stringing lines

There was no crime-scene implementation before this pass. The [baseline capture](implementation/before/desktop.png) records the old fixture fallback at the requested URL, not a prior investigation view.

### Pass-1 boundary

The owner selected scan, tags/clues and notebook/replies for implementation. The hypothesis/timeline/consistency and Attinger references above remain **pass 2, excluded**. No new Weave generation, image uploads or credits were used for implementation. The writer inspected the supplied contact sheet and video frame sheet; generated content supplies layout guidance only.

The implementation reuses the private broker, verified mesh reader, static matrix material, bedroom orbit/disposal patterns and 32-entry undo pattern. No bedroom refactor or public FFS asset mount. See the [pending acceptance record](../../acceptance/crime-scene-v1.md) for commands, evidence and limitations.

Route: official Figma MCP `weave_run_model`. Prompts were text-only, and no FFS photographs were uploaded. Costs were approved one structured prompt at a time, within the owner's 250-credit allowance (see [provenance.json](provenance.json)).

[Contact sheet](references/contact-sheet.png) · [images](references/images/) · [video](references/videos/)

## Selected guidance

| Reference | Keep | Exclude |
|---|---|---|
| [scene-clue-list](references/images/scene-clue-list.png) | Right-hand clue list with photo thumbnails and a word status ("examined" / "not yet examined"); thin leader lines from tags; a small coordinate readout | Invented room (it is not th_0028), photoreal furniture, top tab bar, duplicate tags. **Red floor glow reads as blood.** Show unexamined areas with a neutral hatch instead. |
| [hypothesis-bottle](references/images/hypothesis-bottle.png) | **Primary.** Faceless figures in hollow dots (hollow = inferred); cyan dotted swing arc and scatter cone; dotted links to real tags; result rows with icon + word + badge; "Hypothesis — not evidence" banner; 5-keyframe scrubber | Nonsense header tabs and font names; boxing pose. Results must come from computed checks, not authored copy. |
| [notepad-eva](references/images/notepad-eva.png) | Right drawer: EVA's line on top with a "from your notes" citation chip, notes below with tag chips, visible focus ring; teal-tinted matrix room | Footer artefacts ("IBM Plex Mono"), mismatched tag chips, invented room |
| [lab-bench-stringing](references/images/lab-bench-stringing.png) | Upright sheet with fitted ellipses and angle labels, lines converging to an origin glow, method and limitation text in a left column | Garbled metric boxes. Estimate and known source must be drawn separately, with the measured error. |

**Motion:** [hypothesis-motion.mp4](references/videos/hypothesis-motion.mp4) ([1 fps frames](references/videos/hypothesis-motion-frames.png)), 8 s.
- **Keep:** the playhead drives the action in order: wind-up, the arc drawing, the break, fragments flowing along the cone and easing into a cluster at tag 22, then a hold. The results panel stays static, and the camera barely moves.
- **Exclude:** the vertical beams and floating platform (artefacts), scrambled tick labels, a clock frozen at 0.00s, and pose glitches. Figures should assemble from dots before keyframe 01, which the video did not show.

## Implementation rules from inspection

- Geometry comes only from the reduced th_0028 scan. The generated rooms are layout guidance, not scene content.
- Dot shape keeps the provenance distinction: filled marks for scan, hollow marks for hypothesis and inference. Every status also uses a word, never colour alone.
- No red tint for coverage or attention states.
- Each consistency row names the evidence tag, the computed quantity and the reason. "Not testable" is a first-class result.
- Reduced motion: the scrubber jumps between keyframes with no figure assembly animation.

## Limitations

Generated references are design guidance only. They are not evidence, reconstruction, or acceptance.
