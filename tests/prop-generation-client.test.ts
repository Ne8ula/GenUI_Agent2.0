import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { createRoomCompositionController, type ComposedRoom, type RoomCompositionState } from '../src/room/room-composition.ts';
import { createProceduralRoom } from '../src/room/procedural-room.ts';
import type { RoomInspectionBinding } from '../src/room/room-inspection.ts';
import type { RoomPropRequest } from '../src/room/room-prop-request.ts';
import type { RoomPropInstaller } from '../src/room/room-prop-visual.ts';
import { readPropGenerationStatus, runPropGeneration } from '../src/room/prop-generation-client.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';
import { chairFixture, meshRecord } from './fixtures/prop-glb.ts';

// SYNTHETIC ONLY: route-shaped responses mirror the local 8B/8C route contracts; no server, provider or live call runs.
// globalThis.fetch is replaced by a router that throws on any unexpected method/URL and is restored after every test.
type Stage = 'reference-image' | 'mesh' | 'retrieving' | 'failed';
type RoomInstaller = (room: ComposedRoom, binding: RoomInspectionBinding, identity: { unit: symbol; revision: number }) => boolean;
type Controller = ReturnType<typeof createRoomCompositionController> & {
  advancePropRequest(request: RoomPropRequest, next: Stage): boolean;
};
type Call = { key: string; body: Record<string, any> | null; init: RequestInit; phase: string };
type Handler = (call: Call) => Response | Promise<Response>;

const poses = [
  { x: -2, z: -3, rotation: 0 }, { x: 2, z: -3, rotation: 0 },
  { x: -2, z: 0, rotation: 0 }, { x: 2, z: 0, rotation: 0 },
] as const;
const moved = { x: 2.75, z: -2.5, rotation: 90 };
const REFERENCE_ID = 'synthetic-reference-0001';
const MESH_ID = 'synthetic-mesh-00000001';
const IMAGE = 'POST /api/prop-reference-image';
const MESH = 'POST /api/prop-mesh';
const GLB = `GET /api/prop-mesh/${MESH_ID}`;
const SENTINEL = 'PROVIDER_TEXT_SENTINEL private upstream wording';
const bytes = () => chairFixture({ textured: false }).bytes;
const turn = () => new Promise<void>(resolve => setImmediate(resolve));
async function settle(count = 20) { for (let index = 0; index < count; index += 1) await turn(); }
async function until(check: () => boolean) {
  for (let index = 0; index < 200 && !check(); index += 1) await turn();
  assert.ok(check(), 'expected synthetic request was not issued');
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const glbResponse = (glb: ArrayBuffer) => new Response(new Uint8Array(glb.slice(0)), { status: 200,
  headers: { 'content-type': 'model/gltf-binary', 'content-length': String(glb.byteLength) } });
const reference = (requestId: string, overrides: Record<string, unknown> = {}) => ({ reference: { id: REFERENCE_ID, requestId,
  source: 'provider', provider: 'openai', model: 'gpt-image-2.5-flare', width: 1024, height: 1024, sha256: 'a'.repeat(64), usage: null, ...overrides },
remainingRequests: 2 });
const meshReply = (requestId: string, referenceId: string, record: { bytes: number; sha256: string }, overrides: Record<string, unknown> = {}) => ({
  mesh: { id: MESH_ID, requestId, referenceId, source: 'provider', provider: 'meshy', model: 'meshy-t2.5', ...record, ...overrides }, remainingRequests: 2 });
const failure = (status: number, error: string, extra: Record<string, unknown> = {}) => json(status,
  { error, ...extra, message: SENTINEL, remainingRequests: 2, remoteCancelled: false });
const imageStatus = (overrides: Record<string, unknown> = {}) => ({ available: true, reason: null, provider: 'openai',
  model: 'gpt-image-2.5-flare', credentialStatus: 'unchecked', remainingRequests: 3, pendingTransport: false, ...overrides });
const meshStatus = (overrides: Record<string, unknown> = {}) => ({ available: true, reason: null, provider: 'meshy',
  model: 'meshy-t2.5', credentialStatus: 'unchecked', remainingRequests: 3, pendingTransport: false, ...overrides });

function caseState(state: RoomCompositionState) {
  return { displayed: state.displayed, inspection: state.inspection, investigation: state.investigation,
    reconstruction: state.reconstruction, narration: state.narration, narratorContext: state.narratorContext, dialogue: state.dialogue };
}
function setup(t: TestContext) {
  const rooms = new Set<ComposedRoom>();
  const phases: string[] = [];
  const calls: Call[] = [];
  const unexpected: string[] = [];
  const routes = new Map<string, Handler[]>();
  const installs: RoomPropRequest[] = [];
  let binding: RoomInspectionBinding | null = null;
  const controller = createRoomCompositionController({
    fetch: async (input, init) => {
      assert.equal(input, '/api/compose-room', 'the controller transport only serves the synthetic room setup');
      assert.equal(init?.method, 'POST');
      return new Response(JSON.stringify(inspectionFixture()), { headers: { 'content-type': 'application/json' } });
    },
    yieldToBuild: () => Promise.resolve(),
    build: (description, seed) => {
      const room = createProceduralRoom(description, seed, poses);
      rooms.add(room);
      return room;
    },
    onStatus: state => { if (phases.at(-1) !== state.props.phase) phases.push(state.props.phase); },
  }) as Controller;
  const network = t.mock.method(globalThis, 'fetch', async (input: unknown, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    const handler = routes.get(key)?.shift();
    if (!handler) {
      unexpected.push(key);
      throw new Error(`Unexpected network request ${key}; nothing may reach the network.`);
    }
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, any> : null;
    const call = { key, body, init: init ?? {}, phase: controller.getState().props.phase };
    calls.push(call);
    return handler(call);
  });
  const install: RoomInstaller = (room, next) => { rooms.add(room); binding = next; return true; };
  const installer: RoomPropInstaller = (request, visual, isCurrent) => {
    assert.equal(isCurrent(), true);
    installs.push(request);
    visual.dispose();
    return true;
  };
  t.after(() => {
    network.mock.restore();
    controller.dispose();
    rooms.forEach(room => room.dispose());
    assert.deepEqual(unexpected, [], 'no unexpected request may be attempted');
  });
  return { controller, phases, calls, unexpected, installs, install, installer,
    get binding() { return binding!; },
    route(key: string, handler: Handler) { routes.set(key, [...routes.get(key) ?? [], handler]); } };
}
type App = ReturnType<typeof setup>;
async function reveal(app: App) {
  assert.equal(await app.controller.compose('Synthetic four-chair case; not live generation.', 41), true);
  assert.equal(app.controller.reveal(app.install), true);
  return app.controller.getState().reconstruction!.unit;
}
function investigate(app: App) {
  const unit = app.controller.getState().reconstruction!.unit;
  assert.equal(app.controller.inspect(app.binding.unit, 'object-1'), true);
  assert.equal(app.controller.proposeHypothesis(unit, 'candidate-3', ['clue-1']), true);
  assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-3'), true);
}
function prepare(app: App, objectId = 'object-1') {
  const { unit, revision } = app.controller.getState().reconstruction!;
  const request = app.controller.preparePropRequest(unit, revision, { objectId, description: 'A synthetic worn leather chair.' });
  assert.ok(request);
  return request;
}
function happyRoutes(app: App, glb = bytes(), record = meshRecord(glb)) {
  app.route(IMAGE, call => json(200, reference(call.body!.requestId)));
  app.route(MESH, call => json(200, meshReply(call.body!.requestId, call.body!.referenceId, record)));
  app.route(GLB, () => glbResponse(glb));
}
const run = (app: App, request: RoomPropRequest, signal = new AbortController().signal) =>
  runPropGeneration({ controller: app.controller, request, installer: app.installer, signal });
function assertGenerationFailed(app: App, request: RoomPropRequest) {
  const props = app.controller.getState().props;
  assert.equal(props.phase, 'failed');
  assert.equal(props.reason, 'generation_failed');
  assert.equal(props.remainingRequests, 2, 'a failed generation does not refund the local attempt');
  assert.equal(app.controller.isPropRequestCurrent(request), false);
  assert.deepEqual(app.installs, []);
}

test('the synthetic router itself refuses any unexpected method or URL', async t => {
  const app = setup(t);
  await assert.rejects(fetch('https://api.openai.com/v1/images/generations', { method: 'POST' }), /Unexpected network request/);
  await assert.rejects(fetch('/api/prop-reference-image'), /Unexpected network request/);
  assert.deepEqual(app.unexpected, ['POST https://api.openai.com/v1/images/generations', 'GET /api/prop-reference-image']);
  app.unexpected.length = 0;
});

test('status reads both GET routes and maps only consistent route shapes', async t => {
  const cases: [string, () => Response, () => Response, unknown][] = [
    ['both ready', () => json(200, imageStatus()), () => json(200, meshStatus({ remainingRequests: 2 })),
      { image: { phase: 'ready', remaining: 3 }, mesh: { phase: 'ready', remaining: 2 } }],
    ['disabled and unconfirmed spending', () => json(503, imageStatus({ available: false, reason: 'disabled' })),
      () => json(503, meshStatus({ available: false, reason: 'spending_unconfirmed' })),
      { image: { phase: 'disabled', remaining: 3 }, mesh: { phase: 'spending_unconfirmed', remaining: 3 } }],
    ['busy and unsettled transport', () => json(409, imageStatus({ available: false, reason: 'busy' })),
      () => json(200, meshStatus({ pendingTransport: true })),
      { image: { phase: 'busy', remaining: 3 }, mesh: { phase: 'busy', remaining: 3 } }],
    ['exhausted image allowance only', () => json(429, imageStatus({ available: false, reason: 'budget_exhausted', remainingRequests: 0 })),
      () => json(200, meshStatus()),
      { image: { phase: 'budget_exhausted', remaining: 0 }, mesh: { phase: 'ready', remaining: 3 } }],
    ['status/reason mismatch and swapped provider', () => json(200, imageStatus({ available: false, reason: 'disabled' })),
      () => json(200, meshStatus({ provider: 'openai' })),
      { image: { phase: 'unreachable', remaining: null }, mesh: { phase: 'unreachable', remaining: null } }],
    ['extra provider text and out-of-range allowance', () => json(200, imageStatus({ message: SENTINEL })),
      () => json(200, meshStatus({ remainingRequests: 4 })),
      { image: { phase: 'unreachable', remaining: null }, mesh: { phase: 'unreachable', remaining: null } }],
    ['non-JSON body and available with an error status', () => new Response(SENTINEL, { status: 502, headers: { 'content-type': 'text/plain' } }),
      () => json(503, meshStatus()),
      { image: { phase: 'unreachable', remaining: null }, mesh: { phase: 'unreachable', remaining: null } }],
    ['transport failure on one route', () => { throw new Error(SENTINEL); }, () => json(200, meshStatus()),
      { image: { phase: 'unreachable', remaining: null }, mesh: { phase: 'ready', remaining: 3 } }],
  ];
  for (const [name, image, mesh, expected] of cases) {
    await t.test(name, async t => {
      const app = setup(t);
      app.route('GET /api/prop-reference-image', image);
      app.route('GET /api/prop-mesh', mesh);
      const status = await readPropGenerationStatus(new AbortController().signal);
      assert.deepEqual(status, expected);
      assert.deepEqual(app.calls.map(call => call.key).sort(), ['GET /api/prop-mesh', 'GET /api/prop-reference-image']);
      assert.doesNotMatch(JSON.stringify(status), /PROVIDER_TEXT_SENTINEL/);
    });
  }
});

test('happy path: one requestId flows image → mesh → verified retrieval → caseColor install with truthful stages and unchanged case facts', async t => {
  const app = setup(t);
  await reveal(app);
  investigate(app);
  const request = prepare(app);
  const before = caseState(app.controller.getState());
  const glb = bytes();
  happyRoutes(app, glb);
  const install = t.mock.method(app.controller, 'installProp');
  assert.deepEqual(await run(app, request), { outcome: 'installed' });
  assert.deepEqual(app.calls.map(call => call.key), [IMAGE, MESH, GLB]);
  assert.deepEqual(app.calls.map(call => call.phase), ['reference-image', 'mesh', 'retrieving']);
  const [image, mesh] = app.calls;
  const requestId = image.body!.requestId;
  assert.match(requestId, /^[A-Za-z0-9_-]{1,128}$/);
  assert.deepEqual(image.body, { requestId, visual: { ...request.visual } });
  assert.deepEqual(mesh.body, { requestId, referenceId: REFERENCE_ID });
  for (const call of [image, mesh]) {
    assert.match(new Headers(call.init.headers).get('content-type') ?? '', /^application\/json/);
    assert.equal(call.init.redirect, 'error');
    assert.ok(call.init.signal instanceof AbortSignal);
  }
  assert.equal(install.mock.callCount(), 1);
  const [installedRequest, installedBytes, installer, options] = install.mock.calls[0].arguments;
  assert.equal(installedRequest, request, 'installation receives the exact prepared request');
  assert.deepEqual(new Uint8Array(installedBytes), new Uint8Array(glb));
  assert.equal(installer, app.installer);
  assert.deepEqual(options, { caseColor: true });
  assert.deepEqual(app.installs, [request]);
  assert.deepEqual(app.phases.slice(app.phases.lastIndexOf('prepared')),
    ['prepared', 'reference-image', 'mesh', 'retrieving', 'admitting', 'installing', 'installed']);
  const after = app.controller.getState();
  assert.deepEqual(caseState(after), before, 'case facts, clues and history never change');
  assert.equal(after.props.remainingRequests, 2);
  assert.equal(after.props.availability, 'unconfigured');
});

test('each prepared request gets a fresh requestId, shared only by its own image and mesh steps', async t => {
  const app = setup(t);
  await reveal(app);
  for (const objectId of ['object-1', 'object-2']) {
    happyRoutes(app);
    assert.deepEqual(await run(app, prepare(app, objectId)), { outcome: 'installed' });
  }
  const ids = app.calls.filter(call => call.key.startsWith('POST')).map(call => call.body!.requestId);
  assert.equal(ids.length, 4);
  assert.equal(ids[0], ids[1]);
  assert.equal(ids[2], ids[3]);
  assert.notEqual(ids[0], ids[2]);
});

for (const [name, configure, stage, keys] of [
  ['reference echoes another requestId', (app: App) => app.route(IMAGE, () => json(200, reference('another-request'))), 'image', [IMAGE]],
  ['reference id is malformed', (app: App) => app.route(IMAGE, call => json(200, reference(call.body!.requestId, { id: 'short' }))), 'image', [IMAGE]],
  ['mesh echoes another requestId', (app: App) => {
    app.route(IMAGE, call => json(200, reference(call.body!.requestId)));
    app.route(MESH, call => json(200, meshReply('another-request', call.body!.referenceId, meshRecord(bytes()))));
  }, 'mesh', [IMAGE, MESH]],
  ['mesh echoes another referenceId', (app: App) => {
    app.route(IMAGE, call => json(200, reference(call.body!.requestId)));
    app.route(MESH, call => json(200, meshReply(call.body!.requestId, 'synthetic-reference-9999', meshRecord(bytes()))));
  }, 'mesh', [IMAGE, MESH]],
] as const) {
  test(`echo mismatch stops the chain: ${name}`, async t => {
    const app = setup(t);
    await reveal(app);
    const request = prepare(app);
    configure(app);
    assert.deepEqual(await run(app, request), { outcome: 'failed', stage, code: 'invalid_response' });
    assert.deepEqual(app.calls.map(call => call.key), keys);
    assertGenerationFailed(app, request);
  });
}

test('an image route failure makes exactly one POST, reports only the fixed code, and never exposes provider text', async t => {
  const app = setup(t);
  await reveal(app);
  const request = prepare(app);
  app.route(IMAGE, () => failure(502, 'provider_auth'));
  const result = await run(app, request);
  assert.deepEqual(result, { outcome: 'failed', stage: 'image', code: 'provider_auth' });
  await settle();
  assert.deepEqual(app.calls.map(call => call.key), [IMAGE], 'no mesh request and no automatic retry');
  assert.deepEqual(app.phases.slice(-2), ['reference-image', 'failed']);
  assertGenerationFailed(app, request);
  assert.doesNotMatch(JSON.stringify(result), /PROVIDER_TEXT_SENTINEL/);
  assert.doesNotMatch(JSON.stringify(app.controller.getState().props), /PROVIDER_TEXT_SENTINEL/);
});

for (const [name, configure, expected] of [
  ['fixed PNG reason is kept', (app: App) => app.route(IMAGE, () => failure(422, 'invalid_image', { reason: 'critical_chunk' })),
    { outcome: 'failed', stage: 'image', code: 'invalid_image', reason: 'critical_chunk' }],
  ['unknown reason is dropped', (app: App) => app.route(IMAGE, () => failure(422, 'invalid_image', { reason: SENTINEL })),
    { outcome: 'failed', stage: 'image', code: 'invalid_image' }],
  ['mesh route code is kept', (app: App) => {
    app.route(IMAGE, call => json(200, reference(call.body!.requestId)));
    app.route(MESH, () => failure(502, 'provider_payment'));
  }, { outcome: 'failed', stage: 'mesh', code: 'provider_payment' }],
  ['unknown image code', (app: App) => app.route(IMAGE, () => failure(502, SENTINEL)),
    { outcome: 'failed', stage: 'image', code: 'invalid_response' }],
  ['mesh-only code on the image route', (app: App) => app.route(IMAGE, () => failure(504, 'poll_limit')),
    { outcome: 'failed', stage: 'image', code: 'invalid_response' }],
  ['non-JSON image failure', (app: App) => app.route(IMAGE, () => new Response(SENTINEL, { status: 502, headers: { 'content-type': 'text/plain' } })),
    { outcome: 'failed', stage: 'image', code: 'invalid_response' }],
  ['image-only code on the mesh route', (app: App) => {
    app.route(IMAGE, call => json(200, reference(call.body!.requestId)));
    app.route(MESH, () => failure(422, 'invalid_image'));
  }, { outcome: 'failed', stage: 'mesh', code: 'invalid_response' }],
] as const) {
  test(`route errors map only through fixed allowlists: ${name}`, async t => {
    const app = setup(t);
    await reveal(app);
    const request = prepare(app);
    configure(app);
    const result = await run(app, request);
    assert.deepEqual(result, expected);
    assertGenerationFailed(app, request);
    assert.doesNotMatch(JSON.stringify(result), /PROVIDER_TEXT_SENTINEL/);
    assert.doesNotMatch(JSON.stringify(app.controller.getState().props), /PROVIDER_TEXT_SENTINEL/);
  });
}

for (const [name, glb, record] of [
  ['SHA-256 mismatch', bytes(), { ...meshRecord(bytes()), sha256: '0'.repeat(64) }],
  ['hash-correct bytes that fail GLB admission', new TextEncoder().encode('abc').buffer, meshRecord(new TextEncoder().encode('abc').buffer)],
] as const) {
  test(`retrieval through verifiedMesh fails closed: ${name}`, async t => {
    const app = setup(t);
    await reveal(app);
    const request = prepare(app);
    happyRoutes(app, glb, record);
    const install = t.mock.method(app.controller, 'installProp');
    assert.deepEqual(await run(app, request), { outcome: 'failed', stage: 'retrieve', code: 'mesh_retrieval_failed' });
    assert.deepEqual(app.calls.map(call => call.key), [IMAGE, MESH, GLB]);
    assert.equal(install.mock.callCount(), 0);
    assertGenerationFailed(app, request);
  });
}

test('an installer refusal reports the install stage with the controller reason', async t => {
  const app = setup(t);
  await reveal(app);
  const request = prepare(app);
  happyRoutes(app);
  const result = await runPropGeneration({ controller: app.controller, request, installer: () => false, signal: new AbortController().signal });
  assert.deepEqual(result, { outcome: 'failed', stage: 'install', code: 'install_failed' });
  assert.equal(app.controller.getState().props.phase, 'failed');
  assert.equal(app.controller.getState().props.reason, 'install_failed');
  assert.equal(app.controller.isPropRequestCurrent(request), false);
});

test('an already-aborted signal submits nothing and claims no stage', async t => {
  const app = setup(t);
  await reveal(app);
  const request = prepare(app);
  const operation = new AbortController();
  operation.abort();
  assert.deepEqual(await run(app, request, operation.signal), { outcome: 'stopped', submitted: false });
  assert.deepEqual(app.calls, []);
  assert.equal(app.controller.getState().props.phase, 'prepared');
});

for (const stage of ['image', 'mesh', 'retrieve'] as const) {
  test(`abort during ${stage} settles locally at once; a late transport result starts nothing and installs nothing`, { timeout: 5000 }, async t => {
    const app = setup(t);
    await reveal(app);
    investigate(app);
    const request = prepare(app);
    const before = caseState(app.controller.getState());
    const glb = bytes();
    const held = deferred<Response>();
    // The held transport ignores its abort signal, like a request the server already accepted.
    app.route(IMAGE, call => stage === 'image' ? held.promise : json(200, reference(call.body!.requestId)));
    if (stage !== 'image') app.route(MESH, call => stage === 'mesh' ? held.promise : json(200, meshReply(call.body!.requestId, call.body!.referenceId, meshRecord(glb))));
    if (stage === 'retrieve') app.route(GLB, () => held.promise);
    const install = t.mock.method(app.controller, 'installProp');
    const operation = new AbortController();
    const pending = run(app, request, operation.signal);
    const count = { image: 1, mesh: 2, retrieve: 3 }[stage];
    await until(() => app.calls.length === count);
    const inFlight = app.calls.at(-1)!;
    operation.abort();
    assert.equal(app.controller.cancelPropRequest(), true);
    assert.deepEqual(await pending, { outcome: 'stopped', submitted: true });
    assert.equal(inFlight.init.signal?.aborted, true, 'the in-flight fetch was aborted locally');
    const stopped = app.controller.getState();
    assert.equal(stopped.props.phase, 'cancelled');
    const requestId = app.calls[0].body!.requestId;
    held.resolve(stage === 'image' ? json(200, reference(requestId))
      : stage === 'mesh' ? json(200, meshReply(requestId, REFERENCE_ID, meshRecord(glb))) : glbResponse(glb));
    await settle();
    assert.equal(app.calls.length, count, 'no later request after the late result');
    assert.equal(install.mock.callCount(), 0);
    assert.deepEqual(app.installs, []);
    assert.deepEqual(app.controller.getState(), stopped);
    assert.deepEqual(caseState(stopped), before);
  });
}

test('a reconstruction edit during the mesh step leaves the late mesh result unused', { timeout: 5000 }, async t => {
  const app = setup(t);
  const unit = await reveal(app);
  investigate(app);
  const request = prepare(app);
  const before = app.controller.getState();
  const held = deferred<Response>();
  app.route(IMAGE, call => json(200, reference(call.body!.requestId)));
  app.route(MESH, () => held.promise);
  const install = t.mock.method(app.controller, 'installProp');
  const pending = run(app, request);
  await until(() => app.calls.length === 2);
  assert.equal(app.controller.applyReconstructionEdit(unit, 0, 1, moved, app.install), true);
  assert.equal(app.controller.getState().props.phase, 'stale');
  held.resolve(json(200, meshReply(app.calls[0].body!.requestId, REFERENCE_ID, meshRecord(bytes()))));
  assert.deepEqual(await pending, { outcome: 'stopped', submitted: true });
  await settle();
  assert.deepEqual(app.calls.map(call => call.key), [IMAGE, MESH]);
  assert.equal(install.mock.callCount(), 0);
  const after = app.controller.getState();
  assert.equal(after.props.phase, 'stale');
  assert.equal(after.props.reason, 'reconstruction_changed');
  assert.deepEqual(after.displayed, before.displayed);
  assert.deepEqual(after.inspection!.discoveredClues, before.inspection!.discoveredClues);
  assert.deepEqual(after.investigation!.history.slice(0, -1), before.investigation!.history);
});

test('a revealed replacement case during the image step leaves the late reference unused', { timeout: 5000 }, async t => {
  const app = setup(t);
  await reveal(app);
  const request = prepare(app);
  const held = deferred<Response>();
  app.route(IMAGE, () => held.promise);
  const install = t.mock.method(app.controller, 'installProp');
  const pending = run(app, request);
  await until(() => app.calls.length === 1);
  assert.equal(await app.controller.compose('Synthetic replacement case; not live generation.', 41), true);
  assert.equal(app.controller.reveal(app.install), true);
  const replaced = app.controller.getState();
  assert.equal(replaced.props.phase, 'idle');
  held.resolve(json(200, reference(app.calls[0].body!.requestId)));
  assert.deepEqual(await pending, { outcome: 'stopped', submitted: true });
  await settle();
  assert.deepEqual(app.calls.map(call => call.key), [IMAGE]);
  assert.equal(install.mock.callCount(), 0);
  assert.deepEqual(app.controller.getState(), replaced);
  assert.equal(replaced.props.remainingRequests, 3, 'the new case starts with its own local attempts');
});

test('a visitor reset during retrieval leaves the late model uninstalled', { timeout: 5000 }, async t => {
  const app = setup(t);
  await reveal(app);
  const request = prepare(app);
  const glb = bytes();
  const held = deferred<Response>();
  app.route(IMAGE, call => json(200, reference(call.body!.requestId)));
  app.route(MESH, call => json(200, meshReply(call.body!.requestId, call.body!.referenceId, meshRecord(glb))));
  app.route(GLB, () => held.promise);
  const install = t.mock.method(app.controller, 'installProp');
  const pending = run(app, request);
  await until(() => app.calls.length === 3);
  assert.equal(app.controller.reset(), true);
  const reset = app.controller.getState();
  held.resolve(glbResponse(glb));
  assert.deepEqual(await pending, { outcome: 'stopped', submitted: true });
  await settle();
  assert.equal(install.mock.callCount(), 0);
  assert.deepEqual(app.installs, []);
  assert.deepEqual(app.controller.getState(), reset);
  assert.equal(reset.displayed, null);
  assert.equal(reset.props.phase, 'idle');
});

test('advancePropRequest accepts only the exact current request, moves forward only, and failed retires it without a refund', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const controller = app.controller;
  const request = prepare(app);
  const before = controller.getState();
  for (const wrong of [before.props.request!, { ...request },
    { ...request, owner: { ...request.owner, generation: request.owner.generation + 1 } },
    { ...request, owner: { ...request.owner, unit: Symbol('foreign case') } }]) {
    assert.equal(controller.advancePropRequest(wrong, 'reference-image'), false);
    assert.deepEqual(controller.getState(), before);
  }
  for (const invalid of ['prepared', 'admitting', 'installing', 'installed', 'cancelled', 'stale', 'idle', 'rejected', 'unknown']) {
    assert.equal(controller.advancePropRequest(request, invalid as Stage), false);
  }
  assert.deepEqual(controller.getState(), before);
  assert.equal(controller.advancePropRequest(request, 'reference-image'), true);
  assert.equal(controller.getState().props.phase, 'reference-image');
  assert.equal(controller.advancePropRequest(request, 'reference-image'), false, 'a stage cannot repeat');
  assert.equal(controller.advancePropRequest(request, 'mesh'), true);
  assert.equal(controller.advancePropRequest(request, 'reference-image'), false, 'a stage cannot move backwards');
  assert.equal(controller.advancePropRequest(request, 'retrieving'), true);
  assert.equal(controller.advancePropRequest(request, 'mesh'), false);
  assert.equal(controller.getState().props.phase, 'retrieving');
  assert.equal(controller.isPropRequestCurrent(request), true);
  assert.deepEqual(app.phases.slice(-4), ['prepared', 'reference-image', 'mesh', 'retrieving'], 'each accepted stage notifies');
  assert.equal(controller.advancePropRequest(request, 'failed'), true);
  const failed = controller.getState();
  assert.equal(failed.props.phase, 'failed');
  assert.equal(failed.props.reason, 'generation_failed');
  assert.equal(failed.props.remainingRequests, 2);
  assert.equal(controller.isPropRequestCurrent(request), false);
  assert.equal(controller.advancePropRequest(request, 'failed'), false);
  assert.equal(controller.advancePropRequest(request, 'retrieving'), false);
  assert.equal(await controller.installProp(request, bytes(), app.installer, { caseColor: true }), false);
  assert.deepEqual(controller.getState(), failed);
  assert.deepEqual(caseState(failed), caseState(before));
  const stale = prepare(app, 'object-2');
  assert.ok(stale.owner.generation > request.owner.generation);
  assert.equal(controller.applyReconstructionEdit(unit, 0, 1, moved, app.install), true);
  assert.equal(controller.advancePropRequest(stale, 'reference-image'), false, 'a reconstruction-stale request cannot advance');
  const reset = prepare(app, 'object-3');
  assert.equal(controller.reset(), true);
  assert.equal(controller.advancePropRequest(reset, 'reference-image'), false, 'a reset request cannot advance');
  assert.deepEqual(app.calls, []);
});
