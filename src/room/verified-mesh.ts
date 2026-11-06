import { validatePropGlb } from './prop-glb-admission.ts';

function abortable<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(signal.reason); };
    signal.addEventListener('abort', abort, { once: true });
    pending.then(value => { signal.removeEventListener('abort', abort); resolve(value); },
      error => { signal.removeEventListener('abort', abort); reject(error); });
    if (signal.aborted) abort();
  });
}

export async function verifiedMesh(url: string, record: { bytes: number; sha256: string }, signal: AbortSignal, progress: (value: number) => void): Promise<ArrayBuffer> {
  if (!Number.isSafeInteger(record.bytes) || record.bytes <= 0 || record.bytes > 8 * 1024 * 1024) throw new Error('Room exceeds the download limit.');
  if (typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error('Room integrity record is invalid.');
  signal.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', abort, { once: true });
  const deadline = setTimeout(() => controller.abort(new Error('Room download timed out.')), 15000);
  const active = controller.signal;
  let received: Response | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    const response = await abortable(fetch(url, { signal: active, redirect: 'error', credentials: 'omit', cache: 'no-store' }).then(response => {
      if (active.aborted) {
        if (response.body) void response.body.cancel(active.reason).catch(() => {});
        throw active.reason;
      }
      received = response;
      return response;
    }), active);
    received = response;
    active.throwIfAborted();
    if (!response.ok || !response.body) throw new Error('The room file could not be loaded.');
    reader = response.body.getReader();
    received = undefined;
    bytes = new Uint8Array(record.bytes);
    let length = 0;
    let chunks = 0;
    while (true) {
      active.throwIfAborted();
      const { done, value } = await abortable(reader.read(), active);
      active.throwIfAborted();
      if (done) break;
      if (++chunks > 4096 || !(value instanceof Uint8Array)) throw new Error('Room download exceeded its stream limit.');
      if (length + value.length > bytes.length) throw new Error('Room file exceeded its expected size.');
      if (!value.length) continue;
      bytes.set(value, length); length += value.length;
      progress(length / bytes.length);
      active.throwIfAborted();
    }
    if (length !== bytes.length) throw new Error('The room download was incomplete.');
    const digest = await abortable(crypto.subtle.digest('SHA-256', bytes), active);
    const hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
    if (hash !== record.sha256) throw new Error('The room file failed its integrity check.');
    active.throwIfAborted();
  } catch (error) {
    if (!active.aborted) controller.abort(error);
    throw active.reason;
  } finally {
    clearTimeout(deadline);
    signal.removeEventListener('abort', abort);
    // Cancellation may settle later. Release our lock without claiming the transport physically stopped.
    if (reader) { void reader.cancel(active.reason).catch(() => {}); reader.releaseLock(); }
    if (received?.body) void received.body.cancel(active.reason).catch(() => {});
  }
  signal.throwIfAborted();
  await validatePropGlb(bytes.buffer, signal);
  signal.throwIfAborted();
  return bytes.buffer;
}
