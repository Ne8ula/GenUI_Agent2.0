import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { validatePropGlb } from '../room/prop-glb-admission.ts';
import { PNG_REJECTION_REASONS, type PngRejectionReason } from '../room/prop-png-admission.ts';
import { REFERENCE_PNG_1024_LIMITS, validatePropReferencePng } from './prop-reference-png.ts';

const endpoint = '/api/prop-mesh';
const createUrl = 'https://api.meshy.ai/openapi/v1/image-to-3d';
const model = 'meshy-t2.5';
const requestByteLimit = 4096;
const jsonByteLimit = 64 * 1024;
const meshByteLimit = 8 * 1024 * 1024;
const failures = {
  not_found: [404, 'Unknown mesh endpoint or local mesh.'],
  forbidden: [403, 'Meshes require the configured local origin and a loopback connection.'],
  method: [405, 'Use GET for local readiness or stored meshes, and POST for an explicit mesh request.'],
  content_type: [415, 'Send uncompressed UTF-8 application/json.'],
  invalid_request: [400, 'Send only a bounded request ID and local reference ID.'],
  request_too_large: [413, 'Mesh input exceeds 4 KiB.'],
  disabled: [503, 'Mesh generation is not enabled.'],
  spending_unconfirmed: [503, 'Mesh spending is not confirmed.'],
  missing_key: [503, 'The dedicated server-side mesh key is not configured.'],
  busy: [409, 'A local mesh operation or unsettled transport is still reserved.'],
  duplicate_request: [409, 'This request or reference already consumed a submission. It cannot be retried.'],
  budget_exhausted: [429, 'The three-submission server-lifetime mesh allowance is exhausted.'],
  reference_not_found: [404, 'No local reference image with this ID is held by this server.'],
  reference_mismatch: [409, 'The local reference belongs to a different prop request.'],
  synthetic_reference: [409, 'A synthetic local reference cannot be submitted for paid mesh generation.'],
  invalid_reference: [422, 'The local reference image failed integrity or bounded PNG admission. Nothing was submitted.'],
  invalid_request_upstream: [502, 'Meshy rejected the submission as invalid. No retry was made; remote task state is not verified.'],
  provider_auth: [502, 'Meshy rejected the server-side mesh key. No retry was made; remote task state is not verified.'],
  provider_payment: [502, 'Meshy reported insufficient credits or plan. No retry was made; remote task state is not verified.'],
  provider_busy: [502, 'Meshy reported a rate or concurrency limit. No retry was made; remote task state is not verified.'],
  submission_uncertain: [502, 'Remote submission is uncertain; a task may exist and charges may still apply. No lookup or retry was made.'],
  provider_rejected: [502, 'The provider did not deliver an admissible mesh. Charges may still apply; no retry or remote cancellation was made.'],
  provider_failed: [502, 'Meshy reported the task failed. Meshy documents automatic refunds for failed tasks; this is not locally verified. No retry was made.'],
  invalid_provider_response: [502, 'Invalid or oversized provider response. Remote completion is unknown and charges may still apply. No retry was made.'],
  invalid_mesh: [422, 'The mesh failed bounded GLB admission. Charges may still apply. No fallback was made.'],
  poll_limit: [504, 'Local polling reached its limit. The remote task may still complete and charges may still apply. No remote cancellation was performed.'],
  poll_uncertain: [504, 'Repeated status failures left the remote task unknown. It may still complete and charges may still apply. No remote cancellation was performed.'],
  timeout: [504, 'A local deadline expired. Remote completion is unknown; the task may still complete and charges may still apply. No retry or remote cancellation was performed.'],
  cancelled: [499, 'Work stopped locally. Remote completion is unknown and charges may still apply. No remote cancellation was performed.'],
} as const;
class RequestFailure extends Error {
  code: keyof typeof failures;
  status: number;
  reason: PngRejectionReason | undefined;
  constructor(code: keyof typeof failures, reason?: PngRejectionReason) {
    super(failures[code][1]); this.code = code; this.status = failures[code][0]; this.reason = reason;
  }
}
// Pass through only a fixed reference admission code, never an arbitrary error property.
function pngReason(error: unknown): PngRejectionReason | undefined {
  const reason = (error as { reason?: unknown } | null)?.reason;
  return PNG_REJECTION_REASONS.find(value => value === reason);
}
type Input = { requestId: string; referenceId: string };
type Operation = { controller: AbortController; pending: number; finished: boolean; release: () => void };
type StoredReference = { reference: { id: string; requestId: string; source: 'provider' | 'synthetic'; provider: string;
  width: number; height: number; sha256: string }; bytes: Uint8Array };
type Mesh = Readonly<{ id: string; requestId: string; referenceId: string; source: 'provider' | 'synthetic'; provider: 'meshy';
  model: typeof model; bytes: number; sha256: string }>;
type Reply = { status: number; retryAfter: number; bytes: Buffer | null };
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function jsonType(value: unknown) { return typeof value === 'string' && /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(value.trim()); }
function validateInput(value: unknown): Input {
  if (!record(value) || Object.keys(value).length !== 2 || typeof value.requestId !== 'string' || typeof value.referenceId !== 'string'
    || !/^[A-Za-z0-9_-]{1,128}$/.test(value.requestId) || !/^[A-Za-z0-9_-]{16,128}$/.test(value.referenceId)) throw new RequestFailure('invalid_request');
  return { requestId: value.requestId, referenceId: value.referenceId };
}
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
    promise.then(value => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) reject(signal.reason); else resolve(value);
    }, error => { signal.removeEventListener('abort', abort); reject(error); });
  });
}
function tracked<T>(operation: Operation, promise: Promise<T>): Promise<T> {
  operation.pending += 1;
  const release = () => { operation.pending -= 1; operation.release(); };
  return promise.then(value => { release(); return value; }, error => { release(); throw error; });
}
function cancelBody(response: Response, operation: Operation) {
  if (response.body) void tracked(operation, response.body.cancel()).catch(() => {});
}
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(signal.reason); };
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  });
}
function retryAfter(response: Response) {
  const value = response.headers.get('retry-after')?.trim();
  return value && /^\d+$/.test(value) ? Math.min(30, Math.max(1, Number(value))) * 1000 : 5000;
}
function readInput(req: IncomingMessage, signal: AbortSignal): Promise<Input> {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    let settled = false;
    const chunks: Buffer[] = [];
    const finish = (error?: unknown, input?: Input) => {
      if (settled) return;
      settled = true;
      req.off('data', data);
      req.off('end', end);
      signal.removeEventListener('abort', abort);
      if (error !== undefined) { req.resume(); reject(error); } else resolve(input!);
    };
    const abort = () => finish(signal.reason);
    const data = (chunk: Buffer) => {
      if (!Buffer.isBuffer(chunk)) { finish(new RequestFailure('invalid_request')); return; }
      bytes += chunk.byteLength;
      if (bytes > requestByteLimit || chunks.length >= requestByteLimit) { finish(new RequestFailure('request_too_large')); return; }
      chunks.push(chunk);
    };
    const end = () => {
      try {
        const length = req.headers['content-length'];
        if (length !== undefined && Number(length) !== bytes) throw new Error('length');
        finish(undefined, validateInput(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))));
      } catch { finish(new RequestFailure('invalid_request')); }
    };
    if (signal.aborted) { abort(); return; }
    if (req.readableEnded) { finish(new RequestFailure('invalid_request')); return; }
    signal.addEventListener('abort', abort, { once: true });
    req.on('data', data);
    req.once('end', end);
  });
}
async function readOutput(response: Response, operation: Operation, signal: AbortSignal, mesh: boolean): Promise<Buffer> {
  const limit = mesh ? meshByteLimit : jsonByteLimit;
  const length = response.headers.get('content-length');
  const encoding = response.headers.get('content-encoding');
  const type = response.headers.get('content-type')?.trim().toLowerCase();
  if (response.redirected || !(mesh ? type === 'model/gltf-binary' || type === 'application/octet-stream' : jsonType(type)) || !response.body
    || (encoding !== null && encoding !== 'identity')
    || (length !== null && (!/^\d+$/.test(length) || Number(length) > limit))) {
    cancelBody(response, operation);
    throw new RequestFailure('invalid_provider_response');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let complete = false;
  let cancelled = false;
  const cancel = () => {
    if (!cancelled && !complete) {
      cancelled = true;
      void tracked(operation, reader.cancel()).catch(() => {});
    }
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await abortable(tracked(operation, reader.read()), signal);
      if (chunk.done) { complete = true; break; }
      if (!(chunk.value instanceof Uint8Array)) throw new RequestFailure('invalid_provider_response');
      bytes += chunk.value.byteLength;
      if (bytes > limit || chunks.length >= 4096) throw new RequestFailure('invalid_provider_response');
      chunks.push(chunk.value);
    }
    signal.throwIfAborted();
    if (!bytes || (length !== null && Number(length) !== bytes)) throw new RequestFailure('invalid_provider_response');
    return Buffer.concat(chunks);
  } finally {
    signal.removeEventListener('abort', cancel);
    if (!complete) cancel();
    reader.releaseLock();
  }
}
function parseJson(bytes: Buffer): unknown {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new RequestFailure('invalid_provider_response'); }
}
function createdTask(value: unknown): string {
  // shortcut: Meshy calls task IDs opaque; accept only path-safe IDs until a real sample proves another documented shape.
  if (!record(value) || typeof value.result !== 'string' || !/^[A-Za-z0-9-]{1,128}$/.test(value.result)) throw new RequestFailure('invalid_provider_response');
  return value.result;
}
function assetUrl(value: unknown, taskId: string): string {
  if (typeof value !== 'string' || !value || Buffer.byteLength(value, 'utf8') > 4096 || /[\s\p{Cc}\p{Cf}]/u.test(value)) throw new RequestFailure('invalid_provider_response');
  let url: URL;
  try { url = new URL(value); } catch { throw new RequestFailure('invalid_provider_response'); }
  // shortcut: only the documented example asset shape; widen only after inspecting a real owner-approved sample.
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || url.hostname !== 'assets.meshy.ai'
    || !url.pathname.endsWith(`/tasks/${taskId}/output/model.glb`)) throw new RequestFailure('invalid_provider_response');
  return value;
}

export function createPropMeshHandler(options: {
  origin: string; enabled?: boolean; spendingConfirmed?: boolean; getApiKey?: () => string | undefined;
  fetch?: typeof globalThis.fetch; readReference?: (id: string) => StoredReference | null;
}) {
  if (options.origin !== 'http://127.0.0.1:5173' && options.origin !== 'http://127.0.0.1:4173') throw new Error('Mesh origin must be an approved loopback origin.');
  const origin = options.origin;
  const host = new URL(origin).host;
  const enabled = options.enabled === true;
  const spendingConfirmed = options.spendingConfirmed === true;
  const fetch = options.fetch ?? globalThis.fetch;
  const source = options.fetch === undefined ? 'provider' : 'synthetic';
  let attempts = 0;
  let active: Operation | null = null;
  const submittedIds = new Set<string>();
  const consumedReferences = new Set<string>();
  const meshes = new Map<string, { mesh: Mesh; bytes: Buffer }>();
  const unavailable = () => !enabled ? 'disabled' : !spendingConfirmed ? 'spending_unconfirmed'
    : active ? 'busy' : attempts >= 3 ? 'budget_exhausted' : null;

  // Each request has its own deadline so one slow poll never ends the operation; operation aborts still propagate.
  async function fetchBytes(operation: Operation, url: string, init: RequestInit, mesh: boolean, timeout: number, accept: number[]): Promise<Reply> {
    operation.controller.signal.throwIfAborted();
    const local = new AbortController();
    const abort = () => local.abort(operation.controller.signal.reason);
    operation.controller.signal.addEventListener('abort', abort, { once: true });
    const { signal } = local;
    const timer = setTimeout(() => local.abort(new RequestFailure('timeout')), timeout);
    let received: Response | undefined;
    try {
      const pending = fetch(url, { ...init, redirect: 'error', credentials: 'omit', cache: 'no-store', signal }).then(response => {
        if (signal.aborted) { cancelBody(response, operation); throw signal.reason; }
        received = response;
        return response;
      });
      const response = await abortable(tracked(operation, pending), signal);
      if (response.url && response.url !== new URL(url).href) throw new RequestFailure('invalid_provider_response');
      received = undefined;
      if (!accept.includes(response.status)) {
        cancelBody(response, operation);
        return { status: response.status, retryAfter: retryAfter(response), bytes: null };
      }
      return { status: response.status, retryAfter: retryAfter(response), bytes: await readOutput(response, operation, signal, mesh) };
    } finally {
      clearTimeout(timer);
      operation.controller.signal.removeEventListener('abort', abort);
      if (received) cancelBody(received, operation);
    }
  }
  function checkedReference(input: Input): StoredReference {
    let stored: unknown;
    try { stored = options.readReference?.(input.referenceId) ?? null; } catch { stored = null; }
    if (!record(stored) || !record(stored.reference)) throw new RequestFailure('reference_not_found');
    const reference = stored.reference;
    if (reference.id !== input.referenceId) throw new RequestFailure('reference_not_found');
    if (reference.requestId !== input.requestId) throw new RequestFailure('reference_mismatch');
    if (reference.source !== 'provider' && reference.source !== 'synthetic') throw new RequestFailure('invalid_reference');
    if (reference.source === 'synthetic' && source === 'provider') throw new RequestFailure('synthetic_reference');
    if (reference.provider !== 'openai') throw new RequestFailure('invalid_reference');
    if (!(stored.bytes instanceof Uint8Array) || stored.bytes.byteLength > REFERENCE_PNG_1024_LIMITS.maxBytes || typeof reference.sha256 !== 'string'
      || createHash('sha256').update(stored.bytes).digest('hex') !== reference.sha256) throw new RequestFailure('invalid_reference');
    return stored as StoredReference;
  }

  const handle = async (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void): Promise<void> => {
    if (!req.url?.startsWith(endpoint)) { next(); return; }
    const headers = () => {
      res.setHeader('cache-control', 'no-store');
      res.setHeader('x-content-type-options', 'nosniff');
    };
    const reply = (status: number, body: unknown) => {
      if (res.destroyed || res.writableEnded) return;
      res.statusCode = status;
      headers();
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };
    let operation: Operation | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let uploadTimer: ReturnType<typeof setTimeout> | undefined;
    let submitted = false;
    let accepted = false;
    const disconnect = () => operation?.controller.abort(new RequestFailure('cancelled'));
    const requestClose = () => { if (!req.complete) disconnect(); };
    const responseClose = () => { if (!res.writableEnded) disconnect(); };
    req.on('error', disconnect);
    res.on('error', disconnect);
    try {
      const asset = req.url === endpoint ? null : new RegExp(`^${endpoint}/([A-Za-z0-9_-]{16,128})$`).exec(req.url)?.[1];
      if (asset === undefined) throw new RequestFailure('not_found');
      const protectedHeaders = new Set(['host', 'origin', 'content-type', 'content-length', 'content-encoding', 'transfer-encoding', 'sec-fetch-site']);
      const seen = new Set<string>();
      for (let index = 0; index < req.rawHeaders.length; index += 2) {
        const name = req.rawHeaders[index].toLowerCase();
        if (protectedHeaders.has(name) && seen.has(name)) throw new RequestFailure('forbidden');
        seen.add(name);
      }
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || req.headers.host !== host
        || (req.headers.origin !== undefined && req.headers.origin !== origin) || (req.method === 'POST' && req.headers.origin !== origin)
        || (req.headers['sec-fetch-site'] !== undefined && req.headers['sec-fetch-site'] !== 'same-origin' && req.headers['sec-fetch-site'] !== 'none')) throw new RequestFailure('forbidden');
      if ((req.method !== 'GET' && req.method !== 'POST') || (asset !== null && req.method !== 'GET')) {
        res.setHeader('allow', asset === null ? 'GET, POST' : 'GET');
        throw new RequestFailure('method');
      }
      if (asset !== null) {
        const stored = meshes.get(asset);
        if (!stored) throw new RequestFailure('not_found');
        if (res.destroyed || res.writableEnded) return;
        res.statusCode = 200;
        headers();
        res.setHeader('content-type', 'model/gltf-binary');
        res.setHeader('content-length', stored.bytes.length);
        res.setHeader('x-eva-mesh-source', stored.mesh.source);
        res.setHeader('x-eva-mesh-request-id', stored.mesh.requestId);
        res.setHeader('x-eva-mesh-sha256', stored.mesh.sha256);
        res.end(stored.bytes);
        return;
      }
      const reason = unavailable();
      if (req.method === 'GET') {
        reply(reason ? failures[reason][0] : 200, { available: reason === null, reason, provider: 'meshy', model, credentialStatus: 'unchecked',
          remainingRequests: 3 - attempts, pendingTransport: (active?.pending ?? 0) > 0 });
        return;
      }
      if (reason) throw new RequestFailure(reason);
      if (!jsonType(req.headers['content-type']) || (req.headers['content-encoding'] !== undefined && req.headers['content-encoding'] !== 'identity')) throw new RequestFailure('content_type');
      const length = req.headers['content-length'];
      if (length !== undefined) {
        if (typeof length !== 'string' || !/^\d+$/.test(length) || req.headers['transfer-encoding'] !== undefined) throw new RequestFailure('invalid_request');
        if (Number(length) > requestByteLimit) throw new RequestFailure('request_too_large');
      }
      const current: Operation = { controller: new AbortController(), pending: 0, finished: false, release: () => {
        if (current.finished && current.pending === 0 && active === current) active = null;
      } };
      operation = current;
      active = current;
      const { signal } = current.controller;
      req.on('aborted', disconnect);
      req.on('close', requestClose);
      res.on('close', responseClose);
      timer = setTimeout(() => current.controller.abort(new RequestFailure('timeout')), 600000);
      uploadTimer = setTimeout(() => current.controller.abort(new RequestFailure('timeout')), 5000);
      if (req.aborted || (req.destroyed && !req.complete) || res.destroyed) disconnect();
      const input = await readInput(req, signal);
      clearTimeout(uploadTimer);
      uploadTimer = undefined;
      signal.throwIfAborted();
      if (submittedIds.has(input.requestId) || consumedReferences.has(input.referenceId)) throw new RequestFailure('duplicate_request');
      const stored = checkedReference(input);
      let dimensions: { width: number; height: number };
      try { dimensions = await validatePropReferencePng(Buffer.from(stored.bytes), signal, REFERENCE_PNG_1024_LIMITS); }
      catch (error) { if (signal.aborted) throw signal.reason; throw new RequestFailure('invalid_reference', pngReason(error)); }
      signal.throwIfAborted();
      if (dimensions.width !== 1024 || dimensions.height !== 1024 || stored.reference.width !== 1024 || stored.reference.height !== 1024) throw new RequestFailure('invalid_reference', 'dimensions');
      let apiKey: string | undefined;
      try { apiKey = options.getApiKey?.()?.trim(); } catch { throw new RequestFailure('missing_key'); }
      if (!apiKey || apiKey.length > 4096 || /[\r\n\0]/.test(apiKey)) throw new RequestFailure('missing_key');
      signal.throwIfAborted();
      const apiHeaders = { authorization: `Bearer ${apiKey}`, accept: 'application/json', 'accept-encoding': 'identity' };
      const body = JSON.stringify({
        image_url: `data:image/png;base64,${Buffer.from(stored.bytes).toString('base64')}`,
        model_type: 'smart-topology', ai_model: model, target_polycount: 10000, should_texture: false, target_formats: ['glb'],
      });
      // An attempted submit consumes its allowance even when acceptance, billing or cancellation is uncertain.
      attempts += 1;
      submittedIds.add(input.requestId);
      consumedReferences.add(input.referenceId);
      submitted = true;
      const created = await fetchBytes(current, createUrl, { method: 'POST', headers: { ...apiHeaders, 'content-type': 'application/json' }, body }, false, 60000, [200, 202]);
      if (!created.bytes) {
        const code = created.status;
        throw new RequestFailure(code === 400 ? 'invalid_request_upstream' : code === 401 ? 'provider_auth' : code === 402 ? 'provider_payment'
          : code === 403 ? 'provider_rejected' : code === 429 ? 'provider_busy' : code >= 500 ? 'submission_uncertain' : 'invalid_provider_response');
      }
      const taskId = createdTask(parseJson(created.bytes));
      accepted = true;
      const pollUrl = `${createUrl}/${taskId}`;
      let failuresInRow = 0;
      let delay = 0;
      for (let polls = 0; polls < 60; polls += 1) {
        if (polls) await wait(delay, signal);
        signal.throwIfAborted();
        let polled: Reply;
        try { polled = await fetchBytes(current, pollUrl, { method: 'GET', headers: apiHeaders }, false, 30000, [200]); }
        catch (error) {
          if (signal.aborted) throw signal.reason;
          // Reads do not spend: network errors and per-poll timeouts are tolerated; malformed responses are not.
          if (error instanceof RequestFailure && error.code !== 'timeout') throw error;
          if (++failuresInRow > 3) throw new RequestFailure('poll_uncertain');
          delay = 5000;
          continue;
        }
        if (!polled.bytes) {
          if (polled.status !== 429 && polled.status < 500) throw new RequestFailure('provider_rejected');
          if (++failuresInRow > 3) throw new RequestFailure('poll_uncertain');
          delay = polled.retryAfter;
          continue;
        }
        failuresInRow = 0;
        const task = parseJson(polled.bytes);
        if (!record(task) || task.id !== taskId || task.type !== 'image-to-3d' || typeof task.status !== 'string') throw new RequestFailure('invalid_provider_response');
        if (task.status === 'PENDING' || task.status === 'IN_PROGRESS') { delay = polled.retryAfter; continue; }
        if (task.status === 'FAILED') throw new RequestFailure('provider_failed');
        if (task.status === 'CANCELED') throw new RequestFailure('provider_rejected');
        if (task.status !== 'SUCCEEDED' || !record(task.model_urls)) throw new RequestFailure('invalid_provider_response');
        const url = assetUrl(task.model_urls.glb, taskId);
        const downloaded = await fetchBytes(current, url, { method: 'GET', headers: { accept: 'model/gltf-binary', 'accept-encoding': 'identity' } }, true, 60000, [200]);
        if (!downloaded.bytes) throw new RequestFailure('provider_rejected');
        signal.throwIfAborted();
        const bytes = downloaded.bytes;
        try { await validatePropGlb(new Uint8Array(bytes).buffer, signal); }
        catch { if (signal.aborted) throw signal.reason; throw new RequestFailure('invalid_mesh'); }
        signal.throwIfAborted();
        const id = randomUUID();
        if (meshes.size >= 3 || meshes.has(id)) throw new RequestFailure('invalid_mesh');
        const mesh: Mesh = Object.freeze({ id, requestId: input.requestId, referenceId: input.referenceId,
          source: source === 'synthetic' || stored.reference.source === 'synthetic' ? 'synthetic' : 'provider', provider: 'meshy', model,
          bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
        meshes.set(id, { mesh, bytes });
        reply(200, { mesh, remainingRequests: 3 - attempts });
        return;
      }
      throw new RequestFailure('poll_limit');
    } catch (error) {
      const cause: unknown = operation?.controller.signal.aborted ? operation.controller.signal.reason : error;
      const failure = cause instanceof RequestFailure ? cause : new RequestFailure(submitted && !accepted ? 'submission_uncertain' : 'invalid_provider_response');
      const message = !submitted && (failure.code === 'timeout' || failure.code === 'cancelled')
        ? 'Request stopped locally before submission. No provider request was sent.' : failure.message;
      reply(failure.status, { error: failure.code, ...(failure.reason ? { reason: failure.reason } : {}), message,
        remainingRequests: 3 - attempts, remoteCancelled: false });
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      if (uploadTimer !== undefined) clearTimeout(uploadTimer);
      req.off('aborted', disconnect);
      req.off('close', requestClose);
      res.off('close', responseClose);
      if (req.closed) req.off('error', disconnect); else req.once('close', () => req.off('error', disconnect));
      if (res.closed) res.off('error', disconnect); else res.once('close', () => res.off('error', disconnect));
      if (operation) {
        operation.controller.abort(new RequestFailure('cancelled'));
        operation.finished = true;
        // A timeout releases the local waiter, not an ignored-abort fetch/read/cancel promise.
        operation.release();
      }
      if (!req.readableEnded) req.resume();
    }
  };
  return handle;
}
