import { Buffer } from 'node:buffer';
import type { IncomingMessage, ServerResponse } from 'node:http';

const endpoint = '/api/speech';
const models = { transcription: 'scribe_v2_realtime', speech: 'eleven_v3' } as const;
const failures = {
  not_found: [404, 'Unknown speech endpoint.'],
  forbidden: [403, 'Speech requires the configured local origin and a loopback connection.'],
  method: [405, 'Use GET for speech status and POST for an explicit speech request.'],
  content_type: [415, 'Send uncompressed UTF-8 application/json.'],
  invalid_request: [400, 'Send only an empty token request or nonempty speech text of at most 2,000 characters.'],
  request_too_large: [413, 'Speech request exceeds 12 KiB.'],
  disabled: [503, 'Speech is not enabled.'],
  privacy_unconfirmed: [503, 'Operator confirmation of logging-disabled provider entitlement is required. This flag does not verify provider retention.'],
  missing_key: [503, 'The dedicated server-side speech key is not configured.'],
  missing_voice: [503, 'A valid speech voice must be configured explicitly.'],
  busy: [409, 'Another speech request is in progress.'],
  budget_exhausted: [429, 'The three-attempt speech allowance is exhausted.'],
  provider_rejected: [502, 'The speech provider rejected the request. No retry or logging-enabled fallback was made.'],
  provider_unavailable: [502, 'The speech provider is unavailable. No retry was made.'],
  invalid_provider_response: [502, 'The speech provider returned an invalid or oversized response.'],
  timeout: [504, 'Speech timed out locally. Provider charges may still apply.'],
  cancelled: [499, 'Speech was cancelled locally. Provider charges may still apply.'],
} as const;
class RequestFailure extends Error {
  code: keyof typeof failures;
  status: number;
  constructor(code: keyof typeof failures) { super(failures[code][1]); this.code = code; this.status = failures[code][0]; }
}
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function jsonType(value: unknown) { return typeof value === 'string' && /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(value.trim()); }
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
function readInput(req: IncomingMessage, signal: AbortSignal, speak: boolean): Promise<string | null> {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    let settled = false;
    const chunks: Buffer[] = [];
    const finish = (error?: unknown, text: string | null = null) => {
      if (settled) return;
      settled = true;
      req.off('data', data);
      req.off('end', end);
      signal.removeEventListener('abort', abort);
      if (error) { req.resume(); reject(error); } else resolve(text);
    };
    const abort = () => finish(signal.reason);
    const data = (chunk: Buffer) => {
      if (!Buffer.isBuffer(chunk)) { finish(new RequestFailure('invalid_request')); return; }
      bytes += chunk.byteLength;
      if (bytes > 12 * 1024 || chunks.length >= 12 * 1024) { finish(new RequestFailure('request_too_large')); return; }
      chunks.push(chunk);
    };
    const end = () => {
      try {
        const length = req.headers['content-length'];
        if (length !== undefined && Number(length) !== bytes) throw new Error('length');
        const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
        if (!record(value) || Object.keys(value).length !== (speak ? 1 : 0)) throw new Error('shape');
        if (!speak) { finish(); return; }
        if (!Object.hasOwn(value, 'text') || typeof value.text !== 'string' || !value.text.trim() || value.text.length > 2000) throw new Error('text');
        finish(undefined, value.text);
      } catch { finish(new RequestFailure('invalid_request')); }
    };
    if (signal.aborted) { abort(); return; }
    if (req.readableEnded) { finish(new RequestFailure('invalid_request')); return; }
    signal.addEventListener('abort', abort, { once: true });
    req.on('data', data);
    req.once('end', end);
  });
}
function cancelBody(response: Response) { void response.body?.cancel().catch(() => {}); }
async function providerBytes(response: Response, signal: AbortSignal, speak: boolean) {
  if (signal.aborted) { cancelBody(response); throw signal.reason; }
  if (!response.ok) { cancelBody(response); throw new RequestFailure('provider_rejected'); }
  const limit = speak ? 2 * 1024 * 1024 : 4096;
  const length = response.headers.get('content-length');
  const encoding = response.headers.get('content-encoding');
  const type = response.headers.get('content-type');
  if (!(speak ? type?.trim().toLowerCase() === 'audio/mpeg' : jsonType(type)) || !response.body
    || (encoding !== null && encoding !== 'identity') || (length !== null && (!/^\d+$/.test(length) || Number(length) > limit))) {
    cancelBody(response);
    throw new RequestFailure('invalid_provider_response');
  }
  const reader = response.body.getReader();
  let cancelled = false;
  const cancel = () => { if (!cancelled) { cancelled = true; void reader.cancel().catch(() => {}); } };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let complete = false;
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await abortable(reader.read(), signal);
      if (chunk.done) { complete = true; break; }
      bytes += chunk.value.byteLength;
      if (bytes > limit || chunks.length >= limit) throw new RequestFailure('invalid_provider_response');
      chunks.push(chunk.value);
    }
    signal.throwIfAborted();
    if (!bytes || (length !== null && Number(length) !== bytes)) throw new RequestFailure('invalid_provider_response');
    return Buffer.concat(chunks);
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    throw error instanceof RequestFailure ? error : new RequestFailure('invalid_provider_response');
  } finally {
    signal.removeEventListener('abort', cancel);
    if (!complete) cancel();
    reader.releaseLock();
  }
}

export function createSpeechHandler(options: {
  origin: string; enabled?: boolean; privacyConfirmed?: boolean; apiKey?: string; voiceId?: string; fetch?: typeof globalThis.fetch;
}) {
  if (options.origin !== 'http://127.0.0.1:5173' && options.origin !== 'http://127.0.0.1:4173') throw new Error('Speech origin must be an approved loopback origin.');
  const origin = options.origin;
  const host = new URL(origin).host;
  const enabled = options.enabled === true;
  const privacyConfirmed = options.privacyConfirmed === true;
  const permitted = enabled && privacyConfirmed;
  const apiKey = permitted ? options.apiKey?.trim() : undefined;
  const voiceId = permitted ? options.voiceId?.trim() : undefined;
  const fetch = options.fetch ?? globalThis.fetch;
  let attempts = 0;
  let active: AbortController | null = null;
  const unavailable = () => !enabled ? 'disabled' : !privacyConfirmed ? 'privacy_unconfirmed' : !apiKey ? 'missing_key'
    : !voiceId || !/^[a-zA-Z0-9_-]{1,64}$/.test(voiceId) ? 'missing_voice' : active ? 'busy' : attempts >= 3 ? 'budget_exhausted' : null;
  return async (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void): Promise<void> => {
    if (!req.url?.startsWith(endpoint)) { next(); return; }
    const reply = (status: number, body: unknown, audio = false) => {
      if (res.destroyed || res.writableEnded) return;
      res.statusCode = status;
      res.setHeader('content-type', audio ? 'audio/mpeg' : 'application/json; charset=utf-8');
      res.setHeader('cache-control', 'no-store');
      res.setHeader('x-content-type-options', 'nosniff');
      res.end(audio ? body as Buffer : JSON.stringify(body));
    };
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const disconnect = () => controller?.abort(new RequestFailure('cancelled'));
    const requestClose = () => { if (!req.complete) disconnect(); };
    const responseClose = () => { if (!res.writableEnded) disconnect(); };
    req.on('error', disconnect);
    res.on('error', disconnect);
    try {
      if (![endpoint, `${endpoint}/token`, `${endpoint}/speak`].includes(req.url)) throw new RequestFailure('not_found');
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
      const status = req.url === endpoint;
      if (req.method !== (status ? 'GET' : 'POST')) { res.setHeader('allow', status ? 'GET' : 'POST'); throw new RequestFailure('method'); }
      const reason = unavailable();
      if (status) { reply(reason ? failures[reason][0] : 200, { available: reason === null, reason, remainingRequests: 3 - attempts, models }); return; }
      if (reason) throw new RequestFailure(reason);
      if (!jsonType(req.headers['content-type']) || (req.headers['content-encoding'] !== undefined && req.headers['content-encoding'] !== 'identity')) throw new RequestFailure('content_type');
      const length = req.headers['content-length'];
      if (length !== undefined) {
        if (typeof length !== 'string' || !/^\d+$/.test(length) || req.headers['transfer-encoding'] !== undefined) throw new RequestFailure('invalid_request');
        if (Number(length) > 12 * 1024) throw new RequestFailure('request_too_large');
      }
      controller = new AbortController();
      active = controller;
      const operation = controller;
      const { signal } = operation;
      req.on('aborted', disconnect);
      req.on('close', requestClose);
      res.on('close', responseClose);
      timer = setTimeout(() => operation.abort(new RequestFailure('timeout')), 30000);
      if (req.aborted || (req.destroyed && !req.complete) || res.destroyed) disconnect();
      const speak = req.url === `${endpoint}/speak`;
      const text = await readInput(req, signal, speak);
      signal.throwIfAborted();
      attempts += 1;
      const url = speak ? `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128&enable_logging=false`
        : 'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe';
      // Retain ownership until abortable actually delivers the fulfilled response.
      let received: Response | undefined;
      const pending = fetch(url, {
        method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store', signal,
        headers: { 'xi-api-key': apiKey!, 'content-type': 'application/json', 'accept-encoding': 'identity', accept: speak ? 'audio/mpeg' : 'application/json' },
        body: speak ? JSON.stringify({ text, model_id: models.speech }) : undefined,
      }).then(response => {
        if (signal.aborted) { cancelBody(response); throw signal.reason; }
        received = response;
        return response;
      });
      const response = await abortable(pending, signal).catch(error => {
        if (received) cancelBody(received);
        throw error;
      });
      const bytes = await providerBytes(response, signal, speak);
      signal.throwIfAborted();
      if (speak) reply(200, bytes, true);
      else {
        let value: unknown;
        try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
        catch { throw new RequestFailure('invalid_provider_response'); }
        if (!record(value) || Object.keys(value).length !== 1 || typeof value.token !== 'string' || !value.token.trim() || value.token.length > 2048) throw new RequestFailure('invalid_provider_response');
        reply(200, { token: value.token });
      }
    } catch (error) {
      const failure: RequestFailure = controller?.signal.aborted ? controller.signal.reason : error instanceof RequestFailure ? error : new RequestFailure('provider_unavailable');
      reply(failure.status, { error: failure.code, message: failure.message, remainingRequests: 3 - attempts });
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      req.off('aborted', disconnect);
      req.off('close', requestClose);
      res.off('close', responseClose);
      if (req.closed) req.off('error', disconnect); else req.once('close', () => req.off('error', disconnect));
      if (res.closed) res.off('error', disconnect); else res.once('close', () => res.off('error', disconnect));
      controller?.abort(new RequestFailure('cancelled'));
      if (controller && active === controller) active = null;
      if (!req.readableEnded) req.resume();
    }
  };
}
