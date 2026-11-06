import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { IncomingMessage, type ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { createRoomInterpretationHandler } from '../src/server/room-interpretation.ts';
import { ROOM_DESCRIPTION_SCHEMA } from '../src/room/room-description.ts';
import { validateRoomInterpretationResult } from '../src/room/room-interpretation-result.ts';
import { caseFixture } from './fixtures/room-case-fixture.ts';

const origin = 'http://127.0.0.1:5173';
const model = 'claude-opus-5-5';
const key = 'injected-test-key-not-a-credential';
const endpoint = '/api/compose-room';

// Synthetic provider fixtures; no live model or network participates in these tests.
function roomFixture() {
  return { version: 1, width: 6, depth: 6, height: 3.4,
    doorway: { placement: 'left', width: 1.2, height: 2.3 },
    colors: { wall: 'cream', floor: 'walnut' }, furnishings: [{ kind: 'chair', color: 'teal' }],
  };
}
function resultFixture() {
  return { version: 2, outcome: 'supported', reply: 'I imagine a teal chair in a cream room.', unsupported: [], description: roomFixture(), case: caseFixture() };
}
function inventoryResultFixture() {
  return { ...resultFixture(), reply: 'I recall cream walls, a walnut table and two teal chairs. Perhaps.',
    description: { ...roomFixture(), furnishings: [
      { kind: 'table', color: 'walnut' }, { kind: 'chair', color: 'teal' }, { kind: 'chair', color: 'teal' },
    ] },
  };
}
function messageFixture(result: unknown = resultFixture()) {
  return { id: 'msg_fixture', type: 'message', role: 'assistant', model,
    stop_reason: 'end_turn', stop_sequence: null,
    content: [{ type: 'thinking', thinking: '', signature: 'fixture-signature' }, { type: 'text', text: JSON.stringify(result) }],
    usage: { input_tokens: 200, output_tokens: 200 },
  };
}
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

type Call = { url: string; init: RequestInit; body: Record<string, unknown> };
function provider(respond?: (call: Call, index: number) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    assert.equal(typeof input, 'string');
    assert.ok(init && typeof init.body === 'string');
    const call = { url: String(input), init, body: JSON.parse(init.body) as Record<string, unknown> };
    calls.push(call);
    return respond ? respond(call, calls.length) : json(call.url.endsWith('/count_tokens') ? { input_tokens: 200 } : messageFixture());
  };
  return { fetch, calls };
}
function setup(respond?: Parameters<typeof provider>[0]) {
  const injected = provider(respond);
  return { ...injected, handler: createRoomInterpretationHandler({ origin, enabled: true, apiKey: key, fetch: injected.fetch }) };
}

class CapturedResponse extends EventEmitter {
  statusCode = 200;
  writableEnded = false;
  destroyed = false;
  closed = false;
  headers = new Map<string, string>();
  body: string | undefined;
  setHeader(name: string, value: string | number) { this.headers.set(name.toLowerCase(), String(value)); return this; }
  end(body: string) {
    this.body = body;
    this.writableEnded = true;
    this.emit('finish');
    this.closed = true;
    this.emit('close');
    return this;
  }
  disconnect() { this.destroyed = true; this.closed = true; this.emit('close'); }
  get data() { assert.ok(this.body); return JSON.parse(this.body); }
}

type Handler = ReturnType<typeof createRoomInterpretationHandler>;
function begin(handler: Handler, options: {
  method?: string; url?: string; headers?: Record<string, string | undefined>;
  rawHeaders?: string[]; body?: string | Uint8Array | null;
} = {}) {
  const req = new IncomingMessage(new Socket());
  req.method = options.method ?? 'POST';
  req.url = options.url ?? endpoint;
  req.headers = { host: '127.0.0.1:5173', origin, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...options.headers };
  req.rawHeaders = options.rawHeaders ?? Object.entries(req.headers).flatMap(([name, value]) => value === undefined ? [] : [name, String(value)]);
  const res = new CapturedResponse();
  let nextCalls = 0;
  const done = handler(req, res as unknown as ServerResponse, () => { nextCalls += 1; });
  const body = options.body === undefined ? JSON.stringify({ suggestion: 'a quiet teal reading room' }) : options.body;
  if (body !== null) {
    req.complete = true;
    req.push(Buffer.from(body));
    req.push(null);
  }
  return { req, res, done, get nextCalls() { return nextCalls; } };
}
async function request(handler: Handler, options: Parameters<typeof begin>[1] = {}) {
  const operation = begin(handler, options);
  await operation.done;
  return operation;
}
function assertJson(response: CapturedResponse) {
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-type') ?? '', /^application\/json/);
  assert.equal(response.headers.has('access-control-allow-origin'), false);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
}

test('unrelated routes call next; only exact loopback origins can configure the handler', async () => {
  const { handler, calls, fetch } = setup();
  for (const url of ['/', '/src/App.tsx', '/@vite/client', '/assets/app.js']) {
    const operation = await request(handler, { method: 'GET', url });
    assert.equal(operation.nextCalls, 1);
    assert.equal(operation.res.body, undefined);
  }
  for (const invalid of ['http://localhost:5173', 'https://127.0.0.1:5173', 'http://127.0.0.1:5174', `${origin}/`, `${origin}/path`, 'http://user@127.0.0.1:5173']) {
    assert.throws(() => createRoomInterpretationHandler({ origin: invalid, enabled: true, apiKey: key, fetch }), /origin/i);
  }
  const preview = createRoomInterpretationHandler({ origin: 'http://127.0.0.1:4173', enabled: true, apiKey: key, fetch });
  const status = await request(preview, { method: 'GET', headers: { host: '127.0.0.1:4173', origin: undefined } });
  assert.equal(status.res.statusCode, 200);
  assert.equal(calls.length, 0);
});

test('status is truthful and disabled or missing-key states never access the provider', async () => {
  const injected = provider();
  const disabled = createRoomInterpretationHandler({ origin, enabled: false, fetch: injected.fetch,
    get apiKey(): string { throw new Error('disabled key access'); },
  });
  for (const [handler, reason] of [
    [disabled, 'disabled'],
    [createRoomInterpretationHandler({ origin, enabled: true, fetch: injected.fetch }), 'missing_key'],
    [createRoomInterpretationHandler({ origin, enabled: true, apiKey: '  ', fetch: injected.fetch }), 'missing_key'],
  ] as const) {
    for (const method of ['GET', 'POST']) {
      const { res } = await request(handler, { method });
      assert.equal(res.statusCode, 503);
      assert.equal(method === 'GET' ? res.data.reason : res.data.error, reason);
      assert.equal(res.data.remainingRequests, 3);
      assertJson(res);
      assert.equal(res.body!.includes(key), false);
    }
  }
  const { handler } = setup();
  const { res } = await request(handler, { method: 'GET', headers: { origin: undefined } });
  assert.deepEqual(res.data, { available: true, reason: null, model, remainingRequests: 3 });
  assert.equal(injected.calls.length, 0);
});

test('host, origin, fetch-site and duplicate security headers reject before external calls', async () => {
  const { handler, calls } = setup();
  const badHeaders = [
    { host: 'evil.example' }, { host: 'localhost:5173' }, { host: '127.0.0.1:4173' }, { host: undefined },
    { origin: undefined }, { origin: 'null' }, { origin: 'https://evil.example' }, { origin: `${origin}/` },
    { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' },
  ];
  for (const headers of badHeaders) {
    const { res } = await request(handler, { headers });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.error, 'forbidden');
    assertJson(res);
  }
  for (const name of ['host', 'origin', 'content-type', 'sec-fetch-site', 'content-length']) {
    const { res } = await request(handler, { rawHeaders: [name, 'first', name.toUpperCase(), 'second'] });
    assert.equal(res.statusCode, 403);
  }
  assert.equal(calls.length, 0);
});

test('method, endpoint variants, content type and content encoding are rejected without spending slots', async () => {
  const { handler, calls } = setup();
  for (const method of ['PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
    const { res } = await request(handler, { method });
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.get('allow'), 'GET, POST');
    assertJson(res);
  }
  for (const url of [`${endpoint}?x=1`, `${endpoint}/`, `${endpoint}/other`, `${endpoint}#x`]) {
    const operation = await request(handler, { url });
    assert.equal(operation.res.statusCode, 404);
    assert.equal(operation.nextCalls, 0);
  }
  for (const value of [undefined, 'text/plain', 'application/x-www-form-urlencoded', 'application/json; charset=latin1', 'multipart/form-data']) {
    const { res } = await request(handler, { headers: { 'content-type': value } });
    assert.equal(res.statusCode, 415);
  }
  const compressed = await request(handler, { headers: { 'content-encoding': 'gzip' } });
  assert.equal(compressed.res.statusCode, 415);
  assert.equal(calls.length, 0);
  assert.equal((await request(handler, { method: 'GET' })).res.data.remainingRequests, 3);
});

test('only a nonempty bounded suggestion is accepted, without transcript or arbitrary fields', async () => {
  const { handler, calls } = setup();
  for (const input of [null, [], {}, { suggestion: 1 }, { suggestion: null }, { suggestion: '' }, { suggestion: ' \n\t ' },
    { suggestion: 'x'.repeat(2001) }, { suggestion: 'room', transcript: ['private'] }, { suggestion: 'room', frames: [] },
    { suggestion: 'room', url: 'https://invalid.example' }, { suggestion: 'room', seed: 1 },
  ]) {
    const { res } = await request(handler, { body: JSON.stringify(input) });
    assert.equal(res.statusCode, 400);
    assert.equal(res.data.error, 'invalid_request');
  }
  for (const body of ['{', '{"suggestion":"x"}{}', new Uint8Array([0xc3, 0x28])]) {
    assert.equal((await request(handler, { body })).res.statusCode, 400);
  }
  for (const length of ['-1', 'no', '1.5', '999999999999999999999999']) {
    const { res } = await request(handler, { headers: { 'content-length': length } });
    assert.ok(res.statusCode === 400 || res.statusCode === 413);
  }
  assert.equal(calls.length, 0);
});

test('UTF-8 request bytes are bounded including whitespace and chunked bodies', async () => {
  const accepted = setup();
  const base = JSON.stringify({ suggestion: 'x' });
  const exact = base.padEnd(12 * 1024, ' ');
  assert.equal((await request(accepted.handler, { body: exact })).res.statusCode, 200);
  const oversized = setup();
  for (const headers of [{}, { 'content-length': String(12 * 1024 + 1) }]) {
    assert.equal((await request(oversized.handler, { body: `${exact} `, headers })).res.statusCode, 413);
  }
  const chunks = begin(oversized.handler, { body: null });
  chunks.req.push(Buffer.alloc(7000, ' '));
  chunks.req.push(Buffer.alloc(7000, ' '));
  chunks.req.complete = true;
  chunks.req.push(null);
  await chunks.done;
  assert.equal(chunks.res.statusCode, 413);
  assert.equal(oversized.calls.length, 0);
  const unicode = setup();
  assert.equal((await request(unicode.handler, { body: JSON.stringify({ suggestion: 'é'.repeat(2000) }) })).res.statusCode, 200);
});

test('success sends only the allowlisted count and generation payloads and returns validated data', async () => {
  const { handler, calls } = setup();
  const { res } = await request(handler, { body: JSON.stringify({ suggestion: '  teal room\nwith a shelf  ' }),
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-transcript': 'not forwarded', 'x-forwarded-host': 'not-used.example' },
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.data, resultFixture());
  assertJson(res);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.anthropic.com/v1/messages/count_tokens');
  assert.equal(calls[1].url, 'https://api.anthropic.com/v1/messages');
  assert.deepEqual(Object.keys(calls[0].body).sort(), ['messages', 'model', 'system']);
  assert.deepEqual(Object.keys(calls[1].body).sort(), ['max_tokens', 'messages', 'model', 'output_config', 'system', 'thinking']);
  assert.equal(calls[0].body.model, model);
  assert.equal(calls[1].body.model, model);
  assert.deepEqual(calls[0].body.messages, [{ role: 'user', content: 'teal room\nwith a shelf' }]);
  assert.deepEqual(calls[1].body.messages, calls[0].body.messages);
  assert.equal(calls[1].body.system, calls[0].body.system);
  assert.ok(String(calls[0].body.system).includes(JSON.stringify(ROOM_DESCRIPTION_SCHEMA)));
  assert.equal(calls[1].body.max_tokens, 4096);
  assert.deepEqual(calls[1].body.thinking, { type: 'adaptive' });
  assert.deepEqual(calls[1].body.output_config, { effort: 'low' });
  for (const call of calls) {
    assert.equal(call.init.method, 'POST');
    assert.equal(call.init.redirect, 'error');
    assert.equal(call.init.credentials, 'omit');
    assert.equal(call.init.cache, 'no-store');
    assert.deepEqual(Object.fromEntries(new Headers(call.init.headers)), {
      'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'x-api-key': key,
    });
    assert.equal(String(call.init.body).includes('not forwarded'), false);
    assert.equal(String(call.init.body).includes('not-used.example'), false);
    assert.equal(String(call.init.body).includes(key), false);
    assert.ok(call.init.signal instanceof AbortSignal);
  }
  assert.equal((await request(handler, { method: 'GET' })).res.data.remainingRequests, 2);
});

test('outbound prompt requests nonspatial inventory and keeps doorway placement in structured metadata', async () => {
  const suggestion = 'Cream walls, a walnut table and two teal chairs';
  const result = inventoryResultFixture();
  const { handler, calls } = setup(call => json(call.url.endsWith('/count_tokens') ? { input_tokens: 200 } : messageFixture(result)));
  const { res } = await request(handler, { body: JSON.stringify({ suggestion }) });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.data, result, 'accepted provider text is neither rewritten nor substituted');
  assert.deepEqual(calls.map(call => call.url), [
    'https://api.anthropic.com/v1/messages/count_tokens',
    'https://api.anthropic.com/v1/messages',
  ]);
  assert.equal(calls[0].body.system, calls[1].body.system);
  const system = String(calls[1].body.system);
  assert.match(system, /short nonspatial inventory/i);
  assert.match(system, /surface colors.*furniture.*(?:kinds.*colors.*counts|colors.*kinds.*counts)/i);
  assert.match(system, /doorway placement.*only in (?:the )?structured description/i);
  const prefix = 'Nonspatial reply example (style only, not a fallback): ';
  const example = system.split('\n').find(line => line.startsWith(prefix))?.slice(prefix.length);
  assert.equal(example, 'I recall cream walls, a walnut table and two teal chairs. Perhaps.');
  const exampleResult = { ...result, reply: example };
  assert.deepEqual(validateRoomInterpretationResult(exampleResult, suggestion), exampleResult,
    'the example taken from the actual outbound prompt must pass the unchanged production boundary');
  assert.equal(res.data.reply, example);
  assertJson(res);
});

test('synthetic spatial near misses remain sanitized 422 failures without payload or repair', async t => {
  // Synthetic prompt/validator near misses, NOT a replay of the unavailable rejected live prose.
  for (const reply of [
    'I recall cream on the walls, a walnut table and two teal chairs. Perhaps.',
    'A doorway to the left. I recall a walnut table and two teal chairs.',
    'I recall a walnut table between two teal chairs.',
  ]) await t.test(reply, async () => {
    const result = { ...inventoryResultFixture(), reply };
    assert.equal(result.description.doorway.placement, 'left');
    const { handler, calls } = setup(call => json(call.url.endsWith('/count_tokens') ? { input_tokens: 200 } : messageFixture(result)));
    const { res } = await request(handler, { body: JSON.stringify({ suggestion: 'Cream walls, a walnut table and two teal chairs' }) });
    assert.equal(res.statusCode, 422);
    assert.deepEqual(res.data, {
      error: 'invalid_description',
      message: 'The provider did not return a valid bounded interpretation and reply.',
      remainingRequests: 2,
      rejectionReason: 'unsupported_spatial_claim',
    });
    for (const field of ['reply', 'description', 'case', 'solution', 'clues', 'candidates']) assert.equal(field in res.data, false);
    assert.equal(res.body!.includes(reply), false);
    assert.deepEqual(calls.map(call => call.url), [
      'https://api.anthropic.com/v1/messages/count_tokens',
      'https://api.anthropic.com/v1/messages',
    ]);
    assertJson(res);
  });
});

test('legacy room-only and unpaired v2 results fail closed with no repair request or case leak', async () => {
  const { case: _case, ...roomOnly } = resultFixture();
  for (const result of [
    { ...roomOnly, version: 1 }, roomOnly, { ...resultFixture(), case: null },
    { ...resultFixture(), outcome: 'unsupported', unsupported: ['Pools'], description: null },
  ]) {
    const { handler, calls } = setup(call => json(call.url.endsWith('/count_tokens') ? { input_tokens: 200 } : messageFixture(result)));
    const { res } = await request(handler);
    assert.equal(res.statusCode, 422);
    assert.equal(res.data.error, 'invalid_description');
    for (const field of ['reply', 'description', 'case', 'solution', 'clues', 'candidates']) assert.equal(field in res.data, false);
    assert.doesNotMatch(res.body!, /candidate-\d|object-\d|clue-\d/);
    assert.equal(calls.length, 2);
    assert.equal(res.data.remainingRequests, 2);
  }
});

test('shared result accepts honest partial/no-room responses with only one generation', async () => {
  for (const [suggestion, result] of [
    ['a chair and a pool', { ...resultFixture(), outcome: 'partial', unsupported: ['Pools'] }],
    ['A pool with lots of lights', { version: 2, outcome: 'unsupported', reply: 'Pools and configurable lighting are outside my vocabulary.', unsupported: ['Pools', 'Configurable lighting'], description: null, case: null }],
  ] as const) {
    const { handler, calls } = setup(call => json(call.url.endsWith('/count_tokens') ? { input_tokens: 200 } : messageFixture(result)));
    const { res } = await request(handler, { body: JSON.stringify({ suggestion }) });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.data, result);
    assert.equal(calls.length, 2);
  }
});

test('contradictory pool/lighting outcomes fail closed with a local explanation and no fallback', async () => {
  for (const result of [resultFixture(), { ...resultFixture(), outcome: 'partial', unsupported: ['Pools', 'Configurable lighting'] }]) {
    const { handler, calls } = setup(call => json(call.url.endsWith('/count_tokens') ? { input_tokens: 200 } : messageFixture(result)));
    const { res } = await request(handler, { body: JSON.stringify({ suggestion: 'A pool with lots of lights' }) });
    assert.equal(res.statusCode, 422);
    assert.equal(res.data.error, 'unsupported_capability');
    assert.match(res.data.message, /pools.*configurable lighting/i);
    assert.equal('reply' in res.data, false);
    assert.equal('description' in res.data, false);
    assert.equal(calls.length, 2);
  }
});

test('invalid envelope text or fields never reach the client as dialogue', async () => {
  for (const result of [{ ...resultFixture(), reply: 'The room is ready and displayed.' },
    { ...resultFixture(), reply: '<script>alert(1)</script>' }, { ...resultFixture(), reply: 'x'.repeat(601) },
    { ...resultFixture(), permissions: ['camera'] }, { ...resultFixture(), description: { ...roomFixture(), width: 99 } },
    { ...resultFixture(), outcome: 'unsupported' },
  ]) {
    const { handler, calls } = setup(call => json(call.url.endsWith('/count_tokens') ? { input_tokens: 200 } : messageFixture(result)));
    const { res } = await request(handler);
    assert.equal(res.statusCode, 422);
    assert.equal(res.data.error, 'invalid_description');
    assert.equal('reply' in res.data, false);
    assert.equal(calls.length, 2);
  }
});

test('unsupported furniture placement returns a sanitized rejection without reply or fallback', async () => {
  const result = { ...resultFixture(), reply: 'I imagine a teal chair near the far wall.' };
  const { handler, calls } = setup(call => json(call.url.endsWith('/count_tokens') ? { input_tokens: 200 } : messageFixture(result)));
  const { res } = await request(handler, { body: JSON.stringify({ suggestion: 'A teal chair' }) });
  assert.equal(res.statusCode, 422);
  assert.deepEqual(res.data, {
    error: 'invalid_description',
    message: 'The provider did not return a valid bounded interpretation and reply.',
    remainingRequests: 2,
    rejectionReason: 'unsupported_spatial_claim',
  });
  assert.equal('reply' in res.data, false);
  assert.equal('description' in res.data, false);
  assert.equal(res.body!.includes(result.reply), false);
  assertJson(res);
  assert.deepEqual(calls.map(call => call.url), [
    'https://api.anthropic.com/v1/messages/count_tokens',
    'https://api.anthropic.com/v1/messages',
  ]);
});

test('rejected provider content exposes only a fixed diagnostic code and never retries', async t => {
  for (const [result, rejectionReason] of [
    ['{private-marker', 'invalid_json'],
    [{ ...resultFixture(), extra: 'private-marker' }, 'invalid_envelope'],
    [{ ...resultFixture(), reply: '<private-marker>' }, 'invalid_reply_text'],
    [{ ...resultFixture(), unsupported: ['<private-marker>'] }, 'invalid_omissions'],
    [{ ...resultFixture(), description: null }, 'outcome_mismatch'],
    [{ ...resultFixture(), description: { ...roomFixture(), width: 'private-marker' } }, 'invalid_room_schema'],
    [{ ...resultFixture(), reply: 'A teal chair near the private-marker wall.' }, 'unsupported_spatial_claim'],
    [{ ...resultFixture(), case: { ...caseFixture(), prose: 'private-marker' } }, 'invalid_case_schema'],
    [{ ...resultFixture(), case: { ...caseFixture(), event: { kind: 'keepsake_taken', objectId: 'object-2' } } }, 'invalid_case_references'],
    [{ ...resultFixture(), case: { ...caseFixture(), solution: { candidateId: 'candidate-2' } } }, 'invalid_case_solution'],
    [{ ...resultFixture(), reply: 'The culprit is private-marker.' }, 'case_spoiler'],
  ] as const) await t.test(rejectionReason, async () => {
    const message = messageFixture(result);
    if (typeof result === 'string') message.content = [{ type: 'text', text: result }];
    const { handler, calls } = setup(call => json(call.url.endsWith('/count_tokens') ? { input_tokens: 200 } : message));
    const { res } = await request(handler);
    assert.equal(res.statusCode, 422);
    assert.deepEqual(res.data, {
      error: 'invalid_description',
      message: 'The provider did not return a valid bounded interpretation and reply.',
      remainingRequests: 2,
      rejectionReason,
    });
    assert.equal(res.body!.includes('private-marker'), false);
    assert.equal(res.body!.includes(key), false);
    assert.equal(calls.length, 2);
    assertJson(res);
  });
});

test('token counting gates generation and consumes one slot on rejection without retry', async () => {
  for (const count of [null, {}, { input_tokens: '4000' }, { input_tokens: -1 }, { input_tokens: 1.5 }, { input_tokens: null }, { input_tokens: 4001 }]) {
    const { handler, calls } = setup(() => json(count));
    const { res } = await request(handler);
    assert.equal(res.statusCode, count && 'input_tokens' in count && count.input_tokens === 4001 ? 422 : 502);
    assert.equal(calls.length, 1);
    assert.equal(res.data.remainingRequests, 2);
  }
  const boundary = setup(call => json(call.url.endsWith('/count_tokens') ? { input_tokens: 4000 } : messageFixture()));
  assert.equal((await request(boundary.handler)).res.statusCode, 200);
  assert.equal(boundary.calls.length, 2);
});

test('the three-attempt budget cannot be reset by GET and caps both endpoints', async () => {
  const { handler, calls } = setup();
  for (let remaining = 2; remaining >= 0; remaining -= 1) {
    assert.equal((await request(handler)).res.statusCode, 200);
    const status = await request(handler, { method: 'GET' });
    assert.equal(status.res.data.remainingRequests, remaining);
    assert.equal(status.res.statusCode, remaining ? 200 : 429);
  }
  const exhausted = await request(handler);
  assert.equal(exhausted.res.statusCode, 429);
  assert.equal(exhausted.res.data.error, 'budget_exhausted');
  assert.equal(calls.filter(call => call.url.endsWith('/count_tokens')).length, 3);
  assert.equal(calls.filter(call => call.url.endsWith('/messages')).length, 3);
});

test('provider status and transport errors are sanitized and never retried', async () => {
  for (const [status, expected, code] of [[401, 503, 'provider_auth'], [403, 503, 'provider_auth'],
    [429, 429, 'provider_rate_limited'], [500, 502, 'provider_unavailable'], [400, 502, 'provider_rejected'], [302, 502, 'provider_rejected']] as const) {
    const { handler, calls } = setup(() => json({ error: `${key}: private visitor text` }, status));
    const { res } = await request(handler);
    assert.equal(res.statusCode, expected);
    assert.equal(res.data.error, code);
    assert.equal(res.data.remainingRequests, 2);
    assert.equal(res.body!.includes(key), false);
    assert.equal(res.body!.includes('private visitor text'), false);
    assert.equal(calls.length, 1);
  }
  const failed = setup(() => { throw new Error(`${key}: private network error`); });
  const { res } = await request(failed.handler);
  assert.equal(res.statusCode, 502);
  assert.equal(res.data.error, 'provider_unavailable');
  assert.equal(res.body!.includes(key), false);
  assert.equal(failed.calls.length, 1);
});

test('wrong models, stop reasons, blocks and non-schema JSON cannot become accepted descriptions', async () => {
  const baseline = messageFixture();
  const badMessages = [
    null, {}, { ...baseline, type: 'error' }, { ...baseline, role: 'user' }, { ...baseline, model: 'other-model' },
    ...['refusal', 'max_tokens', 'tool_use', 'stop_sequence', 'pause_turn', null].map(stop_reason => ({ ...baseline, stop_reason })),
    ...[null, [], [{ type: 'tool_use', id: 'x', name: 'execute', input: {} }],
      [{ type: 'text', text: '{}' }, { type: 'text', text: '{}' }], [{ type: 'text', text: 1 }],
      [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(roomFixture()) }],
      [{ type: 'text', text: '```json\n{}\n```' }], [{ type: 'text', text: `${JSON.stringify(roomFixture())}{}` }],
      [{ type: 'text', text: JSON.stringify({ ...roomFixture(), code: 'execute()' }) }],
      [{ type: 'text', text: JSON.stringify({ ...roomFixture(), width: 99 }) }],
      [{ type: 'text', text: JSON.stringify({ ...roomFixture(), furnishings: [{ kind: 'asset', color: 'teal' }] }) }],
    ].map(content => ({ ...baseline, content })),
  ];
  for (const message of badMessages) {
    const { handler, calls } = setup(call => json(call.url.endsWith('/count_tokens') ? { input_tokens: 200 } : message));
    const { res } = await request(handler);
    assert.ok(res.statusCode === 422 || res.statusCode === 502);
    assert.equal('description' in res.data, false);
    assert.equal(res.data.remainingRequests, 2);
    assert.equal(calls.length, 2);
  }
});

test('malformed, wrong-type, oversized and invalid UTF-8 provider bodies are bounded failures', async () => {
  const responses = [
    () => new Response('{', { headers: { 'content-type': 'application/json' } }),
    () => new Response('{}', { headers: { 'content-type': 'text/html' } }),
    () => new Response('x'.repeat(128 * 1024 + 1), { headers: { 'content-type': 'application/json' } }),
    () => new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': String(128 * 1024 + 1) } }),
    () => new Response(new Uint8Array([0xc3, 0x28]), { headers: { 'content-type': 'application/json' } }),
  ];
  for (const response of responses) {
    const { handler, calls } = setup(response);
    const { res } = await request(handler);
    assert.equal(res.statusCode, 502);
    assert.equal(res.data.error, 'invalid_provider_response');
    assert.equal(calls.length, 1);
  }
});

test('single flight covers request upload, token counting and generation', async () => {
  const counting = deferred<Response>();
  const generating = deferred<Response>();
  const countStarted = deferred<void>();
  const generationStarted = deferred<void>();
  const { handler, calls } = setup(call => {
    if (call.url.endsWith('/count_tokens')) { countStarted.resolve(); return counting.promise; }
    generationStarted.resolve(); return generating.promise;
  });
  const first = begin(handler, { body: null });
  assert.equal((await request(handler)).res.statusCode, 409);
  assert.equal(calls.length, 0);
  first.req.complete = true;
  first.req.push(Buffer.from(JSON.stringify({ suggestion: 'quiet room' })));
  first.req.push(null);
  await countStarted.promise;
  assert.equal((await request(handler)).res.statusCode, 409);
  assert.equal((await request(handler, { method: 'GET' })).res.data.reason, 'busy');
  counting.resolve(json({ input_tokens: 200 }));
  await generationStarted.promise;
  assert.equal((await request(handler)).res.statusCode, 409);
  generating.resolve(json(messageFixture()));
  await first.done;
  assert.equal(first.res.statusCode, 200);
  assert.equal(calls.length, 2);
});

test('normal completed-request close is not cancellation while response disconnect is', async () => {
  const pending = deferred<Response>();
  const started = deferred<void>();
  const { handler, calls } = setup(() => { started.resolve(); return pending.promise; });
  const operation = begin(handler);
  await started.promise;
  operation.req.emit('close');
  assert.equal(calls[0].init.signal!.aborted, false);
  operation.res.disconnect();
  await operation.done;
  assert.equal(calls[0].init.signal!.aborted, true);
  assert.equal(operation.res.body, undefined);
  assert.equal((await request(handler, { method: 'GET' })).res.data.remainingRequests, 2);
  pending.reject(new Error('late failure with private data'));
});

test('late count responses are discarded and cancelled without disturbing a newer operation', async () => {
  const oldCount = deferred<Response>();
  const newCount = deferred<Response>();
  const oldStarted = deferred<void>();
  const newStarted = deferred<void>();
  const { handler, calls } = setup((call, index) => {
    if (index === 1) { oldStarted.resolve(); return oldCount.promise; }
    if (index === 2) { newStarted.resolve(); return newCount.promise; }
    assert.equal(call.url, 'https://api.anthropic.com/v1/messages');
    return json(messageFixture());
  });
  const old = begin(handler);
  await oldStarted.promise;
  old.res.disconnect();
  await old.done;
  const current = begin(handler);
  await newStarted.promise;
  const cancelled = deferred<void>();
  oldCount.resolve(new Response(new ReadableStream({ cancel() { cancelled.resolve(); } }), { headers: { 'content-type': 'application/json' } }));
  await cancelled.promise;
  assert.equal(old.res.body, undefined);
  assert.equal((await request(handler)).res.statusCode, 409);
  newCount.resolve(json({ input_tokens: 200 }));
  await current.done;
  assert.equal(current.res.statusCode, 200);
  assert.equal(calls.length, 3);
  assert.equal((await request(handler, { method: 'GET' })).res.data.remainingRequests, 1);
});

test('a response received just before cancellation is released before its reader is acquired', { timeout: 2000 }, async () => {
  const cancelled = deferred<void>();
  let operation: ReturnType<typeof begin>;
  const { handler, calls } = setup(() => {
    queueMicrotask(() => queueMicrotask(() => operation.res.disconnect()));
    return new Response(new ReadableStream({ cancel() { cancelled.resolve(); } }), { headers: { 'content-type': 'application/json' } });
  });
  operation = begin(handler);
  await operation.done;
  await cancelled.promise;
  assert.equal(operation.res.body, undefined);
  assert.equal(calls.length, 1);
  assert.equal((await request(handler, { method: 'GET' })).res.data.remainingRequests, 2);
});

test('late generation completion after disconnect cannot return a room', { timeout: 2000 }, async () => {
  const pending = deferred<Response>();
  const started = deferred<void>();
  const { handler, calls } = setup(call => {
    if (call.url.endsWith('/count_tokens')) return json({ input_tokens: 200 });
    started.resolve();
    return pending.promise;
  });
  const operation = begin(handler);
  await started.promise;
  operation.res.disconnect();
  await operation.done;
  const cancelled = deferred<void>();
  pending.resolve(new Response(new ReadableStream({ cancel() { cancelled.resolve(); } }), { headers: { 'content-type': 'application/json' } }));
  await cancelled.promise;
  assert.equal(operation.res.body, undefined);
  assert.equal(calls.length, 2);
  assert.equal((await request(handler, { method: 'GET' })).res.data.remainingRequests, 2);
});

test('disconnect while reading generation cancels the reader and never returns a room', async () => {
  const reading = deferred<void>();
  const cancelled = deferred<void>();
  const { handler, calls } = setup(call => call.url.endsWith('/count_tokens') ? json({ input_tokens: 200 })
    : new Response(new ReadableStream<Uint8Array>({ pull() { reading.resolve(); }, cancel() { cancelled.resolve(); } }),
      { headers: { 'content-type': 'application/json' } }));
  const operation = begin(handler);
  await reading.promise;
  operation.res.disconnect();
  await operation.done;
  await cancelled.promise;
  assert.equal(operation.res.body, undefined);
  assert.equal(calls[1].init.signal!.aborted, true);
  assert.equal((await request(handler, { method: 'GET' })).res.data.remainingRequests, 2);
});

test('the entire operation times out after 60 seconds even when fetch ignores cancellation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const started = deferred<void>();
  const pending = deferred<Response>();
  const { handler, calls } = setup(() => { started.resolve(); return pending.promise; });
  const operation = begin(handler);
  await started.promise;
  t.mock.timers.tick(59_999);
  assert.equal(operation.res.body, undefined);
  t.mock.timers.tick(1);
  await operation.done;
  assert.equal(operation.res.statusCode, 504);
  assert.equal(operation.res.data.error, 'timeout');
  assert.equal(calls[0].init.signal!.aborted, true);
  assert.equal((await request(handler, { method: 'GET' })).res.data.remainingRequests, 2);
  pending.resolve(json({ input_tokens: 200 }));
});

test('a request error arriving after local cancellation is handled until the stream closes', async () => {
  const { handler, calls } = setup();
  const operation = begin(handler, { body: null });
  operation.req.emit('aborted');
  await operation.done;
  assert.doesNotThrow(() => operation.req.emit('error', new Error('late connection reset')));
  operation.req.emit('close');
  assert.equal(operation.req.listenerCount('error'), 0);
  assert.equal(operation.res.listenerCount('error'), 0);
  assert.equal(calls.length, 0);
  operation.req.complete = true;
  operation.req.push(null);
});

test('upload timeout and aborted requests release the active slot without calling the provider', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { handler, calls } = setup();
  const timed = begin(handler, { body: null });
  t.mock.timers.tick(60_000);
  await timed.done;
  assert.equal(timed.res.statusCode, 504);
  const abandoned = begin(handler, { body: null });
  abandoned.req.emit('aborted');
  await abandoned.done;
  assert.notEqual(abandoned.res.statusCode, 200);
  assert.equal(calls.length, 0);
  assert.equal((await request(handler, { method: 'GET' })).res.data.remainingRequests, 3);
  timed.req.complete = abandoned.req.complete = true;
  timed.req.push(null);
  abandoned.req.push(null);
});
