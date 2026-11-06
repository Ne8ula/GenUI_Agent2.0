const signature = [137, 80, 78, 71, 13, 10, 26, 10];
const invalid = () => new Error('Reference image is not an admissible static PNG.');
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

// Texture/BFL default and the server-only 1024 reference bound; matched by identity so callers cannot widen them.
// The owner-approved reference bound skips opaque ancillary metadata (e.g. C2PA); the default keeps its allowlist.
export type PropPngLimits = Readonly<{ maxBytes: number; maxSide: number; maxPixels: number; maxChunks: number;
  maxRgbaBytes: number; maxDecodedBytes: number; ancillary: 'allowlist' | 'skip'; maxAncillaryBytes?: number }>;
export const PROP_PNG_LIMITS: PropPngLimits = Object.freeze({ maxBytes: 2 * 1024 * 1024, maxSide: 512, maxPixels: 262144, maxChunks: 256,
  maxRgbaBytes: 1024 * 1024, maxDecodedBytes: 1049088, ancillary: 'allowlist' });
export const REFERENCE_PNG_1024_LIMITS: PropPngLimits = Object.freeze({ maxBytes: 6 * 1024 * 1024, maxSide: 1024, maxPixels: 1048576, maxChunks: 1024,
  maxRgbaBytes: 4 * 1024 * 1024, maxDecodedBytes: 4195328, ancillary: 'skip', maxAncillaryBytes: 2 * 1024 * 1024 });
// Server-only bound for an Atlas room painting (1280 × 720 generation grid).
export const PAINT_PNG_LIMITS: PropPngLimits = Object.freeze({ maxBytes: 8 * 1024 * 1024, maxSide: 1280, maxPixels: 921600, maxChunks: 1024,
  maxRgbaBytes: 3686400, maxDecodedBytes: 3687120, ancillary: 'skip', maxAncillaryBytes: 2 * 1024 * 1024 });
// Fixed diagnostics, reported on the skip path only; never provider text or image data.
export const PNG_REJECTION_REASONS = Object.freeze(['size', 'signature', 'chunk_limit', 'crc', 'critical_chunk', 'animation', 'order',
  'header', 'color_format', 'dimensions', 'decode'] as const);
export type PngRejectionReason = typeof PNG_REJECTION_REASONS[number];

// Shared byte policy for the browser decoder and the server's native inflater; never an admission result.
export function propPngPolicy(bytes: Uint8Array, signal: AbortSignal, limits: PropPngLimits = PROP_PNG_LIMITS) {
  signal.throwIfAborted();
  if (limits !== PROP_PNG_LIMITS && limits !== REFERENCE_PNG_1024_LIMITS && limits !== PAINT_PNG_LIMITS) throw invalid();
  const skip = limits.ancillary === 'skip';
  const fail = (reason: PngRejectionReason) => skip ? Object.assign(invalid(), { reason }) : invalid();
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 45 || bytes.byteLength > limits.maxBytes) throw fail('size');
  if (signature.some((value, index) => bytes[index] !== value)) throw fail('signature');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let chunks = 0;
  let width = 0;
  let height = 0;
  let channels = 0;
  let imageData = false;
  let ended = false;
  let gamma: number | undefined;
  let compressedLength = 0;
  let afterImage = false;
  let ancillaryBytes = 0;
  const metadata = new Set<string>();
  const compressed: Uint8Array[] = [];
  while (offset < bytes.length) {
    signal.throwIfAborted();
    if (++chunks > limits.maxChunks) throw fail('chunk_limit');
    if (bytes.length - offset < 12) throw fail('order');
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) throw fail('order');
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    let crc = 0xffffffff;
    for (let index = offset + 4; index < end - 4; index += 1) crc = crcTable[(crc ^ bytes[index]) & 255] ^ (crc >>> 8);
    if (((crc ^ 0xffffffff) >>> 0) !== view.getUint32(end - 4)) throw fail('crc');
    const data = new DataView(bytes.buffer, bytes.byteOffset + offset + 8, length);
    if (chunks === 1 && type !== 'IHDR') throw fail('order');
    if (type === 'IHDR') {
      if (chunks !== 1) throw fail('order');
      if (length !== 13) throw fail('header');
      width = data.getUint32(0);
      height = data.getUint32(4);
      if (!width || !height || data.getUint8(10) || data.getUint8(11) || data.getUint8(12)) throw fail('header');
      if (data.getUint8(8) !== 8 || ![2, 6].includes(data.getUint8(9))) throw fail('color_format');
      if (width > limits.maxSide || height > limits.maxSide || width * height > limits.maxPixels) throw fail('dimensions');
      channels = data.getUint8(9) === 2 ? 3 : 4;
    } else if (type === 'IDAT') {
      // The allowlist path cannot place a chunk between IDATs; the skip path enforces contiguity explicitly.
      if (afterImage) throw fail('order');
      imageData = true;
      compressed.push(bytes.subarray(offset + 8, end - 4));
      compressedLength += length;
    } else if (type === 'IEND') {
      if (!imageData || length !== 0 || end !== bytes.length) throw fail('order');
      ended = true;
    } else if (skip) {
      // Skipped, never interpreted: lowercase-first ASCII ancillary chunks, excluding APNG, within a byte cap.
      if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') throw fail('animation');
      if (!/^[a-z][A-Za-z]{3}$/.test(type)) throw fail('critical_chunk');
      ancillaryBytes += length;
      if (ancillaryBytes > (limits.maxAncillaryBytes ?? 0)) throw fail('size');
      if (imageData) afterImage = true;
    } else if (type === 'sRGB' || type === 'gAMA' || type === 'pHYs') {
      if (imageData || metadata.has(type)) throw invalid();
      metadata.add(type);
      if (type === 'sRGB' && (length !== 1 || data.getUint8(0) > 3)) throw invalid();
      if (type === 'gAMA') {
        if (length !== 4 || !data.getUint32(0)) throw invalid();
        gamma = data.getUint32(0);
      }
      if (type === 'pHYs' && (length !== 9 || !data.getUint32(0) || !data.getUint32(4) || data.getUint8(8) > 1)) throw invalid();
    } else throw invalid();
    offset = end;
  }
  if (!ended) throw fail('order');
  if (metadata.has('sRGB') && gamma !== undefined && gamma !== 45455) throw invalid();
  const rowSize = 1 + width * channels;
  const expected = height * rowSize;
  if (width * height * 4 > limits.maxRgbaBytes || expected > limits.maxDecodedBytes) throw fail('dimensions');
  signal.throwIfAborted();
  const encoded = new Uint8Array(compressedLength);
  let position = 0;
  for (const part of compressed) { encoded.set(part, position); position += part.length; }
  return { width, height, rowSize, expected, encoded };
}

// shortcut: static noninterlaced RGB/RGBA8 only; other PNG formats need separately tested admission rules.
export async function validatePropPng(bytes: Uint8Array, signal: AbortSignal): Promise<{ width: number; height: number }> {
  const { width, height, rowSize, expected, encoded } = propPngPolicy(bytes, signal);
  const decoder = new DecompressionStream('deflate');
  const reader = decoder.readable.getReader();
  const writer = decoder.writable.getWriter();
  let rejectAbort!: (reason: unknown) => void;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const cancel = (reason: unknown) => {
    void reader.cancel(reason).catch(() => {});
    void writer.abort(reason).catch(() => {});
  };
  const abort = () => { cancel(signal.reason); rejectAbort(signal.reason); };
  signal.addEventListener('abort', abort, { once: true });
  const feed = async () => {
    // A write acknowledgement can mean queued input, not native consumption. Bound each submission too.
    for (let offset = 0; offset < encoded.length; offset += 64) {
      signal.throwIfAborted();
      await writer.write(encoded.subarray(offset, offset + 64));
    }
    await writer.close();
  };
  const read = async () => {
    let decoded = 0;
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      if (decoded + value.length > expected) throw invalid();
      for (let index = (rowSize - decoded % rowSize) % rowSize; index < value.length; index += rowSize) {
        if (value[index] > 4) throw invalid();
      }
      decoded += value.length;
    }
    if (decoded !== expected) throw invalid();
  };
  try {
    signal.throwIfAborted();
    await Promise.race([Promise.all([feed(), read()]), aborted]);
    signal.throwIfAborted();
    return { width, height };
  } catch (error) {
    cancel(error);
    throw signal.aborted ? signal.reason : invalid();
  } finally {
    signal.removeEventListener('abort', abort);
    reader.releaseLock();
    writer.releaseLock();
  }
}
