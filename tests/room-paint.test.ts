import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { IncomingMessage, type ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { deflateSync, inflateSync } from 'node:zlib';
import { Vector3 } from 'three';
import { pngChunk, pngFile, pngHeader } from './fixtures/prop-reference-png.ts';
import { createSpatialFixture } from '../src/room/spatial-fixture.ts';
import { PAINT_HEIGHT, PAINT_WIDTH, createPaintMaterial, paintCamera, paintPinholeCamera, renderPaintDepth } from '../src/room/room-paint.ts';
import { createRoomPaintHandler, encodeLogDepthPng, paintPrompt } from '../src/server/room-paint.ts';
import { layoutProceduralRoom } from '../src/room/procedural-room.ts';

// All transport is injected; authored responses are not evidence of live World Labs behaviour.
const origin = 'http://127.0.0.1:5173';
const api = 'https://api.atlas-beta.worldlabs.ai/api/v2';
const imageUrl = 'https://storage.googleapis.com/wlt-marble-outputs-prod/us1/acct_x/proj_y/asset_z?X-Goog-Signature=PRIVATE_SIGNED_SENTINEL';
const key = 'synthetic-worldlabs-key-not-a-credential';
const description = { version: 1, width: 5, depth: 5, height: 3, doorway: { placement: 'right', width: 1, height: 2.2 },
  colors: { wall: 'warm-gray', floor: 'walnut' }, furnishings: [{ kind: 'table', color: 'ochre' }, { kind: 'chair', color: 'teal' }] };
const layout = layoutProceduralRoom(description, 41);
const room = { description, seed: 41, poses: layout.furnishings.map(({ x, z, rotation }) => ({ x, z, rotation })) };

let painted: Buffer | undefined;
function paintedPng() { // Authored 1280x720 RGB PNG; pngScanlines is capped at 512.
  if (painted) return painted;
  const rowSize = 1 + PAINT_WIDTH * 3, rows = Buffer.alloc(rowSize * PAINT_HEIGHT);
  for (let y = 0; y < PAINT_HEIGHT; y += 1) for (let x = 0; x < PAINT_WIDTH; x += 1) rows.set([x % 256, y % 256, 90], y * rowSize + 1 + x * 3);
  return painted = pngFile(pngHeader(PAINT_WIDTH, PAINT_HEIGHT, { colorType: 2 }), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND'));
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
type Call = { url: string; init: RequestInit };
function normal(call: Call): Response {
  if (call.url === `${api}/assets`) return json({ id: 'asset_depth1', state: 'READY' }, 201);
  if (call.url === `${api}/tasks:atlasChisel`) return json({ id: 'op1', done: false }, 201);
  if (call.url === `${api}/operations/op1`) return json({ id: 'op1', done: true, error: null, response: { frames: [{ imageAsset: { assetId: 'asset_out', url: imageUrl } }] } });
  if (call.url === imageUrl) return new Response(Uint8Array.from(paintedPng()), { headers: { 'content-type': 'image/png' } });
  assert.fail(`Unexpected synthetic destination: ${call.url}`);
}
function setup(respond: (call: Call) => Response = normal, options: { enabled?: boolean; spendingConfirmed?: boolean; key?: string } = {}) {
  const calls: Call[] = [];
  const handler = createRoomPaintHandler({ origin, enabled: options.enabled ?? true, spendingConfirmed: options.spendingConfirmed ?? true,
    getApiKey: () => 'key' in options ? options.key : key, pollMs: 0,
    fetch: async (url, init = {}) => { const call = { url: String(url), init }; calls.push(call); return respond(call); } });
  return { handler, calls, tasks: () => calls.filter(call => call.url.endsWith('tasks:atlasChisel')).length };
}
class CapturedResponse extends EventEmitter {
  statusCode = 200; writableEnded = false; destroyed = false; closed = false; headers = new Map<string, string>(); body: Buffer | undefined;
  setHeader(name: string, value: string | number) { this.headers.set(name.toLowerCase(), String(value)); return this; }
  end(value: string | Uint8Array) { this.body = Buffer.from(value); this.writableEnded = true; this.closed = true; this.emit('close'); return this; }
  get data() { assert.ok(this.body); return JSON.parse(this.body.toString('utf8')); }
}
async function request(handler: ReturnType<typeof createRoomPaintHandler>, options: { method?: string; url?: string; body?: unknown } = {}) {
  const socket = new Socket();
  Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });
  const req = new IncomingMessage(socket);
  req.method = options.method ?? 'POST';
  req.url = options.url ?? '/api/room-paint';
  req.headers = { host: '127.0.0.1:5173', origin, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' };
  const res = new CapturedResponse();
  const done = handler(req, res as unknown as ServerResponse, () => {});
  if (req.method === 'POST') { req.complete = true; req.push(Buffer.from(JSON.stringify(options.body ?? { requestId: 'request-1', room }))); req.push(null); }
  await done;
  return res;
}

test('paint camera matches the pose the live atlasChisel probe accepted', () => {
  const camera = paintPinholeCamera();
  assert.deepEqual(camera.extrinsics.position, [0, 1.7, 2.5]);
  assert.equal(camera.extrinsics.coordinateSystem, 'rub');
  assert.ok(Math.abs(camera.extrinsics.quaternion[0] - -0.03284149430152339) < 1e-12 && Math.abs(camera.extrinsics.quaternion[3] - 0.9994605726350805) < 1e-12);
  assert.ok(Math.abs(camera.intrinsics.fx - 691.5535657096198) < 1e-9);
  assert.deepEqual([camera.intrinsics.cx, camera.intrinsics.cy, camera.intrinsics.width, camera.intrinsics.height], [640, 360, 1280, 720]);
});

test('planar depth of the fixture room is geometric and agrees with the paint projection', () => {
  const fixture = createSpatialFixture();
  const depth = renderPaintDepth(fixture.scene);
  fixture.dispose();
  // The optical axis meets the rear wall's inner face (z = -3) at 5.5 · hypot(1, 0.25 / 3.8).
  assert.ok(Math.abs(depth[360 * PAINT_WIDTH + 640] - 5.5 * Math.hypot(1, 0.25 / 3.8)) < 0.03);
  assert.ok(depth.filter(z => z === 0).length > 10000, 'open doorway pixels are marked as no surface');
  const camera = paintCamera();
  const material = createPaintMaterial(null as never);
  const matrix = material.uniforms.paintMatrix.value;
  const { fx, fy, cx, cy } = paintPinholeCamera().intrinsics;
  for (const [u, v] of [[100, 600], [640, 360], [1100, 150], [900, 500]]) {
    const z = depth[v * PAINT_WIDTH + u];
    assert.ok(z > 0);
    const point = new Vector3((u + 0.5 - cx) / fx * z, -(v + 0.5 - cy) / fy * z, -z).applyMatrix4(camera.matrixWorld);
    const clip = point.clone().applyMatrix4(matrix);
    // The shader samples (x, 1 - y) of the unflipped image; it must land on the pixel the depth came from.
    assert.ok(Math.abs((clip.x * 0.5 + 0.5) * PAINT_WIDTH - (u + 0.5)) < 0.01);
    assert.ok(Math.abs((1 - (clip.y * 0.5 + 0.5)) * PAINT_HEIGHT - (v + 0.5)) < 0.01);
  }
  material.dispose();
});

test('log-depth PNG is a 16-bit grey image that decodes back to the planar depth', () => {
  const depth = new Float32Array(PAINT_WIDTH * PAINT_HEIGHT).fill(4);
  depth[0] = 2; depth[1] = 0; depth[2] = 8;
  const { png, zMin, zMax } = encodeLogDepthPng(depth, PAINT_WIDTH, PAINT_HEIGHT);
  assert.deepEqual([zMin, zMax], [2, 8]);
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20), png[24], png[25]], [PAINT_WIDTH, PAINT_HEIGHT, 16, 0]);
  const raw = inflateSync(png.subarray(41, png.length - 16));
  const sample = (x: number) => raw.readUInt16BE(1 + 2 * x);
  assert.deepEqual([sample(0), sample(1), sample(2)], [65535, 0, 1]);
  assert.ok(Math.abs(zMin * (zMax / zMin) ** (1 - sample(3) / 65535) - 4) < 1e-3);
});

test('a paint request sends only depth and structure, polls once more, admits the PNG and serves it locally', async () => {
  const { handler, calls, tasks } = setup();
  const res = await request(handler);
  assert.equal(res.statusCode, 200, res.body?.toString());
  const { painting, remainingRequests } = res.data;
  assert.equal(remainingRequests, 2);
  assert.deepEqual([painting.width, painting.height, painting.source, painting.provider, painting.task], [1280, 720, 'synthetic', 'worldlabs', 'atlasChisel']);
  assert.equal(painting.sha256, createHash('sha256').update(paintedPng()).digest('hex'));
  assert.equal(tasks(), 1);
  const submit = calls.find(call => call.url.endsWith('tasks:atlasChisel'))!;
  const headers = submit.init.headers as Record<string, string>;
  assert.equal(headers['WLT-Api-Key'], key);
  assert.equal(headers['Idempotency-Key'], 'request-1');
  const body = JSON.parse(String(submit.init.body));
  assert.deepEqual(Object.keys(body).sort(), ['contextFrames', 'prompt', 'returnDepth', 'targetCameras']);
  assert.equal(body.returnDepth, false);
  assert.deepEqual(body.contextFrames[0].camera, paintPinholeCamera());
  assert.equal(body.contextFrames[0].depth.logDepthAsset.assetId, 'asset_depth1');
  assert.equal(body.prompt, paintPrompt(layout.description));
  assert.match(body.prompt, /warm gray plaster walls and ceiling, walnut wooden floor, an ochre table, a teal chair, an open doorway/);
  for (const call of calls) assert.equal(call.init.redirect, 'error');
  assert.equal(calls.at(-1)!.url, imageUrl);
  const stored = await request(handler, { method: 'GET', url: `/api/room-paint/${painting.id}` });
  assert.equal(stored.headers.get('content-type'), 'image/png');
  assert.ok(stored.body!.equals(paintedPng()));
  const status = await request(handler, { method: 'GET' });
  assert.deepEqual(status.data, { available: true, reason: null, provider: 'worldlabs', model: 'atlasChisel', credentialStatus: 'unchecked',
    remainingRequests: 2, pendingTransport: false });
});

test('disabled, unconfirmed, keyless and unbuildable requests never reach World Labs', async () => {
  for (const [options, body, code] of [[{ enabled: false }, undefined, 'disabled'], [{ spendingConfirmed: false }, undefined, 'spending_unconfirmed'],
    [{ key: undefined }, undefined, 'missing_key'], [{}, { requestId: 'request-1', room: { ...room, poses: [] } }, 'invalid_room'],
    [{}, { requestId: 'request-1', room, extra: 1 }, 'invalid_request']] as const) {
    const { handler, calls } = setup(normal, options);
    const res = await request(handler, { body });
    assert.equal(res.data.error, code);
    assert.equal(calls.length, 0, code);
  }
});

test('a refused task consumes one allowance, is not retried, and the allowance ends at three', async () => {
  const { handler, tasks } = setup(call => call.url.endsWith('tasks:atlasChisel') ? json({ detail: [] }, 422) : normal(call));
  for (const [index, expected] of ['invalid_request_upstream', 'invalid_request_upstream', 'invalid_request_upstream', 'budget_exhausted'].entries()) {
    const res = await request(handler, { body: { requestId: `request-${index}`, room } });
    assert.equal(res.data.error, expected);
  }
  assert.equal(tasks(), 3);
});

test('an output outside the observed World Labs storage path is rejected after the charge is acknowledged', async () => {
  const { handler, calls } = setup(call => call.url === `${api}/operations/op1`
    ? json({ id: 'op1', done: true, error: null, response: { frames: [{ imageAsset: { url: 'https://example.com/painting.png' } }] } }) : normal(call));
  const res = await request(handler);
  assert.equal(res.data.error, 'invalid_provider_response');
  assert.match(res.data.message, /charges may still apply/);
  assert.ok(!calls.some(call => call.url.startsWith('https://example.com')));
});

test('a provider-reported failure is not retried and keeps the charge warning', async () => {
  const { handler, tasks } = setup(call => call.url === `${api}/operations/op1` ? json({ id: 'op1', done: true, error: { code: 'X' } }) : normal(call));
  const res = await request(handler);
  assert.equal(res.data.error, 'provider_failed');
  assert.equal(tasks(), 1);
});
