import { BoxGeometry, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial, Scene } from 'three';
import { ROOM_COLORS, validateRoomDescription, type FurnitureKind, type RoomColor, type RoomDescription } from './room-description.ts';
import type { RoomPropVisual } from './room-prop-visual.ts';

// Width × depth × height in virtual units; +x right, +y up, front interior z=3.
const dimensions = {
  table: [1.6, 0.9, 0.9], chair: [0.65, 0.65, 1.1],
  sofa: [1.9, 0.85, 0.95], shelf: [1.2, 0.4, 1.8],
} as const;
const clearance = 0.15;
const tolerance = 1e-9;
const rotations = [0, 90, 180, 270] as const;

type PlacedFurnishing = {
  kind: FurnitureKind;
  color: RoomColor;
  x: number;
  z: number;
  rotation: typeof rotations[number];
};
export type FurnishingPose = Pick<PlacedFurnishing, 'x' | 'z' | 'rotation'>;
export type FurnishingEnvelope = FurnishingPose & { width: number; depth: number; height: number };
export type RoomLayout = {
  description: RoomDescription;
  seed: number;
  doorwayX: number;
  furnishings: PlacedFurnishing[];
};

function footprint(item: PlacedFurnishing) {
  const [width, depth, height] = dimensions[item.kind];
  const turned = item.rotation === 90 || item.rotation === 270;
  const halfX = (turned ? depth : width) / 2;
  const halfZ = (turned ? width : depth) / 2;
  return { minX: item.x - halfX, maxX: item.x + halfX, minZ: item.z - halfZ, maxZ: item.z + halfZ, height };
}

function fits(item: PlacedFurnishing, previous: PlacedFurnishing[], room: RoomDescription, doorwayX: number) {
  if (!Number.isFinite(item.x) || !Number.isFinite(item.z) || !rotations.includes(item.rotation)) return false;
  const bounds = footprint(item);
  const aisleHalfWidth = (room.doorway.width + 0.2) / 2;
  if (bounds.minX < -room.width / 2 + clearance - tolerance || bounds.maxX > room.width / 2 - clearance + tolerance
    || bounds.minZ < 3 - room.depth + clearance - tolerance || bounds.maxZ > 2 + tolerance || bounds.height > room.height
    || !(bounds.maxX <= doorwayX - aisleHalfWidth + tolerance || bounds.minX >= doorwayX + aisleHalfWidth - tolerance)) return false;
  return previous.every(other => {
    const occupied = footprint(other);
    return bounds.maxX + clearance <= occupied.minX + tolerance || occupied.maxX + clearance <= bounds.minX + tolerance
      || bounds.maxZ + clearance <= occupied.minZ + tolerance || occupied.maxZ + clearance <= bounds.minZ + tolerance;
  });
}

export function validateFurnishingPose(input: unknown): FurnishingPose {
  if (!input || typeof input !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(input))
    || Reflect.ownKeys(input).length !== 3 || !['x', 'z', 'rotation'].every(key => {
      const property = Object.getOwnPropertyDescriptor(input, key);
      return property?.enumerable && 'value' in property;
    })) throw new Error('Invalid furnishing pose.');
  const pose = input as FurnishingPose;
  if (!Number.isFinite(pose.x) || !Number.isFinite(pose.z) || !rotations.includes(pose.rotation)) throw new Error('Invalid furnishing pose.');
  return { x: pose.x, z: pose.z, rotation: pose.rotation };
}

export function layoutProceduralRoom(input: unknown, seed: number, poses?: readonly FurnishingPose[]): RoomLayout {
  const description = validateRoomDescription(input);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Room seed must be a uint32 integer.');
  let state = seed;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
  const doorOffset = description.width / 2 - description.doorway.width / 2 - 0.3;
  const doorwayX = description.doorway.placement === 'center' ? 0 : description.doorway.placement === 'left' ? -doorOffset : doorOffset;
  const furnishings: PlacedFurnishing[] = [];
  if (poses !== undefined) {
    if (!Array.isArray(poses) || Object.getPrototypeOf(poses) !== Array.prototype || poses.length !== description.furnishings.length
      || Reflect.ownKeys(poses).length !== poses.length + 1) throw new Error('Invalid reconstruction poses.');
    for (const [index, furnishing] of description.furnishings.entries()) {
      const entry = Object.getOwnPropertyDescriptor(poses, String(index));
      if (!entry?.enumerable || !('value' in entry)) throw new Error('Invalid reconstruction poses.');
      furnishings.push({ ...furnishing, ...validateFurnishingPose(entry.value) });
    }
  } else {
    // shortcut: finite greedy placement can reject a packable room, upgrade only if denser layouts are required.
    for (const furnishing of description.furnishings) {
      const candidates: PlacedFurnishing[] = [];
      const [width, depth] = dimensions[furnishing.kind];
      for (const rotation of rotations) {
        const turned = rotation === 90 || rotation === 270;
        const halfX = (turned ? depth : width) / 2;
        const halfZ = (turned ? width : depth) / 2;
        const minX = -description.width / 2 + clearance + halfX;
        const maxX = description.width / 2 - clearance - halfX;
        const minZ = 3 - description.depth + clearance + halfZ;
        const maxZ = 2 - halfZ;
        for (let column = 0; column <= Math.floor((maxX - minX) / 0.25); column += 1) {
          for (let row = 0; row <= Math.floor((maxZ - minZ) / 0.25); row += 1) {
            const candidate = { ...furnishing, x: minX + column * 0.25, z: minZ + row * 0.25, rotation };
            if (fits(candidate, furnishings, description, doorwayX)) candidates.push(candidate);
          }
        }
      }
      if (!candidates.length) throw new Error('Unable to place all furnishings safely.');
      furnishings.push(candidates[Math.floor(random() * candidates.length)]);
    }
  }
  if (furnishings.length !== description.furnishings.length
    || !furnishings.every((item, index) => fits(item, furnishings.slice(0, index), description, doorwayX))) {
    throw new Error('Unable to place all furnishings safely.');
  }
  return { description, seed, doorwayX, furnishings };
}

export function getFurnishingEnvelope(layout: RoomLayout, furnishingIndex: number): FurnishingEnvelope {
  if (!Number.isInteger(furnishingIndex) || furnishingIndex < 0 || furnishingIndex >= layout.furnishings.length) {
    throw new Error('Invalid furnishing envelope.');
  }
  const checked = layoutProceduralRoom(layout.description, layout.seed,
    layout.furnishings.map(({ x, z, rotation }) => ({ x, z, rotation })));
  const item = checked.furnishings[furnishingIndex];
  const [width, depth, height] = dimensions[item.kind];
  // Local box is centered on x/z and grounded at y=0; no clearance or aisle expansion.
  return { x: item.x, z: item.z, rotation: item.rotation, width, depth, height };
}

export function createProceduralRoom(input: unknown, seed: number, poses?: readonly FurnishingPose[]) {
  // Finish all validation and packing before allocating any Three resources.
  const layout = layoutProceduralRoom(input, seed, poses);
  const { description, doorwayX } = layout;
  const geometries = new Set<BoxGeometry>();
  const materials = new Map<string, MeshStandardMaterial>();
  const furnishingGroups: Group[] = [];
  const visuals = new Map<number, RoomPropVisual>();
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    const errors: unknown[] = [];
    for (const resource of [...geometries, ...materials.values(), ...visuals.values()]) {
      try { resource.dispose(); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, 'Room resource cleanup failed.');
  }
  function replaceFurnishingVisual(index: number, visual: RoomPropVisual) {
    const group = furnishingGroups[index];
    if (disposed || !Number.isInteger(index) || !group || group.children.length !== 1 || visual.root.parent) {
      throw new Error('Furnishing visual cannot be replaced.');
    }
    const oldRoot = group.children[0];
    const previous = visuals.get(index);
    group.remove(oldRoot);
    group.add(visual.root);
    visuals.set(index, visual);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (previous) { previous.dispose(); return; }
      const errors: unknown[] = [];
      oldRoot.traverse(object => {
        if (!(object instanceof Mesh) || !(object.geometry instanceof BoxGeometry) || !geometries.delete(object.geometry)) return;
        try { object.geometry.dispose(); } catch (error) { errors.push(error); }
      });
      // Procedural materials remain room-owned because other furnishings can share them.
      if (errors.length) throw new AggregateError(errors, 'Furnishing resource cleanup failed.');
    };
  }
  function material(color: RoomColor, roughness: number) {
    const key = `${color}:${roughness}`;
    let value = materials.get(key);
    if (!value) {
      value = new MeshStandardMaterial({ color: ROOM_COLORS[color], roughness });
      materials.set(key, value);
    }
    return value;
  }
  function box(parent: Group, name: string, size: [number, number, number], position: [number, number, number], surface: MeshStandardMaterial) {
    const geometry = new BoxGeometry(...size);
    geometries.add(geometry);
    const mesh = new Mesh(geometry, surface);
    mesh.name = name;
    mesh.position.set(...position);
    parent.add(mesh);
  }

  try {
    const scene = new Scene();
    scene.name = 'procedural-room';
    scene.background = new Color(0x191c20);
    const room = new Group();
    room.name = 'room';
    scene.add(room);
    const architecture = new Group();
    architecture.name = 'architecture';
    room.add(architecture);
    const plaster = material(description.colors.wall, 0.9);
    const floor = material(description.colors.floor, 0.85);
    const { width, depth, height } = description;
    const rear = 3 - depth;
    const middle = 3 - depth / 2;
    const thickness = 0.16;
    box(architecture, 'floor', [width + 2 * thickness, thickness, depth + 2 * thickness], [0, -thickness / 2, middle], floor);
    box(architecture, 'ceiling', [width + 2 * thickness, thickness, depth + 2 * thickness], [0, height + thickness / 2, middle], plaster);
    box(architecture, 'left-wall', [thickness, height, depth + 2 * thickness], [-width / 2 - thickness / 2, height / 2, middle], plaster);
    box(architecture, 'right-wall', [thickness, height, depth + 2 * thickness], [width / 2 + thickness / 2, height / 2, middle], plaster);
    box(architecture, 'front-wall', [width, height, thickness], [0, height / 2, 3 + thickness / 2], plaster);
    const doorwayWall = new Group();
    doorwayWall.name = 'doorway-wall';
    architecture.add(doorwayWall);
    const doorLeft = doorwayX - description.doorway.width / 2;
    const doorRight = doorwayX + description.doorway.width / 2;
    box(doorwayWall, 'rear-left', [doorLeft + width / 2, height, thickness], [(doorLeft - width / 2) / 2, height / 2, rear - thickness / 2], plaster);
    box(doorwayWall, 'rear-right', [width / 2 - doorRight, height, thickness], [(doorRight + width / 2) / 2, height / 2, rear - thickness / 2], plaster);
    box(doorwayWall, 'doorway-lintel', [description.doorway.width, height - description.doorway.height, thickness],
      [doorwayX, (height + description.doorway.height) / 2, rear - thickness / 2], plaster);

    const furnishings = new Group();
    furnishings.name = 'furnishings';
    room.add(furnishings);
    for (const [index, item] of layout.furnishings.entries()) {
      const group = new Group();
      group.name = `${item.kind}-${index + 1}`;
      group.position.set(item.x, 0, item.z);
      group.rotation.y = item.rotation * Math.PI / 180;
      furnishings.add(group);
      furnishingGroups.push(group);
      const visual = new Group();
      visual.name = `${group.name}-visual`;
      group.add(visual);
      const [w, d, h] = dimensions[item.kind];
      const surface = material(item.color, item.kind === 'chair' || item.kind === 'sofa' ? 1 : 0.75);
      const part = (name: string, size: [number, number, number], position: [number, number, number], finish = surface) => {
        box(visual, `${group.name}-${name}`, size, position, finish);
      };
      if (item.kind === 'table' || item.kind === 'chair') {
        const seatTop = item.kind === 'table' ? h : 0.56;
        part('top', [w, 0.12, d], [0, seatTop - 0.06, 0]);
        const legHeight = seatTop - 0.12;
        const legs = item.kind === 'table' ? surface : material('walnut', 0.75);
        for (const x of [-1, 1]) for (const z of [-1, 1]) {
          part(`leg-${x}-${z}`, [0.1, legHeight, 0.1], [x * (w / 2 - 0.1), legHeight / 2, z * (d / 2 - 0.1)], legs);
        }
        if (item.kind === 'chair') part('back', [w, h - seatTop, 0.1], [0, (h + seatTop) / 2, d / 2 - 0.05]);
      } else if (item.kind === 'sofa') {
        const legs = material('walnut', 0.75);
        for (const x of [-1, 1]) for (const z of [-1, 1]) {
          part(`leg-${x}-${z}`, [0.1, 0.12, 0.1], [x * (w / 2 - 0.15), 0.06, z * (d / 2 - 0.12)], legs);
        }
        part('base', [w, 0.3, d], [0, 0.27, 0]);
        part('back', [w, h - 0.42, 0.16], [0, (h + 0.42) / 2, d / 2 - 0.08]);
        for (const side of [-1, 1]) {
          part(`arm-${side}`, [0.14, h - 0.42, d - 0.16], [side * (w / 2 - 0.07), (h + 0.42) / 2, -0.08]);
          part(`cushion-${side}`, [(w - 0.28) / 2 - 0.02, 0.14, d - 0.18], [side * (w - 0.28) / 4, 0.49, -0.08]);
        }
      } else {
        for (const side of [-1, 1]) part(`side-${side}`, [0.08, h, d], [side * (w / 2 - 0.04), h / 2, 0]);
        part('back', [w - 0.16, h, 0.05], [0, h / 2, d / 2 - 0.025]);
        for (const [level, y] of [0.03, 0.6, 1.2, h - 0.03].entries()) {
          part(`shelf-${level}`, [w - 0.16, 0.06, d - 0.05], [0, y, -0.025]);
        }
      }
    }
    const ambient = new HemisphereLight(0xffedd6, 0x39353b, 2);
    ambient.name = 'ambient-light';
    const light = new DirectionalLight(0xffe2bb, 2.5);
    light.name = 'front-light';
    light.position.set(-1.5, height - 0.4, 2);
    scene.add(ambient, light);
    return { scene, layout, replaceFurnishingVisual, dispose };
  } catch (error) {
    try { dispose(); } catch { /* Preserve the construction failure after attempting every release. */ }
    throw error;
  }
}
