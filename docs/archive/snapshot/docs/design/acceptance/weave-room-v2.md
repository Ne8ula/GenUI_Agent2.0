# Weave room v2: technical rejection

Date: 2026-10-20. Scope: owner-approved single 8-credit masked GPT Image 2.5 / Sunburst edit, using one target image and the existing alpha mask. No automatic retry.

Prediction: `cd0edccc-6dcf-4ba3-b4fa-07ae1ed80586`. Provider status: completed; reported charge: 8 credits. [Executed request](../../research/hypersim/weave-room-v2-request.json).

Expected: preserve fixed camera, known surfaces and unknown areas outside the 9,409-pixel floor mask; supply appearance only on the independently fixed floor.

Actual: almost-black image with a small wood rectangle; 61.22% protected pixels exceed the change threshold, and 95.15% known pixels turn near-black. Raw-image gate rejected it and emitted no composite. Both remote input files matched local hashes exactly. Internal provider mask/routing behavior remains unverified.

[Raw image, metrics and repeatable rejection command](../../research/hypersim/evidence/weave-room-v2/REVIEW.md). The existing repaired mesh and viewer remain unchanged. No texture was applied, no learned depth run occurred, and no Weave workflow was authored.

Lead disposition: failed appearance/registration gate; retain for diagnosis. Owner quality acceptance: **pending, not recommended**. Next owner exercise is to inspect the failed result alongside the unchanged floor-repair candidate. No further paid run is approved.
