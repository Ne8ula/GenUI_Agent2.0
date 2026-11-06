import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomCompositionController, type ComposedRoom, type RoomCompositionState } from '../src/room/room-composition.ts';
import { createProceduralRoom } from '../src/room/procedural-room.ts';
import type { RoomDescription } from '../src/room/room-description.ts';
import type { RoomInterpretationResult } from '../src/room/room-interpretation-result.ts';
import { caseFixture } from './fixtures/room-case-fixture.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';

type PublicInterpretation = Pick<RoomInterpretationResult, 'reply' | 'outcome' | 'unsupported'>;
const publicResult = (result = interpretation()): PublicInterpretation => ({ reply: result.reply, outcome: result.outcome, unsupported: [...result.unsupported] });

// Synthetic endpoint/build fixtures, not live interpretation or renderer evidence.
function description(): RoomDescription {
  return {
    version: 1, width: 6, depth: 6, height: 3.4,
    doorway: { placement: 'center', width: 1.2, height: 2.3 },
    colors: { wall: 'cream', floor: 'walnut' },
    furnishings: [{ kind: 'chair', color: 'teal' }],
  };
}
function interpretation(): RoomInterpretationResult {
  return { version: 2, outcome: 'supported', reply: 'I imagine a teal chair in a cream room.', unsupported: [], description: description(), case: caseFixture() };
}
function replacementInterpretation(): RoomInterpretationResult {
  const next = caseFixture();
  next.objects[0].furnishingIndex = 1;
  next.clues[0].value = 'square';
  next.solution.candidateId = 'candidate-2';
  return { version: 2, outcome: 'supported', reply: 'I imagine two teal chairs in a cream room.', unsupported: [],
    description: { ...description(), furnishings: [{ kind: 'chair', color: 'teal' }, { kind: 'chair', color: 'teal' }] }, case: next };
}
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const turn = () => new Promise<void>(resolve => setTimeout(resolve, 0));
function trackedRoom(input = description(), seed = 1, throwOnDispose = false) {
  const room = createProceduralRoom(input, seed);
  const dispose = room.dispose;
  let disposals = 0;
  room.dispose = () => {
    disposals += 1;
    dispose();
    if (throwOnDispose) throw new Error('private cleanup detail');
  };
  return { room, get disposals() { return disposals; } };
}
function setup(options: Parameters<typeof createRoomCompositionController>[0] = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const rooms: ReturnType<typeof trackedRoom>[] = [];
  const states: RoomCompositionState[] = [];
  const controller = createRoomCompositionController({
    ...options,
    fetch: async (input, init) => {
      calls.push({ url: String(input), init: init! });
      return options.fetch ? options.fetch(input, init) : json(interpretation());
    },
    build: options.build ?? ((input, seed) => {
      const tracked = trackedRoom(input, seed);
      rooms.push(tracked);
      return tracked.room;
    }),
    yieldToBuild: options.yieldToBuild ?? (() => Promise.resolve()),
    onStatus: state => { states.push(state); options.onStatus?.(state); },
  });
  return { controller, calls, rooms, states };
}

test('idle construction is inert and invalid suggestion/seed never reaches fetch or build', async () => {
  const { controller, calls, rooms } = setup();
  assert.equal(controller.getState().status, 'idle');
  assert.equal(controller.getState().pending, false);
  assert.equal(controller.getState().accepted, null);
  assert.equal(controller.getState().displayed, null);
  assert.equal(controller.reveal(() => { assert.fail('nothing to install'); }), false);
  for (const suggestion of ['', ' \n ', 'x'.repeat(2001), null, 42, {}]) {
    assert.equal(await controller.compose(suggestion as string, 1), false);
    assert.equal(controller.getState().error?.code, 'invalid_input');
  }
  for (const seed of [-1, 0x100000000, 0.5, NaN, Infinity, '2', null]) {
    assert.equal(await controller.compose('room', seed as number), false);
  }
  assert.equal(calls.length, 0);
  assert.equal(rooms.length, 0);
  controller.dispose();
});

test('only explicit compose sends selected text; ready waits for reveal and snapshots are independent', async () => {
  const { controller, calls, rooms, states } = setup();
  let selected = '  A quiet teal room.\n';
  const composing = controller.compose(selected, 0xffffffff);
  selected = 'later editor contents, not the selected suggestion';
  assert.equal(await composing, true);
  assert.deepEqual(states.map(state => state.status), ['interpreting', 'building', 'ready']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/compose-room');
  const init = calls[0].init;
  assert.equal(init.method, 'POST');
  assert.deepEqual(init.headers, { 'content-type': 'application/json' });
  assert.equal(init.credentials, 'same-origin');
  assert.equal(init.redirect, 'error');
  assert.equal(init.cache, 'no-store');
  assert.ok(init.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(String(init.body)), { suggestion: 'A quiet teal room.' });
  const snapshot = controller.getState();
  assert.equal(snapshot.pending, true);
  assert.equal(snapshot.displayed, null);
  assert.deepEqual(snapshot.accepted, { description: description(), case: caseFixture(), suggestion: 'A quiet teal room.', seed: 0xffffffff });
  snapshot.accepted!.description.colors.wall = 'slate';
  snapshot.accepted!.seed = 0;
  snapshot.accepted!.case.solution.candidateId = 'candidate-2';
  snapshot.accepted!.case.clues[0].value = 'square';
  snapshot.accepted!.suggestion = 'mutated contribution';
  states.at(-1)!.accepted!.description.width = 8;
  assert.equal(states[0].accepted, null);
  assert.equal(states[1].accepted, null, 'building is not acceptance');
  assert.deepEqual(controller.getState().accepted, { description: description(), case: caseFixture(), suggestion: 'A quiet teal room.', seed: 0xffffffff });
  assert.equal(rooms[0].room.layout.description.width, 6);
  assert.equal(rooms[0].disposals, 0);
  let installed: ComposedRoom | undefined;
  assert.equal(controller.reveal(room => { installed = room; return true; }), true);
  assert.equal(installed, rooms[0].room);
  assert.equal(controller.getState().status, 'idle');
  assert.equal(controller.getState().pending, false);
  assert.deepEqual(controller.getState().displayed, controller.getState().accepted);
  const displayedSnapshot = controller.getState().displayed!;
  displayedSnapshot.case.objects[0].furnishingIndex = 7;
  displayedSnapshot.case.candidates[0].fabric = 'silk';
  displayedSnapshot.case.solution.candidateId = 'candidate-3';
  displayedSnapshot.suggestion = 'not the original contribution';
  assert.deepEqual(controller.getState().displayed, { description: description(), case: caseFixture(), suggestion: 'A quiet teal room.', seed: 0xffffffff });
  controller.stop();
  controller.dispose();
  controller.dispose();
  assert.equal(rooms[0].disposals, 0, 'transferred room belongs exclusively to the renderer');
  installed!.dispose();
});

test('reply delivery waits for final build validation and projects no authoritative case or room data', async () => {
  const delivered: PublicInterpretation[] = [];
  let built = false;
  const { controller, calls } = setup({ build: (input, seed) => {
    assert.equal(delivered.length, 0, 'no reply before actual room binding');
    assert.equal(input.colors.wall, 'cream');
    const room = createProceduralRoom(input, seed);
    built = true;
    return room;
  } });
  assert.equal(await controller.compose('a teal chair', 5, result => {
    assert.equal(built, true);
    assert.deepEqual(Object.keys(result).sort(), ['outcome', 'reply', 'unsupported']);
    assert.doesNotMatch(JSON.stringify(result), /candidate-\d|clue-\d|object-\d|circle|linen|solution/);
    delivered.push(structuredClone(result));
    result.reply = 'Mutated callback copy.';
    result.unsupported.push('Mutated callback omission.');
  }), true);
  assert.deepEqual(delivered, [publicResult()]);
  assert.equal(calls.length, 1);
  assert.deepEqual(controller.getState().interpretation, interpretation());
  const snapshot = controller.getState();
  snapshot.interpretation!.reply = 'Mutated snapshot.';
  snapshot.interpretation!.case!.solution.candidateId = 'candidate-2';
  assert.equal(controller.getState().interpretation!.reply, 'I imagine a teal chair in a cream room.');
  assert.deepEqual(controller.getState().accepted, { description: description(), case: caseFixture(), suggestion: 'a teal chair', seed: 5 });
  assert.equal(controller.getState().displayed, null);
  controller.dispose();
});

test('unsupported response presents explanation but builds nothing and preserves the displayed room', async () => {
  const noRoom: RoomInterpretationResult = { version: 2, outcome: 'unsupported', reply: 'Pools and configurable lighting are outside my vocabulary.', unsupported: ['Pools', 'Configurable lighting'], description: null, case: null };
  let requests = 0;
  const { controller, rooms, calls } = setup({ fetch: async () => json(++requests === 1 ? interpretation() : noRoom) });
  await controller.compose('a chair', 1);
  controller.reveal(() => true);
  const delivered: PublicInterpretation[] = [];
  assert.equal(await controller.compose('A pool with lots of lights', 2, result => delivered.push(result)), false);
  assert.deepEqual(delivered, [publicResult(noRoom)]);
  assert.equal(controller.getState().status, 'unsupported');
  assert.equal(controller.getState().accepted, null);
  assert.equal(controller.getState().displayed?.seed, 1);
  assert.equal(controller.getState().pending, false);
  assert.equal(controller.reveal(() => { assert.fail('no room to install'); }), false);
  assert.equal(rooms.length, 1);
  assert.equal(calls.length, 2);
  controller.dispose();
  assert.equal(rooms[0].disposals, 0);
  rooms[0].room.dispose();
});

test('mixed result exposes omissions and builds only the validated supported subset', async () => {
  const result: RoomInterpretationResult = { ...interpretation(), outcome: 'partial', unsupported: ['Pools'] };
  const { controller, rooms, calls } = setup({ fetch: async () => json(result) });
  const delivered: PublicInterpretation[] = [];
  assert.equal(await controller.compose('a teal chair and a pool', 3, value => delivered.push(value)), true);
  assert.deepEqual(delivered, [publicResult(result)]);
  assert.deepEqual(rooms[0].room.layout.description.furnishings, [{ kind: 'chair', color: 'teal' }]);
  assert.deepEqual(controller.getState().interpretation?.unsupported, ['Pools']);
  assert.equal(controller.getState().displayed, null);
  assert.equal(calls.length, 1);
  controller.dispose();
});

test('full client validation precedes reply delivery and build, including request consistency', async () => {
  for (const [suggestion, result, code] of [
    ['room', { ...interpretation(), reply: 'Your room is ready.' }, 'invalid_response'],
    ['room', { ...interpretation(), reply: '<img src=x>' }, 'invalid_response'],
    ['room', { ...interpretation(), extra: true }, 'invalid_response'],
    ['room', { ...interpretation(), description: { ...description(), width: 99 } }, 'invalid_response'],
    ['A pool with lots of lights', interpretation(), 'unsupported_capability'],
    ['A pool with lots of lights', { ...interpretation(), outcome: 'partial', unsupported: ['Pools', 'Configurable lighting'] }, 'unsupported_capability'],
  ] as const) {
    const { controller, rooms, calls } = setup({ fetch: async () => json(result) });
    assert.equal(await controller.compose(suggestion, 1, () => { assert.fail('invalid reply presented'); }), false);
    assert.equal(controller.getState().error?.code, code);
    assert.equal(controller.getState().interpretation, null);
    assert.equal(rooms.length, 0);
    assert.equal(calls.length, 1);
    controller.dispose();
  }
});

test('unsupported furniture placement is rejected before reply or build while the displayed room is retained', async () => {
  const invalid = { ...interpretation(), reply: 'I imagine a teal chair near the far wall.' };
  let requests = 0;
  const { controller, rooms, calls, states } = setup({ fetch: async () => json(++requests === 1 ? interpretation() : invalid) });
  let installed: ComposedRoom | undefined;
  try {
    assert.equal(await controller.compose('A teal chair', 1), true);
    assert.equal(controller.reveal(room => { installed = room; return true; }), true);
    const displayed = controller.getState().displayed;
    const stateCount = states.length;
    const delivered: PublicInterpretation[] = [];
    assert.equal(await controller.compose('A teal chair', 2, result => delivered.push(result)), false);
    const rejected = controller.getState();
    assert.deepEqual(delivered, []);
    assert.equal(rejected.status, 'error');
    assert.equal(rejected.error?.code, 'invalid_response');
    assert.equal(rejected.interpretation, null);
    assert.equal(rejected.accepted, null);
    assert.equal(rejected.pending, false);
    assert.deepEqual(rejected.displayed, displayed);
    assert.deepEqual(states.slice(stateCount).map(state => state.status), ['interpreting', 'error']);
    let installs = 0;
    assert.equal(controller.reveal(() => { installs += 1; return true; }), false);
    assert.equal(installs, 0);
    assert.equal(rooms.length, 1);
    assert.equal(installed, rooms[0].room);
    assert.equal(rooms[0].disposals, 0);
    assert.equal(calls.length, 2);
    assert.equal(JSON.stringify(rejected).includes(invalid.reply), false);
    controller.dispose();
    assert.equal(rooms[0].disposals, 0, 'rejected replacement does not dispose the renderer-owned room');
  } finally {
    controller.dispose();
    installed?.dispose();
  }
});

test('stop before envelope acceptance suppresses late reply and a restarted turn receives only its own result', async () => {
  const pending = deferred<Response>();
  let requests = 0;
  const { controller, calls } = setup({ fetch: () => ++requests === 1 ? pending.promise : Promise.resolve(json(interpretation())) });
  const oldReplies: PublicInterpretation[] = [];
  const newReplies: PublicInterpretation[] = [];
  const old = controller.compose('old chair', 1, value => oldReplies.push(value));
  controller.stop();
  assert.equal(await old, false);
  assert.equal(controller.getState().interpretation, null);
  await controller.compose('new chair', 2, value => newReplies.push(value));
  pending.resolve(json(interpretation()));
  await turn();
  assert.equal(oldReplies.length, 0);
  assert.equal(newReplies.length, 1);
  assert.equal(calls[0].init.signal!.aborted, true);
  assert.equal(controller.getState().accepted?.seed, 2);
  controller.dispose();
});

test('stopping room work after acceptance does not invalidate the accepted reply', async () => {
  const { controller, rooms } = setup();
  let delivered: PublicInterpretation | undefined;
  assert.equal(await controller.compose('a chair', 1, value => { delivered = value; controller.stop(); }), false);
  assert.equal(delivered?.reply, 'I imagine a teal chair in a cream room.');
  assert.deepEqual(controller.getState().interpretation, interpretation());
  assert.equal(controller.getState().status, 'cancelled');
  assert.equal(rooms.length, 1, 'acceptance now follows final build validation');
  assert.equal(rooms[0].disposals, 1);
  assert.deepEqual(controller.getState().accepted?.case, caseFixture());
  controller.dispose();
});

test('2000-character suggestion and both uint32 endpoints are accepted', async () => {
  for (const seed of [0, 0xffffffff]) {
    const { controller, calls } = setup();
    assert.equal(await controller.compose('界'.repeat(2000), seed), true);
    assert.equal(JSON.parse(String(calls[0].init.body)).suggestion.length, 2000);
    controller.dispose();
  }
});

test('single flight rejects second compose while interpreting, yielding, and building', { timeout: 2000 }, async () => {
  const response = deferred<Response>();
  const yielding = deferred<void>();
  const reachedYield = deferred<void>();
  const built = deferred<ComposedRoom>();
  const reachedBuild = deferred<void>();
  const room = trackedRoom();
  const { controller, calls } = setup({
    fetch: () => response.promise,
    yieldToBuild: () => { reachedYield.resolve(); return yielding.promise; },
    build: () => { reachedBuild.resolve(); return built.promise; },
  });
  const first = controller.compose('first', 1);
  assert.equal(await controller.compose('second', 2), false);
  response.resolve(json(interpretation()));
  await reachedYield.promise;
  assert.equal(controller.getState().status, 'building');
  assert.equal(await controller.compose('third', 3), false);
  yielding.resolve();
  await reachedBuild.promise;
  assert.equal(await controller.compose('fourth', 4), false);
  built.resolve(room.room);
  assert.equal(await first, true);
  assert.equal(calls.length, 1);
  controller.dispose();
  assert.equal(room.disposals, 1);
});

test('valid replacement discards abandoned pending room once; stopping ready is idempotent', async () => {
  const { controller, rooms } = setup();
  await controller.compose('first', 1);
  await controller.compose('second', 2);
  assert.equal(rooms[0].disposals, 1);
  assert.equal(rooms[1].disposals, 0);
  assert.equal(controller.stop(), true);
  assert.equal(controller.getState().status, 'cancelled');
  assert.equal(controller.getState().pending, false);
  assert.equal(controller.getState().accepted?.seed, 2);
  assert.equal(controller.stop(), false);
  controller.dispose();
  assert.equal(rooms[1].disposals, 1);
});

test('only successful synchronous install replaces the modeled old room', async () => {
  for (const outcome of ['false', 'throw', 'true'] as const) {
    const old = trackedRoom();
    let current = old.room;
    const { controller, rooms } = setup();
    await controller.compose('replacement', 7);
    assert.equal(current, old.room);
    const installed = controller.reveal(room => {
      assert.equal(current, old.room);
      if (outcome === 'false') return false;
      if (outcome === 'throw') throw new Error('private renderer detail');
      current = room;
      old.room.dispose();
      return true;
    });
    assert.equal(installed, outcome === 'true');
    assert.equal(current, outcome === 'true' ? rooms[0].room : old.room);
    assert.equal(old.disposals, outcome === 'true' ? 1 : 0);
    assert.equal(rooms[0].disposals, outcome === 'true' ? 0 : 1);
    assert.equal(controller.getState().pending, false);
    if (outcome !== 'true') {
      assert.equal(controller.getState().error?.code, 'install_failed');
      assert.equal(controller.getState().displayed, null);
    }
    assert.equal(controller.reveal(() => { assert.fail('already consumed'); }), false);
    controller.dispose();
    current.dispose();
  }
});

test('stop releases interpretation promptly and cancels a late response without touching a newer result', { timeout: 2000 }, async () => {
  const response = deferred<Response>();
  let request = 0;
  let cancellations = 0;
  const { controller, calls, rooms } = setup({ fetch: () => ++request === 1 ? response.promise : Promise.resolve(json(interpretation())) });
  const first = controller.compose('first', 1);
  controller.stop();
  assert.equal(await first, false);
  assert.equal(calls[0].init.signal!.aborted, true);
  assert.equal(await controller.compose('second', 2), true);
  const state = controller.getState();
  response.resolve(new Response(new ReadableStream({ cancel() { cancellations += 1; } }), { headers: { 'content-type': 'application/json' } }));
  await turn();
  assert.equal(cancellations, 1);
  assert.deepEqual(controller.getState(), state);
  assert.equal(rooms.length, 1);
  controller.dispose();
});

test('late interpretation failure cannot replace newer ready state or create an unhandled rejection', { timeout: 2000 }, async () => {
  const response = deferred<Response>();
  let request = 0;
  const { controller } = setup({ fetch: () => ++request === 1 ? response.promise : Promise.resolve(json(interpretation())) });
  const first = controller.compose('first', 1);
  controller.stop();
  await first;
  await controller.compose('second', 2);
  const state = controller.getState();
  response.reject(new Error('private network detail'));
  await turn();
  assert.deepEqual(controller.getState(), state);
  controller.dispose();
});

test('stop during yield prevents build and acceptance without claiming a reply or display', { timeout: 2000 }, async () => {
  const reached = deferred<void>();
  const yielding = deferred<void>();
  const { controller, rooms } = setup({ yieldToBuild: () => { reached.resolve(); return yielding.promise; } });
  const replies: PublicInterpretation[] = [];
  const composing = controller.compose('room', 4, value => replies.push(value));
  await reached.promise;
  controller.stop();
  assert.equal(await composing, false);
  yielding.resolve();
  await turn();
  assert.equal(rooms.length, 0);
  assert.equal(controller.getState().status, 'cancelled');
  assert.equal(controller.getState().accepted, null);
  assert.equal(controller.getState().interpretation, null);
  assert.deepEqual(replies, []);
  assert.equal(controller.getState().displayed, null);
  controller.dispose();
});

test('late asynchronous build is disposed exactly once and never replaces a newer pending room', { timeout: 2000 }, async () => {
  const reached = deferred<void>();
  const built = deferred<ComposedRoom>();
  const late = trackedRoom();
  const next = trackedRoom(description(), 2);
  let builds = 0;
  const { controller } = setup({ build: () => { if (++builds === 1) { reached.resolve(); return built.promise; } return next.room; } });
  const first = controller.compose('first', 1);
  await reached.promise;
  controller.stop();
  assert.equal(await first, false);
  await controller.compose('second', 2);
  const state = controller.getState();
  built.resolve(late.room);
  await turn();
  assert.equal(late.disposals, 1);
  assert.equal(next.disposals, 0);
  assert.deepEqual(controller.getState(), state);
  controller.dispose();
  assert.equal(late.disposals, 1);
  assert.equal(next.disposals, 1);
});

test('late build failure is inert and unmount disposes a late successful build', { timeout: 2000 }, async () => {
  for (const succeeds of [false, true]) {
    const reached = deferred<void>();
    const built = deferred<ComposedRoom>();
    const late = trackedRoom();
    const { controller, calls } = setup({ build: () => { reached.resolve(); return built.promise; } });
    const composing = controller.compose('room', 1);
    await reached.promise;
    controller.dispose();
    assert.equal(await composing, false);
    const state = controller.getState();
    assert.equal(state.disposed, true);
    if (succeeds) built.resolve(late.room);
    else built.reject(new Error('private build detail'));
    await turn();
    assert.deepEqual(controller.getState(), state);
    assert.equal(late.disposals, succeeds ? 1 : 0);
    assert.equal(await controller.compose('later', 2), false);
    assert.equal(controller.reveal(() => { assert.fail('disposed'); }), false);
    assert.equal(calls.length, 1);
    controller.dispose();
    if (!succeeds) late.room.dispose();
  }
});

test('malformed endpoint shape and room data fail before build', async () => {
  for (const body of [null, [], {}, { description: null }, { description: description(), code: 'execute()' },
    { description: { ...description(), width: 99 } }, { description: { ...description(), asset: 'https://invalid.example/a' } },
    { description: { ...description(), furnishings: [{ kind: 'chair', color: 'unknown' }] } }]) {
    const { controller, rooms } = setup({ fetch: async () => json(body) });
    assert.equal(await controller.compose('room', 1), false);
    assert.equal(controller.getState().error?.code, 'invalid_response');
    assert.equal(rooms.length, 0);
    controller.dispose();
  }
});

test('endpoint bytes, UTF-8, JSON media type and content length are bounded', async () => {
  const good = JSON.stringify(interpretation());
  const headers = { 'content-type': 'application/json' };
  const invalid = [
    () => new Response(good, { headers: { 'content-type': 'text/plain' } }),
    () => new Response('{', { headers }),
    () => new Response(new Uint8Array([0xff]), { headers }),
    () => new Response(' '.repeat(16385), { headers }),
    () => new Response(good, { headers: { ...headers, 'content-length': '16385' } }),
    () => new Response(good, { headers: { ...headers, 'content-length': 'no' } }),
    () => new Response(good, { headers: { ...headers, 'content-length': '1' } }),
    () => new Response(null, { headers }),
  ];
  for (const response of invalid) {
    const { controller, rooms } = setup({ fetch: async () => response() });
    assert.equal(await controller.compose('room', 1), false);
    assert.equal(controller.getState().error?.code, 'invalid_response');
    assert.equal(rooms.length, 0);
    controller.dispose();
  }
  const exact = `${good}${' '.repeat(16384 - new TextEncoder().encode(good).byteLength)}`;
  const { controller } = setup({ fetch: async () => new Response(exact, { headers }) });
  assert.equal(await controller.compose('room', 1), true);
  controller.dispose();
});

test('API errors are fixed local messages, not raw endpoint text, and never retried', async () => {
  for (const [code, status] of [['disabled', 503], ['missing_key', 503], ['budget_exhausted', 429], ['busy', 409], ['timeout', 504], ['interpretation_refused', 422], ['input_token_limit', 422]] as const) {
    const { controller, calls, rooms } = setup({ fetch: async () => json({ error: code, message: 'private endpoint detail', remainingRequests: 1 }, status) });
    assert.equal(await controller.compose('room', 1), false);
    assert.equal(controller.getState().error?.code, code);
    assert.doesNotMatch(JSON.stringify(controller.getState()), /private endpoint detail/);
    assert.equal(calls.length, 1);
    assert.equal(rooms.length, 0);
    controller.dispose();
  }
  const { controller } = setup({ fetch: async () => json({ error: 'arbitrary-provider-code', message: 'private detail' }, 500) });
  await controller.compose('room', 1);
  assert.equal(controller.getState().error?.code, 'interpretation_failed');
  controller.dispose();
});

test('network failure is sanitized and a later explicit compose can succeed', async () => {
  let request = 0;
  const { controller, calls } = setup({ fetch: async () => {
    if (++request === 1) throw new Error('private URL and key');
    return json(interpretation());
  } });
  assert.equal(await controller.compose('first', 1), false);
  assert.equal(controller.getState().error?.code, 'network_error');
  assert.doesNotMatch(JSON.stringify(controller.getState()), /private URL and key/);
  assert.equal(await controller.compose('second', 2), true);
  assert.equal(calls.length, 2);
  controller.dispose();
});

test('stopping a pending response read cancels its reader and releases the controller', { timeout: 2000 }, async () => {
  const reading = deferred<void>();
  let cancellations = 0;
  const { controller } = setup({ fetch: async () => new Response(new ReadableStream({
    pull() { reading.resolve(); }, cancel() { cancellations += 1; },
  }, { highWaterMark: 0 }), { headers: { 'content-type': 'application/json' } }) });
  const composing = controller.compose('room', 1);
  await reading.promise;
  controller.stop();
  assert.equal(await composing, false);
  await turn();
  assert.equal(cancellations, 1);
  assert.equal(controller.getState().status, 'cancelled');
  controller.dispose();
});

test('response received just before stop is cancelled even before a reader is acquired', { timeout: 2000 }, async () => {
  let cancellations = 0;
  let controller!: ReturnType<typeof createRoomCompositionController>;
  ({ controller } = setup({ fetch: () => Promise.resolve(new Response(new ReadableStream({
    cancel() { cancellations += 1; },
  }), { headers: { 'content-type': 'application/json' } })).then(response => {
    queueMicrotask(() => queueMicrotask(() => controller.stop()));
    return response;
  }) }));
  assert.equal(await controller.compose('room', 1), false);
  await turn();
  assert.equal(cancellations, 1);
  assert.equal(controller.getState().status, 'cancelled');
  controller.dispose();
});

test('build failure leaves successfully displayed metadata and the renderer-owned room untouched', async () => {
  const room = trackedRoom();
  let builds = 0;
  const { controller } = setup({ build: () => {
    if (++builds === 1) return room.room;
    throw new Error('private allocation detail');
  } });
  await controller.compose('displayed', 1);
  controller.reveal(() => true);
  assert.equal(await controller.compose('cannot build', 2), false);
  assert.equal(controller.getState().error?.code, 'build_failed');
  assert.equal(controller.getState().displayed?.seed, 1);
  assert.equal(controller.getState().accepted, null, 'failed final build is never accepted');
  assert.equal(controller.getState().interpretation, null);
  assert.equal(controller.getState().pending, false);
  controller.dispose();
  assert.equal(room.disposals, 0);
  room.room.dispose();
});

test('throwing pending cleanup is reported and never attempted twice on stop, replacement or failed install', async () => {
  for (const action of ['stop', 'replace', 'install'] as const) {
    const broken = trackedRoom(description(), 1, true);
    const { controller, calls } = setup({ build: () => broken.room });
    await controller.compose('room', 1);
    if (action === 'stop') controller.stop();
    if (action === 'replace') assert.equal(await controller.compose('new', 2), false);
    if (action === 'install') assert.equal(controller.reveal(() => false), false);
    assert.equal(controller.getState().status, 'error');
    assert.equal(controller.getState().error?.code, 'cleanup_failed');
    assert.ok(controller.getState().cleanupError);
    assert.doesNotMatch(JSON.stringify(controller.getState()), /private cleanup detail/);
    assert.equal(controller.getState().pending, false);
    controller.stop();
    controller.dispose();
    controller.dispose();
    assert.equal(broken.disposals, 1);
    assert.equal(calls.length, 1);
  }
});

test('late cleanup failure is observable without replacing the newer composition status or metadata', { timeout: 2000 }, async () => {
  const reached = deferred<void>();
  const built = deferred<ComposedRoom>();
  const late = trackedRoom(description(), 1, true);
  const next = trackedRoom(description(), 2);
  let builds = 0;
  const { controller, states } = setup({ build: () => { if (++builds === 1) { reached.resolve(); return built.promise; } return next.room; } });
  const first = controller.compose('first', 1);
  await reached.promise;
  controller.stop();
  await first;
  await controller.compose('second', 2);
  const before = controller.getState();
  built.resolve(late.room);
  await turn();
  assert.equal(late.disposals, 1);
  assert.equal(controller.getState().status, 'ready');
  assert.deepEqual(controller.getState().accepted, before.accepted);
  assert.equal(controller.getState().error, null);
  assert.ok(controller.getState().cleanupError);
  assert.ok(states.at(-1)!.cleanupError);
  controller.dispose();
  assert.equal(late.disposals, 1);
  assert.equal(next.disposals, 1);
});

test('status callbacks can stop interpreting/building/ready without leaking or continuing work', async () => {
  for (const phase of ['interpreting', 'building', 'ready'] as const) {
    let controller!: ReturnType<typeof createRoomCompositionController>;
    const result = setup({ onStatus: state => { if (state.status === phase) controller.stop(); } });
    controller = result.controller;
    assert.equal(await controller.compose('room', 1), false);
    assert.equal(controller.getState().status, 'cancelled');
    assert.equal(result.calls.length, phase === 'interpreting' ? 0 : 1);
    assert.equal(result.rooms.length, phase === 'ready' ? 1 : 0);
    if (phase === 'ready') assert.equal(result.rooms[0].disposals, 1);
    controller.dispose();
  }
});

test('default build yield lets a queued stop intervene before construction', { timeout: 2000 }, async () => {
  let builds = 0;
  const controller = createRoomCompositionController({
    fetch: async () => json(interpretation()),
    onStatus: state => { if (state.status === 'building') queueMicrotask(() => controller.stop()); },
    build: () => { builds += 1; return createProceduralRoom(description(), 1); },
  });
  assert.equal(await controller.compose('room', 1), false);
  assert.equal(builds, 0);
  assert.equal(controller.getState().status, 'cancelled');
  controller.dispose();
});

test('default builder produces a complete scene and terminal disposal prevents new activity', async () => {
  let calls = 0;
  const controller = createRoomCompositionController({ fetch: async () => { calls += 1; return json(interpretation()); } });
  assert.equal(await controller.compose('room', 8), true);
  let installed!: ComposedRoom;
  assert.equal(controller.reveal(room => {
    assert.ok(room.scene.getObjectByName('architecture'));
    assert.ok(room.scene.getObjectByName('chair-1'));
    assert.equal(room.layout.seed, 8);
    installed = room;
    return true;
  }), true);
  controller.dispose();
  const state = controller.getState();
  assert.equal(await controller.compose('no activity after unmount', 9), false);
  assert.equal(controller.stop(), false);
  assert.deepEqual(controller.getState(), state);
  assert.equal(calls, 1);
  installed.dispose();
});

test('stop prevents synchronous abort listeners from starting work inside cancellation', { timeout: 2000 }, async () => {
  const response = deferred<Response>();
  let request = 0;
  const { controller, calls } = setup({ fetch: () => ++request === 1 ? response.promise : Promise.resolve(json(interpretation())) });
  const composing = controller.compose('first', 1);
  let reentrant: Promise<boolean> | undefined;
  calls[0].init.signal!.addEventListener('abort', () => { reentrant = controller.compose('inside abort', 2); }, { once: true });
  controller.stop();
  assert.equal(await composing, false);
  assert.equal(await reentrant, false);
  assert.equal(calls.length, 1);
  assert.equal(controller.getState().status, 'cancelled');
  response.resolve(json(interpretation()));
  await turn();
  controller.dispose();
});

test('terminal disposal detaches status notifications while retaining a late cleanup warning', { timeout: 2000 }, async () => {
  const reached = deferred<void>();
  const built = deferred<ComposedRoom>();
  const late = trackedRoom(description(), 1, true);
  const { controller, states } = setup({ build: () => { reached.resolve(); return built.promise; } });
  const composing = controller.compose('room', 1);
  await reached.promise;
  controller.dispose();
  assert.equal(await composing, false);
  const notifications = states.length;
  built.resolve(late.room);
  await turn();
  assert.equal(late.disposals, 1);
  assert.equal(states.length, notifications);
  assert.ok(controller.getState().cleanupError);
  assert.equal(controller.getState().status, 'cancelled');
});

test('failed-install cleanup cannot synchronously start a replacement inside its ownership decision', async () => {
  const { controller, calls, rooms } = setup();
  await controller.compose('first', 1);
  const dispose = rooms[0].room.dispose;
  let reentrant: Promise<boolean> | undefined;
  rooms[0].room.dispose = () => { reentrant = controller.compose('inside cleanup', 2); dispose(); };
  assert.equal(controller.reveal(() => false), false);
  assert.equal(await reentrant, false);
  assert.equal(calls.length, 1);
  assert.equal(rooms[0].disposals, 1);
  assert.equal(controller.getState().error?.code, 'install_failed');
  controller.dispose();
});

test('invalid case structure, references, deductions and solutions never deliver a reply or build', async () => {
  const base = interpretation();
  const { case: _case, ...roomOnly } = base;
  for (const invalid of [
    { ...roomOnly, version: 1 }, roomOnly, { ...base, case: null },
    { ...base, case: { ...caseFixture(), private: 'private-marker' } },
    { ...base, case: { ...caseFixture(), objects: [{ id: 'object-1', furnishingIndex: 1 }] } },
    { ...base, case: { ...caseFixture(), solution: { candidateId: 'candidate-2' } } },
    { ...base, reply: 'The culprit is candidate-1.' },
  ]) {
    let requests = 0;
    let delivered = 0;
    const { controller, rooms } = setup({ fetch: async () => json(++requests === 1 ? base : invalid) });
    try {
      assert.equal(await controller.compose('old chair', 1), true);
      assert.equal(controller.reveal(() => true), true);
      const old = controller.getState().displayed;
      assert.equal(await controller.compose('new chair', 2, () => { delivered += 1; }), false);
      assert.equal(delivered, 0);
      assert.equal(rooms.length, 1);
      const state = controller.getState();
      assert.equal(state.error?.code, 'invalid_response');
      assert.equal(state.accepted, null);
      assert.equal(state.interpretation, null);
      assert.equal(state.pending, false);
      assert.deepEqual(state.displayed, old);
      assert.doesNotMatch(JSON.stringify(state), /private-marker|The culprit/);
      assert.equal(rooms[0].disposals, 0);
    } finally { controller.dispose(); rooms[0]?.room.dispose(); }
  }
});

test('final built room integrity and seed mismatch fail before acceptance and dispose exactly once', async () => {
  for (const mutate of [
    (room: ComposedRoom) => { room.layout.seed = 99; },
    (room: ComposedRoom) => { room.layout.description.colors.wall = 'slate'; },
    (room: ComposedRoom) => { room.scene.getObjectByName('furnishings')!.clear(); },
    (room: ComposedRoom) => { room.scene.getObjectByName('chair-1')!.clear(); },
    (room: ComposedRoom) => { room.layout.furnishings[0].kind = 'shelf'; },
  ]) {
    const built = trackedRoom();
    let delivered = 0;
    const { controller, states } = setup({ build: () => { mutate(built.room); return built.room; } });
    assert.equal(await controller.compose('chair', 1, () => { delivered += 1; }), false);
    assert.equal(delivered, 0);
    assert.equal(controller.getState().error?.code, 'build_failed');
    assert.equal(controller.getState().accepted, null);
    assert.equal(controller.getState().interpretation, null);
    assert.equal(controller.getState().pending, false);
    assert.equal(controller.getState().displayed, null);
    assert.equal(states.some(state => state.status === 'ready'), false);
    assert.equal(built.disposals, 1);
    controller.stop();
    controller.dispose();
    assert.equal(built.disposals, 1);
  }
});

test('mutating the builder input cannot silently replace the snapshotted described room', async () => {
  let built: ReturnType<typeof trackedRoom> | undefined;
  let delivered = 0;
  const { controller } = setup({ build: (input, seed) => {
    input.furnishings[0].kind = 'shelf';
    built = trackedRoom(input, seed);
    return built.room;
  } });
  assert.equal(await controller.compose('chair', 1, () => { delivered += 1; }), false);
  assert.equal(delivered, 0);
  assert.equal(controller.getState().accepted, null);
  assert.equal(controller.getState().error?.code, 'build_failed');
  controller.dispose();
  assert.equal(built?.disposals, 1);
});

test('only successful synchronous Reveal commits a distinct room, case and original contribution together', async () => {
  for (const outcome of ['false', 'throw', 'true'] as const) {
    let requests = 0;
    const next = replacementInterpretation();
    const { controller, rooms } = setup({ fetch: async () => json(++requests === 1 ? interpretation() : next) });
    assert.equal(await controller.compose('  old visitor suggestion  ', 1), true);
    assert.equal(controller.reveal(() => true), true);
    const old = controller.getState().displayed;
    assert.equal(await controller.compose('  new visitor\nsuggestion  ', 2), true);
    assert.deepEqual(controller.getState().displayed, old, 'Compose alone never changes displayed truth');
    assert.deepEqual(controller.getState().accepted?.case, next.case);
    assert.equal(controller.getState().accepted?.suggestion, 'new visitor\nsuggestion');
    const pending = controller.getState();
    pending.accepted!.case.solution.candidateId = 'candidate-3';
    pending.accepted!.suggestion = 'mutated snapshot';
    assert.equal(controller.reveal(room => {
      assert.equal(room, rooms[1].room);
      assert.deepEqual(controller.getState().displayed, old, 'no half-committed unit during installation');
      if (outcome === 'false') return false;
      if (outcome === 'throw') throw new Error('private renderer detail');
      rooms[0].room.dispose();
      return true;
    }), outcome === 'true');
    if (outcome === 'true') {
      assert.deepEqual(controller.getState().displayed, { description: next.description, case: next.case, suggestion: 'new visitor\nsuggestion', seed: 2 });
      assert.equal(rooms[0].disposals, 1);
      assert.equal(rooms[1].disposals, 0);
    } else {
      assert.deepEqual(controller.getState().displayed, old);
      assert.equal(rooms[0].disposals, 0);
      assert.equal(rooms[1].disposals, 1);
    }
    assert.equal(controller.getState().pending, false);
    controller.dispose();
    (outcome === 'true' ? rooms[1] : rooms[0]).room.dispose();
  }
});

test('Reveal rechecks pending scene identity before calling the installer and preserves the old pair', async () => {
  let requests = 0;
  const { controller, rooms } = setup({ fetch: async () => json(++requests === 1 ? interpretation() : replacementInterpretation()) });
  await controller.compose('old chair', 1);
  controller.reveal(() => true);
  const old = controller.getState().displayed;
  await controller.compose('new chairs', 2);
  rooms[1].room.scene.getObjectByName('chair-2')!.clear();
  let installations = 0;
  assert.equal(controller.reveal(() => { installations += 1; return true; }), false);
  assert.equal(installations, 0);
  assert.deepEqual(controller.getState().displayed, old);
  assert.equal(controller.getState().pending, false);
  assert.equal(controller.getState().error?.code, 'install_failed');
  assert.equal(rooms[1].disposals, 1);
  assert.equal(rooms[0].disposals, 0);
  controller.stop();
  controller.dispose();
  assert.equal(rooms[1].disposals, 1);
  rooms[0].room.dispose();
});

test('cancelled late construction cannot deliver or resurrect its case over a displayed and newer pending pair', { timeout: 2000 }, async () => {
  const stale = replacementInterpretation();
  const latest = replacementInterpretation();
  latest.case!.clues[0].value = 'circle';
  latest.case!.clues[1].value = 'wool';
  latest.case!.solution.candidateId = 'candidate-3';
  const reached = deferred<void>();
  const delayed = deferred<ComposedRoom>();
  const rooms: ReturnType<typeof trackedRoom>[] = [];
  let requests = 0;
  const { controller } = setup({
    fetch: async () => json([interpretation(), stale, latest][requests++]),
    build: (input, seed) => {
      const tracked = trackedRoom(input, seed);
      rooms.push(tracked);
      if (seed === 2) { reached.resolve(); return delayed.promise; }
      return tracked.room;
    },
  });
  await controller.compose('old', 1);
  controller.reveal(() => true);
  const old = controller.getState().displayed;
  const staleReplies: PublicInterpretation[] = [];
  const composing = controller.compose('stale', 2, value => staleReplies.push(value));
  await reached.promise;
  assert.equal(controller.getState().accepted, null);
  assert.deepEqual(staleReplies, []);
  controller.stop();
  assert.equal(await composing, false);
  assert.deepEqual(controller.getState().displayed, old);
  const newReplies: PublicInterpretation[] = [];
  assert.equal(await controller.compose('latest', 3, value => newReplies.push(value)), true);
  const ready = controller.getState();
  delayed.resolve(rooms[1].room);
  await turn();
  assert.deepEqual(staleReplies, []);
  assert.deepEqual(newReplies, [publicResult(latest)]);
  assert.deepEqual(controller.getState(), ready);
  assert.deepEqual(ready.accepted?.case, latest.case);
  assert.deepEqual(ready.displayed, old);
  assert.equal(rooms[1].disposals, 1);
  assert.equal(rooms[0].disposals, 0);
  controller.stop();
  assert.deepEqual(controller.getState().displayed, old);
  controller.dispose();
  assert.equal(rooms[2].disposals, 1);
  rooms[0].room.dispose();
});

test('reentrant disposal during synchronous successful install never disposes the transferred room', async () => {
  const { controller, rooms } = setup();
  await controller.compose('room', 1);
  assert.equal(controller.reveal(() => {
    assert.equal(controller.reveal(() => true), false);
    controller.stop();
    controller.dispose();
    return true;
  }), true);
  assert.equal(controller.getState().disposed, true);
  assert.equal(controller.getState().displayed?.seed, 1);
  assert.equal(rooms[0].disposals, 0);
  controller.dispose();
  rooms[0].room.dispose();
});

// Increment 4A: exercise the existing controller before depending on any new helper.
test('successful Reveal starts empty case-local inspection, not pending composition or an authored fixture', async () => {
  const { controller, rooms } = setup({ fetch: async () => json(inspectionFixture()) });
  try {
    assert.equal(controller.getState().inspection, null);
    assert.equal(await controller.compose('four teal chairs', 41), true);
    assert.equal(controller.getState().inspection, null);
    assert.equal(controller.inspect(Symbol('not displayed'), 'object-1'), false);
    assert.equal(controller.reveal(() => true), true);
    const view = controller.getState().inspection;
    assert.ok(view, 'successful Reveal must expose an empty inspection projection');
    assert.equal(typeof view.unit, 'symbol');
    assert.deepEqual(view.objects, [
      { id: 'object-1', label: 'teal chair 2' },
      { id: 'object-2', label: 'teal chair 1' },
      { id: 'object-3', label: 'teal chair 3' },
    ]);
    assert.equal(view.selectedObjectId, null);
    assert.deepEqual(view.discoveredClues, []);
    assert.doesNotMatch(JSON.stringify(view), /solution|candidate|clue-[1-4]|circle|square|linen|silk|furnishingIndex/);
  } finally { controller.dispose(); rooms.forEach(({ room }) => room.dispose()); }
});

test('inspection reveals all and only attached clues, is idempotent and never mutates truth or contribution', async () => {
  const fixture = inspectionFixture();
  const original = structuredClone(fixture);
  const { controller, rooms } = setup({ fetch: async () => json(fixture) });
  try {
    assert.equal(await controller.compose('  original visitor words  ', 41), true);
    assert.equal(controller.reveal(() => true), true);
    const before = controller.getState();
    assert.ok(before.inspection, 'successful Reveal must expose inspection');
    const unit = before.inspection.unit;
    assert.equal(controller.inspect(unit, 'object-1'), true);
    const first = controller.getState().inspection!;
    assert.equal(first.selectedObjectId, 'object-1');
    assert.deepEqual(first.discoveredClues, [
      { id: 'clue-1', objectId: 'object-1', text: 'Fictional text-only annotation: badge matches circle.' },
      { id: 'clue-3', objectId: 'object-1', text: 'Fictional text-only annotation: badge differs from square.' },
    ]);
    assert.doesNotMatch(JSON.stringify(first), /solution|candidate|culprit|clue-2|clue-4|linen|silk/);
    assert.equal(controller.inspect(unit, 'object-1'), true);
    assert.deepEqual(controller.getState().inspection, first);
    assert.equal(controller.inspect(unit, 'object-3'), true, 'bound object without clues is still inspectable');
    assert.equal(controller.getState().inspection!.selectedObjectId, 'object-3');
    assert.deepEqual(controller.getState().inspection!.discoveredClues, first.discoveredClues);
    assert.equal(controller.inspect(unit, 'object-4'), false, 'the fourth chair is not case-bound');
    assert.equal(controller.inspect(unit, 'chair-4'), false);
    assert.equal(controller.inspect(unit, 'architecture'), false);
    assert.equal(controller.getState().inspection!.selectedObjectId, 'object-3');
    assert.equal(controller.inspect(unit, 'object-2'), true);
    assert.deepEqual(controller.getState().inspection!.discoveredClues, [
      ...first.discoveredClues,
      { id: 'clue-2', objectId: 'object-2', text: 'Fictional text-only annotation: fabric matches linen.' },
      { id: 'clue-4', objectId: 'object-2', text: 'Fictional text-only annotation: fabric differs from silk.' },
    ]);
    const after = controller.getState();
    assert.deepEqual(after.displayed, before.displayed);
    assert.deepEqual(after.accepted, before.accepted);
    assert.deepEqual(after.interpretation, before.interpretation);
    assert.equal(after.displayed!.suggestion, 'original visitor words');
    assert.deepEqual(fixture, original);
    assert.doesNotMatch(JSON.stringify(after.inspection), /solution|candidate|culprit|candidates/);
    after.inspection!.objects[0].label = 'mutated snapshot';
    after.inspection!.discoveredClues[0].text = 'mutated annotation';
    after.inspection!.discoveredClues.pop();
    assert.equal(controller.getState().inspection!.objects[0].label, 'teal chair 2');
    assert.equal(controller.getState().inspection!.discoveredClues.length, 4);
    assert.match(controller.getState().inspection!.discoveredClues[0].text, /badge matches circle/);
  } finally { controller.dispose(); rooms.forEach(({ room }) => room.dispose()); }
});

test('inspection survives pending work, cancellation, validation/build failures and every failed Reveal', async () => {
  for (const failure of ['cancel', 'invalid', 'build', 'false', 'throw', 'binding'] as const) {
    let requests = 0;
    let builds = 0;
    const { controller, rooms } = setup({
      fetch: async () => json(++requests === 2 && failure === 'invalid' ? { ...inspectionFixture(), extra: true } : inspectionFixture()),
      ...(failure === 'build' ? { build: (input: RoomDescription, seed: number) => {
        if (++builds === 2) throw new Error('synthetic build failure');
        return createProceduralRoom(input, seed);
      } } : {}),
    });
    let installed: ComposedRoom | undefined;
    try {
      assert.equal(await controller.compose('old contribution', 41), true);
      assert.equal(controller.reveal(room => { installed = room; return true; }), true);
      assert.ok(controller.getState().inspection);
      const unit = controller.getState().inspection!.unit;
      controller.inspect(unit, 'object-1');
      const before = controller.getState();
      assert.equal(await controller.compose('replacement contribution', 41), !['invalid', 'build'].includes(failure));
      assert.deepEqual(controller.getState().inspection, before.inspection, failure);
      if (failure === 'cancel') controller.stop();
      if (failure === 'binding') rooms[1].room.scene.getObjectByName('chair-2')!.clear();
      if (['false', 'throw', 'binding'].includes(failure)) {
        assert.equal(controller.reveal(() => {
          assert.notEqual(failure, 'binding', 'invalid binding must fail before installer');
          assert.deepEqual(controller.getState().inspection, before.inspection);
          assert.equal(controller.inspect(unit, 'object-2'), false, 'an unfinished install cannot accept a selection');
          if (failure === 'throw') throw new Error('synthetic install failure');
          return false;
        }), false);
      }
      assert.deepEqual(controller.getState().inspection, before.inspection, failure);
      assert.deepEqual(controller.getState().displayed, before.displayed, failure);
      assert.equal(controller.inspect(unit, 'object-2'), true, 'old displayed case remains investigable');
      assert.equal(controller.getState().inspection!.discoveredClues.length, 4);
    } finally { controller.dispose(); installed?.dispose(); }
  }
});

test('successful replacement resets discovery atomically even with identical payload, seed and object IDs', async () => {
  const { controller, rooms, states } = setup({ fetch: async () => json(inspectionFixture()) });
  try {
    await controller.compose('same words', 41);
    controller.reveal(() => true);
    assert.ok(controller.getState().inspection);
    const oldUnit = controller.getState().inspection!.unit;
    controller.inspect(oldUnit, 'object-1');
    const old = controller.getState();
    await controller.compose('same words', 41);
    const count = states.length;
    assert.equal(controller.reveal((room, binding) => {
      assert.equal(room, rooms[1].room);
      assert.ok(binding);
      assert.notEqual(binding.unit, oldUnit);
      assert.equal(binding.bindings.get('object-1'), room.scene.getObjectByName('chair-2'));
      assert.equal(binding.bindings.get('object-2'), room.scene.getObjectByName('chair-1'));
      assert.deepEqual(controller.getState().inspection, old.inspection);
      assert.deepEqual(controller.getState().displayed, old.displayed);
      assert.equal(controller.inspect(oldUnit, 'object-2'), false);
      rooms[0].room.dispose();
      return true;
    }), true);
    const current = controller.getState();
    assert.ok(current.inspection);
    assert.notEqual(current.inspection.unit, oldUnit);
    assert.deepEqual(current.inspection.discoveredClues, []);
    assert.equal(current.inspection.selectedObjectId, null);
    assert.deepEqual(current.displayed, old.displayed, 'identical payload does not mean identical installed unit');
    assert.equal(states.length, count + 1, 'replacement publishes one settled state');
    assert.equal(states.at(-1)!.inspection!.unit, current.inspection.unit);
    assert.equal(controller.inspect(oldUnit, 'object-1'), false);
    assert.deepEqual(controller.getState().inspection, current.inspection);
    assert.equal(controller.inspect(current.inspection.unit, 'object-2'), true);
    const final = controller.getState().inspection;
    controller.dispose();
    assert.equal(controller.inspect(current.inspection.unit, 'object-1'), false);
    assert.deepEqual(controller.getState().inspection, final, 'disposed selection cannot publish discoveries');
  } finally { controller.dispose(); rooms.forEach(({ room }) => room.dispose()); }
});

test('cancelling an in-flight replacement and its late response keeps displayed discovery intact', async () => {
  const pending = deferred<Response>();
  let requests = 0;
  const { controller, rooms } = setup({ fetch: () => ++requests === 2 ? pending.promise : Promise.resolve(json(inspectionFixture())) });
  try {
    await controller.compose('old', 41);
    controller.reveal(() => true);
    assert.ok(controller.getState().inspection);
    const unit = controller.getState().inspection!.unit;
    controller.inspect(unit, 'object-1');
    const composing = controller.compose('replacement', 41);
    assert.equal(controller.inspect(unit, 'object-2'), true, 'pending interpretation must not disable the displayed case');
    const before = controller.getState().inspection;
    controller.stop();
    assert.equal(await composing, false);
    pending.resolve(json(inspectionFixture()));
    await turn();
    assert.deepEqual(controller.getState().inspection, before);
    assert.equal(controller.getState().displayed!.suggestion, 'old');
  } finally { controller.dispose(); rooms.forEach(({ room }) => room.dispose()); }
});
