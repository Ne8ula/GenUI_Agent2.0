import type { RoomLayout } from './procedural-room.ts';
import { post, readRoute, RouteFailure } from './prop-generation-client.ts';
import { PAINT_HEIGHT, PAINT_WIDTH } from './room-paint.ts';

// Fixed route codes only (keys of the server `failures` table); the server `message` is never read.
const paintCodes = ['not_found', 'forbidden', 'method', 'content_type', 'invalid_request', 'request_too_large', 'disabled',
  'spending_unconfirmed', 'missing_key', 'busy', 'duplicate_request', 'budget_exhausted', 'invalid_room', 'upload_failed',
  'invalid_request_upstream', 'provider_auth', 'provider_payment', 'provider_busy', 'submission_uncertain', 'provider_failed',
  'invalid_provider_response', 'invalid_image', 'poll_limit', 'poll_uncertain', 'timeout', 'cancelled'] as const;
// Codes the server returns before its paid task submission (provider refusals that start no task included).
export const paintUnsubmittedCodes = new Set(['not_found', 'forbidden', 'method', 'content_type', 'invalid_request', 'request_too_large',
  'disabled', 'spending_unconfirmed', 'missing_key', 'busy', 'duplicate_request', 'budget_exhausted', 'invalid_room', 'upload_failed',
  'invalid_request_upstream', 'provider_auth', 'provider_payment', 'provider_busy']);
export type RoomPaintResult = { outcome: 'painted'; image: ImageBitmap }
  | { outcome: 'failed'; code: string }
  | { outcome: 'stopped'; submitted: boolean };

export function readRoomPaintStatus(signal: AbortSignal) {
  return readRoute('/api/room-paint', 'worldlabs', signal);
}

async function fetchPainting(painting: { id: string; bytes: number; sha256: string }, signal: AbortSignal): Promise<ImageBitmap> {
  const response = await fetch(`/api/room-paint/${painting.id}`, { method: 'GET', credentials: 'same-origin', redirect: 'error', cache: 'no-store', signal });
  if (!response.ok || response.headers.get('content-type') !== 'image/png' || response.headers.get('content-length') !== String(painting.bytes)) {
    void response.body?.cancel().catch(() => {});
    throw new RouteFailure('painting_retrieval_failed');
  }
  const bytes = await response.arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
  if (bytes.byteLength !== painting.bytes || digest !== painting.sha256) throw new RouteFailure('painting_retrieval_failed');
  const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  if (image.width !== PAINT_WIDTH || image.height !== PAINT_HEIGHT) { image.close(); throw new RouteFailure('painting_retrieval_failed'); }
  return image;
}

// One paid attempt for the exact current layout; no retries. Abort returns 'stopped' and never yields an image.
export async function runRoomPaint(layout: RoomLayout, signal: AbortSignal): Promise<RoomPaintResult> {
  let submitted = false;
  let image: ImageBitmap | undefined;
  try {
    signal.throwIfAborted();
    submitted = true;
    const { painting } = await post('/api/room-paint', { requestId: crypto.randomUUID(), room: {
      description: layout.description, seed: layout.seed, poses: layout.furnishings.map(({ x, z, rotation }) => ({ x, z, rotation })),
    } }, paintCodes, signal);
    if (!painting || typeof painting !== 'object' || Array.isArray(painting)) throw new RouteFailure('invalid_response');
    const { id, bytes, sha256, width, height } = painting as Record<string, unknown>;
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(id) || !Number.isSafeInteger(bytes) || (bytes as number) <= 0
      || (bytes as number) > 8 * 1024 * 1024 || typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(sha256)
      || width !== PAINT_WIDTH || height !== PAINT_HEIGHT) throw new RouteFailure('invalid_response');
    image = await fetchPainting({ id, bytes: bytes as number, sha256 }, signal);
    signal.throwIfAborted();
    return { outcome: 'painted', image };
  } catch (error) {
    image?.close();
    if (signal.aborted) return { outcome: 'stopped', submitted };
    return { outcome: 'failed', code: error instanceof RouteFailure ? error.code : 'painting_retrieval_failed' };
  }
}
