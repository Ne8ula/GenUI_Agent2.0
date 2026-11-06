# Dreamatorium / EVA: condensed research plan

2026-10-18 synthesis of the 2026-10-15 alignment and the [memory-palace midterm](../../PLANNING.md). This is a plan, not executed experiments or phase acceptance.

## Tracks, systems and ownership

| Track | Role |
| --- | --- |
| A | Upstream video-model/geometric-learning research in Shado |
| B | Supporting revision, continuity and control mechanisms |
| C | EVA's primary contribution: reconstruction, expressive spatial experience and human understanding |

Track C combines Dreamatorium **System B** (genuine 3D reconstruction) and **System C** (expressive rendering/spatial experience). Track and System labels are separate.

The [owner-supplied chart](figures/dreamatorium-seven-step-flow.png) is proposed source material:

| Step | Intended work | Owner |
| --- | --- | --- |
| 1 | Reference image/prompt with known rigid fiducials | Shado |
| 2 | Video generation with camera motion, scene and markers | Shado |
| 3 | Marker detection, pose/rigidity/uncertainty and surrounding-scene verification | Shado |
| 4 | Synthetic-data selection and model post-training | Shado |
| 5 | Marker-free generation and transfer testing | Shado |
| 6 | Camera estimation and genuine spatial reconstruction | EVA |
| 7 | Geometry-anchored expressive rendering and interaction | EVA |

Shado's model/geometric-learning paper owns Steps 1?5; EVA's HCI paper owns Steps 6?7. Geometry diagnostics enable HCI work; they do not replace measured understanding, exploration and evidence interpretation.

## Inputs and components

Suitable captured multiview images enter Step 6 directly. Versioned marker-free Shado outputs are an alternative input. Memory palaces do not require a Shado round trip. Historical photos from different room states or insufficiently overlapping views cannot automatically form coherent multiview capture.

Keep three separable components:

1. Reconstruction/import: cameras, coordinates/scale, explicitly named representation, source manifest, diagnostics and resource limits.
2. Expressive rendering: spatially attached points/contours/dithering/incomplete surfaces and raw inspection, derived from the same reconstruction.
3. EVA encounter: eye, navigation, selection, source inspection, conversation and revisable memories.

Raw reconstruction stays immutable. Generated completion, expression and personal recollection are separately attributable. The lion plushie is a user-reported memory, not newly observed geometry. Privacy, correction and deletion apply to photos and journal records.

## Questions and experiments

All remain hypotheses and proposed comparisons.

| ID | Question / hypothesis | Essential evidence |
| --- | --- | --- |
| C-E0 | Foundation invariants | Schema/provenance, coordinates, cancellation, resources and renderer checks |
| C-H1 / C-E1 | Are inputs reconstructable into usable scenes? | All-attempt yield, camera registration, coverage, held-out views and independent geometry where available |
| C-H2 / C-E2 | Does genuine spatial attachment improve viewpoint coherence? | Anchored 3D versus matched image-derived 2.5D on fixed paths; alignment, occlusion and stability |
| C-H3 / C-E3 | How does artistic representation affect understanding/experience? | Same reconstruction, raw versus structured artistic rendering; performance and experiential accounts separately |
| C-H4 / C-E4 | Can people distinguish evidence, inference and expression? | Source-inspection/legibility conditions; identification of source-backed, inferred, generated, user-reported and unknown content |
| C-H5 / C-E5 | Does the pipeline transfer beyond tuned scenes? | Frozen pipeline on held-out scenes, all failures and manual rescue recorded |
| C-H6 / C-E6 | Do upstream improvements benefit people? | Matched Shado baseline/treatment with identical downstream reconstruction, renderer, tasks and exposure |

C-E3/C-E4 are central HCI studies; C-E1/C-E2 establish technical validity, C-E5 transfer, C-E6 the conditional Shado bridge. A compelling demo or preference score alone does not establish better understanding.

C-E6 requires independent upstream evidence and downstream human outcomes. Preserve input/camera/sample/condition provenance and all reconstruction attempts. Matching prompts/seeds alone does not isolate geometry. If those requirements are missing, leave the bridge explicitly untested.

## Evaluation discipline

- Report usable-experience yield across **all attempts** separately from participant outcomes on the common reconstructable subset. Retain failures and unavailable experiences in the denominator.
- Record coverage, cameras, representation, software/configuration, compute and manual intervention. Controlled independent ground truth supports absolute geometry claims; generated consistency is not physical/historical truth.
- Match reconstruction, task, controls, narration/exposure and render budget where required. Document remaining confounds.
- Measure spatial understanding, exploration and evidence interpretation. Report artistic experience, preference and qualitative accounts separately.
- Preserve raw scenes/source links; visual effects and annotations cannot rewrite evidence. Numeric confidence needs a defined, validated basis; otherwise expose uncertainty/missingness plainly.
- Participant work requires appropriate study approval. Owner development acceptance is separate.

## Milestones

No new deadline or speculative week-by-week schedule is assigned.

| Milestone | Outcome |
| --- | --- |
| C-M0 ? Feasibility | Genuine reconstruction/import/navigation fixture, contracts and protocol |
| C-M1 ? Reconstruction baseline | Controlled/captured benchmark and raw scene evidence |
| C-M2 ? Generated inputs | Frozen generated-input yield/failure analysis |
| C-M3 ? Expressive spatial renderer | Anchored layers, raw mode and C-E2 evidence |
| C-M4 ? EVA encounter | Eye-to-scene experience, inspectable provenance and equivalent study conditions |
| C-M5 ? Human evaluation | C-E3/C-E4; C-E6 only with paired upstream evidence |
| C-M6 ? Transfer | Held-out reconstruction/rendering/end-to-end report |
| C-M7 ? Synthesis | Reproducible artifact, HCI paper/report and demonstration |

New milestones need actual evidence and owner decisions. Paris fixtures/R18 acceptance do not complete C-M0. Historical E1/S0?S4 and full-product milestones remain distinct.

Current enabling evidence: the owner-selected [Hypersim ai_001_004 baseline](hypersim/README.md) performs offline supplied-depth/supplied-pose fusion. Its [r02 review](../design/acceptance/hypersim-ai-001-004-r02.md) retains a low-coverage evaluation view. C-M0/C-M1 remain pending; this is not RGB-only reconstruction, an integrated navigation fixture or a completed research experiment.

## Applications

The midterm narrows the encounter to one reconstructed room and inspectable memories. Crime-scene journaling is a separate future hypothesis. No forensic method, blood-pattern estimate, instrument compatibility conclusion or evidentiary validation is established here; it cannot inherit validity from memory-journal studies or attractive graphics.

## Selected source trail

Retained from prior research documents; this cleanup did not perform a fresh literature review or verify current tool capabilities. Consult primary material and record reading depth before new method claims.

- [COLMAP tutorial](https://colmap.github.io/tutorial.html).
- [Kerbl et al., 3D Gaussian Splatting (2023)](https://arxiv.org/abs/2308.04079).
- [Vallg?rda et al., Temporal Form in Interaction Design (2015)](https://www.ijdesign.org/index.php/IJDesign/article/view/2212/710).
- [Horvitz, Principles of Mixed-Initiative User Interfaces (1999)](https://www.microsoft.com/en-us/research/publication/principles-mixed-initiative-user-interfaces/).
- [Amershi et al., Guidelines for Human-AI Interaction (2019)](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/).
- [Zimmerman et al., Research Through Design (2007)](https://doi.org/10.1145/1240624.1240704).

Full earlier proposals/reading notes remain available through [history](../HISTORY.md).
