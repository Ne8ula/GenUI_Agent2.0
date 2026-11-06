import assert from 'node:assert/strict';
import test from 'node:test';
import { deflateSync } from 'node:zlib';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { chairFixture, denseTriangleFixture, glbFile, mutateChair, type ChairFixture, type GlbFixtureJson } from './fixtures/prop-glb.ts';
import { pngChunk, pngFile, pngFixture, pngHeader, pngScanlines } from './fixtures/prop-reference-png.ts';

const modulePath = '../src/room/prop-glb-admission.ts';
type Admission = {
  bounds: { min: number[]; max: number[] };
  resources: { nodes: number; meshes: number; primitives: number; vertices: number; indices: number; triangles: number;
    materials: number; textures: number; images: number; geometryBytes: number; textureBytes: number };
};
type Validate = (bytes: ArrayBuffer, signal: AbortSignal) => Promise<Admission>;
async function validator(): Promise<Validate> { return (await import(modulePath)).validatePropGlb; }
const signal = () => new AbortController().signal;
function binaryMutation(bytes: ArrayBuffer, mutate: (view: DataView) => void) {
  const copy = bytes.slice(0); mutate(new DataView(copy)); return copy;
}
function near(actual: number[], expected: number[]) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-6, `${value} != ${expected[index]}`));
}
function float(fixture: ChairFixture, semantic: 'POSITION' | 'NORMAL' | 'TEXCOORD_0', value: number, component = 0) {
  const accessor = fixture.json.accessors[fixture.json.meshes[0].primitives[0].attributes[semantic]];
  const view = fixture.json.bufferViews[accessor.bufferView];
  new DataView(fixture.bin.buffer).setFloat32(view.byteOffset + (accessor.byteOffset ?? 0) + component * 4, value, true);
}
function chain(length: number) {
  const fixture = chairFixture();
  fixture.json.nodes = Array.from({ length }, (_, index) => index === length - 1 ? { mesh: 0 } : { children: [index + 1] });
  fixture.json.scenes[0].nodes = [0];
  return glbFile(fixture.json, fixture.bin);
}

test('real textured chair GLB is admitted without creating a loader bitmap object URL or GPU resource', async t => {
  const validate = await validator();
  let forbidden = 0;
  const reject = () => { forbidden += 1; throw new Error('Admission must precede decoding/render resources.'); };
  t.mock.method(GLTFLoader.prototype, 'parse', reject);
  t.mock.method(GLTFLoader.prototype, 'load', reject);
  t.mock.method(URL, 'createObjectURL', reject);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: reject });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'createImageBitmap', previous); else Reflect.deleteProperty(globalThis, 'createImageBitmap'); });
  const fixture = chairFixture();
  const before = new Uint8Array(fixture.bytes).slice();
  const admitted = await validate(fixture.bytes, signal());
  const edge = Math.fround(0.3);
  assert.deepEqual(admitted.bounds, { min: [-edge, 0, -edge], max: [edge, 1, edge] });
  assert.deepEqual(admitted.resources, { nodes: 1, meshes: 1, primitives: 2, vertices: 144, indices: 216, triangles: 72,
    materials: 2, textures: 1, images: 1, geometryBytes: 5040, textureBytes: 4096 });
  assert.deepEqual(new Uint8Array(fixture.bytes), before);
  assert.equal(forbidden, 0);
});

test('GLB header version lengths chunk order alignment and trailing bytes are rejected before PNG inflation', async t => {
  const validate = await validator();
  let decoders = 0;
  t.mock.method(globalThis, 'DecompressionStream', function () { decoders += 1; throw new Error('Bad GLB reached a decoder.'); });
  const bytes = chairFixture().bytes;
  const chunkLength = new DataView(bytes).getUint32(12, true);
  const unknownChunk = new Uint8Array(bytes.byteLength + 12);
  unknownChunk.set(new Uint8Array(bytes));
  const extra = new DataView(unknownChunk.buffer);
  extra.setUint32(8, unknownChunk.length, true);
  extra.setUint32(bytes.byteLength, 4, true);
  extra.setUint32(bytes.byteLength + 4, 0x4b4e554a, true);
  const malformed = [new ArrayBuffer(0), bytes.slice(0, 11), bytes.slice(0, -1),
    binaryMutation(bytes, view => view.setUint32(0, 0, true)),
    binaryMutation(bytes, view => view.setUint32(4, 1, true)),
    binaryMutation(bytes, view => view.setUint32(8, bytes.byteLength - 4, true)),
    binaryMutation(bytes, view => view.setUint32(8, bytes.byteLength + 4, true)),
    binaryMutation(bytes, view => view.setUint32(12, 0xffffffff, true)),
    binaryMutation(bytes, view => view.setUint32(12, chunkLength - 1, true)),
    binaryMutation(bytes, view => view.setUint32(16, 0x004e4942, true)),
    binaryMutation(bytes, view => view.setUint32(24 + chunkLength, 0x4e4f534a, true)),
    binaryMutation(bytes, view => view.setUint8(20, 0xff)), unknownChunk.buffer,
  ];
  for (const value of malformed) await assert.rejects(validate(value, signal()));
  assert.equal(decoders, 0);
});

test('file JSON nesting and container budgets reject before JSON.parse can build an oversized graph', async t => {
  const validate = await validator();
  const huge = chairFixture();
  const oldBin = huge.bin;
  huge.bin = new Uint8Array(8 * 1024 * 1024);
  huge.bin.set(oldBin);
  huge.json.buffers[0].byteLength = huge.bin.length;
  const oversizedJson = mutateChair(fixture => { fixture.json.extras = 'x'.repeat(256 * 1024); });
  const deep = mutateChair(fixture => {
    let nested: unknown = {};
    for (let depth = 0; depth < 17; depth += 1) nested = { value: nested };
    fixture.json.extras = nested;
  });
  const containers = mutateChair(fixture => { fixture.json.extras = Array.from({ length: 4096 }, () => ({})); });
  const inputs = [glbFile(huge.json, huge.bin), oversizedJson, deep, containers];
  const parse = JSON.parse;
  let parses = 0;
  t.mock.method(JSON, 'parse', (...args: Parameters<typeof parse>) => { parses += 1; return parse(...args); });
  for (const bytes of inputs) await assert.rejects(validate(bytes, signal()));
  assert.equal(parses, 0);
});

test('one embedded buffer and exact BIN coverage are required with only zero alignment padding', async () => {
  const validate = await validator();
  for (const mutate of [
    (f: ChairFixture) => { f.json.buffers = []; },
    (f: ChairFixture) => { f.json.buffers.push({ byteLength: 4 }); },
    (f: ChairFixture) => { f.json.buffers[0].uri = 'data:application/octet-stream;base64,AAAA'; },
    (f: ChairFixture) => { f.json.buffers[0].byteLength -= 4; },
    (f: ChairFixture) => { f.json.buffers[0].byteLength += 4; },
    (f: ChairFixture) => { f.json.buffers[0].byteLength = Number.MAX_SAFE_INTEGER; },
  ]) await assert.rejects(validate(mutateChair(mutate), signal()));
  const fixture = chairFixture({ image: pngFixture(1, 1) });
  const imageView = fixture.json.bufferViews.at(-1);
  // A declared buffer gap is harmless; only BIN alignment bytes beyond byteLength are padding.
  const padded = new Uint8Array(fixture.bin.length + (fixture.bin.length % 4 === 0 ? 1 : 0));
  padded.set(fixture.bin);
  fixture.json.buffers[0].byteLength = padded.length;
  assert.ok(imageView.byteOffset + imageView.byteLength <= padded.length);
  const valid = glbFile(fixture.json, padded);
  assert.ok(valid.byteLength - 28 - new DataView(valid).getUint32(12, true) > padded.length);
  await validate(valid, signal());
  const nonzeroPad = valid.slice(0); new Uint8Array(nonzeroPad)[nonzeroPad.byteLength - 1] = 1;
  await assert.rejects(validate(nonzeroPad, signal()));
});

test('all URI schemes extensions animations skins morphs cameras and unknown instructions fail closed', async t => {
  const validate = await validator();
  let fetches = 0;
  let decoderCalls = 0;
  t.mock.method(globalThis, 'fetch', () => { fetches += 1; throw new Error('No embedded resource fetch.'); });
  t.mock.method(globalThis, 'DecompressionStream', function () { decoderCalls += 1; throw new Error('Reject forbidden JSON before texture decode.'); });
  const mutations: ((f: ChairFixture) => void)[] = [
    ...['https://invalid.example/a.png', 'http://127.0.0.1:5173/secret', '//invalid.example/a.png', '../secret.png',
      'data:image/png;base64,AAAA', 'blob:synthetic', 'file:///private.png'].map(uri => (f: ChairFixture) => { f.json.images[0] = { uri }; }),
    ...['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu', 'KHR_materials_unlit']
      .map(name => (f: ChairFixture) => { f.json.extensionsUsed = [name]; f.json.extensionsRequired = [name]; }),
    f => { f.json.extensions = {}; }, f => { f.json.meshes[0].primitives[0].extensions = {}; },
    f => { f.json.images[0].extensions = {}; }, f => { f.json.materials[0].extensions = {}; },
    f => { f.json.animations = []; }, f => { f.json.skins = []; }, f => { f.json.nodes[0].skin = 0; },
    f => { f.json.nodes[0].weights = [0]; }, f => { f.json.meshes[0].weights = [0]; },
    f => { f.json.meshes[0].primitives[0].targets = []; }, f => { f.json.cameras = []; },
    f => { f.json.nodes[0].camera = 0; }, f => { f.json.extras = { code: 'alert(1)', permissions: ['execute'] }; },
    f => { f.json.meshes[0].primitives[0].attributes.JOINTS_0 = 0; },
    f => { f.json.meshes[0].primitives[0].attributes.WEIGHTS_0 = 0; },
    f => { f.json.install = true; }, f => { f.json.materials[0].script = 'run'; },
    f => { f.json.asset.version = '1.0'; },
  ];
  for (const mutate of mutations) await assert.rejects(validate(mutateChair(mutate), signal()));
  assert.equal(fetches, 0);
  assert.equal(decoderCalls, 0);
});

test('scene references must form a bounded acyclic uniquely parented reachable tree or forest', async () => {
  const validate = await validator();
  for (const mutate of [
    (f: ChairFixture) => { f.json.scene = 1; },
    (f: ChairFixture) => { f.json.scenes.push({ nodes: [0] }); },
    (f: ChairFixture) => { f.json.scenes[0].nodes = [0, 0]; },
    (f: ChairFixture) => { f.json.scenes[0].nodes = [-1]; },
    (f: ChairFixture) => { f.json.nodes[0].children = [0]; },
    (f: ChairFixture) => { f.json.nodes = [{ children: [1, 1] }, { mesh: 0 }]; },
    (f: ChairFixture) => { f.json.nodes = [{ children: [2] }, { children: [2] }, { mesh: 0 }]; f.json.scenes[0].nodes = [0, 1]; },
    (f: ChairFixture) => { f.json.nodes.push({ mesh: 0 }); },
    (f: ChairFixture) => { f.json.nodes[0].mesh = 0.5; },
    (f: ChairFixture) => { f.json.nodes[0].mesh = 1; },
  ]) await assert.rejects(validate(mutateChair(mutate), signal()));
  assert.equal((await validate(chain(16), signal())).resources.nodes, 16);
  await assert.rejects(validate(chain(17), signal()));
  await assert.rejects(validate(chairFixture({ instances: 65 }).bytes, signal()));
});

test('node transforms and vertex data determine actual bounds rather than accessor declarations', async () => {
  const validate = await validator();
  const bytes = mutateChair(f => {
    f.json.nodes = [{ translation: [1, 0, 0], children: [1] },
      { mesh: 0, translation: [2, 0, -3], rotation: [0, Math.SQRT1_2, 0, Math.SQRT1_2], scale: [2, 0.5, 1] }];
  });
  const bounds = (await validate(bytes, signal())).bounds;
  const edge = Math.fround(0.3);
  near(bounds.min, [3 - edge, 0, -3 - 2 * edge]);
  near(bounds.max, [3 + edge, 0.5, -3 + 2 * edge]);
  for (const mutate of [
    (f: ChairFixture) => { f.json.accessors[0].min = [0, 0, 0]; f.json.accessors[0].max = [0, 0, 0]; },
    (f: ChairFixture) => { f.json.accessors[0].min = [-100, -100, -100]; f.json.accessors[0].max = [100, 100, 100]; },
    (f: ChairFixture) => { delete f.json.accessors[0].min; },
    (f: ChairFixture) => { f.json.nodes[0].translation = [1025, 0, 0]; },
    (f: ChairFixture) => { f.json.nodes[0].scale = [0, 1, 1]; },
    (f: ChairFixture) => { f.json.nodes[0].scale = [-1, 1, 1]; },
    (f: ChairFixture) => { f.json.nodes[0].scale = [0.0001, 1, 1]; },
    (f: ChairFixture) => { f.json.nodes[0].scale = [1001, 1, 1]; },
    (f: ChairFixture) => { f.json.nodes[0].rotation = [0, 0, 0, 0]; },
    (f: ChairFixture) => { f.json.nodes[0].rotation = [0, 0, 0, 2]; },
    (f: ChairFixture) => { f.json.nodes[0].matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
    (f: ChairFixture) => { f.json.nodes = [{ translation: [1024, 0, 0], children: [1] }, { mesh: 0, translation: [1, 0, 0] }]; },
  ]) await assert.rejects(validate(mutateChair(mutate), signal()));
});

test('actual binary float values must be finite bounded and semantically usable', async () => {
  const validate = await validator();
  for (const value of [NaN, Infinity, -Infinity, 1025, -1025]) {
    await assert.rejects(validate(mutateChair(f => float(f, 'POSITION', value)), signal()));
  }
  for (const value of [NaN, Infinity, 2]) await assert.rejects(validate(mutateChair(f => float(f, 'NORMAL', value)), signal()));
  await assert.rejects(validate(mutateChair(f => { for (let component = 0; component < 3; component += 1) float(f, 'NORMAL', 0, component); }), signal()));
  for (const value of [NaN, Infinity, -0.01, 1.01]) await assert.rejects(validate(mutateChair(f => float(f, 'TEXCOORD_0', value)), signal()));
});

test('buffer views and accessors enforce ranges alignment compatible roles and closed typed attributes', async () => {
  const validate = await validator();
  const mutations: ((f: ChairFixture) => void)[] = [
    f => { f.json.bufferViews[0].buffer = 1; }, f => { f.json.bufferViews[0].byteOffset = -4; },
    f => { f.json.bufferViews[0].byteOffset = 2; }, f => { f.json.bufferViews[0].byteLength = Number.MAX_SAFE_INTEGER; },
    f => { f.json.bufferViews[0].byteStride = 16; }, f => { f.json.bufferViews[0].target = 34963; },
    f => { f.json.bufferViews[1].byteOffset = f.json.bufferViews[0].byteOffset; },
    f => { f.json.accessors[0].bufferView = 999; }, f => { f.json.accessors[0].byteOffset = 2; },
    f => { f.json.accessors[0].count = Number.MAX_SAFE_INTEGER; }, f => { f.json.accessors[0].count = 1.5; },
    f => { f.json.accessors[0].count = 0; }, f => { f.json.accessors[0].componentType = 5122; },
    f => { f.json.accessors[0].type = 'MAT4'; }, f => { f.json.accessors[0].normalized = true; },
    f => { f.json.accessors[0].sparse = { count: 1 }; }, f => { f.json.accessors[1].count -= 1; },
    f => { f.json.meshes[0].primitives[0].attributes.COLOR_0 = 0; },
    f => { f.json.meshes[0].primitives[0].attributes.TANGENT = 0; },
    f => { delete f.json.meshes[0].primitives[0].attributes.NORMAL; },
    f => { delete f.json.meshes[0].primitives[0].attributes.TEXCOORD_0; },
    f => { f.json.meshes[0].primitives[0].attributes.POSITION = '0'; },
  ];
  for (const mutate of mutations) await assert.rejects(validate(mutateChair(mutate), signal()));
});

test('indices stay inside POSITION counts and only complete indexed triangles are admitted', async () => {
  const validate = await validator();
  for (const mutate of [
    (f: ChairFixture) => { f.json.meshes[0].primitives[0].mode = 5; },
    (f: ChairFixture) => { delete f.json.meshes[0].primitives[0].indices; },
    (f: ChairFixture) => { f.json.accessors[3].componentType = 5126; },
    (f: ChairFixture) => { f.json.accessors[3].type = 'VEC2'; },
    (f: ChairFixture) => { f.json.accessors[3].count -= 1; },
    (f: ChairFixture) => { const offset = f.json.bufferViews[f.json.accessors[3].bufferView].byteOffset;
      new DataView(f.bin.buffer).setUint16(offset, f.json.accessors[0].count, true); },
  ]) await assert.rejects(validate(mutateChair(mutate), signal()));
  const uint32 = denseTriangleFixture(3);
  assert.equal((await validate(uint32.bytes, signal())).resources.indices, 3);
  new DataView(uint32.bin.buffer).setUint32(uint32.json.bufferViews[3].byteOffset, 0xffffffff, true);
  await assert.rejects(validate(glbFile(uint32.json, uint32.bin), signal()));
});

test('resource totals count rendered instances rather than permitting mesh or texture alias amplification', { timeout: 10000 }, async () => {
  const validate = await validator();
  const repeated = await validate(chairFixture({ instances: 32 }).bytes, signal());
  assert.equal(repeated.resources.primitives, 64);
  assert.equal(repeated.resources.vertices, 144 * 32);
  assert.equal(repeated.resources.geometryBytes, 5040 * 32);
  await assert.rejects(validate(chairFixture({ instances: 33 }).bytes, signal()));
  assert.equal((await validate(denseTriangleFixture(100000).bytes, signal())).resources.vertices, 100000);
  await assert.rejects(validate(denseTriangleFixture(100001).bytes, signal()));
  await assert.rejects(validate(denseTriangleFixture(60000, 3, 2).bytes, signal()));
  assert.equal((await validate(denseTriangleFixture(3, 300000).bytes, signal())).resources.triangles, 100000);
  await assert.rejects(validate(denseTriangleFixture(3, 300003).bytes, signal()));
  await assert.rejects(validate(denseTriangleFixture(3, 150003, 2).bytes, signal()));
  const alias = chairFixture();
  for (let texture = 1; texture < 4; texture += 1) {
    alias.json.textures.push({ sampler: 0, source: 0 });
    const material = structuredClone(alias.json.materials[0]); material.pbrMetallicRoughness.baseColorTexture.index = texture;
    alias.json.materials.push(material);
    alias.json.meshes[0].primitives.push({ ...alias.json.meshes[0].primitives[0], material: alias.json.materials.length - 1 });
  }
  const counted = await validate(glbFile(alias.json, alias.bin), signal());
  assert.equal(counted.resources.images, 1);
  assert.equal(counted.resources.textures, 4);
  assert.equal(counted.resources.textureBytes, 4 * 32 * 32 * 4);
  alias.json.textures.push({ sampler: 0, source: 0 });
  await assert.rejects(validate(glbFile(alias.json, alias.bin), signal()));
});

test('unreachable mesh material texture image sampler accessor and view declarations are not silently retained', async () => {
  const validate = await validator();
  for (const key of ['meshes', 'materials', 'textures', 'images', 'samplers', 'accessors', 'bufferViews']) {
    await assert.rejects(validate(mutateChair(f => { f.json[key].push(structuredClone(f.json[key][0])); }), signal()));
  }
});

test('sixteen used materials and thirty-two used meshes remain within the declared ceilings', async () => {
  const validate = await validator();
  const materials = chairFixture();
  for (let index = 2; index < 16; index += 1) {
    materials.json.materials.push(structuredClone(materials.json.materials[0]));
    materials.json.meshes[0].primitives.push({ ...materials.json.meshes[0].primitives[0], material: index });
  }
  assert.equal((await validate(glbFile(materials.json, materials.bin), signal())).resources.materials, 16);
  materials.json.materials.push(structuredClone(materials.json.materials[0]));
  materials.json.meshes[0].primitives.push({ ...materials.json.meshes[0].primitives[0], material: 16 });
  await assert.rejects(validate(glbFile(materials.json, materials.bin), signal()));
  const meshes = chairFixture();
  meshes.json.meshes = Array.from({ length: 32 }, () => structuredClone(meshes.json.meshes[0]));
  meshes.json.nodes = Array.from({ length: 32 }, (_, mesh) => ({ mesh }));
  meshes.json.scenes[0].nodes = meshes.json.nodes.map((_: unknown, index: number) => index);
  assert.equal((await validate(glbFile(meshes.json, meshes.bin), signal())).resources.meshes, 32);
});

test('texture memory counts each texture while encoded image totals are bounded before inflation', { timeout: 10000 }, async t => {
  const validate = await validator();
  function aliases(fixture: ChairFixture, duplicateImages: boolean) {
    for (let index = 1; index < 4; index += 1) {
      if (duplicateImages) fixture.json.images.push({ ...fixture.json.images[0] });
      fixture.json.textures.push({ sampler: 0, source: duplicateImages ? index : 0 });
      const material = structuredClone(fixture.json.materials[0]);
      material.pbrMetallicRoughness.baseColorTexture.index = index;
      fixture.json.materials.push(material);
      fixture.json.meshes[0].primitives.push({ ...fixture.json.meshes[0].primitives[0], material: fixture.json.materials.length - 1 });
    }
    return glbFile(fixture.json, fixture.bin);
  }
  const full = await validate(aliases(chairFixture({ image: pngFixture(512, 512, 4) }), false), signal());
  assert.equal(full.resources.images, 1);
  assert.equal(full.resources.textureBytes, 4 * 1024 * 1024);
  const rows = pngScanlines(512, 512, 4);
  let random = 17;
  for (let index = 0; index < rows.length; index += 1) {
    if (index % 2049 === 0) continue;
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    rows[index] = random >>> 24;
  }
  const image = pngFile(pngHeader(512, 512, { colorType: 6 }), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND'));
  assert.ok(image.length <= 2 * 1024 * 1024 && image.length * 4 > 4 * 1024 * 1024);
  const overBudget = aliases(chairFixture({ image }), true);
  let decoders = 0;
  t.mock.method(globalThis, 'DecompressionStream', function () { decoders += 1; throw new Error('Encoded-image total must be checked first.'); });
  await assert.rejects(validate(overBudget, signal()));
  assert.equal(decoders, 0);
});

test('declared graph material accessor image and sampler ceilings reject before texture decoding', async t => {
  const validate = await validator();
  let decoders = 0;
  t.mock.method(globalThis, 'DecompressionStream', function () { decoders += 1; throw new Error('Budget must precede texture decoding.'); });
  for (const [key, count] of [['nodes', 65], ['meshes', 33], ['accessors', 257], ['bufferViews', 257],
    ['materials', 17], ['textures', 5], ['images', 5], ['samplers', 5]] as const) {
    await assert.rejects(validate(mutateChair(f => { f.json[key] = Array.from({ length: count }, () => structuredClone(f.json[key][0])); }), signal()));
  }
  assert.equal(decoders, 0);
});

test('static material sampler and texture references are bounded and cannot request additional rendering features', async () => {
  const validate = await validator();
  const mutations: ((f: ChairFixture) => void)[] = [
    f => { f.json.meshes[0].primitives[0].material = 999; }, f => { f.json.materials[0].alphaMode = 'BLEND'; },
    f => { f.json.materials[0].alphaMode = 'MASK'; }, f => { f.json.materials[0].doubleSided = true; },
    f => { f.json.materials[0].normalTexture = { index: 0 }; }, f => { f.json.materials[0].occlusionTexture = { index: 0 }; },
    f => { f.json.materials[0].emissiveTexture = { index: 0 }; }, f => { f.json.materials[0].emissiveFactor = [1, 1, 1]; },
    f => { f.json.materials[0].pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 0.5]; },
    f => { f.json.materials[0].pbrMetallicRoughness.metallicFactor = 1.1; },
    f => { f.json.materials[0].pbrMetallicRoughness.roughnessFactor = -0.1; },
    f => { f.json.materials[0].pbrMetallicRoughness.baseColorTexture.index = 1; },
    f => { f.json.materials[0].pbrMetallicRoughness.baseColorTexture.texCoord = 1; },
    f => { f.json.textures[0].source = 1; }, f => { f.json.textures[0].sampler = 1; },
    f => { delete f.json.textures[0].sampler; }, f => { f.json.samplers[0].minFilter = 9987; },
    f => { delete f.json.samplers[0].minFilter; }, f => { f.json.samplers[0].magFilter = 9987; },
    f => { f.json.samplers[0].wrapS = 10497; }, f => { f.json.samplers[0].wrapT = 33648; },
  ];
  for (const mutate of mutations) await assert.rejects(validate(mutateChair(mutate), signal()));
  const nearest = mutateChair(f => { f.json.samplers[0].minFilter = 9728; f.json.samplers[0].magFilter = 9728; });
  assert.equal((await validate(nearest, signal())).resources.textures, 1);
});

test('embedded image MIME and dimensions cannot disguise corrupt compressed content or extra members', async () => {
  const validate = await validator();
  const good = pngFixture(2, 2);
  const badCrc = Buffer.from(good); badCrc[badCrc.length - 1] ^= 1;
  const compressed = deflateSync(Buffer.alloc(14));
  for (const image of [Buffer.from('not PNG'), badCrc,
    pngFile(pngHeader(513, 2), pngChunk('IDAT', compressed), pngChunk('IEND')),
    pngFile(pngHeader(), pngChunk('IDAT', Buffer.concat([compressed, compressed])), pngChunk('IEND')),
    pngFile(pngHeader(), pngChunk('IDAT', deflateSync(Buffer.alloc(4 * 1024 * 1024))), pngChunk('IEND')),
  ]) await assert.rejects(validate(chairFixture({ image }).bytes, signal()));
  for (const mutate of [
    (f: ChairFixture) => { f.json.images[0].mimeType = 'image/jpeg'; },
    (f: ChairFixture) => { f.json.images[0].bufferView = 0; },
    (f: ChairFixture) => { f.json.images[0].bufferView = 999; },
  ]) await assert.rejects(validate(mutateChair(mutate), signal()));
});

test('abort is checked before work and during a large valid geometry scan', { timeout: 5000 }, async t => {
  const validate = await validator();
  const bytes = denseTriangleFixture(100000).bytes;
  const stopped = new AbortController(); stopped.abort();
  await assert.rejects(validate(bytes, stopped.signal), error => error === stopped.signal.reason);
  const during = new AbortController();
  const timer = setTimeout(() => during.abort(), 0);
  t.after(() => clearTimeout(timer));
  await assert.rejects(validate(bytes, during.signal), error => error === during.signal.reason);
});

test('the fifteen-second admission deadline aborts outstanding work rather than returning a partial admission', async t => {
  const validate = await validator();
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const loading = validate(chairFixture().bytes, signal());
  const rejected = assert.rejects(loading, /admission|deadline|timed out|timeout/i);
  t.mock.timers.tick(15000);
  await rejected;
});

// Owner-approved 8M evidence shape, authored locally (not the real Meshy file): exporter generator and names,
// POSITION-only, no material, uint32 indices with min/max, buffer views without targets. A 0.5×1×0.5 closed box.
const boxCorners = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
const boxIndices = [0, 3, 2, 0, 2, 1, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2];
function trimesh(options: { normals?: boolean; material?: boolean; names?: boolean; generator?: boolean } = {}) {
  const parts: Buffer[] = [];
  const views: Record<string, unknown>[] = [];
  let length = 0;
  const view = (bytes: Buffer) => { views.push({ buffer: 0, byteOffset: length, byteLength: bytes.length }); parts.push(bytes); length += bytes.length; return views.length - 1; };
  const floats = (values: number[]) => { const bytes = Buffer.alloc(values.length * 4); values.forEach((value, index) => bytes.writeFloatLE(value, index * 4)); return bytes; };
  const accessors: Record<string, unknown>[] = [{ bufferView: view(floats(boxCorners.flatMap(([x, y, z]) => [x * 0.25, y * 0.5, z * 0.25]))),
    componentType: 5126, count: 8, type: 'VEC3', min: [-0.25, -0.5, -0.25], max: [0.25, 0.5, 0.25] }];
  const attributes: Record<string, number> = { POSITION: 0 };
  if (options.normals) {
    attributes.NORMAL = accessors.push({ bufferView: view(floats(boxCorners.flatMap(corner => corner.map(value => value / Math.sqrt(3))))),
      componentType: 5126, count: 8, type: 'VEC3' }) - 1;
  }
  const indices = Buffer.alloc(boxIndices.length * 4);
  boxIndices.forEach((value, index) => indices.writeUInt32LE(value, index * 4));
  const indexAccessor = accessors.push({ bufferView: view(indices), componentType: 5125, count: 36, type: 'SCALAR', min: [0], max: [7] }) - 1;
  const named = options.names !== false;
  const json: GlbFixtureJson = {
    asset: { version: '2.0', ...(options.generator !== false ? { generator: 'github.com/mikedh/trimesh' } : {}) },
    scene: 0, scenes: [{ nodes: [0], ...(named ? { name: 'scene' } : {}) }],
    nodes: [{ mesh: 0, ...(named ? { name: 'geometry_0' } : {}) }],
    meshes: [{ primitives: [{ attributes, indices: indexAccessor, mode: 4, ...(options.material ? { material: 0 } : {}) }], ...(named ? { name: 'geometry_0' } : {}) }],
    accessors, bufferViews: views, buffers: [{ byteLength: length }],
    ...(options.material ? { materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.8, 0.8, 0.8, 1], metallicFactor: 0, roughnessFactor: 0.9 } }] } : {}),
  };
  const bin = Uint8Array.from(Buffer.concat(parts));
  return { json, bin, bytes: glbFile(json, bin) };
}
const boxBounds = { min: [-0.25, -0.5, -0.25], max: [0.25, 0.5, 0.25] };
// Positions 8×12 + normals counted as if present 8×12 + uint32 indices 36×4.
const boxResources = { nodes: 1, meshes: 1, primitives: 1, vertices: 8, indices: 36, triangles: 12,
  materials: 0, textures: 0, images: 0, geometryBytes: 336, textureBytes: 0 };

test('8M RED: an authored trimesh-like export is admitted with zero materials, a normal budget and exact index extrema', async () => {
  const validate = await validator();
  assert.deepEqual(await validate(trimesh().bytes, signal()), { bounds: boxBounds, resources: boxResources });
});

test('optional generator and names on every allowed object never change admission', async () => {
  const validate = await validator();
  const named = mutateChair(f => {
    f.json.asset.generator = 'synthetic exporter 1.0';
    for (const key of ['scenes', 'nodes', 'meshes', 'materials', 'accessors', 'bufferViews', 'buffers', 'images', 'textures', 'samplers']) {
      f.json[key].forEach((item: Record<string, unknown>, index: number) => { item.name = `${key}-${index}`; });
    }
  });
  const edge = Math.fround(0.3);
  assert.deepEqual(await validate(named, signal()), { bounds: { min: [-edge, 0, -edge], max: [edge, 1, edge] },
    resources: { nodes: 1, meshes: 1, primitives: 2, vertices: 144, indices: 216, triangles: 72,
      materials: 2, textures: 1, images: 1, geometryBytes: 5040, textureBytes: 4096 } });
  for (const name of ['', 'x'.repeat(256), 'ünïcode 名前']) {
    await validate(mutateChair(f => { f.json.nodes[0].name = name; f.json.asset.generator = name; }), signal());
  }
});

test('zero materials and NORMAL-less primitives are admitted while present normals keep every existing rule', async () => {
  const validate = await validator();
  for (const options of [{ normals: true }, { material: true }, { normals: true, material: true }, { names: false, generator: false }]) {
    const admitted = await validate(trimesh(options).bytes, signal());
    assert.deepEqual(admitted.bounds, boxBounds, JSON.stringify(options));
    assert.deepEqual(admitted.resources, { ...boxResources, materials: options.material ? 1 : 0 }, 'normal bytes count whether or not present');
  }
  const empty = trimesh();
  empty.json.materials = [];
  assert.equal((await validate(glbFile(empty.json, empty.bin), signal())).resources.materials, 0);
  const normalOffset = (fixture: ReturnType<typeof trimesh>) => (fixture.json.bufferViews[fixture.json.accessors[1].bufferView] as { byteOffset: number }).byteOffset;
  for (const values of [[0, 0, 0], [NaN, 0, 0], [2, 0, 0], [Infinity, 0, 0]]) {
    const fixture = trimesh({ normals: true });
    values.forEach((value, component) => new DataView(fixture.bin.buffer).setFloat32(normalOffset(fixture) + component * 4, value, true));
    await assert.rejects(validate(glbFile(fixture.json, fixture.bin), signal()), JSON.stringify(values));
  }
});

test('names stay bounded strings on allowed objects only and every other exporter extra remains rejected', async () => {
  const validate = await validator();
  const mutations: [string, (f: ReturnType<typeof trimesh>) => void][] = [
    ...['x'.repeat(257), 'a\nb', 'a​b', '\u0000', 'a b', 1, null, {}, ['geometry_0']].flatMap(value => [
      [`node name ${JSON.stringify(value)}`, (f: ReturnType<typeof trimesh>) => { f.json.nodes[0].name = value; }],
      [`mesh name ${JSON.stringify(value)}`, (f: ReturnType<typeof trimesh>) => { f.json.meshes[0].name = value; }],
      [`scene name ${JSON.stringify(value)}`, (f: ReturnType<typeof trimesh>) => { f.json.scenes[0].name = value; }],
      [`generator ${JSON.stringify(value)}`, (f: ReturnType<typeof trimesh>) => { f.json.asset.generator = value; }],
    ] as [string, (f: ReturnType<typeof trimesh>) => void][]),
    ['primitive name', f => { f.json.meshes[0].primitives[0].name = 'primitive'; }],
    ['asset name', f => { f.json.asset.name = 'asset'; }], ['root name', f => { f.json.name = 'root'; }],
    ['asset copyright', f => { f.json.asset.copyright = 'owner'; }], ['asset extras', f => { f.json.asset.extras = {}; }],
    ['node extras', f => { f.json.nodes[0].extras = { name: 'x' }; }], ['mesh extras', f => { f.json.meshes[0].extras = {}; }],
    ['root extras', f => { f.json.extras = {}; }], ['node extensions', f => { f.json.nodes[0].extensions = {}; }],
    ['extensionsUsed', f => { f.json.extensionsUsed = []; }], ['extensionsRequired', f => { f.json.extensionsRequired = []; }],
    ['dangling material', f => { f.json.meshes[0].primitives[0].material = 0; }],
    ['dangling material in empty list', f => { f.json.materials = []; f.json.meshes[0].primitives[0].material = 0; }],
    ['unused material', f => { f.json.materials = [{}]; }],
    ['index extrema lie', f => { f.json.accessors[1].max = [8]; }],
    ['buffer view target mismatch', f => { f.json.bufferViews[0].target = 34963; }],
  ];
  for (const [label, mutate] of mutations) {
    const fixture = trimesh();
    mutate(fixture);
    await assert.rejects(validate(glbFile(fixture.json, fixture.bin), signal()), label);
  }
  const textured = mutateChair(f => { f.json.materials[0].pbrMetallicRoughness.baseColorTexture.name = 'texture info'; });
  await assert.rejects(validate(textured, signal()), 'texture info is not an allowed named object');
  await assert.rejects(validate(mutateChair(f => { f.json.materials[0].pbrMetallicRoughness.name = 'pbr'; }), signal()));
});
