import type { createRoomCompositionController } from './room-composition.ts';
import { PNG_REJECTION_REASONS, type PngRejectionReason } from './prop-png-admission.ts';
import type { RoomPropRequest } from './room-prop-request.ts';
import type { RoomPropInstaller } from './room-prop-visual.ts';
import { verifiedMesh } from './verified-mesh.ts';

// Fixed route codes only (keys of the server `failures` tables); the server `message` is never read.
const imageCodes = ['not_found', 'forbidden', 'method', 'content_type', 'invalid_request', 'request_too_large', 'disabled',
  'spending_unconfirmed', 'missing_key', 'busy', 'duplicate_request', 'budget_exhausted', 'submission_uncertain', 'provider_rejected',
  'provider_auth', 'provider_busy', 'invalid_provider_response', 'invalid_image', 'timeout', 'cancelled'] as const;
const meshCodes = ['not_found', 'forbidden', 'method', 'content_type', 'invalid_request', 'request_too_large', 'disabled',
  'spending_unconfirmed', 'missing_key', 'busy', 'duplicate_request', 'budget_exhausted', 'reference_not_found', 'reference_mismatch',
  'synthetic_reference', 'invalid_reference', 'invalid_request_upstream', 'provider_auth', 'provider_payment', 'provider_busy',
  'submission_uncertain', 'provider_rejected', 'provider_failed', 'invalid_provider_response', 'invalid_mesh', 'poll_limit',
  'poll_uncertain', 'timeout', 'cancelled'] as const;
const statusKeys = ['available', 'reason', 'provider', 'model', 'credentialStatus', 'remainingRequests', 'pendingTransport'];
const statusCodes = { disabled: 503, spending_unconfirmed: 503, busy: 409, budget_exhausted: 429 } as const;
const localId = /^[A-Za-z0-9_-]{16,128}$/;

type Controller = ReturnType<typeof createRoomCompositionController>;
export type PropRouteStatus = { phase: 'ready' | keyof typeof statusCodes | 'unreachable'; remaining: number | null };
export type PropGenerationStatus = { image: PropRouteStatus; mesh: PropRouteStatus };
export type PropGenerationStage = 'image' | 'mesh' | 'retrieve' | 'install';
export type PropGenerationResult = { outcome: 'installed' }
  | { outcome: 'failed'; stage: PropGenerationStage; code: string; reason?: PngRejectionReason }
  | { outcome: 'stopped'; submitted: boolean };

export class RouteFailure extends Error {
  readonly code: string;
  readonly reason: PngRejectionReason | undefined;
  constructor(code: string, reason?: PngRejectionReason) { super(code); this.code = code; this.reason = reason; }
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

// Settle on local abort even when the transport ignores it.
function abortable<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(signal.reason); };
    signal.addEventListener('abort', abort, { once: true });
    pending.then(value => { signal.removeEventListener('abort', abort); resolve(value); },
      error => { signal.removeEventListener('abort', abort); reject(error); });
    if (signal.aborted) abort();
  });
}

async function readJson(response: Response, signal: AbortSignal, limit: number): Promise<unknown> {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get('content-type')?.trim() ?? '') || !response.body) {
    void response.body?.cancel().catch(() => {});
    throw new Error('Invalid response.');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await abortable(reader.read(), signal);
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) throw new Error('Invalid response.');
      chunks.push(chunk.value);
    }
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
}

export async function readRoute(path: string, provider: 'openai' | 'meshy' | 'worldlabs', signal: AbortSignal): Promise<PropRouteStatus> {
  try {
    const response = await abortable(fetch(path, { method: 'GET', credentials: 'same-origin', redirect: 'error', cache: 'no-store', signal }), signal);
    const value = await readJson(response, signal, 4096);
    if (!record(value) || Object.keys(value).length !== statusKeys.length || !statusKeys.every(key => Object.hasOwn(value, key))
      || value.provider !== provider || typeof value.model !== 'string' || value.credentialStatus !== 'unchecked'
      || typeof value.pendingTransport !== 'boolean' || typeof value.remainingRequests !== 'number'
      || !Number.isInteger(value.remainingRequests) || value.remainingRequests < 0 || value.remainingRequests > 3) throw new Error('Invalid status.');
    const remaining = value.remainingRequests;
    if (value.available === true && value.reason === null && response.status === 200 && remaining > 0) {
      return { phase: value.pendingTransport ? 'busy' : 'ready', remaining };
    }
    const reason = value.reason as keyof typeof statusCodes;
    if (value.available === false && Object.hasOwn(statusCodes, reason) && response.status === statusCodes[reason]
      && (reason !== 'budget_exhausted' || remaining === 0)) return { phase: reason, remaining };
  } catch { /* Any unreadable or inconsistent status is unreachable. */ }
  return { phase: 'unreachable', remaining: null };
}

export async function readPropGenerationStatus(signal: AbortSignal): Promise<PropGenerationStatus> {
  const [image, mesh] = await Promise.all([readRoute('/api/prop-reference-image', 'openai', signal), readRoute('/api/prop-mesh', 'meshy', signal)]);
  return { image, mesh };
}

export async function post(path: string, body: unknown, codes: readonly string[], signal: AbortSignal): Promise<Record<string, unknown>> {
  let response: Response;
  let value: unknown;
  try {
    response = await abortable(fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      credentials: 'same-origin', redirect: 'error', cache: 'no-store', signal }), signal);
  } catch (error) { if (signal.aborted) throw error; throw new RouteFailure('unreachable'); }
  try { value = await readJson(response, signal, 16 * 1024); }
  catch (error) { if (signal.aborted) throw error; throw new RouteFailure('invalid_response'); }
  if (!record(value)) throw new RouteFailure('invalid_response');
  const data = value;
  if (response.status === 200) return data;
  const code = codes.find(item => item === data.error);
  if (!code) throw new RouteFailure('invalid_response');
  throw new RouteFailure(code, PNG_REJECTION_REASONS.find(item => item === data.reason));
}

// One paid attempt for the exact prepared request; no retries. Abort or lost ownership returns 'stopped' and never installs.
export async function runPropGeneration({ controller, request, installer, signal }: {
  controller: Controller; request: RoomPropRequest; installer: RoomPropInstaller; signal: AbortSignal;
}): Promise<PropGenerationResult> {
  let submitted = false;
  let stage: PropGenerationStage = 'image';
  const current = () => !signal.aborted && controller.isPropRequestCurrent(request);
  const stopped = (): PropGenerationResult => ({ outcome: 'stopped', submitted });
  if (!current()) return stopped();
  const requestId = crypto.randomUUID();
  try {
    if (!controller.advancePropRequest(request, 'reference-image')) return stopped();
    submitted = true;
    const { reference } = await post('/api/prop-reference-image', { requestId, visual: request.visual }, imageCodes, signal);
    if (!record(reference) || reference.requestId !== requestId || typeof reference.id !== 'string' || !localId.test(reference.id)) {
      throw new RouteFailure('invalid_response');
    }
    if (!current()) return stopped();
    stage = 'mesh';
    if (!controller.advancePropRequest(request, 'mesh')) return stopped();
    const { mesh } = await post('/api/prop-mesh', { requestId, referenceId: reference.id }, meshCodes, signal);
    if (!record(mesh) || mesh.requestId !== requestId || mesh.referenceId !== reference.id || typeof mesh.id !== 'string'
      || !localId.test(mesh.id) || typeof mesh.bytes !== 'number' || typeof mesh.sha256 !== 'string') throw new RouteFailure('invalid_response');
    if (!current()) return stopped();
    stage = 'retrieve';
    if (!controller.advancePropRequest(request, 'retrieving')) return stopped();
    let bytes: ArrayBuffer;
    try { bytes = await verifiedMesh(`/api/prop-mesh/${mesh.id}`, { bytes: mesh.bytes, sha256: mesh.sha256 }, signal, () => {}); }
    catch { if (!current()) return stopped(); throw new RouteFailure('mesh_retrieval_failed'); }
    if (!current()) return stopped();
    stage = 'install';
    if (await controller.installProp(request, bytes, installer, { caseColor: true })) return { outcome: 'installed' };
    const { props } = controller.getState();
    // The controller phase, not our signal, decides: App's currency guard may abort the signal on this very failure.
    return props.phase === 'failed' && props.reason ? { outcome: 'failed', stage, code: props.reason } : stopped();
  } catch (error) {
    if (!current()) return stopped();
    const failure = error instanceof RouteFailure ? error : new RouteFailure('invalid_response');
    controller.advancePropRequest(request, 'failed');
    return { outcome: 'failed', stage, code: failure.code, ...(failure.reason ? { reason: failure.reason } : {}) };
  }
}
