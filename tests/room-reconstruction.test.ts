import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { Box3, PerspectiveCamera, Scene } from 'three';
import { createRoomCompositionController, type ComposedRoom, type RoomCompositionState } from '../src/room/room-composition.ts';
import { createProceduralRoom, type RoomLayout } from '../src/room/procedural-room.ts';
import { createRoomDisplay } from '../src/room/room-display.ts';
import type { RoomInspectionBinding } from '../src/room/room-inspection.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';

type Pose = { x: number; z: number; rotation: number };
type EditEntry = { kind: 'reconstruction-edit'; origin: 'visitor'; revision: number; furnishingIndex: number; before: Pose; after: Pose };
type Investigation = NonNullable<RoomCompositionState['investigation']>;
type Reconstruction = { unit: symbol; revision: number; original: RoomLayout; current: RoomLayout };
type State = Omit<RoomCompositionState, 'investigation'> & {
  investigation: (Omit<Investigation, 'history'> & { history: (Investigation['history'][number] | EditEntry)[] }) | null;
  reconstruction: Reconstruction | null;
};
type BaseController = ReturnType<typeof createRoomCompositionController>;
type Installer = Parameters<BaseController['reveal']>[0];
// Proposed local API only: the named RED imports no missing production symbols.
type Controller = Omit<BaseController, 'getState'> & {
  getState(): State;
  applyReconstructionEdit(unit: symbol, expectedRevision: number, furnishingIndex: number, pose: Pose, install: Installer): boolean;
};
const bounds = { left: 0, top: 0, width: 400, height: 400 };
const moved: Pose = { x: 2.75, z: -2.5, rotation: 90 };

function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
function setup(t: TestContext, options: { seeded?: boolean; fixture?: ReturnType<typeof inspectionFixture>; fetch?: typeof globalThis.fetch } = {}) {
  const fixture = options.fixture ?? inspectionFixture();
  const rooms: { room: ComposedRoom; disposals: number }[] = [];
  const states: State[] = [];
  const draws: Scene[] = [];
  let installed: { room: ComposedRoom; binding: RoomInspectionBinding } | undefined;
  let rejectCandidateDraw = false;
  function track(room: ComposedRoom) {
    const existing = rooms.find(item => item.room === room);
    if (existing) return existing;
    const tracked = { room, disposals: 0 };
    const dispose = room.dispose;
    room.dispose = () => { tracked.disposals += 1; dispose(); };
    rooms.push(tracked);
    return tracked;
  }
  const camera = new PerspectiveCamera(60, 1, 0.1, 20);
  const display = createRoomDisplay({ initial: { scene: new Scene(), dispose() {} }, camera, draw: (scene, suppliedCamera) => {
    assert.equal(suppliedCamera, camera);
    draws.push(scene);
    if (rejectCandidateDraw && scene !== installed?.room.scene) throw new Error('synthetic candidate draw failure');
  } });
  const controller = createRoomCompositionController({
    fetch: options.fetch ?? (async () => json(fixture)),
    yieldToBuild: () => Promise.resolve(),
    build: (description, seed) => {
      const room = createProceduralRoom(description, seed);
      if (!options.seeded) {
        // Real meshes at hand-checked fixture positions: center aisle and every 0.15 gap are clear.
        const positions = [[-2, -3], [2, -3], [-2, 0], [2, 0]];
        room.layout.furnishings.forEach((item, index) => {
          item.x = positions[index][0];
          item.z = positions[index][1];
          item.rotation = 0;
          const group = room.scene.getObjectByName(`${item.kind}-${index + 1}`)!;
          group.position.set(item.x, 0, item.z);
          group.rotation.y = 0;
        });
      }
      track(room);
      return room;
    },
    onStatus: state => { states.push(state as unknown as State); },
  }) as unknown as Controller;
  const install: Installer = (room, binding) => {
    track(room);
    if (!display.install(room, binding)) return false;
    installed = { room, binding };
    return true;
  };
  t.after(() => {
    controller.dispose();
    display.dispose();
    rooms.forEach(item => { if (!item.disposals) item.room.dispose(); });
  });
  return { controller, display, camera, draws, rooms, states, track, install,
    get installed() { assert.ok(installed); return installed; },
    rejectCandidateDraw() { rejectCandidateDraw = true; } };
}
function reconstruction(controller: Controller) {
  const value = controller.getState().reconstruction;
  assert.ok(value, 'a revealed composed room must expose original and current reconstruction layouts');
  return value;
}
function edit(controller: Controller, unit: symbol, revision: number, index: number, pose: Pose, install: Installer) {
  assert.equal(typeof controller.applyReconstructionEdit, 'function', 'the displayed case must accept bounded reconstruction edits');
  return controller.applyReconstructionEdit(unit, revision, index, pose, install);
}
async function reveal(app: ReturnType<typeof setup>) {
  assert.equal(await app.controller.compose('original visitor words', 41), true);
  assert.equal(app.controller.reveal(app.install), true);
  return reconstruction(app.controller).unit;
}
function discoverAndPropose(controller: Controller) {
  const state = controller.getState();
  assert.ok(state.inspection);
  assert.ok(state.investigation);
  assert.equal(controller.inspect(state.inspection.unit, 'object-1'), true);
  assert.equal(controller.proposeHypothesis(state.investigation.unit, 'candidate-3', ['clue-1']), true);
}
function pickObject(app: ReturnType<typeof setup>, objectId: string) {
  const target = app.installed.binding.bindings.get(objectId)!;
  app.camera.position.set(target.position.x, 2, target.position.z);
  app.camera.lookAt(target.position.x, 0, target.position.z);
  app.camera.updateMatrixWorld(true);
  return app.display.pick(200, 200, bounds);
}

test('successful Reveal exposes independent original and current reconstruction from the actual built layout', async t => {
  const app = setup(t, { seeded: true });
  assert.equal(await app.controller.compose('four teal chairs', 41), true);
  assert.equal(app.controller.reveal(app.install), true);
  const state = app.controller.getState();
  assert.ok(state.reconstruction, 'successful Reveal must expose original and current reconstruction layouts');
  assert.equal(state.reconstruction.unit, state.investigation!.unit);
  assert.equal(state.reconstruction.revision, 0);
  assert.deepEqual(state.reconstruction.original, app.installed.room.layout);
  assert.deepEqual(state.reconstruction.current, app.installed.room.layout);
  assert.notEqual(state.reconstruction.original, state.reconstruction.current);
  assert.notEqual(state.reconstruction.original.furnishings, state.reconstruction.current.furnishings);
  assert.notEqual(state.reconstruction.current, app.installed.room.layout);
  assert.equal('x' in state.displayed!.description.furnishings[0], false, 'positions remain local, not in RoomDescription');
});

test('authored fixture and pending composition cannot be edited before successful Reveal', async t => {
  const app = setup(t);
  assert.equal(app.controller.getState().reconstruction, null);
  assert.equal(edit(app.controller, Symbol('fixture'), 0, 1, moved, app.install), false);
  assert.equal(await app.controller.compose('pending room', 41), true);
  assert.equal(app.controller.getState().reconstruction, null);
  let installs = 0;
  assert.equal(edit(app.controller, Symbol('pending'), 0, 1, moved, () => { installs += 1; return true; }), false);
  assert.equal(installs, 0);
  assert.equal(app.controller.reveal(() => false), false);
  assert.equal(app.controller.getState().reconstruction, null);
});

test('accepted translation and rotation rebuild real bound geometry while preserving case truth and investigation snapshots', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  discoverAndPropose(app.controller);
  assert.equal(app.controller.inspect(app.controller.getState().inspection!.unit, 'object-2'), true);
  const before = app.controller.getState();
  const originalRoom = app.installed.room;
  const originalObject = app.installed.binding.bindings.get('object-1');
  const pose = { ...moved };
  assert.equal(edit(app.controller, unit, 0, 1, pose, app.install), true);
  pose.x = 999;
  const after = app.controller.getState();
  const next = app.installed.room;
  assert.notEqual(next, originalRoom);
  assert.notEqual(next.scene, originalRoom.scene);
  assert.equal(app.rooms.find(item => item.room === originalRoom)!.disposals, 1);
  assert.equal(app.rooms.find(item => item.room === next)!.disposals, 0);
  assert.equal(after.reconstruction!.unit, unit);
  assert.equal(after.investigation!.unit, unit);
  assert.notEqual(after.inspection!.unit, before.inspection!.unit, 'rebuild gets a fresh scene-binding token, not a replacement case');
  assert.equal(after.reconstruction!.revision, 1);
  assert.deepEqual(after.reconstruction!.original, before.reconstruction!.original);
  const expected = structuredClone(before.reconstruction!.current);
  Object.assign(expected.furnishings[1], moved);
  assert.deepEqual(after.reconstruction!.current, expected);
  assert.deepEqual(next.layout, expected);
  assert.deepEqual(after.displayed, before.displayed);
  assert.deepEqual(after.accepted, before.accepted);
  assert.deepEqual({ ...after.inspection, unit: before.inspection!.unit }, before.inspection);
  assert.deepEqual(after.investigation!.candidates, before.investigation!.candidates);
  assert.deepEqual(after.investigation!.hypothesis, before.investigation!.hypothesis);
  assert.deepEqual(after.investigation!.history.slice(0, -1), before.investigation!.history);
  assert.deepEqual(after.investigation!.history.at(-1), {
    kind: 'reconstruction-edit', origin: 'visitor', revision: 1, furnishingIndex: 1,
    before: { x: 2, z: -3, rotation: 0 }, after: moved,
  });
  const bound = app.installed.binding.bindings.get('object-1')!;
  assert.notEqual(bound, originalObject);
  assert.equal(bound, next.scene.getObjectByName('chair-2'));
  assert.deepEqual(bound.position.toArray(), [2.75, 0, -2.5]);
  assert.equal(bound.rotation.y, Math.PI / 2);
  assert.deepEqual([...app.installed.binding.bindings.keys()], ['object-1', 'object-2', 'object-3']);
  assert.equal(next.scene.getObjectByName('furnishings')!.children.length, 4);
  assert.equal(app.display.render(), true);
  assert.equal(app.draws.at(-1), next.scene);
});

test('reconstruction and edit-history snapshots cannot mutate the accepted original, current room or prior revision', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  assert.equal(edit(app.controller, unit, 0, 1, moved, app.install), true);
  const before = app.controller.getState();
  for (const state of [app.controller.getState(), app.states.at(-1)!]) {
    state.reconstruction!.original.furnishings[1].x = 99;
    state.reconstruction!.original.description.colors.wall = 'slate';
    state.reconstruction!.current.furnishings[1].z = 99;
    state.reconstruction!.current.description.furnishings[1].color = 'ochre';
    const entry = state.investigation!.history.at(-1)!;
    assert.equal(entry.kind, 'reconstruction-edit');
    if (entry.kind === 'reconstruction-edit') { entry.before.x = 99; entry.after.z = 99; }
  }
  assert.deepEqual(app.controller.getState(), before);
  assert.deepEqual(app.installed.room.layout, before.reconstruction!.current);
  assert.deepEqual(app.installed.binding.bindings.get('object-1')!.position.toArray(), [2.75, 0, -2.5]);
  assert.equal(edit(app.controller, unit, 1, 1, { x: 2, z: -2, rotation: 180 }, app.install), true);
  const after = app.controller.getState();
  assert.equal(after.reconstruction!.revision, 2);
  assert.deepEqual(after.reconstruction!.original, before.reconstruction!.original);
  assert.deepEqual(after.investigation!.history[0], before.investigation!.history[0]);
  assert.deepEqual(before.reconstruction!.current.furnishings[1], { kind: 'chair', color: 'teal', ...moved });
});

test('invalid indices, nonfinite poses and attempts to change anything beyond x z rotation are atomic no-ops', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  discoverAndPropose(app.controller);
  const before = app.controller.getState();
  const originalRoom = app.installed.room;
  const originalBinding = app.installed.binding;
  let installs = 0;
  const install: Installer = () => { installs += 1; return true; };
  for (const index of [-1, 4, 1.5, NaN, Infinity, '1']) {
    assert.equal(edit(app.controller, unit, 0, index as number, moved, install), false);
  }
  const invalid: unknown[] = [
    { ...moved, x: NaN }, { ...moved, x: Infinity }, { ...moved, z: -Infinity }, { ...moved, x: '2.75' },
    ...[-90, 45, 360, NaN].map(rotation => ({ ...moved, rotation })),
    null, [], { x: 2, z: -3 }, { ...moved, y: 1 },
    { ...moved, kind: 'pool' }, { ...moved, kind: 'sofa' }, { ...moved, color: 'slate' },
    { ...moved, pool: true }, { ...moved, lighting: 'blue' }, { ...moved, furnishings: [] },
    { ...moved, description: { width: 100 } }, { ...moved, seed: 0 },
  ];
  for (const pose of invalid) {
    assert.equal(edit(app.controller, unit, 0, 1, pose as Pose, install), false);
    assert.deepEqual(app.controller.getState(), before);
  }
  assert.equal(installs, 0);
  assert.equal(app.installed.room, originalRoom);
  assert.equal(app.installed.binding, originalBinding);
  assert.equal(app.rooms[0].disposals, 0);
});

test('room margins, front bound, expanded doorway aisle and every other furnishing clearance remain enforced', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  discoverAndPropose(app.controller);
  const before = app.controller.getState();
  let installs = 0;
  const invalid = [
    { x: 3.526, z: -3, rotation: 0 }, { x: -3.526, z: -3, rotation: 0 },
    { x: 2, z: -4.526, rotation: 0 }, { x: 2, z: 1.676, rotation: 0 },
    { x: 0, z: -3, rotation: 0 }, { x: 1.024, z: -3, rotation: 0 },
    { x: -2, z: -3, rotation: 0 }, { x: 2, z: 0, rotation: 0 },
    { x: 2, z: -0.79, rotation: 0 },
  ];
  for (const pose of invalid) {
    assert.equal(edit(app.controller, unit, 0, 1, pose, () => { installs += 1; return true; }), false, JSON.stringify(pose));
    assert.deepEqual(app.controller.getState(), before);
  }
  assert.equal(installs, 0);
  // Chair edges are 0.65 apart; z=-0.8 leaves exactly 0.15 to the later-index chair at z=0.
  assert.equal(edit(app.controller, unit, 0, 1, { x: 2, z: -0.8, rotation: 90 }, app.install), true);
  assert.equal(reconstruction(app.controller).current.furnishings[1].z, -0.8);
});

test('quarter-turn rotation validates the actual asymmetric furnishing footprint and rebuilds its geometry', async t => {
  const fixture = inspectionFixture();
  assert.equal(fixture.outcome, 'supported');
  if (fixture.outcome !== 'supported') return;
  fixture.description.furnishings[1].kind = 'table';
  const app = setup(t, { fixture });
  const unit = await reveal(app);
  const before = app.controller.getState();
  assert.equal(edit(app.controller, unit, 0, 1, { x: 3.2, z: -3, rotation: 0 }, app.install), false, 'unturned table extends beyond the right margin');
  assert.deepEqual(app.controller.getState(), before);
  assert.equal(edit(app.controller, unit, 0, 1, { x: 3.2, z: -3, rotation: 90 }, app.install), true);
  const table = app.installed.binding.bindings.get('object-1')!;
  const extent = new Box3().setFromObject(table);
  assert.ok(Math.abs(extent.max.x - extent.min.x - 0.9) < 1e-6);
  assert.ok(Math.abs(extent.max.z - extent.min.z - 1.6) < 1e-6);
  assert.equal(table, app.installed.room.scene.getObjectByName('table-2'));
  assert.equal(app.controller.getState().displayed!.description.furnishings[1].kind, 'table');
});

test('failed candidate drawing restores the old scene, binding and investigation and disposes only the rejected edit', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  discoverAndPropose(app.controller);
  const before = app.controller.getState();
  const original = app.installed;
  const pick = pickObject(app, 'object-1');
  assert.deepEqual(pick, { unit: before.inspection!.unit, objectId: 'object-1' });
  const drawCount = app.draws.length;
  app.rejectCandidateDraw();
  assert.equal(edit(app.controller, unit, 0, 1, moved, app.install), false);
  assert.deepEqual(app.controller.getState(), before);
  assert.equal(app.installed, original);
  assert.equal(app.rooms.length, 2);
  assert.equal(app.rooms[0].disposals, 0);
  assert.equal(app.rooms[1].disposals, 1);
  assert.deepEqual(app.draws.slice(drawCount), [app.rooms[1].room.scene, original.room.scene]);
  assert.equal(app.display.render(), true);
  assert.equal(app.draws.at(-1), original.room.scene);
  assert.deepEqual(app.display.pick(200, 200, bounds), pick);
});

test('false, throwing and disposed installers cannot commit edits or retain rejected resources', async t => {
  for (const failure of ['false', 'throw', 'disposed'] as const) {
    const app = setup(t);
    const unit = await reveal(app);
    discoverAndPropose(app.controller);
    const before = app.controller.getState();
    const original = app.installed;
    if (failure === 'disposed') app.display.dispose();
    let candidate: ReturnType<typeof app.track> | undefined;
    assert.equal(edit(app.controller, unit, 0, 1, moved, (room, binding) => {
      candidate = app.track(room);
      if (failure === 'throw') throw new Error('synthetic install failure');
      return failure === 'disposed' ? app.display.install(room, binding) : false;
    }), false);
    assert.ok(candidate);
    assert.equal(candidate.disposals, 1);
    assert.deepEqual(app.controller.getState(), before);
    assert.equal(app.installed, original);
    assert.equal(app.rooms[0].disposals, failure === 'disposed' ? 1 : 0);
    assert.equal(app.display.render(), failure !== 'disposed', 'a disposed renderer must not be resurrected');
  }
});

test('edit installation exposes old settled state and blocks reentrant actions until one atomic commit', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  discoverAndPropose(app.controller);
  const before = app.controller.getState();
  const notifications = app.states.length;
  let nestedInstalls = 0;
  assert.equal(edit(app.controller, unit, 0, 1, moved, (room, binding) => {
    assert.deepEqual(app.controller.getState(), before);
    assert.equal(edit(app.controller, unit, 0, 0, { x: -2, z: -2, rotation: 90 }, () => { nestedInstalls += 1; return true; }), false);
    assert.equal(app.controller.inspect(before.inspection!.unit, 'object-2'), false);
    assert.equal(app.controller.inspect(binding.unit, 'object-2'), false);
    assert.equal(app.controller.proposeHypothesis(unit, 'candidate-1', ['clue-1']), false);
    assert.equal(app.controller.stop(), false);
    assert.equal(app.controller.reveal(() => true), false);
    return app.install(room, binding);
  }), true);
  assert.equal(nestedInstalls, 0);
  assert.equal(app.states.length, notifications + 1);
  const committed = app.states.at(-1)!;
  assert.equal(committed.reconstruction!.revision, 1);
  assert.equal(committed.investigation!.unit, unit);
  assert.equal(committed.investigation!.history.length, before.investigation!.history.length + 1);
  assert.equal(committed.inspection!.unit, app.installed.binding.unit);
});

test('fresh rebuilt picks retain clue attachments while stale bindings, revisions and foreign cases cannot act', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const oldPick = pickObject(app, 'object-1');
  assert.ok(oldPick);
  assert.equal(app.controller.inspect(oldPick.unit, oldPick.objectId), true);
  assert.equal(app.controller.proposeHypothesis(unit, 'candidate-3', ['clue-1']), true);
  assert.equal(edit(app.controller, unit, 0, 1, moved, app.install), true);
  const before = app.controller.getState();
  assert.equal(app.controller.inspect(oldPick.unit, 'object-2'), false);
  assert.equal(edit(app.controller, unit, 0, 1, { x: 2, z: -2, rotation: 180 }, app.install), false);
  assert.equal(edit(app.controller, Symbol('foreign case'), 1, 1, moved, app.install), false);
  assert.deepEqual(app.controller.getState(), before);
  const freshPick = pickObject(app, 'object-1');
  assert.deepEqual(freshPick, { unit: before.inspection!.unit, objectId: 'object-1' });
  assert.notEqual(freshPick!.unit, oldPick.unit);
  assert.equal(app.controller.inspect(freshPick!.unit, freshPick!.objectId), true);
  const secondPick = pickObject(app, 'object-2');
  assert.deepEqual(secondPick, { unit: before.inspection!.unit, objectId: 'object-2' });
  assert.equal(app.controller.inspect(secondPick!.unit, secondPick!.objectId), true);
  assert.deepEqual(app.controller.getState().inspection!.discoveredClues.map(clue => [clue.id, clue.objectId]), [
    ['clue-1', 'object-1'], ['clue-3', 'object-1'], ['clue-2', 'object-2'], ['clue-4', 'object-2'],
  ]);
  assert.equal(app.controller.proposeHypothesis(unit, 'candidate-3', ['clue-1']), true, 'hypotheses use stable case identity, not a stale scene binding');
  assert.equal(app.controller.getState().investigation!.hypothesis!.assessment.status, 'contradicted');
  app.controller.dispose();
  const disposed = app.controller.getState();
  assert.equal(edit(app.controller, unit, 1, 1, { x: 2, z: -2, rotation: 180 }, app.install), false);
  assert.deepEqual(app.controller.getState(), disposed);
});

test('pending, cancelled and failed replacement attempts retain accepted edits, original layout and investigation', async t => {
  for (const failure of ['cancel', 'invalid', 'false', 'throw'] as const) {
    let requests = 0;
    const app = setup(t, { fetch: async () => json(++requests === 2 && failure === 'invalid'
      ? { ...inspectionFixture(), extra: true } : inspectionFixture()) });
    const unit = await reveal(app);
    discoverAndPropose(app.controller);
    assert.equal(edit(app.controller, unit, 0, 1, moved, app.install), true);
    const before = app.controller.getState();
    const displayed = app.installed;
    assert.equal(await app.controller.compose('replacement contribution', 41), failure !== 'invalid');
    assert.deepEqual(app.controller.getState().reconstruction, before.reconstruction);
    if (failure === 'cancel') assert.equal(app.controller.stop(), true);
    if (failure === 'false' || failure === 'throw') assert.equal(app.controller.reveal(() => {
      if (failure === 'throw') throw new Error('synthetic replacement install failure');
      return false;
    }), false);
    assert.deepEqual(app.controller.getState().reconstruction, before.reconstruction);
    assert.deepEqual(app.controller.getState().investigation, before.investigation);
    assert.deepEqual(app.controller.getState().inspection, before.inspection);
    assert.deepEqual(app.controller.getState().displayed, before.displayed);
    assert.equal(app.installed, displayed);
    assert.equal(app.display.render(), true);
    assert.equal(app.draws.at(-1), displayed.room.scene);
  }
});

test('an edit during pending interpretation survives cancellation and a late replacement response', async t => {
  const pending = deferred<Response>();
  let requests = 0;
  const app = setup(t, { fetch: () => ++requests === 2 ? pending.promise : Promise.resolve(json(inspectionFixture())) });
  const unit = await reveal(app);
  discoverAndPropose(app.controller);
  const composing = app.controller.compose('pending replacement', 41);
  assert.equal(app.controller.getState().status, 'interpreting');
  assert.equal(edit(app.controller, unit, 0, 1, moved, app.install), true);
  const before = app.controller.getState();
  assert.equal(app.controller.stop(), true);
  assert.equal(await composing, false);
  pending.resolve(json(inspectionFixture()));
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  assert.deepEqual(app.controller.getState().reconstruction, before.reconstruction);
  assert.deepEqual(app.controller.getState().investigation, before.investigation);
  assert.deepEqual(app.controller.getState().inspection, before.inspection);
  assert.deepEqual(app.controller.getState().displayed, before.displayed);
  assert.deepEqual(app.installed.room.layout, before.reconstruction!.current);
});

test('same-seed and same-ID replacement resets edits and case history atomically and rejects the prior case', async t => {
  const app = setup(t);
  const oldUnit = await reveal(app);
  discoverAndPropose(app.controller);
  assert.equal(edit(app.controller, oldUnit, 0, 1, moved, app.install), true);
  const before = app.controller.getState();
  assert.equal(await app.controller.compose('original visitor words', 41), true);
  const notifications = app.states.length;
  assert.equal(app.controller.reveal((room, binding) => {
    assert.deepEqual(app.controller.getState().reconstruction, before.reconstruction);
    assert.deepEqual(app.controller.getState().investigation, before.investigation);
    return app.install(room, binding);
  }), true);
  const after = app.controller.getState();
  assert.deepEqual(after.displayed, before.displayed, 'payload identity cannot stand in for installation identity');
  assert.notEqual(after.reconstruction!.unit, oldUnit);
  assert.equal(after.reconstruction!.unit, after.investigation!.unit);
  assert.equal(after.reconstruction!.revision, 0);
  assert.deepEqual(after.reconstruction!.original, app.installed.room.layout);
  assert.deepEqual(after.reconstruction!.current, after.reconstruction!.original);
  assert.deepEqual(after.reconstruction!.current.furnishings[1], { kind: 'chair', color: 'teal', x: 2, z: -3, rotation: 0 });
  assert.equal(after.investigation!.hypothesis, null);
  assert.deepEqual(after.investigation!.history, []);
  assert.deepEqual(after.inspection!.discoveredClues, []);
  assert.equal(after.inspection!.selectedObjectId, null);
  assert.equal(app.states.length, notifications + 1);
  assert.deepEqual(app.states.at(-1), after);
  assert.equal(edit(app.controller, oldUnit, 1, 1, moved, app.install), false);
  assert.equal(app.controller.proposeHypothesis(oldUnit, 'candidate-1', []), false);
  assert.equal(app.controller.inspect(before.inspection!.unit, 'object-1'), false);
  assert.deepEqual(app.controller.getState(), after);
});
