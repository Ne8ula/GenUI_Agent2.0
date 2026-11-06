# EVA Text-to-World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task after owner review and execution-method selection. Steps use checkbox (`- [ ]`) syntax for tracking. Repository restrictions override generic skill commit/worktree defaults: no automatic commits, publishing, installs, paid calls or worktrees.

**Goal:** Build a live conversational installation that composes a novel enclosed fictional crime scene, supports persistent investigation and bounded edits, and preserves the truth of the participant's contributions.

**Architecture:** A deterministic case/world core owns revisions, evidence and transactions; a bounded coordinator requests language, speech and generation services without giving models authority. Three.js renders procedural architecture and admitted objects, with a calibrated head-tracked camera; Spark and Jev remain optional experiments. Develop and review the independent work packages below before their integration, rather than treating this as one undifferentiated application rewrite.

**Tech Stack:** Existing React 19, TypeScript, Three.js 0.180.0, Node.js >=22.18, Ajv Draft 2020-12 and Rust; proposed OR-Tools CP-SAT, MediaPipe Face Landmarker, Silero VAD, Scribe v2 Realtime, Eleven `eleven_v3`, Opus 5.5, FLUX.2 [flex], TRELLIS.2 on Modal, glTF Transform and Khronos glTF Validator. Tauri 2 packaging remains a separately verified delivery task.

**Spec:** [EVA Technical Specification](https://claude.ai/artifact/3NSjQCYCFAY6pvr6P734hq), revision 15, unchanged when checked for this plan. [Experience document](https://claude.ai/artifact/MTx3kqojz9ZAL2X11yHQ74). [Editable implementation plan](https://claude.ai/artifact/SaYJ7d4s5cbaeuTJw5dX7o).

**Status:** Draft for owner review. The user authorized writing this plan, not executing it. Baseline: `crimescene`, commit `334482a`. Proposed names below are implementation decisions, not claims that modules already exist.

## Global Constraints

- Live novel room composition, not selection of pre-generated rooms. Static cases, catalog-only scenes and canned responses are test fixtures only.
- One primary participant with spectators. Fixed fictional event; negotiable reconstruction. No visible body is required.
- Eleven `eleven_v3`, stability direction `0.5` (Natural). Verify actual provider-supported settings; no silent Flash/conversational-v3 substitution.
- Local rendering is a candidate, conditional on explicit run approval and memory/performance acceptance. Generative GPU work remains on Modal.
- Runtime models emit bounded data, never executable HTML/JS/CSS/shaders, shell or arbitrary IPC. Models and their confidence scores cannot manufacture permission.
- Fresh change-specific Figma Weave images, plus video for motion, must be inspected and recorded before every frontend/UI pass. One packet covers only its bounded pass; no inherited allowance.
- Preserve source photos/scans, provenance, failed-run receipts, existing unrelated routes and concurrent edits. Do not widen the Paris desktop-stage schemas to carry generated worlds.
- Proposed per-prop ceilings: 50,000 triangles; 20 MiB GLB; 2048-pixel texture edge; five material slots. Set aggregate decoded/GPU budgets before execution.
- Proposed targets: 2304×1152 exhibition content; 60 Hz presentation; p95 frame time ≤16.7 ms; local interruption ≤150 ms; motion-to-photon ≤100 ms; first substantive speech ≤4 s; inspectable room ≤15 s; novel prop ≤90 s. All are proposed p95 pilot targets, not measured guarantees. Stability exercise: 30 minutes and 10 create/edit/reset cycles.
- Only the narrator generates conversational prose. Operational status, consent, recording, costs and actual history are never fictionalized.
- Native effects, model downloads, provider access, installs, cloud jobs and release require their own finite approvals. No automatic commits or pushes. Each task ends with a review checkpoint instead of a commit command.

## Review Focus

1. **ASR changes after an early interpretation:** invalidate provisional work; never record an unconfirmed hypothesis as testimony. Pin in C1/C2.
2. **Cancel/reset races a successful provider response:** no late audio, scene insertion or revived authority. Pin in A3, C2 and D3.
3. **Valid-looking assets exceed decoded/GPU memory or spoil a clue:** reject before admission and preserve the committed scene. Pin in B2/D1.
4. **Participants cross or tracking is lost at a screen boundary:** no silent spectator takeover or camera jump; preserve fixed-view access. Pin in B3.
5. **A generated hypothesis becomes the apparent proof of its own case:** deterministic evaluation must exclude it from canonical clues. Pin in A2/D3.

---

## 1. Execution contract and repository map

### Work-package boundaries

A provides independently testable data, state and service contracts. B delivers an offline procedural scene and calibrated-display candidate. C delivers text/audio conversation against synthetic state. D supplies genuine live case/room/asset generation and integrates the investigation. X contains optional comparisons. R contains release verification and packaging. Each package has its own acceptance record and may be rejected independently; do not call an offline fixture demo the finished product.

Recommended first execution tranche: **A0–A4 only**, then owner review. B and C may start independently after A interfaces settle and their separate prerequisites are met. D requires those interfaces, not necessarily their final visual acceptance. Public demonstration requires all mandatory gates in section 7.

### Verified reuse map

| Existing location | Reuse / restriction |
|---|---|
| `scripts/room_workflow/broker.mjs` | `createBroker(options)` loopback service, owner session, CSRF/origin checks and injected collaborators. Add isolated world routes; do not send text through its photo intake. |
| `scripts/room_workflow/crime-scene.mjs` | `sha`, `boundedFile`, `atomic`, `ownerLock`, `SceneError`/`fail`; preserve bounded regular-file and serialization behavior. Do not reuse the FFS notebook's domain content. |
| `scripts/room_workflow/eva-investigator.mjs` | Existing bounded remote connector is FFS-specific. Use its cancellation/receipt lessons, not its case prompt or historical evidence contract. |
| `week4/core/validate.ts`, `week4/schemas/` | Existing Draft 2020-12 validation infrastructure; add a new schema family without broadening closed Paris schemas. |
| `week4/broker/src/` | Existing desktop policy has fake/unsupported OS adapters and only an in-memory journal. Preserve `StageBroker` and its fixed desktop effects; do not claim native deployment. |
| `week4/app/src/crime-scene/api.ts` | `sceneRequest<T>(path, csrf, signal, body?)`; reuse transport while making error copy suitable for new routes. |
| `week4/app/src/room/verified-mesh.ts` | `verifiedMesh(url, {bytes,sha256}, signal, progress)` verifies bounded download and hash. It does not validate semantic catalog rights or decoded GPU usage. |
| `week4/app/src/crime-scene/panorama.ts` | Reviewed material/disposal patterns; existing two-texture, pinned-room loader is not generic world admission. Do not weaken it to load arbitrary scenes. |
| `week4/app/src/App.tsx` | Add an explicit `scene=text-world` entry; leave existing source/reference routes intact and never use them as failure fallback. |
| `week4/app/scripts/browser-options.mjs` | Reuse browser selection, not historical cloud-only capture assumptions. |
| `week4/app/package.json` | Node tests use `node --test`; `typecheck` and `build` invoke `build:rust` first. Missing wasm-bindgen tooling is a reported blocker, not permission to install it. |

The current panorama launch/capture scripts target `?scene=crime-scene` and specific `.panorama-app` states. They remain historical reference tools; the new installation gets a dedicated launcher and smoke test targeting `?scene=text-world`. Do not rename old screenshots or repurpose a passing historical result as evidence for the new world.

### New-module map

- Shared data/core: `week4/core/case-world-types.ts`, `case-world.ts`, `case-world-resolution.ts`; schemas `week4/schemas/case-world.schema.json`.
- Private service: `scripts/room_workflow/case-world.mjs`, `case-world-jobs.mjs`, `case-world-policy.mjs`, `case-world-conversation.mjs`, `case-world-speech.mjs`, `case-world-assets.mjs`, `case-world-planner.mjs`.
- Geometry pipeline: `scripts/room_workflow/case_world_layout.py`, `case_world_trellis.py`; `scripts/room_workflow/case-world-normalize.mjs`.
- UI/renderer: `week4/app/src/crime-scene/world/WorldApp.tsx`, `world.css`, `geometry.ts`, `renderer.ts`, `projection.ts`, `tracking.ts`, `tracking.worker.ts`, `audio.ts`.
- New scoped policy: `week4/broker/src/world_policy.rs`, `week4/broker/src/bin/world-policy.rs`.
- Tests: `week4/tests/case-world-*.test.ts`, `scripts/room_workflow/case-world-*.test.mjs`, `week4/app/tests/world-*.test.ts`; Python `test_case_world_layout.py` and `test_case_world_trellis.py` beside their implementations.
- Reusable synthetic fixtures: `week4/fixtures/case-world/pool.json`, `shop.json`, and `week4/tests/case-world-fixture.ts`. No private assets in fixtures.
- Delivery evidence: `docs/design/acceptance/eva-text-world-{core,display,conversation,generation,investigation,release}.md` and scoped Weave revision folders.

These are bounded modules, not permission to create empty scaffolding up front. Create each file in its owning task.

### Commands and dependency rules

Run from repository root unless stated otherwise. Existing broad commands to retain: `npm run room:test`, `npm --prefix week4 test`, `npm --prefix week4 run typecheck`, `npm --prefix week4/app test`, `npm --prefix week4/app run check`; `npm run rust:test` if Rust changes. Targeted commands in tasks are planned commands, not tests run while writing this document.

Core tests use `node --test week4/tests/<name>.test.ts`; app tests use `node --test week4/app/tests/<name>.test.ts`; service tests use `node --test scripts/room_workflow/<name>.test.mjs`. These match the inspected Node test scripts; do not add tsx or a new test framework. New pure shared TypeScript must use Node >=22.18-compatible erasable syntax and explicit relative `.ts` imports; prove `.mjs` interoperability in A1 instead of assuming the existing bundler-oriented validator can execute directly. Run Python checks with `python -I -m unittest discover -s scripts/room_workflow -p 'test_case_world_*.py'` only after dependencies are approved/available.

New dependencies are added only with their consuming task and a version/rights/build review: OR-Tools in B1; tracking models in B3; speech/VAD/provider SDKs in C; generation tools/weights in D1; Spark only in X1; Tauri only in R2. Lock exact deployed versions. No `npx` auto-install, broad upgrade or provider fallback.

### A0 — Reconcile active scope and record the baseline

**Files:** Modify `PLANNING.md`, the active-scope paragraphs of `AGENTS.md`, `CLAUDE.md` and `DESIGN.md`, and `docs/design/VOICE_PROMPTING.md`; preserve historical content and safety rules. Record `docs/design/acceptance/eva-text-world-core.md`.

**Interfaces:** Consumes specification rev 15 and this reviewed plan; produces one consistent active-scope reference and an explicit short-dialogue exception, not execution authority.

- [ ] Inspect current status/diff and exact target paragraphs; preserve concurrent changes.
- [ ] Update only active direction/references to the new fictional text-to-world scope, retaining typography, safety, Weave and source-preservation rules. Record the 5–40-word short-turn guidance as an exception to the older authoring target, not a provider restriction.
- [ ] Record baseline commands, versions, current blockers and source/reference routes; do not run GUI/model workloads.
- [ ] Run `git diff --check`; verify referenced local files and scope consistency. Expected: no stale active instruction directing implementers to panorama-only work, no weakened safety rule.
- [ ] Review checkpoint: owner accepts scope reconciliation; no commit unless separately requested.

## 2. Work package A — contracts, state and recovery

### A1 — Canonical records and admission schema

**Files:** Create `week4/core/case-world-types.ts`, `week4/schemas/case-world.schema.json`, `week4/tests/case-world-schema.test.ts`, `scripts/room_workflow/case-world-validation.mjs`, `case-world-contract.test.mjs`, the two JSON fixtures and `week4/tests/case-world-fixture.ts`. Modify `SCHEMA_NAMES`, `SchemaName`, `SCHEMAS` and `BYTE_LIMITS` registration in `week4/core/validate.ts`; do not alter Paris schema definitions.

**Interfaces:** Define/export `CaseSpec`, `ArtDirection`, `ScenePlan`, `AssetRecord`, `WorldState`, `ScenePatch`, `ContributionEvent`, `HypothesisRecord`, `ConfirmedAccount`, `NarrativeClaim`, `TurnInput`, `JobReceipt`, `GrantRef`, `ResourceBudget`, `Vec3 = readonly [number,number,number]` and `Result<T> = {ok:true,value:T}|{ok:false,code:string}`. Fields follow spec section 4; discriminated record kinds allow one closed `case-world` schema family. Fixture module exports `poolFixture` and `shopFixture`, each with `caseSpec`, `plan`, `assets`, `budget`, `account` and `patch` test records. Add the TS schema entry using existing `validateValue`/`parseJson`; the Node adapter exposes `validateWorldRecord(value):Result<CaseWorldRecord>` against the same JSON schema, using the existing JS/Ajv2020 pattern from `eva-investigator.mjs`, not an import of bundler-oriented `validate.ts`. Define `CaseWorldRecord` as the canonical discriminated union. Set serialized record limit to 256 KiB in both adapters; this is a new bounded design choice, not a provider limit.

- [ ] Write `rejects_unknown_authority_and_unbounded_fields`, `rejects_nonfinite_or_external_asset_references`, `keeps_existing_stage_schemas_closed`. Assert `ok === false` for injected `grant`, URL/path assets, NaN/infinity, unknown kinds and arbitrary scene IDs sent to the old stage schema; both new synthetic fixtures validate.
- [ ] Run `node --test week4/tests/case-world-schema.test.ts scripts/room_workflow/case-world-contract.test.mjs`. Expected red: missing schema/registration or absent new types, not a downloaded dependency failure. The service test imports the new pure `.ts` core through `.mjs` and verifies schema parity with the TS adapter.
- [ ] Define the records and closed schema. Use catalog IDs/hashes rather than paths; source-linked grant references are supplied by the trusted host, never accepted as model authority. Keep exact per-prop limits from Global Constraints. Bound strings, arrays and aggregate counts through `ResourceBudget`; fixture budgets must be explicit.
- [ ] Run focused tests plus `npm --prefix week4 test` and `npm --prefix week4 run typecheck`. Expected: new schema passes and existing schema behavior is unchanged.
- [ ] Review checkpoint: freeze the field names before A2–D consume them; record limitations, no automatic commit.

### A2 — Pure scene transactions and case resolution

**Files:** Create `week4/core/case-world.ts`, `week4/core/case-world-resolution.ts`, `week4/tests/case-world-state.test.ts`, `week4/tests/case-world-resolution.test.ts`.

**Interfaces:** `createWorld(caseSpec:CaseSpec, plan:ScenePlan):Result<WorldState>`; `applyWorldPatch(state:WorldState, patch:ScenePatch):Result<WorldState>`; `recordContribution(state:WorldState, event:ContributionEvent):Result<WorldState>`; `evaluateAccount(caseSpec:CaseSpec, account:ConfirmedAccount, state:WorldState):Resolution`, where `Resolution.status` is `supported|unresolved|contaminated` with supporting/contradicting/missing IDs. All functions are pure; rejection cannot mutate input.

- [ ] Write tests: a stale `baseRevision` returns `stale_revision`; an accepted patch increments revision exactly once; changing the case hash fails; `structuredClone(before)` equals rejected state; a hypothesis-only proof produces `contaminated`, missing required canonical clues produces `unresolved`, and a confirmed canonical account produces `supported`.
- [ ] Run `node --test week4/tests/case-world-state.test.ts week4/tests/case-world-resolution.test.ts`. Expected red: missing functions or failed invariant assertions.
- [ ] Implement bounded patch operations and deterministic resolution. Preserve object IDs, case hash and contribution origins. Require confirmed proposition mappings; ambiguous natural language never enters `ConfirmedAccount` automatically. Undo is a new presentation revision, not erased history or restored permission.
- [ ] Run focused tests and full core tests/typecheck. Add a correction test proving a new evaluation can supersede an earlier contaminated explanation while keeping both records.
- [ ] Review checkpoint: fixture investigation resolves without any model; this proves semantics, not live generation.

### A3 — Durable private sessions and cancellable jobs

**Files:** Create `scripts/room_workflow/case-world.mjs`, `case-world-jobs.mjs`, `case-world-store.test.mjs`, `case-world-jobs.test.mjs`. Reuse helpers from `crime-scene.mjs` unchanged unless a demonstrated shared bug requires a scoped fix.

**Interfaces:** `createCaseWorld({directory, clock, interpret})` returns `read(owner)`, `start(owner, caseSpec, plan)`, `submit(owner, turn, context)`, `cancel(owner, jobId)`, `reset(owner)` and `dispose()`. `createWorldJobs({clock, dispatch})` returns `start(request)`, `cancel(jobId)`, `admit(jobId, candidate, current)` and `recover(receipts)`. `context` carries host-derived authority and abort signal; `interpret` is injected and disabled by default.

- [ ] Write tests asserting owner isolation, stale-revision rejection, symlink/oversize-file rejection, interrupted atomic-write recovery, bounded journal growth, cancellation-before-admission and reset-before-late-success. Use delayed fake dispatch; assert no late revision or duplicate insertion.
- [ ] Run `node --test scripts/room_workflow/case-world-store.test.mjs scripts/room_workflow/case-world-jobs.test.mjs`; expect red on missing modules/invariants.
- [ ] Implement single-owner serialized writes using `ownerLock`, `boundedFile`, `atomic` and `sha`. Append journal records under the same lock, bound total bytes, and checkpoint without losing required history. Bind jobs to session/turn/transcript/base revision and idempotency key. Reconcile uncertain provider outcomes before any retry.
- [ ] Re-run targeted tests and `npm run room:test`; expected green including double reset/cancel and restart with no automatic paid resubmission.
- [ ] Review checkpoint: default retention deletes participant content at explicit session end/reset; keep only separately authorized redacted operational receipts. Crash recovery does not revive leases. Document recoverable versus irrecoverable corrupt state.

### A4 — Additive HTTP routes and real world-effect policy

**Files:** Modify `scripts/room_workflow/broker.mjs`; create `scripts/room_workflow/case-world-policy.mjs`, `case-world-routes.test.mjs`, `case-world-policy.test.mjs`; create `week4/broker/src/world_policy.rs`, `week4/broker/src/bin/world-policy.rs`; export the new module from `week4/broker/src/lib.rs`. Do not widen `StageBroker`, `SceneId` or desktop effect IDs.

**Interfaces:** Add `caseWorldOptions` injection to `createBroker`. Routes under `/api/room-workflow/case-world/`: GET `status`, `history`; POST `start`, `turn`, `cancel`, `reset`. Every write uses existing owner-cookie/CSRF/origin controls. `authorizeWorldEffect(request, trustedGrant, nowMs):Result<WorldPermit>` is implemented by the Rust world-policy path; the Node adapter requires its real response before provider dispatch. A permit binds operation, input hash, session, limits, expiry and grant reference. Trusted grants come from operator-controlled storage, never the request/model payload.

- [ ] Write HTTP tests for missing/wrong owner, CSRF/origin, oversize/malformed bodies, unknown fields, stale revisions and unauthorized provider operations; assert no mutation or external call. Rust tests reject expired/revoked/mismatched-input grants and excess resources. Assert policy process unavailable means denied, never a JS permissive fallback.
- [ ] Run `node --test scripts/room_workflow/case-world-routes.test.mjs scripts/room_workflow/case-world-policy.test.mjs` and `npm run rust:test`; expect new tests red.
- [ ] Add the routes and a narrowly scoped policy module/CLI; use bounded framed JSON over stdin/stdout, no shell interpolation. Serialize budget reservation and idempotency in A3 before dispatch, then reconcile actual receipts. Do not call a fake native adapter production enforcement. Do not introduce desktop/window privileges for scene rendering.
- [ ] Re-run focused tests, `npm run room:test`, `npm run rust:test` and core checks. Preserve return shape and behavior of existing `createBroker` callers.
- [ ] Review checkpoint: service-only package A is accepted with provider routes disabled. No live provider call is authorized by a passing fake-provider test.

## 3. Work package B — procedural world and calibrated display

**Visual prerequisite for B1–B4:** before frontend code changes, obtain a fresh approved Weave packet for that bounded pass under `docs/design/revisions/eva-text-world-<pass>/` with `REVIEW.md`, inspected images/video, contact sheet, before/after captures and `provenance.json`. Do not assume one initial packet covers later tracking or conversation UI refinements.

### B1 — Procedural geometry and two-pass layout

**Files:** Create `week4/app/src/crime-scene/world/geometry.ts`, `week4/app/tests/world-geometry.test.ts`, `scripts/room_workflow/case_world_layout.py`, `test_case_world_layout.py`, and a pinned solver dependency file `scripts/room_workflow/case-world-layout-requirements.txt`.

**Interfaces:** `buildArchitecture(plan:ScenePlan):THREE.Group`; Python `solve_layout(plan:dict, actual_bounds:dict|None, limits:dict)->dict` returns `{status, placements, violations, elapsed_ms}`. Status values distinguish `feasible`, `optimal`, `infeasible`, `unknown`, `invalid`. The JSON worker consumes only validated data; CPU-only, bounded wall time and cancellation.

- [ ] Write geometry tests for walls/openings/basin bounds, stable object IDs, rejected nonfinite dimensions and disposal; solver tests assert non-overlap/support/clearance for both fixtures, hard rejection of impossible layouts, and that `unknown` does not become `infeasible`.
- [ ] Run `node --test week4/app/tests/world-geometry.test.ts` and `python -I -m unittest discover -s scripts/room_workflow -p 'test_case_world_layout.py'`. Expected red; missing approved dependencies are blockers, not installation permission.
- [ ] Implement the reviewed primitive grammar and CP-SAT placement with explicit integer scaling/orientation choices. Run preliminary bounds first and actual admitted bounds second; protect clue/view regions. Do not claim rectangle constraints prove general mesh collision.
- [ ] Run focused tests and app typecheck when its existing Rust toolchain is available. Include a late wider asset that cannot fit: expected rejection with old placements unchanged.
- [ ] Review checkpoint: fixtures demonstrate general parameterized construction, not a pool/shop preset selector. Record unsupported geometry classes.

### B2 — Persistent renderer and bounded asset loading

**Files:** Create `week4/app/src/crime-scene/world/renderer.ts`, `week4/app/tests/world-renderer.test.ts`, `world-assets.test.ts`; reuse `verified-mesh.ts` and reviewed material routines without weakening pinned panorama checks.

**Interfaces:** `createWorldRenderer(canvas, callbacks):WorldRenderer` exposes `stage(snapshot, assets, signal):Promise<StagedWorld>`, `commit(staged):void`, `setView(view):void`, `setInspection(mode):void`, `pause(value):void`, `dispose():void`. `assets` contains broker-admitted immutable IDs/hashes and bounded byte access, not model URLs. `callbacks` exposes errors/resource metrics, not provider authority.

- [ ] Write tests for aborted loads, corrupt bytes, external GLB references, decoded texture limits, preserved camera/selection, duplicate IDs and idempotent disposal. Stage rejection must not remove the last committed world.
- [ ] Run `node --test week4/app/tests/world-renderer.test.ts week4/app/tests/world-assets.test.ts`; expect red before implementation.
- [ ] Implement persistent object lookup and bounded staged deltas. Reuse hash verification, reject external dependencies through the loading manager, account for peak old+new resource overlap and protect clue materials. Keep runtime models unable to supply shader code. Geometry preparation tests may run without a browser; actual GPU claims may not.
- [ ] Re-run tests and app checks. In an explicitly authorized visual run, inspect same-camera before/after captures, missing assets, context loss and disposal counters.
- [ ] Review checkpoint: no memory/frame-rate claim from unit tests. Full resource budgets remain required before the live stability exercise.

### B3 — Calibrated off-axis camera and primary tracking

**Files:** Create `projection.ts`, `tracking.ts`, `tracking.worker.ts` under the world UI directory; tests `world-projection.test.ts`, `world-tracking.test.ts`; modify `week4/app/package.json`/lock only for the approved tracking dependency. Record private calibration outside public fixtures.

**Interfaces:** `computeWindowView(screen:ScreenCalibration, eye:Vec3, clip:ClipRange):Result<WindowView>`; `reduceTracking(state:TrackingState, sample:TrackingSample, nowMs:number):TrackingState`. Define these types in `projection.ts`/`tracking.ts`; `WindowView` contains projection/view matrices consumed by B2. Tracking state explicitly distinguishes acquiring, locked, held and fixed-view modes.

- [ ] Write projection tests mapping calibrated screen corners to expected clip-space corners for centered and lateral eyes. Assert invalid/behind-screen eyes and degenerate screens are rejected. Tracking tests cover two faces crossing, primary disappearance, reacquisition ambiguity, noise, seated mode and out-of-order samples.
- [ ] Run `node --test week4/app/tests/world-projection.test.ts week4/app/tests/world-tracking.test.ts`; expect red.
- [ ] Implement generalized screen-corner projection, bounded smoothing and explicit primary confirmation. Run MediaPipe in a worker; discard stale frames instead of accumulating a queue. Face matrices are not metric depth. Keep image frames local and ephemeral; no biometric identity store.
- [ ] Re-run tests. With camera/render authorization, measure actual screen/camera transform and usable viewing volume on the Kiyo/Alienware setup. Test stable fixed-view fallback and reduced motion; record external motion-to-photon evidence.
- [ ] Review checkpoint: owner accepts calibration/comfort and tracking-loss behavior; no guarantee of correct viewpoints for spectators.

### B4 — Installation shell, navigation and offline launch

**Files:** Create `WorldApp.tsx`, `world.css`, `week4/app/tests/world-initialization.test.ts`, `world-controls.test.ts`, `week4/app/scripts/world-demo.mjs`, `world-smoke.mjs`. Modify `week4/app/src/App.tsx`, `crime-scene/api.ts`, `week4/app/package.json` and root `package.json` only for explicit new launch/check scripts.

**Interfaces:** New `?scene=text-world` lazy entry consumes A4 status/history and B2 renderer; add root `world:demo` invoking the dedicated provider-disabled launcher. New UI states expose inspectable/case-ready/complete distinctions, contribution history, cancel/reset, subtitles and operational status. Historical routes are retained references, never automatic fallback.

- [ ] Write tests for repeated mount/unmount, Escape/cancel/reset semantics, preserved focus after history dismissal, keyboard/touch parity, reduced motion and unavailable broker. Assert no old scene is silently loaded when the new route fails.
- [ ] Run `node --test week4/app/tests/world-initialization.test.ts week4/app/tests/world-controls.test.ts`; expect red.
- [ ] Build the minimal shell using existing typography/control idioms. Reuse `sceneRequest` while adding accurate world-route errors and keeping old route error behavior. The offline launcher injects fake providers that throw on attempted network calls, uses a disposable private directory and cleans only its owned resources.
- [ ] Run app tests/check. After explicit local authorization, run `npm run world:demo`, then `node week4/app/scripts/world-smoke.mjs <approved-output-directory>`. Record actual screenshots, keyboard/focus/touch and no-network evidence.
- [ ] Review checkpoint: an offline interaction shell works; it is visibly labelled synthetic and is not accepted as live generation.

## 4. Work package C — conversation and interruption

### C1 — Bounded narrator and transcript semantics

**Files:** Create `scripts/room_workflow/case-world-conversation.mjs`, `case-world-conversation.test.mjs`; extend A1 records as required through a reviewed schema change; modify `case-world.mjs`/routes to call the injected conversation interface, not the old FFS investigator.

**Interfaces:** `createWorldConversation({narrator, verifyClaim, clock})` exposes `respond(turn:TurnInput, state:WorldState, context):Promise<ConversationResult>` and `cancel(turnId)`. Define/export `ConversationResult = {turnId, transcriptRevision, claims, patchProposal, clarification}` in A1 types. `verifyClaim(claim, state, receipts):Result<NarrativeClaim>` is deterministic for operational claims; reviewed fictional rules distinguish permitted misdirection. `narrator` is a provider-neutral injected function; the live adapter uses the official Anthropic SDK only after access/dependency approval.

- [ ] Write tests for a question, correction, hypothesis, edit and unclear reference. Assert partial/revised ASR cannot create confirmed testimony, falsely completed jobs cannot be spoken as complete, and low confidence cannot grant authority. Test 'could have moved' versus 'I saw' explicitly.
- [ ] Run `node --test scripts/room_workflow/case-world-conversation.test.mjs`; expect red.
- [ ] Implement turn/transcript revision checks, bounded context selection and verified semantic speech units. Separate planning and narrator contexts. Render plain text only; do not forward unfiltered provider logs or model authority fields. Clarification has no scene side effect.
- [ ] Re-run service/core tests. With deterministic fake responses, prove corrected contribution history survives unreliable fictional narration and that cancelled turns cannot emit claims or patches.
- [ ] Review checkpoint: offline conversation semantics pass. Live model access, latency and voice delivery remain unproven; no provider call occurs by default.

### C2 — Scribe, retained v3 and local interruption

**Files:** Create `scripts/room_workflow/case-world-speech.mjs`, `case-world-speech.test.mjs`, `week4/app/src/crime-scene/world/audio.ts`, `week4/app/tests/world-audio.test.ts`; modify WorldApp only under a fresh scoped visual/motion packet. Add approved speech/VAD dependencies and pinned models through their consuming manifests.

**Interfaces:** `createWorldSpeech({stt, tts, policy, clock})` exposes `openInput(session, context)`, `synthesize(claim, context)` and `cancel(turnId)`. `createWorldAudio(context, onSpeech):WorldAudio` exposes `enqueue(chunk, turnId)`, `interrupt()`, `setEnabled(value)` and `dispose()`. Input and audio chunks have byte/duration/rate bounds, session/turn IDs and sequence numbers. Backend retains provider secrets; the canvas renderer receives no microphone capability.

- [ ] Write tests for interruption before/between chunks, late chunks after reset, changed transcript revision, denied microphone/consent, oversized/invalid audio, echo-trigger false activity and TTS failure. Assert interrupt stops/clears local playback immediately and late IDs never play.
- [ ] Run `node --test scripts/room_workflow/case-world-speech.test.mjs week4/app/tests/world-audio.test.ts`; expect red.
- [ ] Implement separate transcription/synthesis adapters, local VAD and playback invalidation. Keep `eleven_v3`/Natural direction; verify its supported transport rather than assuming generic WebSocket support. Preserve textual replies on no-audio failure. No XML/SSML or unreviewed voice tags. Raw audio stays ephemeral by default.
- [ ] Re-run tests; with a separately approved synthetic speech budget and actual microphone/speakers, measure end-of-turn, first verified audio, interruption, echo and spectator false triggers. Listen to the exact selected voice. Record the full latency chain.
- [ ] Review checkpoint: accept character delivery and acoustic behavior separately from API success. If targets fail, report them; do not silently switch models or present push-to-talk as full-duplex success.

## 5. Work package D — live generation and investigation

### D1 — Novel prop generation, normalization and admission

**Files:** Create `scripts/room_workflow/case-world-assets.mjs`, `case-world-normalize.mjs`, `case_world_trellis.py`, `case-world-assets.test.mjs`, `case-world-normalize.test.mjs`, `test_case_world_trellis.py`, and pinned build/dependency manifests beside the worker. Reuse A3/A4 jobs, grants and receipts.

**Interfaces:** `createWorldAssets({referenceProvider, meshWorker, normalize, policy})` exposes `request(propCard, context):Promise<JobReceipt>` and `admit(raw, propCard, context):Promise<Result<AssetRecord>>`. `normalizeGlb(input, budget, protectedFeatures):Promise<NormalizationReport>` emits raw/derivative hashes, resource counts, dimensions and reports. Python `generate_prop(request:dict)->dict` runs only a pinned admitted image→TRELLIS job; it cannot execute model-supplied code.

- [ ] Write tests for duplicate idempotency keys, provider timeout with unknown completion, unsupported rights, external URIs, corrupt GLB, more than 50,000 triangles, 20 MiB payload, 2048-pixel textures, five material slots, excessive decoded memory and protected clue damage. Use valid/invalid synthetic bytes, never private photos.
- [ ] Run `node --test scripts/room_workflow/case-world-assets.test.mjs scripts/room_workflow/case-world-normalize.test.mjs` and the isolated TRELLIS worker unit tests with mocked model invocation; expect red before implementation.
- [ ] Implement FLUX.2 [flex] reference generation and a pinned TRELLIS.2 Modal worker behind disabled-by-default adapters. Require explicit weight-build/download approval and separate inference grants. Normalize units/origin/PBR using glTF Transform, run Khronos validation plus EVA admission, and preserve raw outputs. Reject unsupported repairs; no hidden Blender artist step.
- [ ] Run offline tests. Then, only with a finite one-prop grant, measure cold/warm components, cost, output quality, cancellation and actual GLB insertion. Use one GPU job at a time and a stated no-blind-retry rule; reconcile provider request IDs after uncertain outcomes.
- [ ] Review checkpoint: a genuinely novel synthetic prop arrives through admission. A failed/missing prop remains failed/pending, not secretly replaced by stock furniture.

### D2 — Live case/room planner and generation coordinator

**Files:** Create `scripts/room_workflow/case-world-planner.mjs`, `case-world-planner.test.mjs`; modify `case-world.mjs` and A4 route wiring. Consume B1 solver, D1 assets and C1 narrator through their established interfaces.

**Interfaces:** `createWorldPlanner({planner, solve, assets, clock})` exposes `compose(prompt, context):Promise<WorldCandidate>` and `revise(state, request, context):Promise<ScenePatch>`. `WorldCandidate` is `{caseSpec, artDirection, plan, assets, readiness}`; define it in A1 types. `planner` is a bounded provider-neutral function, with proposed Opus 5.5 live adapter and separate context from narration.

- [ ] Write tests that distinct prompts change semantic architecture/case plans, not just a preset ID; repeated input may create a new valid composition. Assert arbitrary code/URLs and invalid case/clue relations are rejected; no paid calls occur without A4 permission. Unknown solver status must not be interpreted as infeasible.
- [ ] Run `node --test scripts/room_workflow/case-world-planner.test.mjs`; expect red.
- [ ] Implement interpretation → case/art direction → structured plan → preliminary solve → architecture/assets → normalization → final actual-bounds solve → staged candidate. Freeze the case only on the first coherent commit. Preserve object IDs on revisions; failed new assets do not regenerate the world. No unbounded self-critique/retry loop.
- [ ] Re-run service/core tests with fake providers. Under an approved finite live quote, exercise ocean→interior, city→interior and an unfamiliar suggestion; save actual plans, receipts and case-readiness states. Do not pre-author the resulting room layouts.
- [ ] Review checkpoint: live novel composition is evidenced; distinguish inspectable, case-ready and complete timings. Missing required clues block supported resolution.

### D3 — Integrated investigation and continuity

**Files:** Modify `case-world.mjs`, `case-world-conversation.mjs`, WorldApp and its renderer/audio callers; add `scripts/room_workflow/case-world-integration.test.mjs`, `week4/app/tests/world-investigation.test.ts`; extend `world-smoke.mjs` and acceptance record `eva-text-world-investigation.md`.

**Interfaces:** Integrate `ConversationResult.patchProposal` through `applyWorldPatch`, never direct renderer mutation. Confirmed accounts go only through `evaluateAccount`. Adopt assets through A3 job lineage and A4 current grants. Preserve camera/selection across every accepted revision.

- [ ] Write the full synthetic scenario: suggest room, create case, propose chair obstruction, cancel an asset, deliver its late success, correct EVA's misattribution, undo presentation, then resolve. Assert no stale insertion/audio, canonical clues unchanged, correction preserved and contaminated evidence cannot self-validate.
- [ ] Run `node --test scripts/room_workflow/case-world-integration.test.mjs week4/app/tests/world-investigation.test.ts`; expect red where integration is missing.
- [ ] Wire the smallest stateful integration, including explicit clarification, job progress, history correction and accessible fixed-view investigation. Apply a fresh Weave packet before the UI pass. Do not add a physics engine to animate unsupported contact claims.
- [ ] Run all mandatory tests, approved browser captures and a finite live scenario. Inject disconnect, renderer loss, provider refusal and reset during each stage. Compare expected and actual ending from records, not narration alone.
- [ ] Review checkpoint: owner accepts the integrated experience, with the case locally resolved where supported and EVA's motives optionally unresolved. Offline fixtures are retained as regression evidence, not presented as live model results.

## 6. Optional experiments — Spark and Jev

### X1 — Spark hybrid visual comparison

**Files:** Only after experiment approval: create `week4/app/src/crime-scene/world/splats.ts`, `week4/app/tests/world-splats.test.ts`; modify renderer and app manifest/lock; add `docs/design/acceptance/eva-text-world-spark.md`. Do not add the dependency to the default bundle before this task is approved.

**Interfaces:** `loadSplatLayer(record:AssetRecord, budget:ResourceBudget, signal:AbortSignal):Promise<SplatLayer>`; `SplatLayer` exposes `object`, `setTransform`, `setVisible`, `metrics` and `dispose`. Keep all case/interaction IDs in EVA; critical clue picking uses proxy geometry.

- [ ] Write tests for unsupported formats/external dependencies, cancellation, disposal, resource rejection and distinct object IDs; assert a whole-room splat never becomes a semantic object catalog automatically.
- [ ] Run `node --test week4/app/tests/world-splats.test.ts`; expected red before implementation.
- [ ] Verify the actual installable Spark release/peer dependency and pin it. Implement only a bounded hybrid layer; recognize SPZ loading versus precomputed RAD paging. No arbitrary runtime shader code or automatic Marble generation.
- [ ] With fresh Weave guidance and explicit rendering authorization, compare the same scene/camera path with and without splats: opacity/depth, glass, LOD transitions, asymmetric projection, visual benefit and peak memory. Record all failures; do not assume unloaded regions can be picked.
- [ ] Review checkpoint: adopt only if improvement justifies costs and no mandatory gate regresses. Otherwise remove the experimental runtime import/dependency, retaining evidence. A Marble pilot needs separate rights/access/latency/cost approval.

### X2 — Jev nonblocking decision assistance

**Files:** Only after experiment approval: create `scripts/room_workflow/case-world-jev.mjs`, `case-world-jev.test.mjs`; modify C1's optional injected hint source; add `docs/design/acceptance/eva-text-world-jev.md`.

**Interfaces:** `classifyTurn(turn:TurnInput, context):Promise<IntentHint>`; `IntentHint` contains predefined labels/scores, session/turn/transcript revision and expiry. Define it in A1 types. C1 may consume a timely hint at a planning opportunity but never awaits it to start normal narration.

- [ ] Write tests for a slow/unavailable classifier, wrong classifications, stale transcript revisions and attempted authority fields. Assert baseline narration proceeds, interruption remains local and no hint directly mutates a scene or history.
- [ ] Run `node --test scripts/room_workflow/case-world-jev.test.mjs`; expected red before implementation.
- [ ] Verify actual access/API contract and implement bounded parallel classification only. Start with question/correction/hypothesis/edit/unclear-reference labels; do not infer emotions or trust probabilities as calibrated truth.
- [ ] With an approved evaluation allowance, compare same-input decision accuracy and whole-turn tail latency against C1 without Jev. Record sample count, errors and costs; schema conformity is not correctness.
- [ ] Review checkpoint: keep Jev optional unless demonstrated benefit warrants making it standard. If it adds no useful value, leave it absent rather than adding a configuration surface for future use.

## 7. Acceptance, release and rollback

### R1 — Repeatable regression and measured resource harness

**Files:** Create `scripts/room_workflow/case-world-evidence.mjs`, `case-world-evidence.test.mjs`; extend `world-smoke.mjs`; create/update the six mandatory acceptance records listed in section 1. No database/dashboard is required.

**Interfaces:** `summarizeRun(events, limits):RunEvidence` reports source/dependency/model revisions, sample count, cold/warm status, stage durations, failures, costs, RAM/GPU peaks and cleanup. Inputs are actual event timestamps, not animation progress. Unknown values remain unknown. Define `RunEvidence` in the evidence module.

- [ ] Write tests that rejected/time-out jobs remain in the denominator, a single sample cannot establish p95, missing stages cannot produce end-to-end success, and incomplete resource/cancellation evidence cannot pass release.
- [ ] Run `node --test scripts/room_workflow/case-world-evidence.test.mjs`; expected red.
- [ ] Implement bounded machine-readable reports and a Markdown evidence summary. Capture external motion-to-photon separately from JS timing; record stage boundaries and provider charges independently.
- [ ] Run existing core/service/app checks. With explicit local/cloud/camera authorizations, execute the 30-minute/10-cycle exercise at agreed budgets, real voice interruption, accessibility checks and matching captures. Use proposed p95 targets from Global Constraints; report miss, not success-by-renaming.
- [ ] Review checkpoint: owner accepts each mandatory phase against a reproducible revision. Existing unrelated failures are identified, not silently waived or attributed to this feature.

### R2 — Tauri packaging and least-privilege deployment

**Files:** Proposed new scoped shell `week4/desktop/package.json`, `week4/desktop/src-tauri/{Cargo.toml,tauri.conf.json,src/main.rs,capabilities/default.json,tests/world_capabilities.rs}`, plus `week4/desktop/README.md` and `docs/design/acceptance/eva-text-world-desktop.md`. Modify `week4/Cargo.toml` to register `desktop/src-tauri` alongside the existing `broker` and `renderer` workspace members. Confirm the directory is absent and exact Tauri v2 conventions before creation; do not overwrite any concurrent shell work.

**Interfaces:** The shell hosts the reviewed app and launches only the bounded local broker/policy sidecars with fixed arguments. Expose allowlisted application commands and asset byte access; no arbitrary shell/filesystem/network plugin for scene content. The renderer has no provider credentials or unrestricted IPC. Browser acceptance does not imply this WebView path passes.

- [ ] Define `world_capabilities.rs` tests for denied arbitrary IPC/path/network operations, wrong origin, sidecar failure and clean stop. Run `cargo test --manifest-path week4/desktop/src-tauri/Cargo.toml --test world_capabilities`; expected initial result is a missing/unimplemented boundary, then explicit denial assertions once scaffolded. Test real WebView behavior separately; unit tests cannot prove it.
- [ ] After explicit dependency/toolchain approval, create the minimum Tauri 2 shell using current official contracts; do not introduce desktop wallpaper/window staging or broaden the old Rust IDs.
- [ ] Package a provider-disabled synthetic build first and verify its actual Windows WebView, camera/audio permissions, GLB decoding and teardown. External assets remain broker-admitted bytes; credentials remain host-side.
- [ ] Re-run R1's relevant tests in the packaged runtime with proper approvals. Test sidecar crash/restart without automatic paid-job replay and revocation without restored grants.
- [ ] Review checkpoint: if packaging cannot meet boundaries or rendering targets, keep it blocked and report the browser prototype as such. No installer distribution or exhibition release is implied.

### R3 — Exhibition commissioning and rollback

**Files:** `docs/design/acceptance/eva-text-world-release.md`; approved private calibration/configuration and retained run receipts. No new feature is scheduled in this task.

**Interfaces:** Consumes accepted core/display/conversation/generation/investigation/package revisions, exact asset/model locks and an approved operation envelope. Produces the owner release decision plus a reproducible launch/stop/reset procedure.

- [ ] Verify actual 2304×1152 signal path, 2:1 crop, 6×3 wall geometry, display dimensions, color/luminance, microphone/speakers and spectator area. Recalibrate; monitor calibration is not transferable by aspect ratio alone.
- [ ] Rehearse invitation, consent, two novel interpretations, an unfamiliar suggestion, corrections, tracking loss, interruption, network failure, kill switch, deletion and restart. Include seated and fixed-view access.
- [ ] Record expected/actual results and explicit decision/date. Owner acceptance is not institutional study approval; production accounts, participant collection and public exhibition remain separate scopes.
- [ ] Rehearse rollback: stop audio and new dispatch, cancel/reconcile jobs, preserve redacted receipts, restore the last accepted application+schema-compatible assets without reviving permissions. If no accepted revision is safe, display truthful unavailable status; never substitute a prerecorded room as a live result.
- [ ] Release only on explicit owner instruction. No automatic commit, publish, install distribution or budget extension.

## 8. Coverage, sequencing and execution handoff

### Dependency sequence and independent deliverables

`A0 → A1 → A2 → A3 → A4` establishes the core. `B1 → B2 → B3 → B4` establishes the display candidate after A contracts and visual prerequisites. `C1 → C2` establishes conversation after A. `D1` can develop against A's fake job interfaces while B/C proceed; `D2` needs A, B1 and D1; `D3` integrates A–D. `R1` measurements accumulate throughout; `R2` verifies deployment; `R3` is the final release gate. X1 requires B2/B3; X2 requires C1. Neither X task is mandatory or a reason to delay the core.

One writer per overlapping module. Keep coupled A/B/C interfaces with the lead until stable. If the owner chooses parallel implementation, use existing project agents, normally at most three concurrent workers, and isolated worktrees only when explicitly authorized/required for parallel writers. Read-only reviews may share the checkout. Record actual tools/model routes; role aliases are not proof of execution. No swarm is needed merely to execute this plan.

### Spec-to-task coverage

| Specification requirement | Owning tasks |
|---|---|
| Scope, live novelty, fixed case, short-voice policy | A0, A1, A2, D2 |
| Invitation/investigation/resolution lifecycle and truthful readiness | A2, B4, D2, D3 |
| Architecture/provider separation and Rust authority | A4, C1, D1, R2 |
| Canonical records, provenance, contributions and deterministic outcomes | A1–A3, D3 |
| Two-pass layout, procedural geometry, art direction and asset admission | B1, B2, D1, D2 |
| Off-axis calibration, primary tracking and accessibility | B3, B4, R1, R3 |
| Narration, retained v3, interruption and ASR correction | C1, C2, D3 |
| Persistence, idempotency, cancellation, reset and recovery | A3, A4, C2, D3 |
| Privacy, consent, finite resources, deletion and kill switch | A3, A4, C2, D1, R1–R3 |
| Spark hybrid comparison / Marble boundary | X1 |
| Jev nonblocking classifications | X2 |
| Verification, visual prerequisites, release and rollback | Every task checkpoint; R1–R3 |

### Initial execution checklist

- [ ] Owner reviews this written plan and chooses execution method; no implementation starts from planning authorization alone.
- [ ] Recheck baseline/diff and any edits to spec revision 15. Reconcile, do not overwrite.
- [ ] Begin A0–A4 only. Report passed/failed/blocked/not-run tests honestly and obtain the core review decision.
- [ ] Request finite visual/toolchain/local/cloud authorizations exactly when their work package needs them; do not bundle unrelated approvals or inherit old allowances.
- [ ] Keep source and live-plan copies synchronized at accepted checkpoints. If reviewers edit the live plan, read and merge before updating the repository copy.

### Plan self-review and known boundaries

Every spec section maps to at least one owning task. Review Focus's five risks have explicit assertions in their owning tasks. Shared names/signatures are defined before consumers; new-module paths are proposals and existing reuse paths were inspected. No existing FFS or Paris behavior is silently broadened into text-to-world. Fixtures and fake providers are labelled scaffolding, not completed live behavior.

This plan deliberately does not supply implementation bodies, invent successful provider access, quote unverified prices, specify an unapproved GPU allowance or prescribe worktree/commit actions. Exact platform packaging APIs, provider locks and a suitable real-hardware measurement harness must be verified in their owning tasks; their absence blocks the corresponding gate rather than granting freedom to bypass it.

**Recommended execution:** Native, work-package by work-package, with independent review at the authority boundary and before integrated/release acceptance. This keeps tightly coupled contracts in one context and avoids a fresh worker/reviewer for every small step. Subagent-driven execution remains an owner-selectable alternative with higher context cost. Review the plan and choose the method before implementation.

**Not run while planning:** application tests, builds, installations, camera/microphone capture, browser rendering, model inference, paid cloud jobs or exhibition measurements. Current source inspection and document checks do not establish runtime readiness.
