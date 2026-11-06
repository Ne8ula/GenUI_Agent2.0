# Teal bedroom geometry repair

Status: owner rejected the ridged depth-relief fixture and requested creative liberty plus an immediately opening visual demo. It is now replaced by an authored ivory/brass ceiling light, auto-loaded with the source scan; no upload controls or new paid calls. Current evidence: [authored-light acceptance](../../acceptance/teal-bedroom-authored-light-v1.md). Earlier depth-patch results below are retained history, not the current visual candidate. Owner acceptance pending.

## Scope and prerequisite

2026-10-22: owner requested filling black gaps using 3D depths and rough estimates, especially replacing the fragmented ceiling light with a coherent object. They approved the bounded geometry-first approach and explicitly selected **Repair; waive Weave (Recommended)** for this pass. They then approved **masked image repair → depth-constrained completion**, using Matrix as the user-facing presentation and their supplied repaired image as an appearance reference. Fresh authorization: up to three masked edits / 24 Weave credits, one Modal attempt / 900 GPU seconds / $5 operational ceiling; selected mesh/renders/masks/approved image may be uploaded. No automatic retries or public hosting. The dollar ceiling is operational, not a provider-enforced billing cap. The owner subsequently approved all three exact 8-credit image quotes. All three Weave runs completed (24 quoted credits committed; provider balance/charge settlement unavailable). No Modal execution occurred in this repair pass. Earlier teddy reference is not reused as a substitute.

Preserve original PLY, source hash, camera continuity and teddy history. Add a separately switchable inferred completion layer for this bedroom only. Prioritize complete ceiling-light shape, wall/ceiling/floor/wardrobe gaps, and keep doorway/window locations distinguishable. Do not invent adjoining rooms or claim exact physical dimensions. No animation introduced.

## Evidence and implementation criteria

The renderer currently displays the unmodified PLY only. Source annotation provides bed and cabinet boxes in scan coordinates, not a light annotation. Inspected retained RGB contact sheet shows the bedroom/wardrobe but no ceiling fixture; it incidentally includes labeled held-out thumbnails and is not used for benchmark evaluation. Physical RGB-D registration is unresolved. This pass is authored scan-aligned approximation for presentation, not new reconstruction, calibrated depth fusion, or an automatic general-room completion method.

Use browser viewing and existing annotation coordinates for visual estimation; no local reconstruction batch, model installation or GPU processing. Before/after captures must match camera positions. Synthetic tests must cover closed inferred object geometry, finite bounded meshes, provenance separation, protected openings and unchanged source. Browser checks must cover raw/completed toggling, multi-angle visibility, teddy history/camera continuity and resource cleanup. Reject candidates that cover known objects or merely replace holes with conspicuous flat polygons.

## Checks

Read-only reuse audit completed: existing Python room shells protect rectangular openings but require reviewed boundaries; old Hypersim plane fitting is dataset-specific, and furniture templates lack luminaires. The development-only source capture exports RGB, binary geometry mask, alpha edit mask and float32 camera-Z without teddy geometry or camera movement. Earlier checks in this pass: camera-ray unit test RED→GREEN; synthetic GPU plane at Z=2 across all 262,144 pixels; three source-only captures; TypeScript/build; 277 app and 103 core tests. Those checks are not evidence of completed repair.

## Image result gate — 2026-10-22

The initial official upload was denied. Following the owner's explicit authorization for one retry, the same official route successfully uploaded the six source/mask PNGs; no alternate host, permission change or second retry. Their supplied image 12 informed visual intent but was not uploaded.

Official Figma MCP `weave_run_model`, GPT Image 2.5 / Sunburst, model `2db90e64-51dd-45b2-870a-66d19a81118e`; high-quality square opaque PNG masked edits, 8 quoted credits each. All three statuses were observed as `COMPLETED` through `weave_get_model_run_output`. Raw results were downloaded separately into `.local/reconstruction/teal-bedroom-repair-generated-v1/`; original 512×512 captures remain in `.local/reconstruction/teal-bedroom-repair-input-v3/`. Raw outputs are 816×816. Hashes and run IDs are in [provenance.json](provenance.json). No token-bearing URLs are retained here.

Direct visual comparison of all three source/output pairs rejects them before depth inference:

| View | Observed mismatch | Decision |
| --- | --- | --- |
| Wall | Changes the bed, bedding, lamp and picture; the wall corner moves substantially relative to the captured frame. | Reject: not registered to the source depth/mask. |
| Wardrobe | Enlarges/shifts the left doorway; shifts the wardrobe boundary and ceiling-wall junction. | Reject: the protected opening and known surfaces no longer align. |
| Ceiling | Produces a more continuous-looking ceiling and fixture but removes the visible lower wall/ceiling boundary and changes the fixture silhouette. | Reject: attractive completion is not enough to establish alignment. |

Resolution normalization alone cannot undo these layout changes. Pasting generated pixels only inside the original mask would preserve source RGB outside it, but would not establish correct semantics or depth inside it. No resized/composited image was admitted, no replacement `*-repaired.png` was fabricated, and no reconstruction was run locally or on Modal. The original PLY rehash still matches `d3296808e9cb9deec138fa1fce02495d5f84a0e894f56008d7013aedc7721bdc`.

## Historical adapter review — superseded for the ceiling-only route

The isolated implementation worker prepared four `bedroom_repair_*.py` / `test_bedroom_repair.py` files; its reported 28 synthetic passes have not been independently rerun by the lead. They remain unintegrated in `.claude/worktrees/agent-a9b252412f2d35439/scripts/reconstruction/`. A read-only `eva-reviewer` run reported Opus 5.5 and inspected pinned GenRC API excerpts, confirming the intended IronDepth tensor/mask/K contract. This is source inspection, not inference evidence.

Review identified two unresolved pre-execution controls: startup plus function timeouts can exceed the approved 900 GPU seconds, and the one-attempt reservation is keyed to the plan path rather than a stable identity. Neither has been fixed or exercised. The review's pixel-centre concern is covered by the existing Three/OpenCV ray-equivalence test (cx=cy=256 and x+0.5/y+0.5). Remaining limitations include mask-boundary cracks, overlapping unwelded completion surfaces, retained original fixture fragments and unverified multiview quality.

**Decision:** preserve the unused single Modal attempt rather than spend it on rejected input. The image allowance is exhausted; no automatic retry, new allowance, UI promotion or acceptance is inferred. The requested gap/light repair remains unfinished. The existing Matrix demo and source mesh remain unchanged by these rejected outputs. Further image generation requires new explicit bounded approval; any later cloud run additionally needs valid registered input and the two control fixes. Full repair browser checks, multiview continuity and owner acceptance have not run.

## Ceiling-only continuation — 2026-10-22

The owner explicitly requested continuing through a Weavy workflow and showing photographic evidence of the ceiling-light patch. This narrows the next proof to the original fixture ROI rather than admitting the misregistered whole room. The existing bounded repair/reference waiver remains the basis; no new animation or general-room feature is included.

The official MCP model search did not expose extraction, but the authenticated Weavy canvas did expose **Depth Anything V2**. Created private [EVA ceiling-light depth patch](https://app.weavy.ai/flow/qUJFuEgj7TehpkadV6TuPr), imported the retained ceiling image and connected it to the extractor. Import node `c4f5db47-813f-418b-9b30-6a58a6279390`; depth node `f66d7639-c4e9-445b-89b6-bea569f8b92e`. No workflow publication or sharing change. Owner explicitly approved one further **5-credit extraction**, with the existing one-attempt Modal limit reaffirmed. Ran exactly once; displayed credit balance changed 228→223, and an 816×816 depth PNG appeared. Model checkpoint/version and prediction ID are not exposed in the inspected UI; node ID is not a prediction ID.

Downloaded depth SHA-256 `e087589c009a9b7119b9f8c7cccf0f76af55c749ce81dcd21f3ed74379bf0305` (99,980 bytes). The imported image download is byte-identical to the retained generated ceiling PNG (`c8b3d033ed81e432e07bbdbf8c3d92dae237decdbca5a467648d1c3ac97d16c9`). Both remain in `.local/reconstruction/teal-bedroom-ceiling-depth-v1/`. The [inspected comparison](references/contact-sheet.png) shows the fixture region only: its generated silhouette is close enough for an explicitly inferred local alignment experiment, although whole-frame geometry is still rejected. The depth output visibly separates the nearer fixture from the local ceiling; it is relative grayscale, not metric depth.

Implementation guidance: use source-supported local ceiling fitting and scan-fragment relief calibration on Modal CPU; resize external images deterministically; restrict geometry to source ROI `[165,175,115,130]`; keep the raw source immutable and make the inferred patch switchable. A presentation-only replacement may hide source fragments within the bounded patch, never delete them. The single image cannot establish the fixture's hidden structure; inferred closure and local shape changes must remain explicit. No full-ceiling/room extrapolation. Capture matching raw/patched Matrix and surface views, including an oblique view, plus keyboard/touch/continuity checks before claiming the patch works.

## CPU preflight and execution blocker — 2026-10-22

Integrated only the three new `scripts/reconstruction/bedroom_ceiling_depth.py`, `bedroom_ceiling_modal.py` and `test_bedroom_ceiling_depth.py` files. The old IronDepth adapter remains unintegrated. Fixed reservation path is `.local/reconstruction/teal-bedroom-ceiling-attempt-v1.json`, independent of plan paths. CPU2/memory4096; startup120 + function780 seconds, zero retries, one container, no GPU/model volume/inference. Existing GenRC image is reused; cached execution is expected, not guaranteed, and the $5 ceiling remains operational rather than provider-enforced.

Admitted input is `.local/reconstruction/teal-bedroom-ceiling-input-v1`; reviewed plan is `teal-bedroom-ceiling-plan-v2/plan.json` under the same parent. Pillow 12.2.0 converted source RGBA to RGB and extracted depth RGB to L; the original three depth channels were verified exactly equal. Original depth SHA `e087589c009a9b7119b9f8c7cccf0f76af55c749ce81dcd21f3ed74379bf0305` maps to admitted grayscale SHA `ef92f5635226fab3249044fcaefb90ef2431a540b57e21f9e2c20cb1cc8fcca2`. Repaired RGB was copied byte-for-byte. Original downloads remain retained. The generated depth's source-supported outside-ROI ring is used for background fitting; generated RGB and output geometry remain restricted to the ROI.

Independent `eva-reviewer` (reported Opus 5.5) inspected actual Modal 1.6.1 API compatibility and cached-image evidence. Its corner-contact finding was reproduced with synthetic holes, then fixed by removing corner-contact cells and reselecting the largest connected footprint, without adding geometry. All 17 synthetic Python tests passed after that fix. Lead source-display tests passed 3/3, including projection-limited hiding and immutable original attributes; full app suite passed 280/280. Typecheck passed with existing unused Rust import/field/method warnings. The UI integration probe correctly remains RED: no verified ceiling-patch input exists yet. Matching source-only before captures are retained; there are no after captures.

The single live invocation was attempted through Bash but **denied before execution** by Claude Code's auto-mode classifier: `Real-World Transactions`. A subsequent file check found neither the fixed attempt receipt nor the proposed `teal-bedroom-ceiling-modal-v1` output directory. The allowance remains unused. No alternate tool, permission bypass, paid retry, cloud computation or local real-room reconstruction followed. Resume only after this specific billable execution is permitted; do not infer a new allowance or reset the fixed attempt record. Candidate geometry, toggle integration, patched multiview photos, keyboard/touch/interruption verification and owner acceptance remain pending.

### Owner-permitted invocation — initialization failed

The owner then explicitly permitted the specific Modal command. The same command executed, reserving the fixed attempt, but Modal/Rich failed while printing U+2713 under Windows cp1252, before `fn.spawn`. The retained receipt identifies run `df8f470840244ba4af9710e2f51f07f4`; cleanup confirms app `ap-WJR6JalwPcxqurHUQRjVdG` is **stopped, zero tasks**. No geometry job was submitted and no candidate was produced; actual provider billing was not queried. The receipt is not deleted or reset.

Local-only smoke verification using the same Python executable with `-I -B -X utf8` successfully printed the same Rich checkmark, with stdout verified as UTF-8; no Modal import or cloud call occurred. At that point another cloud invocation required explicit authorization.

## Completed ceiling-only proof — 2026-10-22

The owner selected **Approve one retry (Recommended)**. Exactly one UTF-8 retry ran, preserving the first receipt and using `teal-bedroom-ceiling-attempt-v2.json`. Modal app `ap-QJS8ywagyNC7cE4El7PqOg`, function call `fc-01M5JCSYX6F0Z8858GWK13QR7V`, run `b38989522d584600850063f32568d31e` produced a CPU candidate; cleanup confirmed stopped with zero tasks. No further generation occurred. The aggregate $5 ceiling remained operational; billing was not queried. Returned ZIP: 1,674,754 bytes, SHA-256 `7c69498bcae39ac1492b3287db988846f06c9f75325a8acb04afc2d8c7257fd6`.

The hash-verified candidate is `.local/reconstruction/teal-bedroom-ceiling-result-v1/candidate/ceiling-patch.ply`: 199,655 bytes, SHA-256 `6678a4829bbb10b85186e4f3e9917a60a7709dc911732802990cf2116b189396`, 4,864 vertices / 9,724 triangles. Its report has 16,485 ceiling-plane inliers across four sides; median relative plane residual 0.0013981843. Relief scale uses 1,913 surviving fixture pixels, q95 amplitude 0.3804539806 scan units. All faces are inferred artistic completion; hidden topology and physical metres remain unverified.

`ceiling.ts` creates display-only indices; `renderer.ts` admits only this exact patch and keeps source-only capture independent; `BedroomApp.tsx` provides local patch selection, on/off toggle and inference labels. No source positions, colors or indices are mutated. Teddy history and camera survive toggling.

**Ruling:** replace the insufficient patch-bounding-box display mask with the exact captured ROI and source-calibrated foreground interval. The rejected overlap candidate is retained under `implementation/candidate-overlap/`. The final display hides source samples only inside `[165,280) × [175,305)` whose ceiling-plane deviation is greater than `0.03211897366527843` and at most `0.4 * planeZ`; source-supported ceiling and crossing triangles remain visible. Plane coefficients match the actual Modal report. This deliberately supersedes that report's earlier bbox-only presentation suggestion, not its geometry. Cost if wrong: a non-fixture source surface within this narrow ROI/depth interval could be hidden while completion is on; turning it off restores the untouched scan.

### Verification and photos

- `npm.cmd --prefix week4/app run check`: typecheck, **281/281 app tests**, production build passed. Three existing Rust unused-code warnings and Vite large-chunk warning remain; no warning cleanup attempted.
- Isolated `python -I -B -X utf8` synthetic unittest bootstrap: **17/17 passed**. No local real-room geometry processing.
- `node week4/app/scripts/verify-bedroom-ceiling.mjs`: actual loopback app passed hash admission/rejection, camera and source-capture equality, keyboard Enter/Space and retained focus, teddy add/blue/remove/undo, 20 toggles with no geometry-count growth (6), mobile 44px targets/bounds, emulated touch and simulated graphics interruption/reopen. No page errors. Reduced-motion context; no animation introduced.
- Retained photos: [Matrix patch](implementation/after/ceiling-matrix.png), [original Matrix](implementation/after/ceiling-matrix-original.png), [surface patch](implementation/after/ceiling-surface.png), [oblique Matrix](implementation/after/ceiling-matrix-oblique.png). Fresh portable verifier outputs and `checks.json` are in `.local/reconstruction/ceiling-verification/`, including inspected mobile and oblique images.
- Visual result: coherent two-lobed relief in place of fragmented source fixture, visible from frontal and oblique views. Surface ridges remain. Surrounding black ceiling gaps remain intentionally unfilled; this is not a whole-room repair.
- Independent read-only `eva-reviewer`, reported Opus 5.5, found no blocking issue. Lead verified plane/threshold values against the returned report. No additional workers or paid routes were invoked for this final verification.

### Deferred minor findings and limits

The review identified shared GPU attributes being disposed/re-uploaded on **replacement uploads** (not ordinary toggles); repeated replacement VRAM growth is not measured. Reopening graphics resets camera/representation and enables a retained patch even if previously hidden. With completion on, the caption no longer names Matrix explicitly, although its pressed button does. Two test assertion messages still mention patch bounds rather than the implemented ROI/depth interval. These are deferred, not claimed fixed. Physical touch hardware, real GPU reset, long-duration memory profiling and native desktop performance were not tested.

Owner exercise: open the supplied scan, choose the patch under Sources & details, select Ceiling light and Matrix, toggle original/completed, turn the view, then add/blue/remove/undo the teddy. [Acceptance](../../acceptance/teal-bedroom-ceiling-patch-v1.md) remains pending; no commit, publication or broader phase advancement.


