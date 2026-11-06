import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { conversationReducer, initialConversationState, type ConversationEvent } from '../src/conversation/conversation.ts';
import { createRoomCompositionController, type ComposedRoom, type RoomCompositionState } from '../src/room/room-composition.ts';
import { createProceduralRoom } from '../src/room/procedural-room.ts';
import { createRoomDisplay } from '../src/room/room-display.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';

type Controller = ReturnType<typeof createRoomCompositionController> & { reset(): boolean };
const resetEvent = { type: 'reset' } as ConversationEvent;
function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
function setup(t: TestContext, options: Parameters<typeof createRoomCompositionController>[0] = {}) {
  const states: RoomCompositionState[] = [];
  const rooms: { room: ComposedRoom; disposals: number }[] = [];
  const display = createRoomDisplay({ initial: { scene: new Scene(), dispose() {} }, camera: new PerspectiveCamera(), draw() {} });
  // Synthetic endpoint/draw only; real validators, geometry, bindings and ownership remain in use.
  const controller = createRoomCompositionController({
    fetch: async () => json(inspectionFixture()),
    yieldToBuild: () => Promise.resolve(),
    build: (description, seed) => {
      const room = createProceduralRoom(description, seed);
      const tracked = { room, disposals: 0 };
      const dispose = room.dispose;
      room.dispose = () => { tracked.disposals += 1; dispose(); };
      rooms.push(tracked);
      return room;
    },
    ...options,
    onStatus: state => { states.push(state); options.onStatus?.(state); },
  }) as Controller;
  t.after(() => {
    controller.dispose();
    display.dispose();
    for (const tracked of rooms) if (tracked.disposals === 0) tracked.room.dispose();
  });
  return { controller, display, rooms, states };
}
function reset(controller: Controller) {
  assert.equal(typeof controller.reset, 'function', 'the existing composition controller must support explicit visitor reset');
  return controller.reset();
}
function assertInvitation(state: RoomCompositionState) {
  assert.equal(state.status, 'idle');
  assert.deepEqual(state.journey, { stage: 'invite', unit: null, operation: 'idle', pendingReplacement: false });
  assert.equal(state.interpretation, null);
  assert.equal(state.pending, false);
  assert.equal(state.accepted, null);
  assert.equal(state.displayed, null);
  assert.equal(state.inspection, null);
  assert.equal(state.investigation, null);
  assert.equal(state.reconstruction, null);
  assert.equal(state.error, null);
  assert.equal(state.disposed, false);
}
async function reveal(app: ReturnType<typeof setup>) {
  assert.equal(await app.controller.compose('four teal chairs', 41), true);
  assert.equal(app.controller.reveal(app.display.install), true);
  return app.controller.getState().investigation!.unit;
}

test('visitor reset clears a real accepted conversation without reusing its turn identity', () => {
  let state = conversationReducer(initialConversationState, { type: 'compose', text: 'private visitor suggestion' });
  state = conversationReducer(state, { type: 'chunk', turnId: state.turnId, text: 'A partial accepted reply.' });
  assert.equal(state.status, 'speaking');
  const before = state;
  state = conversationReducer(state, resetEvent);
  assert.deepEqual(state.messages, [], 'visitor reset must clear the accepted conversation transcript');
  assert.equal(state.status, 'idle');
  assert.ok(state.turnId > before.turnId, 'reset must invalidate, not restart, turn identity');
  assert.equal(before.messages[0].text, 'private visitor suggestion');
  assert.equal(before.messages[1].text, 'A partial accepted reply.');
  const next = conversationReducer(state, { type: 'compose', text: 'next visitor suggestion' });
  assert.ok(next.turnId > state.turnId);
  assert.equal(conversationReducer(next, { type: 'chunk', turnId: before.turnId, text: 'late private reply' }), next);
  assert.equal(conversationReducer(next, { type: 'complete', turnId: before.turnId }), next);
  assert.equal(conversationReducer(next, { type: 'chunk', turnId: next.turnId, text: 'New reply.' }).messages.at(-1)!.text, 'New reply.');
});

test('conversation reset works from idle thinking interrupted and completed turns without reviving stale chunks', () => {
  const local = conversationReducer(initialConversationState, { type: 'submit', text: 'local visitor words' });
  const thinking = conversationReducer(local, { type: 'compose', text: 'local visitor words' });
  const speaking = conversationReducer(thinking, { type: 'chunk', turnId: thinking.turnId, text: 'Accepted words.' });
  const stopped = conversationReducer(speaking, { type: 'stop' });
  const completed = conversationReducer(speaking, { type: 'complete', turnId: speaking.turnId });
  for (const before of [initialConversationState, local, thinking, stopped, completed]) {
    const state = conversationReducer(before, resetEvent);
    assert.deepEqual(state.messages, []);
    assert.equal(state.status, 'idle');
    assert.ok(state.turnId > before.turnId);
    for (const event of [
      { type: 'chunk', turnId: before.turnId, text: 'old text' },
      { type: 'complete', turnId: before.turnId },
    ] as const) assert.equal(conversationReducer(state, event), state);
    const again = conversationReducer(state, resetEvent);
    assert.ok(again.turnId > state.turnId);
    assert.deepEqual(again.messages, []);
  }
});

test('reset is reusable from idle and pending and releases each controller-owned room exactly once', async t => {
  const app = setup(t);
  assert.equal(reset(app.controller), true);
  assertInvitation(app.controller.getState());
  assert.equal(await app.controller.compose('first visitor room', 41), true);
  const accepted = app.controller.getState();
  assert.equal(accepted.pending, true);
  const notifications = app.states.length;
  assert.equal(reset(app.controller), true);
  assertInvitation(app.controller.getState());
  assert.equal(app.states.length, notifications + 1, 'reset publishes one settled cleared snapshot');
  assertInvitation(app.states.at(-1)!);
  assert.equal(app.rooms[0].disposals, 1);
  assert.equal(accepted.accepted!.suggestion, 'first visitor room', 'previous snapshots are not rewritten');
  assert.equal(reset(app.controller), true);
  assert.equal(app.rooms[0].disposals, 1);
  assert.equal(await app.controller.compose('second visitor room', 42), true);
  assert.equal(app.controller.reveal(app.display.install), true);
  assert.equal(app.controller.getState().displayed!.suggestion, 'second visitor room');
  assert.equal(app.controller.getState().investigation!.history.length, 0);
});

test('full reset clears investigating and resolved cases while scene disposal remains with the renderer', async t => {
  for (const resolved of [false, true]) {
    const app = setup(t);
    const unit = await reveal(app);
    assert.equal(app.controller.inspect(unit, 'object-1'), true);
    assert.equal(app.controller.proposeHypothesis(unit, 'candidate-1', ['clue-1']), true);
    assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-3'), true);
    const statement = app.controller.getState().investigation!.statements[0];
    assert.equal(app.controller.challengeEvaStatement(unit, statement.id, ['clue-1']), true);
    if (resolved) {
      assert.equal(app.controller.inspect(unit, 'object-2'), true);
      assert.equal(app.controller.accuse(unit, 'candidate-1', ['clue-1', 'clue-2']), true);
      assert.equal(app.controller.getState().journey.stage, 'resolve');
    }
    const before = app.controller.getState();
    assert.equal(await app.controller.compose('pending replacement', 42), true);
    assert.equal(reset(app.controller), true);
    assertInvitation(app.controller.getState());
    assert.equal(app.rooms[0].disposals, 0, 'a transferred displayed room must not be disposed by the composition controller');
    assert.equal(app.rooms[1].disposals, 1, 'the uninstalled replacement belongs to the controller');
    const cleared = app.controller.getState();
    assert.equal(app.controller.inspect(unit, 'object-1'), false);
    assert.equal(app.controller.proposeHypothesis(unit, 'candidate-1', ['clue-1']), false);
    assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-1'), false);
    assert.equal(app.controller.challengeEvaStatement(unit, statement.id, ['clue-1']), false);
    assert.equal(app.controller.accuse(unit, 'candidate-1', ['clue-1', 'clue-2']), false);
    const item = before.reconstruction!.current.furnishings[1];
    assert.equal(app.controller.applyReconstructionEdit(unit, 0, 1,
      { x: item.x, z: item.z, rotation: (item.rotation + 90) % 360 }, app.display.install), false);
    assert.deepEqual(app.controller.getState(), cleared);
    const nextUnit = await reveal(app);
    assert.notEqual(nextUnit, unit);
    assert.equal(app.rooms[0].disposals, 1, 'the renderer releases its old scene when replaced');
    assert.equal(app.controller.recordLocalEvaStatement(nextUnit, 'candidate-3'), true);
    assert.notEqual(app.controller.getState().investigation!.statements[0].id, statement.id);
    assert.equal(app.controller.challengeEvaStatement(nextUnit, statement.id, []), false, 'old statement IDs cannot alias a new visitor statement');
    assert.ok(before.investigation!.history.length >= 4, 'reset leaves already-returned history snapshots immutable');
    app.display.dispose();
    app.display.dispose();
    assert.equal(app.rooms[2].disposals, 1);
  }
});

test('reset during interpretation aborts the request and suppresses late narration over a new visitor', { timeout: 2000 }, async t => {
  const response = deferred<Response>();
  let requests = 0;
  let signal: AbortSignal | null | undefined;
  const app = setup(t, { fetch: (_input, init) => {
    if (++requests !== 1) return Promise.resolve(json(inspectionFixture()));
    signal = init?.signal;
    return response.promise;
  } });
  const composing = app.controller.compose('old visitor', 41, () => assert.fail('reset interpretation delivered a stale reply'));
  assert.equal(app.controller.getState().status, 'interpreting');
  assert.equal(reset(app.controller), true);
  assert.equal(signal?.aborted, true);
  assertInvitation(app.controller.getState());
  assert.equal(await composing, false);
  await reveal(app);
  const before = app.controller.getState();
  const notifications = app.states.length;
  response.resolve(json(inspectionFixture()));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(app.controller.getState(), before);
  assert.equal(app.states.length, notifications);
});

test('reset during the construction yield prevents any build or reply acceptance', { timeout: 2000 }, async t => {
  const yielded = deferred<void>();
  const started = deferred<void>();
  const app = setup(t, { yieldToBuild: () => { started.resolve(); return yielded.promise; } });
  const composing = app.controller.compose('old visitor', 41, () => assert.fail('reset yield accepted narration'));
  await started.promise;
  assert.equal(app.controller.getState().status, 'building');
  assert.equal(reset(app.controller), true);
  assert.equal(await composing, false);
  const notifications = app.states.length;
  yielded.resolve();
  await new Promise<void>(resolve => setImmediate(resolve));
  assertInvitation(app.controller.getState());
  assert.equal(app.rooms.length, 0);
  assert.equal(app.states.length, notifications);
});

test('reset during an asynchronous build disposes its late room once without altering newer work', { timeout: 2000 }, async t => {
  const built = deferred<ComposedRoom>();
  const started = deferred<void>();
  let calls = 0;
  let late: ComposedRoom | undefined;
  let disposals = 0;
  const app = setup(t, { build: (description, seed) => {
    const room = createProceduralRoom(description, seed);
    if (++calls !== 1) return room;
    late = room;
    const dispose = room.dispose;
    room.dispose = () => { disposals += 1; dispose(); };
    started.resolve();
    return built.promise;
  } });
  t.after(() => { if (late && disposals === 0) late.dispose(); });
  const composing = app.controller.compose('old construction', 41, () => assert.fail('reset build accepted narration'));
  await started.promise;
  assert.equal(reset(app.controller), true);
  assertInvitation(app.controller.getState());
  assert.equal(await composing, false);
  await reveal(app);
  const before = app.controller.getState();
  const notifications = app.states.length;
  built.resolve(late!);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(disposals, 1);
  assert.deepEqual(app.controller.getState(), before);
  assert.equal(app.states.length, notifications);
  assert.equal(reset(app.controller), true);
  assert.equal(disposals, 1);
});

test('reset from status callbacks stops interpreting building and ready transitions without stale continuation', async t => {
  for (const target of ['interpreting', 'building', 'ready'] as const) {
    let controller: Controller;
    const app = setup(t, { onStatus: state => { if (state.status === target) assert.equal(reset(controller), true); } });
    controller = app.controller;
    assert.equal(await controller.compose('old visitor', 41), false);
    assertInvitation(controller.getState());
    assertInvitation(app.states.at(-1)!);
    assert.equal(app.rooms.length, target === 'ready' ? 1 : 0);
    if (target === 'ready') assert.equal(app.rooms[0].disposals, 1);
  }
});

test('abort and disposal callbacks cannot start work or observe old visitor state inside reset', async t => {
  for (const boundary of ['abort', 'dispose'] as const) {
    const pending = deferred<Response>();
    let reentrantCompose: Promise<boolean> | undefined;
    let callbackCount = 0;
    let controller: Controller;
    function reenter() {
      callbackCount += 1;
      assertInvitation(controller.getState());
      assert.equal(reset(controller), false, 'nested resets must not recurse');
      assert.equal(controller.stop(), false);
      reentrantCompose = controller.compose('reentrant visitor', 42);
    }
    const app = setup(t, boundary === 'abort' ? { fetch: (_input, init) => {
      init?.signal?.addEventListener('abort', reenter, { once: true });
      return pending.promise;
    } } : {});
    controller = app.controller;
    const composing = controller.compose('old visitor', 41);
    if (boundary === 'dispose') {
      assert.equal(await composing, true);
      const room = app.rooms[0].room;
      const dispose = room.dispose;
      room.dispose = () => { reenter(); dispose(); };
    }
    const notifications = app.states.length;
    assert.equal(reset(controller), true);
    assert.equal(callbackCount, 1);
    assert.equal(await reentrantCompose, false);
    assert.equal(app.states.length, notifications + 1);
    assertInvitation(controller.getState());
    if (boundary === 'abort') {
      assert.equal(await composing, false);
      pending.resolve(json(inspectionFixture()));
      await new Promise<void>(resolve => setImmediate(resolve));
      assertInvitation(controller.getState());
    } else assert.equal(app.rooms[0].disposals, 1);
  }
});

test('reset is rejected during an atomic install and succeeds once renderer ownership is settled', async t => {
  const app = setup(t);
  const oldUnit = await reveal(app);
  assert.equal(await app.controller.compose('replacement', 42), true);
  assert.equal(app.controller.reveal((room, binding) => {
    assert.equal(reset(app.controller), false);
    assert.equal(app.controller.getState().investigation!.unit, oldUnit);
    return app.display.install(room, binding);
  }), true);
  const unit = app.controller.getState().investigation!.unit;
  assert.notEqual(unit, oldUnit);
  assert.equal(reset(app.controller), true);
  assertInvitation(app.controller.getState());
  assert.equal(app.rooms[1].disposals, 0);
  app.display.dispose();
  assert.equal(app.rooms[1].disposals, 1);
});

test('reset clears visitor data even if pending cleanup throws and retains the truthful cleanup warning', async t => {
  const app = setup(t);
  assert.equal(await app.controller.compose('private pending room', 41), true);
  const room = app.rooms[0].room;
  const dispose = room.dispose;
  room.dispose = () => { dispose(); throw new Error('synthetic cleanup failure'); };
  assert.equal(reset(app.controller), true);
  assertInvitation(app.controller.getState());
  assert.match(app.controller.getState().cleanupError ?? '', /cleanup failed/i);
  assert.equal(app.rooms[0].disposals, 1);
  assert.equal(reset(app.controller), true);
  assertInvitation(app.controller.getState());
  assert.match(app.controller.getState().cleanupError ?? '', /cleanup failed/i, 'reset is not proof that leaked resources were recovered');
  assert.equal(app.rooms[0].disposals, 1);
});

test('a disposed controller cannot be revived by reset or deliver new notifications', async t => {
  const app = setup(t);
  await reveal(app);
  app.controller.dispose();
  const before = app.controller.getState();
  const notifications = app.states.length;
  assert.equal(reset(app.controller), false);
  assert.equal(await app.controller.compose('not a new visitor', 42), false);
  assert.deepEqual(app.controller.getState(), before);
  assert.equal(app.states.length, notifications);
});
