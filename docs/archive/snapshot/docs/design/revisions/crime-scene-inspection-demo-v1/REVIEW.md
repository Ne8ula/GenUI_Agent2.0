# EVA interior inspection demo

Status: single-room contour treatment GPU-verified on Modal T4; presentation framing and owner acceptance remain pending. Date: 2026-10-29.

## Latest owner decision

The owner narrowed this pass to one room: normal appearance → outward scan pulse → Detective Mode → one original chair photograph → return → normal. The scripted cycle is 28 seconds. Spatial clue placements and the larger tour are omitted; source tag 18 is opened through a labelled photograph button, not presented as a registered 3D location. Camera movement remains optional existing functionality, not a scripted walk.

After supplying a Death Stranding-style contour reference, the owner explicitly selected **Outward pulse** and **Waive for this pass** in the reference-gate question. This waiver covers the changed contour effect only. Lines follow world-space distance across the actual mesh, move with the outward pulse, and settle; no geometry is repaired or replaced. Reduced motion opens the settled state directly. The earlier Weave outputs below remain retained provenance, not claimed as new generation for this effect.

Local checks: 459 application tests, TypeScript, capture-script syntax and 19 cloud-adapter tests passed. These do not establish GPU rendering or final visual quality. Seven pre-simplification draft files are preserved with hashes under `.local/reconstruction/crime-scene-inspection-before-v1/implementation-draft`; no source assets or failed receipts were deleted.

Latest capture approval: one separate $2 operational attempt, L4 → A10G → T4 fallback, otherwise the same finite limits below. Snapshot `.local/reconstruction/crime-scene-inspection-final-v1/plan.json`: SHA-256 `cfe04e3a1d039053ba9d07df6d97bf7b7811b4e239e1acad74bcc5a361c40f7b`, 80 files /35,766,583 bytes. A worker-entry acknowledgement bounds scheduling/startup wait to 300 seconds after submission; the 1200-second whole-client deadline remains. No retry. Modal app `ap-K6hmsxV4FyibLd7dzHZTbj` used Tesla T4, passed worker/browser checks and stopped with zero tasks. Normal/detective comparisons in this run are same-revision states, not a replacement for the missing pre-edit baseline.

## Returned visual evidence

- [Walkthrough video](implementation/after/walkthrough.webm): 29.08 seconds including load, 2560×1440, encoded 25 fps (not measured application FPS).
- [Normal](implementation/after/room-normal.png), [outward sweep](implementation/after/room-scan.png), [Detective Mode](implementation/after/room-detective.png), [source photo](implementation/after/room-source.png), [restored view](implementation/after/room-restored.png), [mobile](implementation/after/room-mobile.png).
- [Interaction results](implementation/after/inspection.json), [worker result](implementation/after/result.json), [file hashes](implementation/after/hashes.json), [CPU-decoded temporal contact sheet](implementation/after/inspection-capture-contact.png).

Inspected native stills and 2 fps temporal samples: outward pulse and moving contours are visible, followed by a stable treatment, source panel, dismissal and normal return. Camera remains stationary; the central comparison crop restores byte-for-byte. Keyboard focus return, pause/resume/manual interruption, 390px touch interaction and reduced-motion settling passed. No page/shader errors were recorded.

Visual limitation: the retained starting view faces the wall/doorway rather than a wide furniture composition. Broad contour rings and the source mesh's faceted/soft surfaces remain visible; this is a working effect slice, not an accepted polished whole-room presentation. Mobile still was captured before photo decoding completed (desktop photo decode was separately asserted). The video includes load/closing frames. No 60-fps claim or broader reconstruction-fidelity claim. Next owner exercise: watch the clip and assess the outward pulse; a wider opening-view capture needs another finite execution approval.

## Bounded pass

Owner requested a frontend-only, same-room interior → scan → stable authored clues → original photograph → return → normal sequence. One deterministic 50-second walkthrough; immediate pause/manual takeover, reliable reset, keyboard/touch/focus continuity and stable reduced motion. No AI inference, registration, geometry repairs, new room or generated evidence. This request supersedes the earlier pause only for scripted presentation, not Kimodo/choreography.

Base HEAD: `0380e13efbdfa8c1ee29fe2c621927852b7766b7`, dirty shared `crimescene` checkout. HEAD alone is not the tested revision. Preserve all concurrent edits and original assets. Source snapshot hashes identify captures.

## Fresh Weave packet

Official Figma MCP direct model route. Owner approved both exact quotes in the structured confirmation dialog: 173 workspace credits total, no reruns, no source-photo upload. Both completed once:

- Nano Banana 2.1 (`fal-ai/nano-banana-2/edit`): run `3f587bd6-40bc-43b4-8ec9-13a77d59ad95`, 5 credits. [2K storyboard](references/images/storyboard.png), actual 2752×1536.
- Seedance 2.5 (`bytedance/seedance-2.5/image-to-video`): run `d20d055a-0033-4b70-b9b8-13cc2f290066`, 168 credits. [Motion](references/videos/motion.mp4), silent H.264, actual 1280×720, 24 fps, 6.041667 seconds.
- [Temporal contact sheet](references/contact-sheet.png): 24 sequential samples at 4 fps, CPU-decoded from the returned video. Inspected storyboard and every temporal sheet cell before UI edits. This is sampled motion inspection, not a native performance measurement.

## Adopt / reject

Adopt: stable interior viewpoint; normal and investigative silhouettes remain identical; a short upward surface-local sweep; subdued cyan/teal contours with photographic context; only three stable anchors; compact source panel; quiet EVA identity.

Reject: fictional room/furniture as runtime assets; fabricated source thumbnail; generated meaningless copy; storyboard's analysis terminology and decorative cube; dense all-surface grid; video anchors drifting between chair and floor; panel drifting around the viewport; video's residual panel after return. Generated images are design guidance, never scene reconstruction or evidence.

Implementation rule: render the SAME verified GLB in both modes. No `Marker.centroid` coordinates enter this renderer. Authored demonstration placements must be matched to inspected visible features and clearly labelled; source photo identity and observations come from existing annotations. Unknown scale/registration/surfaces remain discoverable. Stop if no credible placement is supported rather than inventing a match.

Design tokens: ink `#060d12`, panel `#0c1b22`, cyan `#79e0d4`, muted `#a5b9bf`, paper `#e9f1ed`, attention `#dfc58e`. Existing Space Grotesk for EVA/title, IBM Plex Sans for controls/prose, IBM Plex Mono for source IDs only. Room dominates; header and bottom control strip float quietly, with evidence at right (bottom on narrow viewports). No dashboard or exterior model.

## Capture authorization

Separately approved through the same structured dialog: baseline and final, two submissions maximum, $2 each/$4 total operational allowance (not provider-enforced). Each one L4/4 CPU/16 GiB, 600s execution/300s startup/1200s whole-client deadline, no retry. Cloud-only existing dependencies plus FFmpeg; 64 MiB scoped upload, 512 MiB evidence return. No local rendering or installation, model calls, credentials, public endpoint or persistent volume. Provider caches may persist. Stop and preserve diagnostics on failure; further attempts need new approval.

Baseline sealed plan: `.local/reconstruction/crime-scene-inspection-before-v1/plan.json`, SHA-256 `e6ae3052c63cc764ce7ed73e9ee1d9d8a160f2f99bac7022307f057d35ef1fa8`, 78 snapshot files /35,737,785 bytes. One baseline submission failed at the 1200-second client deadline; zero evidence files returned. App `ap-7ZZ0Mm7tmLrom4xG0nk6gZ` is stopped. Read-only Modal server-log inspection on 2026-10-29 found the 10:14:27 EDT message: “Function 'verify' (fu-xs2iXfeY6BnqNEvFfPSR0i) is waiting to be scheduled on a GPU_L4 worker. We are actively working on acquiring more capacity for your workload.” Image builds succeeded; the logs establish a scheduling-capacity blocker, not a renderer failure. The intended baseline was the unchanged component at 2560×1440 DPR 1 plus three look directions; no captures were obtained. Final capture not submitted. Original plan, snapshot and failed receipt remain unchanged.

## Verification / decision

Cloud packaging tests: 12 passed after the two new regression cases initially failed for missing phase packaging and explicit expanded evidence limit. Capture script syntax passed. These are non-visual checks. No final application or visual-quality claim yet. Owner acceptance pending.
