import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { Box3, BufferGeometry, Color, Group, Material, Mesh, MeshStandardMaterial, Texture, Vector3 } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { FurnishingEnvelope } from '../src/room/procedural-room.ts';
import { ROOM_COLORS } from '../src/room/room-description.ts';
import { chairFixture, glbFile, mutateChair } from './fixtures/prop-glb.ts';

const modulePath = '../src/room/room-prop-visual.ts';
type Visual = { root: Group; clone(): Visual; dispose(): void };
type Stage = (bytes: ArrayBuffer, envelope: FurnishingEnvelope, signal: AbortSignal) => Promise<Visual>;
async function stager(): Promise<Stage> { return (await import(modulePath)).stageRoomPropVisual; }
const envelope: FurnishingEnvelope = { x: 2, z: -3, rotation: 90, width: 0.65, depth: 0.65, height: 1.1 };
const signal = () => new AbortController().signal;
const turn = () => new Promise<void>(resolve => setImmediate(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
function resources(t: TestContext) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const setIndex = BufferGeometry.prototype.setIndex;
  const setValues = MeshStandardMaterial.prototype.setValues;
  t.mock.method(BufferGeometry.prototype, 'setIndex', function (this: BufferGeometry, ...args: Parameters<typeof setIndex>) {
    geometries.add(this); return setIndex.apply(this, args);
  });
  t.mock.method(MeshStandardMaterial.prototype, 'setValues', function (this: MeshStandardMaterial, ...args: Parameters<typeof setValues>) {
    materials.add(this); return setValues.apply(this, args);
  });
  const descriptor = Object.getOwnPropertyDescriptor(Texture.prototype, 'needsUpdate')!;
  Object.defineProperty(Texture.prototype, 'needsUpdate', { ...descriptor, set(this: Texture, value: boolean) {
    if (value) textures.add(this); descriptor.set!.call(this, value);
  } });
  t.after(() => Object.defineProperty(Texture.prototype, 'needsUpdate', descriptor));
  const geometryDispose = t.mock.method(BufferGeometry.prototype, 'dispose');
  const materialDispose = t.mock.method(Material.prototype, 'dispose');
  const textureDispose = t.mock.method(Texture.prototype, 'dispose');
  function released() {
    for (const [created, calls] of [[geometries, geometryDispose.mock.calls], [materials, materialDispose.mock.calls], [textures, textureDispose.mock.calls]] as const) {
      assert.equal(calls.length, created.size, 'each original, shared or final resource is released exactly once');
      assert.deepEqual(new Set(calls.map(call => call.this)), created);
    }
  }
  return { geometries, materials, textures, geometryDispose, materialDispose, textureDispose, released };
}
// Only lifecycle tests replace the native bitmap boundary; this is not browser pixel/GPU evidence.
function bitmapDecoder(t: TestContext, decode: (blob: Blob, options?: ImageBitmapOptions) => Promise<unknown>) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: decode });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'createImageBitmap', previous); else Reflect.deleteProperty(globalThis, 'createImageBitmap'); });
}
function closeableBitmap() {
  const closed = deferred<void>();
  let closes = 0;
  return { bitmap: { width: 32, height: 32, close() { closes += 1; closed.resolve(); } }, closed: closed.promise, get closes() { return closes; } };
}

test('actual GLTFLoader stages the authored untextured chair offscene and fits the local envelope uniformly', async t => {
  const stage = await stager();
  const parse = t.mock.method(GLTFLoader.prototype, 'parse');
  const network = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Staging cannot fetch.'); });
  const urls = t.mock.method(URL, 'createObjectURL', () => { throw new Error('No object URL is needed.'); });
  const fixture = chairFixture({ textured: false });
  const visual = await stage(fixture.bytes, envelope, signal());
  t.after(visual.dispose);
  assert.equal(parse.mock.callCount(), 1, 'use the installed real loader, not reconstructed fixture geometry');
  assert.equal(network.mock.callCount(), 0);
  assert.equal(urls.mock.callCount(), 0);
  assert.ok(visual.root instanceof Group);
  assert.equal(visual.root.parent, null);
  const box = new Box3().setFromObject(visual.root, true);
  const size = box.getSize(new Vector3());
  const scale = 0.65 / (2 * Math.fround(0.3));
  assert.ok(Math.abs(box.min.y) < 1e-6);
  assert.ok(Math.abs(box.getCenter(new Vector3()).x) < 1e-6);
  assert.ok(Math.abs(box.getCenter(new Vector3()).z) < 1e-6);
  assert.ok(Math.abs(size.x - 0.65) < 1e-6 && Math.abs(size.z - 0.65) < 1e-6);
  assert.ok(Math.abs(size.y - scale) < 1e-6 && size.y < envelope.height, 'preserve proportions rather than stretching to height');
  const meshes: Mesh[] = [];
  visual.root.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
  assert.equal(meshes.length, 2);
  assert.ok(meshes.every(mesh => mesh.geometry instanceof BufferGeometry && !(mesh.geometry as BufferGeometry & { isBoxGeometry?: boolean }).isBoxGeometry));
  assert.equal(meshes.reduce((count, mesh) => count + mesh.geometry.index!.count / 3, 0), 72);
  assert.ok(meshes.every(mesh => mesh.material instanceof MeshStandardMaterial && mesh.material.map === null));
  assert.equal(new Set(meshes.map(mesh => (mesh.material as MeshStandardMaterial).color.getHex())).size, 2);
});

test('invalid byte size is rejected before copying and malformed admitted content never reaches the loader', async t => {
  const stage = await stager();
  const parse = t.mock.method(GLTFLoader.prototype, 'parse');
  const oversized = new ArrayBuffer(8 * 1024 * 1024 + 1);
  const copying = t.mock.method(oversized, 'slice', () => { throw new Error('Oversized input copied.'); });
  await assert.rejects(stage(oversized, envelope, signal()));
  assert.equal(copying.mock.callCount(), 0);
  const preAborted = new AbortController(); preAborted.abort();
  const good = chairFixture({ textured: false }).bytes;
  await assert.rejects(stage(good, envelope, preAborted.signal), error => error === preAborted.signal.reason);
  for (const bytes of [new TextEncoder().encode('abc').buffer, mutateChair(f => { f.json.images[0].uri = 'https://invalid.example/asset.png'; })]) {
    await assert.rejects(stage(bytes, envelope, signal()));
  }
  for (const invalid of [{ ...envelope, width: 0 }, { ...envelope, height: Infinity }, { ...envelope, depth: -1 },
    { ...envelope, rotation: 45 }, { ...envelope, x: NaN }, { ...envelope, permission: 'execute' }]) {
    await assert.rejects(stage(good, invalid as FurnishingEnvelope, signal()));
  }
  assert.equal(parse.mock.callCount(), 0);
});

test('staging snapshots bounded caller bytes before any await and the loader never receives the mutable caller buffer', async t => {
  const stage = await stager();
  const bytes = chairFixture({ textured: false }).bytes;
  const expected = new Uint8Array(bytes).slice();
  const parse = GLTFLoader.prototype.parse;
  let parsed = 0;
  t.mock.method(GLTFLoader.prototype, 'parse', function (this: GLTFLoader, ...args: Parameters<typeof parse>) {
    parsed += 1;
    assert.notEqual(args[0], bytes);
    assert.ok(args[0] instanceof ArrayBuffer);
    assert.deepEqual(new Uint8Array(args[0]), expected);
    return parse.apply(this, args);
  });
  const pending = stage(bytes, envelope, signal());
  new Uint8Array(bytes).fill(0);
  const visual = await pending;
  visual.dispose();
  assert.equal(parsed, 1);
});

test('actual loaded geometry must still agree with admitted data before it can become a visual', async t => {
  const stage = await stager();
  const owned = resources(t);
  const parse = GLTFLoader.prototype.parse;
  t.mock.method(GLTFLoader.prototype, 'parse', function (this: GLTFLoader, data, path, onLoad, onError) {
    return parse.call(this, data, path, (gltf: GLTF) => {
      gltf.scene.traverse(object => {
        if (object instanceof Mesh) object.geometry.getAttribute('position').setXYZ(0, 1000, 1000, 1000);
      });
      onLoad(gltf);
    }, onError);
  });
  await assert.rejects(stage(chairFixture({ textured: false }).bytes, envelope, signal()));
  owned.released();
});

test('visual graph leases share geometry and materials while every original and final material releases once at the last lease', async t => {
  const stage = await stager();
  const owned = resources(t);
  const original = await stage(chairFixture({ textured: false, instances: 2 }).bytes, envelope, signal());
  const retained = original.clone();
  t.after(() => { original.dispose(); retained.dispose(); });
  assert.notEqual(retained.root, original.root);
  const renderedMaterials = new Set<Material>();
  const originalMeshes: Mesh[] = [], retainedMeshes: Mesh[] = [];
  original.root.traverse(object => { if (object instanceof Mesh) { originalMeshes.push(object); renderedMaterials.add(object.material as Material); } });
  retained.root.traverse(object => { if (object instanceof Mesh) retainedMeshes.push(object); });
  assert.equal(originalMeshes.length, retainedMeshes.length);
  originalMeshes.forEach((mesh, index) => {
    assert.notEqual(mesh, retainedMeshes[index]);
    assert.equal(mesh.geometry, retainedMeshes[index].geometry);
    assert.equal(mesh.material, retainedMeshes[index].material);
  });
  assert.ok(owned.materials.size > renderedMaterials.size, 'stock loader originals exist in addition to final cloned materials');
  original.dispose(); original.dispose();
  assert.equal(owned.geometryDispose.mock.callCount(), 0);
  assert.equal(owned.materialDispose.mock.callCount(), 0);
  assert.throws(() => original.clone(), /disposed|released/i);
  retained.dispose(); retained.dispose();
  owned.released();
});

test('the actual loader uses the embedded PNG dependency and cannot silently turn decode failure into a null texture', async t => {
  const stage = await stager();
  const owned = resources(t);
  let decodes = 0;
  bitmapDecoder(t, async (blob, options) => {
    decodes += 1;
    assert.ok(blob instanceof Blob);
    assert.equal(blob.type, 'image/png');
    assert.deepEqual(options, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    assert.deepEqual([...new Uint8Array(await blob.arrayBuffer()).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    throw new Error('synthetic native bitmap decode failure');
  });
  const urls = t.mock.method(URL, 'createObjectURL', () => { throw new Error('Unexpected object URL.'); });
  const fetches = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected texture fetch.'); });
  await assert.rejects(stage(chairFixture().bytes, envelope, signal()));
  await turn();
  assert.equal(decodes, 1);
  assert.equal(urls.mock.callCount(), 0);
  assert.equal(fetches.mock.callCount(), 0);
  assert.ok(owned.geometries.size > 0, 'include partial real-loader geometry ownership, not only successful scenes');
  owned.released();
});

test('texture and bitmap ownership survives graph leases and cleanup attempts every resource even after one disposer throws', async t => {
  const stage = await stager();
  const owned = resources(t);
  const image = closeableBitmap();
  bitmapDecoder(t, async () => image.bitmap);
  const visual = await stage(chairFixture().bytes, envelope, signal());
  const copy = visual.clone();
  t.after(() => { visual.dispose(); copy.dispose(); });
  assert.equal(owned.textures.size, 1);
  visual.dispose();
  assert.equal(image.closes, 0);
  assert.equal(owned.textureDispose.mock.callCount(), 0);
  let failures = 0;
  owned.geometryDispose.mock.mockImplementation(() => { if (++failures === 1) throw new Error('synthetic cleanup failure'); });
  assert.throws(copy.dispose, /cleanup/i);
  copy.dispose();
  assert.equal(image.closes, 1);
  owned.released();
});

test('local cancellation retains the unsettled loader reservation and closes a late bitmap without making a texture', { timeout: 5000 }, async t => {
  const stage = await stager();
  const owned = resources(t);
  const started = deferred<void>(), completion = deferred<unknown>();
  const image = closeableBitmap();
  const abort = new AbortController();
  bitmapDecoder(t, () => { started.resolve(); return completion.promise; });
  t.after(async () => { completion.resolve(image.bitmap); await turn(); });
  const pending = stage(chairFixture().bytes, envelope, abort.signal);
  const rejected = assert.rejects(pending, error => error === abort.signal.reason);
  await started.promise;
  abort.abort();
  await rejected;
  assert.equal(image.closes, 0, 'native decode has not returned its resource yet');
  assert.equal(owned.textures.size, 0);
  await assert.rejects(stage(chairFixture({ textured: false }).bytes, envelope, signal()), /busy|pending/i);
  completion.resolve(image.bitmap);
  await image.closed;
  await turn();
  assert.equal(image.closes, 1);
  assert.equal(owned.textures.size, 0, 'late native completion cannot become a Texture');
  owned.released();
  const next = await stage(chairFixture({ textured: false }).bytes, envelope, signal());
  next.dispose();
});

test('the loader deadline stops the local waiter without releasing an unsettled native decode reservation', { timeout: 5000 }, async t => {
  const stage = await stager();
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const started = deferred<void>(), completion = deferred<unknown>();
  const image = closeableBitmap();
  bitmapDecoder(t, () => { started.resolve(); return completion.promise; });
  t.after(async () => { completion.resolve(image.bitmap); await turn(); });
  const pending = stage(chairFixture().bytes, envelope, signal());
  const rejected = assert.rejects(pending, /deadline|timed out|timeout/i);
  await started.promise;
  t.mock.timers.tick(15000);
  await rejected;
  assert.equal(image.closes, 0);
  await assert.rejects(stage(chairFixture({ textured: false }).bytes, envelope, signal()), /busy|pending/i);
  completion.resolve(image.bitmap);
  await image.closed;
  await turn();
  assert.equal(image.closes, 1);
  const next = await stage(chairFixture({ textured: false }).bytes, envelope, signal());
  next.dispose();
});

// Owner-approved 8M evidence shape, authored locally: generator/names, POSITION-only, no material, uint32 indices.
// A closed 0.5×1×0.5 box with consistent outward winding and shared corner vertices.
function trimeshBox() {
  const corners = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  const indices = [0, 3, 2, 0, 2, 1, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2];
  const bin = Buffer.alloc(8 * 12 + 36 * 4);
  corners.flatMap(([x, y, z]) => [x * 0.25, y * 0.5, z * 0.25]).forEach((value, index) => bin.writeFloatLE(value, index * 4));
  indices.forEach((value, index) => bin.writeUInt32LE(value, 96 + index * 4));
  return glbFile({ asset: { version: '2.0', generator: 'github.com/mikedh/trimesh' }, scene: 0, scenes: [{ name: 'scene', nodes: [0] }],
    nodes: [{ name: 'geometry_0', mesh: 0 }], meshes: [{ name: 'geometry_0', primitives: [{ attributes: { POSITION: 0 }, indices: 1, mode: 4 }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 8, type: 'VEC3', min: [-0.25, -0.5, -0.25], max: [0.25, 0.5, 0.25] },
      { bufferView: 1, componentType: 5125, count: 36, type: 'SCALAR', min: [0], max: [7] }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 96 }, { buffer: 0, byteOffset: 96, byteLength: 144 }],
    buffers: [{ byteLength: bin.length }] }, Uint8Array.from(bin));
}
type ColourStage = (bytes: ArrayBuffer, envelope: FurnishingEnvelope, signal: AbortSignal, onCleanupError?: () => void, caseColor?: string) => Promise<Visual>;

test('8M: a normal-less material-less mesh stages with computed unit normals and the loader default standard material', async t => {
  const stage = await stager();
  const visual = await stage(trimeshBox(), envelope, signal());
  t.after(visual.dispose);
  const meshes: Mesh[] = [];
  visual.root.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
  assert.equal(meshes.length, 1);
  const geometry = meshes[0].geometry;
  assert.equal(geometry.getAttribute('position').count, 8, 'geometry counts unchanged');
  assert.equal(geometry.index!.count, 36);
  const normal = geometry.getAttribute('normal');
  assert.ok(normal, 'normals are computed before fit and lease');
  assert.equal(normal.count, 8);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < normal.count; index += 1) {
    const value = new Vector3().fromBufferAttribute(normal, index);
    assert.ok(Math.abs(value.length() - 1) < 1e-5, `vertex ${index} unit normal`);
    assert.ok(value.dot(new Vector3().fromBufferAttribute(position, index)) > 0, `vertex ${index} outward normal`);
  }
  const material = meshes[0].material;
  assert.ok(material instanceof MeshStandardMaterial);
  assert.equal(material.map, null);
  assert.equal(material.transparent, false);
  assert.equal(material.flatShading, false, 'computed smooth normals are used rather than derivative flat shading');
  assert.equal(material.metalness, 0, 'coordinator 8M: the default for material-less meshes is matte so the case colour shows without an environment map');
  assert.equal(material.roughness, 1);
  const authored = chairFixture({ textured: false });
  authored.json.materials[1].pbrMetallicRoughness.metallicFactor = 0.4;
  const chair = await stage(glbFile(authored.json, authored.bin), envelope, signal());
  t.after(chair.dispose);
  const authoredMeshes: Mesh[] = [];
  chair.root.traverse(object => { if (object instanceof Mesh) authoredMeshes.push(object); });
  assert.deepEqual(authoredMeshes.map(mesh => [(mesh.material as MeshStandardMaterial).metalness, (mesh.material as MeshStandardMaterial).roughness]),
    [[0, 0.85], [0.4, 0.9]], 'explicitly authored metallic/roughness factors are untouched');
  const box = new Box3().setFromObject(visual.root, true);
  const size = box.getSize(new Vector3());
  assert.ok(Math.abs(box.min.y) < 1e-6);
  assert.ok(Math.abs(size.x - 0.55) < 1e-6 && Math.abs(size.y - 1.1) < 1e-6 && Math.abs(size.z - 0.55) < 1e-6, 'uniform fit to height');
});

test('8M: the case colour tints the loader default material for a material-less mesh', async t => {
  const stage = (await stager()) as unknown as ColourStage;
  const visual = await stage(trimeshBox(), envelope, signal(), undefined, 'teal');
  t.after(visual.dispose);
  const meshes: Mesh[] = [];
  visual.root.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
  const colour = (meshes[0].material as MeshStandardMaterial).color;
  const expected = new Color(ROOM_COLORS.teal);
  for (const channel of ['r', 'g', 'b'] as const) assert.ok(Math.abs(colour[channel] - expected[channel]) < 1e-6, channel);
});

test('8M: default material, computed normals and loader geometry are each released exactly once across leases', async t => {
  const stage = await stager();
  const owned = resources(t);
  const visual = await stage(trimeshBox(), envelope, signal());
  const copy = visual.clone();
  t.after(() => { visual.dispose(); copy.dispose(); });
  assert.ok(owned.geometries.size >= 1);
  assert.ok(owned.materials.size >= 1, 'the loader default material is tracked');
  assert.equal(owned.textures.size, 0);
  visual.dispose();
  assert.equal(owned.geometryDispose.mock.callCount(), 0);
  assert.equal(owned.materialDispose.mock.callCount(), 0);
  copy.dispose(); copy.dispose();
  owned.released();
});
