import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, BoxGeometry, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three';
import {
  CENTER_VIEWPOINT,
  VIEWPOINT_LIMITS,
  clampViewpoint,
  createSpatialFixture,
  setFixtureViewpoint,
} from '../src/room/spatial-fixture.ts';

function structure(object: Object3D): unknown {
  return {
    name: object.name,
    type: object.type,
    position: object.position.toArray(),
    rotation: object.rotation.toArray(),
    scale: object.scale.toArray(),
    geometry: object instanceof Mesh ? object.geometry.parameters : undefined,
    color: object instanceof Mesh ? object.material.color.getHex() : undefined,
    children: object.children.map(structure),
  };
}

test('fresh fixtures have identical primitive contents and exactly a table and chair', t => {
  const first = createSpatialFixture();
  const second = createSpatialFixture();
  t.after(() => { first.dispose(); second.dispose(); });
  assert.deepEqual(structure(first.scene), structure(second.scene));
  assert.notEqual(first.scene, second.scene);
  const furnishings = first.scene.getObjectByName('furnishings');
  assert.ok(furnishings);
  assert.deepEqual(furnishings.children.map(child => child.name), ['table', 'chair']);
  assert.equal(furnishings.children[0].children.length, 5);
  assert.equal(furnishings.children[1].children.length, 6);
  first.scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    assert.ok(object.geometry instanceof BoxGeometry);
    assert.ok(object.material instanceof MeshStandardMaterial);
  });
  for (const name of ['floor', 'ceiling', 'left-wall', 'right-wall', 'front-wall', 'doorway-wall']) {
    assert.ok(first.scene.getObjectByName(name), name);
  }
});

test('the rear wall has a floor-level doorway opening below a lintel', t => {
  const fixture = createSpatialFixture();
  t.after(fixture.dispose);
  const wall = fixture.scene.getObjectByName('doorway-wall');
  assert.ok(wall);
  assert.deepEqual(wall.children.map(child => child.name), ['rear-left', 'rear-right', 'doorway-lintel']);
  const [left, right, lintel] = wall.children.map(child => new Box3().setFromObject(child));
  assert.ok(Math.abs(left.max.x - 0.9) < 0.00001);
  assert.ok(Math.abs(right.min.x - 2) < 0.00001);
  assert.ok(Math.abs(lintel.min.y - 2.35) < 0.00001);
  for (const height of [0.01, 1, 2.3]) {
    const insideDoor = new Vector3(1.45, height, -3.08);
    for (const bounds of [left, right, lintel]) assert.equal(bounds.containsPoint(insideDoor), false);
  }
  assert.equal(lintel.containsPoint(new Vector3(1.45, 2.8, -3.08)), true);
});

test('viewpoints clamp both axes and replace non-finite input with the center', () => {
  assert.deepEqual(clampViewpoint(CENTER_VIEWPOINT), { x: 0, y: 0 });
  const input = { x: 0.2, y: -0.1 };
  assert.deepEqual(clampViewpoint(input), input);
  assert.deepEqual(input, { x: 0.2, y: -0.1 });
  assert.deepEqual(clampViewpoint({ x: 100, y: -100 }), { x: VIEWPOINT_LIMITS.x, y: -VIEWPOINT_LIMITS.y });
  assert.deepEqual(clampViewpoint({ x: -100, y: 100 }), { x: -VIEWPOINT_LIMITS.x, y: VIEWPOINT_LIMITS.y });
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.deepEqual(clampViewpoint({ x: invalid, y: invalid }), CENTER_VIEWPOINT);
  }
});

test('repeated camera movement stays bounded, preserves the room, and can return to center', t => {
  const fixture = createSpatialFixture();
  t.after(fixture.dispose);
  const before = structure(fixture.scene);
  const table = fixture.scene.getObjectByName('table');
  const centeredPosition = fixture.camera.position.clone();
  const centeredRotation = fixture.camera.quaternion.clone();
  let viewpoint = { ...CENTER_VIEWPOINT };
  for (const direction of [1, -1]) {
    for (let step = 0; step < 100; step += 1) {
      viewpoint = setFixtureViewpoint(fixture.camera, { x: viewpoint.x + direction, y: viewpoint.y + direction });
      assert.ok(Math.abs(viewpoint.x) <= VIEWPOINT_LIMITS.x);
      assert.ok(Math.abs(viewpoint.y) <= VIEWPOINT_LIMITS.y);
      assert.equal(fixture.camera.position.x, viewpoint.x);
      assert.equal(fixture.camera.position.y, 1.7 + viewpoint.y);
      assert.equal(fixture.camera.position.z, centeredPosition.z);
      assert.ok(fixture.camera.quaternion.toArray().every(Number.isFinite));
    }
    assert.deepEqual(viewpoint, { x: direction * VIEWPOINT_LIMITS.x, y: direction * VIEWPOINT_LIMITS.y });
  }
  assert.deepEqual(setFixtureViewpoint(fixture.camera, CENTER_VIEWPOINT), CENTER_VIEWPOINT);
  assert.ok(fixture.camera.position.equals(centeredPosition));
  assert.ok(fixture.camera.quaternion.equals(centeredRotation));
  assert.deepEqual(structure(fixture.scene), before);
  assert.equal(fixture.scene.getObjectByName('table'), table);
});

test('disposal releases every geometry and shared material once and does not affect another fixture', t => {
  const fixture = createSpatialFixture();
  const other = createSpatialFixture();
  t.after(() => { fixture.dispose(); other.dispose(); });
  const geometries = new Set<BoxGeometry>();
  const materials = new Set<MeshStandardMaterial>();
  fixture.scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    materials.add(object.material);
  });
  assert.ok(geometries.size > materials.size);
  const calls = [...geometries, ...materials].map(resource => t.mock.method(resource, 'dispose'));
  const otherFloor = other.scene.getObjectByName('floor');
  assert.ok(otherFloor instanceof Mesh);
  const otherDispose = t.mock.method(otherFloor.geometry, 'dispose');
  fixture.dispose();
  fixture.dispose();
  for (const call of calls) assert.equal(call.mock.callCount(), 1);
  assert.equal(otherDispose.mock.callCount(), 0);
});
