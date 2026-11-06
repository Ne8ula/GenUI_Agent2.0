# Chair-contact reference review

2026-10-28 · `crime-scene-argus-kimodo-v1` · coordinator inspection; chair/motion work paused by the owner, not accepted.

**Owner feedback, 2026-10-28:** the contact video does not explain why the chair ends in the position shown in the crime-scene photograph. The owner redirected current work to panorama 3D scene recreation only. Preserve this packet as a reference/charge record; do not continue or regenerate the chair-contact pass. This feedback does not establish a particular real-world tipping event, and the packet does not cover the new panorama-only UI scope.

## Quick review

- **Status:** still and motion generated and inspected for framing/material/timing guidance. Contact depiction rejected; no frontend/motion edits yet.
- [Contact sheet](references/contact-sheet.png) · [original still](references/images/img-01-chair-contact.png) · [provenance](provenance.json).
- The owner explicitly approved **229 Weave credits**: 5 for the still, 224 for one eight-second 720p motion reference. Both submissions started and the provider reported those charges. No retries or source uploads. This does not authorize Modal or model execution.
- Before/after captures: absent; new Modal capture authority is still required. The existing application is not an accepted replacement baseline.

## Brief and scope

One bounded pass for the approved Argus/Kimodo replacement: a complete static chair and full-body human, deliberate reach → touch → hold → release, retained evidence access and pause/seek/reduced-effects states. Native final target remains 2560×1440/60 on Modal, not the reference video's resolution or cadence. Original source geometry, generated completion and unknown surfaces remain distinct.

Source revision: `0380e13efbdfa8c1ee29fe2c621927852b7766b7` plus dirty/untracked work. No replacement quality baseline accepted. Exact text-only prompts/settings and immutable quote hash are linked from [provenance](provenance.json) to the [quote receipt](../../acceptance/crime-scene-execution-quotes-v1.json). No photographs, scan, solution sheet or private video were uploaded.

## Candidates and inspection

| Asset | Prediction ID | Status | Observed strengths and limits |
| --- | --- | --- | --- |
| [Still](references/images/img-01-chair-contact.png), Nano Banana 2.1, 2752×1536 actual output | `9aef425e-834e-4303-a3fb-1797f7f4bd7c` | Selected framing/material guidance only | Full silhouettes and a readable amber hand/chair annotation. Reject generated graphs, fake evidence readings, excessive dashboard chrome and arbitrary timer values. Generic chair is not a source-matched reconstruction. |
| [Seedance video](references/videos/vid-01-chair-contact.mp4), [temporal sheet](references/videos/vid-01-temporal-sheet.png), [3.5-second hold frame](references/videos/vid-01-hold-3.5s.png) | `664d89e1-6f29-4656-9f9d-2c3d153ae23b` | Selected timing/framing only | Actual H264 1280×720, 193 frames at 24 fps, 8.041667 seconds. Chair stays visually static while the human reaches, holds and releases. Hand stops short; amber block masks the gap. Reject that contact, generic slatted chair, dark chair readability and tiny controls. |

Video inspection used CPU ffmpeg decoding: sixteen 2-fps temporal samples across the eight-second sequence plus the native 3.5-second frame, not continuous real-time viewing. The observed cue lasts roughly 2.5–4.5 seconds; this is timing guidance, not contact verification or native-60-fps evidence.

The coordinator inspected the actual still with the image reader. The right-hand panel shows stepping rather than stable planted feet: do not copy that pose into the contact hold. Palm appearance does not establish distance, collision or support. Preserve the original candidate, including its rejected details; the contact sheet labels the bounded selection.

## Implementation guidance

- Retain one spatial scene rather than reproducing the three-panel reference dashboard.
- Frame the entire human and all chair supports with uncluttered negative space. Use restrained teal ordered points over coherent surfaces; no bloom/glitches hiding gaps.
- Reuse bundled Space Grotesk and IBM Plex typography and existing controls, not generated text or charts.
- Contact indicators require measured final-rig checks; use status words and shape as well as amber. Leave unknowns explicit.
- Reduced effects keep the same geometry/camera and a stable representative state. Evidence access, pause, seek and interruption remain available.
- Use deliberate reach, a two-second held interval and release, but solve the final palm to the admitted chair rather than reproducing the video's gap. Reference assets are never reconstruction inputs or contact/performance evidence.

## Implementation and checks

Independent non-visual work completed while generation ran:

- Added `evaluate_object(vertices, faces, segment, floor_z)` in [ffs_trellis.py](../../../../scripts/room_workflow/ffs_trellis.py), reusing the existing fitter. Reports observed-region fit, indexed components, boundary/nonmanifold edges and degenerate triangles. Silhouette/contact/completeness stay pending; no catalog promotion or upright-pose claim.
- [Four synthetic evaluator tests](../../../../scripts/room_workflow/test_ffs_trellis.py): missing-module red → four passing tests. Existing fitter 10/10 and artifact checks 20/20 passed.
- `npm test`: 103 core + 334 app tests passed. `npm run room:test`: 205 passed, zero failed, two skipped (actual owned process-tree stop; actual CPU adapter through broker). No thresholds were relaxed. These results do not replace earlier retained failure evidence.
- Retained Quaternius rig hash matches the catalog, with its local CC0 licence inspected. Metadata has 53 skin joints, a nonidentity root transform and 46 existing clips; Kimodo SOMA's 77 exported joints cannot be copied by index. No clips played, rig rendered or retargeting accepted. Initial metadata-inspection bound of 1 MiB rejected the 1,662,240-byte JSON chunk; the exact hash-bound chunk was then read. No runtime admission limit changed.

Matching app captures, keyboard/touch/reduced-motion, actual contact, model execution and native cadence checks are **not run**. No asset deletion, installation, commit or publication. Full replacement remains blocked by the [source/access/build prerequisites](../../acceptance/crime-scene-execution-prerequisites-v1.md), not by missing aesthetic instructions alone.
