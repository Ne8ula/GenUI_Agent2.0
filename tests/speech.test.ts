import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';

function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
}
function audio() {
  return new Response(new Uint8Array([0xff, 0xfb, 0, 0]), { headers: { 'content-type': 'audio/mpeg' } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
class TestSocket extends EventTarget {
  readyState = 0;
  bufferedAmount = 0;
  sent: string[] = [];
  closes = 0;
  send(value: string) { assert.equal(this.readyState, 1); this.sent.push(value); }
  close() { this.closes += 1; this.readyState = 3; this.dispatchEvent(new Event('close')); }
  open() { this.readyState = 1; this.dispatchEvent(new Event('open')); }
  message(value: unknown) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(value) })); }
}
async function setup(t: TestContext, options: {
  fetch?: typeof globalThis.fetch;
  permission?: Promise<{ stop(): void }>;
  permissionError?: Error;
  play?: () => Promise<void>;
  onTranscript?: (text: string) => void;
} = {}) {
  // New implementation imports are lazy; the named behavioral RED is in visitor-speech.test.ts.
  const { createSpeechController } = await import('../src/speech/speech.ts');
  const calls: { url: string; init: RequestInit }[] = [];
  const captures: { signal: AbortSignal; chunk: (pcm: Uint8Array) => void; ended: () => void; stops: number }[] = [];
  const sockets: { url: string; socket: TestSocket }[] = [];
  const playback: { blob: Blob; ended: () => void; error: () => void; plays: number; stops: number }[] = [];
  const transcripts: string[] = [];
  const controller = createSpeechController({
    fetch: async (input: RequestInfo | URL, init: RequestInit = {}) => {
      calls.push({ url: String(input), init });
      return options.fetch ? options.fetch(input, init) : String(input).endsWith('/token') ? json({ token: 'synthetic-single-use-token' }) : audio();
    },
    onTranscript: (text: string) => { transcripts.push(text); options.onTranscript?.(text); },
    resources: {
      startCapture: async (signal: AbortSignal, chunk: (pcm: Uint8Array) => void, ended: () => void) => {
        const capture = { signal, chunk, ended, stops: 0 };
        captures.push(capture);
        if (options.permissionError) throw options.permissionError;
        return options.permission ?? { stop() { capture.stops += 1; } };
      },
      openSocket: (url: string) => { const socket = new TestSocket(); sockets.push({ url, socket }); return socket; },
      createPlayback: (blob: Blob, ended: () => void, error: () => void) => {
        const output = { blob, ended, error, plays: 0, stops: 0 };
        playback.push(output);
        return { play() { output.plays += 1; return options.play?.() ?? Promise.resolve(); }, stop() { output.stops += 1; } };
      },
    },
  });
  t.after(() => controller.dispose());
  return { controller, calls, captures, sockets, playback, transcripts };
}
async function listen(app: Awaited<ReturnType<typeof setup>>) {
  const starting = app.controller.startListening();
  await flush();
  const socket = app.sockets.at(-1)!.socket;
  socket.open();
  assert.equal(app.controller.getState().phase, 'connecting', 'transport open is not provider readiness');
  socket.message({ message_type: 'session_started', session_id: 'synthetic-session' });
  assert.equal(await starting, true);
  assert.equal(app.controller.getState().phase, 'listening');
  return socket;
}

test('speech is inert until explicit listen and uses only the fixed documented manual-commit Scribe transport', async t => {
  const app = await setup(t);
  assert.equal(app.controller.getState().phase, 'idle');
  assert.equal(app.controller.getState().microphone, false);
  assert.equal(app.calls.length + app.captures.length + app.sockets.length + app.playback.length, 0);
  await listen(app);
  assert.equal(app.captures.length, 1);
  assert.equal(app.controller.getState().microphone, true);
  assert.equal(app.calls[0].url, '/api/speech/token');
  assert.equal(app.calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(String(app.calls[0].init.body)), {});
  const url = new URL(app.sockets[0].url);
  assert.equal(url.origin, 'wss://api.elevenlabs.io');
  assert.equal(url.pathname, '/v1/speech-to-text/realtime');
  assert.deepEqual(Object.fromEntries(url.searchParams), { model_id: 'scribe_v2_realtime', audio_format: 'pcm_16000',
    token: 'synthetic-single-use-token', commit_strategy: 'manual', include_timestamps: 'false', enable_logging: 'false' });
  assert.doesNotMatch(JSON.stringify(app.controller.getState()), /synthetic-single-use-token|synthetic-session/);
});

test('one real tail chunk is committed and partials replace interim while one final replaces the draft', async t => {
  const app = await setup(t);
  const socket = await listen(app);
  socket.message({ message_type: 'partial_transcript', text: 'a room' });
  socket.message({ message_type: 'partial_transcript', text: 'a quiet room' });
  assert.equal(app.controller.getState().interim, 'a quiet room');
  assert.deepEqual(app.transcripts, [], 'provisional dictation is not a submitted draft');
  socket.message({ message_type: 'committed_transcript', text: 'unsolicited final' });
  assert.deepEqual(app.transcripts, []);
  app.captures[0].chunk(new Uint8Array([0, 0, 1, 0]));
  assert.equal(socket.sent.length, 0, 'keep actual tail audio rather than inventing an empty flush');
  app.captures[0].chunk(new Uint8Array([2, 0, 3, 0]));
  assert.equal(app.controller.finishListening(), true);
  assert.equal(app.controller.finishListening(), false);
  assert.deepEqual(socket.sent.map(value => JSON.parse(value)), [
    { message_type: 'input_audio_chunk', audio_base_64: 'AAABAA==', commit: false, sample_rate: 16000 },
    { message_type: 'input_audio_chunk', audio_base_64: 'AgADAA==', commit: true, sample_rate: 16000 },
  ]);
  assert.equal(app.captures[0].stops, 1);
  assert.equal(app.controller.getState().microphone, false);
  assert.equal(app.controller.getState().phase, 'committing');
  socket.message({ message_type: 'committed_transcript_with_timestamps', text: 'companion ignored', words: [] });
  assert.deepEqual(app.transcripts, []);
  socket.message({ message_type: 'committed_transcript', text: 'A quiet room with a chair.' });
  socket.message({ message_type: 'committed_transcript', text: 'duplicate ignored' });
  assert.deepEqual(app.transcripts, ['A quiet room with a chair.']);
  assert.equal(app.controller.getState().phase, 'idle');
  assert.equal(app.controller.getState().interim, '');
  assert.equal(socket.closes, 1);
  assert.equal(app.calls.length, 1, 'final dictation cannot submit a room or start narration');
});

test('finish without recorded audio never sends an empty manual commit', async t => {
  const app = await setup(t);
  const socket = await listen(app);
  assert.equal(app.controller.finishListening(), false);
  assert.deepEqual(socket.sent, []);
  app.controller.stop();
  assert.equal(app.captures[0].stops, 1);
});

test('stop reset and dispose suppress late partials finals capture callbacks and repeated cleanup', async t => {
  for (const action of ['stop', 'reset', 'dispose'] as const) {
    const app = await setup(t);
    const socket = await listen(app);
    app.captures[0].chunk(new Uint8Array([0, 0]));
    assert.equal(app.controller.finishListening(), true);
    app.controller[action]();
    const before = app.controller.getState();
    socket.message({ message_type: 'partial_transcript', text: 'private late interim' });
    socket.message({ message_type: 'committed_transcript', text: 'private late final' });
    app.captures[0].chunk(new Uint8Array([1, 0]));
    app.captures[0].ended();
    app.controller[action]();
    assert.deepEqual(app.transcripts, []);
    assert.equal(app.controller.getState().interim, '');
    assert.equal(app.controller.getState().microphone, false);
    assert.equal(app.controller.getState().disposed, action === 'dispose');
    assert.equal(app.captures[0].stops, 1);
    assert.equal(socket.closes, 1);
    assert.equal(app.calls.length, 1);
    if (action === 'dispose') {
      assert.equal(await app.controller.startListening(), false);
      assert.equal(await app.controller.speak('Local/scripted text.'), false);
      assert.deepEqual(app.controller.getState(), before);
    }
  }
});

test('permission denial and a permission result arriving after reset never issue a token or leave capture alive', async t => {
  const denied = await setup(t, { permissionError: new DOMException('private device details', 'NotAllowedError') });
  assert.equal(await denied.controller.startListening(), false);
  assert.equal(denied.controller.getState().phase, 'error');
  assert.doesNotMatch(denied.controller.getState().error ?? '', /private device details/);
  assert.equal(denied.calls.length, 0);
  const permission = deferred<{ stop(): void }>();
  let stops = 0;
  const app = await setup(t, { permission: permission.promise });
  const starting = app.controller.startListening();
  await flush();
  app.controller.reset();
  assert.equal(await starting, false);
  permission.resolve({ stop() { stops += 1; } });
  await flush();
  assert.equal(stops, 1);
  assert.equal(app.calls.length, 0);
  assert.equal(app.controller.getState().phase, 'idle');
});

test('device loss and malformed oversized transcript or PCM data stop capture without retries', async t => {
  for (const fault of ['device', 'transcript', 'message', 'malformed', 'socket', 'pcm', 'odd-pcm', 'backpressure'] as const) {
    const app = await setup(t);
    const socket = await listen(app);
    if (fault === 'device') app.captures[0].ended();
    if (fault === 'transcript') socket.message({ message_type: 'partial_transcript', text: 'x'.repeat(2001) });
    if (fault === 'message') socket.dispatchEvent(new MessageEvent('message', { data: 'x'.repeat(16 * 1024 + 1) }));
    if (fault === 'malformed') socket.dispatchEvent(new MessageEvent('message', { data: '{' }));
    if (fault === 'socket') socket.dispatchEvent(new Event('error'));
    if (fault === 'pcm') app.captures[0].chunk(new Uint8Array(32002));
    if (fault === 'odd-pcm') app.captures[0].chunk(new Uint8Array(3));
    if (fault === 'backpressure') {
      socket.bufferedAmount = 128 * 1024 + 1;
      app.captures[0].chunk(new Uint8Array([0, 0]));
      app.captures[0].chunk(new Uint8Array([1, 0]));
    }
    assert.equal(app.controller.getState().phase, 'error');
    assert.equal(app.controller.getState().microphone, false);
    assert.equal(app.captures[0].stops, 1);
    assert.equal(socket.closes, 1);
    assert.deepEqual(app.transcripts, []);
    assert.equal(app.calls.length, 1);
  }
});

test('connection commit and sixty-second capture bounds stop locally without a retry or fabricated final', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const phase of ['connecting', 'committing', 'listening'] as const) {
    const app = await setup(t);
    let starting: Promise<boolean> | undefined;
    let socket: TestSocket;
    if (phase === 'connecting') {
      starting = app.controller.startListening();
      await flush();
      socket = app.sockets[0].socket;
    } else {
      socket = await listen(app);
      if (phase === 'committing') {
        app.captures[0].chunk(new Uint8Array([0, 0]));
        assert.equal(app.controller.finishListening(), true);
      }
    }
    const duration = phase === 'listening' ? 60000 : 10000;
    t.mock.timers.tick(duration - 1);
    assert.equal(app.controller.getState().phase, phase);
    t.mock.timers.tick(1);
    await flush();
    if (starting) assert.equal(await starting, false);
    assert.equal(app.controller.getState().phase, 'error');
    assert.equal(app.captures[0].stops, 1);
    assert.equal(socket.closes, 1);
    assert.deepEqual(app.transcripts, []);
    assert.equal(app.calls.length, 1);
    app.controller.dispose();
  }
});

test('half-duplex switches stop microphone before speech and playback before listening without committing interim text', async t => {
  const app = await setup(t);
  const socket = await listen(app);
  socket.message({ message_type: 'partial_transcript', text: 'uncommitted private words' });
  assert.equal(await app.controller.speak('Local/scripted EVA: I suspect candidate-2. This is not evidence.'), true);
  assert.equal(app.captures[0].stops, 1);
  assert.equal(socket.closes, 1);
  assert.equal(socket.sent.length, 0);
  assert.deepEqual(app.transcripts, []);
  assert.equal(app.controller.getState().phase, 'speaking');
  assert.equal(app.playback[0].plays, 1);
  await listen(app);
  assert.equal(app.playback[0].stops, 1);
  assert.equal(app.controller.getState().microphone, true);
});

test('late audio cannot play after reset or supersede a newer speech turn', async t => {
  const late = deferred<Response>();
  let calls = 0;
  const app = await setup(t, { fetch: async () => ++calls === 1 ? late.promise : audio() });
  const old = app.controller.speak('Old local/scripted text.');
  await flush();
  app.controller.reset();
  assert.equal(await old, false);
  assert.equal(app.calls[0].init.signal!.aborted, true);
  assert.equal(await app.controller.speak('New local/scripted text.'), true);
  const before = app.controller.getState();
  late.resolve(audio());
  await flush();
  assert.deepEqual(app.controller.getState(), before);
  assert.equal(app.playback.length, 1);
  assert.equal(app.playback[0].plays, 1);
});

for (const kind of ['token', 'TTS'] as const) {
  test(`reset after ${kind} response arrival before reader acquisition cancels its body once`, async t => {
    const { createSpeechController } = await import('../src/speech/speech.ts');
    const arrived = deferred<void>();
    let body: ReadableStream<Uint8Array> | undefined;
    let cancelled = 0;
    let captureStarts = 0;
    let captureStops = 0;
    let sockets = 0;
    let playback = 0;
    const transcripts: string[] = [];
    const controller = createSpeechController({
      fetch: () => {
        body = new ReadableStream<Uint8Array>({ pull() {}, cancel() { cancelled += 1; } });
        const response = Promise.resolve(new Response(body, { headers: { 'content-type': kind === 'token' ? 'application/json' : 'audio/mpeg' } }));
        // Observe actual fetch fulfillment, without the setup helper's additional async adoption.
        void response.then(() => arrived.resolve());
        return response;
      },
      onTranscript: (text: string) => transcripts.push(text),
      resources: {
        startCapture: async () => { captureStarts += 1; return { stop() { captureStops += 1; } }; },
        openSocket: () => { sockets += 1; return new TestSocket(); },
        createPlayback: () => { playback += 1; return { async play() {}, stop() {} }; },
      },
    });
    t.after(() => controller.dispose());
    const running = kind === 'token' ? controller.startListening() : controller.speak('Local/scripted response ownership fixture.');
    await arrived.promise;
    assert.ok(body);
    assert.equal(body.locked, false, 'reset is deliberately before reader acquisition, not while reading');
    controller.reset();
    assert.equal(await running, false);
    await flush();
    assert.equal(controller.getState().phase, 'idle');
    assert.equal(controller.getState().microphone, false);
    assert.equal(captureStarts, kind === 'token' ? 1 : 0);
    assert.equal(captureStops, captureStarts, 'every acquired capture is stopped exactly once');
    assert.equal(sockets, 0);
    assert.equal(playback, 0);
    assert.deepEqual(transcripts, []);
    assert.equal(cancelled, 1, 'a fulfilled response cannot be orphaned between fetch and its reader');
    controller.reset();
    controller.dispose();
    await flush();
    assert.equal(cancelled, 1, 'later cleanup must not cancel the same body again');
    assert.equal(captureStops, captureStarts);
  });
}

test('late token and play promises settle cancelled without acquiring ownership of a newer turn', async t => {
  const token = deferred<Response>();
  const app = await setup(t, { fetch: async () => token.promise });
  const starting = app.controller.startListening();
  await flush();
  app.controller.stop();
  assert.equal(await starting, false);
  assert.equal(app.calls[0].init.signal!.aborted, true);
  token.resolve(json({ token: 'late-token-must-not-open-a-socket' }));
  await flush();
  assert.equal(app.sockets.length, 0);
  assert.equal(app.captures[0].stops, 1);
  const play = deferred<void>();
  let plays = 0;
  const output = await setup(t, { play: () => ++plays === 1 ? play.promise : Promise.resolve() });
  const old = output.controller.speak('Old local/scripted text.');
  await flush();
  output.controller.reset();
  assert.equal(await old, false);
  assert.equal(await output.controller.speak('New local/scripted text.'), true);
  const before = output.controller.getState();
  play.resolve();
  output.playback[0].ended();
  output.playback[0].error();
  await flush();
  assert.equal(output.playback[0].stops, 1);
  assert.equal(output.playback[1].stops, 0);
  assert.deepEqual(output.controller.getState(), before);
});

test('playback ended error rejected play and stop release once and suppress stale playback completion', async t => {
  for (const reason of ['ended', 'error', 'rejected', 'stop'] as const) {
    const app = await setup(t, reason === 'rejected' ? { play: async () => { throw new Error('private playback detail'); } } : {});
    assert.equal(await app.controller.speak('Local/scripted bounded text.'), reason !== 'rejected');
    if (reason === 'ended') app.playback[0].ended();
    if (reason === 'error') app.playback[0].error();
    if (reason === 'stop') app.controller.stop();
    app.controller.reset();
    app.playback[0].ended();
    app.playback[0].error();
    assert.equal(app.playback[0].stops, 1);
    assert.equal(app.controller.getState().phase, 'idle');
    assert.doesNotMatch(JSON.stringify(app.controller.getState()), /private playback detail/);
  }
});

test('invalid text token envelopes and unbounded audio fail closed before playback and never retry', async t => {
  const input = await setup(t);
  for (const text of ['', '   ', 'x'.repeat(2001), null, { case: 'hidden' }]) assert.equal(await input.controller.speak(text), false);
  assert.equal(input.calls.length, 0);
  for (const value of [{}, { token: '' }, { token: 'x'.repeat(2049) }, { token: 'synthetic', extra: true }]) {
    const app = await setup(t, { fetch: async () => json(value) });
    assert.equal(await app.controller.startListening(), false);
    assert.equal(app.sockets.length, 0);
    assert.equal(app.captures[0].stops, 1);
    assert.equal(app.calls.length, 1);
  }
  for (const response of [
    () => new Response('private provider detail', { status: 500 }),
    () => new Response('not audio', { headers: { 'content-type': 'text/html' } }),
    () => new Response(new Uint8Array(2 * 1024 * 1024 + 1), { headers: { 'content-type': 'audio/mpeg' } }),
    () => new Response(new Uint8Array([1]), { headers: { 'content-type': 'audio/mpeg', 'content-length': '2' } }),
  ]) {
    const app = await setup(t, { fetch: async () => response() });
    assert.equal(await app.controller.speak('Local/scripted text.'), false);
    assert.equal(app.playback.length, 0);
    assert.equal(app.calls.length, 1);
    assert.doesNotMatch(JSON.stringify(app.controller.getState()), /private provider detail/);
  }
});

test('final callback can start a new utterance without old cleanup or duplicate finals closing it', async t => {
  let next: Promise<boolean> | undefined;
  let app: Awaited<ReturnType<typeof setup>>;
  app = await setup(t, { onTranscript: () => { next = app.controller.startListening(); } });
  const old = await listen(app);
  app.captures[0].chunk(new Uint8Array([0, 0]));
  app.controller.finishListening();
  old.message({ message_type: 'committed_transcript', text: 'Accepted final.' });
  await flush();
  const current = app.sockets[1].socket;
  current.open();
  current.message({ message_type: 'session_started', session_id: 'new-synthetic' });
  assert.equal(await next, true);
  old.message({ message_type: 'committed_transcript', text: 'Stale duplicate.' });
  assert.deepEqual(app.transcripts, ['Accepted final.']);
  assert.equal(current.closes, 0);
  assert.equal(app.controller.getState().phase, 'listening');
});

function nativeCapture() {
  const track = new EventTarget() as EventTarget & { kind: string; readyState: string; stops: number; stop(): void };
  Object.assign(track, { kind: 'audio', readyState: 'live', stops: 0, stop() { track.stops += 1; track.readyState = 'ended'; track.dispatchEvent(new Event('ended')); } });
  const stream = { getTracks: () => [track] };
  const source = { connects: 0, disconnects: 0, connect() { source.connects += 1; }, disconnect() { source.disconnects += 1; } };
  const port = { onmessage: null as null | ((event: { data: ArrayBuffer }) => void), closes: 0, close() { port.closes += 1; } };
  const node = { port, connects: 0, disconnects: 0, connect() { node.connects += 1; }, disconnect() { node.disconnects += 1; } };
  const modules: string[] = [];
  const context = { sampleRate: 16000, destination: {}, closes: 0,
    audioWorklet: { async addModule(url: string) { modules.push(String(url)); } },
    createMediaStreamSource: () => source, async resume() {}, async close() { context.closes += 1; },
  };
  const constraints: MediaStreamConstraints[] = [];
  return { track, stream, source, node, context, modules, constraints, environment: {
    getUserMedia: async (value: MediaStreamConstraints) => { constraints.push(value); return stream; },
    createAudioContext: (options: AudioContextOptions) => { assert.equal(options.sampleRate, 16000); return context; },
    createWorkletNode: () => node,
  } };
}

test('native capture uses checked mono16k AudioWorklet and detaches every resource once on stop or device loss', async () => {
  const { createBrowserSpeechResources } = await import('../src/speech/browser-speech.ts');
  for (const ended of [false, true]) {
    const native = nativeCapture();
    const resources = createBrowserSpeechResources(native.environment);
    const chunks: Uint8Array[] = [];
    let losses = 0;
    const capture = await resources.startCapture(new AbortController().signal, (pcm: Uint8Array) => chunks.push(pcm), () => { losses += 1; });
    assert.equal(native.constraints[0].video, false);
    assert.equal((native.constraints[0].audio as MediaTrackConstraints).channelCount, 1);
    assert.match(native.modules[0], /pcm-worklet\.js(?:$|[?#])/);
    native.node.port.onmessage!({ data: new Uint8Array([0, 0, 1, 0]).buffer });
    assert.deepEqual(chunks, [new Uint8Array([0, 0, 1, 0])]);
    if (ended) native.track.dispatchEvent(new Event('ended'));
    capture.stop();
    capture.stop();
    assert.equal(losses, ended ? 1 : 0);
    assert.equal(native.track.stops, 1);
    assert.equal(native.context.closes, 1);
    assert.equal(native.source.disconnects, 1);
    assert.equal(native.node.disconnects, 1);
    assert.equal(native.node.port.closes, 1);
    assert.equal(native.node.port.onmessage, null);
  }
});

test('native permission late arrival and unsupported context sample rate fail closed without fake16k data', async () => {
  const { createBrowserSpeechResources } = await import('../src/speech/browser-speech.ts');
  const pending = deferred<ReturnType<typeof nativeCapture>['stream']>();
  const native = nativeCapture();
  const resources = createBrowserSpeechResources({ ...native.environment, getUserMedia: () => pending.promise });
  const abort = new AbortController();
  const starting = resources.startCapture(abort.signal, () => assert.fail('late PCM'), () => {});
  const rejected = assert.rejects(starting);
  abort.abort();
  pending.resolve(native.stream);
  await rejected;
  assert.equal(native.track.stops, 1);
  assert.equal(native.modules.length, 0);
  const wrongRate = nativeCapture();
  wrongRate.context.sampleRate = 48000;
  await assert.rejects(createBrowserSpeechResources(wrongRate.environment).startCapture(new AbortController().signal, () => assert.fail('mislabeled PCM'), () => {}));
  assert.equal(wrongRate.track.stops, 1);
  assert.equal(wrongRate.context.closes, 1);
  const missingWorklet = nativeCapture();
  missingWorklet.context.audioWorklet.addModule = async () => { throw new Error('worklet unavailable'); };
  await assert.rejects(createBrowserSpeechResources(missingWorklet.environment).startCapture(new AbortController().signal, () => assert.fail('fallback capture'), () => {}));
  assert.equal(missingWorklet.track.stops, 1);
  assert.equal(missingWorklet.context.closes, 1);
});

test('native playback pauses unloads and revokes its in-memory URL exactly once', async () => {
  const { createBrowserSpeechResources } = await import('../src/speech/browser-speech.ts');
  const media = new EventTarget() as EventTarget & { play(): Promise<void>; pause(): void; removeAttribute(name: string): void; load(): void };
  const actions: string[] = [];
  Object.assign(media, { async play() { actions.push('play'); }, pause() { actions.push('pause'); }, removeAttribute(name: string) { actions.push(`remove:${name}`); }, load() { actions.push('load'); } });
  let ended = 0;
  const resources = createBrowserSpeechResources({
    createAudio: (url: string) => { assert.equal(url, 'blob:synthetic'); return media; },
    createObjectURL: () => 'blob:synthetic', revokeObjectURL: (url: string) => actions.push(`revoke:${url}`),
  });
  const playback = resources.createPlayback(new Blob([new Uint8Array([1])], { type: 'audio/mpeg' }), () => { ended += 1; }, () => {});
  await playback.play();
  media.dispatchEvent(new Event('ended'));
  assert.equal(ended, 1);
  playback.stop();
  playback.stop();
  media.dispatchEvent(new Event('ended'));
  assert.equal(ended, 1);
  assert.deepEqual(actions, ['play', 'pause', 'remove:src', 'load', 'revoke:blob:synthetic']);
});

test('the actual worklet emits bounded mono PCM16 little-endian chunks with clamping and silent output', async t => {
  const output: Uint8Array[] = [];
  let Processor: (new () => { process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean }) | undefined;
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const [name, value] of Object.entries({
    AudioWorkletProcessor: class { port = { postMessage(buffer: ArrayBuffer) { output.push(new Uint8Array(buffer)); } }; },
    registerProcessor: (_name: string, implementation: typeof Processor) => { Processor = implementation; },
    sampleRate: 16000,
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, name, previous); else delete globals[name]; });
  }
  await import('../src/speech/pcm-worklet.js');
  assert.ok(Processor, 'the actual worklet must register a processor');
  const processor = new Processor();
  const input = new Float32Array(128);
  input.set([-2, -0.5, 0, 0.5, 2]);
  const speaker = new Float32Array(128);
  for (let count = 0; count < 25; count += 1) assert.equal(processor.process([[input, new Float32Array(128).fill(1)]], [[speaker]]), true);
  assert.deepEqual(output.map(chunk => chunk.byteLength), [3200, 3200]);
  const pcm = new DataView(output[0].buffer, output[0].byteOffset, output[0].byteLength);
  assert.deepEqual([0, 2, 4, 6, 8].map(offset => pcm.getInt16(offset, true)), [-32768, -16384, 0, 16384, 32767]);
  assert.equal(pcm.getInt16(10, true), 0, 'a second input channel is not interleaved into mono audio');
  assert.equal(speaker.every(value => value === 0), true, 'microphone samples are not played back to the speaker');
});
