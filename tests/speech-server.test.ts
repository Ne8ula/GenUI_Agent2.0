import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { IncomingMessage, type ServerResponse } from 'node:http';
import { Socket } from 'node:net';

const origin = 'http://127.0.0.1:5173';
const key = 'synthetic-test-key-not-a-credential';
const voiceId = 'syntheticVoice1234567';
const tokenPath = '/api/speech/token';
const speakPath = '/api/speech/speak';
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}
function audio() {
  return new Response(new Uint8Array([0xff, 0xfb, 1, 2]), { headers: { 'content-type': 'audio/mpeg' } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
type Call = { url: string; init: RequestInit };
type Handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>;
async function setup(respond?: (call: Call) => Response | Promise<Response>) {
  const { createSpeechHandler } = await import('../src/server/speech.ts');
  const calls: Call[] = [];
  const fetch: typeof globalThis.fetch = async (input, init = {}) => {
    const call = { url: String(input), init };
    calls.push(call);
    return respond ? respond(call) : call.url.includes('/single-use-token/') ? json({ token: 'synthetic-single-use-token' }) : audio();
  };
  const handler = createSpeechHandler({ origin, enabled: true, privacyConfirmed: true, apiKey: key, voiceId, fetch });
  return { createSpeechHandler, handler, calls, fetch };
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
  method?: string; url?: string; remoteAddress?: string;
  headers?: Record<string, string | undefined>; rawHeaders?: string[]; body?: string | Uint8Array | null;
} = {}) {
  // Unconnected in-memory sockets only: no listen, bind, DNS or provider access.
  const socket = new Socket();
  Object.defineProperty(socket, 'remoteAddress', { value: options.remoteAddress ?? '127.0.0.1' });
  const req = new IncomingMessage(socket);
  req.method = options.method ?? 'POST';
  req.url = options.url ?? tokenPath;
  req.headers = { host: '127.0.0.1:5173', origin, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...options.headers };
  req.rawHeaders = options.rawHeaders ?? Object.entries(req.headers).flatMap(([name, value]) => value === undefined ? [] : [name, value]);
  const res = new CapturedResponse();
  let nextCalls = 0;
  const done = handler(req, res as unknown as ServerResponse, () => { nextCalls += 1; });
  const body = options.body === undefined ? JSON.stringify(req.url === speakPath ? { text: 'Local/scripted text, not evidence.' } : {}) : options.body;
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
}

test('speech is disabled by default and never reads credentials or calls a provider until enabled and privacy-confirmed', async () => {
  const { createSpeechHandler, fetch, calls } = await setup();
  for (const options of [{}, { enabled: false, privacyConfirmed: true }, { enabled: true, privacyConfirmed: false }]) {
    const handler = createSpeechHandler({ origin, ...options, voiceId, fetch,
      get apiKey(): string { throw new Error('credential access before approval'); },
    });
    for (const [method, url] of [['GET', '/api/speech'], ['POST', tokenPath], ['POST', speakPath]]) {
      const { res } = await request(handler, { method, url });
      assert.equal(res.statusCode, 503);
      assert.equal(method === 'GET' ? res.data.reason : res.data.error, options.enabled ? 'privacy_unconfirmed' : 'disabled');
      assert.equal(res.data.remainingRequests, 3);
      privateResponse(res);
    }
  }
  assert.equal(calls.length, 0);
});

test('missing credentials or valid configured voice remain unavailable without invented defaults', async () => {
  const { createSpeechHandler, fetch, calls } = await setup();
  for (const [apiKey, voice, reason] of [[undefined, voiceId, 'missing_key'], [' ', voiceId, 'missing_key'],
    [key, undefined, 'missing_voice'], [key, '../private?x=1', 'missing_voice']] as const) {
    const handler = createSpeechHandler({ origin, enabled: true, privacyConfirmed: true, apiKey, voiceId: voice, fetch });
    const { res } = await request(handler, { method: 'GET', url: '/api/speech' });
    assert.equal(res.statusCode, 503);
    assert.equal(res.data.reason, reason);
    assert.equal(res.data.remainingRequests, 3);
  }
  assert.equal(calls.length, 0);
});

test('only exact approved loopback origins routes and methods enter the speech boundary', async () => {
  const { handler, createSpeechHandler, fetch, calls } = await setup();
  for (const invalid of ['http://localhost:5173', 'https://127.0.0.1:5173', `${origin}/`, 'http://127.0.0.1:5174', 'https://evil.example']) {
    assert.throws(() => createSpeechHandler({ origin: invalid, fetch }), /origin/i);
  }
  for (const url of ['/', '/src/App.tsx', '/api/compose-room']) {
    const operation = await request(handler, { url });
    assert.equal(operation.nextCalls, 1);
    assert.equal(operation.res.body, undefined);
  }
  for (const url of ['/api/speech?x=1', `${tokenPath}/`, `${speakPath}?voice=other`, '/api/speech/other']) {
    const operation = await request(handler, { url });
    assert.equal(operation.res.statusCode, 404);
    assert.equal(operation.nextCalls, 0);
  }
  for (const [method, url] of [['POST', '/api/speech'], ['GET', tokenPath], ['GET', speakPath], ['OPTIONS', tokenPath], ['PUT', speakPath]]) {
    assert.equal((await request(handler, { method, url })).res.statusCode, 405);
  }
  assert.equal(calls.length, 0);
});

test('nonloopback peers cross-origin requests and duplicate protected headers fail before spending', async () => {
  const { handler, calls } = await setup();
  for (const headers of [{ host: 'evil.example' }, { host: undefined }, { origin: undefined }, { origin: 'null' },
    { origin: 'https://evil.example' }, { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' }]) {
    assert.equal((await request(handler, { headers })).res.statusCode, 403);
  }
  assert.equal((await request(handler, { remoteAddress: '192.0.2.1' })).res.statusCode, 403);
  for (const name of ['host', 'origin', 'content-type', 'content-length', 'content-encoding', 'transfer-encoding', 'sec-fetch-site']) {
    assert.equal((await request(handler, { rawHeaders: [name, 'first', name.toUpperCase(), 'second'] })).res.statusCode, 403);
  }
  assert.equal(calls.length, 0);
  assert.equal((await request(handler, { method: 'GET', url: '/api/speech' })).res.data.remainingRequests, 3);
});

test('token and speech inputs are strictly allowlisted UTF8 JSON and bounded before a provider attempt', async () => {
  const { handler, calls } = await setup();
  for (const body of [null, [], { token: 'client-token' }, { model: 'other' }, { text: 'not a token request' }]) {
    assert.equal((await request(handler, { body: JSON.stringify(body) })).res.statusCode, 400);
  }
  for (const body of [null, [], {}, { text: '' }, { text: ' ' }, { text: 3 }, { text: 'x'.repeat(2001) },
    { text: 'safe', voiceId: 'client-selected' }, { text: 'safe', case: { solution: 'hidden' } }, { text: 'safe', url: 'https://evil.example' }]) {
    assert.equal((await request(handler, { url: speakPath, body: JSON.stringify(body) })).res.statusCode, 400);
  }
  for (const body of ['{', '{}{}', new Uint8Array([0xc3, 0x28])]) assert.equal((await request(handler, { body })).res.statusCode, 400);
  for (const contentType of [undefined, 'text/plain', 'application/json; charset=latin1']) {
    assert.equal((await request(handler, { headers: { 'content-type': contentType } })).res.statusCode, 415);
  }
  assert.equal((await request(handler, { headers: { 'content-encoding': 'gzip' } })).res.statusCode, 415);
  assert.equal((await request(handler, { headers: { 'content-length': '3' }, body: '{}' })).res.statusCode, 400);
  assert.equal((await request(handler, { headers: { 'content-length': '-1' } })).res.statusCode, 400);
  assert.equal((await request(handler, { body: '{}'.padEnd(12 * 1024 + 1, ' ') })).res.statusCode, 413);
  const chunked = begin(handler, { body: null });
  chunked.req.push(Buffer.alloc(7000, ' '));
  chunked.req.push(Buffer.alloc(7000, ' '));
  chunked.req.complete = true;
  chunked.req.push(null);
  await chunked.done;
  assert.equal(chunked.res.statusCode, 413);
  assert.equal(calls.length, 0);
});

test('fixed token and Eleven v3 REST calls use server config logging-disabled parameters and no incoming credential forwarding', async () => {
  const { handler, calls } = await setup();
  const token = await request(handler);
  assert.equal(token.res.statusCode, 200);
  assert.deepEqual(token.res.data, { token: 'synthetic-single-use-token' });
  privateResponse(token.res);
  const spoken = await request(handler, { url: speakPath, body: JSON.stringify({ text: 'Local/scripted text. This is not evidence.' }),
    headers: { authorization: 'private-browser-credential', cookie: 'private-cookie', 'xi-api-key': 'not-forwarded' } });
  assert.equal(spoken.res.statusCode, 200);
  assert.deepEqual(spoken.res.body, Buffer.from([0xff, 0xfb, 1, 2]));
  assert.equal(spoken.res.headers.get('content-type'), 'audio/mpeg');
  privateResponse(spoken.res);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe');
  assert.equal(calls[0].init.body, undefined);
  const url = new URL(calls[1].url);
  assert.equal(url.origin, 'https://api.elevenlabs.io');
  assert.equal(url.pathname, `/v1/text-to-speech/${voiceId}`);
  assert.deepEqual(Object.fromEntries(url.searchParams), { output_format: 'mp3_44100_128', enable_logging: 'false' });
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), { text: 'Local/scripted text. This is not evidence.', model_id: 'eleven_v3' });
  for (const call of calls) {
    assert.equal(call.init.method, 'POST');
    assert.equal(call.init.redirect, 'error');
    assert.equal(call.init.credentials, 'omit');
    assert.equal(call.init.cache, 'no-store');
    const headers = new Headers(call.init.headers);
    assert.equal(headers.get('xi-api-key'), key);
    assert.equal(headers.has('authorization'), false);
    assert.equal(headers.has('cookie'), false);
    assert.ok(call.init.signal instanceof AbortSignal);
    assert.doesNotMatch(String(call.init.body), /private-browser|private-cookie|not-forwarded/);
  }
});

test('one shared three-attempt allowance covers token and speech requests and is never renewed by status', async () => {
  const { handler, calls } = await setup();
  for (const [index, url] of [tokenPath, speakPath, tokenPath].entries()) {
    assert.equal((await request(handler, { url })).res.statusCode, 200);
    const status = (await request(handler, { method: 'GET', url: '/api/speech' })).res;
    assert.equal(status.data.remainingRequests, 2 - index);
    assert.equal(status.data.available, index < 2);
    assert.deepEqual(status.data.models, { transcription: 'scribe_v2_realtime', speech: 'eleven_v3' });
  }
  for (const url of [tokenPath, speakPath]) {
    const { res } = await request(handler, { url });
    assert.equal(res.statusCode, 429);
    assert.equal(res.data.error, 'budget_exhausted');
  }
  assert.equal(calls.length, 3);
});

test('provider rejections are sanitized consume one attempt and never retry with logging enabled', async () => {
  for (const url of [tokenPath, speakPath]) {
    for (const code of [401, 403, 429, 500, 302]) {
      const { handler, calls } = await setup(() => json({ detail: `${key} private visitor text privacy entitlement denied` }, code));
      const { res } = await request(handler, { url });
      assert.ok(res.statusCode >= 400);
      assert.doesNotMatch(res.body!.toString(), /private visitor text|privacy entitlement denied|synthetic-test-key/);
      assert.equal(res.data.remainingRequests, 2);
      assert.equal(calls.length, 1);
      if (url === speakPath) assert.equal(new URL(calls[0].url).searchParams.get('enable_logging'), 'false');
    }
  }
});

test('token envelopes response byte limits media types and declared lengths are enforced', async () => {
  for (const response of [
    () => json({}), () => json({ token: '' }), () => json({ token: 'x'.repeat(2049) }), () => json({ token: 'synthetic', extra: true }),
    () => new Response(' '.repeat(4097), { headers: { 'content-type': 'application/json' } }),
    () => new Response('{}', { headers: { 'content-type': 'text/html' } }),
    () => new Response(new Uint8Array([0xc3, 0x28]), { headers: { 'content-type': 'application/json' } }),
    () => new Response('{"token":"synthetic"}', { headers: { 'content-type': 'application/json', 'content-length': '1' } }),
  ]) {
    const { handler, calls } = await setup(response);
    const { res } = await request(handler);
    assert.equal(res.statusCode, 502);
    assert.equal(res.data.error, 'invalid_provider_response');
    assert.equal(calls.length, 1);
  }
  for (const response of [
    () => new Response('private prose', { headers: { 'content-type': 'text/html' } }),
    () => new Response(new Uint8Array(2 * 1024 * 1024 + 1), { headers: { 'content-type': 'audio/mpeg' } }),
    () => new Response(new Uint8Array([1]), { headers: { 'content-type': 'audio/mpeg', 'content-length': '2' } }),
    () => new Response(new Uint8Array(), { headers: { 'content-type': 'audio/mpeg' } }),
  ]) {
    const { handler, calls } = await setup(response);
    const { res } = await request(handler, { url: speakPath });
    assert.equal(res.statusCode, 502);
    assert.equal(res.data.error, 'invalid_provider_response');
    assert.doesNotMatch(res.body!.toString(), /private prose/);
    assert.equal(calls.length, 1);
  }
});

test('single flight covers upload and provider response and disconnect frees only the current slot', async () => {
  const pending = deferred<Response>();
  const started = deferred<void>();
  const { handler, calls } = await setup(() => { started.resolve(); return pending.promise; });
  const first = begin(handler, { body: null });
  assert.equal((await request(handler, { url: speakPath })).res.statusCode, 409);
  assert.equal(calls.length, 0);
  first.req.complete = true;
  first.req.push(Buffer.from('{}'));
  first.req.push(null);
  await started.promise;
  first.req.emit('close');
  assert.equal(calls[0].init.signal!.aborted, false, 'normal completed upload close is not cancellation');
  assert.equal((await request(handler)).res.statusCode, 409);
  first.res.disconnect();
  await first.done;
  assert.equal(calls[0].init.signal!.aborted, true);
  assert.equal(first.res.body, undefined);
  const status = (await request(handler, { method: 'GET', url: '/api/speech' })).res.data;
  assert.equal(status.remainingRequests, 2);
  assert.equal(status.available, true);
  let cancelled = 0;
  pending.resolve(new Response(new ReadableStream({ cancel() { cancelled += 1; } }), { headers: { 'content-type': 'application/json' } }));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(cancelled, 1);
  assert.equal(calls.length, 1);
});

test('disconnect while reading audio cancels its reader and never returns partial audio', async () => {
  const reading = deferred<void>();
  let cancelled = 0;
  const { handler, calls } = await setup(() => new Response(new ReadableStream<Uint8Array>({
    pull() { reading.resolve(); }, cancel() { cancelled += 1; },
  }), { headers: { 'content-type': 'audio/mpeg' } }));
  const operation = begin(handler, { url: speakPath });
  await reading.promise;
  operation.res.disconnect();
  await operation.done;
  assert.equal(calls[0].init.signal!.aborted, true);
  assert.equal(cancelled, 1);
  assert.equal(operation.res.body, undefined);
});

test('thirty-second upload and provider timeouts abort locally even when dependencies ignore cancellation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const started = deferred<void>();
  const pending = deferred<Response>();
  const { handler, calls } = await setup(() => { started.resolve(); return pending.promise; });
  const upload = begin(handler, { body: null });
  t.mock.timers.tick(30000);
  await upload.done;
  assert.equal(upload.res.statusCode, 504);
  assert.equal(calls.length, 0);
  upload.req.complete = true;
  upload.req.push(null);
  const operation = begin(handler);
  await started.promise;
  t.mock.timers.tick(29999);
  assert.equal(operation.res.body, undefined);
  t.mock.timers.tick(1);
  await operation.done;
  assert.equal(operation.res.statusCode, 504);
  assert.equal(operation.res.data.error, 'timeout');
  assert.equal(operation.res.data.remainingRequests, 2);
  assert.equal(calls[0].init.signal!.aborted, true);
  pending.resolve(json({ token: 'late-synthetic-token' }));
});

test('client abort before upload completion spends no slot and late stream errors are handled until close', async () => {
  const { handler, calls } = await setup();
  const operation = begin(handler, { body: null });
  operation.req.emit('aborted');
  await operation.done;
  assert.doesNotThrow(() => operation.req.emit('error', new Error('late private connection error')));
  operation.req.emit('close');
  assert.equal(operation.req.listenerCount('error'), 0);
  assert.equal(operation.res.listenerCount('error'), 0);
  assert.equal(calls.length, 0);
  assert.equal((await request(handler, { method: 'GET', url: '/api/speech' })).res.data.remainingRequests, 3);
  operation.req.complete = true;
  operation.req.push(null);
});
