import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { createRoomCompositionController, type ComposedRoom, type RoomCompositionState } from '../src/room/room-composition.ts';
import { createProceduralRoom } from '../src/room/procedural-room.ts';
import { createRoomDisplay } from '../src/room/room-display.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';

type Journey = {
  stage: 'invite' | 'interpret' | 'compose' | 'reveal' | 'investigate' | 'resolve';
  unit: symbol | null;
  operation: RoomCompositionState['status'];
  pendingReplacement: boolean;
};
type State = RoomCompositionState & { journey?: Journey };
function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
function setup(t: TestContext, options: Parameters<typeof createRoomCompositionController>[0] = {}) {
  const states: State[] = [];
  const display = createRoomDisplay({ initial: { scene: new Scene(), dispose() {} }, camera: new PerspectiveCamera(), draw() {} });
  // Only endpoint data and drawing are synthetic; validation, build, binding and installation are real.
  const controller = createRoomCompositionController({
    fetch: async () => json(inspectionFixture()),
    yieldToBuild: () => Promise.resolve(),
    ...options,
    onStatus: state => { states.push(state); },
  });
  t.after(() => { controller.dispose(); display.dispose(); });
  return { controller, display, states };
}
function journey(state: State) {
  assert.ok(state.journey, 'composition snapshots must expose a public journey projection');
  return state.journey;
}
async function reveal(app: ReturnType<typeof setup>) {
  assert.equal(await app.controller.compose('four teal chairs', 41), true);
  assert.equal(app.controller.reveal(app.display.install), true);
  return app.controller.getState().investigation!.unit;
}
function resolveCase(app: ReturnType<typeof setup>, unit: symbol) {
  for (const objectId of ['object-1', 'object-2']) {
    assert.equal(app.controller.inspect(app.controller.getState().inspection!.unit, objectId), true);
  }
  assert.equal(app.controller.accuse(unit, 'candidate-1', ['clue-1', 'clue-2']), true);
  assert.equal(app.controller.getState().investigation!.resolution?.status, 'resolved');
}

test('successful real Reveal projects the investigate journey for the displayed case', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const state: State = app.controller.getState();
  assert.equal(state.journey?.stage, 'investigate', 'successful real Reveal must project the investigate journey');
  assert.deepEqual(state.journey, { stage: 'investigate', unit, operation: 'idle', pendingReplacement: false });
  assert.deepEqual(app.states.at(-1)!.journey, state.journey);
});

test('a fresh controller and an authored display invite without inventing a composed case', t => {
  const app = setup(t);
  assert.equal(app.display.render(), true);
  assert.equal(app.controller.reveal(app.display.install), false);
  assert.equal(app.controller.accuse(Symbol('authored fixture'), 'candidate-1', []), false);
  assert.deepEqual(journey(app.controller.getState()), { stage: 'invite', unit: null, operation: 'idle', pendingReplacement: false });
  assert.equal(app.controller.getState().investigation, null);
});

test('first composition reports interpretation and construction but waits for explicit Reveal', async t => {
  const app = setup(t);
  const composing = app.controller.compose('four teal chairs', 41);
  assert.deepEqual(journey(app.controller.getState()), { stage: 'interpret', unit: null, operation: 'interpreting', pendingReplacement: false });
  assert.equal(await composing, true);
  assert.deepEqual(app.states.map(state => journey(state)), [
    { stage: 'interpret', unit: null, operation: 'interpreting', pendingReplacement: false },
    { stage: 'compose', unit: null, operation: 'building', pendingReplacement: false },
    { stage: 'reveal', unit: null, operation: 'ready', pendingReplacement: false },
  ]);
  assert.equal(app.controller.getState().displayed, null);
  assert.equal(app.controller.getState().investigation, null);
  assert.equal(app.controller.reveal(app.display.install), true);
  assert.equal(journey(app.controller.getState()).stage, 'investigate');
});

test('unsupported cancelled and failed first attempts return to invitation with truthful operation status', async t => {
  for (const failure of ['unsupported', 'invalid', 'cancel', 'false', 'throw'] as const) {
    const app = setup(t, { fetch: async () => json(failure === 'unsupported'
      ? { version: 2, outcome: 'unsupported', reply: 'Pools and configurable lighting are outside my vocabulary.', unsupported: ['Pools', 'Configurable lighting'], description: null, case: null }
      : failure === 'invalid' ? { ...inspectionFixture(), extra: true } : inspectionFixture()) });
    assert.equal(await app.controller.compose(failure === 'unsupported' ? 'A pool with lots of lights' : 'four teal chairs', 41), failure !== 'unsupported' && failure !== 'invalid');
    if (failure === 'cancel') assert.equal(app.controller.stop(), true);
    if (failure === 'false' || failure === 'throw') assert.equal(app.controller.reveal(() => {
      if (failure === 'throw') throw new Error('synthetic failed installation');
      return false;
    }), false);
    const operation = failure === 'unsupported' ? 'unsupported' : failure === 'cancel' ? 'cancelled' : 'error';
    assert.deepEqual(journey(app.controller.getState()), { stage: 'invite', unit: null, operation, pendingReplacement: false });
    assert.equal(app.controller.getState().displayed, null);
  }
});

test('inspection edits hypotheses and challenges retain case identity and only independent resolution advances the journey', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-3'), true);
  const statement = app.controller.getState().investigation!.statements[0];
  assert.equal(app.controller.accuse(unit, 'candidate-1', []), true);
  assert.equal(app.controller.getState().investigation!.resolution?.status, 'insufficient');
  assert.equal(app.controller.inspect(unit, 'object-1'), true);
  assert.equal(app.controller.proposeHypothesis(unit, 'candidate-1', ['clue-1']), true);
  assert.equal(app.controller.challengeEvaStatement(unit, statement.id, ['clue-1']), true);
  assert.equal(app.controller.getState().investigation!.challenges[0].assessment.status, 'compatible');
  assert.equal(app.controller.accuse(unit, 'candidate-2', ['clue-1']), true);
  assert.equal(app.controller.getState().investigation!.resolution?.status, 'incorrect');
  const before = app.controller.getState();
  const item = before.reconstruction!.current.furnishings[1];
  assert.equal(app.controller.applyReconstructionEdit(unit, 0, 1,
    { x: item.x, z: item.z, rotation: (item.rotation + 90) % 360 }, app.display.install), true);
  assert.notEqual(app.controller.getState().inspection!.unit, unit, 'edited picking bindings change, not the journey case');
  assert.deepEqual(journey(app.controller.getState()), { stage: 'investigate', unit, operation: 'idle', pendingReplacement: false });
  const snapshots = app.states.filter(state => state.investigation !== null);
  assert.equal(snapshots.every(state => journey(state).stage === 'investigate' && journey(state).unit === unit), true);
  resolveCase(app, unit);
  assert.deepEqual(journey(app.controller.getState()), { stage: 'resolve', unit, operation: 'idle', pendingReplacement: false });
  assert.equal(app.controller.inspect(app.controller.getState().inspection!.unit, 'object-3'), true);
  assert.equal(journey(app.controller.getState()).stage, 'resolve');
  assert.deepEqual(app.controller.getState().investigation!.history.slice(0, before.investigation!.history.length), before.investigation!.history);
  assert.equal(snapshots.every(state => journey(state).stage === 'investigate'), true, 'old journey snapshots cannot be rewritten by resolution');
});

test('replacement progress stays separate from the resolved case until one atomic successful Reveal', async t => {
  const app = setup(t);
  const oldUnit = await reveal(app);
  resolveCase(app, oldUnit);
  const previous = app.controller.getState();
  const count = app.states.length;
  assert.equal(await app.controller.compose('four teal chairs', 41), true);
  assert.deepEqual(app.states.slice(count).map(state => journey(state)), [
    { stage: 'resolve', unit: oldUnit, operation: 'interpreting', pendingReplacement: true },
    { stage: 'resolve', unit: oldUnit, operation: 'building', pendingReplacement: true },
    { stage: 'resolve', unit: oldUnit, operation: 'ready', pendingReplacement: true },
  ]);
  assert.deepEqual(app.controller.getState().investigation, previous.investigation);
  const notifications = app.states.length;
  assert.equal(app.controller.reveal((room, binding) => {
    const during = journey(app.controller.getState());
    assert.equal(during.stage, 'resolve');
    assert.equal(during.unit, oldUnit, 'the installer cannot expose a not-yet-committed case');
    assert.equal(app.controller.accuse(binding.unit, 'candidate-1', []), false);
    return app.display.install(room, binding);
  }), true);
  const next = app.controller.getState();
  const unit = next.investigation!.unit;
  assert.notEqual(unit, oldUnit);
  assert.deepEqual(journey(next), { stage: 'investigate', unit, operation: 'idle', pendingReplacement: false });
  assert.equal(app.states.length, notifications + 1);
  assert.deepEqual(journey(app.states.at(-1)!), journey(next));
  assert.deepEqual(next.displayed, previous.displayed, 'identical payload and seed do not reuse the old case identity');
  assert.deepEqual(next.investigation!.history, []);
  assert.equal(app.controller.accuse(oldUnit, 'candidate-1', ['clue-1', 'clue-2']), false);
  assert.equal(app.controller.inspect(oldUnit, 'object-1'), false);
  assert.deepEqual(app.controller.getState(), next);
});

test('cancelled invalid and rejected replacements preserve both unresolved and resolved displayed journeys', async t => {
  for (const resolved of [false, true]) {
    for (const failure of ['cancel', 'invalid', 'false', 'throw'] as const) {
      let requests = 0;
      const app = setup(t, { fetch: async () => json(++requests === 2 && failure === 'invalid'
        ? { ...inspectionFixture(), extra: true } : inspectionFixture()) });
      const unit = await reveal(app);
      if (resolved) resolveCase(app, unit);
      const before = app.controller.getState();
      assert.equal(await app.controller.compose('replacement chairs', 41), failure !== 'invalid');
      if (failure === 'cancel') assert.equal(app.controller.stop(), true);
      if (failure === 'false' || failure === 'throw') assert.equal(app.controller.reveal(() => {
        if (failure === 'throw') throw new Error('synthetic failed replacement');
        return false;
      }), false);
      assert.deepEqual(journey(app.controller.getState()), { stage: resolved ? 'resolve' : 'investigate', unit,
        operation: failure === 'cancel' ? 'cancelled' : 'error', pendingReplacement: false });
      assert.deepEqual(app.controller.getState().displayed, before.displayed);
      assert.deepEqual(app.controller.getState().investigation, before.investigation);
      assert.deepEqual(app.controller.getState().reconstruction, before.reconstruction);
    }
  }
});

test('a cancelled late interpretation cannot advance the journey or deliver a reply over a newer case', { timeout: 2000 }, async t => {
  const response = deferred<Response>();
  let requests = 0;
  const app = setup(t, { fetch: () => ++requests === 2 ? response.promise : Promise.resolve(json(inspectionFixture())) });
  const oldUnit = await reveal(app);
  const composing = app.controller.compose('stale replacement', 41, () => assert.fail('cancelled interpretation must not deliver narration'));
  assert.deepEqual(journey(app.controller.getState()), { stage: 'investigate', unit: oldUnit, operation: 'interpreting', pendingReplacement: true });
  assert.equal(app.controller.stop(), true);
  assert.equal(await composing, false);
  await reveal(app);
  const before = app.controller.getState();
  const notifications = app.states.length;
  response.resolve(json(inspectionFixture()));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(app.controller.getState(), before);
  assert.equal(app.states.length, notifications);
  assert.equal(journey(before).stage, 'investigate');
  assert.notEqual(journey(before).unit, oldUnit);
});

test('a cancelled late build is released once without advancing a newer pending journey', { timeout: 2000 }, async t => {
  const building = deferred<ComposedRoom>();
  const started = deferred<void>();
  let builds = 0;
  let staleRoom: ComposedRoom | undefined;
  let disposals = 0;
  const app = setup(t, { build: (description, seed) => {
    const room = createProceduralRoom(description, seed);
    if (++builds !== 2) return room;
    staleRoom = room;
    const dispose = room.dispose;
    room.dispose = () => { disposals += 1; dispose(); };
    started.resolve();
    return building.promise;
  } });
  t.after(() => { if (staleRoom && disposals === 0) staleRoom.dispose(); });
  const unit = await reveal(app);
  const composing = app.controller.compose('stale construction', 41);
  await started.promise;
  assert.deepEqual(journey(app.controller.getState()), { stage: 'investigate', unit, operation: 'building', pendingReplacement: true });
  assert.equal(app.controller.stop(), true);
  assert.equal(await composing, false);
  assert.equal(await app.controller.compose('newer construction', 42), true);
  const before = app.controller.getState();
  const notifications = app.states.length;
  building.resolve(staleRoom!);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(disposals, 1);
  assert.deepEqual(app.controller.getState(), before);
  assert.deepEqual(journey(before), { stage: 'investigate', unit, operation: 'ready', pendingReplacement: true });
  assert.equal(app.states.length, notifications);
});

test('journey snapshots are detached allowlisted public facts without hidden case data or visitor content', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const before = app.controller.getState();
  const view = journey(before);
  view.stage = 'resolve';
  view.unit = Symbol('forged case');
  view.operation = 'error';
  view.pendingReplacement = true;
  assert.deepEqual(journey(app.controller.getState()), { stage: 'investigate', unit, operation: 'idle', pendingReplacement: false });
  resolveCase(app, unit);
  for (const state of app.states) {
    const projection = journey(state);
    assert.deepEqual(Reflect.ownKeys(projection).sort(), ['operation', 'pendingReplacement', 'stage', 'unit']);
    assert.ok(projection.unit === null || typeof projection.unit === 'symbol');
    assert.equal(typeof projection.pendingReplacement, 'boolean');
    assert.doesNotMatch(JSON.stringify(projection), /candidate-|clue-|object-|solution|keepsake|circle|linen|four teal chairs/i);
  }
});
