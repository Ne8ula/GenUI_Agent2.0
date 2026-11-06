import { validatePropPng } from './prop-png-admission.ts';

const invalid = () => new Error('GLB contains unsupported, invalid or excessive prop data.');
const maxBytes = 8 * 1024 * 1024;
type JsonObject = Record<string, unknown>;
type View = { offset: number; length: number; target: number | undefined };
type Accessor = { view: number; offset: number; count: number; component: number; components: number; size: number; min?: number[]; max?: number[] };
type Primitive = { position: number; normal?: number; uv?: number; indices: number; material?: number };
export type PropGlbAdmission = {
  bounds: { min: number[]; max: number[] };
  resources: { nodes: number; meshes: number; primitives: number; vertices: number; indices: number; triangles: number;
    materials: number; textures: number; images: number; geometryBytes: number; textureBytes: number };
};
function object(value: unknown, keys: string[]): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !keys.includes(key))) throw invalid();
  return value as JsonObject;
}
function list(value: unknown, max: number, min = 0): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw invalid();
  return value;
}
function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw invalid();
  return value;
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw invalid();
  return value;
}
function vector(value: unknown, length: number, min: number, max: number): number[] {
  return list(value, length, length).map(item => number(item, min, max));
}
function reference(value: unknown, items: unknown[]): number { return integer(value, 0, items.length - 1); }
// Owner-approved 8M: exporter labels are bounded opaque strings, never interpreted, displayed or used.
function label(value: unknown) {
  if (typeof value !== 'string' || value.length > 256 || /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value)) throw invalid();
}
function named(value: unknown, keys: string[]): JsonObject {
  const entry = object(value, [...keys, 'name']);
  if (entry.name !== undefined) label(entry.name);
  return entry;
}
function allUsed(used: Set<number>, items: unknown[]) { if (used.size !== items.length) throw invalid(); }

function document(bytes: Uint8Array): JsonObject {
  if (bytes.length > 256 * 1024) throw invalid();
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); } catch { throw invalid(); }
  let depth = 0;
  let containers = 0;
  let quoted = false;
  let escaped = false;
  let end = false;
  // Bound the parsed object graph before JSON.parse allocates it. Braces inside strings are data.
  for (const char of text) {
    if (end) { if (char !== ' ') throw invalid(); continue; }
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{' || char === '[') {
      if (++depth > 16 || ++containers > 4096) throw invalid();
    } else if (char === '}' || char === ']') {
      if (--depth < 0) throw invalid();
      if (depth === 0) end = true;
    }
  }
  if (quoted || depth || !end) throw invalid();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw invalid(); }
  return object(parsed, ['asset', 'scene', 'scenes', 'nodes', 'buffers', 'bufferViews', 'accessors', 'meshes', 'materials', 'textures', 'images', 'samplers']);
}
function matrix(node: JsonObject): number[] {
  const t = node.translation === undefined ? [0, 0, 0] : vector(node.translation, 3, -1024, 1024);
  const s = node.scale === undefined ? [1, 1, 1] : vector(node.scale, 3, 0.001, 1000);
  const [x, y, z, w] = node.rotation === undefined ? [0, 0, 0, 1] : vector(node.rotation, 4, -1, 1);
  if (Math.abs(x * x + y * y + z * z + w * w - 1) > 1e-6) throw invalid();
  return [
    (1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0,
    2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
    2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}
function multiply(a: number[], b: number[]): number[] {
  const result = Array<number>(16).fill(0);
  for (let column = 0; column < 4; column += 1) for (let row = 0; row < 4; row += 1) {
    for (let index = 0; index < 4; index += 1) result[column * 4 + row] += a[index * 4 + row] * b[column * 4 + index];
  }
  if (!result.every(Number.isFinite)) throw invalid();
  return result;
}
function yieldScan(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 0);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

// shortcut: closed static embedded GLB subset, not a general glTF loader; new features require admission tests.
export async function validatePropGlb(bytes: ArrayBuffer, signal: AbortSignal): Promise<PropGlbAdmission> {
  signal.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', abort, { once: true });
  const deadline = setTimeout(() => controller.abort(new Error('GLB admission timed out.')), 15000);
  const active = controller.signal;
  try {
    if (!(bytes instanceof ArrayBuffer) || bytes.byteLength < 28 || bytes.byteLength > maxBytes || bytes.byteLength % 4) throw invalid();
    const data = new DataView(bytes);
    if (data.getUint32(0, true) !== 0x46546c67 || data.getUint32(4, true) !== 2 || data.getUint32(8, true) !== bytes.byteLength) throw invalid();
    const jsonLength = data.getUint32(12, true);
    const binHeader = 20 + jsonLength;
    if (!jsonLength || jsonLength % 4 || jsonLength > 256 * 1024 || binHeader + 8 > bytes.byteLength
      || data.getUint32(16, true) !== 0x4e4f534a || data.getUint32(binHeader + 4, true) !== 0x004e4942) throw invalid();
    const binLength = data.getUint32(binHeader, true);
    if (!binLength || binLength % 4 || binHeader + 8 + binLength !== bytes.byteLength) throw invalid();
    const root = document(new Uint8Array(bytes, 20, jsonLength));
    const asset = object(root.asset, ['version', 'generator']);
    if (asset.version !== '2.0') throw invalid();
    if (asset.generator !== undefined) label(asset.generator);
    const scenes = list(root.scenes, 1, 1).map(value => named(value, ['nodes']));
    if (root.scene !== 0) throw invalid();
    const nodes = list(root.nodes, 64, 1).map(value => named(value, ['mesh', 'children', 'translation', 'rotation', 'scale']));
    const buffers = list(root.buffers, 1, 1).map(value => named(value, ['byteLength']));
    const bufferLength = integer(buffers[0].byteLength, 1, binLength);
    if (Math.ceil(bufferLength / 4) * 4 !== binLength) throw invalid();
    for (let index = bufferLength; index < binLength; index += 1) if (data.getUint8(binHeader + 8 + index) !== 0) throw invalid();
    const bin = new DataView(bytes, binHeader + 8, bufferLength);
    const views: View[] = list(root.bufferViews, 256, 1).map(value => {
      const entry = named(value, ['buffer', 'byteOffset', 'byteLength', 'target']);
      if (entry.buffer !== 0) throw invalid();
      const offset = integer(entry.byteOffset === undefined ? 0 : entry.byteOffset, 0, bufferLength);
      const length = integer(entry.byteLength, 1, bufferLength);
      const target = entry.target === undefined ? undefined : integer(entry.target, 34962, 34963);
      if (offset % 4 || offset + length > bufferLength) throw invalid();
      return { offset, length, target };
    });
    let previousEnd = 0;
    for (const view of [...views].sort((a, b) => a.offset - b.offset)) {
      if (view.offset < previousEnd) throw invalid();
      previousEnd = view.offset + view.length;
    }
    const accessors: Accessor[] = list(root.accessors, 256, 1).map(value => {
      const entry = named(value, ['bufferView', 'byteOffset', 'componentType', 'count', 'type', 'min', 'max']);
      const view = reference(entry.bufferView, views);
      const component = integer(entry.componentType, 5123, 5126);
      if (![5123, 5125, 5126].includes(component)) throw invalid();
      const size = component === 5123 ? 2 : 4;
      const components = entry.type === 'SCALAR' ? 1 : entry.type === 'VEC2' ? 2 : entry.type === 'VEC3' ? 3 : 0;
      if (!components) throw invalid();
      const count = integer(entry.count, 1, 300000);
      const offset = integer(entry.byteOffset === undefined ? 0 : entry.byteOffset, 0, views[view].length);
      if (offset % size || offset + count * components * size > views[view].length) throw invalid();
      const min = entry.min === undefined ? undefined : vector(entry.min, components, -4294967295, 4294967295);
      const max = entry.max === undefined ? undefined : vector(entry.max, components, -4294967295, 4294967295);
      return { view, offset: views[view].offset + offset, count, component, components, size, min, max };
    });
    // Material-less primitives use the staging layer's matte default; every declared material must still be used.
    const materials = list(root.materials === undefined ? [] : root.materials, 16).map(value => named(value, ['pbrMetallicRoughness', 'alphaMode', 'doubleSided']));
    const textures = list(root.textures === undefined ? [] : root.textures, 4).map(value => named(value, ['sampler', 'source']));
    const images = list(root.images === undefined ? [] : root.images, 4).map(value => named(value, ['bufferView', 'mimeType']));
    const samplers = list(root.samplers === undefined ? [] : root.samplers, 4).map(value => named(value, ['magFilter', 'minFilter', 'wrapS', 'wrapT']));
    const usedMaterials = new Set<number>();
    const usedAccessors = new Set<number>();
    const usedViews = new Set<number>();
    const roles = new Map<number, string>();
    const viewRoles = new Map<number, string>();
    const useView = (index: number, role: string) => {
      const previous = viewRoles.get(index);
      if (previous && previous !== role) throw invalid();
      const target = views[index].target;
      if (role === 'image' ? target !== undefined : target !== undefined && target !== (role === 'indices' ? 34963 : 34962)) throw invalid();
      viewRoles.set(index, role);
      usedViews.add(index);
    };
    const useAccessor = (value: unknown, role: string) => {
      const index = reference(value, accessors);
      const accessor = accessors[index];
      if (roles.has(index) && roles.get(index) !== role) throw invalid();
      if (role === 'indices') {
        if (accessor.components !== 1 || accessor.component === 5126 || accessor.count % 3) throw invalid();
      } else if (accessor.component !== 5126 || accessor.components !== (role === 'uv' ? 2 : 3)) throw invalid();
      if (role === 'position' && (!accessor.min || !accessor.max)) throw invalid();
      useView(accessor.view, role === 'indices' ? 'indices' : 'attribute');
      roles.set(index, role);
      usedAccessors.add(index);
      return index;
    };
    const meshes: Primitive[][] = list(root.meshes, 32, 1).map(value => {
      const mesh = named(value, ['primitives']);
      return list(mesh.primitives, 64, 1).map(value => {
        const primitive = object(value, ['attributes', 'indices', 'material', 'mode']);
        if (primitive.mode !== undefined && primitive.mode !== 4) throw invalid();
        const attributes = object(primitive.attributes, ['POSITION', 'NORMAL', 'TEXCOORD_0']);
        const position = useAccessor(attributes.POSITION, 'position');
        // Absent normals are computed during staging; present normals keep every existing rule.
        const normal = attributes.NORMAL === undefined ? undefined : useAccessor(attributes.NORMAL, 'normal');
        const uv = attributes.TEXCOORD_0 === undefined ? undefined : useAccessor(attributes.TEXCOORD_0, 'uv');
        const indices = useAccessor(primitive.indices, 'indices');
        const material = primitive.material === undefined ? undefined : reference(primitive.material, materials);
        if ((normal !== undefined && accessors[normal].count !== accessors[position].count)
          || (uv !== undefined && accessors[uv].count !== accessors[position].count)) throw invalid();
        if (material !== undefined) usedMaterials.add(material);
        return { position, normal, uv, indices, material };
      });
    });
    allUsed(usedMaterials, materials);
    allUsed(usedAccessors, accessors);
    const usedTextures = new Set<number>();
    const materialTextures = materials.map(material => {
      if ((material.alphaMode !== undefined && material.alphaMode !== 'OPAQUE') || (material.doubleSided !== undefined && material.doubleSided !== false)) throw invalid();
      const pbr = object(material.pbrMetallicRoughness === undefined ? {} : material.pbrMetallicRoughness, ['baseColorFactor', 'metallicFactor', 'roughnessFactor', 'baseColorTexture']);
      if (pbr.baseColorFactor !== undefined && vector(pbr.baseColorFactor, 4, 0, 1)[3] !== 1) throw invalid();
      if (pbr.metallicFactor !== undefined) number(pbr.metallicFactor, 0, 1);
      if (pbr.roughnessFactor !== undefined) number(pbr.roughnessFactor, 0, 1);
      if (pbr.baseColorTexture === undefined) return undefined;
      const texture = object(pbr.baseColorTexture, ['index', 'texCoord']);
      if (texture.texCoord !== undefined && texture.texCoord !== 0) throw invalid();
      const index = reference(texture.index, textures);
      usedTextures.add(index);
      return index;
    });
    allUsed(usedTextures, textures);
    for (const mesh of meshes) for (const primitive of mesh) {
      if (primitive.material !== undefined && materialTextures[primitive.material] !== undefined && primitive.uv === undefined) throw invalid();
    }
    const usedImages = new Set<number>();
    const usedSamplers = new Set<number>();
    const textureSources = textures.map(texture => {
      const source = reference(texture.source, images);
      usedImages.add(source);
      usedSamplers.add(reference(texture.sampler, samplers));
      return source;
    });
    allUsed(usedImages, images);
    allUsed(usedSamplers, samplers);
    for (const sampler of samplers) {
      if (![9728, 9729].includes(sampler.minFilter as number) || ![9728, 9729].includes(sampler.magFilter as number)
        || sampler.wrapS !== 33071 || sampler.wrapT !== 33071) throw invalid();
    }
    let encodedImages = 0;
    const imageBytes = images.map(image => {
      if (image.mimeType !== 'image/png') throw invalid();
      const index = reference(image.bufferView, views);
      useView(index, 'image');
      const view = views[index];
      encodedImages += view.length;
      if (view.length > 2 * 1024 * 1024 || encodedImages > 4 * 1024 * 1024) throw invalid();
      return new Uint8Array(bytes, binHeader + 8 + view.offset, view.length);
    });
    allUsed(usedViews, views);

    const instances: { mesh: number; transform: number[] }[] = [];
    const usedNodes = new Set<number>();
    const usedMeshes = new Set<number>();
    const visit = (index: number, parent: number[], depth: number) => {
      if (depth > 16 || usedNodes.has(index)) throw invalid();
      usedNodes.add(index);
      const node = nodes[index];
      const transform = multiply(parent, matrix(node));
      if (node.mesh !== undefined) {
        const mesh = reference(node.mesh, meshes);
        instances.push({ mesh, transform });
        usedMeshes.add(mesh);
      }
      for (const child of list(node.children === undefined ? [] : node.children, 64)) visit(reference(child, nodes), transform, depth + 1);
    };
    const identity = matrix({});
    for (const node of list(scenes[0].nodes, 64, 1)) visit(reference(node, nodes), identity, 1);
    allUsed(usedNodes, nodes);
    allUsed(usedMeshes, meshes);
    const resources: PropGlbAdmission['resources'] = {
      nodes: nodes.length, meshes: meshes.length, primitives: 0, vertices: 0, indices: 0, triangles: 0,
      materials: materials.length, textures: textures.length, images: images.length, geometryBytes: 0, textureBytes: 0,
    };
    for (const instance of instances) for (const primitive of meshes[instance.mesh]) {
      resources.primitives += 1;
      resources.vertices += accessors[primitive.position].count;
      resources.indices += accessors[primitive.indices].count;
      resources.triangles += accessors[primitive.indices].count / 3;
      for (const index of [primitive.position, primitive.normal, primitive.uv, primitive.indices]) {
        if (index !== undefined) { const entry = accessors[index]; resources.geometryBytes += entry.count * entry.components * entry.size; }
      }
      // Computed normals still cost three floats per vertex, so budgets hold either way.
      if (primitive.normal === undefined) resources.geometryBytes += accessors[primitive.position].count * 12;
      if (resources.primitives > 64 || resources.vertices > 100000 || resources.indices > 300000
        || resources.triangles > 100000 || resources.geometryBytes > maxBytes) throw invalid();
    }

    const read = (entry: Accessor, index: number) => entry.component === 5126 ? bin.getFloat32(entry.offset + index * 4, true)
      : entry.component === 5123 ? bin.getUint16(entry.offset + index * 2, true) : bin.getUint32(entry.offset + index * 4, true);
    let work = 0;
    for (let index = 0; index < accessors.length; index += 1) {
      const entry = accessors[index];
      const role = roles.get(index)!;
      const min = Array<number>(entry.components).fill(Infinity);
      const max = Array<number>(entry.components).fill(-Infinity);
      for (let item = 0; item < entry.count; item += 1) {
        let magnitude = 0;
        for (let axis = 0; axis < entry.components; axis += 1) {
          const value = read(entry, item * entry.components + axis);
          const lower = role === 'position' ? -1024 : role === 'normal' ? -1 : 0;
          const upper = role === 'position' ? 1024 : role === 'indices' ? 4294967295 : 1;
          number(value, lower, upper);
          min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
          magnitude += value * value;
        }
        if (role === 'normal' && magnitude === 0) throw invalid();
        if (++work % 2048 === 0) await yieldScan(active);
      }
      if (entry.min?.some((value, axis) => value !== min[axis]) || entry.max?.some((value, axis) => value !== max[axis])) throw invalid();
    }
    const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const instance of instances) for (const primitive of meshes[instance.mesh]) {
      const position = accessors[primitive.position];
      const indices = accessors[primitive.indices];
      for (let index = 0; index < indices.count; index += 1) {
        if (read(indices, index) >= position.count) throw invalid();
        if (++work % 2048 === 0) await yieldScan(active);
      }
      const m = instance.transform;
      for (let index = 0; index < position.count; index += 1) {
        const x = read(position, index * 3), y = read(position, index * 3 + 1), z = read(position, index * 3 + 2);
        for (let axis = 0; axis < 3; axis += 1) {
          const value = number(m[axis] * x + m[4 + axis] * y + m[8 + axis] * z + m[12 + axis], -1024, 1024);
          bounds.min[axis] = Math.min(bounds.min[axis], value); bounds.max[axis] = Math.max(bounds.max[axis], value);
        }
        if (++work % 2048 === 0) await yieldScan(active);
      }
    }
    if (!bounds.min.every(Number.isFinite) || !bounds.max.every(Number.isFinite)
      || !bounds.min.some((value, axis) => value < bounds.max[axis])) throw invalid();
    const dimensions: { width: number; height: number }[] = [];
    for (const image of imageBytes) { active.throwIfAborted(); dimensions.push(await validatePropPng(image, active)); }
    // Four bounded PNGs/textures also bound aggregate RGBA demand before any raster allocation exists.
    for (const source of textureSources) resources.textureBytes += dimensions[source].width * dimensions[source].height * 4;
    if (resources.textureBytes > 4 * 1024 * 1024) throw invalid();
    active.throwIfAborted();
    return { bounds, resources };
  } finally {
    clearTimeout(deadline);
    signal.removeEventListener('abort', abort);
  }
}
