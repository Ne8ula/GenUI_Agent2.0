# Weave room v1: not accepted

Date: 2026-10-19. Scope: one 8-credit GPT Image 2.5 / Sunburst masked floor edit, using the immutable Hypersim r03 target render and training references 0005/0035. The owner explicitly approved that single paid run; this is not quality acceptance or authority for a retry.

Executed request: [model, settings, prompt and asset identities](../../research/hypersim/weave-room-v1-request.json). Prediction `14171e1c-6afc-4780-aef7-82de0b86a3df` completed; the provider reported 8 credits charged. Full response records remain in `.local/reconstruction/weave-room-v1/`.

Expected: preserve target camera/jamb/opening and all content outside the 9,409-pixel floor mask. Actual: cleaner floor/wall appearance, but reference-like camera framing, absent target jamb and extensive outside-mask changes. **Image suitability failed.** The underlying mask/reference handling cause is unverified.

[Raw visual evidence and analysis](../../research/hypersim/evidence/weave-room-v1/REVIEW.md). No new mesh, depth extraction, graph creation or viewer integration occurred. Original scene assets remain unchanged. One paid run only; no automatic retry.

Owner exercise: compare the raw output with the target and edit mask. Lead recommendation: retain as a failed diagnostic candidate and fix target/mask handling before another generation. Owner acceptance remains pending.
