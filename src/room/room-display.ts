import { Mesh, Raycaster, Vector2, type Camera, type Material, type Object3D, type Scene, type ShaderMaterial, type Texture } from 'three';
import { createPaintMaterial } from './room-paint.ts';
import type { RoomInspectionBinding, RoomSelection } from './room-inspection.ts';
import { getFurnishingEnvelope, type createProceduralRoom } from './procedural-room.ts';
import type { RoomPropRequest, RoomRenderIdentity } from './room-prop-request.ts';
import { fitsRoomPropVisual, type RoomPropVisual } from './room-prop-visual.ts';

type Room = { scene: Scene; dispose: () => void } & Partial<Pick<ReturnType<typeof createProceduralRoom>, 'layout' | 'replaceFurnishingVisual'>>;
type InstalledVisual = { visual: RoomPropVisual; generation: number };

export function createRoomDisplay(options: {
  initial: Room;
  camera: Camera;
  draw: (scene: Scene, camera: Camera) => void;
  onCleanupError?: () => void;
  onUnavailable?: () => void;
}) {
  let current = options.initial;
  let inspection: RoomInspectionBinding | null = null;
  let identity: RoomRenderIdentity | null = null;
  let installedVisuals = new Map<string, InstalledVisual>();
  const raycaster = new Raycaster();
  let disposed = false;
  let installing = false;
  const released = new WeakSet<Room>();
  // A painting belongs to one installed room revision; any install or disposal releases it.
  let painting: ShaderMaterial | null = null;
  function releasePainting() {
    const owned = painting;
    painting = null;
    if (owned) cleanup(() => { (owned.uniforms.paintMap.value as Texture).dispose(); owned.dispose(); });
  }
  function release(room: Room) {
    if (released.has(room)) return;
    released.add(room);
    try { room.dispose(); }
    catch {
      // Cleanup or its observer must never report rollback after a committed swap.
      try { options.onCleanupError?.(); } catch { /* Ownership is already settled. */ }
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    inspection = null;
    identity = null;
    installedVisuals.clear();
    release(current);
    releasePainting();
  }
  function render() {
    if (disposed) return false;
    options.draw(current.scene, options.camera);
    return !disposed;
  }
  function pick(x: number, y: number, bounds: { left: number; top: number; width: number; height: number }): RoomSelection | null {
    if (disposed || installing || !inspection || ![x, y, bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite)
      || bounds.width <= 0 || bounds.height <= 0 || x < bounds.left || x > bounds.left + bounds.width
      || y < bounds.top || y > bounds.top + bounds.height) return null;
    current.scene.updateMatrixWorld(true);
    options.camera.updateWorldMatrix(true, false);
    raycaster.layers.mask = options.camera.layers.mask;
    raycaster.setFromCamera(new Vector2((x - bounds.left) / bounds.width * 2 - 1, 1 - (y - bounds.top) / bounds.height * 2), options.camera);
    for (const hit of raycaster.intersectObjects(current.scene.children, true)) {
      let visible = true;
      for (let object: Object3D | null = hit.object; object; object = object.parent) {
        if (!object.visible) { visible = false; break; }
      }
      if (!visible) continue;
      if (hit.object instanceof Mesh) {
        const material = Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex ?? 0] : hit.object.material;
        if (!material?.visible) continue;
      }
      // Clip in camera space, including an off-axis lens; ray distance is not clip depth.
      const depth = hit.point.clone().project(options.camera).z;
      if (!Number.isFinite(depth) || depth < -1 || depth > 1) continue;
      for (let object: Object3D | null = hit.object; object; object = object.parent) {
        for (const [objectId, bound] of inspection.bindings) {
          if (object === bound) return { unit: inspection.unit, objectId };
        }
      }
      return null;
    }
    return null;
  }
  function cleanup(action: () => void) {
    try { action(); } catch { try { options.onCleanupError?.(); } catch { /* Ownership is already settled. */ } }
  }
  function restore() {
    if (disposed) return;
    try { render(); }
    catch {
      dispose();
      try { options.onUnavailable?.(); } catch { /* Display remains unavailable. */ }
    }
  }
  function furnishing(room: Room, binding: RoomInspectionBinding | null | undefined, objectId: string) {
    const wrapper = binding?.bindings.get(objectId);
    const furnishings = room.scene.getObjectByName('furnishings');
    const index = wrapper && furnishings ? furnishings.children.indexOf(wrapper) : -1;
    if (!wrapper || index < 0 || !room.layout || !room.replaceFurnishingVisual || wrapper.children.length !== 1) return null;
    return { wrapper, index, envelope: getFurnishingEnvelope(room.layout, index) };
  }
  function install(candidate: Room, binding?: RoomInspectionBinding, renderIdentity?: RoomRenderIdentity) {
    if (disposed || installing || candidate === current || released.has(candidate)) return false;
    if (renderIdentity && (typeof renderIdentity.unit !== 'symbol' || !Number.isSafeInteger(renderIdentity.revision) || renderIdentity.revision < 0)) return false;
    const sameCase = identity !== null && renderIdentity?.unit === identity.unit;
    if (sameCase && renderIdentity!.revision <= identity!.revision) return false;
    const nextVisuals = new Map<string, InstalledVisual>();
    installing = true;
    try {
      if (sameCase) {
        for (const [objectId, owned] of installedVisuals) {
          const target = furnishing(candidate, binding, objectId);
          if (!target) return false;
          const visual = owned.visual.clone();
          let adopted = false;
          try {
            if (!fitsRoomPropVisual(visual, target.envelope)) return false;
            const previous = candidate.replaceFurnishingVisual!(target.index, visual);
            adopted = true;
            nextVisuals.set(objectId, { visual, generation: owned.generation });
            cleanup(previous);
          } finally { if (!adopted) cleanup(visual.dispose); }
        }
      }
      try { options.draw(candidate.scene, options.camera); }
      catch { restore(); return false; }
      if (disposed) return false;
      const previous = current;
      current = candidate;
      inspection = binding ? { unit: binding.unit, bindings: new Map(binding.bindings) } : null;
      identity = renderIdentity ? { ...renderIdentity } : null;
      installedVisuals = nextVisuals;
      release(previous);
      releasePainting();
      return true;
    } catch { return false; }
    finally { installing = false; }
  }
  function propTarget(request: RoomPropRequest, visual: RoomPropVisual) {
    if (!identity || request.owner.unit !== identity.unit || request.owner.revision !== identity.revision
      || !Number.isSafeInteger(request.owner.generation) || request.owner.generation <= 0
      || request.owner.generation <= (installedVisuals.get(request.owner.objectId)?.generation ?? 0) || visual.root.parent) return null;
    const target = furnishing(current, inspection, request.owner.objectId);
    if (!target || !Object.entries(target.envelope).every(([key, value]) => request.envelope[key as keyof typeof target.envelope] === value)
      || !fitsRoomPropVisual(visual, target.envelope)) return null;
    return target;
  }
  function installProp(request: RoomPropRequest, visual: RoomPropVisual, isCurrent: () => boolean) {
    if (disposed || installing) return false;
    installing = true;
    let drew = false;
    try {
      const target = propTarget(request, visual);
      if (!target || !isCurrent()) return false;
      // Clone only the graph; preview meshes borrow resources and must never dispose them.
      const path: number[] = [];
      let original: Object3D = target.wrapper;
      while (original !== current.scene) {
        if (!original.parent) return false;
        path.unshift(original.parent.children.indexOf(original));
        original = original.parent;
      }
      const preview = current.scene.clone(true);
      let wrapper: Object3D = preview;
      for (const index of path) wrapper = wrapper.children[index];
      wrapper.clear().add(visual.root.clone(true));
      drew = true;
      options.draw(preview, options.camera);
      if (disposed || !isCurrent() || !propTarget(request, visual)) { restore(); return false; }
      const previous = current.replaceFurnishingVisual!(target.index, visual);
      installedVisuals.set(request.owner.objectId, { visual, generation: request.owner.generation });
      cleanup(previous);
      return true;
    } catch { if (drew) restore(); return false; }
    finally { installing = false; }
  }
  // Paints every non-prop, non-wall mesh of the exact displayed revision; on success the display owns the texture.
  // Owner rule: walls (left/right/front/doorway-wall) are never painted; EVA always draws them as plain walls.
  function paint(target: RoomRenderIdentity, texture: Texture) {
    if (disposed || installing || !identity || target.unit !== identity.unit || target.revision !== identity.revision) return false;
    installing = true;
    const swaps: [Mesh, Material | Material[]][] = [];
    let material: ShaderMaterial | undefined;
    try {
      material = createPaintMaterial(texture);
      const props = new Set<Object3D>([...installedVisuals.values()].map(item => item.visual.root));
      const keep = (object: Object3D) => { for (let node: Object3D | null = object; node; node = node.parent) if (props.has(node)) return true; return isWall(object); };
      current.scene.traverse(object => { if (object instanceof Mesh && !keep(object)) swaps.push([object, object.material]); });
      for (const [mesh] of swaps) mesh.material = material;
      options.draw(current.scene, options.camera);
      if (disposed) return false;
      releasePainting();
      painting = material;
      return true;
    } catch {
      for (const [mesh, original] of swaps) mesh.material = original;
      material?.dispose();
      restore();
      return false;
    } finally { installing = false; }
  }
  // The displayed object bound to an inspection id, for presentation only (construction placeholders).
  const objectFor = (objectId: string) => disposed ? null : inspection?.bindings.get(objectId) ?? null;
  return { install, installProp, paint, render, pick, dispose, objectFor };
}

// Owner rule: walls are never painted. Only a construction fixture declaring paintedWalls: true is exempt.
export function isWall(object: Object3D) {
  for (let node: Object3D | null = object; node; node = node.parent) if (node.name.endsWith('-wall')) return true;
  return false;
}
