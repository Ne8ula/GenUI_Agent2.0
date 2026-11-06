import assert from 'node:assert/strict';
import test from 'node:test';
import { deflateSync } from 'node:zlib';
import * as roomPng from '../src/room/prop-png-admission.ts';
import * as serverPng from '../src/server/prop-reference-png.ts';
import { pngChunk, pngFile, pngFixture, pngHeader } from './fixtures/prop-reference-png.ts';

// Proposed limits contract. Namespace imports keep not-yet-exported constants a behavioural RED, not a link error.
// Authored local PNGs only; no provider image is used.
type Limits = Record<string, number>;
type Policy = (bytes: Uint8Array, signal: AbortSignal, limits?: unknown) => { width: number; height: number };
type ServerAdmission = (bytes: Uint8Array, signal: AbortSignal, limits?: unknown) => Promise<{ width: number; height: number }>;
const policy = roomPng.propPngPolicy as unknown as Policy;
const admit = serverPng.validatePropReferencePng as unknown as ServerAdmission;
const browserAdmit = roomPng.validatePropPng as unknown as ServerAdmission;
const defaultLimits = () => (roomPng as unknown as { PROP_PNG_LIMITS?: Limits }).PROP_PNG_LIMITS;
const referenceLimits = () => (serverPng as unknown as { REFERENCE_PNG_1024_LIMITS?: Limits }).REFERENCE_PNG_1024_LIMITS;
const signal = () => new AbortController().signal;

function rows(width: number, height: number, channels: 3 | 4, noise = false) {
  const rowSize = 1 + width * channels;
  const data = Buffer.alloc(rowSize * height);
  let state = 0x2545f491;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = y * rowSize + 1 + x * channels;
      if (noise) {
        for (let channel = 0; channel < channels; channel += 1) { state = (state * 1103515245 + 12345) >>> 0; data[offset + channel] = state >>> 24; }
      } else data.set(x < width / 2 ? [79, 102, 97] : [180, 138, 69], offset);
      if (channels === 4) data[offset + 3] = 255;
    }
  }
  return data;
}
function png(width: number, height: number, options: { channels?: 3 | 4; noise?: boolean; chunks?: number; extra?: Buffer[]; suffix?: Buffer;
  between?: Buffer; after?: Buffer[] } = {}) {
  const channels = options.channels ?? 3;
  const raw = rows(width, height, channels, options.noise);
  const compressed = deflateSync(options.suffix ? Buffer.concat([raw, options.suffix]) : raw);
  const parts = options.chunks ?? 1;
  const size = Math.ceil(compressed.length / parts);
  const idat: Buffer[] = Array.from({ length: parts }, (_, index) => pngChunk('IDAT', compressed.subarray(index * size, (index + 1) * size)));
  if (options.between) idat.splice(1, 0, options.between);
  return pngFile(pngHeader(width, height, { colorType: channels === 4 ? 6 : 2 }), ...(options.extra ?? []), ...idat,
    ...(options.after ?? []), pngChunk('IEND'));
}
function badCrc(chunk: Buffer) { const copy = Buffer.from(chunk); copy[copy.length - 1] ^= 0xff; return copy; }
type Reasoned = Error & { reason?: string };
function policyReason(bytes: Uint8Array, limits: unknown) {
  try { policy(bytes, signal(), limits); return 'accepted'; } catch (error) { return (error as Reasoned).reason ?? 'no reason'; }
}
function admitReason(bytes: Uint8Array, limits: unknown) {
  return admit(bytes, signal(), limits).then(() => 'accepted', (error: Reasoned) => error.reason ?? 'no reason');
}
let cached: Buffer | undefined;
const reference = () => cached ??= png(1024, 1024);

test('8O RED: server reference admission accepts an exact 1024 PNG only with the exported 1024 limits', async () => {
  assert.deepEqual(await admit(reference(), signal(), referenceLimits()), { width: 1024, height: 1024 });
});

test('both limit sets are exported frozen literals shared by the room policy and server admission', () => {
  assert.deepEqual(defaultLimits(), { maxBytes: 2 * 1024 * 1024, maxSide: 512, maxPixels: 262144, maxChunks: 256,
    maxRgbaBytes: 1024 * 1024, maxDecodedBytes: 1049088, ancillary: 'allowlist' });
  assert.deepEqual(referenceLimits(), { maxBytes: 6 * 1024 * 1024, maxSide: 1024, maxPixels: 1048576, maxChunks: 1024,
    maxRgbaBytes: 4 * 1024 * 1024, maxDecodedBytes: 4195328, ancillary: 'skip', maxAncillaryBytes: 2 * 1024 * 1024 });
  assert.equal(Object.isFrozen(defaultLimits()), true);
  assert.equal(Object.isFrozen(referenceLimits()), true);
  assert.equal((roomPng as unknown as { REFERENCE_PNG_1024_LIMITS?: Limits }).REFERENCE_PNG_1024_LIMITS, referenceLimits(),
    'one constant identity, defined beside the shared policy');
});

test('the default path is byte-identical for 8D and BFL: same results with no argument or the exported default', async () => {
  const corpus: [string, Buffer, boolean][] = [
    ['2x2 RGB', pngFixture(), true], ['512 RGB', pngFixture(512, 512), true], ['512 RGBA', pngFixture(512, 512, 4), true],
    // Chunk limits count every chunk, including IHDR and IEND.
    ['1024 RGB', reference(), false], ['513 wide', png(513, 1), false], ['257 chunks', png(16, 16, { chunks: 255 }), false],
    ['256 chunks', png(16, 16, { chunks: 254 }), true], ['oversize', Buffer.concat([pngFixture(), Buffer.alloc(2 * 1024 * 1024)]), false],
    ['text metadata', png(16, 16, { extra: [pngChunk('tEXt', Buffer.from('Software\0EVA'))] }), false],
    ['provenance metadata', png(16, 16, { extra: [pngChunk('caBX', Buffer.from('jumb'))] }), false],
  ];
  for (const [label, bytes, accepted] of corpus) {
    for (const limits of [undefined, defaultLimits()]) {
      const result = (() => { try { return policy(bytes, signal(), limits); } catch (error) { return error as Error; } })();
      assert.equal(!(result instanceof Error), accepted, `${label} policy`);
      if (result instanceof Error) {
        assert.equal(result.message, 'Reference image is not an admissible static PNG.', `${label} default error unchanged`);
        assert.equal((result as Reasoned).reason, undefined, `${label} default path adds no diagnostic`);
      }
      if (!(result instanceof Error)) assert.deepEqual({ width: result.width, height: result.height }, { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
      const server = await admit(bytes, signal(), limits).then(value => value, error => error as Error);
      assert.equal(!(server instanceof Error), accepted, `${label} server`);
    }
    const browser = await browserAdmit(bytes, signal()).then(value => value, error => error as Error);
    assert.equal(!(browser instanceof Error), accepted, `${label} browser`);
  }
});

test('browser admission cannot be widened and copied or caller-built limit objects are refused', async () => {
  const copies: unknown[] = [{ ...referenceLimits() }, structuredClone(referenceLimits()), Object.freeze({ ...referenceLimits() }),
    { ...referenceLimits(), maxSide: 4096 }, { maxSide: 1024 }, {}, null, 1024, 'REFERENCE_PNG_1024_LIMITS'];
  for (const limits of copies) {
    assert.throws(() => policy(reference(), signal(), limits), JSON.stringify(limits));
    await assert.rejects(admit(reference(), signal(), limits), JSON.stringify(limits));
    await assert.rejects(admit(pngFixture(512, 512), signal(), limits), 'an unknown limits value is not silently the default');
  }
  await assert.rejects(browserAdmit(reference(), signal(), referenceLimits()), 'the browser texture path takes no limits argument');
  await assert.rejects(admit(reference(), signal()), 'BFL default rejects 1024');
});

test('8L RED: the 1024 reference path skips a C2PA-style caBX provenance chunk', async () => {
  assert.deepEqual(await admit(png(1024, 16, { extra: [pngChunk('caBX', Buffer.from('jumb'))] }), signal(), referenceLimits()), { width: 1024, height: 16 });
});

test('the 1024 path skips any CRC-valid ancillary chunk before or after IDAT within the ancillary byte cap', async () => {
  const limits = referenceLimits();
  for (const [label, bytes] of [
    ['tEXt', png(1024, 16, { extra: [pngChunk('tEXt', Buffer.from('Software\0EVA'))] })],
    ['caBX', png(1024, 16, { extra: [pngChunk('caBX', Buffer.from('jumb'))] })],
    ['iCCP', png(1024, 16, { extra: [pngChunk('iCCP', Buffer.from('ICC\0\0profile'))] })],
    ['iTXt', png(1024, 16, { extra: [pngChunk('iTXt', Buffer.from('Comment\0\0\0\0\0EVA'))] })],
    ['eXIf', png(1024, 16, { extra: [pngChunk('eXIf', Buffer.from('MM\0*'))] })],
    ['unknown ancillary after IDAT', png(1024, 16, { after: [pngChunk('vpAg', Buffer.alloc(9)), pngChunk('zzzz', Buffer.from('x'))] })],
    ['metadata on both sides', png(1024, 16, { extra: [pngChunk('caBX', Buffer.from('jumb'))], after: [pngChunk('tEXt', Buffer.from('a\0b'))] })],
    ['exactly 2 MiB ancillary', png(1024, 16, { extra: [pngChunk('tEXt', Buffer.alloc(1024 * 1024)), pngChunk('zTXt', Buffer.alloc(1024 * 1024))] })],
  ] as const) {
    assert.equal(policyReason(bytes, limits), 'accepted', `${label} policy`);
    assert.deepEqual(await admit(bytes, signal(), limits), { width: 1024, height: 16 }, label);
  }
});

test('1024 limits still bound sides, chunks, bytes, animation, critical chunks, order and decoded output with fixed reasons', async () => {
  const limits = referenceLimits();
  const text = () => pngChunk('tEXt', Buffer.from('Software\0EVA'));
  const wrongSignature = Buffer.from(png(16, 16));
  wrongSignature[1] ^= 0xff;
  for (const [label, bytes, reason] of [
    ['1040 wide', png(1040, 16), 'dimensions'], ['1025 chunks', png(64, 64, { chunks: 1023 }), 'chunk_limit'],
    ['over 6 MiB', Buffer.concat([reference(), Buffer.alloc(6 * 1024 * 1024)]), 'size'],
    ['ancillary over 2 MiB', png(1024, 16, { extra: [pngChunk('tEXt', Buffer.alloc(2 * 1024 * 1024 + 1))] }), 'size'],
    ['bad signature', wrongSignature, 'signature'],
    ['bad ancillary CRC', png(1024, 16, { extra: [badCrc(text())] }), 'crc'],
    ['acTL', png(1024, 16, { extra: [pngChunk('acTL', Buffer.alloc(8))] }), 'animation'],
    ['fcTL', png(1024, 16, { extra: [pngChunk('fcTL', Buffer.alloc(26))] }), 'animation'],
    ['fdAT', png(1024, 16, { after: [pngChunk('fdAT', Buffer.alloc(8))] }), 'animation'],
    ['unknown critical', png(1024, 16, { extra: [pngChunk('QQQQ', Buffer.from('x'))] }), 'critical_chunk'],
    ['PLTE', png(1024, 16, { extra: [pngChunk('PLTE', Buffer.alloc(3))] }), 'critical_chunk'],
    ['split IDAT', png(1024, 16, { chunks: 2, between: text() }), 'order'],
    ['duplicate IHDR', png(1024, 16, { extra: [pngHeader(1024, 16)] }), 'order'],
    ['after IEND', Buffer.concat([png(1024, 16), text()]), 'order'],
    ['truncated', reference().subarray(0, reference().length - 13), 'order'],
    ['interlaced', pngFile(pngHeader(16, 16, { interlace: 1 }), pngChunk('IDAT', deflateSync(rows(16, 16, 3))), pngChunk('IEND')), 'header'],
    ['palette', pngFile(pngHeader(16, 16, { colorType: 3 }), pngChunk('IDAT', deflateSync(rows(16, 16, 3))), pngChunk('IEND')), 'color_format'],
    ['16-bit', pngFile(pngHeader(16, 16, { bitDepth: 16 }), pngChunk('IDAT', deflateSync(rows(16, 16, 3))), pngChunk('IEND')), 'color_format'],
  ] as const) {
    assert.equal(policyReason(bytes, limits), reason, `${label} policy`);
    assert.equal(await admitReason(bytes, limits), reason, `${label} server`);
  }
  // Only the inflater can see these; the byte policy accepts their structure.
  for (const [label, bytes] of [['decoded suffix', png(1024, 16, { suffix: Buffer.alloc(1) })],
    ['corrupt zlib', pngFile(pngHeader(1024, 16), pngChunk('IDAT', Buffer.from('not a zlib stream at all')), pngChunk('IEND'))]] as const) {
    assert.equal(await admitReason(bytes, limits), 'decode', label);
  }
  assert.deepEqual(await admit(png(64, 64, { chunks: 1022 }), signal(), limits), { width: 64, height: 64 }, '1024 chunks in total');
  assert.deepEqual(await admit(png(1024, 1024, { channels: 4, noise: true }), signal(), limits), { width: 1024, height: 1024 },
    'a poorly compressible full-size RGBA reference fits the decoded bound');
  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(admit(reference(), aborted.signal, limits), error => error === aborted.signal.reason);
});
