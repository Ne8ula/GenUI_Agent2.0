import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { IncomingMessage, type ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { pngFixture } from './fixtures/prop-reference-png.ts';

const origin = 'http://127.0.0.1:5173';
const endpoint = '/api/prop-reference-image';
const submitUrl = 'https://api.bfl.ai/v1/flux-2-flex';
const pollingUrl = 'https://api.eu.bfl.ai/v1/get_result?id=job-1';
const sampleUrl = 'https://delivery.eu-test.bfl.ai/generated.png?signature=PRIVATE_SIGNED_SENTINEL';
const model = 'flux-2-flex';
const key = 'synthetic-bfl-key-not-a-credential';
const serverPath = '../src/server/prop-reference-image.ts';
type Handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => void | Promise<void>;
type Options = { origin: string; enabled?: boolean; spendingConfirmed?: boolean; getApiKey?: () => string | undefined; fetch?: typeof globalThis.fetch };
type Call = { url: string; init: RequestInit };
async function factory(): Promise<{ createPropReferenceImageHandler(options: Options): Handler }> {
  return import(serverPath);
}
function input(requestId = 'request-1') {
  return { requestId, visual: { kind: 'chair', color: 'teal', description: 'A rounded teal chair with a curved back.' } };
}
function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
}
function accepted(overrides: Record<string, unknown> = {}) {
  return { id: 'job-1', polling_url: pollingUrl, ...overrides };
}
function result(status = 'Ready', overrides: Record<string, unknown> = {}) {
  return { id: 'job-1', status, ...(status === 'Ready' ? { result: { sample: sampleUrl } } : {}), ...overrides };
}
function image(bytes: Uint8Array = pngFixture(512, 512), headers: Record<string, string> = {}) {
  return new Response(Uint8Array.from(bytes), { headers: { 'content-type': 'image/png', ...headers } });
}
function normalResponse(call: Call) {
  if (call.url === submitUrl) return json(accepted());
  if (call.url === pollingUrl) return json(result());
  if (call.url === sampleUrl) return image();
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
  const { createPropReferenceImageHandler } = await factory();
  const calls: Call[] = [];
  let keyReads = 0;
  const fetch: typeof globalThis.fetch = async (value, init = {}) => {
    const call = { url: String(value), init };
    calls.push(call);
    return respond(call);
  };
  const handler = createPropReferenceImageHandler({ origin, enabled: true, spendingConfirmed: true,
    getApiKey: () => { keyReads += 1; return key; }, fetch });
  return { createPropReferenceImageHandler, handler, calls, fetch, get keyReads() { return keyReads; } };
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
function privateResponse(res: CapturedResponse) {
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.has('access-control-allow-origin'), false);
  assert.equal(res.body?.includes(key), false);
  assert.equal(res.body?.includes('PRIVATE_SIGNED_SENTINEL'), false);
  assert.equal(res.body?.includes('PRIVATE_UPSTREAM_SENTINEL'), false);
}
function status(handler: Handler) { return request(handler, { method: 'GET' }); }
function post(handler: Handler, requestId: string) { return request(handler, { body: JSON.stringify(input(requestId)) }); }

// The original RED drove vite.config; config now wires OpenAI, so this keeps every assertion against the BFL factory
// built with the same disabled flags and dedicated key getter that config passed.
test('8B RED: disabled image middleware answers local readiness instead of falling through', async t => {
  const flags = ['EVA_ENABLE_ROOM_INTERPRETATION', 'EVA_ENABLE_SPEECH', 'EVA_SPEECH_PRIVACY_CONFIRMED',
    'EVA_ENABLE_INVESTIGATION_NARRATION', 'EVA_ENABLE_PROP_REFERENCE_IMAGE', 'EVA_PROP_REFERENCE_IMAGE_SPENDING_CONFIRMED'];
  const previous = flags.map(name => process.env[name]);
  t.after(() => flags.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index];
  }));
  for (const name of flags) process.env[name] = '0';
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', () => { fetches += 1; throw new Error('Disabled image status must not fetch.'); });
  const { createPropReferenceImageHandler } = await factory();
  const route = createPropReferenceImageHandler({ origin,
    enabled: process.env.EVA_ENABLE_PROP_REFERENCE_IMAGE === '1',
    spendingConfirmed: process.env.EVA_PROP_REFERENCE_IMAGE_SPENDING_CONFIRMED === '1',
    getApiKey: () => process.env.EVA_BFL_API_KEY });
  const operation = await status(route);
  assert.equal(operation.res.statusCode, 503, 'disabled prop images must answer readiness, not fall through to the app');
  assert.equal(operation.nextCalls, 0);
  assert.deepEqual(operation.res.data, { available: false, reason: 'disabled', model, credentialStatus: 'unchecked', remainingRequests: 3, pendingTransport: false });
  privateResponse(operation.res);
  const disabledPost = await request(route);
  assert.equal(disabledPost.res.statusCode, 503);
  assert.equal(disabledPost.res.data.error, 'disabled');
  assert.equal(fetches, 0);
});

test('disabled, spending-unconfirmed and all readiness checks avoid credential access and transport', async () => {
  const { createPropReferenceImageHandler } = await factory();
  let keyReads = 0;
  let fetches = 0;
  for (const options of [{}, { enabled: false, spendingConfirmed: true }, { enabled: true },
    { enabled: true, spendingConfirmed: false }, { enabled: true, spendingConfirmed: true }]) {
    const handler = createPropReferenceImageHandler({ origin, ...options,
      getApiKey: () => { keyReads += 1; throw new Error('Status must not read a credential.'); },
      fetch: async () => { fetches += 1; throw new Error('Status must not use transport.'); },
    });
    const local = (await status(handler)).res;
    assert.equal(local.data.credentialStatus, 'unchecked');
    assert.equal(local.data.remainingRequests, 3);
    assert.equal(local.data.available, options.enabled === true && options.spendingConfirmed === true);
    if (!options.enabled || !options.spendingConfirmed) {
      const blocked = (await request(handler)).res;
      assert.equal(blocked.statusCode, 503);
      assert.equal(blocked.data.error, options.enabled ? 'spending_unconfirmed' : 'disabled');
    }
    privateResponse(local);
  }
  assert.equal(keyReads, 0);
  assert.equal(fetches, 0);
});

test('missing or throwing key getters do not consume submissions and are reached only by admissible explicit POST', async () => {
  const { createPropReferenceImageHandler } = await factory();
  for (const value of [undefined, '', '   ', 'throws'] as const) {
    let reads = 0;
    const handler = createPropReferenceImageHandler({ origin, enabled: true, spendingConfirmed: true,
      getApiKey: () => { reads += 1; if (value === 'throws') throw new Error('PRIVATE_UPSTREAM_SENTINEL'); return value; },
      fetch: async () => { assert.fail('a missing key cannot submit'); },
    });
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

test('image routes retain exact loopback Host Origin method duplicate-header and path protections', async () => {
  const app = await setup();
  for (const bad of ['http://localhost:5173', `${origin}/`, 'http://127.0.0.1:5174', 'https://127.0.0.1:5173']) {
    assert.throws(() => app.createPropReferenceImageHandler({ origin: bad }), /origin/i);
  }
  const preview = app.createPropReferenceImageHandler({ origin: 'http://127.0.0.1:4173' });
  assert.equal((await request(preview, { method: 'GET', headers: { host: '127.0.0.1:4173', origin: 'http://127.0.0.1:4173' } })).res.statusCode, 503);
  for (const url of ['/', '/api/compose-room', '/api/investigation-narration', '/src/App.tsx']) {
    assert.equal((await request(app.handler, { url })).nextCalls, 1);
  }
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
    ...['owner', 'case', 'history', 'envelope', 'model', 'provider', 'url', 'credentials', 'permissions', 'source', 'synthetic']
      .map(key => ({ ...input(), [key]: 'PRIVATE_UPSTREAM_SENTINEL' })),
    ...[{ kind: 'pool' }, { color: 'unknown' }, { description: '' }, { description: 'x'.repeat(241) },
      { description: 'line\nbreak' }, { description: 1 }, { url: 'https://invalid.example' }]
      .map(changes => ({ ...input(), visual: { ...input().visual, ...changes } })),
  ];
  for (const body of invalid) assert.equal((await request(app.handler, { body: JSON.stringify(body) })).res.statusCode, 400);
  for (const body of ['{', '{}{}', new Uint8Array([0xff])]) assert.equal((await request(app.handler, { body })).res.statusCode, 400);
  for (const type of [undefined, 'text/plain', 'application/json; charset=latin1']) {
    assert.equal((await request(app.handler, { headers: { 'content-type': type } })).res.statusCode, 415);
  }
  assert.equal((await request(app.handler, { headers: { 'content-encoding': 'gzip' } })).res.statusCode, 415);
  for (const length of ['-1', 'x', '1']) assert.equal((await request(app.handler, { headers: { 'content-length': length } })).res.statusCode, 400);
  assert.equal((await request(app.handler, { headers: { 'content-length': '4097' } })).res.statusCode, 413);
  assert.equal((await request(app.handler, { body: '{}'.padEnd(4097, ' ') })).res.statusCode, 413);
  assert.equal((await request(app.handler, { headers: { 'content-length': '1', 'transfer-encoding': 'chunked' } })).res.statusCode, 400);
  const chunked = begin(app.handler, { body: null });
  chunked.req.push(Buffer.alloc(2049, ' '));
  chunked.req.push(Buffer.alloc(2049, ' '));
  chunked.req.complete = true;
  chunked.req.push(null);
  await chunked.done;
  assert.equal(chunked.res.statusCode, 413);
  assert.equal(app.keyReads, 0);
  assert.equal(app.calls.length, 0);
  assert.equal((await status(app.handler)).res.data.remainingRequests, 3);
});

test('one synthetic success traverses real BFL submit result PNG admission and local byte serving with truthful provenance', async () => {
  const app = await setup(call => call.url === pollingUrl
    ? json(result('Ready', { details: { text: 'PRIVATE_UPSTREAM_SENTINEL' }, progress: 99, source: 'provider' })) : normalResponse(call));
  const response = (await request(app.handler, { headers: { authorization: 'incoming-auth', cookie: 'incoming-cookie', 'x-key': 'incoming-key' } })).res;
  assert.equal(response.statusCode, 200);
  assert.equal(response.data.remainingRequests, 2);
  const reference = response.data.reference;
  assert.match(reference.id, /^[A-Za-z0-9_-]{16,128}$/);
  assert.deepEqual(reference, { id: reference.id, requestId: 'request-1', source: 'synthetic', provider: 'bfl', model,
    width: 512, height: 512, sha256: createHash('sha256').update(pngFixture(512, 512)).digest('hex') });
  assert.deepEqual(app.calls.map(call => call.url), [submitUrl, pollingUrl, sampleUrl]);
  assert.equal(app.keyReads, 1);
  const submission = app.calls[0];
  assert.equal(submission.init.method, 'POST');
  const payload = JSON.parse(String(submission.init.body));
  assert.deepEqual(Object.keys(payload).sort(), ['guidance', 'height', 'output_format', 'prompt', 'prompt_upsampling', 'safety_tolerance', 'steps', 'width']);
  assert.equal(payload.width, 512);
  assert.equal(payload.height, 512);
  assert.equal(payload.output_format, 'png');
  assert.equal(payload.prompt_upsampling, false);
  assert.equal(payload.steps, 50);
  assert.equal(payload.guidance, 5);
  assert.equal(payload.safety_tolerance, 2);
  assert.ok(payload.prompt.includes(input().visual.description));
  assert.match(payload.prompt, /chair/);
  assert.match(payload.prompt, /teal/);
  assert.doesNotMatch(String(submission.init.body), /request-1|incoming-auth|incoming-cookie|incoming-key|owner|history|solution/);
  for (const [index, call] of app.calls.entries()) {
    assert.equal(call.init.redirect, 'error');
    assert.equal(call.init.credentials, 'omit');
    assert.equal(call.init.cache, 'no-store');
    assert.ok(call.init.signal instanceof AbortSignal);
    const headers = new Headers(call.init.headers);
    assert.equal(headers.get('x-key'), index < 2 ? key : null);
    assert.equal(headers.has('authorization'), false);
    assert.equal(headers.has('cookie'), false);
    if (index > 0) assert.equal(call.init.method, 'GET');
  }
  privateResponse(response);
  const served = (await request(app.handler, { method: 'GET', url: `${endpoint}/${reference.id}` })).res;
  assert.equal(served.statusCode, 200);
  assert.equal(served.headers.get('content-type'), 'image/png');
  assert.equal(served.headers.get('x-eva-reference-source'), 'synthetic');
  assert.equal(served.headers.get('x-eva-reference-request-id'), 'request-1');
  assert.equal(served.headers.get('x-eva-reference-sha256'), reference.sha256);
  assert.deepEqual(served.body, pngFixture(512, 512));
  privateResponse(served);
  await status(app.handler);
  assert.equal(app.calls.length, 3, 'local image serving and status cannot poll or resubmit');
  assert.equal(app.keyReads, 1);
});

test('three submissions are a server-lifetime ceiling independent of requests for existing bytes or local readiness', async () => {
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
  assert.equal(app.calls.filter(call => call.init.method === 'POST').length, 3);
  assert.equal(app.keyReads, 3);
  assert.equal((await status(app.handler)).res.data.remainingRequests, 0);
});

test('duplicate request correlation is rejected rather than treated as a safe retry even after success or uncertain submission', async () => {
  for (const uncertain of [false, true]) {
    const app = await setup(call => {
      if (uncertain && call.url === submitUrl) throw new Error('PRIVATE_UPSTREAM_SENTINEL');
      return normalResponse(call);
    });
    const first = (await post(app.handler, 'unique-operation')).res;
    assert.equal(first.statusCode === 200, !uncertain);
    if (uncertain) {
      assert.match(first.data.message, /unknown|uncertain/i);
      assert.match(first.data.message, /charge|bill/i);
      assert.notEqual(first.data.remoteCancelled, true);
    }
    const calls = app.calls.length;
    const duplicate = (await post(app.handler, 'unique-operation')).res;
    assert.equal(duplicate.statusCode, 409);
    assert.equal(app.calls.length, calls);
    assert.equal(app.keyReads, 1);
    assert.equal((await status(app.handler)).res.data.remainingRequests, 2);
    privateResponse(first);
  }
});

test('only documented API origins and the returned exact matching polling URL can receive the key', async () => {
  for (const host of ['api.bfl.ai', 'api.eu.bfl.ai', 'api.us.bfl.ai']) {
    const returned = `https://${host}/v1/get_result?id=job-1`;
    const app = await setup(call => call.url === submitUrl ? json(accepted({ polling_url: returned }))
      : call.url === returned ? json(result()) : normalResponse(call));
    assert.equal((await request(app.handler)).res.statusCode, 200);
    assert.equal(app.calls[1].url, returned, 'never reconstruct a different status endpoint');
  }
  for (const url of ['https://api.other-cluster.bfl.ai/v1/get_result?id=job-1', 'https://api.bfl.ai.evil.example/v1/get_result?id=job-1',
    'http://api.bfl.ai/v1/get_result?id=job-1', 'https://user:secret@api.bfl.ai/v1/get_result?id=job-1',
    'https://api.bfl.ai:444/v1/get_result?id=job-1', 'https://api.bfl.ai/v1/get_result?id=foreign',
    'https://api.bfl.ai/v1/get_result?id=job-1&id=job-1', 'https://api.bfl.ai/v1/get_result?id=job-1&extra=1',
    'https://api.bfl.ai/v1/get_result?id=job-1#fragment', 'https://api.bfl.ai/v1/other?id=job-1',
    'https://api.bfl.ai/v1/get_result?id=job-1\n', 'data:text/plain,not-a-poll', 'https://api.bfl.ai/' + 'x'.repeat(4096)]) {
    const app = await setup(() => json(accepted({ polling_url: url })));
    const response = (await request(app.handler)).res;
    assert.ok(response.statusCode >= 400, url);
    assert.equal(response.data.remainingRequests, 2);
    assert.equal(app.calls.length, 1);
    assert.match(response.data.message, /unknown|uncertain/i, 'unsafe acceptance is not a confirmed remote failure');
    privateResponse(response);
  }
});

test('delivery URLs accept one bounded region label only and never redirect or receive API credentials', async () => {
  for (const url of ['https://evil.example/image.png', 'https://delivery.eu.bfl.ai.evil.example/image.png',
    'https://delivery.a.b.bfl.ai/image.png', 'https://delivery.bfl.ai/image.png', 'https://delivery.-bad.bfl.ai/image.png',
    `https://delivery.${'x'.repeat(64)}.bfl.ai/image.png`, 'http://delivery.eu.bfl.ai/image.png',
    'https://user:secret@delivery.eu.bfl.ai/image.png', 'https://delivery.eu.bfl.ai:444/image.png',
    'https://delivery.eu.bfl.ai/image.png#fragment', 'file:///image.png', 'data:image/png;base64,AAAA',
    'https://delivery.eu.bfl.ai/' + 'x'.repeat(4096)]) {
    const app = await setup(call => call.url === pollingUrl ? json(result('Ready', { result: { sample: url } })) : normalResponse(call));
    assert.ok((await request(app.handler)).res.statusCode >= 400, url);
    assert.equal(app.calls.length, 2);
  }
  for (const stage of [submitUrl, pollingUrl, sampleUrl]) {
    const app = await setup(call => call.url === stage ? new Response(null, { status: 302, headers: { location: 'https://evil.example/' } }) : normalResponse(call));
    assert.ok((await request(app.handler)).res.statusCode >= 400);
    assert.equal(app.calls.some(call => call.url.includes('evil.example')), false);
    assert.equal(app.calls.filter(call => call.init.method === 'POST').length, 1);
  }
});

test('foreign jobs, unexpected status states and malformed result envelopes cannot admit a reference', async () => {
  for (const body of [null, {}, accepted({ id: '' }), accepted({ id: 'x'.repeat(129) }), accepted({ id: 1 }), { id: 'job-1' }]) {
    const app = await setup(() => json(body));
    assert.ok((await request(app.handler)).res.statusCode >= 400);
    assert.equal(app.calls.length, 1);
  }
  for (const body of [null, {}, result('Ready', { id: 'foreign' }), result('Ready', { id: 1 }), result('Ready', { result: null }),
    result('Ready', { result: { sample: 123 } }), result('Ready', { result: { sample: sampleUrl }, id: undefined }),
    ...['Task not found', 'Request Moderated', 'Content Moderated', 'No Card Generated', 'Error', 'Failed', 'ready', 'Unknown']
      .map(state => result(state, { details: { text: 'PRIVATE_UPSTREAM_SENTINEL' } }))]) {
    const app = await setup(call => call.url === pollingUrl ? json(body) : normalResponse(call));
    const response = (await request(app.handler)).res;
    assert.ok(response.statusCode >= 400);
    assert.equal(response.data.reference, undefined);
    assert.equal(app.calls.length, 2);
    assert.equal(response.data.remainingRequests, 2);
    privateResponse(response);
  }
});

test('Pending Reasoning Generating poll the same job no faster than once per second and never resubmit', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const firstPoll = deferred<void>();
  let polls = 0;
  const app = await setup(call => {
    if (call.url !== pollingUrl) return normalResponse(call);
    polls += 1;
    if (polls === 1) firstPoll.resolve();
    return json(result(['Pending', 'Reasoning', 'Generating', 'Ready'][polls - 1]));
  });
  const operation = begin(app.handler);
  await firstPoll.promise;
  await turn();
  for (let expected = 1; expected <= 3; expected += 1) {
    t.mock.timers.tick(999);
    await turn();
    assert.equal(polls, expected);
    t.mock.timers.tick(1);
    await turn();
  }
  await operation.done;
  assert.equal(operation.res.statusCode, 200);
  assert.equal(polls, 4);
  assert.equal(app.calls.filter(call => call.init.method === 'POST').length, 1);
  assert.equal(operation.res.data.remainingRequests, 2);
});

test('forty pending results exhaust polling without another submission or a fabricated reference', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const firstPoll = deferred<void>();
  let polls = 0;
  const app = await setup(call => {
    if (call.url !== pollingUrl) return normalResponse(call);
    polls += 1;
    firstPoll.resolve();
    return json(result('Pending'));
  });
  const operation = begin(app.handler);
  await firstPoll.promise;
  await turn();
  for (let index = 1; index < 40; index += 1) { t.mock.timers.tick(1000); await turn(); }
  await operation.done;
  assert.ok(operation.res.statusCode >= 400);
  assert.equal(polls, 40);
  assert.equal(operation.res.data.reference, undefined);
  assert.equal(app.calls.filter(call => call.init.method === 'POST').length, 1);
  assert.equal(app.calls.some(call => call.url === sampleUrl), false);
  assert.match(operation.res.data.message, /local|poll/i);
  assert.match(operation.res.data.message, /charge|bill/i);
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

test('a timed-out ignored-abort submission remains reserved until its late transport settles, with no automatic retry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const submitted = deferred<void>();
  const pending = deferred<Response>();
  const app = await setup(() => { submitted.resolve(); return pending.promise; });
  const operation = begin(app.handler);
  await submitted.promise;
  t.mock.timers.tick(15000);
  await operation.done;
  assert.equal(operation.res.statusCode, 504);
  assert.match(operation.res.data.message, /unknown|uncertain/i);
  assert.match(operation.res.data.message, /charge|bill/i);
  assert.equal(operation.res.data.remainingRequests, 2);
  assert.equal(app.calls[0].init.signal!.aborted, true);
  const retained = (await status(app.handler)).res.data;
  assert.equal(retained.reason, 'busy');
  assert.equal(retained.pendingTransport, true, 'local timeout is not proof that ignored-abort transport was released');
  assert.equal((await post(app.handler, 'request-2')).res.statusCode, 409);
  assert.equal(app.keyReads, 1);
  let cancellations = 0;
  pending.resolve(new Response(new ReadableStream({ cancel() { cancellations += 1; } }), { headers: { 'content-type': 'application/json' } }));
  await turn();
  assert.equal(cancellations, 1);
  assert.equal(app.calls.length, 1);
  const settled = (await status(app.handler)).res.data;
  assert.equal(settled.pendingTransport, false);
  assert.equal(settled.available, true);
  assert.equal((await post(app.handler, 'request-1')).res.statusCode, 409);
  assert.equal(app.calls.length, 1);
});

test('the total 120-second deadline bounds individually timely polls and never claims remote cancellation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const submitted = deferred<void>();
  let polls = 0;
  const app = await setup(call => {
    if (call.url === submitUrl) { submitted.resolve(); return json(accepted()); }
    if (call.url === pollingUrl) { polls += 1; return new Promise<Response>(resolve => setTimeout(() => resolve(json(result('Pending'))), 10000)); }
    return normalResponse(call);
  });
  const operation = begin(app.handler);
  await submitted.promise;
  await turn();
  for (let tick = 0; tick < 120; tick += 1) { t.mock.timers.tick(1000); await turn(); }
  await operation.done;
  assert.equal(operation.res.statusCode, 504);
  assert.ok(polls > 1 && polls < 40);
  assert.equal(operation.res.data.reference, undefined);
  assert.notEqual(operation.res.data.remoteCancelled, true);
  assert.match(operation.res.data.message, /charge|bill/i);
  assert.equal(app.calls.filter(call => call.init.method === 'POST').length, 1);
  t.mock.timers.tick(15000);
  await turn();
});

test('disconnect during submit poll or asset transport stops local work but reserves an ignored-abort transport', async () => {
  for (const stage of [submitUrl, pollingUrl, sampleUrl]) {
    const reached = deferred<void>();
    const pending = deferred<Response>();
    let delay = true;
    const app = await setup(call => {
      if (delay && call.url === stage) { reached.resolve(); return pending.promise; }
      return normalResponse(call);
    });
    const operation = begin(app.handler);
    await reached.promise;
    operation.res.disconnect();
    await operation.done;
    assert.equal(operation.res.body, undefined);
    assert.equal(app.calls.at(-1)!.init.signal!.aborted, true);
    const retained = (await status(app.handler)).res.data;
    assert.equal(retained.reason, 'busy');
    assert.equal(retained.pendingTransport, true);
    assert.equal(retained.remainingRequests, 2);
    assert.equal((await post(app.handler, 'blocked')).res.statusCode, 409);
    const oldCalls = app.calls.length;
    let cancellations = 0;
    pending.resolve(new Response(new ReadableStream({ cancel() { cancellations += 1; } }),
      { headers: { 'content-type': stage === sampleUrl ? 'image/png' : 'application/json' } }));
    await turn();
    assert.equal(cancellations, 1);
    assert.equal(app.calls.length, oldCalls, 'late completion must not start the next stage');
    assert.equal((await status(app.handler)).res.data.pendingTransport, false);
    delay = false;
    const fresh = (await post(app.handler, 'new-operation')).res;
    assert.equal(fresh.statusCode, 200);
    assert.equal(fresh.data.reference.requestId, 'new-operation');
    assert.equal(fresh.data.remainingRequests, 1);
    assert.equal((await post(app.handler, 'request-1')).res.statusCode, 409);
    assert.equal(operation.res.body, undefined);
  }
});

test('disconnect during actual response-body reads cancels readers and releases listeners without storing partial images', async () => {
  for (const stage of [submitUrl, pollingUrl, sampleUrl]) {
    const reading = deferred<void>();
    let cancellations = 0;
    const app = await setup(call => call.url === stage ? new Response(new ReadableStream<Uint8Array>({
      pull() { reading.resolve(); }, cancel() { cancellations += 1; },
    }, { highWaterMark: 0 }), { headers: { 'content-type': stage === sampleUrl ? 'image/png' : 'application/json' } }) : normalResponse(call));
    const operation = begin(app.handler);
    await reading.promise;
    operation.res.disconnect();
    await operation.done;
    await turn();
    assert.equal(cancellations, 1);
    assert.equal(operation.res.body, undefined);
    assert.equal((await status(app.handler)).res.data.pendingTransport, false);
    assert.equal(operation.res.listenerCount('close'), 0);
    assert.equal(operation.res.listenerCount('error'), 0);
    assert.equal(operation.req.closed, true);
    assert.equal(operation.req.listenerCount('error'), 0);
    assert.equal(operation.req.listenerCount('close'), 0);
  }
});

test('open-upload errors are handled without credentials or submission and listeners remain only until native close', async () => {
  const app = await setup();
  const operation = begin(app.handler, { body: null });
  assert.equal(operation.req.closed, false);
  assert.equal(operation.req.complete, false);
  assert.equal(operation.req.listenerCount('error'), 1);
  assert.doesNotThrow(() => operation.req.emit('error', new Error('PRIVATE_UPSTREAM_SENTINEL')));
  await operation.done;
  assert.equal(operation.res.statusCode, 499);
  assert.equal(operation.res.data.error, 'cancelled');
  assert.equal(operation.res.data.remainingRequests, 3);
  assert.equal(operation.res.data.reference, undefined);
  privateResponse(operation.res);
  assert.equal(app.keyReads, 0);
  assert.equal(app.calls.length, 0);
  assert.equal(operation.req.closed, false);
  assert.equal(operation.req.listenerCount('error'), 1);
  assert.equal(operation.req.listenerCount('close'), 1);
  assert.doesNotThrow(() => operation.req.emit('error', new Error('PRIVATE_UPSTREAM_SENTINEL')));
  assert.equal(operation.res.listenerCount('error'), 0);
  assert.equal(operation.res.listenerCount('close'), 0);
  const closed = new Promise<void>(resolve => operation.req.once('close', resolve));
  operation.req.complete = true;
  operation.req.push(null);
  await closed;
  assert.equal(operation.req.closed, true);
  assert.equal(operation.req.listenerCount('error'), 0);
  assert.equal(operation.req.listenerCount('close'), 0);
  assert.equal(app.keyReads, 0);
  assert.equal(app.calls.length, 0);
});

test('upstream JSON type encoding byte count UTF8 and length mismatches fail closed without retries', async () => {
  for (const stage of [submitUrl, pollingUrl]) {
    for (const make of [
      () => new Response('{}', { headers: { 'content-type': 'text/html' } }),
      () => new Response(new Uint8Array([0xff]), { headers: { 'content-type': 'application/json' } }),
      () => json({}, 200, { 'content-encoding': 'gzip' }),
      () => json({}, 200, { 'content-length': '1' }),
      () => json({}, 200, { 'content-length': '-1' }),
      () => new Response(' '.repeat(16385), { headers: { 'content-type': 'application/json' } }),
      () => new Response(null, { headers: { 'content-type': 'application/json' } }),
    ]) {
      const app = await setup(call => call.url === stage ? make() : normalResponse(call));
      const response = (await request(app.handler)).res;
      assert.ok(response.statusCode >= 400);
      assert.equal(response.data.reference, undefined);
      assert.equal(app.calls.length, stage === submitUrl ? 1 : 2);
      assert.equal(response.data.remainingRequests, 2);
    }
  }
});

test('PNG MIME alone cannot admit wrong dimensions, corrupt bytes, excessive encoding or oversized streaming output', async () => {
  for (const make of [() => image(Buffer.from('not a PNG')), () => image(pngFixture()),
    () => image(pngFixture(512, 512), { 'content-type': 'image/jpeg' }),
    () => image(pngFixture(512, 512), { 'content-encoding': 'gzip' }),
    () => image(pngFixture(512, 512), { 'content-length': '1' }),
    () => image(pngFixture(512, 512), { 'content-length': String(2 * 1024 * 1024 + 1) }),
    () => image(Buffer.concat([pngFixture(512, 512), Buffer.from([0])]))]) {
    const app = await setup(call => call.url === sampleUrl ? make() : normalResponse(call));
    const response = (await request(app.handler)).res;
    assert.ok(response.statusCode >= 400);
    assert.equal(response.data.reference, undefined);
    assert.equal(app.calls.length, 3);
    privateResponse(response);
  }
  let cancellations = 0;
  const app = await setup(call => call.url === sampleUrl ? new Response(new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1)); },
    cancel() { cancellations += 1; },
  }), { headers: { 'content-type': 'image/png' } }) : normalResponse(call));
  assert.ok((await request(app.handler)).res.statusCode >= 400);
  assert.equal(cancellations, 1);
});

test('HTTP rejection consumes the one submit attempt and never retries or returns upstream error bodies', async () => {
  for (const stage of [submitUrl, pollingUrl, sampleUrl]) {
    for (const code of [401, 402, 403, 429, 500]) {
      const app = await setup(call => call.url === stage ? json({ message: 'PRIVATE_UPSTREAM_SENTINEL', key, sample: sampleUrl }, code) : normalResponse(call));
      const response = (await request(app.handler)).res;
      assert.ok(response.statusCode >= 400);
      assert.equal(response.data.remainingRequests, 2);
      assert.equal(response.data.reference, undefined);
      assert.equal(app.calls.filter(call => call.init.method === 'POST').length, 1);
      assert.equal(app.calls.filter(call => call.url === stage).length, 1);
      privateResponse(response);
    }
  }
});

test('cancellation between polls clears local waiting without another GET or POST', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const polled = deferred<void>();
  const app = await setup(call => {
    if (call.url === pollingUrl) { polled.resolve(); return json(result('Pending')); }
    return normalResponse(call);
  });
  const operation = begin(app.handler);
  await polled.promise;
  await turn();
  operation.res.disconnect();
  await operation.done;
  t.mock.timers.tick(120000);
  await turn();
  assert.deepEqual(app.calls.map(call => call.url), [submitUrl, pollingUrl]);
  assert.equal(operation.res.body, undefined);
  const state = (await status(app.handler)).res.data;
  assert.equal(state.pendingTransport, false);
  assert.equal(state.remainingRequests, 2);
  assert.equal(state.available, true);
  assert.equal((await post(app.handler, 'request-1')).res.statusCode, 409);
});

test('normal completed-upload close is not cancellation and late ignored-abort rejection is contained', async () => {
  for (const rejectLate of [false, true]) {
    const submitted = deferred<void>();
    const pending = deferred<Response>();
    const app = await setup(call => {
      if (call.url === submitUrl) { submitted.resolve(); return pending.promise; }
      return normalResponse(call);
    });
    const operation = begin(app.handler);
    await submitted.promise;
    operation.req.emit('close');
    assert.equal(app.calls[0].init.signal!.aborted, false);
    if (rejectLate) {
      operation.res.disconnect();
      await operation.done;
      assert.equal((await status(app.handler)).res.data.pendingTransport, true);
      pending.reject(new Error('PRIVATE_UPSTREAM_SENTINEL'));
      await turn();
      assert.equal((await status(app.handler)).res.data.pendingTransport, false);
      assert.equal(operation.res.body, undefined);
      assert.equal(app.calls.length, 1);
    } else {
      pending.resolve(json(accepted()));
      await operation.done;
      assert.equal(operation.res.statusCode, 200);
      assert.equal(operation.res.data.reference.source, 'synthetic');
    }
  }
});

test('foreign reference IDs and signed upstream data cannot become a local asset proxy or leak into responses and logs', async t => {
  const logs: unknown[][] = [];
  for (const name of ['log', 'warn', 'error'] as const) t.mock.method(console, name, (...args: unknown[]) => { logs.push(args); });
  const app = await setup(call => call.url === pollingUrl ? json(result('Error', {
    details: { key, sample: sampleUrl, message: 'PRIVATE_UPSTREAM_SENTINEL' },
  })) : normalResponse(call));
  const failure = (await request(app.handler)).res;
  privateResponse(failure);
  for (const path of ['00000000-0000-4000-8000-000000000000', encodeURIComponent(sampleUrl), 'fixture-success', '../secrets']) {
    const response = (await request(app.handler, { method: 'GET', url: `${endpoint}/${path}` })).res;
    assert.equal(response.statusCode, 404);
    privateResponse(response);
  }
  assert.equal(app.calls.length, 2);
  assert.equal(app.keyReads, 1);
  assert.doesNotMatch(JSON.stringify(logs), /synthetic-bfl-key|PRIVATE_SIGNED_SENTINEL|PRIVATE_UPSTREAM_SENTINEL/);
});
