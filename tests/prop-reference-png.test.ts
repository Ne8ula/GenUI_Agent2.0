import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { syncBuiltinESMExports } from 'node:module';
import zlib, { deflateSync, type Inflate } from 'node:zlib';
import { pngChunk, pngFile, pngFixture, pngHeader, pngScanlines, pngSignature } from './fixtures/prop-reference-png.ts';

const parserPath = '../src/server/prop-reference-png.ts';
type Validator = (bytes: Uint8Array, signal: AbortSignal) => Promise<{ width: number; height: number }>;
async function validator(): Promise<Validator> {
  return (await import(parserPath)).validatePropReferencePng;
}
const signal = () => new AbortController().signal;
function encodedRows(rows: Uint8Array, width = 2, height = 2) {
  return pngFile(pngHeader(width, height), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND'));
}
function watchInflate(t: TestContext, onData?: () => void) {
  const streams: Inflate[] = [];
  let outputBytes = 0;
  const create = zlib.createInflate;
  t.mock.method(zlib, 'createInflate', (...args: Parameters<typeof create>) => {
    const stream = create(...args);
    streams.push(stream);
    stream.on('data', chunk => { outputBytes += chunk.byteLength; onData?.(); });
    return stream;
  });
  syncBuiltinESMExports();
  t.after(() => {
    streams.forEach(stream => stream.destroy());
    t.mock.restoreAll();
    syncBuiltinESMExports();
  });
  return { streams, get outputBytes() { return outputBytes; } };
}
async function closed(streams: Inflate[]) {
  await Promise.all(streams.map(stream => stream.closed ? Promise.resolve()
    : new Promise<void>(resolve => stream.once('close', resolve))));
  for (const stream of streams) assert.equal(stream.destroyed, true, 'temporary decoder must be released');
}

// All pixels and compressed streams here are locally authored, never provider output.
test('strict PNG admission decodes actual bounded RGB and RGBA content, including every legal row filter', { timeout: 3000 }, async t => {
  const validate = await validator();
  const observed = watchInflate(t);
  for (const [width, height, channels] of [[1, 1, 3], [2, 2, 4], [512, 512, 3], [512, 512, 4]] as const) {
    const bytes = pngFixture(width, height, channels);
    assert.ok(bytes.byteLength < 16 * 1024, 'large dimensions use a tiny encoded authored fixture');
    const before = Buffer.from(bytes);
    assert.deepEqual(await validate(bytes, signal()), { width, height });
    assert.deepEqual(bytes, before);
  }
  const rows = pngScanlines(2, 5);
  for (let row = 0; row < 5; row += 1) rows[row * 7] = row;
  assert.deepEqual(await validate(encodedRows(rows, 2, 5), signal()), { width: 2, height: 5 });
  assert.equal(observed.streams.length, 5, 'metadata-only acceptance is not image validation');
  await closed(observed.streams);
});

test('PNG dimensions and unsupported bit depths, color types, compression and interlace reject before inflate allocation', async t => {
  const validate = await validator();
  const observed = watchInflate(t);
  const image = pngChunk('IDAT', deflateSync(pngScanlines()));
  for (const [width, height] of [[0, 2], [2, 0], [513, 2], [2, 513], [0xffffffff, 0xffffffff]]) {
    await assert.rejects(validate(pngFile(pngHeader(width, height), image, pngChunk('IEND')), signal()));
  }
  for (const options of [{ bitDepth: 1 }, { bitDepth: 16 }, { colorType: 0 }, { colorType: 3 }, { colorType: 4 },
    { colorType: 7 }, { compression: 1 }, { filter: 1 }, { interlace: 1 }]) {
    await assert.rejects(validate(pngFile(pngHeader(2, 2, options), image, pngChunk('IEND')), signal()));
  }
  assert.equal(observed.streams.length, 0);
});

test('PNG signature, CRCs, declared chunk bounds, order and final byte are checked before decoding', async t => {
  const validate = await validator();
  const observed = watchInflate(t);
  const valid = pngFixture();
  const badCrc = Buffer.from(valid);
  badCrc[badCrc.length - 1] ^= 1;
  const badSignature = Buffer.from(valid);
  badSignature[0] = 0;
  const hugeChunk = Buffer.alloc(12);
  hugeChunk.writeUInt32BE(0xffffffff, 0);
  hugeChunk.write('IDAT', 4);
  const image = pngChunk('IDAT', deflateSync(pngScanlines()));
  const invalid = [new Uint8Array(), pngSignature, badSignature, badCrc,
    valid.subarray(0, valid.length - 1), Buffer.concat([valid, Buffer.from([0])]),
    pngFile(image, pngHeader(), pngChunk('IEND')),
    pngFile(pngHeader(), pngHeader(), image, pngChunk('IEND')),
    pngFile(pngHeader(), image), pngFile(pngHeader(), pngChunk('IEND')),
    pngFile(pngHeader(), image, pngChunk('IEND', Buffer.from([0]))),
    pngFile(pngHeader(), image, pngChunk('IEND'), pngChunk('IEND')),
    pngFile(pngChunk('IHDR', Buffer.alloc(12)), image, pngChunk('IEND')),
    pngFile(pngHeader(), hugeChunk),
  ];
  for (const bytes of invalid) await assert.rejects(validate(bytes, signal()));
  assert.equal(observed.streams.length, 0);
});

test('contiguous split IDAT and bounded benign metadata work, while duplicate or misplaced metadata does not', async () => {
  const validate = await validator();
  const compressed = deflateSync(pngScanlines());
  const first = pngChunk('IDAT', compressed.subarray(0, 4));
  const second = pngChunk('IDAT', compressed.subarray(4));
  const gamma = Buffer.alloc(4);
  gamma.writeUInt32BE(45455);
  const physical = Buffer.alloc(9);
  physical.writeUInt32BE(3780, 0);
  physical.writeUInt32BE(3780, 4);
  physical[8] = 1;
  const metadata = [pngChunk('sRGB', Buffer.from([0])), pngChunk('gAMA', gamma), pngChunk('pHYs', physical)];
  assert.deepEqual(await validate(pngFile(pngHeader(), ...metadata, first, second, pngChunk('IEND')), signal()), { width: 2, height: 2 });
  for (const chunk of metadata) {
    await assert.rejects(validate(pngFile(pngHeader(), chunk, chunk, first, second, pngChunk('IEND')), signal()));
    await assert.rejects(validate(pngFile(pngHeader(), first, chunk, second, pngChunk('IEND')), signal()));
  }
  for (const chunk of [pngChunk('sRGB', Buffer.from([4])), pngChunk('sRGB', Buffer.alloc(2)),
    pngChunk('gAMA', Buffer.alloc(4)), pngChunk('gAMA', Buffer.alloc(5)),
    pngChunk('pHYs', Buffer.alloc(8)), pngChunk('pHYs', Buffer.from([...physical.subarray(0, 8), 2]))]) {
    await assert.rejects(validate(pngFile(pngHeader(), chunk, first, second, pngChunk('IEND')), signal()));
  }
});

test('animation, palettes, executable-looking metadata and unknown chunks never reach a decoder', async t => {
  const validate = await validator();
  const observed = watchInflate(t);
  const image = pngChunk('IDAT', deflateSync(pngScanlines()));
  for (const type of ['acTL', 'fcTL', 'fdAT', 'PLTE', 'tRNS', 'iCCP', 'zTXt', 'iTXt', 'tEXt', 'eXIf', 'ABCD', 'abCD']) {
    await assert.rejects(validate(pngFile(pngHeader(), pngChunk(type, Buffer.from('https://invalid.example/<script>')), image, pngChunk('IEND')), signal()));
  }
  assert.equal(observed.streams.length, 0);
});

test('actual zlib termination, checksum, decoded length, filters and complete compressed input are required', { timeout: 3000 }, async t => {
  const validate = await validator();
  const observed = watchInflate(t);
  const rows = pngScanlines();
  const compressed = deflateSync(rows);
  const checksum = Buffer.from(compressed);
  checksum[checksum.length - 1] ^= 1;
  const badFilter = Buffer.from(rows);
  badFilter[7] = 5;
  const streams = [new Uint8Array(), compressed.subarray(0, compressed.length - 1), checksum,
    Buffer.concat([compressed, Buffer.from('trailing compressed garbage')]),
    Buffer.concat([compressed, deflateSync(rows)]),
    deflateSync(rows.subarray(0, rows.length - 1)), deflateSync(Buffer.concat([rows, Buffer.from([0])])), deflateSync(badFilter)];
  for (const data of streams) {
    await assert.rejects(validate(pngFile(pngHeader(), pngChunk('IDAT', data), pngChunk('IEND')), signal()));
  }
  assert.ok(observed.streams.length > 0);
  await closed(observed.streams);
});

test('encoded size and chunk-count ceilings reject small-header adversarial inputs before inflate', async t => {
  const validate = await validator();
  const observed = watchInflate(t);
  await assert.rejects(validate(Buffer.alloc(2 * 1024 * 1024 + 1), signal()));
  const chunks = Array.from({ length: 257 }, () => pngChunk('IDAT'));
  await assert.rejects(validate(pngFile(pngHeader(), ...chunks,
    pngChunk('IDAT', deflateSync(pngScanlines())), pngChunk('IEND')), signal()));
  assert.equal(observed.streams.length, 0);
});

test('a tiny claimed image cannot inflate a larger payload before the output budget stops and releases the decoder', { timeout: 3000 }, async t => {
  const validate = await validator();
  const observed = watchInflate(t);
  const bytes = pngFile(pngHeader(), pngChunk('IDAT', deflateSync(Buffer.alloc(128 * 1024))), pngChunk('IEND'));
  assert.ok(bytes.byteLength < 1024);
  await assert.rejects(validate(bytes, signal()));
  assert.equal(observed.streams.length, 1);
  assert.ok(observed.outputBytes <= 64 * 1024, 'do not buffer the full oversized decoded payload');
  await closed(observed.streams);
});

test('PNG admission honors pre-abort without allocation and abort during actual inflate without returning an image', { timeout: 3000 }, async t => {
  const validate = await validator();
  const controller = new AbortController();
  const observed = watchInflate(t, () => controller.abort());
  const stopped = new AbortController();
  stopped.abort();
  await assert.rejects(validate(pngFixture(), stopped.signal), error => error === stopped.signal.reason);
  assert.equal(observed.streams.length, 0);
  await assert.rejects(validate(pngFixture(512, 512), controller.signal), error => error === controller.signal.reason);
  assert.equal(observed.streams.length, 1);
  await closed(observed.streams);
});

test('PNG validation uses the supplied byte view rather than unrelated prefix or suffix bytes in its buffer', async () => {
  const validate = await validator();
  const image = pngFixture();
  const carrier = Buffer.concat([Buffer.from('prefix'), image, Buffer.from('suffix')]);
  const view = carrier.subarray(6, 6 + image.byteLength);
  assert.deepEqual(await validate(view, signal()), { width: 2, height: 2 });
  assert.equal(carrier.subarray(0, 6).toString(), 'prefix');
  assert.equal(carrier.subarray(-6).toString(), 'suffix');
});
