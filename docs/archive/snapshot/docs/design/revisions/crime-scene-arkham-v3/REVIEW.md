# First-person detective scan with interactive reconstruction — v3

Status: **implementation candidate; GPU check and demo pending.** Owner acceptance pending. 2026-10-27, branch `crimescene`, base `0380e13` plus uncommitted work.

## Owner direction

After the v2 demo, the owner asked for:
- a grounded, first-person exploratory view;
- materials matching Arkham Knight's detective mode as shown in the owner's reference recording (`batman_references/arkham_detectivemode.mp4`, 6 min 10 s);
- a reconstruction sequence that is interactive.

On 2026-10-27 the owner chose a capture-order timeline, an interactive scan in place of the photo carousel, and walking inside the room. They also approved this pass's spending: a Weave still and clip, one Modal L4 GPU check ($2) and one L4 demo session of up to 60 minutes ($3). No retries.

## Reference recording (owner-supplied game footage; local reference only)

Inspected as eight contact sheets at one frame per 3 s, plus four full-resolution frames. The footage was not uploaded to Weave or copied into the repository. Findings:
- **Camera:** grounded, close third person at body height; never overhead or isometric.
- **World:** the real lit scene, darkened toward desaturated blue/violet with a heavy vignette. There is **no** wireframe grid or data rain; v2's grid treatment was a misreading.
- **Holograms:** only the reconstructed subjects get this material. They are icy, translucent, filled volumes with bright rims, fine inner sparkle and edges crumbling into particles, and they spill blue light onto the real ground.
- **Interaction loop:** hold to scan (a RECONSTRUCTING bar), then a timeline to scrub. A centre reticle shows SCANNING with a ring, then DETECTED, or NO EVIDENCE in red. A side panel shows a rotating 3D card of the found item, and the next segment unlocks.

## Weave references (inspected before source edits)

- [Still](references/images/first-person-scan.png), Nano Banana 2.1, 1376×768, text only.
  - **Adopt:** the real room graded dark and cool with a vignette, an icy hologram with crumbling particles and blue floor spill, a centre reticle with a progress ring, a capture-time timeline, a small evidence-card panel and thin cyan frame lines.
  - **Reject:** the invented room layout, the hologram drawn as a second chair (it must overlay the measured object in place), the wrong marker numbers and the "scon" typo.
- [Clip](references/videos/scan-interaction.mp4) and [contact sheet](references/contact-sheet.png), Seedance V1.5 Pro, 5 s, 720p, first frame is the still.
  - **Adopt:** the ring filling during the hold, particles condensing into a brightening hologram, the playhead stepping, and a thin particle beacon rising at the next clue.
  - **Reject:** the hologram chair tipping over (invented event motion), the garbled ring text and outline-only rims.

## Implementation

- `firstperson.ts`: start at the scanner origin, 1.6 m above the crop floor. Walking is limited to 25 cm inside the display crop, not detected walls. Aim finds the marker nearest the reticle (within 0.12 rad and 5 m). The timeline is read from the photo filenames' capture times. Covered by 5 unit tests.
- `renderer.ts`:
  - Camera and controls: perspective camera; drag or arrow keys to look, WASD to walk, Home to return to the scanner. Orbit, orthographic view and cutaway are removed.
  - Detective view: the measured colours are desaturated, cooled and fall off with distance, under a CSS vignette.
  - Holograms: a scanned clue's scan points within 34 cm of its marker condense into an icy, sparkling region with crumbling edges and a blue spill on nearby points. Drifting additive particles accompany it.
  - Beacon: a light column over the clue photographed at the current timeline step.
  - Reduced motion freezes the sparkle, particles and beacon, and makes reconstruction instant.
- `card.ts`: the evidence card is the clue's source photo, lifted by its Depth Anything V2 Small relative depth and turning slowly. It is shown after a successful scan.
- `CrimeSceneApp.tsx`:
  - Scanning: a centre reticle (amber when a marker is in the cone). Hold Space, or the "Hold to scan" button for pointer and touch, for 1.2 s. The result is "Detected · tag N", "No evidence", "Unidentified marker" or "Scan cancelled".
  - Timeline: a capture-order range slider (Q/E) with a readout.
  - Clues list: a "Reconstructed" status per clue.
  - Examination rule unchanged: scanning does not count.
- Removed:
  - the photo carousel intro and its test;
  - `inCutaway`, its test and the Full scan control;
  - the post-process outline pass, grid and rain.

  Pre-change sources are preserved under [implementation/before/source/](implementation/before/source/), with v2 captures in [implementation/before/](implementation/before/).

## Honesty limits shown in the UI

The room is the measured single-position scan, so holes grow away from the scanner. A hologram highlights points near a marker; it is not segmented. The timeline is the photographer's order, not an event. Card depth is relative, not measured and not placed in the room.

## Verification so far

- Offline: app typecheck passes. The full app suite passes, 297/297, including the 5 new first-person tests and the updated initialization fixture. The 7 cloud-adapter tests pass. The smoke test passes a syntax check.
- GPU check (plan `4ba0da9c…`, app `ap-BzJRdUG0Ji1TbxpLYMMMCb`, stopped with 0 tasks): **failed on its single attempt**.
  - Passed: WebGL on `ANGLE (NVIDIA, Vulkan 1.4.341 (NVIDIA L4))`, the GPU-device and Vulkan checks, and 10/10 unit tests.
  - Failure: the smoke stopped at its first assertion, "Timeline beacon animates", before any capture.
  - Cause (test defect, confirmed by computing marker bearings from the start view): the first beacon, tag 13 at 115°, and tag 22 at 119° are behind the viewer, outside the ±46° horizontal view. No hologram existed yet, so nothing animated on screen.
  - Fixed offline: the smoke now captures and asserts zero page/shader errors right after load, and checks motion on the first hologram instead. Syntax-checked only; **not re-run**. Shader compilation remains unverified.
- Second GPU check, separately approved (plan `700b5e52…`, app `ap-D7GgFyGyGyWjgAjKmc0YoJ`, stopped with 0 tasks): **failed on its single attempt, after the core flow passed**.
  - Added before this run: an off-screen beacon edge arrow.
  - Passed: NVIDIA WebGL; **no page or shader errors after load (shaders compile)**; the edge arrow is visible for the first beacon behind the viewer; the hold-to-scan of tag 18 reached "Detected"; the evidence card loaded its verified depth map; and the hologram canvas animates.
  - Failure: the next canvas comparison hit a test defect. The new card adds a second `<canvas>`, so the generic `canvas` locator became ambiguous. All seven locators are now scoped to `.scene-stage > canvas`; syntax-checked only, **not re-run**.
  - Inspected captures in [after/](implementation/after/): `desktop.png`, `scan-progress.png`, `hologram.png`.
    - Matches the brief: the real room graded dark, cool and desaturated; the amber reticle ring while holding; an icy, sparkling condensing region with particles and floor spill; the edge chevron; the evidence-card relief.
    - Visible limits: the hologram is a 34 cm sphere around the marker tent, so it lights the floor and tent beside the chair rather than the chair; the scanner's tripod blind spot shows black below the start view; near points look blocky.
  - Still unverified in the browser: look/walk/Home exactness, "No evidence" and "Scan cancelled", timeline stepping, Source colours, dwell, photo, notes, reload, pause/reopen, reduced motion, touch and reply fixtures.
- Demo (plan `e31e05e8…`, app `ap-jbQUtU6UFShmHXzF90zK87`): streamed from 13:02 on NVIDIA L4 WebGL. The owner used it, said they have enough evidence for the next fixes, and asked to end it.
  - Killing the local client left the Modal app running with 1 task. It was stopped with `modal app stop --yes` and confirmed stopped with 0 tasks.
  - The receipt still reads "streaming" and was left unedited.
  - Owner feedback is to follow in the next pass.
- v2 demo: Modal app `ap-00IACNMfP9dzefESSIKfR8` was confirmed stopped with 0 tasks. Its client was killed rather than interrupted, so its receipt still reads "streaming"; it was left unedited.
