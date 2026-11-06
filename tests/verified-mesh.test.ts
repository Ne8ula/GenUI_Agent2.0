import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedMesh } from '../src/room/verified-mesh.ts';
import { chairFixture, glbFile, meshRecord } from './fixtures/prop-glb.ts';

const record = { bytes: 3, sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' };
const signal = () => new AbortController().signal;
test('verified mesh returns exact bytes and progress only after bounded transfer and real GLB admission', async t => {
  const { bytes } = chairFixture();
  const progress: number[] = [];
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    fetches += 1;
    assert.equal(init.redirect, 'error');
    assert.equal(init.credentials, 'omit');
    assert.equal(init.cache, 'no-store');
    assert.ok(init.signal instanceof AbortSignal);
    return new Response(new Uint8Array(bytes), { headers: { 'content-type': 'model/gltf-binary' } });
  });
  const result = await verifiedMesh('https://invalid.example/authored-chair.glb', meshRecord(bytes), signal(), value => progress.push(value));
  assert.deepEqual(new Uint8Array(result), new Uint8Array(bytes));
  assert.equal(progress.at(-1), 1);
  assert.ok(progress.every((value, index) => value > 0 && value <= 1 && (!index || value >= progress[index - 1])));
  assert.equal(fetches, 1);
});
test('8D RED: matching length and hash cannot admit non-GLB content', async () => {
  await assert.rejects(verifiedMesh('data:application/octet-stream,abc', record, signal(), () => {}), /GLB/i);
});
test('verified mesh rejects oversized, truncated and corrupted bytes', async () => {
  await assert.rejects(verifiedMesh('data:,abcd', record, signal(), () => {}), /exceeded/);
  await assert.rejects(verifiedMesh('data:,ab', record, signal(), () => {}), /incomplete/);
  await assert.rejects(verifiedMesh('data:,abd', record, signal(), () => {}), /integrity/);
});
test('verified mesh rejects cancellation and unbounded allocation records', async () => {
  const abort = new AbortController(); abort.abort();
  await assert.rejects(verifiedMesh('data:,abc', record, abort.signal, () => {}), { name: 'AbortError' });
  for (const bytes of [-1, 0, 1.5, 64 * 1024 * 1024 + 1, Infinity]) {
    await assert.rejects(verifiedMesh('data:,abc', { ...record, bytes }, signal(), () => {}), /limit/);
  }
});

const turn = () => new Promise<void>(resolve => setImmediate(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
test('8D resource and integrity records reject before download or allocation', async t => {
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', async () => { fetches += 1; throw new Error('Must reject before transport.'); });
  for (const input of [{ ...record, bytes: 8 * 1024 * 1024 + 1 }, { ...record, bytes: NaN },
    { ...record, bytes: Number.MAX_SAFE_INTEGER }, { ...record, sha256: '' }, { ...record, sha256: 'g'.repeat(64) },
    { ...record, sha256: 'a'.repeat(63) }, { ...record, sha256: 'a'.repeat(65) }]) {
    await assert.rejects(verifiedMesh('https://invalid.example/mesh.glb', input, signal(), () => {}));
  }
  assert.equal(fetches, 0);
});

test('hash-correct external-resource GLB is rejected without following its embedded URI', async t => {
  const fixture = chairFixture();
  fixture.json.images[0] = { uri: 'https://invalid.example/secret.png' };
  const bytes = glbFile(fixture.json, fixture.bin);
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => { calls.push(url); return new Response(new Uint8Array(bytes)); });
  await assert.rejects(verifiedMesh('https://invalid.example/mesh.glb', meshRecord(bytes), signal(), () => {}));
  assert.deepEqual(calls, ['https://invalid.example/mesh.glb']);
});

test('oversized reads cancel the reader and release its lock without reporting bytes beyond the record', async t => {
  const progress: number[] = [];
  let cancellations = 0;
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array([1, 2, 3, 4])); }, cancel() { cancellations += 1; },
  });
  t.mock.method(globalThis, 'fetch', async () => new Response(body));
  await assert.rejects(verifiedMesh('https://invalid.example/mesh.glb', record, signal(), value => progress.push(value)), /exceeded/i);
  assert.equal(cancellations, 1);
  assert.equal(body.locked, false);
  assert.equal(progress.length, 0);
});

test('abort while a mesh reader is pending cancels and releases it without later progress', async t => {
  const reading = deferred<void>();
  const abort = new AbortController();
  let cancellations = 0;
  const progress: number[] = [];
  const body = new ReadableStream<Uint8Array>({ pull() { reading.resolve(); }, cancel() { cancellations += 1; } }, { highWaterMark: 0 });
  t.mock.method(globalThis, 'fetch', async () => new Response(body));
  const loading = verifiedMesh('https://invalid.example/mesh.glb', record, abort.signal, value => progress.push(value));
  const rejected = assert.rejects(loading, error => error === abort.signal.reason);
  await reading.promise;
  abort.abort();
  await rejected;
  await turn();
  assert.equal(cancellations, 1);
  assert.equal(body.locked, false);
  assert.deepEqual(progress, []);
});

test('stopping from transfer progress prevents content admission and releases the remaining body', async t => {
  const fixture = chairFixture();
  const abort = new AbortController();
  let cancellations = 0;
  let decoderConstructions = 0;
  const PlatformStream = globalThis.DecompressionStream;
  t.mock.method(globalThis, 'DecompressionStream', class extends PlatformStream {
    constructor(format: CompressionFormat) { super(format); decoderConstructions += 1; }
  });
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(fixture.bytes, 0, 64)); }, cancel() { cancellations += 1; },
  });
  t.mock.method(globalThis, 'fetch', async () => new Response(body));
  await assert.rejects(verifiedMesh('https://invalid.example/mesh.glb', meshRecord(fixture.bytes), abort.signal, () => abort.abort()),
    error => error === abort.signal.reason);
  assert.equal(cancellations, 1);
  assert.equal(body.locked, false);
  assert.equal(decoderConstructions, 0);
});

test('ignored-abort fetch resolves late only to body cancellation, never progress or admission', async t => {
  const pending = deferred<Response>();
  const started = deferred<void>();
  const abort = new AbortController();
  let fetches = 0;
  let cancellations = 0;
  let passedSignal: AbortSignal | undefined;
  const progress: number[] = [];
  t.mock.method(globalThis, 'fetch', (_url: unknown, init: RequestInit) => {
    fetches += 1; passedSignal = init.signal!; started.resolve(); return pending.promise;
  });
  const loading = verifiedMesh('https://invalid.example/mesh.glb', record, abort.signal, value => progress.push(value));
  const rejected = assert.rejects(loading, error => error === abort.signal.reason);
  await started.promise;
  abort.abort();
  await rejected;
  assert.equal(passedSignal!.aborted, true);
  assert.equal(cancellations, 0, 'unsettled transport has no response body to release yet');
  pending.resolve(new Response(new ReadableStream({ cancel() { cancellations += 1; } })));
  await turn();
  assert.equal(cancellations, 1);
  assert.equal(fetches, 1);
  assert.deepEqual(progress, []);
});

test('late ignored-abort fetch rejection is contained and never retried', async t => {
  const pending = deferred<Response>();
  const started = deferred<void>();
  const abort = new AbortController();
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', () => { fetches += 1; started.resolve(); return pending.promise; });
  const loading = verifiedMesh('https://invalid.example/mesh.glb', record, abort.signal, () => assert.fail('No bytes arrived.'));
  const rejected = assert.rejects(loading, error => error === abort.signal.reason);
  await started.promise;
  abort.abort();
  await rejected;
  pending.reject(new Error('late synthetic network failure'));
  await turn();
  assert.equal(fetches, 1);
});

test('a fifteen-second mesh transfer deadline stops the waiter and cancels a late response without retry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const started = deferred<void>();
  const pending = deferred<Response>();
  let cancellations = 0;
  let transportSignal: AbortSignal | undefined;
  t.mock.method(globalThis, 'fetch', (_url: unknown, init: RequestInit) => { transportSignal = init.signal!; started.resolve(); return pending.promise; });
  const loading = verifiedMesh('https://invalid.example/mesh.glb', record, signal(), () => assert.fail('No bytes arrived.'));
  const rejected = assert.rejects(loading, /deadline|timed out|timeout/i);
  await started.promise;
  t.mock.timers.tick(15000);
  await rejected;
  assert.equal(transportSignal!.aborted, true);
  pending.resolve(new Response(new ReadableStream({ cancel() { cancellations += 1; } })));
  await turn();
  assert.equal(cancellations, 1);
});

test('reader cancellation can remain pending without a false physical-cleanup claim or a hung local abort', async t => {
  const reading = deferred<void>();
  const cancelled = deferred<void>();
  const abort = new AbortController();
  let cancellations = 0;
  let physicallyReleased = false;
  const body = new ReadableStream<Uint8Array>({ pull() { reading.resolve(); },
    cancel() { cancellations += 1; return cancelled.promise.then(() => { physicallyReleased = true; }); },
  }, { highWaterMark: 0 });
  t.mock.method(globalThis, 'fetch', async () => new Response(body));
  const loading = verifiedMesh('https://invalid.example/mesh.glb', record, abort.signal, () => {});
  const rejected = assert.rejects(loading, error => error === abort.signal.reason);
  await reading.promise;
  abort.abort();
  await rejected;
  assert.equal(cancellations, 1);
  assert.equal(physicallyReleased, false);
  assert.equal(body.locked, false);
  cancelled.resolve();
  await turn();
  assert.equal(physicallyReleased, true);
});

