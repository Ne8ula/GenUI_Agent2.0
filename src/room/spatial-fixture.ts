import {
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
} from 'three';

export type Viewpoint = { x: number; y: number };
export const CENTER_VIEWPOINT: Readonly<Viewpoint> = Object.freeze({ x: 0, y: 0 });
export const VIEWPOINT_LIMITS: Readonly<Viewpoint> = Object.freeze({ x: 0.65, y: 0.35 });

export function clampViewpoint(viewpoint: Viewpoint): Viewpoint {
  return {
    x: Number.isFinite(viewpoint.x) ? Math.max(-VIEWPOINT_LIMITS.x, Math.min(VIEWPOINT_LIMITS.x, viewpoint.x)) : 0,
    y: Number.isFinite(viewpoint.y) ? Math.max(-VIEWPOINT_LIMITS.y, Math.min(VIEWPOINT_LIMITS.y, viewpoint.y)) : 0,
  };
}

export function setFixtureViewpoint(camera: PerspectiveCamera, viewpoint: Viewpoint): Viewpoint {
  const bounded = clampViewpoint(viewpoint);
  camera.position.set(bounded.x, 1.7 + bounded.y, 2.5);
  camera.lookAt(0, 1.45, -1.3);
  camera.updateMatrixWorld();
  return bounded;
}

export function createSpatialFixture() {
  const scene = new Scene();
  scene.name = 'spatial-fixture';
  scene.background = new Color(0x191c20);
  const room = new Group();
  room.name = 'fixture-room';
  scene.add(room);

  const materials = {
    plaster: new MeshStandardMaterial({ color: 0xa9a393, roughness: 0.9 }),
    floor: new MeshStandardMaterial({ color: 0x51443b, roughness: 0.85 }),
    wood: new MeshStandardMaterial({ color: 0x956347, roughness: 0.75 }),
    fabric: new MeshStandardMaterial({ color: 0x4f6661, roughness: 1 }),
  };
  const geometries: BoxGeometry[] = [];
  function box(parent: Group, name: string, size: [number, number, number], position: [number, number, number], material: MeshStandardMaterial) {
    const geometry = new BoxGeometry(...size);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    parent.add(mesh);
  }

  const architecture = new Group();
  architecture.name = 'architecture';
  room.add(architecture);
  box(architecture, 'floor', [6.2, 0.16, 6.2], [0, -0.08, 0], materials.floor);
  box(architecture, 'ceiling', [6.2, 0.16, 6.2], [0, 3.48, 0], materials.plaster);
  box(architecture, 'left-wall', [0.16, 3.4, 6.2], [-3.08, 1.7, 0], materials.plaster);
  box(architecture, 'right-wall', [0.16, 3.4, 6.2], [3.08, 1.7, 0], materials.plaster);
  box(architecture, 'front-wall', [6, 3.4, 0.16], [0, 1.7, 3.08], materials.plaster);
  const doorwayWall = new Group();
  doorwayWall.name = 'doorway-wall';
  architecture.add(doorwayWall);
  box(doorwayWall, 'rear-left', [3.9, 3.4, 0.16], [-1.05, 1.7, -3.08], materials.plaster);
  box(doorwayWall, 'rear-right', [1, 3.4, 0.16], [2.5, 1.7, -3.08], materials.plaster);
  box(doorwayWall, 'doorway-lintel', [1.1, 1.05, 0.16], [1.45, 2.875, -3.08], materials.plaster);

  const furnishings = new Group();
  furnishings.name = 'furnishings';
  room.add(furnishings);
  const table = new Group();
  table.name = 'table';
  table.position.set(-0.9, 0, -1.05);
  furnishings.add(table);
  box(table, 'table-top', [1.7, 0.12, 0.95], [0, 0.82, 0], materials.wood);
  for (const x of [-0.68, 0.68]) {
    for (const z of [-0.34, 0.34]) {
      box(table, `table-leg-${x}-${z}`, [0.1, 0.76, 0.1], [x, 0.38, z], materials.wood);
    }
  }
  const chair = new Group();
  chair.name = 'chair';
  chair.position.set(0.85, 0, -1);
  chair.rotation.y = Math.PI / 2;
  furnishings.add(chair);
  box(chair, 'chair-seat', [0.64, 0.12, 0.64], [0, 0.52, 0], materials.fabric);
  box(chair, 'chair-back', [0.64, 0.68, 0.1], [0, 0.92, 0.27], materials.fabric);
  for (const x of [-0.24, 0.24]) {
    for (const z of [-0.24, 0.24]) {
      box(chair, `chair-leg-${x}-${z}`, [0.08, 0.46, 0.08], [x, 0.23, z], materials.wood);
    }
  }

  const ambient = new HemisphereLight(0xffedd6, 0x39353b, 2);
  ambient.name = 'ambient-light';
  const light = new DirectionalLight(0xffe2bb, 2.5);
  light.name = 'front-light';
  light.position.set(-1.5, 3, 2);
  scene.add(ambient, light);
  const camera = new PerspectiveCamera(55, 1, 0.05, 20);
  setFixtureViewpoint(camera, CENTER_VIEWPOINT);

  let disposed = false;
  return {
    scene,
    camera,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const geometry of geometries) geometry.dispose();
      for (const material of Object.values(materials)) material.dispose();
    },
  };
}
