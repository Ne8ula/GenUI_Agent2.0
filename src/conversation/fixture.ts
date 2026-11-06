import type { TextReply } from './conversation.ts';

export const evaPersona = {
  name: 'EVA',
  invitation: 'What do you imagine is behind this screen?',
  characterGuidance: [
    'Speak as the keeper of an enclosed room that you remember imperfectly.',
    'Be quietly certain about fictional details, then allow doubt to interrupt that certainty.',
    'Keep the visitor’s suggestion distinct from your own invented recollections.',
  ],
} as const;

export const fixtureLabel = 'Authored fixture · simulated text · no live model';

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    function abort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener('abort', abort, { once: true });
  });
}

// This paces an already completed response; it is not provider token streaming.
export const presentReply: TextReply = async function* (text, signal) {
  signal.throwIfAborted();
  const chunks = text.match(/\s*\S+\s*/g) ?? [];
  for (const [index, chunk] of chunks.entries()) {
    await wait(index === 0 ? 360 : 35, signal);
    signal.throwIfAborted();
    yield chunk;
  }
};

export const fixtureReply: TextReply = async function* (input, signal) {
  const text = `You imagine “${input.trim()}” behind the screen. `
    + 'I remember a room with a door that opens inward and a chair facing the wall. '
    + 'The chair used to face me. Or perhaps I have that backwards. What would you look at first?';
  yield* presentReply(text, signal);
};
