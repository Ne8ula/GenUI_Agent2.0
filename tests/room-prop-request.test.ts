import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { createRoomCompositionController, type ComposedRoom, type RoomCompositionState } from '../src/room/room-composition.ts';
import { createProceduralRoom } from '../src/room/procedural-room.ts';
import { createRoomDisplay } from '../src/room/room-display.ts';
import type { FurnitureKind, RoomColor } from '../src/room/room-description.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';

// Proposed local contract only: RED imports no missing production symbols.
// These tests use authored responses and real CPU scenes, not provider or GPU-rendering evidence.
type PropRequest = {
  owner: { unit: symbol; objectId: string; generation: number; revision: number };
  visual: { kind: FurnitureKind; color: RoomColor; description: string };
  envelope: { x: number; z: number; rotation: number; width: number; depth: number; height: number };
};
type PropState = {
  availability: 'unconfigured';
  phase: 'idle' | 'prepared' | 'rejected' | 'cancelled' | 'stale';
  request: PropRequest | null;
  remainingRequests: number;
  reason: string | null;
};
type State = RoomCompositionState & { props: PropState };
type BaseController = ReturnType<typeof createRoomCompositionController>;
type Controller = Omit<BaseController, 'getState'> & {
  getState(): State;
  preparePropRequest(unit: symbol, expectedRevision: number, input: unknown): PropRequest | null;
  isPropRequestCurrent(request: unknown): boolean;
  cancelPropRequest(): boolean;
};
type Installer = Parameters<BaseController['reveal']>[0];
const requestInput = () => ({ objectId: 'object-1', description: 'A rounded teal chair with a curved back.' });
const emptyProps: PropState = { availability: 'unconfigured', phase: 'idle', request: null, remainingRequests: 3, reason: null };
const poses = [
  { x: -2, z: -3, rotation: 0 }, { x: 2, z: -3, rotation: 0 },
  { x: -2, z: 0, rotation: 0 }, { x: 2, z: 0, rotation: 0 },
] as const;

function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
function setup(t: TestContext, options: {
  fixture?: ReturnType<typeof inspectionFixture>;
  fetch?: typeof globalThis.fetch;
  onStatus?: (state: State, controller: Controller) => void;
} = {}) {
  const calls: string[] = [];
  const rooms: { room: ComposedRoom; disposals: number }[] = [];
  const states: State[] = [];
  let installs = 0;
  let installed: ComposedRoom | null = null;
  function track(room: ComposedRoom) {
    if (rooms.some(item => item.room === room)) return;
    const entry = { room, disposals: 0 };
    const dispose = room.dispose;
    room.dispose = () => { entry.disposals += 1; dispose(); };
    rooms.push(entry);
  }
  const display = createRoomDisplay({ initial: { scene: new Scene(), dispose() {} },
    camera: new PerspectiveCamera(60, 1, 0.1, 20), draw() {} });
  const controller = createRoomCompositionController({
    fetch: async (input, init) => {
      calls.push(String(input));
      return options.fetch ? options.fetch(input, init) : json(options.fixture ?? inspectionFixture());
    },
    yieldToBuild: () => Promise.resolve(),
    build: (description, seed) => {
      const room = createProceduralRoom(description, seed, poses);
      track(room);
      return room;
    },
    onStatus: state => { states.push(state as State); options.onStatus?.(state as State, controller); },
  }) as Controller;
  const install: Installer = (room, binding) => {
    track(room);
    installs += 1;
    if (!display.install(room, binding)) return false;
    installed = room;
    return true;
  };
  t.after(() => {
    controller.dispose();
    display.dispose();
    rooms.forEach(entry => { if (!entry.disposals) entry.room.dispose(); });
  });
  return { controller, calls, rooms, states, install,
    get installs() { return installs; }, get installed() { return installed; } };
}
function propState(controller: Controller) {
  const state = controller.getState();
  assert.ok(state.props, 'the displayed case must expose truthful local prop-request readiness');
  return state.props;
}
async function reveal(app: ReturnType<typeof setup>) {
  assert.equal(await app.controller.compose('ORIGINAL_PRIVATE_SENTINEL', 41), true);
  assert.equal(app.controller.reveal(app.install), true);
  assert.deepEqual(propState(app.controller), emptyProps);
  return app.controller.getState().reconstruction!.unit;
}
function prepare(app: ReturnType<typeof setup>, input: unknown = requestInput()) {
  const reconstruction = app.controller.getState().reconstruction!;
  const request = app.controller.preparePropRequest(reconstruction.unit, reconstruction.revision, input);
  assert.ok(request, 'an explicit local preparation must capture an eligible displayed object');
  return request;
}
function withoutProps(state: State) {
  const { props: _props, ...existing } = state;
  return existing;
}

// Limits: 240 UTF-16 units / 960 UTF-8 bytes; 3 local preparations per case;
// one outstanding request; the existing furnishing box may never expand.
test('8A RED: real Reveal exposes unconfigured prop readiness without generation or scene changes', async t => {
  const app = setup(t);
  assert.equal(await app.controller.compose('four teal chairs', 41), true);
  assert.equal(app.controller.reveal(app.install), true);
  assert.equal(app.installed!.scene.getObjectByName('chair-2')!.children.length > 0, true);
  assert.deepEqual(app.controller.getState().props, emptyProps,
    'Reveal must expose unconfigured, idle prop work; it must not pretend to generate a prop');
  app.controller.getState();
  app.controller.getState();
  assert.deepEqual(app.calls, ['/api/compose-room']);
  assert.equal(app.rooms.length, 1);
  assert.equal(app.installs, 1);
  assert.equal(app.rooms[0].disposals, 0);
});

test('local preparation captures the actual object mapping, public description and authoritative envelope only', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  app.controller.inspect(app.controller.getState().inspection!.unit, 'object-1');
  app.controller.proposeHypothesis(unit, 'candidate-3', ['clue-1']);
  app.controller.recordLocalEvaStatement(unit, 'candidate-3');
  const before = app.controller.getState();
  const request = prepare(app, { ...requestInput(), description: `  ${requestInput().description}  ` });
  assert.deepEqual(request.owner, { unit, objectId: 'object-1', generation: 1, revision: 0 });
  assert.deepEqual(request.visual, { kind: 'chair', color: 'teal', description: requestInput().description });
  assert.deepEqual(request.envelope, { x: 2, z: -3, rotation: 0, width: 0.65, depth: 0.65, height: 1.1 });
  assert.equal(app.controller.isPropRequestCurrent(request), true);
  const state = propState(app.controller);
  assert.equal(state.availability, 'unconfigured');
  assert.equal(state.phase, 'prepared', 'a local snapshot is not reference-image or mesh work');
  assert.equal(state.remainingRequests, 2);
  assert.deepEqual(state.request, request);
  assert.doesNotMatch(JSON.stringify(request.visual), /ORIGINAL_PRIVATE_SENTINEL|candidate|clue|solution|circle|linen|history|unit|object-1|Symbol|generation|revision/);
  assert.deepEqual(withoutProps(app.controller.getState()), withoutProps(before));
  assert.deepEqual(app.calls, ['/api/compose-room']);
  assert.equal(app.installs, 1);
  assert.equal(app.rooms.length, 1);
  assert.equal(app.rooms[0].disposals, 0);
});

test('every supported kind uses its existing dimensions and edited quarter-turn without expanding the box', async t => {
  for (const [kind, width, depth, height] of [
    ['table', 1.6, 0.9, 0.9], ['chair', 0.65, 0.65, 1.1],
    ['sofa', 1.9, 0.85, 0.95], ['shelf', 1.2, 0.4, 1.8],
  ] as const) {
    const fixture = inspectionFixture();
    assert.ok(fixture.description);
    fixture.description.furnishings[1].kind = kind;
    const app = setup(t, { fixture });
    const unit = await reveal(app);
    assert.equal(app.controller.applyReconstructionEdit(unit, 0, 1, { x: 2, z: -2.5, rotation: 90 }, app.install), true);
    const request = prepare(app);
    assert.deepEqual(request.envelope, { x: 2, z: -2.5, rotation: 90, width, depth, height });
    assert.equal(request.visual.kind, kind);
    assert.equal(request.owner.unit, unit);
    assert.equal(request.owner.revision, 1);
    assert.notEqual(request.owner.unit, app.controller.getState().inspection!.unit, 'scene bindings are not case ownership');
  }
});

test('idle and pending rooms, unbound objects, foreign case identities and stale revisions cannot prepare props', async t => {
  const app = setup(t);
  assert.deepEqual(propState(app.controller), emptyProps);
  assert.equal(app.controller.preparePropRequest(Symbol('fixture'), 0, requestInput()), null);
  assert.equal(await app.controller.compose('pending room', 41), true);
  assert.equal(app.controller.preparePropRequest(Symbol('pending'), 0, requestInput()), null);
  assert.equal(app.controller.reveal(app.install), true);
  const unit = app.controller.getState().reconstruction!.unit;
  for (const objectId of ['object-4', 'chair-2', 'architecture', 'object-9', '', 1, null]) {
    assert.equal(app.controller.preparePropRequest(unit, 0, { ...requestInput(), objectId }), null);
  }
  for (const revision of [-1, 1, 0.5, NaN, Infinity, '0', null]) {
    assert.equal(app.controller.preparePropRequest(unit, revision as number, requestInput()), null);
  }
  assert.equal(app.controller.preparePropRequest(Symbol('same seed and IDs'), 0, requestInput()), null);
  assert.equal(propState(app.controller).remainingRequests, 3);
  assert.equal(app.rooms.length, 1);
  assert.equal(app.installs, 1);
  assert.deepEqual(app.calls, ['/api/compose-room']);
  assert.equal(prepare(app).owner.objectId, 'object-1');
});

test('malformed, excessive and authority-bearing input is rejected without reading getters or spending a preparation', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  let getterReads = 0;
  const accessor = { objectId: 'object-1', get description() { getterReads += 1; return 'private getter detail'; } };
  const symbolKey = { ...requestInput(), [Symbol('hidden authority')]: true };
  const hiddenKey = Object.defineProperty(requestInput(), 'url', { value: 'https://invalid.example/secret' });
  const invalid: unknown[] = [null, [], false, 'chair', 1, {}, { objectId: 'object-1' },
    Object.create(requestInput()), accessor, symbolKey, hiddenKey,
    ...['', '   ', 'x'.repeat(241), '🪑'.repeat(121), 'line\nbreak', 'tab\there', 'null\0byte', 'del\x7f'].map(description => ({ ...requestInput(), description })),
    ...[null, 1, [], {}].map(description => ({ ...requestInput(), description })),
    ...['url', 'code', 'model', 'provider', 'credentials', 'permissions', 'provenance', 'owner', 'generation', 'revision', 'dimensions', 'position', 'envelope', 'case', '__proto__']
      .map(key => Object.defineProperty(requestInput(), key, { value: 'PRIVATE_AUTHORITY_SENTINEL', enumerable: true })),
  ];
  const before = withoutProps(app.controller.getState());
  for (const input of invalid) {
    assert.equal(app.controller.preparePropRequest(unit, 0, input), null);
    assert.equal(propState(app.controller).phase, 'rejected');
    assert.equal(propState(app.controller).remainingRequests, 3);
    assert.equal(propState(app.controller).request, null);
    assert.ok(propState(app.controller).reason);
    assert.deepEqual(withoutProps(app.controller.getState()), before);
    assert.doesNotMatch(JSON.stringify(propState(app.controller)), /PRIVATE_AUTHORITY_SENTINEL|private getter detail|invalid.example/);
  }
  assert.equal(getterReads, 0);
  assert.deepEqual(app.calls, ['/api/compose-room']);
  assert.equal(app.rooms.length, 1);
  assert.equal(prepare(app).owner.generation, 1);
});

test('description boundaries accept bounded Unicode data and copy null-prototype input without coercion', async t => {
  const app = setup(t);
  await reveal(app);
  for (const description of ['x', '界'.repeat(240), '🪑'.repeat(120)]) {
    const input = Object.assign(Object.create(null), { objectId: 'object-1', description });
    const request = prepare(app, input);
    input.description = 'mutated after preparation';
    assert.equal(request.visual.description, description);
    assert.ok(new TextEncoder().encode(request.visual.description).byteLength <= 960);
    assert.equal(app.controller.cancelPropRequest(), true);
  }
  assert.equal(propState(app.controller).remainingRequests, 0);
});

test('request capabilities cannot be forged or mutated through state snapshots', async t => {
  const app = setup(t);
  await reveal(app);
  const request = prepare(app);
  assert.equal(Object.isFrozen(request), true);
  assert.equal(Object.isFrozen(request.owner), true);
  assert.equal(Object.isFrozen(request.envelope), true);
  assert.equal(Object.isFrozen(request.visual), true);
  const snapshot = propState(app.controller).request!;
  assert.notEqual(snapshot, request);
  assert.equal(app.controller.isPropRequestCurrent(snapshot), false, 'a display snapshot is not an operation capability');
  snapshot.owner.generation = 999;
  snapshot.owner.objectId = 'object-2';
  snapshot.envelope.width = 99;
  snapshot.visual.description = 'mutated public snapshot';
  app.states.at(-1)!.props.request!.envelope.x = 99;
  for (const foreign of [null, {}, { ...request }, { ...request, owner: { ...request.owner } }, JSON.parse(JSON.stringify(request))]) {
    assert.equal(app.controller.isPropRequestCurrent(foreign), false);
  }
  assert.equal(app.controller.isPropRequestCurrent(request), true);
  assert.deepEqual(propState(app.controller).request, request);
  assert.equal(request.envelope.width, 0.65);
  assert.equal(request.envelope.x, 2);
});

test('one outstanding preparation rejects duplicate activation and three accepted preparations exhaust the case ceiling', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const first = prepare(app);
  const pending = propState(app.controller);
  for (const input of [requestInput(), { ...requestInput(), objectId: 'object-2' }, { ...requestInput(), description: '' }]) {
    assert.equal(app.controller.preparePropRequest(unit, 0, input), null);
    assert.deepEqual(propState(app.controller), pending, 'duplicate activation must not hide or replace the active operation');
  }
  assert.equal(app.controller.stop(), true, 'existing Stop all path must stop prepared prop work');
  assert.equal(app.controller.isPropRequestCurrent(first), false);
  assert.equal(propState(app.controller).phase, 'cancelled');
  assert.equal(app.controller.stop(), false);
  const second = prepare(app, { ...requestInput(), objectId: 'object-2' });
  assert.ok(second.owner.generation > first.owner.generation);
  assert.equal(app.controller.cancelPropRequest(), true);
  assert.equal(app.controller.cancelPropRequest(), false);
  const third = prepare(app);
  assert.ok(third.owner.generation > second.owner.generation);
  assert.equal(app.controller.cancelPropRequest(), true);
  assert.equal(propState(app.controller).remainingRequests, 0);
  assert.equal(app.controller.preparePropRequest(unit, 0, requestInput()), null);
  assert.equal(propState(app.controller).phase, 'rejected');
  assert.ok(propState(app.controller).reason);
  assert.equal(app.controller.isPropRequestCurrent(first), false);
  assert.equal(app.controller.isPropRequestCurrent(second), false);
  assert.equal(app.controller.isPropRequestCurrent(third), false);
  assert.deepEqual(app.calls, ['/api/compose-room']);
  assert.equal(app.installs, 1);
  assert.equal(app.rooms[0].disposals, 0);
});

test('only successful reconstruction invalidates pending ownership and keeps fixed case facts and prior history', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  app.controller.inspect(app.controller.getState().inspection!.unit, 'object-1');
  const before = app.controller.getState();
  const request = prepare(app);
  for (const pose of [{ x: 0, z: -3, rotation: 0 }, { x: 2, z: -3, rotation: 0 }]) {
    assert.equal(app.controller.applyReconstructionEdit(unit, 0, 1, pose, app.install), false);
    assert.equal(app.controller.isPropRequestCurrent(request), true);
  }
  const moved = { x: 2.75, z: -2.5, rotation: 90 };
  assert.equal(app.controller.applyReconstructionEdit(unit, 0, 1, moved, () => false), false);
  assert.equal(app.controller.isPropRequestCurrent(request), true);
  assert.equal(app.controller.applyReconstructionEdit(unit, 0, 1, moved, app.install), true);
  assert.equal(app.controller.isPropRequestCurrent(request), false);
  assert.equal(propState(app.controller).phase, 'stale');
  assert.ok(propState(app.controller).reason);
  const after = app.controller.getState();
  assert.deepEqual(after.displayed, before.displayed);
  assert.deepEqual(after.investigation!.history.slice(0, -1), before.investigation!.history);
  assert.deepEqual(after.inspection!.discoveredClues, before.inspection!.discoveredClues);
  assert.equal(app.controller.preparePropRequest(unit, 0, requestInput()), null);
  const current = prepare(app);
  assert.equal(current.owner.unit, unit);
  assert.equal(current.owner.revision, 1);
  assert.deepEqual(current.envelope, { ...moved, width: 0.65, depth: 0.65, height: 1.1 });
  assert.equal(app.controller.isPropRequestCurrent(request), false);
});

test('pending and failed room replacement preserve the displayed prop request and its visual resources', async t => {
  for (const failure of ['invalid', 'false', 'throw'] as const) {
    let responses = 0;
    const app = setup(t, { fetch: async () => json(++responses === 2 && failure === 'invalid'
      ? { ...inspectionFixture(), extra: true } : inspectionFixture()) });
    await reveal(app);
    const request = prepare(app);
    const before = propState(app.controller);
    const displayed = app.installed;
    assert.equal(await app.controller.compose('replacement', 41), failure !== 'invalid');
    assert.deepEqual(propState(app.controller), before);
    if (failure !== 'invalid') assert.equal(app.controller.reveal(() => {
      if (failure === 'throw') throw new Error('private installer detail');
      return false;
    }), false);
    assert.equal(app.controller.isPropRequestCurrent(request), true);
    assert.deepEqual(propState(app.controller), before);
    assert.equal(app.installed, displayed);
    assert.equal(app.rooms[0].disposals, 0);
  }
});

test('stopping pending room work also cancels prop ownership and an ignored-abort response cannot resurrect it', async t => {
  const response = deferred<Response>();
  let calls = 0;
  const app = setup(t, { fetch: () => ++calls === 2 ? response.promise : Promise.resolve(json(inspectionFixture())) });
  await reveal(app);
  const request = prepare(app);
  const pending = app.controller.compose('replacement', 41);
  assert.equal(app.controller.isPropRequestCurrent(request), true);
  assert.equal(app.controller.stop(), true);
  assert.equal(await pending, false);
  const next = prepare(app);
  const state = propState(app.controller);
  response.resolve(json(inspectionFixture()));
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  assert.equal(app.controller.isPropRequestCurrent(request), false);
  assert.equal(app.controller.isPropRequestCurrent(next), true);
  assert.deepEqual(propState(app.controller), state);
  assert.equal(app.installs, 1);
  assert.equal(app.rooms[0].disposals, 0);
});

test('successful same-seed same-ID replacement invalidates the old capability and resets only the local case allowance', async t => {
  const app = setup(t);
  const oldUnit = await reveal(app);
  const request = prepare(app);
  const original = app.controller.getState().displayed;
  assert.equal(await app.controller.compose('ORIGINAL_PRIVATE_SENTINEL', 41), true);
  assert.equal(app.controller.isPropRequestCurrent(request), true);
  assert.equal(app.controller.reveal(app.install), true);
  const state = app.controller.getState();
  assert.deepEqual(state.displayed, original);
  assert.notEqual(state.reconstruction!.unit, oldUnit);
  assert.equal(app.controller.isPropRequestCurrent(request), false);
  assert.deepEqual(propState(app.controller), emptyProps);
  assert.equal(app.controller.preparePropRequest(oldUnit, 0, requestInput()), null);
  const next = prepare(app);
  assert.equal(next.owner.unit, state.reconstruction!.unit);
  assert.ok(next.owner.generation > request.owner.generation);
  assert.equal(app.rooms[0].disposals, 1);
  assert.equal(app.rooms[1].disposals, 0);
});

test('visitor reset and terminal disposal invalidate requests without taking ownership of displayed room resources', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const request = prepare(app);
  assert.equal(app.controller.reset(), true);
  assert.equal(app.controller.isPropRequestCurrent(request), false);
  assert.deepEqual(propState(app.controller), emptyProps);
  assert.equal(app.rooms[0].disposals, 0, 'the display, not request cancellation, owns the installed room');
  assert.equal(app.controller.preparePropRequest(unit, 0, requestInput()), null);
  await reveal(app);
  const next = prepare(app);
  assert.ok(next.owner.generation > request.owner.generation);
  app.controller.dispose();
  assert.equal(app.controller.isPropRequestCurrent(next), false);
  const disposed = app.controller.getState();
  assert.equal(app.controller.preparePropRequest(next.owner.unit, next.owner.revision, requestInput()), null);
  assert.equal(app.controller.cancelPropRequest(), false);
  assert.deepEqual(app.controller.getState(), disposed);
  assert.equal(app.rooms[1].disposals, 0);
});

test('a status callback that stops preparation cannot return a still-authorized request', async t => {
  const app = setup(t, { onStatus: (state, controller) => {
    if (state.props?.phase === 'prepared') controller.stop();
  } });
  const unit = await reveal(app);
  assert.equal(app.controller.preparePropRequest(unit, 0, requestInput()), null);
  assert.equal(propState(app.controller).phase, 'cancelled');
  assert.equal(propState(app.controller).remainingRequests, 2);
  assert.deepEqual(app.calls, ['/api/compose-room']);
  assert.equal(app.installs, 1);
  assert.equal(app.rooms[0].disposals, 0);
});
