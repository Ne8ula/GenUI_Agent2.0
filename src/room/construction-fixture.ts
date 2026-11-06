import { Box3, Color, MeshBasicMaterial, DirectionalLight, EdgesGeometry, Group, HemisphereLight, LineSegments, Matrix4, Mesh, NearestFilter, NoColorSpace, PerspectiveCamera, Scene, SRGBColorSpace, Texture, TextureLoader, Vector2, Vector3, type Camera, type LineBasicMaterial, type Material, type Object3D, type ShaderMaterial, type WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { REPLAY_STAGES, createConstructionMaterials, growWindow, revealLines, type ConstructionStage } from './construction-animation.ts';
import { LOOK, REVEAL, areaClipLines, createGrowUniforms, createRevealMaterial, createRoomParticles, growMaterial } from './construction-reveal.ts';
import { isWall } from './room-display.ts';
import { CENTER_VIEWPOINT, setFixtureViewpoint } from './spatial-fixture.ts';

export const CONSTRUCTION_FIXTURE_BASE = '/fixtures/surreal-library/';
type Vec3 = [number, number, number];
export type ConstructionManifest = {
  id: string; label: string;
  camera: { position: Vec3; lookAt: Vec3; fovDeg: number; width: number; height: number; viewOffsetX: number };
  room: { width: number; depth: number; height: number };
  shell: string;
  heroes: { id: string; name: string; glb: string; order: number }[];
  wire: { lineColor: string; heroColor: string };
  stages: { wire: string; evaLit: string; paint: string; final: string };
  // Optional: the same stages with heroes, columns and bases removed (projected on the room so nothing repeats on it off-centre),
  // the stages for the columns and bases themselves (anything in front of them removed), and an image of which hero is
  // frontmost at each pixel (grey = (order index + 1) * HERO_ID_STEP; other values are room).
  cleanStages: { evaLit: string; paint: string; final: string } | null;
  architectureStages: { evaLit: string; paint: string; final: string } | null;
  // Optional: for object areas the recorded image shows hidden behind something else, that object's own surrounding paint.
  heroBehindStages: { evaLit: string; paint: string; final: string } | null;
  heroIds: string | null;
  paintedWalls: boolean;
};
export const HERO_ID_STEP = 20;

function invalid(field: string): never { throw new Error(`The fixture manifest has an invalid ${field}.`); }
const text = (value: unknown, field: string) => typeof value === 'string' && value.trim() && value.length <= 200 ? value : invalid(field);
const finite = (value: unknown, field: string) => typeof value === 'number' && Number.isFinite(value) ? value : invalid(field);
const positive = (value: unknown, field: string) => finite(value, field) > 0 ? value as number : invalid(field);
const vec3 = (value: unknown, field: string) => Array.isArray(value) && value.length === 3 ? value.map(item => finite(item, field)) as Vec3 : invalid(field);
const object = (value: unknown, field: string) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : invalid(field);
// Assets stay inside the fixture folder: relative paths only, no parent segments, schemes or queries.
const asset = (value: unknown, field: string) => typeof value === 'string' && /^[\w-]+(?:\/[\w.-]+)*\.(?:glb|png|jpe?g|webp)$/i.test(value)
  && !value.split('/').includes('..') ? value : invalid(field);
const colour = (value: unknown, field: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : invalid(field);

function optionalStages(value: unknown, field: string) {
  if (value === undefined) return null;
  const stages = object(value, field);
  return { evaLit: asset(stages.evaLit, `${field}.evaLit`), paint: asset(stages.paint, `${field}.paint`), final: asset(stages.final, `${field}.final`) };
}

export function validateConstructionManifest(value: unknown): ConstructionManifest {
  const root = object(value, 'manifest');
  const camera = object(root.camera, 'camera'), room = object(root.room, 'room'), wire = object(root.wire, 'wire'), stages = object(root.stages, 'stages');
  const masks = root.masks === undefined ? null : object(root.masks, 'masks');
  if (!Array.isArray(root.heroes) || root.heroes.length > 16) invalid('heroes');
  const fovDeg = positive(camera.fovDeg, 'camera.fovDeg');
  if (fovDeg >= 170 || root.paintedWalls !== undefined && typeof root.paintedWalls !== 'boolean') invalid(fovDeg >= 170 ? 'camera.fovDeg' : 'paintedWalls');
  return {
    id: text(root.id, 'id'), label: text(root.label, 'label'),
    camera: { position: vec3(camera.position, 'camera.position'), lookAt: vec3(camera.lookAt, 'camera.lookAt'), fovDeg,
      width: positive(camera.width, 'camera.width'), height: positive(camera.height, 'camera.height'), viewOffsetX: finite(camera.viewOffsetX ?? 0, 'camera.viewOffsetX') },
    room: { width: positive(room.width, 'room.width'), depth: positive(room.depth, 'room.depth'), height: positive(room.height, 'room.height') },
    shell: asset(root.shell, 'shell'),
    heroes: root.heroes.map((item: unknown, index: number) => {
      const hero = object(item, `heroes[${index}]`);
      return { id: text(hero.id, 'hero id'), name: text(hero.name, 'hero name'), glb: asset(hero.glb, 'hero glb'), order: finite(hero.order, 'hero order') };
    }).sort((a, b) => a.order - b.order),
    wire: { lineColor: colour(wire.lineColor, 'wire.lineColor'), heroColor: colour(wire.heroColor, 'wire.heroColor') },
    stages: { wire: asset(stages.wire, 'stages.wire'), evaLit: asset(stages.evaLit, 'stages.evaLit'), paint: asset(stages.paint, 'stages.paint'), final: asset(stages.final, 'stages.final') },
    cleanStages: optionalStages(root.cleanStages, 'cleanStages'),
    architectureStages: optionalStages(root.architectureStages, 'architectureStages'),
    heroBehindStages: optionalStages(root.heroBehindStages, 'heroBehindStages'),
    heroIds: masks?.heroIds === undefined ? null : asset(masks.heroIds, 'masks.heroIds'),
    paintedWalls: root.paintedWalls === true,
  };
}

// The manifest camera's pose is mapped onto the app's centre viewpoint, so head-tracked views keep their parallax around it.
export function fixtureAlignment(camera: ConstructionManifest['camera']) {
  const view = new PerspectiveCamera();
  setFixtureViewpoint(view, CENTER_VIEWPOINT);
  const source = new PerspectiveCamera();
  source.position.fromArray(camera.position);
  source.lookAt(new Vector3(...camera.lookAt));
  source.updateMatrixWorld();
  const projector = new PerspectiveCamera(camera.fovDeg, camera.width / camera.height, 0.05, 100);
  setFixtureViewpoint(projector, CENTER_VIEWPOINT);
  projector.setViewOffset(camera.width, camera.height, camera.viewOffsetX, 0, camera.width, camera.height);
  return { root: new Matrix4().multiplyMatrices(view.matrixWorld, source.matrixWorld.clone().invert()), projector };
}

function disposeGraph(root: Object3D) {
  root.traverse(item => {
    if (!(item instanceof Mesh)) return;
    item.geometry.dispose();
    for (const material of [item.material].flat() as Material[]) {
      for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
      material.dispose();
    }
  });
}

export async function loadConstructionFixture(signal: AbortSignal, base = CONSTRUCTION_FIXTURE_BASE) {
  const response = await fetch(`${base}manifest.json`, { signal, redirect: 'error', credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error(`The fixture manifest could not be loaded (HTTP ${response.status}).`);
  const body = await response.text();
  if (body.length > 64 * 1024) throw new Error('The fixture manifest is too large.');
  const manifest = validateConstructionManifest(JSON.parse(body));
  const gltf = new GLTFLoader(), images = new TextureLoader();
  const owned: Object3D[] = [];
  const textures: Texture[] = [];
  const model = (path: string) => gltf.loadAsync(base + path).then(loaded => { owned.push(loaded.scene); return loaded.scene; });
  const image = (path: string) => images.loadAsync(base + path).then(texture => {
    textures.push(texture);
    // Row 0 is the top of the image, as the projection shader expects.
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    return texture;
  });
  // Object IDs are exact values, not colours: no filtering, no colour conversion.
  const ids = (path: string) => image(path).then(texture => {
    texture.colorSpace = NoColorSpace;
    texture.minFilter = texture.magFilter = NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  });
  const stageSet = (paths: Record<'evaLit' | 'paint' | 'final', string>) =>
    Promise.all([image(paths.evaLit), image(paths.paint), image(paths.final)]).then(([evaLit, paint, final]) => ({ evaLit, paint, final }));
  try {
    const [shell, heroModels, images, roomImages, architectureImages, behindImages, heroIds] = await Promise.all([
      model(manifest.shell), Promise.all(manifest.heroes.map(hero => model(hero.glb))),
      stageSet(manifest.stages), manifest.cleanStages && stageSet(manifest.cleanStages), manifest.architectureStages && stageSet(manifest.architectureStages), manifest.heroBehindStages && stageSet(manifest.heroBehindStages),
      manifest.heroIds ? ids(manifest.heroIds) : null,
    ]);
    signal.throwIfAborted();
    return buildFixture(manifest, shell, heroModels, images, roomImages ?? images, architectureImages ?? roomImages ?? images, behindImages, heroIds, () => { owned.forEach(disposeGraph); textures.forEach(item => item.dispose()); });
  } catch (error) {
    owned.forEach(disposeGraph);
    textures.forEach(item => item.dispose());
    throw error;
  }
}

type StageImages = Record<'evaLit' | 'paint' | 'final', Texture>;
function buildFixture(manifest: ConstructionManifest, shell: Object3D, heroModels: Object3D[], images: StageImages, roomImages: StageImages, architectureImages: StageImages, behindImages: StageImages | null, heroIds: Texture | null, release: () => void) {
  const background = new Color(0x191c20);
  const scene = new Scene();
  scene.background = background;
  scene.add(new HemisphereLight(0xffedd6, 0x39353b, 2));
  const light = new DirectionalLight(0xffe2bb, 2.5);
  light.position.set(-1.5, 3, 2);
  scene.add(light);
  const { root: alignment, projector } = fixtureAlignment(manifest.camera);
  const root = new Group();
  root.applyMatrix4(alignment);
  scene.add(root);
  root.add(shell, ...heroModels);
  const materials = createConstructionMaterials(manifest.wire.lineColor, manifest.wire.heroColor);
  const grey = new Color(0x8a8d93), rim = new Color(manifest.wire.heroColor);
  // An object not yet grown is outline only: it neither shows nor hides what is behind it.
  const absent = new MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  // Room surfaces: the object-free plates on walls, floor and ceiling; columns and bases their own.
  const roomLook = createRevealMaterial(projector, grey, rim);
  const architectureLook = createRevealMaterial(projector, grey, rim);
  const isArchitecture = (mesh: Mesh) => mesh.userData.role === 'column' || mesh.userData.role === 'plinth';
  const originals = new Map<Mesh, Material | Material[]>();
  // Own edge geometry per mesh, so each line's draw range is its own.
  const edgeGeometries: EdgesGeometry[] = [];
  function outline(part: Object3D, line: LineBasicMaterial, thresholdDeg: number) {
    const meshes: Mesh[] = [];
    const lines: LineSegments[] = [];
    part.traverse(item => { if (item instanceof Mesh) meshes.push(item); });
    for (const mesh of meshes) {
      originals.set(mesh, mesh.material);
      const geometry = new EdgesGeometry(mesh.geometry, thresholdDeg);
      edgeGeometries.push(geometry);
      const segments = new LineSegments(geometry, line);
      mesh.add(segments);
      lines.push(segments);
    }
    return { meshes, lines };
  }
  // Room shell at 12 deg: a 20-sided column's facets meet at 18 deg, so 30 deg left the columns without lines. Heroes keep 30 deg (dense scanned meshes).
  const room = outline(shell, materials.line, 12);
  // Room outlines leave area by area as the EVA render settles in.
  const lineArea = { value: -1 };
  areaClipLines(materials.line, lineArea);
  scene.updateMatrixWorld(true);
  // Each hero grows from where it touches the floor or table (its lowest point, under its centre).
  const heroes = heroModels.map((model, index) => {
    const grow = createGrowUniforms(), box = new Box3().setFromObject(model), centre = box.getCenter(new Vector3());
    grow.contact.value.set(centre.x, box.min.y, centre.z);
    grow.reach.value = Math.max(...[0, 1, 2, 3, 4, 5, 6, 7].map(k => new Vector3(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).distanceTo(grow.contact.value)));
    const lineMaterial = growMaterial(materials.amberLine, grow, { grey, rim, invert: true });
    const parts = outline(model, lineMaterial, 30);
    const growing = new Map<Mesh, Material | Material[]>(), painting = new Map<Mesh, ShaderMaterial>();
    for (const mesh of parts.meshes) {
      const own = originals.get(mesh)!;
      growing.set(mesh, Array.isArray(own) ? own.map(item => growMaterial(item, grow, { grey, rim })) : growMaterial(own, grow, { grey, rim }));
      const look = createRevealMaterial(projector, grey, rim), self = [own].flat()[0] as Material & { map?: Texture | null };
      look.uniforms.contact.value = grow.contact.value;
      look.uniforms.reach.value = grow.reach.value;
      if (heroIds) {
        look.uniforms.idMap.value = heroIds;
        look.uniforms.selfId.value = (index + 1) * HERO_ID_STEP / 255;
        look.uniforms.selfMap.value = self.map ?? null;
        look.uniforms.hasSelf.value = self.map ? 1 : 0;
        look.uniforms.hasBehind.value = behindImages ? 1 : 0;
      }
      painting.set(mesh, look);
    }
    return { ...parts, grow, lineMaterial, growing, painting };
  });
  // Particles carry each area of the room from its old look to its new one.
  const particles = [
    createRoomParticles(room.meshes.filter(mesh => !isArchitecture(mesh)), root, 110_000, roomLook),
    createRoomParticles(room.meshes.filter(isArchitecture), root, 25_000, architectureLook),
  ];
  root.add(...particles);

  function show(stage: ConstructionStage, progress: number) {
    const at = REPLAY_STAGES.indexOf(stage);
    const painted = (mesh: Mesh) => manifest.paintedWalls || !isWall(mesh);
    // Room and every hero draw their wireframes over the same stretch, starting together.
    for (const group of [room, ...heroes]) revealLines(group.lines, stage === 'wire' ? progress : 1);
    // Room: grey clay settles in area by area, holds through the models, then the EVA render, paint and final each settle in the same way.
    for (const [look, from] of [[roomLook, roomImages], [architectureLook, architectureImages]] as const) {
      const u = look.uniforms;
      u.baseLook.value = stage === 'blockout' ? LOOK.none : stage === 'evaLit' ? LOOK.grey : LOOK.image;
      u.topLook.value = at <= 2 ? LOOK.grey : LOOK.image;
      u.baseMap.value = stage === 'paint' ? from.evaLit : stage === 'final' ? from.paint : null;
      u.topMap.value = stage === 'paint' ? from.paint : stage === 'final' ? from.final : from.evaLit;
      u.reveal.value = stage === 'wire' || stage === 'models' ? REVEAL.still : REVEAL.areas;
      u.progress.value = progress;
    }
    lineArea.value = stage === 'evaLit' ? progress : -1;
    for (const line of room.lines) line.visible = at <= 3;
    for (const mesh of room.meshes) mesh.material = at === 0 ? materials.hidden : at >= 3 && !painted(mesh) ? originals.get(mesh)! : isArchitecture(mesh) ? architectureLook : roomLook;
    // Heroes: outlines only until their turn in the models stage, then clay and colour grow from the contact point;
    // the paint and the final image later grow over them from the same point.
    heroes.forEach((hero, index) => {
      const grown = at < 2 ? { clay: 0, colour: 0 } : at > 2 ? { clay: 1, colour: 1 } : growWindow(index, heroes.length, progress);
      hero.grow.clay.value = grown.clay;
      hero.grow.colour.value = grown.colour;
      for (const line of hero.lines) line.visible = grown.clay < 1;
      for (const mesh of hero.meshes) {
        if (grown.clay === 0) mesh.material = at === 0 ? materials.hidden : absent;
        else if (at <= 3 || !painted(mesh)) mesh.material = grown.colour >= 1 ? originals.get(mesh)! : hero.growing.get(mesh)!;
        else {
          const look = hero.painting.get(mesh)!, u = look.uniforms;
          u.baseLook.value = LOOK.image;
          u.topLook.value = LOOK.image;
          u.baseMap.value = stage === 'paint' ? images.evaLit : images.paint;
          u.topMap.value = stage === 'paint' ? images.paint : images.final;
          u.baseBehind.value = behindImages && (stage === 'paint' ? behindImages.evaLit : behindImages.paint);
          u.topBehind.value = behindImages && (stage === 'paint' ? behindImages.paint : behindImages.final);
          u.reveal.value = REVEAL.grow;
          u.progress.value = progress;
          mesh.material = look;
        }
      }
    });
  }

  const buffer = new Vector2();
  function render(renderer: WebGLRenderer, camera: Camera) {
    renderer.getDrawingBufferSize(buffer);
    for (const points of particles) (points.material as ShaderMaterial).uniforms.pointScale.value = buffer.y / 720;
    renderer.render(scene, camera);
  }

  let disposed = false;
  return {
    manifest,
    scene,
    show,
    render,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const [mesh, original] of originals) mesh.material = original;
      release();
      edgeGeometries.forEach(item => item.dispose());
      roomLook.dispose();
      architectureLook.dispose();
      for (const points of particles) { points.geometry.dispose(); (points.material as ShaderMaterial).dispose(); }
      for (const hero of heroes) {
        hero.lineMaterial.dispose();
        for (const material of hero.growing.values()) [material].flat().forEach(item => item.dispose());
        for (const material of hero.painting.values()) material.dispose();
      }
      absent.dispose();
      materials.dispose();
    },
  };
}
export type ConstructionFixture = Awaited<ReturnType<typeof loadConstructionFixture>>;
