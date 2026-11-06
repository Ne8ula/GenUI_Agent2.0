# EVA: the room behind the screen

## Destination

One complete desktop/exhibition experience, built through incremental demos in the same application. A primary visitor suggests what is behind the screen. EVA, an unreliable conversational character, interprets the suggestion as an enclosed fictional interior, generates a room and a solvable crime, and invites investigation through speech and head-tracked perspective.

Flow: invite → interpret → compose live → reveal → investigate/edit → challenge EVA → resolve → reset.

The fictional event stays fixed; reconstructions are negotiable. Preserve the actual contribution history. A generated hypothesis cannot become proof of itself. Never misrepresent a fixture or prerecorded output as live generation. EVA may mislead inside the story, never about recording, costs, readiness, errors or stop controls.

## Incremental demos

1. **Conversation:** invitation, character, text/voice exchange and interruption.
2. **Spatial window:** persistent room, desktop/exhibition framing and calibrated primary-viewer tracking.
3. **Live composition:** novel procedural room/case and admitted generated props; truthful readiness and cancellation.
4. **Investigation:** stable object identities, bounded edits, hypotheses, contribution history, challenges and resolution.
5. **Integrated experience:** continuity, reset and real display/audio commissioning.

This is a roadmap, not authorization to start every increment. Pick up only the owner's current task. Fixtures are useful for development and must be labelled. Do not create five unrelated applications or build an unrequested feature merely to fill the list.

## Stack direction

- React 19, TypeScript, Vite and Three.js 0.180.0; preserve existing dependency locks.
- Node.js >=22.18 for orchestration; JSON Schema/Ajv for structured contracts where needed.
- Procedural architecture and bounded layout; OR-Tools is the proposed solver.
- Proposed generation: FLUX.2 [flex] references and TRELLIS.2 on Modal. No local generative GPU setup.
- Proposed language: provider-neutral planner/narrator boundaries, with Opus 5.5 as the recorded candidate.
- Proposed speech/tracking: Scribe v2 Realtime, retained Eleven v3, local interruption/VAD and MediaPipe head tracking. Hardware calibration is required when implementing tracking, not for unrelated visual work.
- Rust enforcement and Tauri delivery remain future integration decisions at their relevant increment, not compulsory dependencies for every visual demo.

Provider/tool availability, versions and performance are not established by this brief. Add integrations only with the task that uses them. Spark and Jev are optional experiments, excluded until selected.

## Out of scope

Real-photo reconstruction, panorama/Realsee/Argus pipelines, Kimodo contact choreography, Shado integration, general desktop assistants, unrelated historical routes and mobile prototypes. Do not reinstate them as defaults or failure fallbacks.

## Current state

Workspace preparation only: reusable bounded asset loader/tests and the existing web dependency graph are retained. No future-demo UI, live generation, speech, tracking or provider integration has been implemented here. No application launch command exists yet; add it with the first requested UI increment.

References, only when needed: [experience rev 12](https://claude.ai/artifact/MTx3kqojz9ZAL2X11yHQ74) and [technical proposal rev 15](https://claude.ai/artifact/3NSjQCYCFAY6pvr6P734hq). These are source documents, not automatic execution authority. The old detailed implementation plan is preserved in the archive but its retention/process requirements do not override this workspace.
