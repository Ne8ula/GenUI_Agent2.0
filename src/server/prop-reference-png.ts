import { Buffer } from 'node:buffer';
import { createInflate } from 'node:zlib';
import { propPngPolicy, REFERENCE_PNG_1024_LIMITS, type PropPngLimits } from '../room/prop-png-admission.ts';

export { REFERENCE_PNG_1024_LIMITS };
const invalid = () => new Error('Reference image is not an admissible static PNG.');

export async function validatePropReferencePng(bytes: Uint8Array, signal: AbortSignal, limits?: PropPngLimits): Promise<{ width: number; height: number }> {
  const { width, height, rowSize, expected, encoded } = propPngPolicy(bytes, signal, limits);
  // Fixed 'decode' diagnostic on the skip path only; default-path failures keep their existing errors.
  const skip = limits?.ancillary === 'skip';
  const undecodable = (error?: unknown) => skip ? Object.assign(invalid(), { reason: 'decode' }) : error ?? invalid();
  return new Promise((resolve, reject) => {
    const decoder = createInflate({ chunkSize: 16 * 1024 });
    let decoded = 0;
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abort);
      decoder.off('data', data);
      decoder.off('end', end);
      decoder.destroy();
      if (error !== undefined) reject(error); else resolve({ width, height });
    };
    const abort = () => finish(signal.reason);
    const data = (chunk: Buffer) => {
      if (signal.aborted) { abort(); return; }
      if (decoded + chunk.length > expected) { finish(undecodable()); return; }
      for (let index = (rowSize - decoded % rowSize) % rowSize; index < chunk.length; index += rowSize) {
        if (chunk[index] > 4) { finish(undecodable()); return; }
      }
      decoded += chunk.length;
    };
    const end = () => {
      if (signal.aborted) { abort(); return; }
      // bytesWritten is compressed input consumed, not decoded output; reject extra members and suffixes.
      finish(decoded === expected && decoder.bytesWritten === encoded.length ? undefined : undecodable());
    };
    const failed = (error: unknown) => finish(undecodable(error));
    decoder.on('data', data);
    decoder.once('end', end);
    decoder.once('error', failed);
    decoder.once('close', () => {
      if (!settled) finish(undecodable());
      decoder.off('error', failed);
    });
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort(); else decoder.end(encoded);
  });
}
