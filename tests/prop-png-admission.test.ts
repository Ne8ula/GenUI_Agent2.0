import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import zlib, { deflateSync, type Inflate } from 'node:zlib';
import { syncBuiltinESMExports } from 'node:module';
import { pngChunk, pngFile, pngFixture, pngHeader, pngScanlines } from './fixtures/prop-reference-png.ts';

const modulePath = '../src/room/prop-png-admission.ts';
type Validate = (bytes: Uint8Array, signal: AbortSignal) => Promise<{ width: number; height: number }>;
async function validator(): Promise<Validate> { return (await import(modulePath)).validatePropPng; }
const signal = () => new AbortController().signal;
function nativeInflation(t: TestContext, onPush?: () => void) {
  const create = zlib.createInflate;
  const streams: { stream: Inflate; closed: Promise<void>; emitted: number; written: number; maxWrite: number; peakReadable: number; peakWritable: number }[] = [];
  t.mock.method(zlib, 'createInflate', (...args: Parameters<typeof create>) => {
    const stream = create(...args);
    const entry = { stream, closed: new Promise<void>(resolve => stream.once('close', resolve)),
      emitted: 0, written: 0, maxWrite: 0, peakReadable: 0, peakWritable: 0 };
    streams.push(entry);
    const write = stream.write;
    stream.write = function (this: Inflate, ...values: unknown[]) {
      const bytes = (values[0] as Uint8Array).byteLength;
      entry.written += bytes;
      entry.maxWrite = Math.max(entry.maxWrite, bytes);
      const result = Reflect.apply(write, this, values);
      entry.peakWritable = Math.max(entry.peakWritable, this.writableLength);
      return result;
    };
    const push = stream.push;
    stream.push = function (this: Inflate, value: Buffer | null, ...values: unknown[]) {
      if (value) entry.emitted += value.length;
      const result = Reflect.apply(push, this, [value, ...values]);
      entry.peakReadable = Math.max(entry.peakReadable, this.readableLength);
      if (value) onPush?.();
      return result;
    };
    return stream;
  });
  syncBuiltinESMExports();
  t.after(() => { streams.forEach(({ stream }) => stream.destroy()); t.mock.restoreAll(); syncBuiltinESMExports(); });
  return streams;
}
async function physicallyClosed(streams: ReturnType<typeof nativeInflation>) {
  await Promise.all(streams.map(entry => entry.closed));
  for (const { stream } of streams) {
    assert.equal(stream.destroyed, true);
    assert.equal(stream.closed, true);
  }
}
function encoded(rows: Uint8Array, width = 2, height = 2) {
  return pngFile(pngHeader(width, height), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND'));
}

test('portable PNG admission uses real platform decoding for bounded RGB RGBA and every supported filter', { timeout: 5000 }, async t => {
  const validate = await validator();
  const native = nativeInflation(t);
  let constructions = 0;
  const PlatformStream = globalThis.DecompressionStream;
  t.mock.method(globalThis, 'DecompressionStream', class extends PlatformStream {
    constructor(format: CompressionFormat) { super(format); constructions += 1; assert.equal(format, 'deflate'); }
  });
  for (const [width, height, channels] of [[1, 1, 3], [2, 2, 4], [512, 512, 3], [512, 512, 4]] as const) {
    const bytes = pngFixture(width, height, channels);
    const before = Buffer.from(bytes);
    assert.deepEqual(await validate(bytes, signal()), { width, height });
    assert.deepEqual(bytes, before);
  }
  const rows = pngScanlines(2, 5);
  for (let row = 0; row < 5; row += 1) rows[row * 7] = row;
  assert.deepEqual(await validate(encoded(rows, 2, 5), signal()), { width: 2, height: 5 });
  assert.equal(constructions, 5, 'exercise the production DecompressionStream path, not a Node-only substitute');
  assert.equal(native.length, 5, 'observe real native decoders under the platform stream');
  await physicallyClosed(native);
});

test('PNG structural resource and format failures allocate no platform or native decoder', async t => {
  const validate = await validator();
  const native = nativeInflation(t);
  const valid = pngFixture();
  const badCrc = Buffer.from(valid); badCrc[badCrc.length - 1] ^= 1;
  const data = pngChunk('IDAT', deflateSync(pngScanlines()));
  const invalid = [new Uint8Array(), Buffer.alloc(2 * 1024 * 1024 + 1), badCrc,
    valid.subarray(0, -1), Buffer.concat([valid, Buffer.from([0])]),
    ...[[0, 2], [513, 2], [2, 513], [0xffffffff, 0xffffffff]].map(([width, height]) => pngFile(pngHeader(width, height), data, pngChunk('IEND'))),
    ...[{ bitDepth: 16 }, { colorType: 3 }, { colorType: 0 }, { compression: 1 }, { filter: 1 }, { interlace: 1 }]
      .map(options => pngFile(pngHeader(2, 2, options), data, pngChunk('IEND'))),
    ...['acTL', 'fcTL', 'fdAT', 'PLTE', 'tRNS', 'iCCP', 'zTXt', 'iTXt', 'tEXt', 'eXIf', 'ABCD']
      .map(type => pngFile(pngHeader(), pngChunk(type, Buffer.from('https://invalid.example/')), data, pngChunk('IEND'))),
    pngFile(data, pngHeader(), pngChunk('IEND')),
    pngFile(pngHeader(), pngHeader(), data, pngChunk('IEND')),
    pngFile(pngHeader(), data), pngFile(pngHeader(), pngChunk('IEND')),
    pngFile(pngHeader(), data, pngChunk('IEND', new Uint8Array([0]))),
  ];
  for (const bytes of invalid) await assert.rejects(validate(bytes, signal()));
  assert.equal(native.length, 0);
});

test('portable PNG checks actual checksum termination exact output filters and complete compressed input', { timeout: 5000 }, async t => {
  const validate = await validator();
  const native = nativeInflation(t);
  const rows = pngScanlines();
  const compressed = deflateSync(rows);
  const checksum = Buffer.from(compressed); checksum[checksum.length - 1] ^= 1;
  const badFilter = Buffer.from(rows); badFilter[7] = 5;
  for (const data of [new Uint8Array(), checksum, compressed.subarray(0, -1),
    Buffer.concat([compressed, Buffer.from([0])]), Buffer.concat([compressed, Buffer.from([99, 111])]),
    Buffer.concat([compressed, compressed]), deflateSync(rows.subarray(0, -1)),
    deflateSync(Buffer.concat([rows, Buffer.from([0])])), deflateSync(badFilter)]) {
    await assert.rejects(validate(pngFile(pngHeader(), pngChunk('IDAT', data), pngChunk('IEND')), signal()));
  }
  assert.ok(native.length > 0);
  await physicallyClosed(native);
});

test('bounded benign metadata and split IDAT work at the chunk ceiling without accepting misplaced or duplicated chunks', async () => {
  const validate = await validator();
  const data = deflateSync(pngScanlines());
  const gamma = Buffer.alloc(4); gamma.writeUInt32BE(45455);
  const physical = Buffer.alloc(9); physical.writeUInt32BE(3780, 0); physical.writeUInt32BE(3780, 4); physical[8] = 1;
  const metadata = [pngChunk('sRGB', Buffer.from([0])), pngChunk('gAMA', gamma), pngChunk('pHYs', physical)];
  assert.deepEqual(await validate(pngFile(pngHeader(), ...metadata, pngChunk('IDAT', data.subarray(0, 4)),
    pngChunk('IDAT', data.subarray(4)), pngChunk('IEND')), signal()), { width: 2, height: 2 });
  for (const chunk of metadata) {
    await assert.rejects(validate(pngFile(pngHeader(), chunk, chunk, pngChunk('IDAT', data), pngChunk('IEND')), signal()));
    await assert.rejects(validate(pngFile(pngHeader(), pngChunk('IDAT', data.subarray(0, 4)), chunk,
      pngChunk('IDAT', data.subarray(4)), pngChunk('IEND')), signal()));
  }
  const empty = Array.from({ length: 253 }, () => pngChunk('IDAT'));
  assert.deepEqual(await validate(pngFile(pngHeader(), ...empty, pngChunk('IDAT', data), pngChunk('IEND')), signal()), { width: 2, height: 2 });
  await assert.rejects(validate(pngFile(pngHeader(), ...empty, pngChunk('IDAT'), pngChunk('IDAT', data), pngChunk('IEND')), signal()));
});

test('portable PNG bounds real native expansion and queues, not accepted-write counts', { timeout: 10000 }, async t => {
  const validate = await validator();
  const native = nativeInflation(t);
  for (const rawSize of [4 * 1024 * 1024, 32 * 1024 * 1024]) {
    const compressed = deflateSync(Buffer.alloc(rawSize));
    assert.ok(compressed.length < 64 * 1024, 'only a tiny compressed payload reaches the decoder');
    await assert.rejects(validate(pngFile(pngHeader(), pngChunk('IDAT', compressed), pngChunk('IEND')), signal()));
  }
  assert.equal(native.length, 2);
  await physicallyClosed(native);
  for (const entry of native) {
    assert.ok(entry.emitted > 0 && entry.emitted <= 128 * 1024, 'measure native output, not only bytes delivered to JS');
    assert.ok(entry.stream.bytesWritten > 0 && entry.stream.bytesWritten <= 128, 'native consumed input stops early');
    assert.ok(entry.maxWrite <= 64, 'bounded submitted chunks');
    assert.ok(entry.peakReadable <= entry.stream.readableHighWaterMark + 16 * 1024);
    assert.ok(entry.peakWritable <= entry.stream.writableHighWaterMark + 64);
    assert.ok(entry.written >= entry.stream.bytesWritten, 'queued input is not equivalent to expanded input');
  }
});

test('pre-abort avoids allocation and abort during native inflation physically closes its decoder', { timeout: 5000 }, async t => {
  const validate = await validator();
  const stopped = new AbortController(); stopped.abort();
  const during = new AbortController();
  const native = nativeInflation(t, () => during.abort());
  await assert.rejects(validate(pngFixture(), stopped.signal), error => error === stopped.signal.reason);
  assert.equal(native.length, 0);
  await assert.rejects(validate(pngFixture(512, 512, 4), during.signal), error => error === during.signal.reason);
  assert.equal(native.length, 1);
  await physicallyClosed(native);
  assert.ok(native[0].emitted <= 128 * 1024);
  assert.ok(native[0].peakWritable <= native[0].stream.writableHighWaterMark + 64);
});

test('repeated full-size poorly compressible PNG validation releases every native decoder and respects byte views', { timeout: 10000 }, async t => {
  const validate = await validator();
  const native = nativeInflation(t);
  const rows = pngScanlines(512, 512, 4);
  let random = 17;
  for (let index = 0; index < rows.length; index += 1) {
    if (index % 2049 === 0) continue;
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    rows[index] = random >>> 24;
  }
  const bytes = pngFile(pngHeader(512, 512, { colorType: 6 }), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND'));
  assert.ok(bytes.length > 512 * 1024 && bytes.length <= 2 * 1024 * 1024);
  const carrier = Buffer.concat([Buffer.from('prefix'), bytes, Buffer.from('suffix')]);
  for (let index = 0; index < 3; index += 1) {
    assert.deepEqual(await validate(carrier.subarray(6, 6 + bytes.length), signal()), { width: 512, height: 512 });
    await physicallyClosed(native);
  }
  assert.equal(native.length, 3);
  assert.equal(carrier.subarray(0, 6).toString(), 'prefix');
  assert.equal(carrier.subarray(-6).toString(), 'suffix');
});
