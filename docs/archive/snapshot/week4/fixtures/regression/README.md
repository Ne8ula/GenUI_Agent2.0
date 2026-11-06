# Original eye regression oracle

`original-eye.ts` is a byte-identical copy of `week3/src/visual/week1-eye.ts` from pre-cleanup commit `6f93daf0d531dac900256d64558cb7b35620b38b`. Arrival tests load it dynamically and compare raster output with the current eye. It remains outside the app TypeScript include roots, matching its previous cross-workspace validation scope; it is test data, not runtime source. Do not edit it to make a regression pass.
