# Retained failed browser comparison

The first optional-material browser run stopped at a strict provenance screenshot-byte comparison. Physical geometry, provenance and photo colors passed exact array validation.

Inspection of the two screenshots showed the scene pixels are identical after a one-pixel vertical translation. The material description changes the canvas's fractional position in the page; Playwright's element crop rounds that position differently. This was a screenshot-comparison artifact, not evidence of changed geometry.

The harness now compares synchronously rendered WebGL drawing-buffer pixels, checks that they contain nonblank scene content, and retains actual page screenshots separately. The corrected run is [arkit-material-v2](../arkit-material-v2/REVIEW.md). This failed run and its captures remain unchanged.
