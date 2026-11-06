import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { IncomingMessage, type ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { deflateSync } from 'node:zlib';
import { pngChunk, pngFile, pngFixture, pngHeader } from './fixtures/prop-reference-png.ts';
import { chairFixture, meshRecord, mutateChair } from './fixtures/prop-glb.ts';

// Proposed 8C contract: no top-level import of the missing server module. All transport is injected or blocked;
// authored synthetic responses are not evidence that live Meshy output passes 8D admission.
const origin = 'http://127.0.0.1:5173';
const endpoint = '/api/prop-mesh';
const createUrl = 'https://api.meshy.ai/openapi/v1/image-to-3d';
const taskId = '018a210d-8ba4-705c-b111-1f1776f7f578';
const pollUrl = `${createUrl}/${taskId}`;
const assetPath = `/PRIVATE_ACCOUNT/tasks/${taskId}/output/model.glb?Expires=1792771679&Signature=PRIVATE_SIGNED_SENTINEL`;
const glbUrl = `https://assets.meshy.ai${assetPath}`;
const key = 'synthetic-meshy-key-not-a-credential';
const model = 'meshy-t2.5';
const meshPath = '../src/server/prop-mesh.ts';
const referencePath = '../src/server/prop-reference-image-openai.ts';
type Handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => void | Promise<void>;
type Reference = { id: string; requestId: string; source: 'provider' | 'synthetic'; provider: string; model: string;
  width: number; height: number; sha256: string };
type StoredReference = { reference: Reference; bytes: Buffer };
type MeshOptions = { origin: string; enabled?: boolean; spendingConfirmed?: boolean; getApiKey?: () => string | undefined;
  fetch?: typeof globalThis.fetch; readReference?: (id: string) => StoredReference | null };
type Call = { url: string; init: RequestInit };
async function meshFactory(): Promise<{ createPropMeshHandler(options: MeshOptions): Handler }> { return import(meshPath); }
async function referenceFactory(): Promise<{ createOpenAiPropReferenceImageHandler(options: Record<string, unknown>): Handler & { readReference(id: string): StoredReference | null } }> {
  return import(referencePath);
}
// Authored 1024x1024 RGB reference matching the OpenAI image step; pngFixture is capped at 512.
let cachedReference: Buffer | undefined;
function reference1024() {
  if (cachedReference) return cachedReference;
  const rowSize = 1 + 1024 * 3;
  const rows = Buffer.alloc(rowSize * 1024);
  for (let y = 0; y < 1024; y += 1) for (let x = 0; x < 1024; x += 1) rows.set(x < 512 ? [79, 102, 97] : [180, 138, 69], y * rowSize + 1 + x * 3);
  return cachedReference = pngFile(pngHeader(1024, 1024), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND'));
}
function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const turn = () => new Promise<void>(resolve => setImmediate(resolve));
const referenceId = (requestId: string) => `reference-${requestId}-0000`;
function storedReference(requestId = 'request-1', source: Reference['source'] = 'synthetic', bytes: Buffer = reference1024(),
  overrides: Partial<Reference> = {}): StoredReference {
  return { reference: { id: referenceId(requestId), requestId, source, provider: 'openai', model: 'gpt-image-2.5-flare', width: 1024, height: 1024,
    sha256: createHash('sha256').update(bytes).digest('hex'), ...overrides }, bytes };
}
function references(...items: StoredReference[]) {
  const stored = new Map(items.map(item => [item.reference.id, item]));
  let reads = 0;
  return {
    readReference(id: string) {
      reads += 1;
      const item = stored.get(id);
      return item ? { reference: { ...item.reference }, bytes: Buffer.from(item.bytes) } : null;
    },
    get reads() { return reads; },
  };
}
function input(requestId = 'request-1', reference = referenceId(requestId)) { return { requestId, referenceId: reference }; }
function task(status = 'SUCCEEDED', overrides: Record<string, unknown> = {}) {
  return { id: taskId, type: 'image-to-3d', status, progress: status === 'SUCCEEDED' ? 100 : 40,
    model_urls: status === 'SUCCEEDED' ? { glb: glbUrl } : {},
    thumbnail_url: status === 'SUCCEEDED' ? `https://assets.meshy.ai/PRIVATE_ACCOUNT/tasks/${taskId}/output/preview.png?Signature=PRIVATE_SIGNED_SENTINEL` : '',
    texture_urls: [], task_error: null, preceding_tasks: 0, consumed_credits: 5, created_at: 1, started_at: 1, finished_at: 0, expires_at: 2, ...overrides };
}
function inProgress(retryAfter?: string) { return json(task('IN_PROGRESS'), 200, retryAfter === undefined ? {} : { 'retry-after': retryAfter }); }
function glb(bytes: ArrayBuffer | Uint8Array = chairFixture({ textured: false }).bytes, headers: Record<string, string> = {}) {
  return new Response(Uint8Array.from(new Uint8Array(bytes)), { headers: { 'content-type': 'model/gltf-binary', ...headers } });
}
function normalResponse(call: Call): Response {
  if (call.url === createUrl) return json({ result: taskId }, 202);
  if (call.url === pollUrl) return json(task());
  if (call.url === glbUrl) return glb();
  assert.fail(`Unexpected synthetic destination: ${call.url}`);
}
async function setup(respond: (call: Call) => Response | Promise<Response> = normalResponse, store = references(storedReference())) {
  const { createPropMeshHandler } = await meshFactory();
  const calls: Call[] = [];
  let keyReads = 0;
  const fetch: typeof globalThis.fetch = async (value, init = {}) => {
    const call = { url: String(value), init };
    calls.push(call);
    return respond(call);
  };
  const handler = createPropMeshHandler({ origin, enabled: true, spendingConfirmed: true,
    getApiKey: () => { keyReads += 1; return key; }, fetch, readReference: store.readReference });
  return { createPropMeshHandler, handler, calls, store, get keyReads() { return keyReads; },
    posts: () => calls.filter(call => call.init.method === 'POST').length,
    polls: () => calls.filter(call => call.url === pollUrl).length,
    downloads: () => calls.filter(call => call.url === glbUrl).length };
}
class CapturedResponse extends EventEmitter {
  statusCode = 200;
  writableEnded = false;
  destroyed = false;
  closed = false;
  headers = new Map<string, string>();
  body: Buffer | undefined;
  setHeader(name: string, value: string | number) { this.headers.set(name.toLowerCase(), String(value)); return this; }
  end(value: string | Uint8Array) {
    this.body = Buffer.from(value);
    this.writableEnded = true;
    this.emit('finish');
    this.closed = true;
    this.emit('close');
    return this;
  }
  disconnect() { this.destroyed = true; this.closed = true; this.emit('close'); }
  get data() { assert.ok(this.body); return JSON.parse(this.body.toString('utf8')); }
}
function begin(handler: Handler, options: {
  method?: string; url?: string; remoteAddress?: string; headers?: Record<string, string | undefined>;
  rawHeaders?: string[]; body?: string | Uint8Array | null;
} = {}) {
  // Unconnected in-memory sockets only; no listener, DNS or provider access.
  const socket = new Socket();
  Object.defineProperty(socket, 'remoteAddress', { value: options.remoteAddress ?? '127.0.0.1' });
  const req = new IncomingMessage(socket);
  req.method = options.method ?? 'POST';
  req.url = options.url ?? endpoint;
  req.headers = { host: '127.0.0.1:5173', origin, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...options.headers };
  req.rawHeaders = options.rawHeaders ?? Object.entries(req.headers).flatMap(([name, value]) => value === undefined ? [] : [name, value]);
  const res = new CapturedResponse();
  let nextCalls = 0;
  const done = Promise.resolve(handler(req, res as unknown as ServerResponse, () => { nextCalls += 1; }));
  const body = options.body === undefined ? JSON.stringify(input()) : options.body;
  if (body !== null) { req.complete = true; req.push(Buffer.from(body)); req.push(null); }
  return { req, res, done, get nextCalls() { return nextCalls; } };
}
async function request(handler: Handler, options: Parameters<typeof begin>[1] = {}) {
  const operation = begin(handler, options);
  await operation.done;
  return operation;
}
function status(handler: Handler) { return request(handler, { method: 'GET' }); }
function post(handler: Handler, requestId: string) { return request(handler, { body: JSON.stringify(input(requestId)) }); }
async function drive(t: TestContext, operation: ReturnType<typeof begin>, limit = 700) {
  let settled = false;
  void operation.done.then(() => { settled = true; });
  for (let index = 0; index < limit && !settled; index += 1) { t.mock.timers.tick(1000); await turn(); }
  await operation.done;
}
function privateResponse(res: CapturedResponse) {
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.has('access-control-allow-origin'), false);
  const text = res.body?.toString('latin1') ?? '';
  for (const secret of [key, 'PRIVATE_SIGNED_SENTINEL', 'PRIVATE_UPSTREAM_SENTINEL', 'PRIVATE_ACCOUNT', 'assets.meshy.ai', 'Signature=']) {
    assert.equal(text.includes(secret), false, secret);
  }
}
function noRemoteMutation(calls: Call[]) {
  assert.ok(calls.every(call => call.init.method !== 'DELETE'), 'local cancellation only; no remote delete or refund claim');
  assert.ok(calls.filter(call => call.init.method === 'POST').every(call => call.url === createUrl));
}

// This named RED touches only existing config and installed dependencies, not the missing server factory.
test('8C RED: disabled mesh middleware answers local readiness instead of falling through', async t => {
  const flags = ['EVA_ENABLE_ROOM_INTERPRETATION', 'EVA_ENABLE_SPEECH', 'EVA_SPEECH_PRIVACY_CONFIRMED', 'EVA_ENABLE_INVESTIGATION_NARRATION',
    'EVA_ENABLE_PROP_REFERENCE_IMAGE', 'EVA_PROP_REFERENCE_IMAGE_SPENDING_CONFIRMED', 'EVA_ENABLE_PROP_MESH', 'EVA_PROP_MESH_SPENDING_CONFIRMED'];
  const previous = flags.map(name => process.env[name]);
  t.after(() => flags.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index];
  }));
  for (const name of flags) process.env[name] = '0';
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', () => { fetches += 1; throw new Error('Disabled mesh status must not fetch.'); });
  const { default: config } = await import('../vite.config.ts');
  const handlers: Handler[] = [];
  const plugins = (config.plugins as unknown[])?.flat(Infinity) as { name?: string; configureServer?: (server: unknown) => unknown }[];
  for (const plugin of plugins) {
    if (plugin?.name?.startsWith('local-') && typeof plugin.configureServer === 'function') {
      await plugin.configureServer({ middlewares: { use(handler: Handler) { handlers.push(handler); } } });
    }
  }
  const route: Handler = async (req, res, next) => {
    for (const handler of handlers) {
      let passed = false;
      await handler(req, res, () => { passed = true; });
      if (!passed) return;
    }
    next();
  };
  const operation = await status(route);
  assert.equal(operation.res.statusCode, 503, 'disabled prop meshes must answer readiness, not fall through to the app');
  assert.equal(operation.nextCalls, 0);
  assert.deepEqual(operation.res.data, { available: false, reason: 'disabled', provider: 'meshy', model,
    credentialStatus: 'unchecked', remainingRequests: 3, pendingTransport: false });
  privateResponse(operation.res);
  const disabledPost = await request(route);
  assert.equal(disabledPost.res.statusCode, 503);
  assert.equal(disabledPost.res.data.error, 'disabled');
  assert.equal(fetches, 0);
});

test('disabled, spending-unconfirmed and readiness paths read no key, reference or transport', async () => {
  const { createPropMeshHandler } = await meshFactory();
  for (const options of [{}, { enabled: false, spendingConfirmed: true }, { enabled: true },
    { enabled: true, spendingConfirmed: false }, { enabled: true, spendingConfirmed: true }]) {
    let keyReads = 0;
    let fetches = 0;
    const store = references(storedReference());
    const handler = createPropMeshHandler({ origin, ...options, readReference: store.readReference,
      getApiKey: () => { keyReads += 1; throw new Error('Status must not read a credential.'); },
      fetch: async () => { fetches += 1; throw new Error('Status must not use transport.'); } });
    const available = options.enabled === true && options.spendingConfirmed === true;
    const local = (await status(handler)).res;
    assert.equal(local.statusCode, available ? 200 : 503);
    assert.deepEqual(local.data, { available, reason: !options.enabled ? 'disabled' : !options.spendingConfirmed ? 'spending_unconfirmed' : null,
      provider: 'meshy', model, credentialStatus: 'unchecked', remainingRequests: 3, pendingTransport: false });
    privateResponse(local);
    if (!available) {
      const blocked = (await request(handler)).res;
      assert.equal(blocked.statusCode, 503);
      assert.equal(blocked.data.error, options.enabled ? 'spending_unconfirmed' : 'disabled');
      assert.equal(blocked.data.remainingRequests, 3);
    }
    assert.equal(keyReads, 0);
    assert.equal(fetches, 0);
    assert.equal(store.reads, 0);
  }
});

test('missing, malformed or throwing key getters spend nothing and are reached only by an admissible explicit POST', async () => {
  const { createPropMeshHandler } = await meshFactory();
  for (const value of [undefined, '', '   ', 'line\nbreak', 'throws'] as const) {
    let reads = 0;
    const handler = createPropMeshHandler({ origin, enabled: true, spendingConfirmed: true, readReference: references(storedReference()).readReference,
      getApiKey: () => { reads += 1; if (value === 'throws') throw new Error('PRIVATE_UPSTREAM_SENTINEL'); return value; },
      fetch: async () => { assert.fail('a missing key cannot submit'); } });
    await status(handler);
    await request(handler, { body: '{}' });
    assert.equal(reads, 0);
    const response = (await request(handler)).res;
    assert.equal(response.statusCode, 503);
    assert.equal(response.data.error, 'missing_key');
    assert.equal(response.data.remainingRequests, 3);
    assert.equal(reads, 1);
    await status(handler);
    assert.equal(reads, 1);
    privateResponse(response);
  }
});

test('mesh routes retain exact loopback Host Origin method duplicate-header and path protections', async () => {
  const app = await setup();
  for (const bad of ['http://localhost:5173', `${origin}/`, 'http://127.0.0.1:5174', 'https://127.0.0.1:5173']) {
    assert.throws(() => app.createPropMeshHandler({ origin: bad }), /origin/i);
  }
  const preview = app.createPropMeshHandler({ origin: 'http://127.0.0.1:4173' });
  assert.equal((await request(preview, { method: 'GET', headers: { host: '127.0.0.1:4173', origin: 'http://127.0.0.1:4173' } })).res.statusCode, 503);
  for (const url of ['/', '/api/prop-reference-image', '/api/compose-room', '/src/App.tsx']) {
    assert.equal((await request(app.handler, { url })).nextCalls, 1);
  }
  for (const url of [`${endpoint}/`, `${endpoint}?url=https://invalid.example`, `${endpoint}/../private`, `${endpoint}/${taskId}`, `${endpoint}/fixture-success`]) {
    assert.equal((await request(app.handler, { method: 'GET', url })).res.statusCode, 404);
  }
  for (const method of ['PUT', 'DELETE', 'OPTIONS', 'HEAD']) assert.equal((await request(app.handler, { method })).res.statusCode, 405);
  for (const headers of [{ host: undefined }, { host: 'evil.example' }, { origin: undefined }, { origin: 'null' },
    { origin: 'https://evil.example' }, { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' }]) {
    assert.equal((await request(app.handler, { headers })).res.statusCode, 403);
  }
  assert.equal((await request(app.handler, { remoteAddress: '192.0.2.1' })).res.statusCode, 403);
  for (const name of ['host', 'origin', 'content-type', 'content-length', 'content-encoding', 'transfer-encoding', 'sec-fetch-site']) {
    assert.equal((await request(app.handler, { rawHeaders: [name, 'first', name.toUpperCase(), 'second'] })).res.statusCode, 403);
  }
  assert.equal(app.calls.length, 0);
  assert.equal(app.keyReads, 0);
  assert.equal(app.store.reads, 0);
});

test('closed local reference input and bounded JSON reject before reference lookup, key access or submission', async () => {
  const app = await setup();
  const invalid = [null, [], {}, { requestId: 'request-1' }, { referenceId: referenceId('request-1') },
    { ...input(), requestId: '' }, { ...input(), requestId: 'x'.repeat(129) }, { ...input(), requestId: 'a\nb' }, { ...input(), requestId: 1 },
    { ...input(), referenceId: 'short' }, { ...input(), referenceId: 'x'.repeat(129) }, { ...input(), referenceId: '../reference-request-1' },
    { ...input(), referenceId: 1 },
    ...['visual', 'url', 'image_url', 'imageUrl', 'model', 'ai_model', 'target_polycount', 'provider', 'source', 'permissions', 'synthetic']
      .map(name => ({ ...input(), [name]: 'PRIVATE_UPSTREAM_SENTINEL' }))];
  for (const body of invalid) assert.equal((await request(app.handler, { body: JSON.stringify(body) })).res.statusCode, 400, JSON.stringify(body));
  for (const body of ['{', '{}{}', new Uint8Array([0xff])]) assert.equal((await request(app.handler, { body })).res.statusCode, 400);
  for (const type of [undefined, 'text/plain', 'application/json; charset=latin1']) {
    assert.equal((await request(app.handler, { headers: { 'content-type': type } })).res.statusCode, 415);
  }
  assert.equal((await request(app.handler, { headers: { 'content-encoding': 'gzip' } })).res.statusCode, 415);
  assert.equal((await request(app.handler, { headers: { 'content-length': '4097' } })).res.statusCode, 413);
  assert.equal((await request(app.handler, { body: '{}'.padEnd(4097, ' ') })).res.statusCode, 413);
  assert.equal(app.keyReads, 0);
  assert.equal(app.calls.length, 0);
  assert.equal(app.store.reads, 0);
  assert.equal((await status(app.handler)).res.data.remainingRequests, 3);
});

test('unknown, mismatched, corrupt or integrity-failing references cannot reach the key or the provider', async () => {
  const cases: [string, StoredReference[], ReturnType<typeof input>, number, string][] = [
    ['unknown', [], input(), 404, 'reference_not_found'],
    ['mismatched request', [storedReference('request-1')], input('request-2', referenceId('request-1')), 409, 'reference_mismatch'],
    ['small PNG', [storedReference('request-1', 'synthetic', pngFixture(2, 2))], input(), 422, 'invalid_reference'],
    ['corrupt PNG', [storedReference('request-1', 'synthetic', Buffer.from('not a PNG'))], input(), 422, 'invalid_reference'],
    ['lying dimensions', [storedReference('request-1', 'synthetic', pngFixture(256, 256))], input(), 422, 'invalid_reference'],
    ['hash mismatch', [storedReference('request-1', 'synthetic', reference1024(), { sha256: 'a'.repeat(64) })], input(), 422, 'invalid_reference'],
    ['previous 512 size', [storedReference('request-1', 'synthetic', pngFixture(512, 512), { width: 512, height: 512 })], input(), 422, 'invalid_reference'],
    ['BFL provider', [storedReference('request-1', 'synthetic', reference1024(), { provider: 'bfl', model: 'flux-2-flex' })], input(), 422, 'invalid_reference'],
    ['over 6 MiB', [storedReference('request-1', 'synthetic', Buffer.concat([reference1024(), Buffer.alloc(6 * 1024 * 1024)]))], input(), 422, 'invalid_reference'],
  ];
  for (const [label, stored, body, code, error] of cases) {
    const app = await setup(normalResponse, references(...stored));
    const response = (await request(app.handler, { body: JSON.stringify(body) })).res;
    assert.equal(response.statusCode, code, label);
    assert.equal(response.data.error, error, label);
    assert.equal(response.data.remainingRequests, 3, label);
    assert.equal(app.keyReads, 0, label);
    assert.equal(app.calls.length, 0, label);
    privateResponse(response);
  }
});

test('a provider-mode handler refuses synthetic references before key access so fixtures cannot drive real spend', async t => {
  const { createPropMeshHandler } = await meshFactory();
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', () => { fetches += 1; throw new Error('Provider transport must not be reached.'); });
  let keyReads = 0;
  const handler = createPropMeshHandler({ origin, enabled: true, spendingConfirmed: true, readReference: references(storedReference()).readReference,
    getApiKey: () => { keyReads += 1; return key; } });
  const response = (await request(handler)).res;
  assert.equal(response.statusCode, 409);
  assert.equal(response.data.error, 'synthetic_reference');
  assert.equal(response.data.remainingRequests, 3);
  assert.equal(keyReads, 0);
  assert.equal(fetches, 0);
  privateResponse(response);
});

test('one synthetic success submits the exact closed mesh-only body and serves the 8D-admitted GLB with truthful provenance', async () => {
  const app = await setup(normalResponse, references(storedReference('request-1', 'provider')));
  const response = (await request(app.handler, { headers: { authorization: 'incoming-auth', cookie: 'incoming-cookie', 'x-key': 'incoming-key' } })).res;
  assert.equal(response.statusCode, 200);
  const record = meshRecord(chairFixture({ textured: false }).bytes);
  const mesh = response.data.mesh;
  assert.match(mesh.id, /^[A-Za-z0-9_-]{16,128}$/);
  assert.deepEqual(response.data, { mesh: { id: mesh.id, requestId: 'request-1', referenceId: referenceId('request-1'),
    source: 'synthetic', provider: 'meshy', model, bytes: record.bytes, sha256: record.sha256 }, remainingRequests: 2 },
  'an injected transport is synthetic even when the reference came from a provider');
  assert.deepEqual(app.calls.map(call => [call.init.method, call.url]), [['POST', createUrl], ['GET', pollUrl], ['GET', glbUrl]]);
  assert.equal(app.keyReads, 1);
  const payload = JSON.parse(String(app.calls[0].init.body));
  assert.deepEqual(payload, { image_url: `data:image/png;base64,${reference1024().toString('base64')}`, model_type: 'smart-topology',
    ai_model: model, target_polycount: 10000, should_texture: false, target_formats: ['glb'] });
  assert.doesNotMatch(String(app.calls[0].init.body), /request-1|reference-|incoming|owner|history|solution|moderation|enable_pbr|remesh|auto_size/);
  for (const [index, call] of app.calls.entries()) {
    assert.equal(call.init.redirect, 'error');
    assert.equal(call.init.credentials, 'omit');
    assert.equal(call.init.cache, 'no-store');
    assert.ok(call.init.signal instanceof AbortSignal);
    const headers = new Headers(call.init.headers);
    assert.equal(headers.get('authorization'), index < 2 ? `Bearer ${key}` : null, 'the key goes only to api.meshy.ai');
    assert.equal(headers.has('x-key'), false);
    assert.equal(headers.has('cookie'), false);
    if (index === 0) assert.match(headers.get('content-type') ?? '', /^application\/json/);
  }
  noRemoteMutation(app.calls);
  privateResponse(response);
  const served = (await request(app.handler, { method: 'GET', url: `${endpoint}/${mesh.id}` })).res;
  assert.equal(served.statusCode, 200);
  assert.equal(served.headers.get('content-type'), 'model/gltf-binary');
  assert.equal(served.headers.get('content-length'), String(record.bytes));
  assert.equal(served.headers.get('x-eva-mesh-sha256'), record.sha256);
  assert.equal(served.headers.get('x-eva-mesh-source'), 'synthetic');
  assert.equal(served.headers.get('x-eva-mesh-request-id'), 'request-1');
  assert.deepEqual(new Uint8Array(served.body!), new Uint8Array(chairFixture({ textured: false }).bytes));
  privateResponse(served);
  await status(app.handler);
  assert.equal(app.calls.length, 3, 'serving and status cannot poll, download or resubmit');
  assert.equal(app.keyReads, 1);
});

test('the existing reference handler exposes copied server-side references that feed one end-to-end synthetic mesh', async () => {
  const { createOpenAiPropReferenceImageHandler } = await referenceFactory();
  const images = createOpenAiPropReferenceImageHandler({ origin, enabled: true, spendingConfirmed: true, getApiKey: () => 'synthetic-openai-key',
    fetch: async (value: RequestInfo | URL) => {
      const url = String(value);
      if (url === 'https://api.openai.com/v1/images/generations') {
        return json({ data: [{ b64_json: reference1024().toString('base64') }], usage: { input_tokens: 50, output_tokens: 272, total_tokens: 322 } });
      }
      assert.fail(url);
    } });
  const created = (await request(images, { url: '/api/prop-reference-image', body: JSON.stringify({ requestId: 'request-1',
    visual: { kind: 'chair', color: 'teal', description: 'A rounded teal chair.' } }) })).res;
  assert.equal(created.statusCode, 200);
  const reference = created.data.reference;
  assert.equal(images.readReference('00000000-0000-4000-8000-000000000000'), null);
  const copy = images.readReference(reference.id)!;
  assert.deepEqual(copy.reference, reference);
  assert.deepEqual(new Uint8Array(copy.bytes), new Uint8Array(reference1024()));
  copy.bytes.fill(0);
  (copy.reference as { requestId: string }).requestId = 'mutated';
  assert.deepEqual(new Uint8Array(images.readReference(reference.id)!.bytes), new Uint8Array(reference1024()), 'callers receive copies');
  assert.equal(images.readReference(reference.id)!.reference.requestId, 'request-1');
  const app = await setup(normalResponse, { readReference: (id: string) => images.readReference(id), reads: 0 });
  const response = (await request(app.handler, { body: JSON.stringify(input('request-1', reference.id)) })).res;
  assert.equal(response.statusCode, 200);
  assert.equal(response.data.mesh.referenceId, reference.id);
  assert.equal((await request(images, { method: 'GET', url: '/api/prop-reference-image' })).res.data.remainingRequests, 2,
    'mesh submissions never spend the image allowance');
  assert.equal((await status(app.handler)).res.data.remainingRequests, 2);
});

test('three mesh submissions are a server-lifetime ceiling and every stored mesh remains locally servable', async () => {
  const app = await setup(normalResponse, references(...['request-1', 'request-2', 'request-3', 'request-4'].map(id => storedReference(id))));
  const ids: string[] = [];
  for (let index = 0; index < 3; index += 1) {
    const response = (await post(app.handler, `request-${index + 1}`)).res;
    assert.equal(response.statusCode, 200);
    ids.push(response.data.mesh.id);
    assert.equal((await status(app.handler)).res.data.remainingRequests, 2 - index);
  }
  const exhausted = (await post(app.handler, 'request-4')).res;
  assert.equal(exhausted.statusCode, 429);
  assert.equal(exhausted.data.error, 'budget_exhausted');
  assert.equal(new Set(ids).size, 3);
  for (const id of ids) assert.equal((await request(app.handler, { method: 'GET', url: `${endpoint}/${id}` })).res.statusCode, 200);
  assert.equal(app.posts(), 3);
  assert.equal(app.keyReads, 3);
  assert.equal((await status(app.handler)).res.data.remainingRequests, 0);
});

test('duplicate request correlation and a consumed reference are rejected rather than retried after success or uncertainty', async () => {
  for (const uncertain of [false, true]) {
    const app = await setup(call => {
      if (uncertain && call.url === createUrl) throw new Error('PRIVATE_UPSTREAM_SENTINEL');
      return normalResponse(call);
    });
    const first = (await request(app.handler)).res;
    assert.equal(first.statusCode === 200, !uncertain);
    if (uncertain) {
      assert.equal(first.data.error, 'submission_uncertain');
      assert.match(first.data.message, /unknown|uncertain/i);
      assert.match(first.data.message, /charge|bill/i);
      assert.equal(first.data.remoteCancelled, false);
    }
    const calls = app.calls.length;
    const duplicate = (await request(app.handler)).res;
    assert.equal(duplicate.statusCode, 409);
    assert.equal(duplicate.data.error, 'duplicate_request');
    assert.equal(app.calls.length, calls);
    assert.equal(app.keyReads, 1);
    assert.equal((await status(app.handler)).res.data.remainingRequests, 2);
    privateResponse(first);
  }
});

test('create responses need 200 or 202 and one path-safe task ID before any poll; the poll URL is built locally', async () => {
  for (const code of [200, 202]) {
    const app = await setup(call => call.url === createUrl ? json({ result: taskId }, code) : normalResponse(call));
    assert.equal((await request(app.handler)).res.statusCode, 200);
    assert.equal(app.calls[1].url, pollUrl);
  }
  for (const body of [null, [], {}, { result: '' }, { result: 'x'.repeat(129) }, { result: 'a/b' }, { result: '../x' },
    { result: 'abc def' }, { result: `${taskId}?x=1` }, { result: 1 }, { id: taskId }]) {
    const app = await setup(call => call.url === createUrl ? json(body, 202) : normalResponse(call));
    const response = (await request(app.handler)).res;
    assert.ok(response.statusCode >= 400, JSON.stringify(body));
    assert.equal(app.calls.length, 1);
    assert.equal(response.data.remainingRequests, 2);
    assert.match(response.data.message, /unknown|uncertain/i, 'unsafe acceptance is not a confirmed remote failure');
    assert.match(response.data.message, /charge|bill/i);
    privateResponse(response);
  }
});

test('submission HTTP failures map to fixed local codes, consume the attempt and never retry or echo upstream bodies', async () => {
  for (const [code, error] of [[400, 'invalid_request_upstream'], [401, 'provider_auth'], [402, 'provider_payment'],
    [403, 'provider_rejected'], [429, 'provider_busy'], [500, 'submission_uncertain'], [503, 'submission_uncertain']] as const) {
    const app = await setup(call => call.url === createUrl
      ? json({ message: 'PRIVATE_UPSTREAM_SENTINEL', key }, code, { 'retry-after': '1' }) : normalResponse(call));
    const response = (await request(app.handler)).res;
    assert.ok(response.statusCode >= 400);
    assert.equal(response.data.error, error, String(code));
    assert.equal(response.data.remainingRequests, 2);
    assert.equal(response.data.remoteCancelled, false);
    assert.equal(app.posts(), 1);
    assert.equal(app.polls(), 0);
    if (code >= 500) assert.match(response.data.message, /charge|bill/i);
    privateResponse(response);
  }
});

test('Retry-After is honoured as whole seconds clamped to 1-30 s, defaulting to 5 s, for progress and tolerated poll failures', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  for (const [label, first, delay] of [
    ['0', () => inProgress('0'), 1000], ['1', () => inProgress('1'), 1000], ['7', () => inProgress('7'), 7000],
    ['120', () => inProgress('120'), 30000], ['missing', () => inProgress(), 5000], ['abc', () => inProgress('abc'), 5000],
    ['1.5', () => inProgress('1.5'), 5000], ['-3', () => inProgress('-3'), 5000],
    ['date', () => inProgress('Wed, 21 Oct 2026 07:28:00 GMT'), 5000],
    ['429', () => json({ message: 'Rate limit exceeded' }, 429, { 'retry-after': '7' }), 7000],
    ['503', () => json({ message: 'PRIVATE_UPSTREAM_SENTINEL' }, 503), 5000],
  ] as const) {
    const firstPoll = deferred<void>();
    let polls = 0;
    const app = await setup(call => {
      if (call.url !== pollUrl) return normalResponse(call);
      polls += 1;
      if (polls === 1) { firstPoll.resolve(); return first(); }
      return json(task());
    });
    const operation = begin(app.handler);
    await firstPoll.promise;
    await turn();
    t.mock.timers.tick(delay - 1);
    await turn();
    assert.equal(polls, 1, label);
    t.mock.timers.tick(1);
    await turn();
    assert.equal(polls, 2, label);
    await operation.done;
    assert.equal(operation.res.statusCode, 200, label);
    assert.equal(app.posts(), 1);
  }
});

test('up to three consecutive 429/5xx/network poll failures are tolerated and a successful poll resets the count', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const sequence: (() => Response)[] = [
    () => json({ message: 'Rate limit exceeded' }, 429, { 'retry-after': '2' }), () => json({}, 503),
    () => { throw new Error('PRIVATE_UPSTREAM_SENTINEL'); }, () => inProgress('1'),
    () => json({}, 500), () => json({}, 502), () => new Response('gateway', { status: 504 }), () => json(task()),
  ];
  let polls = 0;
  const firstPoll = deferred<void>();
  const app = await setup(call => {
    if (call.url !== pollUrl) return normalResponse(call);
    firstPoll.resolve();
    return sequence[polls++]();
  });
  const operation = begin(app.handler);
  // Reference PNG admission uses real threadpool zlib; advance mocked time only once polling has begun.
  await firstPoll.promise;
  await turn();
  await drive(t, operation);
  assert.equal(operation.res.statusCode, 200);
  assert.equal(app.polls(), 8);
  assert.equal(app.posts(), 1);
  assert.equal(app.downloads(), 1);
  noRemoteMutation(app.calls);
  privateResponse(operation.res);
});

test('a fourth consecutive tolerated poll failure ends as poll_uncertain without remote cancellation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const sequence: (() => Response)[] = [() => json({}, 429, { 'retry-after': '1' }), () => json({}, 500),
    () => { throw new Error('PRIVATE_UPSTREAM_SENTINEL'); }, () => json({}, 503), () => json(task())];
  let polls = 0;
  const firstPoll = deferred<void>();
  const app = await setup(call => {
    if (call.url !== pollUrl) return normalResponse(call);
    firstPoll.resolve();
    return sequence[polls++]();
  });
  const operation = begin(app.handler);
  // Reference PNG admission uses real threadpool zlib; advance mocked time only once polling has begun.
  await firstPoll.promise;
  await turn();
  await drive(t, operation);
  assert.ok(operation.res.statusCode >= 400);
  assert.equal(operation.res.data.error, 'poll_uncertain');
  assert.equal(operation.res.data.remoteCancelled, false);
  assert.match(operation.res.data.message, /may still|unknown/i);
  assert.match(operation.res.data.message, /charge|bill/i);
  assert.equal(operation.res.data.mesh, undefined);
  assert.equal(app.polls(), 4);
  assert.equal(app.downloads(), 0);
  assert.equal(app.posts(), 1);
  noRemoteMutation(app.calls);
  privateResponse(operation.res);
});

test('a 30-second poll timeout aborts only that poll and counts as a tolerated failure', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const firstPoll = deferred<void>();
  const app = await setup(call => {
    if (call.url !== pollUrl) return normalResponse(call);
    firstPoll.resolve();
    return new Promise<Response>((_, reject) => {
      const signal = call.init.signal!;
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  });
  const operation = begin(app.handler);
  await firstPoll.promise;
  await turn();
  const firstSignal = app.calls[1].init.signal!;
  t.mock.timers.tick(29999);
  await turn();
  assert.equal(firstSignal.aborted, false);
  t.mock.timers.tick(1);
  await turn();
  assert.equal(firstSignal.aborted, true);
  assert.equal(operation.res.body, undefined, 'one poll timeout does not end the operation');
  await drive(t, operation);
  assert.equal(operation.res.data.error, 'poll_uncertain');
  assert.equal(app.polls(), 4);
  assert.equal(app.posts(), 1);
  assert.equal((await status(app.handler)).res.data.pendingTransport, false);
});

test('other poll 4xx, redirects and malformed bodies fail closed on the first poll', async () => {
  const bodies: (() => Response)[] = [
    ...[400, 401, 403, 404, 409].map(code => () => json({ message: 'PRIVATE_UPSTREAM_SENTINEL' }, code)),
    () => new Response(null, { status: 302, headers: { location: 'https://evil.example/' } }),
    () => new Response('{}', { headers: { 'content-type': 'text/html' } }),
    () => new Response(new Uint8Array([0xff]), { headers: { 'content-type': 'application/json' } }),
    () => json({}, 200, { 'content-encoding': 'gzip' }), () => json(task(), 200, { 'content-length': '1' }),
    () => new Response(' '.repeat(64 * 1024 + 1), { headers: { 'content-type': 'application/json' } }),
    () => json(null), () => json([]), () => json(task('SUCCEEDED', { id: 'foreign' })), () => json(task('SUCCEEDED', { id: undefined })),
    () => json(task('SUCCEEDED', { type: 'text-to-3d' })), () => json(task('SUCCEEDED', { status: undefined })),
    ...['succeeded', 'EXPIRED', 'QUEUED', ''].map(state => () => json(task(state))),
    () => json(task('SUCCEEDED', { model_urls: {} })), () => json(task('SUCCEEDED', { model_urls: { fbx: glbUrl } })),
    () => json(task('SUCCEEDED', { model_urls: null })), () => json(task('SUCCEEDED', { model_urls: { glb: 123 } })),
  ];
  for (const [index, make] of bodies.entries()) {
    const app = await setup(call => call.url === pollUrl ? make() : normalResponse(call));
    const response = (await request(app.handler)).res;
    assert.ok(response.statusCode >= 400, String(index));
    assert.notEqual(response.data.error, 'poll_uncertain', String(index));
    assert.equal(response.data.mesh, undefined);
    assert.equal(app.polls(), 1, String(index));
    assert.equal(app.downloads(), 0);
    assert.equal(app.calls.some(call => call.url.includes('evil.example')), false);
    assert.equal(response.data.remainingRequests, 2);
    assert.equal(response.data.remoteCancelled, false);
    assert.match(response.data.message, /charge|bill/i);
    privateResponse(response);
  }
  const padded = await setup(call => call.url === pollUrl ? json(task('SUCCEEDED', { padding: 'x'.repeat(32 * 1024) })) : normalResponse(call));
  assert.equal((await request(padded.handler)).res.statusCode, 200, 'documented task objects with signed URLs fit the 64 KiB bound');
});

test('FAILED and CANCELED are final local failures with no retry and no locally verified refund claim', async () => {
  for (const [state, error] of [['FAILED', 'provider_failed'], ['CANCELED', 'provider_rejected']] as const) {
    const app = await setup(call => call.url === pollUrl ? json(task(state, { consumed_credits: 0,
      task_error: { type: 'server_error', code: 'timeout', message: 'PRIVATE_UPSTREAM_SENTINEL' } })) : normalResponse(call));
    const response = (await request(app.handler)).res;
    assert.ok(response.statusCode >= 400);
    assert.equal(response.data.error, error);
    if (state === 'FAILED') {
      assert.match(response.data.message, /refund/i);
      assert.match(response.data.message, /not (locally )?verified|unverified/i);
    }
    assert.equal(app.posts(), 1);
    assert.equal(app.polls(), 1);
    assert.equal(app.downloads(), 0);
    assert.equal(response.data.remainingRequests, 2);
    noRemoteMutation(app.calls);
    privateResponse(response);
  }
});

test('GLB URLs must be exact signed assets.meshy.ai task outputs and never receive the key or redirects', async () => {
  for (const url of [`http://assets.meshy.ai${assetPath}`, `https://assets.meshy.ai.evil.example${assetPath}`, `https://evil.example${assetPath}`,
    `https://api.meshy.ai${assetPath}`, `https://cdn.assets.meshy.ai${assetPath}`, `https://assets.meshy.ai:444${assetPath}`,
    `https://user:secret@assets.meshy.ai${assetPath}`, `${glbUrl}#fragment`, `${glbUrl}\n`,
    'https://assets.meshy.ai/PRIVATE_ACCOUNT/tasks/foreign-task/output/model.glb?Signature=PRIVATE_SIGNED_SENTINEL',
    `https://assets.meshy.ai/PRIVATE_ACCOUNT/tasks/${taskId}/output/model.fbx?Signature=PRIVATE_SIGNED_SENTINEL`,
    `https://assets.meshy.ai/PRIVATE_ACCOUNT/tasks/${taskId}/output/pre_remeshed_model.glb?Signature=PRIVATE_SIGNED_SENTINEL`,
    `https://assets.meshy.ai/${'x'.repeat(4096)}/tasks/${taskId}/output/model.glb`, 'data:model/gltf-binary;base64,AAAA', 'file:///model.glb']) {
    const app = await setup(call => call.url === pollUrl ? json(task('SUCCEEDED', { model_urls: { glb: url } })) : normalResponse(call));
    const response = (await request(app.handler)).res;
    assert.ok(response.statusCode >= 400, url);
    assert.equal(app.calls.length, 2, url);
    privateResponse(response);
  }
  const redirected = await setup(call => call.url === glbUrl
    ? new Response(null, { status: 302, headers: { location: 'https://evil.example/model.glb' } }) : normalResponse(call));
  assert.ok((await request(redirected.handler)).res.statusCode >= 400);
  assert.equal(redirected.downloads(), 1);
  assert.equal(redirected.calls.some(call => call.url.includes('evil.example')), false);
});

test('downloaded bytes need bounded identity GLB transport and the unchanged 8D admission, including exporter metadata rejection', async () => {
  for (const type of ['model/gltf-binary', 'application/octet-stream']) {
    const app = await setup(call => call.url === glbUrl ? glb(undefined, { 'content-type': type }) : normalResponse(call));
    assert.equal((await request(app.handler)).res.statusCode, 200, type);
  }
  // Owner-approved 8M: exporter generator and object names are admitted; the stored bytes are exactly those downloaded.
  for (const [label, bytes] of [['generator metadata', mutateChair(f => { f.json.asset.generator = 'Meshy'; })],
    ['node name', mutateChair(f => { f.json.nodes[0].name = 'Mesh'; })]] as const) {
    const app = await setup(call => call.url === glbUrl ? glb(bytes) : normalResponse(call));
    const response = (await request(app.handler)).res;
    assert.equal(response.statusCode, 200, label);
    assert.equal(response.data.mesh.sha256, meshRecord(bytes).sha256, label);
  }
  for (const [label, make, error] of [
    ['html', () => glb(undefined, { 'content-type': 'text/html' }), undefined],
    ['png', () => glb(undefined, { 'content-type': 'image/png' }), undefined],
    ['gzip', () => glb(undefined, { 'content-encoding': 'gzip' }), undefined],
    ['short length', () => glb(undefined, { 'content-length': '1' }), undefined],
    ['declared oversize', () => glb(undefined, { 'content-length': String(8 * 1024 * 1024 + 1) }), undefined],
    ['empty', () => new Response(null, { headers: { 'content-type': 'model/gltf-binary' } }), undefined],
    ['not glb', () => glb(new TextEncoder().encode('abc')), 'invalid_mesh'],
    ['remote image', () => glb(mutateChair(f => { f.json.images[0].uri = 'https://invalid.example/asset.png'; })), 'invalid_mesh'],
  ] as const) {
    const app = await setup(call => call.url === glbUrl ? make() : normalResponse(call));
    const response = (await request(app.handler)).res;
    assert.ok(response.statusCode >= 400, label);
    if (error) assert.equal(response.data.error, error, label);
    assert.equal(response.data.mesh, undefined, label);
    assert.equal(app.downloads(), 1, label);
    assert.equal(app.posts(), 1);
    assert.equal(response.data.remainingRequests, 2);
    privateResponse(response);
  }
  let cancellations = 0;
  const app = await setup(call => call.url === glbUrl ? new Response(new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 1)); },
    cancel() { cancellations += 1; },
  }), { headers: { 'content-type': 'model/gltf-binary' } }) : normalResponse(call));
  assert.ok((await request(app.handler)).res.statusCode >= 400);
  assert.equal(cancellations, 1);
});

test('sixty in-progress polls exhaust local polling without another submission, download or remote cancellation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const firstPoll = deferred<void>();
  const app = await setup(call => {
    if (call.url !== pollUrl) return normalResponse(call);
    firstPoll.resolve();
    return inProgress('1');
  });
  const operation = begin(app.handler);
  await firstPoll.promise;
  await turn();
  for (let index = 1; index < 60; index += 1) { t.mock.timers.tick(1000); await turn(); }
  await operation.done;
  assert.equal(operation.res.statusCode, 504);
  assert.equal(operation.res.data.error, 'poll_limit');
  assert.equal(app.polls(), 60);
  assert.equal(app.posts(), 1);
  assert.equal(app.downloads(), 0);
  assert.equal(operation.res.data.remoteCancelled, false);
  assert.match(operation.res.data.message, /may still|unknown/i);
  assert.match(operation.res.data.message, /charge|bill/i);
  noRemoteMutation(app.calls);
});

test('the 600-second total deadline bounds individually timely polls and says the task may still complete and charge', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const firstPoll = deferred<void>();
  const pollTimes: number[] = [];
  const app = await setup(call => {
    if (call.url !== pollUrl) return normalResponse(call);
    pollTimes.push(Date.now());
    firstPoll.resolve();
    return inProgress('30');
  });
  const operation = begin(app.handler);
  // Reference PNG admission uses real threadpool zlib; advance mocked time only once polling has begun.
  await firstPoll.promise;
  await turn();
  for (let tick = 0; tick < 601 && operation.res.body === undefined; tick += 1) { t.mock.timers.tick(1000); await turn(); }
  await operation.done;
  assert.equal(operation.res.statusCode, 504);
  assert.equal(operation.res.data.error, 'timeout');
  assert.ok(app.polls() >= 19 && app.polls() <= 21, String(app.polls()));
  pollTimes.slice(1).forEach((time, index) => assert.equal(time - pollTimes[index], 30000, `poll ${index + 2} spacing`));
  assert.equal(operation.res.data.remoteCancelled, false);
  assert.match(operation.res.data.message, /may still|unknown/i);
  assert.match(operation.res.data.message, /charge|bill/i);
  assert.equal(app.posts(), 1);
});

test('a 60-second ignored-abort submission stays reserved until its late transport settles, with no automatic retry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const submitted = deferred<void>();
  const pending = deferred<Response>();
  const app = await setup(call => {
    if (call.url === createUrl) { submitted.resolve(); return pending.promise; }
    return normalResponse(call);
  }, references(storedReference('request-1'), storedReference('request-2')));
  const operation = begin(app.handler);
  await submitted.promise;
  t.mock.timers.tick(59999);
  await turn();
  assert.equal(operation.res.body, undefined);
  t.mock.timers.tick(1);
  await operation.done;
  assert.equal(operation.res.statusCode, 504);
  assert.match(operation.res.data.message, /unknown|uncertain/i);
  assert.match(operation.res.data.message, /charge|bill/i);
  assert.equal(operation.res.data.remainingRequests, 2);
  assert.equal(app.calls[0].init.signal!.aborted, true);
  const retained = (await status(app.handler)).res.data;
  assert.equal(retained.reason, 'busy');
  assert.equal(retained.pendingTransport, true);
  assert.equal((await post(app.handler, 'request-2')).res.statusCode, 409);
  let cancellations = 0;
  pending.resolve(new Response(new ReadableStream({ cancel() { cancellations += 1; } }), { headers: { 'content-type': 'application/json' } }));
  await turn();
  assert.equal(cancellations, 1);
  assert.equal(app.calls.length, 1, 'a late create response cannot start polling');
  const settled = (await status(app.handler)).res.data;
  assert.equal(settled.pendingTransport, false);
  assert.equal(settled.available, true);
  assert.equal(app.keyReads, 1);
});

test('disconnect while waiting between polls stops local work without another call or a stored mesh', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const polled = deferred<void>();
  const app = await setup(call => {
    if (call.url === pollUrl) { polled.resolve(); return inProgress('5'); }
    return normalResponse(call);
  });
  const operation = begin(app.handler);
  await polled.promise;
  await turn();
  operation.res.disconnect();
  await operation.done;
  t.mock.timers.tick(600000);
  await turn();
  assert.deepEqual(app.calls.map(call => call.url), [createUrl, pollUrl]);
  assert.equal(operation.res.body, undefined);
  const state = (await status(app.handler)).res.data;
  assert.equal(state.pendingTransport, false);
  assert.equal(state.remainingRequests, 2);
  assert.equal(state.available, true);
  assert.equal((await request(app.handler)).res.statusCode, 409);
  noRemoteMutation(app.calls);
});

test('foreign mesh IDs, provider task IDs and signed upstream data cannot become an asset proxy or leak into responses and logs', async t => {
  const logs: unknown[][] = [];
  for (const name of ['log', 'warn', 'error'] as const) t.mock.method(console, name, (...args: unknown[]) => { logs.push(args); });
  const app = await setup(call => call.url === pollUrl ? json(task('FAILED', {
    task_error: { type: 'invalid_input', message: 'PRIVATE_UPSTREAM_SENTINEL', doc_url: glbUrl },
  })) : normalResponse(call));
  privateResponse((await request(app.handler)).res);
  for (const path of ['00000000-0000-4000-8000-000000000000', taskId, encodeURIComponent(glbUrl), referenceId('request-1'), '../secrets']) {
    const response = (await request(app.handler, { method: 'GET', url: `${endpoint}/${path}` })).res;
    assert.equal(response.statusCode, 404);
    privateResponse(response);
  }
  assert.equal(app.calls.length, 2);
  assert.equal(app.keyReads, 1);
  assert.doesNotMatch(JSON.stringify(logs), /synthetic-meshy-key|PRIVATE_SIGNED_SENTINEL|PRIVATE_UPSTREAM_SENTINEL|PRIVATE_ACCOUNT/);
});

test('owner-approved 8L: a metadata-bearing 1024 OpenAI reference is accepted and sent to Meshy byte-for-byte', async () => {
  const plain = reference1024();
  const iend = plain.length - 12;
  // Ancillary chunks after IHDR and after IDAT; they are skipped, never stripped or re-encoded.
  const tagged = Buffer.concat([plain.subarray(0, 33), pngChunk('caBX', Buffer.from('jumb')), pngChunk('iCCP', Buffer.from('ICC\0\0profile')),
    plain.subarray(33, iend), pngChunk('tEXt', Buffer.from('Software\0EVA')), plain.subarray(iend)]);
  const app = await setup(normalResponse, references(storedReference('request-1', 'synthetic', tagged)));
  const response = (await request(app.handler)).res;
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(String(app.calls[0].init.body)).image_url, `data:image/png;base64,${tagged.toString('base64')}`);
  assert.equal(app.posts(), 1);
});
