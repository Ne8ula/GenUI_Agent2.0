import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import zlib from 'node:zlib';
import { createProceduralRoom, type FurnishingPose } from '../room/procedural-room.ts';
import type { RoomDescription } from '../room/room-description.ts';
import { PAINT_PNG_LIMITS, PNG_REJECTION_REASONS, type PngRejectionReason } from '../room/prop-png-admission.ts';
import { PAINT_HEIGHT, PAINT_WIDTH, paintPinholeCamera, renderPaintDepth } from '../room/room-paint.ts';
import { validatePropReferencePng } from './prop-reference-png.ts';

const endpoint = '/api/room-paint';
const api = 'https://api.atlas-beta.worldlabs.ai/api/v2';
const task = 'atlasChisel';
const requestByteLimit = 16 * 1024;
const jsonByteLimit = 64 * 1024;
const allowance = 3;
const failures = {
  not_found: [404, 'Unknown room paint endpoint or local painting.'],
  forbidden: [403, 'Room painting requires the configured local origin and a loopback connection.'],
  method: [405, 'Use GET for local readiness or stored paintings, and POST for an explicit paint request.'],
  content_type: [415, 'Send uncompressed UTF-8 application/json.'],
  invalid_request: [400, 'Send only a bounded request ID and the current room layout.'],
  request_too_large: [413, 'Paint input exceeds 16 KiB.'],
  disabled: [503, 'Room painting is not enabled.'],
  spending_unconfirmed: [503, 'Room painting spending is not confirmed.'],
  missing_key: [503, 'The dedicated server-side World Labs key is not configured.'],
  busy: [409, 'A local paint operation or unsettled transport is still reserved.'],
  duplicate_request: [409, 'This request already consumed a submission. It cannot be retried.'],
  budget_exhausted: [429, 'The three-submission server-lifetime paint allowance is exhausted.'],
  invalid_room: [422, 'The room layout could not be rebuilt for painting. Nothing was submitted.'],
  upload_failed: [502, 'World Labs did not accept the depth upload. No paint task was submitted.'],
  invalid_request_upstream: [502, 'World Labs rejected the paint task as invalid. No task was created; no retry was made.'],
  provider_auth: [502, 'World Labs rejected the server-side key. No retry was made.'],
  provider_payment: [502, 'World Labs reported unavailable credits or a reached spending limit. No task was started.'],
  provider_busy: [502, 'World Labs reported a rate or concurrency limit. No task was started; no retry was made.'],
  submission_uncertain: [502, 'Submission is uncertain; a task may exist and charges may still apply. No retry was made.'],
  provider_failed: [502, 'World Labs reported the paint task failed. Charges may still apply; no retry was made.'],
  invalid_provider_response: [502, 'Invalid or oversized provider response. Remote completion is unknown and charges may still apply. No retry was made.'],
  invalid_image: [422, 'The painting failed bounded PNG admission. Charges may still apply. Nothing was applied.'],
  poll_limit: [504, 'Local polling reached its limit. The remote task may still complete and charges may still apply. No remote cancellation was performed.'],
  poll_uncertain: [504, 'Repeated status failures left the remote task unknown. Charges may still apply. No remote cancellation was performed.'],
  timeout: [504, 'A local deadline expired. Remote completion is unknown and charges may still apply. No retry or remote cancellation was performed.'],
  cancelled: [499, 'Work stopped locally. Remote completion is unknown and charges may still apply. No remote cancellation was performed.'],
} as const;
type Code = keyof typeof failures;
class RequestFailure extends Error {
  code: Code; status: number; reason: PngRejectionReason | undefined;
  constructor(code: Code, reason?: PngRejectionReason) { super(failures[code][1]); this.code = code; this.status = failures[code][0]; this.reason = reason; }
}
// Poses stay unvalidated here; createProceduralRoom validates the whole layout.
type Room = { description: unknown; seed: number; poses: FurnishingPose[] };
type Input = { requestId: string; room: Room };
type Painting = Readonly<{ id: string; requestId: string; source: 'provider' | 'synthetic'; provider: 'worldlabs'; task: typeof task;
  width: number; height: number; bytes: number; sha256: string }>;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const jsonType = (value: unknown) => typeof value === 'string' && /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(value.trim());

function validateInput(value: unknown): Input {
  if (!record(value) || Object.keys(value).length !== 2 || typeof value.requestId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.requestId)
    || !record(value.room) || Object.keys(value.room).length !== 3 || !Number.isInteger(value.room.seed) || !Array.isArray(value.room.poses)
    || value.room.poses.length > 16) throw new RequestFailure('invalid_request');
  return { requestId: value.requestId, room: value.room as Room };
}

// 16-bit grey log-depth PNG (Atlas `logDepthAsset`): white is zMin, darker is farther, 0 is no surface.
export function encodeLogDepthPng(depth: Float32Array, width: number, height: number) {
  let zMin = Infinity, zMax = 0;
  for (const z of depth) if (z > 0) { if (z < zMin) zMin = z; if (z > zMax) zMax = z; }
  if (!(zMax > 0)) throw new RequestFailure('invalid_room');
  const span = Math.log(zMax / zMin) || 1;
  const raw = Buffer.alloc(height * (1 + 2 * width));
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const z = depth[y * width + x];
    raw.writeUInt16BE(z > 0 ? Math.max(1, Math.round(65535 * (1 - Math.log(z / zMin) / span))) : 0, y * (1 + 2 * width) + 1 + 2 * x);
  }
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(4); head.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([head, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 16;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return { png, zMin, zMax };
}

// Only validated structural facts reach the provider, never visitor words.
export function paintPrompt(description: RoomDescription) {
  const shade = (color: string) => color.replace('-', ' ');
  const items = description.furnishings.map(item => `${/^[aeiou]/.test(item.color) ? 'an' : 'a'} ${shade(item.color)} ${item.kind}`);
  return `A quiet interior room at eye level: ${shade(description.colors.wall)} plaster walls and ceiling, ${shade(description.colors.floor)} wooden floor`
    + `${items.length ? `, ${items.join(', ')}` : ''}, an open doorway in the back wall leading into darkness, soft warm light from the front left.`;
}

function outputUrl(value: unknown): string {
  if (typeof value !== 'string' || !value || Buffer.byteLength(value, 'utf8') > 4096 || /[\s\p{Cc}\p{Cf}]/u.test(value)) throw new RequestFailure('invalid_provider_response');
  let url: URL;
  try { url = new URL(value); } catch { throw new RequestFailure('invalid_provider_response'); }
  // shortcut: only the signed output host seen in the owner-approved probe; widen after inspecting another real sample.
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || url.hostname !== 'storage.googleapis.com'
    || !url.pathname.startsWith('/wlt-marble-outputs-prod/')) throw new RequestFailure('invalid_provider_response');
  return value;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  });
}

function readInput(req: IncomingMessage, signal: AbortSignal): Promise<Input> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0, settled = false;
    const finish = (error?: unknown, input?: Input) => {
      if (settled) return;
      settled = true;
      req.off('data', data); req.off('end', end); signal.removeEventListener('abort', abort);
      if (error !== undefined) { req.resume(); reject(error); } else resolve(input!);
    };
    const abort = () => finish(signal.reason);
    const data = (chunk: Buffer) => {
      bytes += chunk.byteLength;
      if (bytes > requestByteLimit) { finish(new RequestFailure('request_too_large')); return; }
      chunks.push(chunk);
    };
    const end = () => {
      try {
        const length = req.headers['content-length'];
        if (length !== undefined && Number(length) !== bytes) throw new Error('length');
        finish(undefined, validateInput(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))));
      } catch (error) { finish(error instanceof RequestFailure ? error : new RequestFailure('invalid_request')); }
    };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    req.on('data', data);
    req.once('end', end);
  });
}

export function createRoomPaintHandler(options: {
  origin: string; enabled?: boolean; spendingConfirmed?: boolean; getApiKey?: () => string | undefined;
  fetch?: typeof globalThis.fetch; pollMs?: number;
}) {
  if (options.origin !== 'http://127.0.0.1:5173' && options.origin !== 'http://127.0.0.1:4173') throw new Error('Paint origin must be an approved loopback origin.');
  const origin = options.origin;
  const host = new URL(origin).host;
  const enabled = options.enabled === true;
  const spendingConfirmed = options.spendingConfirmed === true;
  const fetch = options.fetch ?? globalThis.fetch;
  const source = options.fetch === undefined ? 'provider' : 'synthetic';
  const pollMs = options.pollMs ?? 2000;
  let attempts = 0;
  type Operation = { controller: AbortController; pending: number; finished: boolean };
  let active: Operation | null = null;
  // The lock outlives the response until every transport promise has settled.
  const release = (op: Operation) => { if (op.finished && op.pending === 0 && active === op) active = null; };
  const submittedIds = new Set<string>();
  const paintings = new Map<string, { painting: Painting; bytes: Buffer }>();
  const unavailable = (): Code | null => !enabled ? 'disabled' : !spendingConfirmed ? 'spending_unconfirmed'
    : active ? 'busy' : attempts >= allowance ? 'budget_exhausted' : null;

  // One bounded request: own deadline, follows no redirects, reads at most `limit` bytes of the expected type.
  async function call(signal: AbortSignal, url: string, init: RequestInit, type: 'json' | 'png', limit: number, timeout = 30000) {
    const local = AbortSignal.any([signal, AbortSignal.timeout(timeout)]);
    const op = active!;
    op.pending += 1;
    try {
      let response: Response;
      try { response = await fetch(url, { ...init, redirect: 'error', credentials: 'omit', cache: 'no-store', signal: local }); }
      catch (error) { signal.throwIfAborted(); throw local.aborted ? new RequestFailure('timeout') : error; }
      const contentType = response.headers.get('content-type')?.trim().toLowerCase() ?? '';
      const length = response.headers.get('content-length');
      const typed = type === 'json' ? jsonType(contentType) : contentType === 'image/png';
      if (!response.ok || !typed || !response.body || (length !== null && (!/^\d+$/.test(length) || Number(length) > limit))) {
        void response.body?.cancel().catch(() => {});
        return { status: response.status, ok: false as const, headers: response.headers, bytes: null };
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > limit) throw new RequestFailure('invalid_provider_response');
          chunks.push(chunk.value);
        }
      } catch (error) {
        void reader.cancel().catch(() => {});
        signal.throwIfAborted();
        throw error instanceof RequestFailure ? error : local.aborted ? new RequestFailure('timeout') : new RequestFailure('invalid_provider_response');
      }
      return { status: response.status, ok: true as const, headers: response.headers, bytes: Buffer.concat(chunks) };
    } finally { op.pending -= 1; release(op); }
  }
  const json = (bytes: Buffer): unknown => {
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { throw new RequestFailure('invalid_provider_response'); }
  };

  return async (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void): Promise<void> => {
    if (!req.url?.startsWith(endpoint)) { next(); return; }
    const reply = (status: number, body: unknown) => {
      if (res.destroyed || res.writableEnded) return;
      res.statusCode = status;
      res.setHeader('cache-control', 'no-store');
      res.setHeader('x-content-type-options', 'nosniff');
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };
    let controller: AbortController | undefined;
    let operation: Operation | undefined;
    let submitted = false, accepted = false;
    const disconnect = () => controller?.abort(new RequestFailure('cancelled'));
    const responseClose = () => { if (!res.writableEnded) disconnect(); };
    try {
      const stored = req.url === endpoint ? null : new RegExp(`^${endpoint}/([A-Za-z0-9_-]{16,128})$`).exec(req.url)?.[1];
      if (stored === undefined) throw new RequestFailure('not_found');
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || req.headers.host !== host
        || (req.headers.origin !== undefined && req.headers.origin !== origin) || (req.method === 'POST' && req.headers.origin !== origin)
        || (req.headers['sec-fetch-site'] !== undefined && req.headers['sec-fetch-site'] !== 'same-origin' && req.headers['sec-fetch-site'] !== 'none')) throw new RequestFailure('forbidden');
      if ((req.method !== 'GET' && req.method !== 'POST') || (stored !== null && req.method !== 'GET')) {
        res.setHeader('allow', stored === null ? 'GET, POST' : 'GET');
        throw new RequestFailure('method');
      }
      if (stored !== null) {
        const item = paintings.get(stored);
        if (!item) throw new RequestFailure('not_found');
        res.statusCode = 200;
        res.setHeader('cache-control', 'no-store');
        res.setHeader('x-content-type-options', 'nosniff');
        res.setHeader('content-type', 'image/png');
        res.setHeader('content-length', item.bytes.length);
        res.setHeader('x-eva-paint-source', item.painting.source);
        res.end(item.bytes);
        return;
      }
      const reason = unavailable();
      if (req.method === 'GET') {
        reply(reason ? failures[reason][0] : 200, { available: reason === null, reason, provider: 'worldlabs', model: task, credentialStatus: 'unchecked',
          remainingRequests: allowance - attempts, pendingTransport: (active?.pending ?? 0) > 0 });
        return;
      }
      if (reason) throw new RequestFailure(reason);
      if (!jsonType(req.headers['content-type']) || (req.headers['content-encoding'] !== undefined && req.headers['content-encoding'] !== 'identity')) throw new RequestFailure('content_type');
      const length = req.headers['content-length'];
      if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > requestByteLimit)) throw new RequestFailure('request_too_large');
      controller = new AbortController();
      operation = { controller, pending: 0, finished: false };
      active = operation;
      const { signal } = controller;
      res.on('close', responseClose);
      const deadline = setTimeout(() => controller!.abort(new RequestFailure('timeout')), 6 * 60000);
      try {
        const input = await readInput(req, AbortSignal.any([signal, AbortSignal.timeout(5000)]));
        if (submittedIds.has(input.requestId)) throw new RequestFailure('duplicate_request');
        // Rebuild and render locally before any provider contact; an unbuildable layout costs nothing.
        let depth: { png: Buffer; zMin: number; zMax: number };
        let prompt: string;
        try {
          const room = createProceduralRoom(input.room.description, input.room.seed, input.room.poses);
          try {
            depth = encodeLogDepthPng(renderPaintDepth(room.scene), PAINT_WIDTH, PAINT_HEIGHT);
            prompt = paintPrompt(room.layout.description);
          } finally { room.dispose(); }
        } catch { throw new RequestFailure('invalid_room'); }
        signal.throwIfAborted();
        let apiKey: string | undefined;
        try { apiKey = options.getApiKey?.()?.trim(); } catch { throw new RequestFailure('missing_key'); }
        if (!apiKey || apiKey.length > 4096 || /[\r\n\0]/.test(apiKey)) throw new RequestFailure('missing_key');
        const headers = { 'WLT-Api-Key': apiKey, accept: 'application/json', 'accept-encoding': 'identity' };

        const upload = await call(signal, `${api}/assets`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify({ asset: { displayName: 'eva-room-depth.png', base64: `data:image/png;base64,${depth.png.toString('base64')}` } }) }, 'json', jsonByteLimit);
        const asset = upload.bytes ? json(upload.bytes) : null;
        if (!record(asset) || typeof asset.id !== 'string' || !/^asset_[A-Za-z0-9]{1,64}$/.test(asset.id)) throw new RequestFailure('upload_failed');
        for (let check = 0; asset.state !== 'READY'; check += 1) {
          if (check >= 10) throw new RequestFailure('upload_failed');
          await wait(1000, signal);
          const got = await call(signal, `${api}/assets/${asset.id}`, { method: 'GET', headers }, 'json', jsonByteLimit);
          const value = got.bytes ? json(got.bytes) : null;
          if (!record(value) || value.id !== asset.id || value.state === 'DELETED') throw new RequestFailure('upload_failed');
          asset.state = value.state;
        }

        const camera = paintPinholeCamera();
        // An attempted submit consumes its allowance even when acceptance or billing is uncertain.
        attempts += 1;
        submittedIds.add(input.requestId);
        submitted = true;
        const created = await call(signal, `${api}/tasks:${task}`, { method: 'POST',
          headers: { ...headers, 'content-type': 'application/json', 'Idempotency-Key': input.requestId },
          body: JSON.stringify({ prompt,
            contextFrames: [{ camera, depth: { logDepthAsset: { assetId: asset.id }, zMin: depth.zMin, zMax: depth.zMax } }],
            targetCameras: [camera], returnDepth: false }) }, 'json', jsonByteLimit, 60000);
        if (!created.bytes) {
          const code = created.status;
          throw new RequestFailure(code === 400 || code === 404 || code === 422 ? 'invalid_request_upstream' : code === 401 || code === 403 ? 'provider_auth'
            : code === 402 ? 'provider_payment' : code === 429 ? 'provider_busy' : code >= 500 ? 'submission_uncertain' : 'invalid_provider_response');
        }
        const operation = json(created.bytes);
        if (!record(operation) || typeof operation.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(operation.id)) throw new RequestFailure('invalid_provider_response');
        accepted = true;
        let done: Record<string, unknown> = operation;
        for (let polls = 0, missed = 0; done.done !== true; polls += 1) {
          if (polls >= 150) throw new RequestFailure('poll_limit');
          await wait(pollMs, signal);
          let got;
          try { got = await call(signal, `${api}/operations/${operation.id}`, { method: 'GET', headers }, 'json', jsonByteLimit); }
          catch (error) { signal.throwIfAborted(); if (!(error instanceof RequestFailure) || error.code !== 'timeout') throw error; got = null; }
          if (!got?.bytes) { if (++missed > 3) throw new RequestFailure('poll_uncertain'); continue; }
          missed = 0;
          const value = json(got.bytes);
          if (!record(value) || value.id !== operation.id || typeof value.done !== 'boolean') throw new RequestFailure('invalid_provider_response');
          done = value;
        }
        if (done.error !== null && done.error !== undefined) throw new RequestFailure('provider_failed');
        const frames = record(done.response) ? done.response.frames : null;
        if (!Array.isArray(frames) || frames.length !== 1 || !record(frames[0]) || !record(frames[0].imageAsset)) throw new RequestFailure('invalid_provider_response');
        const image = await call(signal, outputUrl(frames[0].imageAsset.url), { method: 'GET', headers: { accept: 'image/png', 'accept-encoding': 'identity' } },
          'png', PAINT_PNG_LIMITS.maxBytes, 60000);
        if (!image.bytes) throw new RequestFailure('invalid_image');
        let size: { width: number; height: number };
        try { size = await validatePropReferencePng(image.bytes, signal, PAINT_PNG_LIMITS); }
        catch (error) {
          signal.throwIfAborted();
          throw new RequestFailure('invalid_image', PNG_REJECTION_REASONS.find(value => value === (error as { reason?: unknown })?.reason));
        }
        if (size.width !== PAINT_WIDTH || size.height !== PAINT_HEIGHT) throw new RequestFailure('invalid_image', 'dimensions');
        signal.throwIfAborted();
        const id = randomUUID();
        const painting: Painting = Object.freeze({ id, requestId: input.requestId, source, provider: 'worldlabs', task, width: size.width,
          height: size.height, bytes: image.bytes.length, sha256: createHash('sha256').update(image.bytes).digest('hex') });
        paintings.set(id, { painting, bytes: image.bytes });
        reply(200, { painting, remainingRequests: allowance - attempts });
      } finally { clearTimeout(deadline); }
    } catch (error) {
      const cause: unknown = controller?.signal.aborted ? controller.signal.reason : error;
      const failure = cause instanceof RequestFailure ? cause : new RequestFailure(submitted && !accepted ? 'submission_uncertain' : 'invalid_provider_response');
      const message = !submitted && (failure.code === 'timeout' || failure.code === 'cancelled')
        ? 'Request stopped locally before submission. No paint task was sent.' : failure.message;
      reply(failure.status, { error: failure.code, ...(failure.reason ? { reason: failure.reason } : {}), message,
        remainingRequests: allowance - attempts, remoteCancelled: false });
    } finally {
      res.off('close', responseClose);
      if (operation) { operation.controller.abort(new RequestFailure('cancelled')); operation.finished = true; release(operation); }
      if (!req.readableEnded) req.resume();
    }
  };
}
