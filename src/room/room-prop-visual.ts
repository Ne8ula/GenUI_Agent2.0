import { Box3, BufferGeometry, ClampToEdgeWrapping, Color, Group, LinearFilter, LoadingManager, Material, Mesh, MeshStandardMaterial, NearestFilter, Texture, Vector3 } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { validatePropGlb, type PropGlbAdmission } from './prop-glb-admission.ts';
import { ROOM_COLORS, type RoomColor } from './room-description.ts';
import { validateFurnishingPose, type FurnishingEnvelope } from './procedural-room.ts';
import type { RoomPropRequest } from './room-prop-request.ts';

export type RoomPropVisual = { root: Group; clone(): RoomPropVisual; dispose(): void };
export type RoomPropInstaller = (request: RoomPropRequest, visual: RoomPropVisual, isCurrent: () => boolean) => boolean;
const visuals = new WeakMap<RoomPropVisual, { live: () => boolean; width: number; depth: number; height: number }>();
let loading = false;
const invalid = () => new Error('Invalid or unsupported staged prop visual.');
function envelopeSnapshot(value: FurnishingEnvelope): FurnishingEnvelope {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Reflect.ownKeys(value).length !== 6 || !['x', 'z', 'rotation', 'width', 'depth', 'height'].every(key => {
      const entry = Object.getOwnPropertyDescriptor(value, key);
      return entry?.enumerable && 'value' in entry;
    })) throw invalid();
  const pose = validateFurnishingPose({ x: value.x, z: value.z, rotation: value.rotation });
  if (![value.width, value.depth, value.height].every(n => Number.isFinite(n) && n > 0)
    || value.width > 8 || value.depth > 8 || value.height > 4) throw invalid();
  return { ...pose, width: value.width, depth: value.depth, height: value.height };
}
function localBounds(root: Group) {
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root, true);
  if (![...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite) || box.isEmpty()) throw invalid();
  return box;
}
export function fitsRoomPropVisual(visual: RoomPropVisual, envelope: FurnishingEnvelope): boolean {
  try {
    const owned = visuals.get(visual);
    if (!owned?.live() || owned.width !== envelope.width || owned.depth !== envelope.depth || owned.height !== envelope.height) return false;
    const box = localBounds(visual.root);
    const epsilon = 1e-6;
    return box.min.x >= -envelope.width / 2 - epsilon && box.max.x <= envelope.width / 2 + epsilon
      && box.min.z >= -envelope.depth / 2 - epsilon && box.max.z <= envelope.depth / 2 + epsilon
      && Math.abs(box.min.y) <= epsilon && box.max.y <= envelope.height + epsilon;
  } catch { return false; }
}
function checkLoaded(gltf: GLTF, admitted: PropGlbAdmission) {
  const box = localBounds(gltf.scene);
  for (let axis = 0; axis < 3; axis += 1) {
    if (Math.abs(box.min.getComponent(axis) - admitted.bounds.min[axis]) > 1e-5
      || Math.abs(box.max.getComponent(axis) - admitted.bounds.max[axis]) > 1e-5) throw invalid();
  }
  let primitives = 0, vertices = 0, indices = 0;
  gltf.scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    primitives += 1;
    vertices += object.geometry.getAttribute('position').count;
    indices += object.geometry.index?.count ?? 0;
  });
  if (primitives !== admitted.resources.primitives || vertices !== admitted.resources.vertices || indices !== admitted.resources.indices) throw invalid();
  return box;
}

export async function stageRoomPropVisual(input: ArrayBuffer, envelope: FurnishingEnvelope, signal: AbortSignal,
  onCleanupError?: () => void, caseColor?: RoomColor): Promise<RoomPropVisual> {
  signal.throwIfAborted();
  if (caseColor !== undefined && (typeof caseColor !== 'string' || !Object.hasOwn(ROOM_COLORS, caseColor))) throw invalid();
  if (loading) throw new Error('A prop loader is still pending.');
  if (!(input instanceof ArrayBuffer)) throw invalid();
  const source = new Uint8Array(input);
  if (source.byteLength < 28 || source.byteLength > 8 * 1024 * 1024) throw invalid();
  const bounds = envelopeSnapshot(envelope);
  const bytes = new Uint8Array(source).buffer;
  loading = true;
  const operation = new AbortController();
  const active = operation.signal;
  const resources = new Set<BufferGeometry | Material | Texture>();
  const bitmaps = new Set<ImageBitmap>();
  const released = new WeakSet<object>();
  const pending = new Set<Promise<unknown>>();
  let closed = false, leases = 0;
  const reportCleanup = () => { try { onCleanupError?.(); } catch { /* Cleanup must keep attempting every resource. */ } };
  function release(resource: BufferGeometry | Material | Texture | ImageBitmap) {
    if (released.has(resource)) return;
    released.add(resource);
    if ('close' in resource) resource.close();
    else resource.dispose();
  }
  function own<T extends BufferGeometry | Material | Texture>(resource: T): T {
    if (closed) { try { release(resource); } catch { reportCleanup(); } }
    else resources.add(resource);
    return resource;
  }
  function disposeResources() {
    if (closed) return;
    closed = true;
    const errors: unknown[] = [];
    for (const resource of [...resources, ...bitmaps]) {
      try { release(resource); } catch (error) { errors.push(error); }
    }
    resources.clear(); bitmaps.clear();
    if (errors.length) { reportCleanup(); throw new AggregateError(errors, 'Prop resource cleanup failed.'); }
  }
  function watch<T>(promise: Promise<T>): Promise<T> {
    pending.add(promise);
    void promise.then(() => pending.delete(promise), () => pending.delete(promise));
    return promise;
  }
  function lease(root: Group): RoomPropVisual {
    if (closed) throw new Error('Prop visual resources are released.');
    leases += 1;
    let disposed = false;
    const visual: RoomPropVisual = {
      root,
      clone() {
        if (disposed || closed) throw new Error('Prop visual is disposed.');
        return lease(root.clone(true));
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        if (--leases === 0) disposeResources();
      },
    };
    visuals.set(visual, { live: () => !disposed && !closed, width: bounds.width, depth: bounds.depth, height: bounds.height });
    return visual;
  }
  const abort = () => operation.abort(signal.reason);
  const abandon = () => { try { disposeResources(); } catch { /* Reported independently of local cancellation. */ } };
  signal.addEventListener('abort', abort, { once: true });
  active.addEventListener('abort', abandon, { once: true });
  const deadline = setTimeout(() => operation.abort(new Error('Prop loader deadline exceeded.')), 15000);
  if (signal.aborted) abort();
  const work = (async () => {
    try {
      const admitted = await validatePropGlb(bytes, active);
      active.throwIfAborted();
      // A case colour is the mesh-only contract: textured assets keep their own appearance or are refused.
      if (caseColor !== undefined && (admitted.resources.images || admitted.resources.textures)) throw invalid();
      const manager = new LoadingManager();
      manager.setURLModifier(() => { throw new Error('External prop resources are forbidden.'); });
      const loader = new GLTFLoader(manager);
      // shortcut: ownership hooks target the installed static GLTFLoader subset, re-audit before upgrading Three.
      loader.register(parser => {
        const dependency = parser.getDependency.bind(parser);
        parser.getDependency = (type, index) => watch(dependency(type, index).then(value => {
          if (type === 'material') own(value as Material);
          return value;
        }));
        // Track each primitive before a sibling material/texture rejection can hide its allocation.
        const geometries = parser.loadGeometries.bind(parser);
        parser.loadGeometries = primitives => Promise.all(primitives.map(primitive => watch(geometries([primitive]).then(items => {
          items.forEach(own);
          return items;
        })))).then(items => items.flat());
        const finishMaterial = parser.assignFinalMaterial.bind(parser);
        parser.assignFinalMaterial = mesh => {
          const remember = () => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(own);
          remember();
          try { finishMaterial(mesh); } finally { remember(); }
        };
        const decoded = new Map<number, Promise<ImageBitmap>>();
        return {
          name: 'EVA_embedded_prop_png',
          loadTexture(index) {
            return watch((async () => {
              active.throwIfAborted();
              const textureDef = parser.json.textures[index];
              const source = textureDef.source as number;
              let image = decoded.get(source);
              if (!image) {
                image = watch((async () => {
                  const imageDef = parser.json.images[source];
                  const buffer = await parser.getDependency('bufferView', imageDef.bufferView) as ArrayBuffer;
                  active.throwIfAborted();
                  if (typeof createImageBitmap !== 'function') throw new Error('Native PNG bitmap decoding is unavailable.');
                  const bitmap = await createImageBitmap(new Blob([buffer], { type: 'image/png' }),
                    { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
                  if (closed) { try { release(bitmap); } catch { reportCleanup(); } active.throwIfAborted(); throw invalid(); }
                  bitmaps.add(bitmap);
                  const png = new DataView(buffer);
                  if (bitmap.width !== png.getUint32(16) || bitmap.height !== png.getUint32(20)) throw invalid();
                  active.throwIfAborted();
                  return bitmap;
                })());
                decoded.set(source, image);
              }
              const bitmap = await image;
              active.throwIfAborted();
              const texture = own(new Texture(bitmap));
              const sampler = parser.json.samplers[textureDef.sampler];
              texture.flipY = false;
              texture.generateMipmaps = false;
              texture.minFilter = sampler.minFilter === 9728 ? NearestFilter : LinearFilter;
              texture.magFilter = sampler.magFilter === 9728 ? NearestFilter : LinearFilter;
              texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
              texture.needsUpdate = true;
              parser.associations.set(texture, { textures: index });
              return texture;
            })());
          },
        };
      });
      const gltf = await new Promise<GLTF>((resolve, reject) => loader.parse(bytes, '', resolve, reject));
      active.throwIfAborted();
      const box = checkLoaded(gltf, admitted);
      const finals = new Set<Material>();
      const smoothed = new Set<Material>();
      gltf.scene.traverse(object => {
        if (!(object instanceof Mesh)) return;
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach(material => finals.add(material));
        // Owner-approved 8M: admitted NORMAL-less geometry gets smooth vertex normals (budgeted at admission).
        if (!object.geometry.getAttribute('normal')) {
          object.geometry.computeVertexNormals();
          list.forEach(material => smoothed.add(material));
        }
      });
      for (const material of finals) {
        // Authored materials keep a loader association; the loader default does not and becomes a matte plain surface.
        if (gltf.parser.associations.get(material)?.materials !== undefined) continue;
        if (!(material instanceof MeshStandardMaterial) || material.map || material.transparent) throw invalid();
        material.metalness = 0;
        material.roughness = 1;
        material.needsUpdate = true;
      }
      // The loader flat-shades NORMAL-less primitives; computed normals replace that derivative shading.
      for (const material of smoothed) {
        if (!(material instanceof MeshStandardMaterial)) throw invalid();
        material.flatShading = false;
        material.needsUpdate = true;
      }
      if (caseColor !== undefined) {
        const tint = new Color(ROOM_COLORS[caseColor]);
        // Multiply once per final material; graph leases share these instances, so clones never compound it.
        for (const material of finals) {
          if (!(material instanceof MeshStandardMaterial) || material.map) throw invalid();
          material.color.multiply(tint);
        }
      }
      const size = box.getSize(new Vector3()), center = box.getCenter(new Vector3());
      const scale = Math.min(size.x ? bounds.width / size.x : Infinity, size.y ? bounds.height / size.y : Infinity, size.z ? bounds.depth / size.z : Infinity);
      if (!Number.isFinite(scale) || scale <= 0) throw invalid();
      const root = new Group();
      root.name = 'admitted-prop-visual';
      gltf.scene.scale.setScalar(scale);
      gltf.scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
      root.add(gltf.scene);
      const visual = lease(root);
      if (!fitsRoomPropVisual(visual, bounds)) { visual.dispose(); throw invalid(); }
      return visual;
    } catch (error) {
      try { disposeResources(); } catch (cleanup) { throw new AggregateError([error, cleanup], 'Prop staging and cleanup failed.'); }
      throw error;
    } finally {
      // Local abort is not physical cancellation. Retain the reservation through every late dependency.
      while (pending.size) await Promise.allSettled([...pending]);
      loading = false;
    }
  })();
  try {
    return await new Promise<RoomPropVisual>((resolve, reject) => {
      const cancelled = () => reject(active.reason);
      active.addEventListener('abort', cancelled, { once: true });
      if (active.aborted) cancelled();
      void work.then(visual => {
        active.removeEventListener('abort', cancelled);
        if (active.aborted) { try { visual.dispose(); } catch { reportCleanup(); } reject(active.reason); }
        else resolve(visual);
      }, error => { active.removeEventListener('abort', cancelled); reject(error); });
    });
  } finally {
    clearTimeout(deadline);
    signal.removeEventListener('abort', abort);
    active.removeEventListener('abort', abandon);
  }
}
