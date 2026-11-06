import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { Color, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, type Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { stageRoomPropVisual } from '../src/room/room-prop-visual.ts';
import { createRoomCompositionController } from '../src/room/room-composition.ts';
import { createProceduralRoom, type FurnishingEnvelope } from '../src/room/procedural-room.ts';
import { createRoomDisplay } from '../src/room/room-display.ts';
import { ROOM_COLORS, type RoomColor } from '../src/room/room-description.ts';
import type { RoomPropRequest } from '../src/room/room-prop-request.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';
import { chairFixture } from './fixtures/prop-glb.ts';

// Proposed 8C mesh-only colour contract. Authored local GLBs only; no provider, GPU or pixel evidence.
// Case colour authority is the controller-created request, never provider bytes or caller-supplied colour.
type Visual = { root: Group; clone(): Visual; dispose(): void };
type Stage = (bytes: ArrayBuffer, envelope: FurnishingEnvelope, signal: AbortSignal, onCleanupError?: () => void, caseColor?: RoomColor) => Promise<Visual>;
const stage = stageRoomPropVisual as unknown as Stage;
const envelope: FurnishingEnvelope = { x: 2, z: -3, rotation: 90, width: 0.65, depth: 0.65, height: 1.1 };
const signal = () => new AbortController().signal;
// Literal baseColorFactor values from tests/fixtures/prop-glb.ts untextured chair, in primitive order.
const authored = [[0.31, 0.4, 0.38], [0.32, 0.26, 0.23]] as const;
function meshes(root: Group) {
  const found: Mesh[] = [];
  root.traverse(object => { if (object instanceof Mesh) found.push(object); });
  return found;
}
function expected(color?: RoomColor) {
  return authored.map(rgb => {
    const value = new Color().setRGB(...rgb);
    return color ? value.multiply(new Color(ROOM_COLORS[color])) : value;
  });
}
function assertColours(root: Group, colours: Color[], label: string) {
  const found = meshes(root);
  assert.equal(found.length, colours.length, label);
  found.forEach((mesh, index) => {
    assert.ok(mesh.material instanceof MeshStandardMaterial, label);
    assert.equal(mesh.material.map, null, label);
    for (const channel of ['r', 'g', 'b'] as const) {
      assert.ok(Math.abs(mesh.material.color[channel] - colours[index][channel]) < 1e-6,
        `${label}: mesh ${index} ${channel} ${mesh.material.color[channel]} != ${colours[index][channel]}`);
    }
  });
}

test('8C RED: a mesh-only visual staged with a case colour multiplies every final material by that local colour', async t => {
  const visual = await stage(chairFixture({ textured: false }).bytes, envelope, signal(), undefined, 'teal');
  t.after(visual.dispose);
  assertColours(visual.root, expected('teal'), 'case colour applied');
  assert.notEqual(meshes(visual.root)[0].material, meshes(visual.root)[1].material, 'authored shading ratios stay distinct');
});

test('without a case colour the existing 8E authored colours are unchanged', async t => {
  const visual = await stage(chairFixture({ textured: false }).bytes, envelope, signal());
  t.after(visual.dispose);
  assertColours(visual.root, expected(), 'default path');
});

test('the case tint is applied once per staging, shared by graph leases and never compounded by clones', async t => {
  const first = await stage(chairFixture({ textured: false }).bytes, envelope, signal(), undefined, 'ochre');
  const copy = first.clone();
  const second = await stage(chairFixture({ textured: false }).bytes, envelope, signal(), undefined, 'ochre');
  t.after(() => { first.dispose(); copy.dispose(); second.dispose(); });
  for (const [label, visual] of [['first', first], ['clone', copy], ['second staging', second]] as const) {
    assertColours(visual.root, expected('ochre'), label);
  }
  meshes(first.root).forEach((mesh, index) => assert.equal(mesh.material, meshes(copy.root)[index].material));
});

test('a case colour is rejected for textured GLBs and unknown colour names before the loader runs', async t => {
  const parse = t.mock.method(GLTFLoader.prototype, 'parse');
  await assert.rejects(stage(chairFixture().bytes, envelope, signal(), undefined, 'teal'), 'mesh-only contract: no textures with a case colour');
  for (const color of ['unknown', '#4f6661', '', 'constructor', '__proto__', 'toString', 0x4f6661, {}, ['teal']]) {
    await assert.rejects(stage(chairFixture({ textured: false }).bytes, envelope, signal(), undefined, color as RoomColor), String(color));
  }
  assert.equal(parse.mock.callCount(), 0);
  parse.mock.restore();
  const next = await stage(chairFixture({ textured: false }).bytes, envelope, signal(), undefined, 'slate');
  next.dispose();
});

type Installer = (request: RoomPropRequest, visual: Visual, isCurrent: () => boolean) => boolean;
type Controller = Omit<ReturnType<typeof createRoomCompositionController>, 'installProp'> & {
  installProp(request: RoomPropRequest, bytes: ArrayBuffer, install: Installer, options?: unknown): Promise<boolean>;
};
async function revealed(t: TestContext) {
  const fixture = inspectionFixture();
  assert.ok(fixture.description);
  fixture.description.furnishings[1].color = 'ochre';
  const poses = [{ x: -2, z: -3, rotation: 0 }, { x: 2, z: -3, rotation: 0 }, { x: -2, z: 0, rotation: 0 }, { x: 2, z: 0, rotation: 0 }] as const;
  const rooms: ReturnType<typeof createProceduralRoom>[] = [];
  const display = createRoomDisplay({ initial: { scene: new Scene(), dispose() {} }, camera: new PerspectiveCamera(60, 1, 0.1, 20), draw() {} });
  let wrappers: Map<string, Group> | null = null;
  const controller = createRoomCompositionController({
    fetch: async () => new Response(JSON.stringify(fixture), { headers: { 'content-type': 'application/json' } }),
    yieldToBuild: () => Promise.resolve(),
    build: (description, seed) => { const room = createProceduralRoom(description, seed, poses); rooms.push(room); return room; },
  }) as unknown as Controller;
  t.after(() => { controller.dispose(); display.dispose(); });
  assert.equal(await controller.compose('Authored local case with an ochre chair, not live generation.', 41), true);
  assert.equal(controller.reveal((room, binding, identity) => {
    if (!display.install(room, binding, identity)) return false;
    wrappers = binding.bindings as Map<string, Group>;
    return true;
  }), true);
  const { unit, revision } = controller.getState().reconstruction!;
  const prepare = () => {
    const request = controller.preparePropRequest(unit, revision, { objectId: 'object-1', description: 'An authored mesh-only chair; no generation.' });
    assert.ok(request);
    return request;
  };
  const install: Installer = (request, visual, isCurrent) => display.installProp(request, visual, isCurrent);
  return { controller, prepare, install, wrapper: () => wrappers!.get('object-1')! };
}

test('controller mesh-only installation derives the case colour only from the exact request visual', async t => {
  const app = await revealed(t);
  const request = app.prepare();
  assert.equal(request.visual.color, 'ochre');
  assert.equal(await app.controller.installProp(request, chairFixture({ textured: false }).bytes, app.install, { caseColor: true }), true);
  assertColours(app.wrapper().children[0] as Group, expected('ochre'), 'installed mesh-only visual');
  assert.equal(app.controller.getState().props.phase, 'installed');
});

test('caller-supplied colours or unknown installation options are refused before staging and keep the capability', async t => {
  const app = await revealed(t);
  const request = app.prepare();
  const original = app.wrapper().children[0];
  const parse = t.mock.method(GLTFLoader.prototype, 'parse');
  for (const options of [{ caseColor: 'teal' }, { caseColor: true, color: 'teal' }, { color: 'teal' }, { caseColor: 1 }, {}, null, 'teal']) {
    assert.equal(await app.controller.installProp(request, chairFixture({ textured: false }).bytes, app.install, options), false, JSON.stringify(options));
    assert.equal(app.wrapper().children[0], original);
    assert.equal(app.controller.isPropRequestCurrent(request), true);
  }
  assert.equal(parse.mock.callCount(), 0);
  parse.mock.restore();
  assert.equal(await app.controller.installProp(request, chairFixture({ textured: false }).bytes, app.install), true);
  assertColours(app.wrapper().children[0] as Group, expected(), 'default controller installation keeps authored colours');
});
