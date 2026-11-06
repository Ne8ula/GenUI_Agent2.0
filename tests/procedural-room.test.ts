import test from 'node:test';
import assert from 'node:assert/strict';
import { Ajv } from 'ajv';
import {
  Box3, BoxGeometry, Camera, Color, Group, Light, Mesh, MeshStandardMaterial,
  Vector3, type Object3D,
} from 'three';
import {
  ROOM_DESCRIPTION_SCHEMA, validateRoomDescription, type RoomDescription,
} from '../src/room/room-description.ts';
import { createProceduralRoom, layoutProceduralRoom } from '../src/room/procedural-room.ts';
import { bindRoomCaseObjects } from '../src/room/room-case.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';

// Authored test data, not an interpretation result.
function descriptionFixture(overrides: Partial<RoomDescription> = {}): RoomDescription {
  return {
    version: 1, width: 8, depth: 8, height: 3.4,
    doorway: { placement: 'center', width: 1.2, height: 2.3 },
    colors: { wall: 'cream', floor: 'walnut' },
    furnishings: [
      { kind: 'table', color: 'walnut' }, { kind: 'chair', color: 'teal' },
      { kind: 'sofa', color: 'ochre' }, { kind: 'shelf', color: 'slate' },
    ],
    ...overrides,
  };
}

const dimensions = {
  table: [1.6, 0.9, 0.9], chair: [0.65, 0.65, 1.1],
  sofa: [1.9, 0.85, 0.95], shelf: [1.2, 0.4, 1.8],
} as const;
const epsilon = 0.00001;

function structure(object: Object3D): unknown {
  return {
    name: object.name, type: object.type,
    position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray(),
    geometry: object instanceof Mesh ? object.geometry.parameters : undefined,
    material: object instanceof Mesh ? {
      color: object.material.color.getHex(), roughness: object.material.roughness,
      metalness: object.material.metalness, side: object.material.side,
    } : undefined,
    light: object instanceof Light ? [object.color.getHex(), object.intensity] : undefined,
    children: object.children.map(structure),
  };
}

function assertSafe(layout: ReturnType<typeof layoutProceduralRoom>) {
  const { description: room, furnishings, doorwayX } = layout;
  assert.equal(furnishings.length, room.furnishings.length);
  const expectedDoorX = { left: -room.width / 2 + room.doorway.width / 2 + 0.3,
    center: 0, right: room.width / 2 - room.doorway.width / 2 - 0.3 }[room.doorway.placement];
  assert.ok(Math.abs(doorwayX - expectedDoorX) < epsilon);
  const bounds = furnishings.map((item, index) => {
    assert.equal(item.kind, room.furnishings[index].kind);
    assert.equal(item.color, room.furnishings[index].color);
    assert.ok([0, 90, 180, 270].includes(item.rotation));
    assert.ok(Number.isFinite(item.x) && Number.isFinite(item.z));
    const [width, depth, height] = dimensions[item.kind];
    const rotated = item.rotation === 90 || item.rotation === 270;
    const halfX = (rotated ? depth : width) / 2;
    const halfZ = (rotated ? width : depth) / 2;
    const box = { minX: item.x - halfX, maxX: item.x + halfX, minZ: item.z - halfZ, maxZ: item.z + halfZ };
    assert.ok(box.minX >= -room.width / 2 + 0.15 - epsilon);
    assert.ok(box.maxX <= room.width / 2 - 0.15 + epsilon);
    assert.ok(box.minZ >= 3 - room.depth + 0.15 - epsilon);
    assert.ok(box.maxZ <= 2 + epsilon);
    assert.ok(height <= room.height);
    assert.ok(box.maxX <= doorwayX - (room.doorway.width + 0.2) / 2 + epsilon
      || box.minX >= doorwayX + (room.doorway.width + 0.2) / 2 - epsilon);
    return box;
  });
  for (let a = 0; a < bounds.length; a += 1) {
    for (let b = a + 1; b < bounds.length; b += 1) {
      const first = bounds[a];
      const second = bounds[b];
      assert.ok(first.maxX + 0.15 <= second.minX + epsilon || second.maxX + 0.15 <= first.minX + epsilon
        || first.maxZ + 0.15 <= second.minZ + epsilon || second.maxZ + 0.15 <= first.minZ + epsilon);
    }
  }
}

test('8E RED: a furnishing exposes one replaceable visual subtree without replacing its logical wrapper', () => {
  const fixture = inspectionFixture();
  assert.equal(fixture.outcome, 'supported');
  if (fixture.outcome !== 'supported') throw new Error('Expected authored case fixture.');
  const room = createProceduralRoom(fixture.description, 41);
  try {
    const bindings = bindRoomCaseObjects(fixture.case, fixture.description, room);
    const wrapper = bindings.get('object-1')!;
    const pose = room.layout.furnishings[1];
    assert.equal(wrapper, room.scene.getObjectByName('chair-2'));
    assert.deepEqual(wrapper.position.toArray(), [pose.x, 0, pose.z]);
    assert.equal(wrapper.rotation.y, pose.rotation * Math.PI / 180);
    assert.equal(wrapper.children.length, 1, 'a visual can be replaced without replacing the case-bound wrapper');
    const visual = wrapper.children[0];
    assert.ok(visual instanceof Group);
    assert.equal(visual.name, 'chair-2-visual');
    assert.equal(visual.parent, wrapper);
    assert.deepEqual(visual.position.toArray(), [0, 0, 0]);
    assert.deepEqual(visual.scale.toArray(), [1, 1, 1]);
    assert.ok(visual.children.length >= 6, 'chair seat, back and four legs remain actual primitives');
    assert.ok(visual.children.every(child => child instanceof Mesh && child.geometry instanceof BoxGeometry && child.material instanceof MeshStandardMaterial));
    assert.equal(bindRoomCaseObjects(fixture.case, fixture.description, room).get('object-1'), wrapper);
  } finally { room.dispose(); }
});

test('the exported schema accepts both finite boundaries without defaults or coercion', () => {
  const schemaValidate = new Ajv({ strict: true }).compile(ROOM_DESCRIPTION_SCHEMA);
  for (const maximum of [false, true]) {
    const input = descriptionFixture({
      width: maximum ? 8 : 4, depth: maximum ? 8 : 5, height: maximum ? 4 : 2.8,
      doorway: { placement: maximum ? 'right' : 'left', width: maximum ? 1.4 : 1, height: maximum ? 2.5 : 2 },
      furnishings: maximum ? Array.from({ length: 8 }, () => ({ kind: 'chair', color: 'warm-gray' })) : [],
    });
    assert.equal(schemaValidate(input), true);
    assert.deepEqual(validateRoomDescription(input), input);
  }
  for (const color of ['cream', 'warm-gray', 'slate', 'teal', 'ochre', 'walnut'] as const) {
    const input = descriptionFixture({ colors: { wall: color, floor: color }, furnishings: [{ kind: 'table', color }] });
    assert.equal(schemaValidate(input), true);
    assert.deepEqual(validateRoomDescription(input), input);
  }
});

test('all numeric fields reject wrong types, nonfinite values and either out-of-range edge', () => {
  const ranges = [
    ['width', 4, 8], ['depth', 5, 8], ['height', 2.8, 4],
    ['doorway.width', 1, 1.4], ['doorway.height', 2, 2.5],
  ] as const;
  const schemaValidate = new Ajv({ strict: true }).compile(ROOM_DESCRIPTION_SCHEMA);
  for (const [path, minimum, maximum] of ranges) {
    for (const value of [minimum - 0.00001, maximum + 0.00001, NaN, Infinity, -Infinity, '5', null, true, {}, []]) {
      const input = descriptionFixture();
      const [parent, key] = path.split('.');
      if (key) (input.doorway as unknown as Record<string, unknown>)[key] = value;
      else (input as unknown as Record<string, unknown>)[parent] = value;
      const before = structuredClone(input);
      assert.equal(schemaValidate(input), false, `${path}=${String(value)}`);
      assert.throws(() => validateRoomDescription(input), /room description/i);
      assert.deepEqual(input, before);
    }
  }
});

test('every field is required and unknown properties are rejected at every record level', () => {
  for (const location of ['root', 'doorway', 'colors', 'furnishing'] as const) {
    const target = (input: RoomDescription) => (location === 'root' ? input
      : location === 'furnishing' ? input.furnishings[0] : input[location]) as unknown as Record<string, unknown>;
    for (const key of Object.keys(target(descriptionFixture()))) {
      const input = descriptionFixture();
      delete target(input)[key];
      assert.throws(() => validateRoomDescription(input), /room description/i, `${location}.${key}`);
    }
    for (const key of ['name', 'text', 'code', 'url', 'asset', 'position', 'permissions', '__proto__']) {
      const input = descriptionFixture();
      Object.defineProperty(target(input), key, { value: 'https://invalid.example/model.glb', enumerable: true });
      assert.throws(() => validateRoomDescription(input), /room description/i, `${location}.${key}`);
    }
  }
});

test('unsupported values, non-JSON objects, accessors and malformed lists fail closed', () => {
  for (const invalid of [null, [], false, 1, 'room', undefined, new Date(), Object.create(descriptionFixture())]) {
    assert.throws(() => validateRoomDescription(invalid), /room description/i);
  }
  for (const version of [0, 2, '1', true, null, NaN]) {
    assert.throws(() => validateRoomDescription({ ...descriptionFixture(), version }), /room description/i);
  }
  for (const value of [null, [], 'walnut', 4]) {
    assert.throws(() => validateRoomDescription({ ...descriptionFixture(), doorway: value }), /room description/i);
    assert.throws(() => validateRoomDescription({ ...descriptionFixture(), colors: value }), /room description/i);
  }
  for (const value of ['outside', 'https://invalid.example', '() => execute()', '#ffffff', {}, null, 4]) {
    const input = descriptionFixture();
    assert.throws(() => validateRoomDescription({ ...input, doorway: { ...input.doorway, placement: value } }), /room description/i);
    for (const field of ['wall', 'floor']) {
      assert.throws(() => validateRoomDescription({ ...input, colors: { ...input.colors, [field]: value } }), /room description/i);
    }
    for (const field of ['kind', 'color']) {
      assert.throws(() => validateRoomDescription({ ...input, furnishings: [{ ...input.furnishings[0], [field]: value }] }), /room description/i);
    }
  }
  for (const furnishings of [null, {}, 'table', [null], [[]], new Array(2), Array.from({ length: 9 }, () => ({ kind: 'chair', color: 'teal' }))]) {
    assert.throws(() => validateRoomDescription({ ...descriptionFixture(), furnishings }), /room description/i);
  }
  const accessor = descriptionFixture();
  let reads = 0;
  Object.defineProperty(accessor.doorway, 'width', { get() { reads += 1; return 1.2; }, enumerable: true });
  assert.throws(() => validateRoomDescription(accessor), /room description/i);
  assert.equal(reads, 0);
  for (const enumerable of [true, false]) {
    const input = descriptionFixture();
    Object.defineProperty(input, Symbol('hidden'), { value: 1, enumerable });
    assert.throws(() => validateRoomDescription(input), /room description/i);
  }
  const list = descriptionFixture();
  Object.defineProperty(list.furnishings, 'asset', { value: 'hidden' });
  assert.throws(() => validateRoomDescription(list), /room description/i);
  const cyclic = descriptionFixture();
  (cyclic as unknown as Record<string, unknown>).doorway = cyclic;
  assert.throws(() => validateRoomDescription(cyclic), /room description/i);
});

test('validated snapshots are independent and invalid seeds are never normalized', () => {
  const input = descriptionFixture();
  const accepted = validateRoomDescription(input);
  const layout = layoutProceduralRoom(input, 0);
  input.doorway.width = 1.4;
  input.colors.wall = 'slate';
  input.furnishings[0].color = 'cream';
  input.furnishings.push({ kind: 'chair', color: 'teal' });
  assert.deepEqual(accepted, descriptionFixture());
  assert.deepEqual(layout.description, descriptionFixture());
  accepted.colors.floor = 'teal';
  assert.equal(input.colors.floor, 'walnut');
  for (const seed of [-1, 4294967296, 0.5, NaN, Infinity, -Infinity, '42', null, undefined]) {
    assert.throws(() => layoutProceduralRoom(descriptionFixture(), seed as number), /seed/i);
  }
  for (const seed of [0, 4294967295]) assertSafe(layoutProceduralRoom(descriptionFixture(), seed));
});

test('layout depends only on accepted data and seed, not wall time or global randomness', t => {
  t.mock.method(Math, 'random', () => { throw new Error('global randomness'); });
  t.mock.method(Date, 'now', () => { throw new Error('wall clock'); });
  const input = descriptionFixture();
  const before = structuredClone(input);
  assert.deepEqual(layoutProceduralRoom(input, 173), layoutProceduralRoom(input, 173));
  assert.deepEqual(input, before);
  const layouts = Array.from({ length: 12 }, (_, seed) => JSON.stringify(layoutProceduralRoom(input, seed).furnishings));
  assert.ok(new Set(layouts).size > 1);
});

test('fresh scenes reproduce geometry, materials and lights without sharing resources or creating cameras', t => {
  const input = descriptionFixture();
  const first = createProceduralRoom(input, 481);
  const second = createProceduralRoom(input, 481);
  t.after(() => { first.dispose(); second.dispose(); });
  assert.deepEqual(structure(first.scene), structure(second.scene));
  assert.deepEqual(first.layout, second.layout);
  assert.notEqual(first.scene, second.scene);
  assert.ok(first.scene.background instanceof Color);
  let lights = 0;
  const names = new Set<string>();
  first.scene.traverse(object => {
    assert.equal(object instanceof Camera, false);
    if (object instanceof Light) lights += 1;
    assert.ok(object.name && !names.has(object.name), object.name);
    names.add(object.name);
    if (!(object instanceof Mesh)) return;
    assert.ok(object.geometry instanceof BoxGeometry);
    assert.ok(object.material instanceof MeshStandardMaterial);
    assert.equal(object.material.map, null);
    const other = second.scene.getObjectByName(object.name);
    assert.ok(other instanceof Mesh);
    assert.notEqual(object.geometry, other.geometry);
    assert.notEqual(object.material, other.material);
  });
  assert.ok(lights >= 2);
  input.width = 4;
  input.colors.wall = 'slate';
  assert.equal(first.layout.description.width, 8);
  assert.equal(first.layout.description.colors.wall, 'cream');
  const changed = createProceduralRoom(descriptionFixture({ width: 7, colors: { wall: 'teal', floor: 'ochre' } }), 481);
  t.after(changed.dispose);
  assert.notDeepEqual(structure(first.scene), structure(changed.scene));
});

test('architecture stays outside the interior and leaves a floor-level doorway for every placement', () => {
  for (const placement of ['left', 'center', 'right'] as const) {
    for (const maximum of [false, true]) {
      const room = createProceduralRoom(descriptionFixture({
        width: maximum ? 8 : 4, depth: maximum ? 8 : 5, height: maximum ? 4 : 2.8,
        doorway: { placement, width: maximum ? 1.4 : 1, height: maximum ? 2.5 : 2 }, furnishings: [],
      }), 0);
      try {
        const { description: d, doorwayX } = room.layout;
        const bounds = (name: string) => {
          const object = room.scene.getObjectByName(name);
          assert.ok(object, name);
          return new Box3().setFromObject(object);
        };
        const floor = bounds('floor');
        const ceiling = bounds('ceiling');
        assert.ok(Math.abs(floor.max.y) < epsilon && Math.abs(floor.min.y + 0.16) < epsilon);
        assert.ok(Math.abs(ceiling.min.y - d.height) < epsilon);
        assert.ok(Math.abs(bounds('left-wall').max.x + d.width / 2) < epsilon);
        assert.ok(Math.abs(bounds('right-wall').min.x - d.width / 2) < epsilon);
        assert.ok(Math.abs(bounds('front-wall').min.z - 3) < epsilon);
        const rear = [bounds('rear-left'), bounds('rear-right'), bounds('doorway-lintel')];
        assert.ok(Math.abs(rear[0].max.x - (doorwayX - d.doorway.width / 2)) < epsilon);
        assert.ok(Math.abs(rear[1].min.x - (doorwayX + d.doorway.width / 2)) < epsilon);
        assert.ok(rear[0].getSize(new Vector3()).x >= 0.3 - epsilon);
        assert.ok(rear[1].getSize(new Vector3()).x >= 0.3 - epsilon);
        assert.ok(Math.abs(rear[2].min.y - d.doorway.height) < epsilon);
        for (const wall of rear) assert.ok(Math.abs(wall.max.z - (3 - d.depth)) < epsilon);
        for (const x of [doorwayX - d.doorway.width / 2 + 0.01, doorwayX, doorwayX + d.doorway.width / 2 - 0.01]) {
          for (const y of [0.01, d.doorway.height - 0.01]) {
            for (const wall of rear) assert.equal(wall.containsPoint(new Vector3(x, y, 3 - d.depth - 0.08)), false);
          }
        }
        assert.equal(rear[2].containsPoint(new Vector3(doorwayX, d.doorway.height + 0.1, 3 - d.depth - 0.08)), true);
      } finally { room.dispose(); }
    }
  }
});

test('actual primitive bounds respect every furnishing footprint through all quarter-turns', () => {
  const rotations = new Map(Object.keys(dimensions).map(kind => [kind, new Set<number>()]));
  for (let seed = 0; seed < 32; seed += 1) {
    const room = createProceduralRoom(descriptionFixture(), seed);
    try {
      assertSafe(room.layout);
      const furnishings = room.scene.getObjectByName('furnishings');
      assert.ok(furnishings);
      assert.equal(furnishings.children.length, 4);
      for (const [index, object] of furnishings.children.entries()) {
        const item = room.layout.furnishings[index];
        rotations.get(item.kind)!.add(item.rotation);
        const [width, depth, height] = dimensions[item.kind];
        const rotated = item.rotation === 90 || item.rotation === 270;
        const bounds = new Box3().setFromObject(object);
        const size = bounds.getSize(new Vector3());
        assert.ok(Math.abs(bounds.min.y) < epsilon, `${item.kind} touches floor`);
        assert.ok(Math.abs(size.x - (rotated ? depth : width)) < epsilon);
        assert.ok(Math.abs(size.z - (rotated ? width : depth)) < epsilon);
        assert.ok(Math.abs(size.y - height) < epsilon);
        assert.ok(Math.abs(bounds.getCenter(new Vector3()).x - item.x) < epsilon);
        assert.ok(Math.abs(bounds.getCenter(new Vector3()).z - item.z) < epsilon);
        assert.equal(object.children.length, 1, 'the logical wrapper contains one replaceable visual');
        const visual = object.children[0];
        assert.ok(visual instanceof Group);
        assert.ok(visual.children.length >= 4, 'detailed primitives, not a placeholder box');
        assert.ok(visual.children.every(child => child instanceof Mesh));
      }
    } finally { room.dispose(); }
  }
  for (const [kind, values] of rotations) assert.deepEqual([...values].sort((a, b) => a - b), [0, 90, 180, 270], kind);
});

test('finite room extremes and multiple seeds preserve containment, door aisle and pairwise clearance', () => {
  for (const width of [4, 8]) for (const depth of [5, 8]) for (const height of [2.8, 4]) {
    for (const placement of ['left', 'center', 'right'] as const) {
      for (const seed of [0, 1, 17, 923, 4294967295]) {
        for (const kind of ['table', 'chair', 'sofa', 'shelf'] as const) {
          assertSafe(layoutProceduralRoom(descriptionFixture({ width, depth, height,
            doorway: { placement, width: 1.4, height: 2.5 }, furnishings: [{ kind, color: 'teal' }] }), seed));
        }
        assertSafe(layoutProceduralRoom(descriptionFixture({ width: 8, depth: 8, height,
          doorway: { placement, width: 1.4, height: 2.5 },
          furnishings: Array.from({ length: 8 }, () => ({ kind: 'chair', color: 'cream' })),
        }), seed));
      }
    }
  }
});

test('invalid or impossible descriptions fail before geometry or material allocation', t => {
  const geometryAllocation = t.mock.method(BoxGeometry.prototype, 'setIndex', () => { throw new Error('geometry allocated'); });
  const materialAllocation = t.mock.method(MeshStandardMaterial.prototype, 'setValues', () => { throw new Error('material allocated'); });
  const impossible = descriptionFixture({ width: 4, depth: 5,
    doorway: { placement: 'center', width: 1.4, height: 2.5 },
    furnishings: Array.from({ length: 8 }, () => ({ kind: 'sofa', color: 'teal' })),
  });
  assert.doesNotThrow(() => validateRoomDescription(impossible));
  assert.throws(() => createProceduralRoom(impossible, 0), /place.*furnishings/i);
  assert.throws(() => createProceduralRoom({ ...descriptionFixture(), width: Infinity }, 0), /room description/i);
  assert.throws(() => createProceduralRoom(descriptionFixture(), -1), /seed/i);
  assert.equal(geometryAllocation.mock.callCount(), 0);
  assert.equal(materialAllocation.mock.callCount(), 0);
});

test('disposal releases every owned geometry/material once and leaves another room usable', t => {
  const first = createProceduralRoom(descriptionFixture(), 5);
  const other = createProceduralRoom(descriptionFixture(), 6);
  t.after(() => { first.dispose(); other.dispose(); });
  const resources = new Set<BoxGeometry | MeshStandardMaterial>();
  first.scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    resources.add(object.geometry);
    resources.add(object.material);
  });
  const calls = [...resources].map(resource => t.mock.method(resource, 'dispose'));
  const otherResources: (BoxGeometry | MeshStandardMaterial)[] = [];
  other.scene.traverse(object => {
    if (object instanceof Mesh) otherResources.push(object.geometry, object.material);
  });
  const otherCalls = [...new Set(otherResources)].map(resource => t.mock.method(resource, 'dispose'));
  const before = structure(other.scene);
  first.dispose();
  first.dispose();
  for (const call of calls) assert.equal(call.mock.callCount(), 1);
  for (const call of otherCalls) assert.equal(call.mock.callCount(), 0);
  assert.deepEqual(structure(other.scene), before);
});

test('a partial build exception releases even unattached allocations exactly once', t => {
  const geometries = new Set<BoxGeometry>();
  const materials = new Set<MeshStandardMaterial>();
  const setIndex = BoxGeometry.prototype.setIndex;
  const setValues = MeshStandardMaterial.prototype.setValues;
  t.mock.method(BoxGeometry.prototype, 'setIndex', function (this: BoxGeometry, ...args: Parameters<typeof setIndex>) {
    geometries.add(this);
    return setIndex.apply(this, args);
  });
  t.mock.method(MeshStandardMaterial.prototype, 'setValues', function (this: MeshStandardMaterial, ...args: Parameters<typeof setValues>) {
    materials.add(this);
    return setValues.apply(this, args);
  });
  const geometryDispose = t.mock.method(BoxGeometry.prototype, 'dispose');
  const materialDispose = t.mock.method(MeshStandardMaterial.prototype, 'dispose');
  const add = Group.prototype.add;
  let meshAdds = 0;
  const failure = new Error('injected construction failure');
  t.mock.method(Group.prototype, 'add', function (this: Group, ...objects: Object3D[]) {
    if (objects.some(object => object instanceof Mesh) && ++meshAdds === 5) throw failure;
    return add.apply(this, objects);
  });
  assert.throws(() => createProceduralRoom(descriptionFixture(), 7), error => error === failure);
  assert.ok(geometries.size >= 5 && materials.size >= 2);
  assert.equal(geometryDispose.mock.callCount(), geometries.size);
  assert.equal(materialDispose.mock.callCount(), materials.size);
  assert.deepEqual(new Set(geometryDispose.mock.calls.map(call => call.this)), geometries);
  assert.deepEqual(new Set(materialDispose.mock.calls.map(call => call.this)), materials);
});

test('a throwing resource release does not strand other owned resources or run again', t => {
  const room = createProceduralRoom(descriptionFixture(), 8);
  const resources = new Set<BoxGeometry | MeshStandardMaterial>();
  room.scene.traverse(object => {
    if (object instanceof Mesh) { resources.add(object.geometry); resources.add(object.material); }
  });
  const calls = [...resources].map(resource => t.mock.method(resource, 'dispose'));
  calls[0].mock.mockImplementation(() => { throw new Error('injected release failure'); });
  assert.throws(room.dispose, /cleanup/i);
  room.dispose();
  for (const call of calls) assert.equal(call.mock.callCount(), 1);
});
