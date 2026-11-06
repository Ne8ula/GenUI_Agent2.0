import { crc32, deflateSync } from 'node:zlib';

// Locally authored synthetic PNGs; no provider image or external asset is used.
export const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export function pngChunk(type: string, data: Uint8Array = new Uint8Array()): Buffer {
  if (!/^[A-Za-z]{4}$/.test(type)) throw new Error('Fixture chunk type must have four letters.');
  const chunk = Buffer.alloc(data.byteLength + 12);
  chunk.writeUInt32BE(data.byteLength, 0);
  chunk.write(type, 4, 4, 'ascii');
  chunk.set(data, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4);
  return chunk;
}
export function pngHeader(width = 2, height = 2, options: {
  bitDepth?: number; colorType?: number; compression?: number; filter?: number; interlace?: number;
} = {}): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([options.bitDepth ?? 8, options.colorType ?? 2, options.compression ?? 0, options.filter ?? 0, options.interlace ?? 0], 8);
  return pngChunk('IHDR', header);
}
export function pngFile(...chunks: Uint8Array[]): Buffer {
  return Buffer.concat([pngSignature, ...chunks]);
}
export function pngScanlines(width = 2, height = 2, channels = 3): Buffer {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
    || width > 512 || height > 512 || ![3, 4].includes(channels)) throw new Error('Fixture pixel allocation is bounded.');
  const rowSize = 1 + width * channels;
  const rows = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = y * rowSize + 1 + x * channels;
      rows.set(x < width / 2 ? [79, 102, 97] : [180, 138, 69], offset);
      if (channels === 4) rows[offset + 3] = 255;
    }
  }
  return rows;
}
export function pngFixture(width = 2, height = 2, channels = 3): Buffer {
  return pngFile(pngHeader(width, height, { colorType: channels === 4 ? 6 : 2 }),
    pngChunk('IDAT', deflateSync(pngScanlines(width, height, channels))), pngChunk('IEND'));
}
