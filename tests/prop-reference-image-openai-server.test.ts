import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { IncomingMessage, type ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { deflateSync } from 'node:zlib';
import { pngChunk, pngFile, pngFixture, pngHeader } from './fixtures/prop-reference-png.ts';

// Proposed OpenAI image contract: no top-level import of the missing module; all transport is injected or blocked.
// Authored synthetic responses are not evidence that live OpenAI PNGs pass the unchanged chunk allowlist.
const origin = 'http://127.0.0.1:5173';
const endpoint = '/api/prop-reference-image';
const generateUrl = 'https://api.openai.com/v1/images/generations';
const model = 'gpt-image-2.5-flare';
const key = 'synthetic-openai-key-not-a-credential';
const serverPath = '../src/server/prop-reference-image-openai.ts';
type Handler = ((req: IncomingMessage, res: ServerResponse, next: () => void) => void | Promise<void>)
  & { readReference?(id: string): { reference: Record<string, unknown>; bytes: Buffer } | null };
type Options = { origin: string; enabled?: boolean; spendingConfirmed?: boolean; getApiKey?: () => string | undefined; fetch?: typeof globalThis.fetch };
type Call = { url: string; init: RequestInit };
async function factory(): Promise<{ createOpenAiPropReferenceImageHandler(options: Options): Handler }> { return import(serverPath); }
function reference1024(extra: Buffer[] = []) {
  const rowSize = 1 + 1024 * 3;
  const rows = Buffer.alloc(rowSize * 1024);
  for (let y = 0; y < 1024; y += 1) for (let x = 0; x < 1024; x += 1) rows.set(x < 512 ? [79, 102, 97] : [180, 138, 69], y * rowSize + 1 + x * 3);
  return pngFile(pngHeader(1024, 1024), ...extra, pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND'));
}
let cached: Buffer | undefined;
const image = () => cached ??= reference1024();
function input(requestId = 'request-1') {
  return { requestId, visual: { kind: 'chair', color: 'teal', description: 'A rounded teal chair with a curved back.' } };
}
function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
}
function generated(overrides: Record<string, unknown> = {}, item: Record<string, unknown> = {}) {
  return { created: 1792771650, background: 'opaque', output_format: 'png', quality: 'low', size: '1024x1024',
    data: [{ b64_json: image().toString('base64'), revised_prompt: 'PRIVATE_UPSTREAM_SENTINEL', ...item }],
    usage: { input_tokens: 50, output_tokens: 272, total_tokens: 322, input_tokens_details: { text_tokens: 50, image_tokens: 0 } }, ...overrides };
}
function normalResponse(call: Call): Response {
  if (call.url === generateUrl) return json(generated());
  assert.fail(`Unexpected synthetic destination: ${call.url}`);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const turn = () => new Promise<void>(resolve => setImmediate(resolve));
async function setup(respond: (call: Call) => Response | Promise<Response> = normalResponse) {
  const { createOpenAiPropReferenceImageHandler } = await factory();
  const calls: Call[] = [];
  let keyReads = 0;
  const fetch: typeof globalThis.fetch = async (value, init = {}) => {
    const call = { url: String(value), init };
    calls.push(call);
    return respond(call);
  };
  const handler = createOpenAiPropReferenceImageHandler({ origin, enabled: true, spendingConfirmed: true,
    getApiKey: () => { keyReads += 1; return key; }, fetch });
  return { createOpenAiPropReferenceImageHandler, handler, calls, get keyReads() { return keyReads; } };
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
function privateResponse(res: CapturedResponse) {
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.has('access-control-allow-origin'), false);
  const text = res.body?.toString('latin1') ?? '';
  for (const secret of [key, 'PRIVATE_UPSTREAM_SENTINEL', 'revised_prompt', 'b64_json']) assert.equal(text.includes(secret), false, secret);
}
async function viteRoute(t: import('node:test').TestContext, values: Record<string, string>) {
  const flags = ['EVA_ENABLE_ROOM_INTERPRETATION', 'EVA_ENABLE_SPEECH', 'EVA_SPEECH_PRIVACY_CONFIRMED', 'EVA_ENABLE_INVESTIGATION_NARRATION',
    'EVA_ENABLE_PROP_REFERENCE_IMAGE', 'EVA_PROP_REFERENCE_IMAGE_SPENDING_CONFIRMED', 'EVA_OPENAI_IMAGE_SPENDING_CONFIRMED',
    'EVA_ENABLE_PROP_MESH', 'EVA_PROP_MESH_SPENDING_CONFIRMED'];
  const previous = flags.map(name => process.env[name]);
  t.after(() => flags.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index];
  }));
  for (const name of flags) process.env[name] = values[name] ?? '0';
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
  return route;
}

// This named RED touches only existing config and installed dependencies, not the missing server factory.
test('8O RED: configured reference middleware reports the disabled OpenAI image provider', async t => {
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', () => { fetches += 1; throw new Error('Disabled image status must not fetch.'); });
  const route = await viteRoute(t, {});
  const operation = await status(route);
  assert.equal(operation.res.statusCode, 503);
  assert.equal(operation.nextCalls, 0);
  assert.deepEqual(operation.res.data, { available: false, reason: 'disabled', provider: 'openai', model,
    credentialStatus: 'unchecked', remainingRequests: 3, pendingTransport: false });
  privateResponse(operation.res);
  const disabledPost = await request(route);
  assert.equal(disabledPost.res.statusCode, 503);
  assert.equal(disabledPost.res.data.error, 'disabled');
  assert.equal(fetches, 0);
});

test('a previous BFL spending confirmation cannot authorise OpenAI spending through config', async t => {
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', () => { fetches += 1; throw new Error('Unconfirmed image spending must not fetch.'); });
  const route = await viteRoute(t, { EVA_ENABLE_PROP_REFERENCE_IMAGE: '1', EVA_PROP_REFERENCE_IMAGE_SPENDING_CONFIRMED: '1' });
  const local = (await status(route)).res;
  assert.equal(local.statusCode, 503);
  assert.equal(local.data.reason, 'spending_unconfirmed');
  assert.equal(local.data.provider, 'openai');
  const blocked = (await request(route)).res;
  assert.equal(blocked.data.error, 'spending_unconfirmed');
  assert.equal(blocked.data.remainingRequests, 3);
  assert.equal(fetches, 0);
});

test('disabled, spending-unconfirmed and readiness paths read no key and use no transport', async () => {
  const { createOpenAiPropReferenceImageHandler } = await factory();
  for (const options of [{}, { enabled: false, spendingConfirmed: true }, { enabled: true },
    { enabled: true, spendingConfirmed: false }, { enabled: true, spendingConfirmed: true }]) {
    let keyReads = 0;
    let fetches = 0;
    const handler = createOpenAiPropReferenceImageHandler({ origin, ...options,
      getApiKey: () => { keyReads += 1; throw new Error('Status must not read a credential.'); },
      fetch: async () => { fetches += 1; throw new Error('Status must not use transport.'); } });
    const available = options.enabled === true && options.spendingConfirmed === true;
    const local = (await status(handler)).res;
    assert.equal(local.statusCode, available ? 200 : 503);
    assert.deepEqual(local.data, { available, reason: !options.enabled ? 'disabled' : !options.spendingConfirmed ? 'spending_unconfirmed' : null,
      provider: 'openai', model, credentialStatus: 'unchecked', remainingRequests: 3, pendingTransport: false });
    if (!available) {
      const blocked = (await request(handler)).res;
      assert.equal(blocked.statusCode, 503);
      assert.equal(blocked.data.error, options.enabled ? 'spending_unconfirmed' : 'disabled');
    }
    privateResponse(local);
    assert.equal(keyReads, 0);
    assert.equal(fetches, 0);
  }
});

test('missing, malformed or throwing key getters spend nothing and are reached only by an admissible explicit POST', async () => {
  const { createOpenAiPropReferenceImageHandler } = await factory();
  for (const value of [undefined, '', '   ', 'line\nbreak', 'throws'] as const) {
    let reads = 0;
    const handler = createOpenAiPropReferenceImageHandler({ origin, enabled: true, spendingConfirmed: true,
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
    privateResponse(response);
  }
});

test('image routes retain exact loopback Host Origin method duplicate-header and path protections', async () => {
  const app = await setup();
  for (const bad of ['http://localhost:5173', `${origin}/`, 'http://127.0.0.1:5174', 'https://127.0.0.1:5173']) {
    assert.throws(() => app.createOpenAiPropReferenceImageHandler({ origin: bad }), /origin/i);
  }
  const preview = app.createOpenAiPropReferenceImageHandler({ origin: 'http://127.0.0.1:4173' });
  assert.equal((await request(preview, { method: 'GET', headers: { host: '127.0.0.1:4173', origin: 'http://127.0.0.1:4173' } })).res.statusCode, 503);
  for (const url of ['/', '/api/prop-mesh', '/api/compose-room', '/src/App.tsx']) assert.equal((await request(app.handler, { url })).nextCalls, 1);
  for (const url of [`${endpoint}/`, `${endpoint}?url=https://invalid.example`, `${endpoint}/../private`, `${endpoint}/fixture-success`]) {
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
});

test('closed public visual input and bounded JSON UTF8 reject before key lookup or submission', async () => {
  const app = await setup();
  const invalid = [null, [], {}, { suggestion: 'private original' }, { ...input(), requestId: '' },
    { ...input(), requestId: 'x'.repeat(129) }, { ...input(), requestId: 'a\nb' }, { ...input(), requestId: 1 },
    ...['owner', 'case', 'history', 'envelope', 'model', 'provider', 'url', 'size', 'quality', 'prompt', 'safety_identifier', 'source']
      .map(name => ({ ...input(), [name]: 'PRIVATE_UPSTREAM_SENTINEL' })),
    ...[{ kind: 'pool' }, { color: 'unknown' }, { description: '' }, { description: 'x'.repeat(241) },
      { description: 'line\nbreak' }, { description: 1 }, { url: 'https://invalid.example' }]
      .map(changes => ({ ...input(), visual: { ...input().visual, ...changes } }))];
  for (const body of invalid) assert.equal((await request(app.handler, { body: JSON.stringify(body) })).res.statusCode, 400);
  for (const body of ['{', '{}{}', new Uint8Array([0xff])]) assert.equal((await request(app.handler, { body })).res.statusCode, 400);
  for (const type of [undefined, 'text/plain', 'application/json; charset=latin1']) {
    assert.equal((await request(app.handler, { headers: { 'content-type': type } })).res.statusCode, 415);
  }
  assert.equal((await request(app.handler, { headers: { 'content-encoding': 'gzip' } })).res.statusCode, 415);
  assert.equal((await request(app.handler, { headers: { 'content-length': '4097' } })).res.statusCode, 413);
  assert.equal((await request(app.handler, { body: '{}'.padEnd(4097, ' ') })).res.statusCode, 413);
  assert.equal(app.keyReads, 0);
  assert.equal(app.calls.length, 0);
  assert.equal((await status(app.handler)).res.data.remainingRequests, 3);
});

test('one synthetic success sends the exact closed body, admits the 1024 PNG and serves copies with usage and truthful provenance', async () => {
  const app = await setup();
  const response = (await request(app.handler, { headers: { authorization: 'incoming-auth', cookie: 'incoming-cookie', 'x-key': 'incoming-key' } })).res;
  assert.equal(response.statusCode, 200);
  const reference = response.data.reference;
  assert.match(reference.id, /^[A-Za-z0-9_-]{16,128}$/);
  assert.deepEqual(response.data, { reference: { id: reference.id, requestId: 'request-1', source: 'synthetic', provider: 'openai', model,
    width: 1024, height: 1024, sha256: createHash('sha256').update(image()).digest('hex'),
    usage: { inputTokens: 50, outputTokens: 272, totalTokens: 322 } }, remainingRequests: 2 });
  assert.equal(app.calls.length, 1, 'synchronous generation: no polling or asset host');
  const [call] = app.calls;
  assert.equal(call.url, generateUrl);
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.redirect, 'error');
  assert.equal(call.init.credentials, 'omit');
  assert.equal(call.init.cache, 'no-store');
  assert.ok(call.init.signal instanceof AbortSignal);
  const headers = new Headers(call.init.headers);
  assert.equal(headers.get('authorization'), `Bearer ${key}`);
  assert.match(headers.get('content-type') ?? '', /^application\/json/);
  for (const name of ['x-key', 'cookie', 'openai-organization', 'openai-project']) assert.equal(headers.has(name), false, name);
  const payload = JSON.parse(String(call.init.body));
  assert.deepEqual(Object.keys(payload).sort(), ['model', 'n', 'output_format', 'prompt', 'quality', 'size']);
  assert.deepEqual({ ...payload, prompt: undefined }, { model, n: 1, output_format: 'png', quality: 'low', size: '1024x1024', prompt: undefined });
  assert.ok(payload.prompt.includes(JSON.stringify(input().visual)), 'public visual JSON only');
  assert.match(payload.prompt, /one/i);
  assert.match(payload.prompt, /background/i);
  assert.match(payload.prompt, /3D/i);
  assert.doesNotMatch(String(call.init.body), /request-1|incoming|owner|history|solution|safety_identifier|moderation|background"/);
  assert.equal(app.keyReads, 1);
  privateResponse(response);
  const served = (await request(app.handler, { method: 'GET', url: `${endpoint}/${reference.id}` })).res;
  assert.equal(served.statusCode, 200);
  assert.equal(served.headers.get('content-type'), 'image/png');
  assert.equal(served.headers.get('x-eva-reference-source'), 'synthetic');
  assert.equal(served.headers.get('x-eva-reference-request-id'), 'request-1');
  assert.equal(served.headers.get('x-eva-reference-sha256'), reference.sha256);
  assert.deepEqual(served.body, image());
  const copy = app.handler.readReference!(reference.id)!;
  assert.deepEqual(copy.reference, reference);
  copy.bytes.fill(0);
  (copy.reference as { requestId: string }).requestId = 'mutated';
  assert.deepEqual(app.handler.readReference!(reference.id)!.bytes, image(), 'callers receive copies');
  assert.equal(app.handler.readReference!(reference.id)!.reference.requestId, 'request-1');
  assert.equal(app.handler.readReference!('00000000-0000-4000-8000-000000000000'), null);
  await status(app.handler);
  assert.equal(app.calls.length, 1);
});

test('usage is recorded only as bounded whole token counts and never blocks or fabricates an image', async () => {
  for (const usage of [undefined, null, 'PRIVATE_UPSTREAM_SENTINEL', { input_tokens: -1, output_tokens: 272, total_tokens: 322 },
    { input_tokens: 1.5, output_tokens: 272, total_tokens: 322 }, { input_tokens: 50, output_tokens: '272', total_tokens: 322 },
    { input_tokens: 50, output_tokens: 10_000_001, total_tokens: 322 }, { input_tokens: 50, total_tokens: 322 }]) {
    const app = await setup(() => json(generated({ usage })));
    const response = (await request(app.handler)).res;
    assert.equal(response.statusCode, 200, JSON.stringify(usage));
    assert.equal(response.data.reference.usage, null, JSON.stringify(usage));
    privateResponse(response);
  }
});

test('three submissions are a server-lifetime ceiling independent of stored-image reads or readiness', async () => {
  const app = await setup();
  const ids: string[] = [];
  for (let index = 0; index < 3; index += 1) {
    const response = (await post(app.handler, `request-${index + 1}`)).res;
    assert.equal(response.statusCode, 200);
    ids.push(response.data.reference.id);
    assert.equal((await status(app.handler)).res.data.remainingRequests, 2 - index);
  }
  const exhausted = (await post(app.handler, 'request-4')).res;
  assert.equal(exhausted.statusCode, 429);
  assert.equal(exhausted.data.error, 'budget_exhausted');
  for (const id of ids) assert.equal((await request(app.handler, { method: 'GET', url: `${endpoint}/${id}` })).res.statusCode, 200);
  assert.equal(app.calls.length, 3);
  assert.equal(app.keyReads, 3);
});

test('duplicate request correlation is rejected rather than retried after success or an uncertain submission', async () => {
  for (const uncertain of [false, true]) {
    const app = await setup(call => {
      if (uncertain) throw new Error('PRIVATE_UPSTREAM_SENTINEL');
      return normalResponse(call);
    });
    const first = (await post(app.handler, 'unique-operation')).res;
    assert.equal(first.statusCode === 200, !uncertain);
    if (uncertain) {
      assert.equal(first.data.error, 'submission_uncertain');
      assert.match(first.data.message, /may still/i);
      assert.match(first.data.message, /charge|bill/i);
      assert.equal(first.data.remoteCancelled, false);
    }
    const duplicate = (await post(app.handler, 'unique-operation')).res;
    assert.equal(duplicate.statusCode, 409);
    assert.equal(app.calls.length, 1);
    assert.equal(app.keyReads, 1);
    assert.equal((await status(app.handler)).res.data.remainingRequests, 2);
    privateResponse(first);
  }
});

test('HTTP failures map to fixed local codes by status only, consume the attempt and never retry or echo provider text', async () => {
  for (const [code, error] of [[400, 'provider_rejected'], [401, 'provider_auth'], [403, 'provider_auth'], [429, 'provider_busy'],
    [500, 'submission_uncertain'], [503, 'submission_uncertain']] as const) {
    const app = await setup(() => json({ error: { type: 'image_generation_user_error', code: 'moderation_blocked',
      message: 'PRIVATE_UPSTREAM_SENTINEL', moderation_details: { key } } }, code, { 'retry-after': '1' }));
    const response = (await request(app.handler)).res;
    assert.ok(response.statusCode >= 400);
    assert.equal(response.data.error, error, String(code));
    assert.equal(response.data.reference, undefined);
    assert.equal(response.data.remainingRequests, 2);
    assert.equal(response.data.remoteCancelled, false);
    assert.match(response.data.message, /charge|bill/i);
    assert.equal(app.calls.length, 1);
    privateResponse(response);
  }
  const redirected = await setup(() => new Response(null, { status: 302, headers: { location: 'https://evil.example/' } }));
  assert.ok((await request(redirected.handler)).res.statusCode >= 400);
  assert.equal(redirected.calls.length, 1);
});

test('only one strict canonical base64 PNG with matching echoed settings can become a reference', async () => {
  const b64 = image().toString('base64');
  const invalid: [string, () => Response][] = [
    ['empty data', () => json(generated({ data: [] }))], ['two images', () => json(generated({ data: [{ b64_json: b64 }, { b64_json: b64 }] }))],
    ['data object', () => json(generated({ data: { b64_json: b64 } }))], ['missing b64', () => json(generated({}, { b64_json: undefined }))],
    ['url only', () => json(generated({}, { b64_json: undefined, url: 'https://invalid.example/image.png' }))],
    ['non-string', () => json(generated({}, { b64_json: 123 }))], ['whitespace', () => json(generated({}, { b64_json: `${b64.slice(0, 40)}\n${b64.slice(40)}` }))],
    ['bad alphabet', () => json(generated({}, { b64_json: `${b64.slice(0, -4)}-_==` }))], ['length', () => json(generated({}, { b64_json: b64.slice(0, -1) }))],
    ['inner padding', () => json(generated({}, { b64_json: `AAAA=AAA${b64}` }))], ['non-canonical tail', () => json(generated({}, { b64_json: 'iVBORw0KGgp=' }))],
    ['jpeg echoed', () => json(generated({ output_format: 'jpeg' }))], ['size echoed', () => json(generated({ size: '1536x1024' }))],
    ['quality echoed', () => json(generated({ quality: 'high' }))], ['null body', () => json(null)], ['array body', () => json([])],
    ['html', () => new Response('{}', { headers: { 'content-type': 'text/html' } })],
    ['gzip', () => json(generated(), 200, { 'content-encoding': 'gzip' })], ['short length', () => json(generated(), 200, { 'content-length': '1' })],
    ['bad utf8', () => new Response(new Uint8Array([0xff]), { headers: { 'content-type': 'application/json' } })],
    ['oversized b64', () => json(generated({}, { b64_json: 'A'.repeat(8 * 1024 * 1024 + 4) }))],
  ];
  for (const [label, make] of invalid) {
    const app = await setup(make);
    const response = (await request(app.handler)).res;
    assert.ok(response.statusCode >= 400, label);
    assert.equal(response.data.reference, undefined, label);
    assert.equal(response.data.remainingRequests, 2, label);
    assert.match(response.data.message, /charge|bill/i, label);
    assert.equal(app.calls.length, 1);
    privateResponse(response);
  }
  const optional = await setup(() => json(generated({ output_format: undefined, size: undefined, quality: undefined, background: undefined, created: undefined })));
  assert.equal((await request(optional.handler)).res.statusCode, 200, 'echoed settings are optional, but must match when present');
});

test('owner-approved 8L: ancillary metadata is skipped and the exact received PNG bytes are stored and served', async () => {
  for (const [label, bytes] of [['text metadata', reference1024([pngChunk('tEXt', Buffer.from('Software\0PRIVATE_UPSTREAM_SENTINEL'))])],
    ['provenance metadata', reference1024([pngChunk('caBX', Buffer.from('jumb'))])]] as const) {
    const app = await setup(() => json(generated({}, { b64_json: bytes.toString('base64') })));
    const response = (await request(app.handler)).res;
    assert.equal(response.statusCode, 200, label);
    assert.equal(response.data.reference.sha256, createHash('sha256').update(bytes).digest('hex'), label);
    assert.equal(response.data.reference.width, 1024);
    assert.equal(response.data.reference.height, 1024);
    assert.equal(response.body!.includes('PRIVATE_UPSTREAM_SENTINEL'), false, 'metadata is skipped, never interpreted or echoed');
    const served = (await request(app.handler, { method: 'GET', url: `${endpoint}/${response.data.reference.id}` })).res;
    assert.deepEqual(served.body, bytes, 'no stripping or re-encoding');
    assert.deepEqual(app.handler.readReference!(response.data.reference.id)!.bytes, bytes);
  }
});

test('exact 1024 dimensions and the remaining PNG rules fail closed for PNG bytes that decode', async () => {
  for (const [label, bytes, reason] of [['512 image', pngFixture(512, 512), 'dimensions'], ['2x2 image', pngFixture(), 'dimensions'],
    ['not PNG', Buffer.from('not a PNG image'), undefined], ['trailing byte', Buffer.concat([image(), Buffer.from([0])]), 'order']] as const) {
    const app = await setup(() => json(generated({}, { b64_json: Buffer.from(bytes).toString('base64') })));
    const response = (await request(app.handler)).res;
    assert.equal(response.statusCode, 422, label);
    assert.equal(response.data.error, 'invalid_image', label);
    if (reason) assert.equal(response.data.reason, reason, `${label} fixed diagnostic`);
    assert.ok(['size', 'signature', 'chunk_limit', 'crc', 'critical_chunk', 'animation', 'order', 'header', 'color_format', 'dimensions', 'decode']
      .includes(response.data.reason), `${label} reason is a fixed safe code`);
    assert.equal(response.data.reference, undefined);
    assert.equal(response.data.remainingRequests, 2);
    privateResponse(response);
  }
  let cancellations = 0;
  const app = await setup(() => new Response(new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 64 * 1024 + 1)); },
    cancel() { cancellations += 1; },
  }), { headers: { 'content-type': 'application/json' } }));
  assert.ok((await request(app.handler)).res.statusCode >= 400);
  assert.equal(cancellations, 1, 'a response beyond 8 MiB + 64 KiB is cancelled while streaming');
});

test('upload deadline and invalid admission spend nothing and do not access the key', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const app = await setup();
  const operation = begin(app.handler, { body: null });
  assert.equal((await post(app.handler, 'blocked-by-upload')).res.statusCode, 409);
  t.mock.timers.tick(4999);
  assert.equal(operation.res.body, undefined);
  t.mock.timers.tick(1);
  await operation.done;
  assert.equal(operation.res.statusCode, 504);
  assert.equal(app.keyReads, 0);
  assert.equal(app.calls.length, 0);
  assert.equal((await status(app.handler)).res.data.remainingRequests, 3);
  operation.req.complete = true;
  operation.req.push(null);
});

test('a 150-second ignored-abort generation stays reserved until its late transport settles, with no automatic retry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const submitted = deferred<void>();
  const pending = deferred<Response>();
  const app = await setup(() => { submitted.resolve(); return pending.promise; });
  const operation = begin(app.handler);
  await submitted.promise;
  t.mock.timers.tick(149999);
  await turn();
  assert.equal(operation.res.body, undefined, 'documented generation can take about two minutes');
  t.mock.timers.tick(1);
  await operation.done;
  assert.equal(operation.res.statusCode, 504);
  assert.match(operation.res.data.message, /may still|unknown|uncertain/i);
  assert.match(operation.res.data.message, /charge|bill/i);
  assert.equal(operation.res.data.remainingRequests, 2);
  assert.equal(operation.res.data.remoteCancelled, false);
  assert.equal(app.calls[0].init.signal!.aborted, true);
  const retained = (await status(app.handler)).res.data;
  assert.equal(retained.reason, 'busy');
  assert.equal(retained.pendingTransport, true);
  assert.equal((await post(app.handler, 'request-2')).res.statusCode, 409);
  let cancellations = 0;
  pending.resolve(new Response(new ReadableStream({ cancel() { cancellations += 1; } }), { headers: { 'content-type': 'application/json' } }));
  await turn();
  assert.equal(cancellations, 1);
  assert.equal(app.calls.length, 1);
  const settled = (await status(app.handler)).res.data;
  assert.equal(settled.pendingTransport, false);
  assert.equal(settled.available, true);
  assert.equal((await post(app.handler, 'request-1')).res.statusCode, 409);
});

test('disconnect during generation stops local work, stores nothing and keeps the ignored-abort transport reserved', async () => {
  const reached = deferred<void>();
  const pending = deferred<Response>();
  let delay = true;
  const app = await setup(call => {
    if (delay) { reached.resolve(); return pending.promise; }
    return normalResponse(call);
  });
  const operation = begin(app.handler);
  await reached.promise;
  operation.res.disconnect();
  await operation.done;
  assert.equal(operation.res.body, undefined);
  assert.equal(app.calls[0].init.signal!.aborted, true);
  const retained = (await status(app.handler)).res.data;
  assert.equal(retained.reason, 'busy');
  assert.equal(retained.pendingTransport, true);
  assert.equal(retained.remainingRequests, 2);
  pending.resolve(json(generated()));
  await turn();
  assert.equal((await status(app.handler)).res.data.pendingTransport, false);
  delay = false;
  const fresh = (await post(app.handler, 'new-operation')).res;
  assert.equal(fresh.statusCode, 200);
  assert.equal(fresh.data.remainingRequests, 1);
  assert.equal(operation.res.body, undefined);
});

test('foreign reference IDs and provider text cannot become an asset proxy or leak into responses and logs', async t => {
  const logs: unknown[][] = [];
  for (const name of ['log', 'warn', 'error'] as const) t.mock.method(console, name, (...args: unknown[]) => { logs.push(args); });
  const app = await setup(() => json({ error: { message: 'PRIVATE_UPSTREAM_SENTINEL', key } }, 400));
  privateResponse((await request(app.handler)).res);
  for (const path of ['00000000-0000-4000-8000-000000000000', 'fixture-success', '../secrets']) {
    const response = (await request(app.handler, { method: 'GET', url: `${endpoint}/${path}` })).res;
    assert.equal(response.statusCode, 404);
    privateResponse(response);
  }
  assert.equal(app.calls.length, 1);
  assert.doesNotMatch(JSON.stringify(logs), /synthetic-openai-key|PRIVATE_UPSTREAM_SENTINEL/);
});
