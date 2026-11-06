export type SpeechState = {
  phase: 'idle' | 'connecting' | 'listening' | 'committing' | 'loading' | 'speaking' | 'error';
  microphone: boolean;
  interim: string;
  error: string | null;
  disposed: boolean;
};
export const EMPTY_SPEECH: SpeechState = { phase: 'idle', microphone: false, interim: '', error: null, disposed: false };
type Capture = { stop(): void };
type Playback = Capture & { play(): Promise<void> };
type SpeechSocket = EventTarget & { readyState: number; bufferedAmount: number; send(value: string): void; close(): void };
export type SpeechResources = {
  startCapture(signal: AbortSignal, onChunk: (pcm: Uint8Array) => void, onEnded: () => void): Promise<Capture>;
  openSocket(url: string): SpeechSocket;
  createPlayback(blob: Blob, onEnded: () => void, onError: () => void): Playback;
};
class SpeechFailure extends Error {}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
    promise.then(value => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) reject(signal.reason); else resolve(value);
    }, error => { signal.removeEventListener('abort', abort); reject(error); });
  });
}
function cancelBody(response: Response) { void response.body?.cancel().catch(() => {}); }
async function fetchResponse(fetch: typeof globalThis.fetch, url: string, init: RequestInit, signal: AbortSignal) {
  signal.throwIfAborted();
  // Retain ownership until abortable actually delivers the fulfilled response.
  let received: Response | undefined;
  return abortable(fetch(url, { credentials: 'same-origin', redirect: 'error', cache: 'no-store', ...init, signal }).then(response => {
    if (signal.aborted) { cancelBody(response); throw signal.reason; }
    received = response;
    return response;
  }), signal).catch(error => {
    if (received) cancelBody(received);
    throw error;
  });
}
async function responseBytes(response: Response, signal: AbortSignal, limit: number, audio = false) {
  const length = response.headers.get('content-length');
  const type = response.headers.get('content-type')?.trim() ?? '';
  const validType = audio ? /^audio\/mpeg$/i.test(type) : /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type);
  const invalid = () => new SpeechFailure('Speech returned an invalid or oversized response. No retry was made.');
  if (signal.aborted || !validType || !response.body || (length !== null && (!/^\d+$/.test(length) || Number(length) > limit))) {
    cancelBody(response);
    throw invalid();
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
      if (bytes > limit || chunks.length >= limit) throw invalid();
      chunks.push(chunk.value);
    }
    signal.throwIfAborted();
    if (!bytes || (length !== null && Number(length) !== bytes)) throw invalid();
    const result = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return result;
  } finally {
    signal.removeEventListener('abort', cancel);
    if (!complete) cancel();
    reader.releaseLock();
  }
}
async function responseJson(response: Response, signal: AbortSignal) {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await responseBytes(response, signal, 4096))) as unknown;
}
export type SpeechAvailability = {
  phase: 'unchecked' | 'checking' | 'ready' | 'disabled' | 'privacy_unconfirmed' | 'missing_key' | 'missing_voice' | 'busy' | 'budget_exhausted' | 'unreachable';
  remaining: number | null;
};
export async function readSpeechAvailability(signal: AbortSignal): Promise<SpeechAvailability> {
  const response = await fetchResponse(globalThis.fetch, '/api/speech', { method: 'GET' }, signal);
  const data = await responseJson(response, signal);
  if (!record(data) || Object.keys(data).length !== 4 || !record(data.models) || Object.keys(data.models).length !== 2
    || data.models.transcription !== 'scribe_v2_realtime' || data.models.speech !== 'eleven_v3'
    || typeof data.remainingRequests !== 'number' || !Number.isInteger(data.remainingRequests) || data.remainingRequests < 0 || data.remainingRequests > 3) throw new Error('Invalid speech status.');
  const remaining = data.remainingRequests;
  if (data.available === true && data.reason === null && response.status === 200 && remaining > 0) return { phase: 'ready', remaining };
  if (data.available === false) {
    switch (data.reason) {
      case 'disabled': case 'privacy_unconfirmed': case 'missing_key': case 'missing_voice':
        if (response.status === 503) return { phase: data.reason, remaining };
        break;
      case 'busy': if (response.status === 409) return { phase: 'busy', remaining }; break;
      case 'budget_exhausted': if (response.status === 429 && remaining === 0) return { phase: 'budget_exhausted', remaining }; break;
    }
  }
  throw new Error('Invalid speech status.');
}

type Operation = {
  controller: AbortController;
  timers: Set<ReturnType<typeof setTimeout>>;
  capture?: Capture;
  socket?: SpeechSocket;
  playback?: Playback;
  detach?: () => void;
  tail?: Uint8Array;
};
export function createSpeechController(options: {
  fetch?: typeof globalThis.fetch;
  resources: SpeechResources;
  onStatus?: (state: SpeechState) => void;
  onTranscript?: (text: string) => void;
}) {
  const fetch = options.fetch ?? globalThis.fetch;
  let state = { ...EMPTY_SPEECH };
  let active: Operation | null = null;
  let transitioning = false;
  let cleanupError: string | null = null;
  const getState = () => ({ ...state });
  const notify = () => options.onStatus?.(getState());
  const current = (operation: Operation) => !state.disposed && active === operation && !operation.controller.signal.aborted;
  function clearTimers(operation: Operation) {
    for (const timer of operation.timers) clearTimeout(timer);
    operation.timers.clear();
  }
  function retire(operation: Operation, error: string | null = null) {
    if (active !== operation) return;
    active = null;
    state = { ...state, phase: error ? 'error' : 'idle', microphone: false, interim: '', error };
    transitioning = true;
    clearTimers(operation);
    operation.tail = undefined;
    operation.detach?.();
    operation.controller.abort();
    for (const release of [() => operation.capture?.stop(), () => operation.socket?.close(), () => operation.playback?.stop()]) {
      try { release(); } catch {
        cleanupError = 'Speech cleanup failed. A device or playback resource may remain active; reload only after checking devices.';
        state.error = cleanupError;
        state.phase = 'error';
      }
    }
    operation.capture = undefined;
    operation.socket = undefined;
    operation.playback = undefined;
    transitioning = false;
    notify();
  }
  function deadline(operation: Operation, milliseconds: number, message: string) {
    const timer = setTimeout(() => { if (current(operation)) retire(operation, message); }, milliseconds);
    operation.timers.add(timer);
    return timer;
  }
  function stop() {
    if (transitioning || state.disposed) return;
    if (active) retire(active);
    else { state = { ...EMPTY_SPEECH, phase: cleanupError ? 'error' : 'idle', error: cleanupError }; notify(); }
  }
  function begin(phase: SpeechState['phase']) {
    if (transitioning || state.disposed || cleanupError) return null;
    if (active) retire(active);
    if (active || state.disposed || cleanupError) return null;
    const operation: Operation = { controller: new AbortController(), timers: new Set() };
    active = operation;
    state = { ...EMPTY_SPEECH, phase };
    notify();
    return operation;
  }
  function sendChunk(operation: Operation, pcm: Uint8Array, commit: boolean) {
    const socket = operation.socket;
    if (!socket || socket.readyState !== 1 || socket.bufferedAmount > 128 * 1024) throw new SpeechFailure('Speech connection cannot accept more audio. No retry was made.');
    socket.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: btoa(Array.from(pcm, byte => String.fromCharCode(byte)).join('')), commit, sample_rate: 16000 }));
  }
  async function startListening(): Promise<boolean> {
    const operation = begin('connecting');
    if (!operation) return false;
    const { signal } = operation.controller;
    try {
      signal.throwIfAborted();
      const connectionTimer = deadline(operation, 10000, 'Microphone or speech connection timed out locally. Charges may still apply.');
      const capture = await abortable(options.resources.startCapture(signal, pcm => {
        if (!current(operation) || state.phase !== 'listening') return;
        try {
          if (!(pcm instanceof Uint8Array) || !pcm.byteLength || pcm.byteLength > 32000 || pcm.byteLength % 2) throw new SpeechFailure('Microphone returned invalid mono PCM16 audio.');
          if (operation.tail) sendChunk(operation, operation.tail, false);
          operation.tail = pcm.slice();
        } catch (error) { retire(operation, error instanceof SpeechFailure ? error.message : 'Audio transport failed. No retry was made.'); }
      }, () => { if (current(operation)) retire(operation, 'Microphone device ended. Start again explicitly if needed.'); }).then(value => {
        if (!current(operation)) { value.stop(); throw new DOMException('Cancelled.', 'AbortError'); }
        operation.capture = value;
        return value;
      }), signal);
      signal.throwIfAborted();
      operation.capture = capture;
      state.microphone = true;
      // This local capture bound does not limit token validity or guarantee provider cost.
      deadline(operation, 60000, 'Microphone stopped at the 60-second local limit. No final text was committed; charges may still apply.');
      notify();
      signal.throwIfAborted();
      const response = await fetchResponse(fetch, '/api/speech/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, signal);
      const data = await responseJson(response, signal);
      if (!response.ok || !record(data) || Object.keys(data).length !== 1 || typeof data.token !== 'string' || !data.token.trim() || data.token.length > 2048) throw new SpeechFailure('Speech token unavailable or invalid. Check speech status; no retry was made.');
      signal.throwIfAborted();
      const url = new URL('wss://api.elevenlabs.io/v1/speech-to-text/realtime');
      url.search = new URLSearchParams({ model_id: 'scribe_v2_realtime', audio_format: 'pcm_16000', token: data.token,
        commit_strategy: 'manual', include_timestamps: 'false', enable_logging: 'false' }).toString();
      const socket = options.resources.openSocket(url.href);
      if (!current(operation)) { socket.close(); return false; }
      operation.socket = socket;
      const ready = new Promise<void>(resolve => {
        const failure = () => { if (current(operation)) retire(operation, 'Speech connection ended unexpectedly. No retry was made.'); };
        const message = (event: Event) => {
          if (!current(operation)) return;
          try {
            const raw: unknown = (event as MessageEvent).data;
            if (typeof raw !== 'string' || new TextEncoder().encode(raw).byteLength > 16 * 1024) throw new Error('size');
            const value: unknown = JSON.parse(raw);
            if (!record(value)) throw new Error('shape');
            if (value.message_type === 'session_started') {
              if (state.phase !== 'connecting') return;
              clearTimeout(connectionTimer);
              operation.timers.delete(connectionTimer);
              state.phase = 'listening';
              notify();
              resolve();
            } else if (value.message_type === 'partial_transcript' || value.message_type === 'committed_transcript') {
              if (typeof value.text !== 'string' || value.text.length > 2000) throw new Error('text');
              if (value.message_type === 'partial_transcript') {
                if (state.phase === 'listening' || state.phase === 'committing') { state.interim = value.text; notify(); }
              } else if (state.phase === 'committing') {
                const text = value.text.trim();
                if (!text) { retire(operation, 'No final words were received. Your draft is unchanged.'); return; }
                retire(operation);
                options.onTranscript?.(text);
              }
            } else if (value.message_type !== 'committed_transcript_with_timestamps') throw new Error('message');
          } catch { if (current(operation)) retire(operation, 'Speech returned an invalid response. Your draft is unchanged.'); }
        };
        socket.addEventListener('message', message);
        socket.addEventListener('error', failure);
        socket.addEventListener('close', failure);
        operation.detach = () => { socket.removeEventListener('message', message); socket.removeEventListener('error', failure); socket.removeEventListener('close', failure); };
      });
      await abortable(ready, signal);
      return current(operation) && state.phase === 'listening';
    } catch (error) {
      if (current(operation)) retire(operation, error instanceof SpeechFailure ? error.message : 'Microphone or speech unavailable. Use the editable text draft; no retry was made.');
      return false;
    }
  }
  function finishListening() {
    const operation = active;
    if (!operation || state.phase !== 'listening') return false;
    if (!operation.tail) { retire(operation, 'No audio captured. Your draft is unchanged.'); return false; }
    try {
      const tail = operation.tail;
      operation.tail = undefined;
      state.phase = 'committing';
      state.microphone = false;
      clearTimers(operation);
      const capture = operation.capture;
      operation.capture = undefined;
      capture?.stop();
      if (!current(operation)) return false;
      sendChunk(operation, tail, true);
      deadline(operation, 10000, 'Final transcription timed out locally. Your draft is unchanged; charges may still apply.');
      notify();
      return true;
    } catch { retire(operation, 'Finishing dictation failed. Your draft is unchanged; no retry was made.'); return false; }
  }
  async function speak(text: unknown): Promise<boolean> {
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) return false;
    const operation = begin('loading');
    if (!operation) return false;
    const { signal } = operation.controller;
    try {
      signal.throwIfAborted();
      deadline(operation, 30000, 'Speech generation timed out locally. Charges may still apply.');
      const response = await fetchResponse(fetch, '/api/speech/speak', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) }, signal);
      if (!response.ok) { cancelBody(response); throw new SpeechFailure('Speech generation unavailable. Check speech status; no retry was made.'); }
      const bytes = await responseBytes(response, signal, 2 * 1024 * 1024, true);
      signal.throwIfAborted();
      const playback = options.resources.createPlayback(new Blob([bytes], { type: 'audio/mpeg' }),
        () => { if (current(operation)) retire(operation); }, () => { if (current(operation)) retire(operation, 'Audio playback failed. Text remains available.'); });
      if (!current(operation)) { playback.stop(); return false; }
      operation.playback = playback;
      await abortable(playback.play(), signal);
      if (!current(operation)) return false;
      clearTimers(operation);
      state.phase = 'speaking';
      notify();
      return true;
    } catch (error) {
      if (current(operation)) retire(operation, error instanceof SpeechFailure ? error.message : 'Audio playback unavailable. Text remains available; no retry was made.');
      return false;
    }
  }
  function dispose() {
    if (state.disposed || transitioning) return;
    state.disposed = true;
    if (active) retire(active);
    else { state = { ...EMPTY_SPEECH, disposed: true }; notify(); }
  }
  return { getState, startListening, finishListening, speak, stop, reset: stop, dispose };
}
