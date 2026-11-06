# Crime-scene execution prerequisites and proposal

2026-10-28 · branch `crimescene`, HEAD `0380e13efbdfa8c1ee29fe2c621927852b7766b7` plus dirty/untracked work. This continues the [approved implementation plan](../../superpowers/plans/2026-10-28-crime-scene-argus-kimodo.md) and preserves the [offline checkpoint](crime-scene-offline-admission-v1.md).

**Current priority: panorama scene only; chair/motion work paused.** [Panorama trial preparation](crime-scene-panorama-trial-v1.md) records tested padding/crop helpers, preserved scan hashes and a bounded but blocked GPU proposal. Actual source calibration and model-access/lock gates remain unresolved; no all-stage execution approval is requested. The Weave proposal below is historical: its exact 229 credits were subsequently approved and consumed, and its chair-contact direction was not accepted. Public metadata does not prove account entitlement, accepted terms, checkpoint integrity or a working image.

## Chair input — resolved identity, not accepted output

The currently catalogued review approves `marker-07` and photo crop `[0, 0.19, 0.8, 0.88]`. The source marker maps to **tag 18, “Upside down chair”**, photo `IMG_20240306_133552.jpg`. This was established from retained review/marker data and direct image inspection, not guessed from a numeric tag.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| Original photo | 1,385,352 | `a4ca75ea2d5936ce2e8eeace460f51f16e1ffab8ec1c37aab8c5026384c34095` |
| Retained `inputs/tag-18.png` crop | 2,883,154 | `3927828196aa326de1bdc3c76fa129bad7a4a0eb591e577a9e5c0438cc6db943` |
| Current `review.md` | 766 | `1e3d377765302552a38d35a169b90dadd01bbbb54b5ffae598794dd03577020a` |
| `segments/marker-07.u32` | 16,712 | `1e17ff56eb4ec6dac62e7a96dfdf0c1f13dee80ee64967ce14e05d2e49c8792b` |
| Existing crop job record | 1,861 | `a07c30e9a98bc133c7376820a8d097dd759f1fdcb0b2aaf62b6c0d55d27c47a2` |

Original: `.local/reconstruction/ffs-th0028-media-v1/th_0021-0040/img/th_0028/IMG_20240306_133552.jpg`, RGB 3120×4160, no EXIF orientation. Crop: `.local/reconstruction/ffs-th0028-objects-v2/inputs/tag-18.png`, RGB 2496×2871; pixel box `[0,790,2496,3661]`. Bounded CPU decoding confirmed every retained crop pixel equals the corresponding original pixel after EXIF transpose. No image was modified or uploaded.

The photograph shows an overturned dark tubular-frame chair with background and occlusion. **It has no alpha mask.** Complete hidden geometry is inference; upright placement for the selected static-chair touch sequence is an explicit authored hypothesis, not the observed pose. Existing segment fit metrics and the old generated GLB do not establish complete geometry or contact. The current source review is not approval of a new model, upload, generated candidate or revised pose.

[FFS Part 2, version 0.1](https://zenodo.org/records/17164106), DOI `10.5281/zenodo.17164106`, credits Herve Daudigny and states **CC-BY-NC-SA-4.0**. Retain attribution, mark changes, restrict this proposal to private noncommercial research, and preserve ShareAlike obligations for any subsequently shared adaptations. Publication, exhibits, commercial use and study deployment are outside this proposal; licence summaries are not legal clearance.

## Panorama — padding explained, calibration not established

The existing cloud receipt identifies full-colour PNG `pano_th_0028_coul_full.png`: **20288×10144**, RGB8, **208,807,902 bytes**, SHA-256 `7729a11c25a7f72c56c1b88ad4071c848078474611f2778fa9acc8c3bc654708`. This is the retained receipt's full-file hash, not a fresh complete download/hash in this pass.

New evidence:

- Official [FFS English README](https://zenodo.org/api/records/17164106/files/Read_me_ENG.pdf/content), 2,979,328 bytes, SHA-256 `9544ddc3cdae0fbba2e621553f9e966d5d095e398137fcbb761afcb039faa129`. Coordinator downloaded this bounded documentation PDF and visually inspected pages 2–3. Figure 7 is an **export flowchart**, not an export-settings screenshot: it confirms the stated full-colour 20288×10144 output but supplies no pixel-angle mapping or leveling transform. Text names SCENE 2023.0.1.10677. Nominal ordinary-panorama dimensions differ from the actual retained JPEG; do not treat the diagram as per-file calibration.
- [FARO full-colour export documentation](https://farotechnologies.mcoutput.com/faro_scene_help/Content/export_structure_scan_images.htm) explicitly describes a bottom white stripe caused by scan/image proportion differences. It also describes separately exported pose `.txt` files. The inspected manual is SCENE 2026.1, **not** the source's 2023 exporter; it explains the artifact without certifying the older export's exact mapping.
- The worker inspected the retained 2048×1024 preview, whose hash is `ffe28e4537d5ed7877a1821ca9134f315b390b2eb42646cc3b0b85977a6572a6`. Image content transitions near row 853; exact-white rows start at 865 after JPEG/resampling effects. This is compatible with padding, but cannot establish the original valid-row boundary or angular span.
- The retained normal-colour JPEG is **10307×4267**, SHA-256 `58b4f8259f308c999966ffa6dd2278c036c999af9581e8dc71a9ff501bd4551b`, without found EXIF/XMP calibration. It must not be stretched to 2:1.
- Scoped archive listing found panoramas and LAS, but no scene pose/calibration `.txt/.xml/.json/.e57/.fls/.fws` sidecar. Worker checked only 131,072 bytes of the public full-PNG member for bounded header/tail metadata, not the full image. No solution spreadsheet was inspected.

**Required to close:** source/exporter evidence bound to this PNG establishing angular bounds, native valid rectangle, row/pixel-center convention, seam/yaw and leveling/orientation. If unavailable, a separately designed and approved calibration/evaluation procedure is needed; absence of records does not prove the source irrecoverable. Approval alone cannot manufacture calibration.

The [panorama follow-up](crime-scene-panorama-trial-v1.md) narrows the minimal adapter: preserve full-grid resize560×280 and top42, shorten only the bottom to complete14-row patches whose area-resampling footprints stay within reviewed native valid rows. This keeps existing unprojection consistent without changing its equations; changing a symmetric crop ratio alone would not. Proposal arithmetic is now tested, but real calibration, worker integration and partial-source admission remain unimplemented/unresolved. No silent mask, stretching, floor filling or source-admission relaxation is permitted.

## Rights and immutable model pins

These are read-only official-source audit results from the reused workers. They identify direct pins; they are **not complete dependency lockfiles**. No checkpoint downloaded, account credentials inspected, licence accepted, image built or model run.

### Argus

- [Code](https://github.com/realsee-developer/Argus/tree/a7333c0a6d1e370260ebf47ac0f8adce272f3083): `a7333c0a6d1e370260ebf47ac0f8adce272f3083`, Apache-2.0.
- [Weights](https://huggingface.co/RealseeTechnology/argus-realsee3d): repository revision `5fcd9669f5aa4d438941b4728919a3182b620ddc`, CC-BY-NC-4.0 / manual gate. Pinned public metadata now identifies `argus_realsee3d.pt`, 2,621,544,324 bytes, expected LFS SHA-256 `b76d117c65c8e569f5ac9a90b1b412fe96a104b8b6246700d2b664a80f09c300`. Actual payload verification, authenticated entitlement and owner agreement remain unverified.
- Source calibration, dependency lock, tested crop/ray adapter and bounded inference plan must close before acquisition/build/inference approval.

### TRELLIS.2

The reused object worker completed a bounded public-source audit. These are **immutable candidates**, not a tested compatible build or rights clearance:

| Component | Commit/revision | Inspected terms / status |
| --- | --- | --- |
| [TRELLIS.2 / O-Voxel](https://github.com/microsoft/TRELLIS.2/tree/75fbf0183001ed9876c8dbb35de6b68552ee08bd) | `75fbf0183001ed9876c8dbb35de6b68552ee08bd` | MIT |
| [TRELLIS.2-4B](https://huggingface.co/microsoft/TRELLIS.2-4B/tree/af44b45f2e35a493886929c6d786e563ec68364d) | `af44b45f2e35a493886929c6d786e563ec68364d` | MIT metadata; ungated |
| [TRELLIS-image-large sparse decoder](https://huggingface.co/microsoft/TRELLIS-image-large/tree/25e0d31ffbebe4b5a97464dd851910efc3002d96) | `25e0d31ffbebe4b5a97464dd851910efc3002d96` | MIT metadata; ungated |
| [DINOv3 ViT-L](https://huggingface.co/facebook/dinov3-vitl16-pretrain-lvd1689m/tree/ea8dc2863c51be0a264bab82070e3e8836b02d51) | `ea8dc2863c51be0a264bab82070e3e8836b02d51` | Custom DINOv3 licence; manual gate |
| [RMBG-2.0](https://huggingface.co/briaai/RMBG-2.0/tree/2fd7b4b0f2393ddb39a267fb62df6c010928a6c6) | `2fd7b4b0f2393ddb39a267fb62df6c010928a6c6` | BRIA gate terms and linked CC-BY-NC-4.0; auto gate |
| [CuMesh](https://github.com/JeffreyXiang/CuMesh/tree/12289e1062f0603f2f0d0771b02e1395d247f26f) | `12289e1062f0603f2f0d0771b02e1395d247f26f` | MIT |
| [FlexGEMM](https://github.com/JeffreyXiang/FlexGEMM/tree/6dd94a859c26ee8246888502eada3dd8ad85532e) | `6dd94a859c26ee8246888502eada3dd8ad85532e` | MIT |
| [nvdiffrast v0.4.0](https://github.com/NVlabs/nvdiffrast/tree/253ac4fcea7de5f396371124af597e6cc957bfae) | `253ac4fcea7de5f396371124af597e6cc957bfae` | NVIDIA 1-Way Commercial licence; non-NVIDIA use restricted to noncommercial research/evaluation |
| [FlashAttention v2.7.3](https://github.com/Dao-AILab/flash-attention/tree/89c5a7dd4e6a8644575bd0c04a286f48c42763ec) | `89c5a7dd4e6a8644575bd0c04a286f48c42763ec` | BSD-3-Clause |
| [utils3d](https://github.com/EasternJournalist/utils3d/tree/9a4eb15e4021b67b12c460c7057d642626897ec8) | `9a4eb15e4021b67b12c460c7057d642626897ec8` | MIT |
| [nvdiffrec renderutils](https://github.com/JeffreyXiang/nvdiffrec/tree/b296927cc7fd01c2ac1087c8065c4d7248f72da4) | `b296927cc7fd01c2ac1087c8065c4d7248f72da4` | NVIDIA noncommercial research/evaluation; no-preview omission untested |
| [trimesh 4.6.8 candidate](https://github.com/mikedh/trimesh/tree/76b2bd31d32a1231320f8151d94f99e77ac8dc5b) | `76b2bd31d32a1231320f8151d94f99e77ac8dc5b` | Export source inspected; package/licence/hash receipt not closed |

The worker inspected the public official [DINOv3 agreement](https://api.github.com/repos/facebookresearch/dinov3/license?ref=6876159a11b4df116f30f667f8c9888617df0751), not the gated Hugging Face licence payload (401). Redistribution, acknowledgment, use restrictions, privacy/export and other obligations apply. Public metadata proves neither owner assent nor account entitlement. RMBG's pinned README also returned 401; full BRIA gate terms remain unreviewed. Source-photo rights, model terms and output/distribution rights are separate; MIT on the main repository does not clear the pipeline.

The current **RGB** chair crop requires background removal in the stock path. Even useful nonopaque RGBA would not prevent the stock factory from constructing RMBG. No approved mask or loader bypass exists. RMBG's wrapper uses `trust_remote_code=True` without revision/code_revision; gated code and secondary loads must be inspected and hashed before any execution. Local-loading failures can fall through to unpinned downloads, and `strict=False` requires missing/unexpected-key checks. A future integration needs hash-verified local paths, denied worker egress, missing-file/fallback rejection tests and a compatible Python/native/base-image lock, not just these source SHAs.

Pinned [trimesh export source](https://raw.githubusercontent.com/mikedh/trimesh/76b2bd31d32a1231320f8151d94f99e77ac8dc5b/trimesh/exchange/gltf.py) supports embedded PNG/JPEG with `extension_webp=False`; O-Voxel constructs suitable RGB/RGBA images. This establishes source feasibility only. No exact-version GLB was produced or admitted. The upstream million-face/WebP example is unsuitable; final extension/URI, geometry, texture-memory and fit-axis checks remain mandatory. Requested decimation is not a guaranteed final face bound. Existing producer limits remain unchanged.

### Kimodo

Recommended human model: **SOMA-RP-v1.2**, not robot G1 or separately restricted SMPL-X. Core generation may avoid optional SOMA-X mesh assets; that must be verified before selecting the image recipe.

| Component | Immutable revision | Terms / status |
| --- | --- | --- |
| [Kimodo code](https://github.com/nv-tlabs/kimodo/tree/e1c219c99b4b94ba48be1fb6a1cbc64ecee4c954) | `e1c219c99b4b94ba48be1fb6a1cbc64ecee4c954` | Apache-2.0 |
| [Kimodo-SOMA-RP-v1.2](https://huggingface.co/nvidia/Kimodo-SOMA-RP-v1.2) | `0e3c89024d896064b6851201373f7834784a386b` | NVIDIA Open Model License; public metadata says ungated |
| [LLM2Vec MNTP adapter](https://huggingface.co/McGill-NLP/LLM2Vec-Meta-Llama-3-8B-Instruct-mntp) | `31474e395ada192e8ed1586db6be79fb3b70c9c0` | MIT; not standalone base weights |
| [LLM2Vec supervised adapter](https://huggingface.co/McGill-NLP/LLM2Vec-Meta-Llama-3-8B-Instruct-mntp-supervised) | `baa8ebf04a1c2500e61288e7dad65e8ae42601a7` | MIT |
| [Meta-Llama-3-8B-Instruct](https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct) | `8afb486c1db24fe5011ec46dfbe5b5dccdb575c2` | Llama 3 Community License; manually gated |

Kimodo's automatic model/text-model downloads do not pin these revisions. A reviewed adapter must stage the selected revisions and run offline, with safetensors-only model admission and explicit local text-encoder mode. A repository SHA does not replace payload verification. Optional SOMA-X/MHR assets and MotionCorrection build/import needs remain to be resolved; no permission to download them is included.

Upstream requirements pin transformers 5.1.0 but not every dependency, torch build or container digest. Its supplied compiled requirements lack hashes and retain mutable git dependencies. Do not claim a reproducible image yet.

[Output/constraint docs](https://research.nvidia.com/labs/sil/projects/kimodo/docs/) specify SOMA 30 fps and 77-joint exported motion, with BVH in centimetres. NPZ metre interpretation and final rig/axis conversion still require verification against source/test fixtures. The model explicitly does not guarantee exact constraints or surrounding-object collisions. Native 60 fps rendering requires separately tested sampling/contact verification; it is not achieved by a 30 fps model label.

The coordinator inspected the [pinned Llama licence](https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct/raw/8afb486c1db24fe5011ec46dfbe5b5dccdb575c2/LICENSE) and the referenced [acceptable-use policy](https://dev.meta.ai/llama/llama3/use-policy/) through public page extraction. Terms cover internal use but have no blanket academic exemption; they prohibit using materials/results to improve unrelated LLMs and impose additional conditions on distribution/public services. This project proposal involves neither training nor real criminal-justice deployment. This inspection does not establish owner assent or gated account access. NVIDIA Open Model License/Trustworthy AI obligations also apply. Any tokens must remain in an approved secret route, never chat, repository, images or receipts.

## Consolidated execution scope — Weave approved, model stages held

On 2026-10-28 the owner selected **Approve 229 credits** in the structured approval prompt: one 5-credit still and one 224-credit eight-second 720p motion reference using the exact recorded text-only inputs, no source uploads or retries. This authorizes W1/W2 only; all Modal/model stages below remain unapproved. The quote JSON remains unchanged as the pre-approval quote receipt; execution IDs and actual outcomes belong in the new visual packet.

[Exact Weave requests](crime-scene-execution-quotes-v1.json), SHA-256 `6053000990566b96154b65a41ba91714d3bf46d87f84685cfcacba86ba8f7c2d`, preserve the pre-approval quote. Following the structured approval, both exact requests ran once and completed: still `9aef425e-834e-4303-a3fb-1797f7f4bd7c` and video `664d89e1-6f29-4656-9f9d-2c3d153ae23b`. Provider-reported total: **229 credits**. Actual assets, inspection and limitations are in the [current packet](../revisions/crime-scene-argus-kimodo-v1/REVIEW.md). No retry allowance remains.

| Stage | Exact permitted scope if approved | Allowance / readiness |
| --- | --- | --- |
| W1 still reference | One Nano Banana 2.1 request, `fal-ai/nano-banana-2/edit`, model ID `bebebed5-50c1-4701-98b3-86929db21585`; 2K PNG, 16:9, seed 28, High thinking, no web search, text only | **5 Weave credits**, quoted |
| W2 motion reference | One Seedance 2.5 request, `bytedance/seedance-2.5/image-to-video`, ID `cbe8b347-8c85-4e1a-b379-f96f48932f43`; 8 seconds, 720p, 16:9, H264, high bitrate, US-hosted, no audio/draft, text only | **224 Weave credits**, quoted |
| Argus acquisition/build/inference | None | **$0 authorized**; source/access/lock/adapter gates open |
| TRELLIS.2 acquisition/build/chair inference | None | **$0 authorized**; rights/access/lock/export gates open |
| Kimodo acquisition/build/motion inference | None | **$0 authorized**; Llama access, lock, rig/contact and source/object gates open |
| Modal browser/render/capture | None | **$0 authorized**; admitted assets, implementation and exact capture plan absent |

**Reference total: 229 workspace Weave credits, not Figma AI credits.** Distinct fixed allowances, one submission per model, sequential, no automatic retry or transfer of credits. The earlier 1080p video quote was 544 credits and is superseded/unapproved. 720p is reference guidance only; final delivery still targets native 2560×1440/60 on Modal.

Inputs contain only the exact authored fictional visual prompts in the JSON. **No source photo, scan, private file, solution sheet, credentials or supplied video upload.** References do not become reconstruction input or evidence. Provider model revisions beyond the exposed IDs are not supplied by the service and cannot be invented.

Weave manages GPU/CPU/RAM/container count and exposes no controllable worker timeout in these contracts. This proposal caps requests and quoted credits, not unseen provider hardware. Stop waiting after 20 minutes per request and preserve the returned request/status identity; a missing/uncertain result does not permit resubmission and does not prove cancellation/refund. Direct-model cancellation capability is not established. Download at most 16 MiB of still image and 128 MiB of video per request after inspecting returned metadata; oversized output stays unadmitted, with its receipt retained. Preserve retrieved originals, rejected renditions and provenance locally in the bounded pass packet; no publication/deletion. Provider retention is not controlled or verified here. Inspect both outputs before any frontend/motion edits; unsuitable references do not waive the gate.

[Modal pricing](https://modal.com/pricing), read 2026-10-28: L4 $0.000222/GPU-second; A100 40GB $0.000583; A100 80GB $0.000694; H100 $0.001097; CPU $0.0000131/physical-core-second; RAM $0.00000222/GiB-second. CPU/RAM bill at the greater of requested and actual usage; initialization/keepalive and other fees matter. These are rate inputs, **not run quotes or selected resources**. [Provider spend limits](https://modal.com/docs/guide/budgets) are separate account controls; no settings were inspected or changed, and no zero-overshoot guarantee is made. Without closed source/access/recipe gates, a nominal dollar amount would not be an executable plan.

## Verification and remaining owner actions

- Hash/size checks passed against current chair-related catalog entries and retained crop job. Pixel equality passed for original → retained crop. Official README hash matches the worker's independently fetched document hash.
- Official Weave discovery/quote calls succeeded; workspace workflow listing was empty. Quote success is not a completed generation or proof of account credits sufficient for a run.
- Four agents total including coordinator were reused, with no new/nested agents. Worker findings distinguish source inspection from unrun behavior. No production code changed in this prerequisite pass.
- Existing shared Python interpreter metadata also lacks Modal and huggingface-hub; no SDK installation has been authorized or attempted.
- Required owner-controlled evidence: source-specific SCENE calibration/export or agreement to a separately specified calibration study; personal acceptance/entitlement for gated model terms through the relevant official accounts. Do not paste credentials.
- Reference approval alone does **not** accept these model terms, admit the panorama, approve the chair's generated geometry, authorize downloads/builds/Modal work, or accept visual/contact quality.

No reconstruction-model execution, Modal work, model downloads, package installation, source deletion, commit or publication occurred. The subsequently approved Weave requests completed and were inspected as reference guidance only. Full replacement and quality acceptance remain pending.
