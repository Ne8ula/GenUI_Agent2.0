# EVA investigator: object holograms, hypothesis replies and reconstruction playback

> **Historical — superseded 2026-10-28 for crime-scene generation and motion.** Do not implement or spend from this specification. Follow [current scope](../../../PLANNING.md) and the [replacement design](2026-10-28-crime-scene-argus-kimodo-design.md). Earlier approvals below are retained records, not current authority. Reuse evidence/security contracts where compatible; retire legacy generation and stock-pose playback through the reviewed cutover.

2026-10-27 · Design specification v1.1 · **Owner-approved for implementation planning**

The owner approved the design for the `crimescene` branch on 2026-10-27, in conversation. The owner then approved this written specification on 2026-10-27, adding one requirement: each object's visual fidelity should feel almost like a 3D model made for this scene. The decisions for that requirement are recorded in §2 and §3.1, and the playback in §5 changes to match. This version builds on the [first-person v3 candidate](../../design/revisions/crime-scene-arkham-v3/REVIEW.md) of FFS th_0028.

## 1. Outcome

After scanning a clue, the user sees the **whole object** reconstructed as a blue hologram. They can then ask EVA free-text questions about the scene, for example:

- "How could this chair be knocked over?"
- "What happened here?"
- "Reconstruct the chair being knocked over by Person B"

EVA answers in four parts:

1. A short answer grounded in research and in the clues found so far.
2. **Inconsistencies** between the user's proposal and the documented evidence, each with its basis.
3. **What to look for next**: missing kinds of evidence and where.
4. A **hypothetical reconstruction**, always produced and played back in the room as hologram figures and object motion.

The user keeps scanning and asking; each answer reflects the clues found so far.

EVA **pretends not to know the solution**. It reasons from verified research and from the clues the user has reconstructed. It never sees the dataset's official scene description.

### Out of scope

The following are out of scope:

- full photo-to-scan registration (object models are fitted per clue, see §3.1);
- learned object detection (owner-drawn crops are used instead);
- physics simulation;
- generated video;
- voice;
- multi-scene support;
- validated forensic conclusions;
- spatter-on-scene compositing;
- persistent cross-session conversation memory;
- a public deployment.

## 2. Owner decisions (2026-10-27)

| Topic | Decision |
|---|---|
| Object highlight | Auto-segment the scan offline; the owner reviews each segment before it is used. |
| Segmentation compute | One Modal CPU run, $1 operational allowance, no retries. |
| EVA's knowledge | Only the clues the user has scanned, plus research. A bounded absence check may consult the full documented evidence list. |
| Absence answers | EVA may say an item kind was or was not documented. It never reveals names or locations of unscanned items. |
| EVA calls | `claude-opus-5-5`; up to 20 requests per page session; photos of scanned clues included; failed or uncertain calls count; no automatic retries; per-request consent. |
| Sources | As many verified sources as a varied, scene-related demo needs. |
| Playback | Structured scenario played back as hologram figures and object ghosts. |
| Blood | Reddish traces are the scenario's stand-in for blood. EVA may recommend looking for spatter, but always notes the traces are staged applications. No direction, origin or other physics may be inferred from them; only the Attinger patterns support physics. |
| Weave | Credits topped up (about 2,400). Each run is quoted and approved separately. |
| Object fidelity | Each clue object becomes a complete mesh generated from its source photo, then fitted to the scanned segment. The owner reviews the fit score. Labelled "generated from photo, fitted to scan". |
| Where models show | Both detective (hologram material) and Source colours (textured) views. A model replaces its object's scan points; the rest of the room stays the measured scan. |
| Figures | One openly licensed (CC0 or CC-BY), rigged human mesh, posed per step and rendered as a hologram. Licence recorded. |
| Generation compute | One Modal GPU run, $10 operational allowance, no retries; outputs reviewed before use. |

## 3. Object segmentation

**Input.** The hash-verified scan `scene.ply` (712,312 points) and `tags.json` marker centroids.

**Method.** A deterministic numpy job (`ffs_segment_cloud.py`) runs once on Modal CPU. The image has no GPU and no network, and the job has no retries.

1. Work in display coordinates (the same rotation and offset as `displayPoint`).
2. Fit the floor plane with RANSAC (1.5 cm inlier band). Find the dominant wall planes the same way.
3. Exclude floor and wall inliers from growth.
4. Voxelise the remaining points at 1.5 cm and flood-fill 26-connected voxels from seeds within 6 cm of each tagged marker centroid.
5. Stop growth beyond 1.2 m from the seed or above 2.2 m. Include the floor-contact band (0–3 cm) only for points under the grown footprint.
6. Report per segment: point count, bounding box, height and seed distance. Report overlaps and empty or oversized segments rather than hiding them.

**Output.** A JSON summary plus one `Uint32` index list per marker. Every file is hash-registered as `segments/*` in `ffs-resources.json`, using the same mechanism as the depth maps. Parameters, revision and a plan/receipt pair are retained; the run uses an exclusive receipt and app cleanup.

**Review.** A private review view (`?scene=crime-scene&review=segments`) shows each segment in isolation over the dimmed scan, with Approve / Reject per clue. Decisions are saved as a small Markdown record with provenance, in the existing notebook-directory style. Only approved segments drive holograms. Unapproved clues keep the 34 cm sphere, labelled "approximate region".

**Rendering.**
- **Attribute:** a per-point `segment` value (marker index, or −1) is loaded from the approved index lists.
- **Hologram:** the shader replaces sphere membership with segment membership.
- **Scanline:** while reconstructing, a bright horizontal band sweeps up the segment's height.
- **Reduced motion:** the band is static and the hologram appears complete.

**Tests.** Use synthetic point clouds: a box on a floor next to a wall, two touching objects, an empty marker and an oversized region. Plus receipt and no-overwrite tests, mirroring `test_ffs_depth_cloud.py`.

### 3.1 Scene-specific object models

**Targets.** Seven object clues:

| Tag | Object |
|---|---|
| 17 | 12-gauge case |
| 69 | Bottle |
| 12 | Bottle |
| 22 | Glass piece |
| 13 | Shoes |
| 18 | Chair |
| 32 | Cushion |

Tag 21, the reddish trace on the sofa, is a mark rather than an object; it keeps the segment hologram. The sofa itself stays part of the measured room.

**Photo crop.** In the review view, the owner draws one box per source photo around the object. This is recorded as owner input. A promptable 2D segmenter (SAM 2, Apache-2.0) then cuts the object from the background inside that box.

**Generation.** One Modal GPU run (≤ $10, no retries) generates a complete textured mesh per object with an image-to-3D model.

- **Model choice:** made during planning from candidates such as TRELLIS (MIT) or TripoSR (MIT), after checking the licence and the official code. Models with regional or commercial-use restrictions incompatible with this project are excluded.
- **Records:** weights revision, settings, input crop hashes and output hashes are recorded.

**Fitting.** Each generated mesh is normalised and then fitted to its approved scan segment:

1. Search 24 axis-aligned rotations, scaled by the bounding box.
2. Refine with point-to-plane ICP. Ground contact is constrained to the fitted floor plane.
3. Score the fit: coverage (the share of segment points within 2 cm of the mesh) and mean distance.

The score is shown in review and in the clue panel. Models below a coverage threshold the owner sets during review are not shown; the segment hologram is used instead.

**Outputs.** GLB meshes (≤ 2 MB each, decimated), fit transforms and scores. All are hash-registered as `models/*` and loaded through the existing verified reader. No remote asset URLs.

**Rendering.** An approved model replaces its segment's points: they are hidden and the mesh is drawn in their place.

- Source colours view: the textured model.
- Detective view: the same mesh with the hologram material — fresnel rim, inner noise sparkle, the rising scanline, particles crumbling from the edges, and blue spill onto nearby scan points.

**Labels.** The clue panel and Sources & details label models "Generated from source photo, fitted to scan (coverage N %, mean X cm)". Hidden sides are model completion, not measurement.

**Upright state.** Playback's `upright` state is an authored rotation of the fitted model, reviewed by the owner with the fit.

## 4. EVA investigator

### Request

Add a broker route `POST crime-scene/ask`, beside the existing notebook routes and reusing their CSRF session, owner ID, lock and atomic counter. The request body is exactly:

```json
{ "question": "string ≤ 500 chars", "scanned": [18, 13], "history_revision": "sha", "consent": true }
```

Unknown fields are rejected. Tags must exist in the evidence list.

The server keeps the conversation in a per-owner Markdown transcript, bounded to the last 6 turns, in the notebook directory. The client cannot inject prior assistant turns.

### Context sent to the model

The model receives only:

1. **Scanned clues:** tag, item name, and marker position in display metres. If an approved segment exists, its bounding box, height above floor and point count. Its source photo (the 640 px `depth/photo-*` copy, hash-verified) as an image block.
2. **Research digest:** `scripts/room_workflow/eva-research.json`, curated and verified (see §6).
3. **Scene facts:** single-position scan; room crop extents; the staged nature of the traces; FFS licence and limits.
4. **The question** and the bounded history.

**Never sent:** the dataset scene description (`IPC_Th_0028.xlsx`), unscanned item names or positions, notes (unless a future pass adds them explicitly), raw scan data and API secrets.

A test asserts the request body contains no unscanned item name and that the description file is never opened.

### Absence check

The model has one tool, `documented_evidence(kind: string ≤ 60 chars)`. The server matches the kind against a fixed keyword map built from the full evidence list. Kinds include hair/fur, blood/reddish trace, glass, bottle, firearm/ammunition, footwear, phone, key, glasses and furniture.

The tool returns one of:

- `documented-and-scanned`, with the tag;
- `documented-not-yet-found` (no name or location);
- `not-documented`.

At most 3 tool calls per request; the tool loop is bounded server-side.

### Output contract

The model must return JSON matching EVA-owned schema `eva-investigation.schema.json` (Draft 2020-12, `additionalProperties: false`). It is validated with the installed `ajv`.

```text
answer: string ≤ 1,200 chars
inconsistencies: [{ claim, basis: "scanned" | "documented-absence" | "research", source_ids: [] }] ≤ 5
look_for: [{ kind, where, why }] ≤ 5
reconstruction: {
  title,
  hypothetical: true (const),
  actors: [{ id: "A" | "B" | "C", label }] ≤ 3,
  steps: [{ t (0–60 s), actor | null, pose, position [x, y], facing (rad),
            object_moves: [{ tag, state: "upright" | "current" | "displaced", position [x, y, z] }], caption ≤ 140 }] 1–8
}
citations: source_ids from the digest only
```

- `pose` is one of `stand`, `walk`, `reach`, `push`, `strike`, `fall`, `crouch` or `lie`.
- Positions must lie inside the display crop and object tags must be scanned; otherwise the reply is rejected. A rejected reply counts against the cap and shows "EVA's reconstruction was invalid", with no retry.
- EVA always returns a reconstruction, even when it flags inconsistencies, as the owner requested.

### System prompt (summary)

EVA is an investigation assistant for a staged teaching scene. It reasons only from the scanned clues, their photos, the absence tool and the cited research.

- It must not claim to know what happened.
- It labels every reconstruction as one hypothesis among several possible.
- It separates evidence, inference and generated scenario.
- It names missing evidence the user could look for.
- It follows the blood rule in §2 and never invents evidence.
- Its output is JSON only.

### Limits and failure handling

- Model `claude-opus-5-5`, `max_tokens` 8,192 (raised by controller ruling, Task 6), 60 s timeout per API call.
- Cap of 20 requests per page session. The counter is reserved before submission; failures and uncertain calls count; restarts never restore the allowance.
- Response size is limited (64 KiB) and `stop_reason` is validated.
- The secret is read only from the existing key provider.
- Cancellation behaves as in the notes reply: it is local, and the reservation is kept.

## 5. Reconstruction playback

**Figures.** One openly licensed rigged human mesh, for example a CC0 Quaternius base character, chosen after licence verification. It is served as a hash-registered local asset. Eight authored bone poses match the schema enum, and the renderer interpolates between steps. Figures use the hologram material with a rim term and a letter label (A/B/C), never a person's name or likeness.

**Objects.** For each `object_moves` entry, a ghost copy of the clue's fitted model (or of its segment points when no model is approved) is transformed between states:

- `current`: the measured pose.
- `upright`: an authored per-clue rotation, owner-reviewed alongside the segment (XYZ Euler radians, display z-up frame, about the hologram's bbox centre, then re-floored). It is honoured whenever recorded, whatever the model decision; the position is not used.
- `displaced`: moved so the ghost's base rests at the given position; z is the resting height (final-review ruling I1).

The measured scan itself never moves.

**Controls.**
- A separate "Hypothetical reconstruction" bar with play/pause/scrub, distinct from the capture-order timeline.
- A persistent badge: "EVA's hypothesis — not evidence".
- Escape stops playback.
- Reduced motion shows a stepped (non-animated) sequence.

**Panel.** "Ask EVA" is available after the first scan. It has a question field, a consent checkbox (*send this question, your scanned clues and their photos*) and a remaining-request count. Each answer shows Answer, Inconsistencies (with basis), Look for, Sources (digest citations with verification level) and "Play reconstruction". Text renders as plain text only.

## 6. Research digest

`eva-research.json` lists the verified sources. Each entry carries id, full citation, DOI or URL, licence/access, verification level (full text, abstract or bibliographic only) and a few paraphrased principles EVA may cite. Candidates to verify from primary or official sources during implementation:

- crime-scene reconstruction method: event sequencing, evidence dynamics, alternative hypotheses (e.g. Chisum & Turvey, *Crime Reconstruction*);
- the NIJ *Crime Scene Investigation: A Guide for Law Enforcement*;
- bloodstain terminology and reporting standards (OSAC / AAFS ASB);
- Attinger et al. 2018 impact-spatter dataset;
- the FFS data paper (Data in Brief 2026);
- further sources where demo questions need them, such as glass fracture sequencing, firearm/cartridge-case evidence and furniture displacement in struggles.

Anything not verified is excluded. Paraphrases only, no bulk copyrighted text.

## 7. Weave, verification and gates

- **Weave packet** `crime-scene-eva-v1` covers the Ask EVA panel, the hologram mannequin playback, and the segmented object with its scanline. It needs a fresh still plus a clip, each quoted and approved separately.
- **Tests:**
  - segmentation (synthetic);
  - schema accept/reject;
  - broker: exclusion of the description and of unscanned names, the absence tool, the cap, consent, no retry and invalid-reply handling, all with fake fetchers;
  - renderer and app units: pose interpolation, segment attribute and playback state;
  - browser smoke with canned EVA fixtures at the browser boundary, never a live provider.
- **More tests:** the fitting (synthetic mesh with a known rotation and scale recovered), the GLB size/hash checks and the model/segment fallback.
- **Separate owner approvals:**
  - the Modal segmentation run (approved: $1);
  - segment review and photo-crop boxes;
  - the Modal object-generation run (approved: $10);
  - model/fit review;
  - a Modal GPU browser check;
  - a Modal demo session;
  - any live EVA calls with the owner's key.
- **Acceptance** is recorded under `docs/design/acceptance/`, pending by default.

## 8. Risks

- **Segmentation:** it may merge touching objects (chair and cabinet) or split thin legs. Owner review and the sphere fallback cover this.
- **Evidence absence:** the dataset documents collected evidence, not every absent thing, so "not documented" is weaker than "absent". EVA must say "not documented", not "not present".
- **Model behaviour:** the model may still over-claim. The schema, prompt rules and visible "hypothesis" labelling mitigate this; live reply quality is unverified until approved calls run.
- **Hologram figures:** they can make a hypothesis feel factual. Persistent badges and captions counter this.
- **Generated models:** a fitted model can look more certain than the scan. Hidden sides are invented, and small objects (cartridge case, glass piece) may generate poorly from 640 px photos. Fit scores, labels, the owner threshold and the segment fallback cover this. Full-resolution photo crops may be uploaded within the same approved run.
- **Model choice:** the image-to-3D model has not been trialled on this scene, so its quality is unknown until the single approved run.
