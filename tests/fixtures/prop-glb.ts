import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { pngChunk, pngFile, pngHeader, pngScanlines } from './prop-reference-png.ts';

// Editable test documents deliberately permit malformed field mutations.
export type GlbFixtureJson = Record<string, any>;
export function glbFile(json: unknown, bin: Uint8Array): ArrayBuffer {
  const text = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonLength = Math.ceil(text.length / 4) * 4;
  const binLength = Math.ceil(bin.length / 4) * 4;
  const bytes = Buffer.alloc(28 + jsonLength + binLength);
  bytes.writeUInt32LE(0x46546c67, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(jsonLength, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  bytes.fill(0x20, 20, 20 + jsonLength);
  bytes.set(text, 20);
  bytes.writeUInt32LE(binLength, 20 + jsonLength);
  bytes.writeUInt32LE(0x004e4942, 24 + jsonLength);
  bytes.set(bin, 28 + jsonLength);
  return Uint8Array.from(bytes).buffer;
}
export function meshRecord(bytes: ArrayBuffer) {
  return { bytes: bytes.byteLength, sha256: createHash('sha256').update(new Uint8Array(bytes)).digest('hex') };
}
export function checkerPng(): Uint8Array {
  const rows = pngScanlines(32, 32);
  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 32; x += 1) rows.set((Math.floor(x / 4) + Math.floor(y / 4)) % 2
      ? [79, 102, 97] : [180, 138, 69], y * 97 + 1 + x * 3);
  }
  return pngFile(pngHeader(32, 32), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND'));
}
type Geometry = { position: number[]; normal: number[]; uv: number[]; index: number[] };
function cuboid(geometry: Geometry, center: number[], half: number[]) {
  const faces = [
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  ];
  for (const [normal, u, v] of faces) {
    const first = geometry.position.length / 3;
    for (const [s, t] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      geometry.position.push(...center.map((value, axis) => value + half[axis] * (normal[axis] + s * u[axis] + t * v[axis])));
      geometry.normal.push(...normal);
      geometry.uv.push((s + 1) / 2, (t + 1) / 2);
    }
    geometry.index.push(first, first + 1, first + 2, first, first + 2, first + 3);
  }
}
export function chairFixture(options: { textured?: boolean; image?: Uint8Array; instances?: number } = {}) {
  const textured = options.textured !== false;
  const json: GlbFixtureJson = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    buffers: [{ byteLength: 0 }], bufferViews: [], accessors: [], meshes: [{ primitives: [] }],
    materials: [
      { pbrMetallicRoughness: { baseColorFactor: textured ? [1, 1, 1, 1] : [0.31, 0.4, 0.38, 1], metallicFactor: 0, roughnessFactor: 0.85,
        ...(textured ? { baseColorTexture: { index: 0, texCoord: 0 } } : {}) }, alphaMode: 'OPAQUE', doubleSided: false },
      { pbrMetallicRoughness: { baseColorFactor: [0.32, 0.26, 0.23, 1], metallicFactor: 0, roughnessFactor: 0.9 }, alphaMode: 'OPAQUE', doubleSided: false },
    ],
  };
  const parts: Buffer[] = [];
  let length = 0;
  const view = (bytes: Uint8Array, target?: number) => {
    const pad = (4 - length % 4) % 4;
    if (pad) { parts.push(Buffer.alloc(pad)); length += pad; }
    const index = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, ...(target === undefined ? {} : { target }) });
    parts.push(Buffer.from(bytes));
    length += bytes.length;
    return index;
  };
  const attribute = (values: number[], components: number, position = false) => {
    const floats = Float32Array.from(values);
    const bytes = Buffer.alloc(floats.length * 4);
    for (let index = 0; index < floats.length; index += 1) bytes.writeFloatLE(floats[index], index * 4);
    const min = Array.from({ length: components }, (_, axis) => Math.min(...Array.from(floats).filter((_, index) => index % components === axis)));
    const max = Array.from({ length: components }, (_, axis) => Math.max(...Array.from(floats).filter((_, index) => index % components === axis)));
    const index = json.accessors.length;
    json.accessors.push({ bufferView: view(bytes, 34962), byteOffset: 0, componentType: 5126,
      count: floats.length / components, type: `VEC${components}`, ...(position ? { min, max } : {}) });
    return index;
  };
  for (let material = 0; material < 2; material += 1) {
    const geometry: Geometry = { position: [], normal: [], uv: [], index: [] };
    if (material === 0) {
      cuboid(geometry, [0, 0.58, 0], [0.3, 0.06, 0.3]);
      cuboid(geometry, [0, 0.82, 0.26], [0.3, 0.18, 0.04]);
    } else {
      for (const x of [-0.24, 0.24]) for (const z of [-0.24, 0.24]) cuboid(geometry, [x, 0.26, z], [0.04, 0.26, 0.04]);
    }
    const attributes = { POSITION: attribute(geometry.position, 3, true), NORMAL: attribute(geometry.normal, 3), TEXCOORD_0: attribute(geometry.uv, 2) };
    const indices = Buffer.alloc(geometry.index.length * 2);
    geometry.index.forEach((value, index) => indices.writeUInt16LE(value, index * 2));
    const accessor = json.accessors.length;
    json.accessors.push({ bufferView: view(indices, 34963), byteOffset: 0, componentType: 5123, count: geometry.index.length, type: 'SCALAR' });
    json.meshes[0].primitives.push({ attributes, indices: accessor, material, mode: 4 });
  }
  if (textured) {
    json.images = [{ bufferView: view(options.image ?? checkerPng()), mimeType: 'image/png' }];
    json.samplers = [{ magFilter: 9729, minFilter: 9729, wrapS: 33071, wrapT: 33071 }];
    json.textures = [{ sampler: 0, source: 0 }];
  }
  const instances = options.instances ?? 1;
  if (!Number.isInteger(instances) || instances < 1 || instances > 65) throw new Error('Fixture node allocation is bounded.');
  json.nodes = Array.from({ length: instances }, () => ({ mesh: 0 }));
  json.scenes[0].nodes = json.nodes.map((_: unknown, index: number) => index);
  json.buffers[0].byteLength = length;
  const bin = Uint8Array.from(Buffer.concat(parts));
  return { json, bin, bytes: glbFile(json, bin) };
}
export function denseTriangleFixture(vertexCount: number, indexCount = 3, instances = 1) {
  if (!Number.isInteger(vertexCount) || vertexCount < 3 || vertexCount > 100001
    || !Number.isInteger(indexCount) || indexCount < 3 || indexCount > 300003 || indexCount % 3
    || !Number.isInteger(instances) || instances < 1 || instances > 2) throw new Error('Fixture allocation is bounded.');
  const positions = Buffer.alloc(vertexCount * 12);
  positions.writeFloatLE(1, 12);
  positions.writeFloatLE(1, 28);
  positions.writeFloatLE(1, 32);
  const normals = Buffer.alloc(vertexCount * 12);
  for (let index = 0; index < vertexCount; index += 1) normals.writeFloatLE(1, index * 12 + 4);
  const uv = Buffer.alloc(vertexCount * 8);
  const indices = Buffer.alloc(indexCount * 4);
  for (let index = 0; index < indexCount; index += 1) indices.writeUInt32LE(index % 3, index * 4);
  const bin = Uint8Array.from(Buffer.concat([positions, normals, uv, indices]));
  const json: GlbFixtureJson = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: Array.from({ length: instances }, (_, index) => index) }],
    nodes: Array.from({ length: instances }, () => ({ mesh: 0 })), buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.length, target: 34962 },
      { buffer: 0, byteOffset: positions.length, byteLength: normals.length, target: 34962 },
      { buffer: 0, byteOffset: positions.length + normals.length, byteLength: uv.length, target: 34962 },
      { buffer: 0, byteOffset: positions.length + normals.length + uv.length, byteLength: indices.length, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, type: 'VEC3', count: vertexCount, min: [0, 0, 0], max: [1, 1, 1] },
      { bufferView: 1, componentType: 5126, type: 'VEC3', count: vertexCount },
      { bufferView: 2, componentType: 5126, type: 'VEC2', count: vertexCount },
      { bufferView: 3, componentType: 5125, type: 'SCALAR', count: indexCount },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0, mode: 4 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.31, 0.4, 0.38, 1], metallicFactor: 0, roughnessFactor: 1 }, alphaMode: 'OPAQUE', doubleSided: false }],
  };
  return { json, bin, bytes: glbFile(json, bin) };
}

export type ChairFixture = ReturnType<typeof chairFixture>;
export function mutateChair(mutate: (fixture: ChairFixture) => void): ArrayBuffer {
  const fixture = chairFixture();
  mutate(fixture);
  return glbFile(fixture.json, fixture.bin);
}
