# Rust Seed-33 renderer

This crate owns the fixed-camera scene, procedural materials, construction, articulated movement and WebGL2 submission. It has **no broker dependency, network API, image decoder, reference textures or runtime shader-input interface**. Its bounded light pass samples only the current Rust-rendered colour target; this is live post-processing, never an image-backed scene or reveal. The React host loads WASM and forwards bounded fixture inputs; generated wasm-bindgen glue only marshals browser API calls.

Historical reference/evidence: retrieve `week4/docs/design/revisions/w4-20261009-seed33-rust-rebuild-r1/REVIEW.md` through [Git recovery](../../docs/HISTORY.md). Owner acceptance of this Rust fidelity target remains pending. This is authored geometry, not the new photo reconstruction pipeline.

## Run from the repository root

```powershell
# Prerequisite if the target is absent:
rustup target add wasm32-unknown-unknown
# One-time matching build tool, installed inside ignored Week4 output:
cargo install wasm-bindgen-cli --version 0.2.128 --locked --root week4/target/wasm-tools --jobs 2

cargo test --manifest-path week4/Cargo.toml -p eva-seed33-renderer
npm --prefix week4/app run dev
```

Open `http://127.0.0.1:1440/?fixture=1&look=seed33&seed=33&build=12000`. Dev/build scripts compile the actual Rust module before Vite starts. An explicit Canvas2D choice reports unavailable; there is no image or TypeScript fallback. The legacy source is retained behind the explicit **development-only** `?historical=1` route, never selected because Rust failed. Production excludes historical public imagery.

`?capture=1&clock=manual&t=12000` removes controls and exposes the bounded fixture step hook. This advances the same host clock; it does not replay generated frames. At zero the empty construction state is intentional. Reduced motion always renders a complete representative scene, independent of the time at which it was enabled. Paused/reduced frames with identical effective inputs retain the current GPU framebuffer without re-rasterizing; resize, visibility or renderer replacement invalidates that cache.

## Runtime visual provenance

| Resource | Generator and inputs | Approximation / boundary |
| --- | --- | --- |
| Facades, cornices, windows, awning, roof/chimneys | `scene.rs::architecture`: independently authored perspective anchors, relief planes, repeated window/frame elements and seeded strand occupancy | Fixed-camera architectural relief, not navigable building interiors |
| Table | `furniture`: planar elliptical surface and thin edge; world/local XZ bead lattice and parallel strands | Not a sampled wood texture |
| Cup/saucer and handle | Authored radial profiles revolved into surfaces; tubular handle; explicit ceramic rim geometry | Stylized emissive bead material, not physically calibrated illumination |
| Chair | Bent tubular frame; two intersecting local-coordinate weave families with alternating offsets | Authored rattan approximation |
| Ashtray/cigarette | Revolved rim/wall/base, explicit rim tubes and vertical flutes; local-cell highlights and a small cigarette tube | Sparse opaque highlight cells with discarded gaps approximate glass; no alpha-depth sorting or physical refraction |
| Lamps | Revolved pole/cap profiles and repeated cage bars | Stylized ornamental geometry |
| Near and distant figures | `gait.rs`: articulated hips/knees/ankles and shoulders/elbows/wrists; tapered limbs, continuous coat surface, cloth rear hood and shoulder counter-rotation | Rear-facing coat rig; analytic gait constraints do not establish human-looking motion |
| Anchored accents | 22 authored region parameters; seeded per-region row omission/displacement/reconstruction | Flat/dotted/checker materials, no atlas or source-channel fragments |
| Atmosphere | Bounded mathematical steam curves | No video, smoke texture or external input |
| Materials | `materials.rs`: fixed development-authored GLSL; local cells, seeded smooth fields, bead distance fields, strand occupancy and normal/view rim treatment | No sampled reference pixels or runtime-provided code. Vessel cells follow profile arc length rather than profile index |
| GPU resources | Rust creates two shader programs, a VAO, four bounded vertex buffers, a four-sample colour/depth target and a single-sample colour resolve texture; static geometry uploads once, dynamic geometry uses bounded sub-data uploads | Live output only. `light.rs` resolves antialiased geometry and spreads its highlights, never revealing a stored scene image. Target storage is reported separately from vertex buffers |
| Host fonts | Existing bundled Fontsource Space Grotesk / IBM Plex Sans / Mono | Host controls only; not scene imagery |
| WASM and glue | Rust 1.98.1, pinned wasm-bindgen 0.2.128 and web-sys/js-sys 0.3.105 | Build artifacts, not reference media |

## Construction and limits

Each object has a stable ID, a start offset, surface topology and structural strands. `Frame::object` computes separate structure/form/detail progress. It submits only born triangles; the currently forming triangle expands from its first vertex. Strand endpoints physically extend along authored curves. There is no complete scene image underneath or global-opacity construction mechanism. After construction, the static geometry remains while figure joints, steam and accent bodies continue to change from explicit time.

Geometry is non-indexed triangle/line lists: tests validate complete groups, finite coordinates, stable IDs, progression, deterministic output and the vertex budget rather than testing a nonexistent index buffer. Maximum submitted vertices: 240,000. Rust bounds seed, density, time, build duration and framebuffer dimensions; maximum framebuffer dimension 4096 and area 8,388,608 pixels. Browser memory/real-time measurements and limitations belong to the revision, not a universal speed claim.

## Verification tools

```powershell
npm --prefix week4/app run check
node week4/app/scripts/capture-rust.mjs "<new absolute evidence directory>" 1459
node week4/app/scripts/record-rust.mjs "<new absolute recording directory>" 1460
```

Capture directories must be new. The capture driver denies image/movie resources, checks actual nonempty framebuffer output, and exercises controls/failures/context loss. The recorder feeds one actual browser screenshot at a time into FFmpeg (15 fps fixed-time playback), then retains a separate unstepped browser video. Fixed-time playback is not a performance measurement. No camera, microphone, wallpaper, native window movement or provider inference is added.
