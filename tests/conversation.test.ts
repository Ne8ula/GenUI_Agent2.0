import test from 'node:test';
import assert from 'node:assert/strict';
import {
  conversationReducer,
  initialConversationState,
  type ConversationEvent,
} from '../src/conversation/conversation.ts';
import { fixtureReply, presentReply } from '../src/conversation/fixture.ts';
import { createRoomCompositionController, type ComposedRoom } from '../src/room/room-composition.ts';
import { caseFixture } from './fixtures/room-case-fixture.ts';

const compose = { type: 'compose', text: '  a sealed library  ' } as const;

test('Send stores visitor text locally without starting a reply or accepting chunks', () => {
  const state = conversationReducer(initialConversationState, { type: 'submit', text: '  a chair  ' });
  assert.equal(state.status, 'idle');
  assert.deepEqual(state.messages, [{ turnId: 1, role: 'visitor', text: 'a chair', interrupted: false }]);
  assert.equal(conversationReducer(state, { type: 'chunk', turnId: 1, text: 'not requested' }), state);
  assert.equal(conversationReducer(state, { type: 'complete', turnId: 1 }), state);
  const started = conversationReducer(state, { type: 'compose', text: 'a chair' });
  assert.equal(started.status, 'thinking');
  assert.equal(started.messages.length, 2, 'Compose does not duplicate the already accepted visitor message');
  assert.deepEqual(started.messages[1], { turnId: 2, role: 'eva', text: '', interrupted: false });
});

test('Compose starts a reply turn and presents EVA from thinking through speaking to idle', () => {
  const thinking = conversationReducer(initialConversationState, compose);
  assert.equal(thinking.status, 'thinking');
  assert.equal(thinking.turnId, 1);
  assert.deepEqual(thinking.messages, [
    { turnId: 1, role: 'visitor', text: 'a sealed library', interrupted: false },
    { turnId: 1, role: 'eva', text: '', interrupted: false },
  ]);
  const speaking = conversationReducer(thinking, { type: 'chunk', turnId: 1, text: 'A room. ' });
  assert.equal(speaking.status, 'speaking');
  const continued = conversationReducer(speaking, { type: 'chunk', turnId: 1, text: 'Or a memory.' });
  const complete = conversationReducer(continued, { type: 'complete', turnId: 1 });
  assert.equal(complete.status, 'idle');
  assert.equal(complete.messages[1].text, 'A room. Or a memory.');
  assert.equal(complete.messages[1].interrupted, false);
  assert.equal(thinking.messages[1].text, '');
  assert.deepEqual(initialConversationState.messages, []);
});

test('blank input and overlapping submissions leave the state unchanged', () => {
  for (const text of ['', ' \t\n ']) {
    assert.equal(conversationReducer(initialConversationState, { type: 'compose', text }), initialConversationState);
  }
  const thinking = conversationReducer(initialConversationState, compose);
  const speaking = conversationReducer(thinking, { type: 'chunk', turnId: 1, text: 'A room.' });
  const interrupted = conversationReducer(speaking, { type: 'stop' });
  for (const state of [thinking, speaking]) {
    assert.equal(conversationReducer(state, compose), state);
    assert.equal(conversationReducer(state, { type: 'submit', text: 'later' }), state);
  }
  assert.equal(conversationReducer(interrupted, compose).status, 'thinking');
  assert.equal(conversationReducer(interrupted, { type: 'submit', text: 'later' }), interrupted);
  assert.equal(conversationReducer(thinking, { type: 'chunk', turnId: 1, text: '' }), thinking);
  assert.equal(conversationReducer(thinking, { type: 'resume' }), thinking);
  assert.equal(conversationReducer(speaking, { type: 'resume' }), speaking);
  assert.equal(conversationReducer(initialConversationState, { type: 'stop' }), initialConversationState);
});

test('stopping preserves partial text and its interruption marker across the next turn', () => {
  let state = conversationReducer(initialConversationState, compose);
  state = conversationReducer(state, { type: 'chunk', turnId: 1, text: 'A locked' });
  state = conversationReducer(state, { type: 'stop' });
  assert.equal(state.status, 'interrupted');
  assert.deepEqual(state.messages[1], { turnId: 1, role: 'eva', text: 'A locked', interrupted: true });
  assert.equal(conversationReducer(state, { type: 'stop' }), state);
  state = conversationReducer(state, { type: 'resume' });
  assert.equal(state.status, 'idle');
  state = conversationReducer(state, { type: 'compose', text: 'a kitchen instead' });
  assert.equal(state.status, 'thinking');
  assert.equal(state.turnId, 2);
  assert.equal(state.messages.length, 4);
  assert.equal(state.messages[1].text, 'A locked');
  assert.equal(state.messages[1].interrupted, true);
  assert.equal(state.messages[2].text, 'a kitchen instead');
  assert.equal(state.messages[3].interrupted, false);
});

test('stopping before the first chunk retains the visitor and marks an empty interrupted reply', () => {
  const thinking = conversationReducer(initialConversationState, compose);
  const stopped = conversationReducer(thinking, { type: 'stop' });
  assert.equal(stopped.status, 'interrupted');
  assert.equal(stopped.messages[0].text, 'a sealed library');
  assert.deepEqual(stopped.messages[1], { turnId: 1, role: 'eva', text: '', interrupted: true });
});

test('late chunks and completion cannot revive a stopped or completed turn or alter a newer one', () => {
  const thinking = conversationReducer(initialConversationState, compose);
  const speaking = conversationReducer(thinking, { type: 'chunk', turnId: 1, text: 'A room.' });
  const stopped = conversationReducer(speaking, { type: 'stop' });
  const resumed = conversationReducer(stopped, { type: 'resume' });
  const complete = conversationReducer(speaking, { type: 'complete', turnId: 1 });
  const next = conversationReducer(resumed, compose);
  const nextSpeaking = conversationReducer(next, { type: 'chunk', turnId: 2, text: 'Another room.' });
  const lateEvents: ConversationEvent[] = [
    { type: 'chunk', turnId: 1, text: ' stale text' },
    { type: 'complete', turnId: 1 },
  ];
  for (const state of [stopped, resumed, complete, next, nextSpeaking]) {
    for (const event of lateEvents) assert.equal(conversationReducer(state, event), state);
  }
  assert.equal(conversationReducer(thinking, { type: 'chunk', turnId: 2, text: 'future text' }), thinking);
  assert.equal(conversationReducer(thinking, { type: 'complete', turnId: 2 }), thinking);
  const nextAfterComplete = conversationReducer(complete, compose);
  assert.equal(nextAfterComplete.turnId, 2);
  assert.equal(nextAfterComplete.status, 'thinking');
});

test('accepted text presentation preserves the exact synthetic response without invented fixture text', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const text = 'I imagine a teal chair. Perhaps a quiet corner.';
  const stream = presentReply(text, new AbortController().signal)[Symbol.asyncIterator]();
  const chunks: string[] = [];
  while (true) {
    const pending = stream.next();
    t.mock.timers.runAll();
    const next = await pending;
    if (next.done) break;
    chunks.push(next.value);
  }
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.length > 1);
});

test('stop reply suppresses a pending accepted-text presentation and stale completion cannot revive it', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const abort = new AbortController();
  const stream = presentReply('I imagine a chair.', abort.signal)[Symbol.asyncIterator]();
  const pending = stream.next();
  let state = conversationReducer(initialConversationState, compose);
  abort.abort();
  state = conversationReducer(state, { type: 'stop' });
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(conversationReducer(state, { type: 'complete', turnId: 1 }), state);
  const restarted = conversationReducer(state, { type: 'compose', text: 'a sofa' });
  assert.equal(restarted.turnId, 2);
  assert.equal(conversationReducer(restarted, { type: 'chunk', turnId: 1, text: 'old reply' }), restarted);
});

// Synthetic endpoint data, not a provider call or DOM test.
function compositionFixture() {
  return { version: 2, outcome: 'supported', reply: 'I imagine a teal chair. Perhaps I misremember the room.', unsupported: [], case: caseFixture(),
    description: { version: 1, width: 6, depth: 6, height: 3.4,
      doorway: { placement: 'center', width: 1.2, height: 2.3 },
      colors: { wall: 'cream', floor: 'walnut' }, furnishings: [{ kind: 'chair', color: 'teal' }],
    },
  };
}

test('accepted public narration and later local Send preserve the displayed fictional truth and selected contribution', async t => {
  const input = compositionFixture();
  let calls = 0;
  const controller = createRoomCompositionController({
    fetch: async () => { calls += 1; return new Response(JSON.stringify(input), { headers: { 'content-type': 'application/json' } }); },
    yieldToBuild: () => Promise.resolve(),
  });
  let installed: ComposedRoom | undefined;
  let state = conversationReducer(initialConversationState, { type: 'compose', text: '  My teal chair\nin a quiet room  ' });
  let reply = '';
  try {
    assert.equal(await controller.compose('  My teal chair\nin a quiet room  ', 1, result => {
      assert.deepEqual(Object.keys(result).sort(), ['outcome', 'reply', 'unsupported']);
      reply = result.reply;
    }), true);
    controller.reveal(room => { installed = room; return true; });
    const displayed = controller.getState().displayed;
    assert.equal(displayed?.suggestion, 'My teal chair\nin a quiet room');
    assert.deepEqual(displayed?.case, caseFixture());
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const stream = presentReply(reply, new AbortController().signal)[Symbol.asyncIterator]();
    while (true) {
      const pending = stream.next();
      t.mock.timers.runAll();
      const next = await pending;
      if (next.done) break;
      state = conversationReducer(state, { type: 'chunk', turnId: 1, text: next.value });
    }
    state = conversationReducer(state, { type: 'complete', turnId: 1 });
    assert.equal(state.messages[1].text, input.reply, 'no canned replacement or solution prose');
    assert.doesNotMatch(state.messages[1].text, /candidate-\d|clue-\d|object-\d|circle|linen|solution|culprit/);
    state = conversationReducer(state, { type: 'submit', text: 'Perhaps a shelf instead; I disagree with EVA.' });
    assert.equal(state.messages[0].text, 'My teal chair\nin a quiet room');
    assert.equal(state.messages.at(-1)!.text, 'Perhaps a shelf instead; I disagree with EVA.');
    assert.equal(calls, 1, 'Send does not start a second interpretation');
    assert.deepEqual(controller.getState().displayed, displayed);
    input.case.solution.candidateId = 'candidate-2';
    input.reply = 'Different narration.';
    assert.deepEqual(controller.getState().displayed, displayed);
  } finally { controller.dispose(); installed?.dispose(); }
});

test('stopping accepted reply presentation does not cancel or mutate the pending room and case', async t => {
  const controller = createRoomCompositionController({
    fetch: async () => new Response(JSON.stringify(compositionFixture()), { headers: { 'content-type': 'application/json' } }),
    yieldToBuild: () => Promise.resolve(),
  });
  const abort = new AbortController();
  let reply = '';
  try {
    assert.equal(await controller.compose('a teal chair', 1, result => { reply = result.reply; }), true);
    const ready = controller.getState();
    let state = conversationReducer(initialConversationState, { type: 'compose', text: 'a teal chair' });
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const stream = presentReply(reply, abort.signal)[Symbol.asyncIterator]();
    const firstPending = stream.next();
    t.mock.timers.runAll();
    const first = await firstPending;
    assert.equal(first.done, false);
    state = conversationReducer(state, { type: 'chunk', turnId: state.turnId, text: first.value! });
    const pending = stream.next();
    abort.abort();
    state = conversationReducer(state, { type: 'stop' });
    await assert.rejects(pending, { name: 'AbortError' });
    assert.equal(state.messages[1].interrupted, true);
    assert.equal(conversationReducer(state, { type: 'complete', turnId: state.turnId }), state);
    assert.deepEqual(controller.getState(), ready);
    assert.equal(ready.pending, true);
    assert.deepEqual(ready.accepted?.case, caseFixture());
  } finally { controller.dispose(); }
});

test('the synthetic authored fixture yields paced chunks deterministically and includes the visitor suggestion', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  async function collect() {
    const stream = fixtureReply('a sealed library', new AbortController().signal)[Symbol.asyncIterator]();
    const chunks: string[] = [];
    while (true) {
      const pending = stream.next();
      const beforeTimer = await Promise.race([
        pending,
        new Promise<null>(resolve => setImmediate(() => resolve(null))),
      ]);
      t.mock.timers.runAll();
      const next = await pending;
      if (next.done) break;
      assert.equal(beforeTimer, null);
      assert.ok(next.value.length > 0);
      chunks.push(next.value);
    }
    return chunks;
  }
  const first = await collect();
  const second = await collect();
  assert.ok(first.length > 1);
  assert.deepEqual(first, second);
  assert.ok(first.join('').includes('a sealed library'));
});

test('the fixture rejects a pre-aborted signal without producing text', async () => {
  const abort = new AbortController();
  abort.abort();
  const stream = fixtureReply('a library', abort.signal)[Symbol.asyncIterator]();
  await assert.rejects(stream.next(), { name: 'AbortError' });
});

test('aborting during the initial fixture delay rejects immediately without waiting for its timer', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const abort = new AbortController();
  const stream = fixtureReply('a library', abort.signal)[Symbol.asyncIterator]();
  const pending = stream.next();
  abort.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  t.mock.timers.runAll();
  assert.equal((await stream.next()).done, true);
});

test('aborting a pending fixture chunk retains delivered text and stops subsequent output', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const abort = new AbortController();
  const stream = fixtureReply('a library', abort.signal)[Symbol.asyncIterator]();
  const firstPending = stream.next();
  t.mock.timers.runAll();
  const first = await firstPending;
  assert.equal(first.done, false);
  assert.ok(first.value.length > 0);
  const pending = stream.next();
  abort.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  t.mock.timers.runAll();
  assert.equal((await stream.next()).done, true);
});
