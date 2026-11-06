import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, Texture, Vector3 } from 'three';
import { createRoomDisplay } from '../src/room/room-display.ts';
import { createProceduralRoom, getFurnishingEnvelope } from '../src/room/procedural-room.ts';
import { bindRoomCaseObjects } from '../src/room/room-case.ts';
import type { RoomPropRequest } from '../src/room/room-prop-request.ts';
import type { RoomInspectionBinding } from '../src/room/room-inspection.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';
import { chairFixture } from './fixtures/prop-glb.ts';

// Authored resources and injected drawing: no WebGL/browser or live generation evidence.
function room(name: string, throws = false) {
  const scene = new Scene();
  scene.name = name;
  let disposals = 0;
  return {
    scene,
    get disposals() { return disposals; },
    dispose() { disposals += 1; if (throws) throw new Error('private cleanup detail'); },
  };
}

test('failed candidate rendering restores old scene without taking candidate ownership', () => {
  const old = room('old');
  const candidate = room('candidate');
  const camera = new PerspectiveCamera();
  const draws: Scene[] = [];
  const display = createRoomDisplay({ initial: old, camera, draw: (scene, suppliedCamera) => {
    assert.equal(suppliedCamera, camera);
    draws.push(scene);
    if (scene === candidate.scene) throw new Error('candidate cannot render');
  } });
  assert.equal(display.install(candidate), false);
  assert.deepEqual(draws, [candidate.scene, old.scene]);
  assert.equal(old.disposals, 0);
  assert.equal(candidate.disposals, 0, 'controller still owns the rejected candidate');
  assert.equal(display.render(), true);
  assert.equal(draws.at(-1), old.scene);
  display.dispose();
  display.dispose();
  assert.equal(old.disposals, 1);
  candidate.dispose();
});

test('successful swap retains the exact camera and releases old/current resources once', () => {
  const old = room('old');
  const first = room('first');
  const second = room('second');
  const camera = new PerspectiveCamera();
  camera.position.set(0.3, 1.9, 2.5);
  camera.lookAt(0, 1.45, -1.3);
  camera.updateMatrixWorld();
  camera.projectionMatrix.makePerspective(-0.12, 0.17, 0.09, -0.07, 0.1, 30);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  const before = { position: camera.position.toArray(), world: camera.matrixWorld.toArray(), projection: camera.projectionMatrix.toArray(), inverse: camera.projectionMatrixInverse.toArray() };
  const draws: Scene[] = [];
  const display = createRoomDisplay({ initial: old, camera, draw: (scene, suppliedCamera) => { assert.equal(suppliedCamera, camera); draws.push(scene); } });
  assert.equal(display.install(first), true);
  assert.equal(old.disposals, 1);
  assert.equal(first.disposals, 0);
  assert.equal(display.install(second), true);
  assert.equal(first.disposals, 1);
  assert.equal(display.render(), true);
  assert.equal(draws.at(-1), second.scene);
  assert.deepEqual({ position: camera.position.toArray(), world: camera.matrixWorld.toArray(), projection: camera.projectionMatrix.toArray(), inverse: camera.projectionMatrixInverse.toArray() }, before);
  display.dispose();
  display.dispose();
  assert.equal(old.disposals, 1);
  assert.equal(first.disposals, 1);
  assert.equal(second.disposals, 1);
});

test('old cleanup failure reports a warning but cannot turn a committed swap into failure', () => {
  const old = room('old', true);
  const candidate = room('candidate');
  let warnings = 0;
  let drawn: Scene | undefined;
  const display = createRoomDisplay({ initial: old, camera: new PerspectiveCamera(), draw: scene => { drawn = scene; }, onCleanupError: () => { warnings += 1; throw new Error('observer failure'); } });
  assert.equal(display.install(candidate), true);
  assert.equal(warnings, 1);
  assert.equal(old.disposals, 1);
  assert.equal(display.render(), true);
  assert.equal(drawn, candidate.scene);
  display.dispose();
  display.dispose();
  assert.equal(old.disposals, 1);
  assert.equal(candidate.disposals, 1);
});

test('disposed or already released installers refuse without touching caller-owned candidate', () => {
  const old = room('old');
  const next = room('next');
  const late = room('late');
  let draws = 0;
  const display = createRoomDisplay({ initial: old, camera: new PerspectiveCamera(), draw: () => { draws += 1; } });
  const staleInstall = display.install;
  assert.equal(display.install(next), true);
  assert.equal(display.install(old), false);
  assert.equal(display.install(next), false);
  display.dispose();
  assert.equal(staleInstall(late), false);
  assert.equal(display.render(), false);
  assert.equal(draws, 1);
  assert.equal(late.disposals, 0);
  late.dispose();
});

test('context teardown during candidate draw cannot commit to an abandoned display', () => {
  const old = room('old');
  const candidate = room('candidate');
  const display = createRoomDisplay({ initial: old, camera: new PerspectiveCamera(), draw: () => { display.dispose(); } });
  assert.equal(display.install(candidate), false);
  assert.equal(old.disposals, 1);
  assert.equal(candidate.disposals, 0);
  display.dispose();
  candidate.dispose();
});

test('failed restoration declares display unavailable and releases its old resource owner', () => {
  const old = room('old');
  const candidate = room('candidate');
  let unavailable = 0;
  const display = createRoomDisplay({ initial: old, camera: new PerspectiveCamera(), draw: () => { throw new Error('draw failed'); }, onUnavailable: () => { unavailable += 1; } });
  assert.equal(display.install(candidate), false);
  assert.equal(unavailable, 1);
  assert.equal(old.disposals, 1);
  assert.equal(display.render(), false);
  assert.equal(candidate.disposals, 0);
  display.dispose();
  candidate.dispose();
});

test('a reentrant install is refused while the current ownership decision is unfinished', () => {
  const old = room('old');
  const candidate = room('candidate');
  const nested = room('nested');
  const display = createRoomDisplay({ initial: old, camera: new PerspectiveCamera(), draw: () => { assert.equal(display.install(nested), false); } });
  assert.equal(display.install(candidate), true);
  assert.equal(old.disposals, 1);
  assert.equal(nested.disposals, 0);
  display.dispose();
  nested.dispose();
});

test('throwing current cleanup remains terminal and is never repeated', () => {
  const old = room('old', true);
  let warnings = 0;
  const display = createRoomDisplay({ initial: old, camera: new PerspectiveCamera(), draw: () => {}, onCleanupError: () => { warnings += 1; } });
  display.dispose();
  display.dispose();
  assert.equal(old.disposals, 1);
  assert.equal(warnings, 1);
  assert.equal(display.render(), false);
});

// Synthetic geometry; picking uses real Three ray intersections, not a mocked raycaster.
const bounds = { left: 100, top: 50, width: 400, height: 200 };
function pickRoom() {
  const resource = room('synthetic inspection scene');
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshBasicMaterial({ color: 0x008080 });
  const groups = [new Group(), new Group()];
  groups.forEach((group, index) => {
    group.name = 'identical chair';
    group.position.set(index * 3, 0, -4);
    group.add(new Mesh(geometry, material));
    resource.scene.add(group);
  });
  const dispose = resource.dispose;
  resource.dispose = () => { geometry.dispose(); material.dispose(); dispose(); };
  const camera = new PerspectiveCamera(60, 2, 0.1, 30);
  const binding = { unit: Symbol('synthetic case'), bindings: new Map([['object-1', groups[0]], ['object-2', groups[1]]]) };
  return { resource, groups, camera, binding, material };
}

test('picking is unavailable for an authored initial scene and uses exact bound instances after install', () => {
  const { resource, groups, camera, binding } = pickRoom();
  const initial = room('authored fixture');
  initial.scene.add(resource.scene.clone());
  const display = createRoomDisplay({ initial, camera, draw: () => {} });
  try {
    assert.equal(display.pick(300, 150, bounds), null, 'authored initial geometry has no generated case');
    assert.equal(display.install(resource, binding), true);
    assert.deepEqual(display.pick(300, 150, bounds), { unit: binding.unit, objectId: 'object-1' });
    groups[0].name = 'unrelated renamed furnishing';
    groups[1].name = 'object-1';
    assert.deepEqual(display.pick(300, 150, bounds), { unit: binding.unit, objectId: 'object-1' }, 'identity is not a name or color guess');
    camera.position.x = 3;
    assert.deepEqual(display.pick(300, 150, bounds), { unit: binding.unit, objectId: 'object-2' }, 'latest camera world transform is used');
    groups[1].position.x = 5;
    assert.equal(display.pick(300, 150, bounds), null, 'latest scene matrices are used, not the last render');
  } finally { display.dispose(); }
});

test('raycasting honors current canvas bounds and off-axis projection without resetting the lens', () => {
  const { resource, groups, camera, binding } = pickRoom();
  const display = createRoomDisplay({ initial: room('fixture'), camera, draw: () => {} });
  try {
    display.install(resource, binding);
    camera.projectionMatrix.makePerspective(-0.05, 0.15, 0.06, -0.06, 0.1, 30);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.updateMatrixWorld();
    resource.scene.updateMatrixWorld(true);
    const projection = camera.projectionMatrix.toArray();
    const point = groups[0].getWorldPosition(new Vector3()).project(camera);
    const movedBounds = { left: 430, top: 270, width: 800, height: 300 };
    const x = movedBounds.left + (point.x + 1) * movedBounds.width / 2;
    const y = movedBounds.top + (1 - point.y) * movedBounds.height / 2;
    assert.deepEqual(display.pick(x, y, movedBounds), { unit: binding.unit, objectId: 'object-1' });
    assert.equal(display.pick(x, y, bounds), null);
    for (const bad of [
      { ...bounds, width: 0 }, { ...bounds, height: -1 }, { ...bounds, left: NaN },
    ]) assert.equal(display.pick(300, 150, bad), null);
    for (const [px, py] of [[99, 150], [501, 150], [300, 49], [300, 251], [NaN, 150], [300, Infinity]]) {
      assert.equal(display.pick(px, py, bounds), null);
    }
    assert.deepEqual(camera.projectionMatrix.toArray(), projection, 'picking cannot reset calibrated projection');
  } finally { display.dispose(); }
});

test('nearest unrelated geometry occludes clues while invisible geometry does not', () => {
  const { resource, groups, camera, binding } = pickRoom();
  const blocker = new Mesh(new BoxGeometry(2, 2, 0.2), new MeshBasicMaterial());
  blocker.position.set(0, 0, -2);
  blocker.name = 'object-1';
  const parent = new Group();
  parent.add(blocker);
  resource.scene.add(parent);
  const display = createRoomDisplay({ initial: room('fixture'), camera, draw: () => {} });
  try {
    display.install(resource, binding);
    assert.equal(display.pick(300, 150, bounds), null, 'architecture or unbound furniture blocks selection behind it');
    blocker.visible = false;
    assert.deepEqual(display.pick(300, 150, bounds), { unit: binding.unit, objectId: 'object-1' });
    blocker.visible = true;
    parent.visible = false;
    assert.deepEqual(display.pick(300, 150, bounds), { unit: binding.unit, objectId: 'object-1' });
    parent.visible = true;
    blocker.material.visible = false;
    assert.deepEqual(display.pick(300, 150, bounds), { unit: binding.unit, objectId: 'object-1' });
    groups[0].visible = false;
    assert.equal(display.pick(300, 150, bounds), null, 'invisible bound furniture is not inspectable');
    groups[0].visible = true;
    blocker.material.visible = true;
    blocker.layers.set(1);
    assert.deepEqual(display.pick(300, 150, bounds), { unit: binding.unit, objectId: 'object-1' });
    camera.layers.enable(1);
    assert.equal(display.pick(300, 150, bounds), null, 'occlusion follows the active camera layers');
  } finally { display.dispose(); blocker.geometry.dispose(); blocker.material.dispose(); }
});

test('failed install retains old pick bindings; successful replacement and disposal invalidate old geometry', () => {
  const old = pickRoom();
  const next = pickRoom();
  const rejected = pickRoom();
  let failCandidate = false;
  const display = createRoomDisplay({ initial: room('fixture'), camera: old.camera, draw: scene => {
    if (failCandidate && scene === rejected.resource.scene) throw new Error('synthetic draw failure');
  } });
  try {
    display.install(old.resource, old.binding);
    const stalePick = display.pick;
    failCandidate = true;
    assert.equal(display.install(rejected.resource, rejected.binding), false);
    assert.deepEqual(display.pick(300, 150, bounds), { unit: old.binding.unit, objectId: 'object-1' });
    assert.equal(display.install(next.resource, next.binding), true);
    assert.equal(old.resource.disposals, 1);
    assert.deepEqual(stalePick(300, 150, bounds), { unit: next.binding.unit, objectId: 'object-1' }, 'retained picker reads only current display');
    next.groups[0].position.x = 10;
    assert.equal(stalePick(300, 150, bounds), null, 'disposed old object still at the click must not be considered');
    display.dispose();
    assert.equal(stalePick(300, 150, bounds), null);
    assert.equal(next.resource.disposals, 1);
  } finally { display.dispose(); rejected.resource.dispose(); }
});

test('an unfinished install cannot produce selection from either old or candidate scene', () => {
  const next = pickRoom();
  const display = createRoomDisplay({ initial: room('fixture'), camera: next.camera, draw: () => {
    assert.equal(display.pick(300, 150, bounds), null);
  } });
  try {
    assert.equal(display.install(next.resource, next.binding), true);
    assert.deepEqual(display.pick(300, 150, bounds), { unit: next.binding.unit, objectId: 'object-1' });
  } finally { display.dispose(); }
});

// Extra post-draft coverage; the controller assertion supplied the original RED evidence.
type PropVisual = { root: Group; clone(): PropVisual; dispose(): void };
type RenderIdentity = { unit: symbol; revision: number };
type PropDisplay = Omit<ReturnType<typeof createRoomDisplay>, 'install'> & {
  install(candidate: ReturnType<typeof createProceduralRoom>, binding: RoomInspectionBinding, identity?: RenderIdentity): boolean;
  installProp(request: RoomPropRequest, candidate: PropVisual, isCurrent: () => boolean): boolean;
};
async function propVisual(request: RoomPropRequest): Promise<PropVisual> {
  const path = '../src/room/room-prop-visual.ts';
  return (await import(path)).stageRoomPropVisual(chairFixture({ textured: false }).bytes, request.envelope, new AbortController().signal);
}
function propDisplay() {
  const fixture = inspectionFixture();
  if (fixture.outcome !== 'supported') throw new Error('Expected authored case.');
  const poses = [{ x: -2, z: -3, rotation: 0 }, { x: 2, z: -3, rotation: 0 },
    { x: -2, z: 0, rotation: 0 }, { x: 2, z: 0, rotation: 0 }] as const;
  const current = createProceduralRoom(fixture.description, 41, poses);
  const binding = { unit: Symbol('inspection bindings'), bindings: bindRoomCaseObjects(fixture.case, fixture.description, current) };
  const identity = { unit: Symbol('actual displayed case'), revision: 0 };
  const camera = new PerspectiveCamera(60, 1, 0.1, 20);
  const draws: Scene[] = [];
  let draw: (scene: Scene) => void = () => {};
  let unavailable = 0, warnings = 0;
  const display = createRoomDisplay({ initial: room('authored initial'), camera,
    draw: scene => { draws.push(scene); draw(scene); }, onUnavailable: () => { unavailable += 1; }, onCleanupError: () => { warnings += 1; } }) as PropDisplay;
  assert.equal(display.install(current, binding, identity), true);
  const wrapper = binding.bindings.get('object-1')!;
  const request = (generation = 1): RoomPropRequest => Object.freeze({
    owner: Object.freeze({ unit: identity.unit, objectId: 'object-1', revision: identity.revision, generation }),
    visual: Object.freeze({ kind: 'chair', color: 'teal', description: 'Authored local candidate; not generated.' }),
    envelope: Object.freeze(getFurnishingEnvelope(current.layout, 1)),
  });
  const rebuild = () => {
    const changed = [...poses]; changed[1] = { x: 2.75, z: -2.5, rotation: 90 } as typeof changed[number];
    const candidate = createProceduralRoom(fixture.description, 41, changed);
    return { candidate, binding: { unit: Symbol('rebuilt bindings'), bindings: bindRoomCaseObjects(fixture.case, fixture.description, candidate) } };
  };
  return { current, binding, identity, camera, draws, display, wrapper, request, rebuild,
    drawWith(callback: (scene: Scene) => void) { draw = callback; },
    get unavailable() { return unavailable; }, get warnings() { return warnings; } };
}
function propMeshes(root: Group | Scene) {
  const meshes: Mesh[] = []; root.traverse(object => { if (object instanceof Mesh) meshes.push(object); }); return meshes;
}

test('prop rendering commits only the visual child after candidate draw and a second ownership check', async t => {
  const app = propDisplay();
  t.after(app.display.dispose);
  const request = app.request();
  const candidate = await propVisual(request);
  const original = app.wrapper.children[0];
  const originalParent = app.wrapper.parent;
  const oldGeometry = propMeshes(original as Group).map(mesh => t.mock.method(mesh.geometry, 'dispose'));
  const roomMaterials = [...new Set(propMeshes(app.current.scene).map(mesh => mesh.material))].map(material => t.mock.method(material as MeshBasicMaterial, 'dispose'));
  const pose = app.wrapper.matrix.toArray();
  const layout = structuredClone(app.current.layout);
  const release = t.mock.method(candidate, 'dispose');
  let checks = 0;
  app.drawWith(scene => {
    assert.notEqual(scene, app.current.scene, 'draw an offscene graph, not a prematurely mutated current room');
    assert.equal(app.wrapper.children[0], original);
    assert.equal(original.parent, app.wrapper);
    assert.ok(checks >= 1, 'authority was checked before drawing');
    assert.equal(app.display.pick(200, 200, { left: 0, top: 0, width: 400, height: 400 }), null);
    assert.ok(propMeshes(scene.getObjectByName(app.wrapper.name) as Group).every(mesh => !(mesh.geometry instanceof BoxGeometry)));
    assert.equal(oldGeometry.every(mock => mock.mock.callCount() === 0), true);
  });
  assert.equal(app.display.installProp(request, candidate, () => { checks += 1; return true; }), true);
  assert.ok(checks >= 2);
  assert.equal(app.wrapper.children.length, 1);
  assert.equal(app.wrapper.children[0], candidate.root);
  assert.equal(app.wrapper.parent, originalParent);
  assert.deepEqual(app.wrapper.matrix.toArray(), pose);
  assert.deepEqual(app.current.layout, layout);
  assert.equal(app.binding.bindings.get('object-1'), app.wrapper);
  assert.equal(release.mock.callCount(), 0, 'display owns the admitted candidate after true');
  assert.ok(oldGeometry.every(mock => mock.mock.callCount() === 1));
  assert.ok(roomMaterials.every(mock => mock.mock.callCount() === 0), 'room-shared procedural materials remain owned');
  app.drawWith(() => {});
  app.camera.position.set(2, 2.5, -3); app.camera.lookAt(2, 0, -3); app.camera.updateMatrixWorld(true);
  assert.deepEqual(app.display.pick(200, 200, { left: 0, top: 0, width: 400, height: 400 }), { unit: app.binding.unit, objectId: 'object-1' });
  assert.equal(app.display.render(), true);
  assert.equal(app.draws.at(-1), app.current.scene);
  app.display.dispose(); app.display.dispose();
  assert.equal(release.mock.callCount(), 1);
  assert.ok(oldGeometry.every(mock => mock.mock.callCount() === 1));
});

test('failed prop draw or lost authority restores the exact old graph and leaves candidate ownership with the caller', async t => {
  for (const failure of ['draw', 'stale'] as const) {
    const app = propDisplay();
    const candidate = await propVisual(app.request());
    t.after(() => { app.display.dispose(); candidate.dispose(); });
    const original = app.wrapper.children[0];
    const release = t.mock.method(candidate, 'dispose');
    const start = app.draws.length;
    let current = true;
    app.drawWith(scene => {
      if (scene === app.current.scene) return;
      assert.equal(app.wrapper.children[0], original);
      if (failure === 'draw') throw new Error('synthetic candidate draw error');
      current = false;
    });
    assert.equal(app.display.installProp(app.request(), candidate, () => current), false);
    assert.equal(app.wrapper.children[0], original);
    assert.equal(original.parent, app.wrapper);
    assert.equal(candidate.root.parent, null);
    assert.equal(release.mock.callCount(), 0);
    assert.notEqual(app.draws[start], app.current.scene);
    assert.equal(app.draws.at(-1), app.current.scene);
    assert.equal(app.display.render(), true);
  }
});

test('prop installation rejects foreign owners stale revisions generations envelopes and disposed candidates without drawing', async t => {
  const app = propDisplay();
  t.after(app.display.dispose);
  const request = app.request();
  const candidate = await propVisual(request);
  t.after(candidate.dispose);
  const start = app.draws.length;
  for (const wrong of [
    { ...request, owner: { ...request.owner, unit: Symbol('different case') } },
    { ...request, owner: { ...request.owner, revision: 1 } },
    { ...request, owner: { ...request.owner, generation: 0 } },
    { ...request, owner: { ...request.owner, objectId: 'object-4' } },
    { ...request, envelope: { ...request.envelope, x: request.envelope.x + 1 } },
    { ...request, envelope: { ...request.envelope, width: 99 } },
  ]) assert.equal(app.display.installProp(wrong, candidate, () => true), false);
  assert.equal(app.display.installProp(request, candidate, () => false), false);
  assert.equal(app.draws.length, start);
  candidate.dispose();
  assert.equal(app.display.installProp(request, candidate, () => true), false);
  assert.equal(app.draws.length, start);
});

test('an altered staged graph cannot draw outside its authoritative envelope', async t => {
  const app = propDisplay();
  const candidate = await propVisual(app.request());
  t.after(() => { app.display.dispose(); candidate.dispose(); });
  const start = app.draws.length;
  candidate.root.scale.x *= 1000;
  assert.equal(app.display.installProp(app.request(), candidate, () => true), false);
  assert.equal(app.draws.length, start);
});

test('reentrant prop installation and a display teardown during draw cannot transfer either candidate', async t => {
  const app = propDisplay();
  const first = await propVisual(app.request());
  const nested = await propVisual(app.request(2));
  t.after(() => { app.display.dispose(); first.dispose(); nested.dispose(); });
  const firstRelease = t.mock.method(first, 'dispose'), nestedRelease = t.mock.method(nested, 'dispose');
  app.drawWith(() => {
    assert.equal(app.display.installProp(app.request(2), nested, () => true), false);
    app.display.dispose();
  });
  assert.equal(app.display.installProp(app.request(), first, () => true), false);
  assert.equal(firstRelease.mock.callCount(), 0);
  assert.equal(nestedRelease.mock.callCount(), 0);
  assert.equal(app.display.render(), false);
});

test('failed old-frame recovery makes the display unavailable without stealing the rejected visual', async t => {
  const app = propDisplay();
  const candidate = await propVisual(app.request());
  t.after(() => { app.display.dispose(); candidate.dispose(); });
  const release = t.mock.method(candidate, 'dispose');
  app.drawWith(() => { throw new Error('both draws fail'); });
  assert.equal(app.display.installProp(app.request(), candidate, () => true), false);
  assert.equal(app.unavailable, 1);
  assert.equal(app.display.render(), false);
  assert.equal(release.mock.callCount(), 0);
});

test('a committed replacement releases the former visual but cleanup failure cannot retroactively undo success', async t => {
  const app = propDisplay();
  t.after(app.display.dispose);
  const first = await propVisual(app.request());
  const second = await propVisual(app.request(2));
  assert.equal(app.display.installProp(app.request(), first, () => true), true);
  const dispose = first.dispose;
  const release = t.mock.method(first, 'dispose', () => { dispose(); throw new Error('synthetic cleanup failure'); });
  assert.equal(app.display.installProp(app.request(2), second, () => true), true);
  assert.equal(app.wrapper.children[0], second.root);
  assert.equal(release.mock.callCount(), 1);
  assert.equal(app.warnings, 1);
  assert.equal(app.display.installProp(app.request(), first, () => true), false, 'prior generation and consumed candidate cannot replay');
  assert.equal(app.display.render(), true);
  app.display.dispose();
  assert.equal(release.mock.callCount(), 1);
});

test('same-case reconstruction leases keep the generated visual alive through failed and successful room swaps', async t => {
  const app = propDisplay();
  t.after(app.display.dispose);
  const visual = await propVisual(app.request());
  const geometry = propMeshes(visual.root).map(mesh => mesh.geometry);
  const releases = geometry.map(item => t.mock.method(item, 'dispose'));
  assert.equal(app.display.installProp(app.request(), visual, () => true), true);
  const rejected = app.rebuild();
  app.drawWith(scene => { if (scene === rejected.candidate.scene) throw new Error('synthetic reconstructed draw failure'); });
  assert.equal(app.display.install(rejected.candidate, rejected.binding, { ...app.identity, revision: 1 }), false);
  rejected.candidate.dispose();
  assert.equal(app.wrapper.children[0], visual.root);
  assert.ok(releases.every(mock => mock.mock.callCount() === 0));
  const next = app.rebuild();
  app.drawWith(() => {});
  assert.equal(app.display.install(next.candidate, next.binding, { ...app.identity, revision: 1 }), true);
  const target = next.binding.bindings.get('object-1')!;
  assert.notEqual(target, app.wrapper);
  assert.notEqual(target.children[0], visual.root);
  assert.deepEqual(propMeshes(target.children[0] as Group).map(mesh => mesh.geometry), geometry);
  assert.ok(releases.every(mock => mock.mock.callCount() === 0));
  const box = new Box3().setFromObject(target, true);
  assert.ok(Math.abs(box.min.y) < 1e-6);
  assert.ok(Math.abs(box.getCenter(new Vector3()).x - 2.75) < 1e-6);
  assert.ok(Math.abs(box.getCenter(new Vector3()).z + 2.5) < 1e-6);
  app.display.dispose();
  assert.ok(releases.every(mock => mock.mock.callCount() === 1));
});

test('a new case with matching object IDs and seed never inherits prior-case generated visual leases', async t => {
  const app = propDisplay();
  t.after(app.display.dispose);
  const visual = await propVisual(app.request());
  const releases = propMeshes(visual.root).map(mesh => t.mock.method(mesh.geometry, 'dispose'));
  assert.equal(app.display.installProp(app.request(), visual, () => true), true);
  const replacement = app.rebuild();
  assert.equal(app.display.install(replacement.candidate, replacement.binding, { unit: Symbol('new case'), revision: 0 }), true);
  assert.ok(propMeshes(replacement.binding.bindings.get('object-1')!.children[0] as Group).every(mesh => mesh.geometry instanceof BoxGeometry));
  assert.ok(releases.every(mock => mock.mock.callCount() === 1));
  assert.equal(app.display.installProp(app.request(), visual, () => true), false);
});

test('off-axis picking uses clip depth, excludes far targets and ignores near-clipped occluders', () => {
  const { resource, groups, camera, binding } = pickRoom();
  const blocker = new Mesh(new BoxGeometry(1, 1, 0.1), new MeshBasicMaterial());
  blocker.position.set(0.225, 0, -0.3);
  resource.scene.add(blocker);
  const display = createRoomDisplay({ initial: room('fixture'), camera, draw: () => {} });
  camera.near = 1;
  camera.far = 3.8;
  function lens() {
    camera.projectionMatrix.makePerspective(-0.5, 1.5, 0.6, -0.6, camera.near, camera.far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.updateMatrixWorld();
  }
  try {
    display.install(resource, binding);
    lens();
    resource.scene.updateMatrixWorld(true);
    const point = groups[1].getWorldPosition(new Vector3()).project(camera);
    const x = bounds.left + (point.x + 1) * bounds.width / 2;
    const y = bounds.top + (1 - point.y) * bounds.height / 2;
    assert.deepEqual(display.pick(x, y, bounds), { unit: binding.unit, objectId: 'object-2' },
      'target front depth 3.5 is visible although ray distance 4.375 exceeds far; blocker is entirely before near');
    camera.far = 3;
    lens();
    assert.equal(display.pick(x, y, bounds), null, 'bound target beyond the far plane is not visible');
  } finally { display.dispose(); blocker.geometry.dispose(); blocker.material.dispose(); }
});

test('a painting never covers walls: EVA keeps drawing them as plain walls', () => {
  const resource = room('painted room');
  const geometry = new BoxGeometry(1, 1, 1);
  const plain = new MeshBasicMaterial({ color: 0xecebe6 });
  const named = (name: string, parent: Scene | Group = resource.scene) => { const mesh = new Mesh(geometry, plain); mesh.name = name; parent.add(mesh); return mesh; };
  const doorway = new Group(); doorway.name = 'doorway-wall'; resource.scene.add(doorway);
  const walls = [named('left-wall'), named('right-wall'), named('front-wall'), named('rear-left', doorway), named('doorway-lintel', doorway)];
  const painted = [named('floor'), named('ceiling'), named('table')];
  const target = { unit: Symbol('painted case'), revision: 1 };
  const display = createRoomDisplay({ initial: room('fixture'), camera: new PerspectiveCamera(), draw: () => {} });
  try {
    assert.equal(display.install(resource, undefined, target), true);
    assert.equal(display.paint(target, new Texture()), true);
    for (const wall of walls) assert.equal(wall.material, plain, `${wall.name} keeps its plain material`);
    const paint = painted[0].material;
    assert.notEqual(paint, plain);
    for (const mesh of painted) assert.equal(mesh.material, paint, `${mesh.name} is painted`);
  } finally { display.dispose(); geometry.dispose(); plain.dispose(); }
});
