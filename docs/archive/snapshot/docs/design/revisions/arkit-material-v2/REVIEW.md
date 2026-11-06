# Optional inferred wall colors

2026-10-20. Implemented under the existing owner-approved visual waiver. Owner boundary and appearance acceptance remain pending.

The **Broader room views** profile now offers **Inferred wall colors** as an optional fourth representation. **Provisional completion** remains its default. The original seven-photo profile is unchanged and has no material option.

The fixed `room-only-v2/material-v1` path is read only. SHA-256 checks pin the reviewed material report and frozen policy; those bind the original completion report, candidate and source request/result. The material candidate is admitted only if every physical coordinate, index, normal, provenance tag, source-view attribution and base metadata field remains identical. All photo-derived colors and each unsupported plane's fallback remain exact. Only the report's supported authored-plane colors may differ. A failed material validation leaves the original completion usable.

The UI labels the colors as inferred appearance on two assumed walls, with unsupported fallback retained. It does not claim recovered window texture, unseen detail or better geometry.

## Verification

- Eight benchmark tests pass, including geometry/color hash tampering, physical/provenance/attribution mutations, photo-color and fallback changes, missing/invalid plane mappings, base/source/policy substitution, pinned report rejection and original-profile isolation.
- Typecheck and production build pass; existing Rust warnings remain.
- Six grouped browser checks pass through a real isolated broker, using actual saved geometry. No new generation, CPU completion, paid call or mutation request.
- Before/after material surfaces differ visually; the wall fill is closer to nearby supported wall colors. The change is modest: flat window closure and seams remain.
- All physical arrays and photo-derived colors are exact. The rendered provenance drawing buffers are pixel-identical at 1066×450 with five distinct rendered RGBA values; PNG copies are included. Thus the comparison is nonblank and independent of page screenshot crop rounding.
- Switching back restores the original completion. Keyboard movement/reset, points, provenance, source-0 closure, both profiles, real WebGL context recovery, mobile touch emulation, reduced motion and unknown-profile rejection pass.
- The earlier failed screenshot comparison remains documented in [v1](../arkit-material-v1/REVIEW.md).

Actual captures include `material-before-surfaces.png`, `material-after-surfaces.png`, both provenance drawing buffers, `material-after-points.png`, `material-desktop.png` and `material-phone-points.png`. Desktop and phone captures were inspected. Headless Edge and touch emulation verify interaction/rendering; they do not establish physical phone usability or reconstruction accuracy.

Reproduce with the local Vite app running:

```powershell
node --test scripts/room_workflow/benchmark.test.mjs
npm.cmd --prefix week4/app run typecheck
npm.cmd --prefix week4/app run build
node week4/app/scripts/verify-arkit-profiles.mjs <fresh-evidence-directory>
```

The regular broker needs a restart to load this optional variant. This verification restarted only its isolated temporary broker.
