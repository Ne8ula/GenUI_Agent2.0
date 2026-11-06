# EVA speech policy

Retained owner policy from Week 1, not evidence of live Week 4/midterm voice integration. Original profile, validators and scripts are available through [history](../HISTORY.md).

The selected profile was `eleven_v3`, stability `0.5` (Natural). Preserve it unless an explicit reviewed decision changes it; verify actual provider support/access before implementation or paid calls. No old allowance carries forward.

Only the narrator speaks user-facing prose. Reflex acknowledgements contain no provisional facts; factual speech waits for sentence/source verification. The renderer cannot select arbitrary text, voice, model, credentials or provider policy.

## Authoring

- Place delivery cues before affected words; up to three compatible cues when useful.
- Keep tone coherent. Quiet/whisper and loud/shout transitions require separate authored/reviewed clips.
- Use emotional tags, not spoken stage directions. The retained policy disallows XML/SSML, including break tags.
- Keep short action phrases together. Simplify punctuation/cues before regenerating; listen to assess delivery.
- Numeric speed brackets and hyphenation were experimental literal notation, not guaranteed provider controls. HTTP success does not establish delivery semantics.
- Extended narration had an owner target above 250 characters, not a provider minimum. Do not pad with irrelevant/private content. New short scripts need a documented exception; old weather exceptions are not universal.
- Reviewed tags belong in a shared allowlist. Keep source verification, authority and decoded-audio/resource limits separate from expression.

Conversation integration needs permission, bounded contracts, interruption/cancellation, late-result suppression, no-audio/failure paths and a listening exercise. API success is not an end-to-end conversation. Do not commit private runtime audio.

Weather-stage scripts, clip gaps/caches and old commands are historical details, not memory-palace requirements. Reuse applicable policy deliberately and test the new integration.
