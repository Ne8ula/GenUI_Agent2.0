import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { Box3, BoxGeometry, Group, Mesh, PerspectiveCamera, Scene, Vector3, type Object3D } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { createRoomCompositionController, type ComposedRoom, type RoomCompositionState } from '../src/room/room-composition.ts';
import { createProceduralRoom } from '../src/room/procedural-room.ts';
import { createRoomDisplay } from '../src/room/room-display.ts';
import type { RoomInspectionBinding } from '../src/room/room-inspection.ts';
import type { RoomPropRequest } from '../src/room/room-prop-request.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';
import { chairFixture } from './fixtures/prop-glb.ts';

// Proposed 8E signatures only; no missing production imports can obstruct the existing-seam RED.
// Real controller/loader/CPU scene; authored bytes, offline interpretation and injected draw are not provider/GPU evidence.
type Visual = { root: Group; clone(): Visual; dispose(): void };
type RenderIdentity = { unit: symbol; revision: number };
type RoomInstaller = (room: ComposedRoom, binding: RoomInspectionBinding, identity: RenderIdentity) => boolean;
type PropInstaller = (request: RoomPropRequest, visual: Visual, isCurrent: () => boolean) => boolean;
type BaseController = ReturnType<typeof createRoomCompositionController>;
type Controller = Omit<BaseController, 'reveal' | 'applyReconstructionEdit'> & {
  reveal(install: RoomInstaller): boolean;
  applyReconstructionEdit(unit: symbol, revision: number, index: number, pose: unknown, install: RoomInstaller): boolean;
  installProp(request: RoomPropRequest, bytes: ArrayBuffer, install: PropInstaller): Promise<boolean>;
};
type Display = Omit<ReturnType<typeof createRoomDisplay>, 'install'> & {
  install(room: ComposedRoom, binding: RoomInspectionBinding, identity: RenderIdentity): boolean;
  installProp: PropInstaller;
};
const poses = [
  { x: -2, z: -3, rotation: 0 }, { x: 2, z: -3, rotation: 0 },
  { x: -2, z: 0, rotation: 0 }, { x: 2, z: 0, rotation: 0 },
] as const;
const moved = { x: 2.75, z: -2.5, rotation: 90 };
const bytes = () => chairFixture({ textured: false }).bytes;
const turn = () => new Promise<void>(resolve => setImmediate(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
function meshes(root: Object3D) {
  const result: Mesh[] = [];
  root.traverse(object => { if (object instanceof Mesh) result.push(object); });
  return result;
}
function caseState(state: RoomCompositionState) {
  return { displayed: state.displayed, inspection: state.inspection, investigation: state.investigation,
    reconstruction: state.reconstruction, narration: state.narration, narratorContext: state.narratorContext, dialogue: state.dialogue };
}
function setup(t: TestContext, onStatus?: (state: RoomCompositionState, controller: Controller) => void) {
  const requests: string[] = [];
  const rooms = new Set<ComposedRoom>();
  const installedProps: RoomPropRequest[] = [];
  let installed: ComposedRoom | null = null;
  let binding: RoomInspectionBinding | null = null;
  let identity: RenderIdentity | null = null;
  let draw: (scene: Scene) => void = () => {};
  const camera = new PerspectiveCamera(60, 1, 0.1, 20);
  const network = t.mock.method(globalThis, 'fetch', async () => { throw new Error('No application or provider network is allowed.'); });
  const display = createRoomDisplay({ initial: { scene: new Scene(), dispose() {} }, camera,
    draw: scene => draw(scene) }) as Display;
  const controller = createRoomCompositionController({
    fetch: async (input, init) => {
      requests.push(String(input));
      assert.equal(input, '/api/compose-room', 'the only transport is the authored room setup response');
      assert.equal(init?.method, 'POST');
      return new Response(JSON.stringify(inspectionFixture()), { headers: { 'content-type': 'application/json' } });
    },
    yieldToBuild: () => Promise.resolve(),
    build: (description, seed) => {
      const room = createProceduralRoom(description, seed, poses);
      rooms.add(room);
      return room;
    },
    onStatus: state => onStatus?.(state, controller),
  }) as Controller;
  const install: RoomInstaller = (room, nextBinding, nextIdentity) => {
    rooms.add(room);
    assert.ok(nextIdentity, 'controller supplies actual case identity, not a guessed inspection binding');
    assert.equal(typeof nextIdentity.unit, 'symbol');
    assert.ok(Number.isInteger(nextIdentity.revision) && nextIdentity.revision >= 0);
    if (!display.install(room, nextBinding, nextIdentity)) return false;
    installed = room;
    binding = nextBinding;
    identity = { ...nextIdentity };
    return true;
  };
  const installProp: PropInstaller = (request, visual, isCurrent) => {
    installedProps.push(request);
    assert.equal(controller.isPropRequestCurrent(request), true);
    assert.equal(isCurrent(), true, 'display must receive a live ownership check, not a captured boolean');
    return display.installProp(request, visual, isCurrent);
  };
  t.after(() => {
    controller.dispose();
    display.dispose();
    rooms.forEach(room => room.dispose());
    assert.equal(network.mock.callCount(), 0);
    assert.ok(requests.every(path => path === '/api/compose-room'));
  });
  return { controller, display, camera, requests, installedProps, install, installProp,
    get installed() { return installed!; }, get binding() { return binding!; }, get identity() { return identity!; },
    drawWith(callback: (scene: Scene) => void) { draw = callback; } };
}
type App = ReturnType<typeof setup>;
async function reveal(app: App) {
  assert.equal(await app.controller.compose('Authored four-chair case, not live generation.', 41), true);
  assert.equal(app.controller.reveal(app.install), true);
  const state = app.controller.getState();
  assert.deepEqual(app.identity, { unit: state.reconstruction!.unit, revision: 0 });
  return state.reconstruction!.unit;
}
function prepare(app: App, objectId = 'object-1') {
  const { unit, revision } = app.controller.getState().reconstruction!;
  const request = app.controller.preparePropRequest(unit, revision, {
    objectId, description: 'An authored local chair candidate; no generation has occurred.',
  });
  assert.ok(request);
  return request;
}
function investigate(app: App) {
  const unit = app.controller.getState().reconstruction!.unit;
  assert.equal(app.controller.inspect(app.binding.unit, 'object-1'), true);
  assert.equal(app.controller.proposeHypothesis(unit, 'candidate-3', ['clue-1']), true);
  assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-3'), true);
  const statement = app.controller.getState().investigation!.statements.at(-1)!;
  assert.equal(app.controller.challengeEvaStatement(unit, statement.id, ['clue-1']), true);
}
// Delay only delivery of a real parsed GLTF, exercising a loader completion that ignores local abort.
function holdLoaded(t: TestContext) {
  const loaded = deferred<GLTF>(), gate = deferred<void>();
  const parse = GLTFLoader.prototype.parse;
  let delivery: Promise<void> | null = null;
  t.mock.method(GLTFLoader.prototype, 'parse', function (this: GLTFLoader, data, path, onLoad, onError) {
    return parse.call(this, data, path, gltf => {
      delivery = gate.promise.then(() => onLoad(gltf));
      loaded.resolve(gltf);
    }, onError);
  });
  const resume = async () => { gate.resolve(); if (delivery) await delivery; await turn(); };
  t.after(resume);
  return { loaded: loaded.promise, resume };
}

test('local prop installation uses the actual loader and changes only the bound visual, not facts clues history or picking identity', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  investigate(app);
  const request = prepare(app);
  const before = caseState(app.controller.getState());
  const room = app.installed, wrapper = app.binding.bindings.get('object-1')!;
  const original = wrapper.children[0];
  const others = [...app.binding.bindings].filter(([id]) => id !== 'object-1').map(([, object]) => [object, object.children[0]] as const);
  const pose = { position: wrapper.position.toArray(), rotation: wrapper.rotation.toArray(), scale: wrapper.scale.toArray() };
  const parse = t.mock.method(GLTFLoader.prototype, 'parse');
  assert.equal(await app.controller.installProp(request, bytes(), app.installProp), true);
  assert.equal(parse.mock.callCount(), 1);
  assert.equal(app.installed, room);
  assert.equal(app.binding.bindings.get('object-1'), wrapper);
  assert.equal(wrapper.children.length, 1);
  assert.notEqual(wrapper.children[0], original);
  for (const [object, visual] of others) assert.equal(object.children[0], visual);
  assert.deepEqual({ position: wrapper.position.toArray(), rotation: wrapper.rotation.toArray(), scale: wrapper.scale.toArray() }, pose);
  const loaded = meshes(wrapper);
  assert.equal(loaded.length, 2);
  assert.ok(loaded.every(mesh => !(mesh.geometry instanceof BoxGeometry)));
  assert.equal(loaded.reduce((total, mesh) => total + mesh.geometry.index!.count / 3, 0), 72);
  assert.deepEqual(caseState(app.controller.getState()), before);
  assert.equal(app.controller.getState().props.phase, 'installed');
  assert.equal(app.controller.getState().props.availability, 'unconfigured', 'an authored local installation does not configure the missing provider pipeline');
  assert.equal(app.controller.getState().props.remainingRequests, 2);
  assert.equal(app.controller.isPropRequestCurrent(request), false, 'successful installation consumes this operation capability');
  assert.deepEqual(request.owner, { unit, objectId: 'object-1', revision: 0, generation: 1 });
  app.camera.position.set(2, 2.5, -3); app.camera.lookAt(2, 0, -3); app.camera.updateMatrixWorld(true);
  assert.deepEqual(app.display.pick(200, 200, { left: 0, top: 0, width: 400, height: 400 }), { unit: app.binding.unit, objectId: 'object-1' });
  assert.equal(app.display.render(), true);
  assert.deepEqual(app.requests, ['/api/compose-room']);
});

test('only the exact current request capability can reach admission or installation', async t => {
  const app = setup(t);
  await reveal(app);
  const request = prepare(app), before = app.controller.getState();
  const parse = t.mock.method(GLTFLoader.prototype, 'parse');
  const candidate = bytes();
  const copying = t.mock.method(candidate, 'slice', () => { throw new Error('Unauthorized bytes were copied.'); });
  const forged = [
    before.props.request!, { ...request },
    { ...request, owner: { ...request.owner, unit: Symbol('foreign case') } },
    { ...request, owner: { ...request.owner, objectId: 'object-2' } },
    { ...request, owner: { ...request.owner, generation: request.owner.generation + 1 } },
    { ...request, owner: { ...request.owner, revision: 1 } },
    { ...request, envelope: { ...request.envelope, width: 99 } },
  ];
  for (const wrong of forged) {
    assert.equal(await app.controller.installProp(wrong, candidate, app.installProp), false);
    assert.deepEqual(app.controller.getState(), before);
  }
  assert.equal(copying.mock.callCount(), 0);
  assert.equal(parse.mock.callCount(), 0);
  assert.equal(app.installedProps.length, 0);
  assert.equal(app.controller.isPropRequestCurrent(request), true);
  assert.equal(await app.controller.installProp(request, bytes(), app.installProp), true, 'rejected forgeries cannot consume the real request');
});

test('one pending local install and one committed use are allowed per request, without renewing the preparation ceiling', { timeout: 5000 }, async t => {
  const app = setup(t);
  await reveal(app);
  const request = prepare(app);
  const hold = holdLoaded(t);
  const pending = app.controller.installProp(request, bytes(), app.installProp);
  await hold.loaded;
  const state = app.controller.getState();
  assert.equal(await app.controller.installProp(request, bytes(), app.installProp), false);
  assert.deepEqual(app.controller.getState(), state);
  assert.equal(app.controller.preparePropRequest(request.owner.unit, 0, { objectId: 'object-2', description: 'Another chair.' }), null);
  await hold.resume();
  assert.equal(await pending, true);
  assert.equal(await app.controller.installProp(request, bytes(), app.installProp), false);
  assert.deepEqual(app.installedProps, [request]);
  for (const objectId of ['object-2', 'object-3']) {
    const next = prepare(app, objectId);
    assert.ok(next.owner.generation > request.owner.generation);
    assert.equal(await app.controller.installProp(next, bytes(), app.installProp), true);
  }
  assert.equal(app.controller.getState().props.remainingRequests, 0);
  assert.equal(app.controller.preparePropRequest(request.owner.unit, 0, { objectId: 'object-1', description: 'Fourth preparation.' }), null);
  assert.equal(app.installedProps.length, 3);
  assert.deepEqual(app.requests, ['/api/compose-room']);
});

for (const failure of ['admission', 'draw', 'installer-throw'] as const) {
  test(`a ${failure} failure preserves the previous installed visual and investigation without automatic retries`, async t => {
    const app = setup(t);
    await reveal(app);
    investigate(app);
    assert.equal(await app.controller.installProp(prepare(app), bytes(), app.installProp), true);
    const wrapper = app.binding.bindings.get('object-1')!, original = wrapper.children[0];
    const releases = [...new Set(meshes(original).map(mesh => mesh.geometry))].map(geometry => t.mock.method(geometry, 'dispose'));
    const request = prepare(app), before = caseState(app.controller.getState());
    const parse = t.mock.method(GLTFLoader.prototype, 'parse');
    let candidate: Visual | null = null;
    const installer: PropInstaller = (actual, visual, current) => {
      candidate = visual;
      if (failure === 'installer-throw') throw new Error('PRIVATE_INSTALL_FAILURE');
      return app.installProp(actual, visual, current);
    };
    if (failure === 'draw') app.drawWith(scene => { if (scene !== app.installed.scene) throw new Error('PRIVATE_DRAW_FAILURE'); });
    const input = failure === 'admission' ? new TextEncoder().encode('abc').buffer : bytes();
    assert.equal(await app.controller.installProp(request, input, installer), false);
    assert.equal(parse.mock.callCount(), failure === 'admission' ? 0 : 1);
    assert.equal(wrapper.children[0], original);
    assert.ok(releases.every(release => release.mock.callCount() === 0));
    assert.deepEqual(caseState(app.controller.getState()), before);
    assert.equal(app.controller.getState().props.phase, 'failed');
    assert.equal(app.controller.getState().props.remainingRequests, 1);
    assert.equal(app.controller.isPropRequestCurrent(request), false);
    assert.doesNotMatch(JSON.stringify(app.controller.getState().props), /PRIVATE_/);
    if (candidate) assert.throws(() => (candidate as Visual).clone(), /disposed|released/i, 'failed installation must release its caller-owned staged visual');
    app.drawWith(() => {});
    assert.equal(app.display.render(), true);
    assert.equal(await app.controller.installProp(request, bytes(), app.installProp), false);
    assert.equal(parse.mock.callCount(), failure === 'admission' ? 0 : 1, 'a failed capability cannot retry the loader');
    assert.deepEqual(app.requests, ['/api/compose-room']);
  });
}

for (const action of ['cancel', 'stop', 'reset', 'dispose'] as const) {
  test(`${action} retires pending installation promptly and a late actual-loader result cannot change newer state`, { timeout: 5000 }, async t => {
    const app = setup(t);
    await reveal(app);
    investigate(app);
    const request = prepare(app), before = caseState(app.controller.getState());
    const wrapper = app.binding.bindings.get('object-1')!, original = wrapper.children[0];
    const hold = holdLoaded(t);
    const pending = app.controller.installProp(request, bytes(), app.installProp);
    const gltf = await hold.loaded;
    const releases = [...new Set(meshes(gltf.scene).map(mesh => mesh.geometry))].map(geometry => t.mock.method(geometry, 'dispose'));
    if (action === 'cancel') assert.equal(app.controller.cancelPropRequest(), true);
    else if (action === 'stop') assert.equal(app.controller.stop(), true);
    else if (action === 'reset') assert.equal(app.controller.reset(), true);
    else app.controller.dispose();
    assert.equal(await pending, false, 'the local waiter settles before the held native loader completion');
    assert.equal(app.controller.isPropRequestCurrent(request), false);
    assert.equal(app.installedProps.length, 0);
    assert.equal(wrapper.children[0], original);
    let next: RoomPropRequest | null = null;
    if (action === 'cancel' || action === 'stop') {
      assert.equal(app.controller.getState().props.phase, 'cancelled');
      assert.deepEqual(caseState(app.controller.getState()), before);
      next = prepare(app, 'object-2');
      assert.ok(next.owner.generation > request.owner.generation);
    } else if (action === 'reset') {
      const state = app.controller.getState();
      assert.equal(state.displayed, null);
      assert.equal(state.inspection, null);
      assert.equal(state.investigation, null);
      assert.equal(state.reconstruction, null);
      assert.equal(state.props.phase, 'idle');
    } else assert.equal(app.controller.getState().disposed, true);
    const afterStop = app.controller.getState();
    await hold.resume();
    assert.ok(releases.length > 0 && releases.every(release => release.mock.callCount() === 1));
    assert.deepEqual(app.controller.getState(), afterStop);
    assert.equal(wrapper.children[0], original, 'the display owns the old scene until its own replacement or teardown');
    assert.equal(app.installedProps.length, 0);
    if (next) assert.equal(app.controller.isPropRequestCurrent(next), true);
    assert.deepEqual(app.requests, ['/api/compose-room']);
  });
}

test('successful reconstruction invalidates pending prop work with the real case revision, not the new picking binding', { timeout: 5000 }, async t => {
  const app = setup(t);
  const unit = await reveal(app);
  investigate(app);
  const request = prepare(app);
  const before = app.controller.getState();
  const hold = holdLoaded(t);
  const pending = app.controller.installProp(request, bytes(), app.installProp);
  await hold.loaded;
  assert.equal(app.controller.applyReconstructionEdit(unit, 0, 1, moved, app.install), true);
  assert.equal(await pending, false);
  const after = app.controller.getState();
  assert.deepEqual(app.identity, { unit, revision: 1 });
  assert.notEqual(app.binding.unit, unit);
  assert.equal(after.props.phase, 'stale');
  assert.equal(after.props.reason, 'reconstruction_changed');
  assert.deepEqual(after.displayed, before.displayed);
  assert.deepEqual(after.inspection!.discoveredClues, before.inspection!.discoveredClues);
  assert.deepEqual(after.investigation!.history.slice(0, -1), before.investigation!.history);
  assert.equal(app.controller.preparePropRequest(app.binding.unit, 1, { objectId: 'object-1', description: 'Wrong owner.' }), null);
  assert.equal(app.controller.preparePropRequest(unit, 0, { objectId: 'object-1', description: 'Old revision.' }), null);
  const next = prepare(app);
  assert.deepEqual(next.owner, { unit, revision: 1, generation: request.owner.generation + 1, objectId: 'object-1' });
  assert.deepEqual(next.envelope, { ...moved, width: 0.65, depth: 0.65, height: 1.1 });
  const state = app.controller.getState(), currentVisual = app.binding.bindings.get('object-1')!.children[0];
  await hold.resume();
  assert.deepEqual(app.controller.getState(), state);
  assert.equal(app.binding.bindings.get('object-1')!.children[0], currentVisual);
  assert.equal(app.installedProps.length, 0);
  assert.equal(await app.controller.installProp(request, bytes(), app.installProp), false);
  assert.equal(await app.controller.installProp(next, bytes(), app.installProp), true);
});

test('rejected reconstruction preserves the installed prop and current capability; successful reconstruction retains its resource lease and prior facts', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  investigate(app);
  assert.equal(await app.controller.installProp(prepare(app), bytes(), app.installProp), true);
  const wrapper = app.binding.bindings.get('object-1')!, visual = wrapper.children[0];
  const geometry = meshes(visual).map(mesh => mesh.geometry);
  const material = meshes(visual).map(mesh => mesh.material);
  const releases = [...new Set(geometry)].map(item => t.mock.method(item, 'dispose'));
  const request = prepare(app, 'object-2');
  const before = app.controller.getState();
  assert.equal(app.controller.applyReconstructionEdit(unit, 0, 1, { x: 0, z: -3, rotation: 0 }, app.install), false);
  app.drawWith(scene => { if (scene !== app.installed.scene) throw new Error('Authored reconstruction draw failure.'); });
  assert.equal(app.controller.applyReconstructionEdit(unit, 0, 1, moved, app.install), false);
  assert.deepEqual(app.controller.getState(), before);
  assert.equal(app.binding.bindings.get('object-1'), wrapper);
  assert.equal(wrapper.children[0], visual);
  assert.equal(app.controller.isPropRequestCurrent(request), true);
  assert.ok(releases.every(release => release.mock.callCount() === 0));
  app.drawWith(() => {});
  assert.equal(app.controller.applyReconstructionEdit(unit, 0, 1, moved, app.install), true);
  const nextWrapper = app.binding.bindings.get('object-1')!;
  assert.notEqual(nextWrapper, wrapper);
  assert.notEqual(nextWrapper.children[0], visual);
  assert.deepEqual(meshes(nextWrapper).map(mesh => mesh.geometry), geometry);
  assert.deepEqual(meshes(nextWrapper).map(mesh => mesh.material), material);
  assert.ok(releases.every(release => release.mock.callCount() === 0));
  const box = new Box3().setFromObject(nextWrapper, true);
  assert.ok(Math.abs(box.min.y) < 1e-6);
  assert.ok(Math.abs(box.getCenter(new Vector3()).x - 2.75) < 1e-6);
  assert.ok(Math.abs(box.getCenter(new Vector3()).z + 2.5) < 1e-6);
  const after = app.controller.getState();
  assert.deepEqual(after.displayed, before.displayed);
  assert.deepEqual(after.reconstruction!.original, before.reconstruction!.original);
  assert.equal(after.reconstruction!.unit, unit);
  assert.equal(after.reconstruction!.revision, 1);
  assert.equal(after.inspection!.selectedObjectId, before.inspection!.selectedObjectId);
  assert.deepEqual(after.inspection!.discoveredClues, before.inspection!.discoveredClues);
  assert.deepEqual(after.investigation, { ...before.investigation!, history: [...before.investigation!.history,
    { kind: 'reconstruction-edit', origin: 'visitor', revision: 1, furnishingIndex: 1, before: { x: 2, z: -3, rotation: 0 }, after: moved }] });
  assert.equal(app.controller.isPropRequestCurrent(request), false);
  assert.equal(await app.controller.installProp(request, bytes(), app.installProp), false);
  app.display.dispose(); app.display.dispose();
  assert.ok(releases.every(release => release.mock.callCount() === 1));
});

test('same-ID same-seed case replacement cannot inherit either installed prop resources or an old pending capability', { timeout: 5000 }, async t => {
  const app = setup(t);
  const oldUnit = await reveal(app);
  assert.equal(await app.controller.installProp(prepare(app), bytes(), app.installProp), true);
  const oldGeometry = [...new Set(meshes(app.binding.bindings.get('object-1')!).map(mesh => mesh.geometry))];
  const releases = oldGeometry.map(geometry => t.mock.method(geometry, 'dispose'));
  const request = prepare(app), originalCase = app.controller.getState().displayed;
  const hold = holdLoaded(t);
  const pending = app.controller.installProp(request, bytes(), app.installProp);
  await hold.loaded;
  assert.equal(await app.controller.compose('Authored four-chair case, not live generation.', 41), true);
  assert.equal(app.controller.isPropRequestCurrent(request), true, 'a merely pending case cannot invalidate the displayed case');
  assert.equal(app.controller.reveal(app.install), true);
  assert.equal(await pending, false);
  const state = app.controller.getState();
  assert.deepEqual(state.displayed, originalCase);
  assert.notEqual(state.reconstruction!.unit, oldUnit);
  assert.deepEqual(app.identity, { unit: state.reconstruction!.unit, revision: 0 });
  assert.ok(releases.every(release => release.mock.callCount() === 1));
  assert.ok(meshes(app.binding.bindings.get('object-1')!).every(mesh => mesh.geometry instanceof BoxGeometry));
  const next = prepare(app);
  assert.ok(next.owner.generation > request.owner.generation);
  assert.notEqual(next.owner.unit, request.owner.unit);
  const beforeLate = app.controller.getState();
  await hold.resume();
  assert.deepEqual(app.controller.getState(), beforeLate);
  assert.equal(app.installedProps.length, 1);
  assert.equal(app.controller.isPropRequestCurrent(next), true);
  assert.equal(await app.controller.installProp(request, bytes(), app.installProp), false);
  assert.equal(await app.controller.installProp(next, bytes(), app.installProp), true);
  assert.deepEqual(app.requests, ['/api/compose-room', '/api/compose-room']);
});

test('Stop from the installing status notification cannot commit or leak an already staged candidate', async t => {
  const app = setup(t, (state, controller) => { if (state.props.phase === 'installing') controller.stop(); });
  await reveal(app);
  investigate(app);
  const request = prepare(app), before = caseState(app.controller.getState());
  const wrapper = app.binding.bindings.get('object-1')!, original = wrapper.children[0];
  const geometries = new Set<Mesh['geometry']>();
  const parse = GLTFLoader.prototype.parse;
  const releases: ReturnType<TestContext['mock']['method']>[] = [];
  t.mock.method(GLTFLoader.prototype, 'parse', function (this: GLTFLoader, data, path, onLoad, onError) {
    return parse.call(this, data, path, gltf => {
      for (const mesh of meshes(gltf.scene)) geometries.add(mesh.geometry);
      for (const geometry of geometries) releases.push(t.mock.method(geometry, 'dispose'));
      onLoad(gltf);
    }, onError);
  });
  assert.equal(await app.controller.installProp(request, bytes(), app.installProp), false);
  assert.equal(app.controller.getState().props.phase, 'cancelled');
  assert.equal(app.installedProps.length, 0);
  assert.equal(wrapper.children[0], original);
  assert.deepEqual(caseState(app.controller.getState()), before);
  assert.ok(releases.length > 0 && releases.every(release => release.mock.callCount() === 1));
  assert.equal(app.controller.isPropRequestCurrent(request), false);
});
