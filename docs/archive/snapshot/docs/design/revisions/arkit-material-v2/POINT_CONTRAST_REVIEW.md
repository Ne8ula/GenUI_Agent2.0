# Read-only point-contrast investigation

No renderer change in this investigation.

## Current implementation comparison

| Renderer | Background in points mode | Point color | Size and mask |
| --- | --- | --- | --- |
| Original Hypersim r03 (`renderer.ts`) | `#171918` | Supplied mesh vertex RGB through PLY loading; no deliberate contrast floor | 0.014 world units, perspective attenuation, square default sprite |
| Current completed Hypersim | `#171918` | Source/inferred vertex RGB | 2.2 fixed screen pixels, circular mask and alpha cutoff 0.5 |
| `CandidateView` | `#171b18` | Source sRGB converted to linear RGB, barycentrically sampled on surfaces; no contrast floor | 1.8 fixed screen pixels, same circular mask/cutoff, depth-only occlusion surface |

The background difference is negligible. The first Hypersim renderer is not applying a secret bright palette: its source imagery and depth/pose reconstruction differ, and perspective-sized square points can occupy more pixels near the camera. We should not claim appearance parity by copying its world-unit size into a relative-scale reconstruction.

## Actual screenshot diagnostic

Measured `material-after-points.png` at 1066×451. Two manually selected rectangles approximate sofa and wall regions; they are not semantic segmentation. Exact background RGB was excluded. Relative luminance used the standard sRGB transfer function and coefficients; ratios include antialiased edge pixels. These are visibility diagnostics, not an asserted accessibility conformance threshold.

| Region | Rectangle x0,y0,x1,y1 | Nonbackground pixels | Median contrast against background | Under 1.5:1 |
| --- | --- | ---: | ---: | ---: |
| Sofa area | 500,280,950,440 | 5,734 / 72,000 | 1.21:1 | 68.49% |
| Wall area | 600,20,1000,160 | 2,993 / 56,000 | 2.74:1 | 2.71% |

The sofa rectangle contains more nonbackground pixels proportionally, yet its points mostly have little luminance separation. This supports a **display contrast** problem in addition to any underlying geometry uncertainty. It does not prove all object detail was reconstructed.

## Proposed bounded experiment — awaiting parent approval

1. Preserve current sampling, positions, indices, occlusion, surface colors, provenance and 1.8-pixel point size.
2. Apply a display-only luminance floor to the point-buffer colors after sampling in linear RGB: for luminance `L < 0.14`, blend toward neutral white by `(0.14-L)/(1-L)`. Brighter colors stay unchanged. Point cores would have at least roughly 3.15:1 luminance contrast against the present background; antialiased edges can be lower.
3. Label the point display as contrast enhanced; surfaces retain original/source-derived colors. This is artistic presentation, not recovered texture or confidence.
4. Capture identical source viewpoints, desktop and phone, before/after. Verify point positions/count/spacing and geometry remain exact; surfaces and provenance drawing buffers remain pixel-identical. Measure the same sofa/wall rectangles and inspect whether dark furniture becomes legible without bright walls becoming overwhelming.
5. Only if the color-only pass remains too faint on phone, compare 2.2-pixel circles separately. Avoid changing size and color together in the first comparison.

Alternative light backgrounds would help dark points but reduce contrast for bright walls. A uniform single-color point palette would discard useful source appearance. A luminance floor is the smallest isolated display change to test first; it has not yet been implemented or visually validated.
