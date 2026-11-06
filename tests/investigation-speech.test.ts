import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { createRoomCompositionController } from '../src/room/room-composition.ts';
import { createRoomDisplay } from '../src/room/room-display.ts';
import { createSpeechController } from '../src/speech/speech.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';

type SpeechTarget = { unit: symbol; origin: 'model' | 'local-script'; text: string };
type Controller = ReturnType<typeof createRoomCompositionController> & {
  getInvestigationSpeech?(unit: symbol): SpeechTarget | null;
};
type Call = { url: string; init: RequestInit };
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}
function audio() { return new Response(new Uint8Array([0xff, 0xfb, 0, 0]), { headers: { 'content-type': 'audio/mpeg' } }); }
function reply() { return { version: 1, kind: 'suspicion', reply: '  I suspect candidate-3 — perhaps.  ', candidateId: 'candidate-3', clueIds: ['clue-1'] }; }
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
class TestSocket extends EventTarget {
  readyState = 1;
  bufferedAmount = 0;
  closes = 0;
  sent: string[] = [];
  send(value: string) { this.sent.push(value); }
  close() { this.closes += 1; this.readyState = 3; this.dispatchEvent(new Event('close')); }
  message(value: unknown) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(value) })); }
}
function setup(t: TestContext, options: {
  narrate?: (count: number) => Promise<Response>;
  speak?: (call: Call, count: number) => Promise<Response>;
} = {}) {
  const narrationCalls: Call[] = [];
  const speechCalls: Call[] = [];
  const captures: { stops: number; chunk: (pcm: Uint8Array) => void }[] = [];
  const sockets: TestSocket[] = [];
  const playback: { blob: Blob; ended: () => void; error: () => void; plays: number; stops: number }[] = [];
  const transcripts: string[] = [];
  const events: string[] = [];
  let synthesis = 0;
  const fixture = inspectionFixture();
  const display = createRoomDisplay({ initial: { scene: new Scene(), dispose() {} }, camera: new PerspectiveCamera(), draw() {} });
  const controller: Controller = createRoomCompositionController({
    fetch: (url, init = {}) => {
      if (String(url) === '/api/compose-room') return Promise.resolve(json(fixture));
      assert.equal(String(url), '/api/investigation-narration');
      narrationCalls.push({ url: String(url), init });
      return options.narrate?.(narrationCalls.length) ?? Promise.resolve(json(reply()));
    },
    yieldToBuild: () => Promise.resolve(),
  });
  const speech = createSpeechController({
    fetch: (url, init = {}) => {
      const call = { url: String(url), init };
      speechCalls.push(call);
      if (call.url === '/api/speech/token') return Promise.resolve(json({ token: 'synthetic-speech-token-not-a-credential' }));
      assert.equal(call.url, '/api/speech/speak');
      events.push('synthesis-request');
      return options.speak?.(call, ++synthesis) ?? Promise.resolve(audio());
    },
    onTranscript: text => transcripts.push(text),
    resources: {
      startCapture: async (_signal, chunk) => {
        events.push('capture-start');
        const capture = { stops: 0, chunk };
        captures.push(capture);
        return { stop() { capture.stops += 1; events.push('capture-stop'); } };
      },
      openSocket: () => { const socket = new TestSocket(); sockets.push(socket); return socket; },
      createPlayback: (blob, ended, error) => {
        const output = { blob, ended, error, plays: 0, stops: 0 };
        playback.push(output);
        return { async play() { output.plays += 1; events.push('play'); }, stop() { output.stops += 1; events.push('playback-stop'); } };
      },
    },
  });
  t.after(() => { speech.dispose(); controller.dispose(); display.dispose(); });
  return { controller, speech, display, narrationCalls, speechCalls, captures, sockets, playback, transcripts, events, fixture };
}
async function reveal(app: ReturnType<typeof setup>) {
  assert.equal(await app.controller.compose('PRIVATE-ORIGINAL-SUGGESTION', 41), true);
  assert.equal(app.controller.reveal(app.display.install), true);
  const unit = app.controller.getState().investigation!.unit;
  assert.equal(app.controller.inspect(unit, 'object-1'), true);
  return unit;
}
async function ask(app: ReturnType<typeof setup>, unit: symbol) {
  assert.equal(await app.controller.askInvestigationQuestion(unit, 'What is your tentative reading?'), true);
  return app.controller.getState().dialogue!.reply!;
}
function target(app: ReturnType<typeof setup>, unit: symbol) { return app.controller.getInvestigationSpeech?.(unit) ?? null; }
async function read(app: ReturnType<typeof setup>, unit: symbol) {
  // Exercise the proposed production selector and existing speech transport; this is not a React/DOM harness.
  const selected = target(app, unit);
  return selected ? app.speech.speak(selected.text) : false;
}
function synthesisCalls(app: ReturnType<typeof setup>) { return app.speechCalls.filter(call => call.url === '/api/speech/speak'); }
async function listen(app: ReturnType<typeof setup>) {
  const starting = app.speech.startListening();
  await flush();
  const socket = app.sockets.at(-1)!;
  socket.message({ message_type: 'session_started', session_id: 'synthetic-session' });
  assert.equal(await starting, true);
  return socket;
}

test('admitted investigation reply supplies an exact explicit read-aloud target after real Reveal and ask', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const admitted = await ask(app, unit);
  const before = app.controller.getState();
  const reading = await read(app, unit);
  assert.equal(synthesisCalls(app).length, 1, 'explicit investigation read-aloud must send the admitted reply to existing speech synthesis');
  assert.equal(reading, true);
  assert.deepEqual(target(app, unit), { unit, origin: 'model', text: admitted.text });
  assert.deepEqual(JSON.parse(String(synthesisCalls(app)[0].init.body)), { text: admitted.text });
  assert.equal(admitted.text, '  I suspect candidate-3 — perhaps.  ', 'spaces, punctuation and uncertainty remain exactly as admitted');
  assert.equal(app.narrationCalls.length, 1, 'speech must not make a second narration request');
  assert.equal(app.playback.length, 1);
  assert.equal(app.playback[0].plays, 1);
  assert.equal(app.playback[0].blob.type, 'audio/mpeg');
  assert.deepEqual(app.controller.getState(), before, 'speaking is not a new investigation contribution');
  assert.equal(app.captures.length, 0);
  assert.equal(app.sockets.length, 0);
});

test('model and scripted targets retain source metadata but synthesis receives only the exact admitted text', async t => {
  for (const origin of ['model', 'local-script'] as const) {
    const app = setup(t, origin === 'local-script' ? { narrate: () => Promise.resolve(json({ error: 'disabled' }, 503)) } : {});
    const unit = await reveal(app);
    const admitted = await ask(app, unit);
    assert.equal(admitted.origin, origin);
    const before = app.controller.getState();
    assert.deepEqual(target(app, unit), { unit, origin, text: admitted.text });
    assert.deepEqual(target(app, unit), { unit, origin, text: admitted.text });
    assert.equal(app.speechCalls.length, 0, 'selecting or displaying a target cannot automatically synthesize or activate a microphone');
    assert.equal(await read(app, unit), true);
    const call = synthesisCalls(app)[0];
    assert.deepEqual(JSON.parse(String(call.init.body)), { text: admitted.text });
    assert.equal(call.init.method, 'POST');
    assert.equal(call.init.credentials, 'same-origin');
    assert.equal(call.init.redirect, 'error');
    assert.equal(call.init.cache, 'no-store');
    assert.ok(call.init.signal instanceof AbortSignal);
    assert.doesNotMatch(String(call.init.body), /PRIVATE-ORIGINAL|"origin"|"kind"|"clueIds"|"question"|"unit"|"case"|"solution"/);
    assert.deepEqual(app.controller.getState(), before);
    assert.equal(app.narrationCalls.length, 1);
    if (origin === 'model') assert.doesNotMatch(JSON.parse(String(call.init.body)).text, /model-proposed|statement-1|clue-1/);
    else assert.match(JSON.parse(String(call.init.body)).text, /Local\/scripted EVA.*not live model reasoning/);
  }
});

test('unrevealed pending foreign stale and disposed cases do not supply or speak a target', async t => {
  const app = setup(t);
  const foreign = Symbol('foreign case');
  for (const phase of ['authored', 'pending', 'failed'] as const) {
    if (phase === 'pending') assert.equal(await app.controller.compose('pending initial case', 41), true);
    if (phase === 'failed') assert.equal(app.controller.reveal(() => false), false);
    assert.equal(target(app, foreign), null);
    assert.equal(await read(app, foreign), false);
  }
  const unit = await reveal(app);
  assert.equal(target(app, unit), null, 'a revealed case without an admitted reply is not a speech target');
  assert.equal(await read(app, unit), false);
  await ask(app, unit);
  for (const invalid of [foreign, null, String(unit), {}]) {
    assert.equal(target(app, invalid as symbol), null);
    assert.equal(await read(app, invalid as symbol), false);
  }
  assert.equal(app.controller.reset(), true);
  assert.equal(target(app, unit), null);
  const nextUnit = await reveal(app);
  await ask(app, nextUnit);
  assert.equal(target(app, unit), null);
  app.controller.dispose();
  assert.equal(target(app, nextUnit), null);
  assert.equal(await read(app, nextUnit), false);
  assert.equal(app.speechCalls.length, 0);
  assert.equal(app.playback.length, 0);
  assert.equal(app.captures.length, 0);
});

test('a pending question retains its earlier answer but cannot speak it until the pending question is stopped', { timeout: 3000 }, async t => {
  const late = deferred<Response>();
  const app = setup(t, { narrate: count => count === 2 ? late.promise : Promise.resolve(json(reply())) });
  const unit = await reveal(app);
  const first = await ask(app, unit);
  const pending = app.controller.askInvestigationQuestion(unit, 'A new question?');
  assert.equal(app.controller.getState().dialogue!.pending, true);
  assert.deepEqual(app.controller.getState().dialogue!.reply, first);
  assert.equal(target(app, unit), null);
  assert.equal(await read(app, unit), false);
  assert.equal(app.speechCalls.length, 0);
  assert.equal(app.controller.stop(), true);
  assert.equal(await pending, false);
  assert.deepEqual(target(app, unit), { unit, origin: first.origin, text: first.text });
  const before = app.controller.getState();
  assert.equal(await read(app, unit), true);
  assert.deepEqual(JSON.parse(String(synthesisCalls(app)[0].init.body)), { text: first.text });
  late.resolve(json({ version: 1, kind: 'reflection', reply: 'I remain uncertain.', candidateId: null, clueIds: [] }));
  await flush();
  assert.deepEqual(app.controller.getState(), before);
  assert.equal(app.narrationCalls.length, 2);
});

test('pending and failed replacements retain the displayed case target while successful replacement invalidates it', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const admitted = await ask(app, unit);
  const selected = { unit, origin: admitted.origin, text: admitted.text };
  assert.deepEqual(target(app, unit), selected);
  assert.equal(await app.controller.compose('pending replacement', 41), true);
  assert.deepEqual(target(app, unit), selected, 'the old reply still belongs to the actually displayed case, not the pending replacement');
  assert.equal(app.controller.reveal(() => false), false);
  assert.deepEqual(target(app, unit), selected);
  assert.equal(await app.controller.compose('successful replacement', 41), true);
  assert.equal(app.controller.reveal(app.display.install), true);
  const nextUnit = app.controller.getState().investigation!.unit;
  assert.notEqual(nextUnit, unit);
  assert.equal(target(app, unit), null);
  assert.equal(target(app, nextUnit), null);
  assert.equal(await read(app, unit), false);
  assert.equal(await read(app, nextUnit), false);
  assert.equal(app.speechCalls.length, 0);
  assert.equal(app.narrationCalls.length, 1);
});

test('a detached target or state snapshot cannot forge the admitted audio source and invalid narration only exposes truthful fallback', async t => {
  const app = setup(t, { narrate: () => Promise.resolve(json({ ...reply(), reply: '<script>alert(1)</script>' })) });
  const unit = await reveal(app);
  const admitted = await ask(app, unit);
  assert.equal(admitted.origin, 'local-script');
  assert.equal(admitted.reason, 'invalid_response');
  const selected = target(app, unit);
  assert.ok(selected);
  assert.deepEqual(Reflect.ownKeys(selected).sort(), ['origin', 'text', 'unit']);
  selected.origin = 'model';
  selected.text = 'FORGED SPEECH';
  const snapshot = app.controller.getState();
  snapshot.dialogue!.reply!.origin = 'model';
  snapshot.dialogue!.reply!.text = 'FORGED SNAPSHOT';
  snapshot.dialogue!.pending = false;
  assert.deepEqual(target(app, unit), { unit, origin: 'local-script', text: admitted.text });
  assert.equal(await read(app, unit), true);
  assert.deepEqual(JSON.parse(String(synthesisCalls(app)[0].init.body)), { text: admitted.text });
  assert.doesNotMatch(String(synthesisCalls(app)[0].init.body), /FORGED|<script>/);
  assert.equal(app.narrationCalls.length, 1);
});

test('prior accepted Compose and local-summary speech targets remain separate and unchanged by investigation playback', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  await ask(app, unit);
  const before = app.controller.getState();
  const composeText = before.interpretation!.reply;
  const summaryText = before.narration!.text;
  assert.match(summaryText, /Local\/scripted case summary/);
  assert.match(summaryText, /Model-proposed statement/);
  assert.notEqual(summaryText, before.dialogue!.reply!.text);
  assert.equal(await app.speech.speak(composeText), true);
  assert.equal(await app.speech.speak(summaryText), true);
  assert.equal(await read(app, unit), true);
  assert.deepEqual(synthesisCalls(app).map(call => JSON.parse(String(call.init.body))), [
    { text: composeText }, { text: summaryText }, { text: before.dialogue!.reply!.text },
  ]);
  assert.deepEqual(app.playback.map(output => output.stops), [1, 1, 0]);
  assert.equal(app.narrationCalls.length, 1);
  assert.deepEqual(app.controller.getState(), before);
});

test('investigation playback uses existing half-duplex resources without committing interim words or creating new dialogue', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  await ask(app, unit);
  const before = app.controller.getState();
  const socket = await listen(app);
  socket.message({ message_type: 'partial_transcript', text: 'uncommitted private question' });
  app.captures[0].chunk(new Uint8Array([0, 0]));
  assert.equal(await read(app, unit), true);
  assert.equal(app.captures[0].stops, 1);
  assert.equal(socket.closes, 1);
  assert.deepEqual(socket.sent, [], 'reading cancels capture; it must not commit or submit interim dictation');
  assert.deepEqual(app.transcripts, []);
  assert.equal(app.speech.getState().microphone, false);
  assert.equal(app.speech.getState().phase, 'speaking');
  assert.ok(app.events.indexOf('capture-stop') < app.events.indexOf('synthesis-request'));
  await listen(app);
  assert.equal(app.playback[0].stops, 1);
  assert.equal(app.speech.getState().microphone, true);
  assert.ok(app.events.indexOf('playback-stop') < app.events.lastIndexOf('capture-start'));
  assert.equal(app.narrationCalls.length, 1);
  assert.deepEqual(app.controller.getState(), before);
});

test('playback completion errors Stop reset and disposal release once without changing admitted contributions', async t => {
  for (const action of ['ended', 'error', 'stop', 'reset', 'dispose'] as const) {
    const app = setup(t);
    const unit = await reveal(app);
    await ask(app, unit);
    const before = app.controller.getState();
    assert.equal(await read(app, unit), true);
    const output = app.playback[0];
    if (action === 'ended' || action === 'error') output[action](); else app.speech[action]();
    output.ended();
    output.error();
    app.speech.stop();
    assert.equal(output.stops, 1);
    assert.equal(app.speech.getState().microphone, false);
    assert.notEqual(app.speech.getState().phase, 'speaking');
    assert.deepEqual(app.controller.getState(), before);
    assert.equal(app.narrationCalls.length, 1);
    assert.equal(synthesisCalls(app).length, 1);
  }
});

test('stopped synthesis ignoring abort cannot play late audio after a new visitor or replace a newer utterance', { timeout: 3000 }, async t => {
  for (const resetVisitor of [false, true]) {
    const late = deferred<Response>();
    const app = setup(t, { speak: (_call, count) => count === 1 ? late.promise : Promise.resolve(audio()) });
    let unit = await reveal(app);
    await ask(app, unit);
    const old = read(app, unit);
    await flush();
    assert.equal(app.speech.getState().phase, 'loading');
    app.speech.stop();
    assert.equal(await old, false);
    assert.equal(synthesisCalls(app)[0].init.signal!.aborted, true);
    if (resetVisitor) {
      assert.equal(app.controller.reset(), true);
      assert.equal(target(app, unit), null);
      unit = await reveal(app);
      await ask(app, unit);
    }
    assert.equal(await read(app, unit), true);
    const before = app.controller.getState();
    const speechBefore = app.speech.getState();
    let cancelled = 0;
    late.resolve(new Response(new ReadableStream<Uint8Array>({ pull() {}, cancel() { cancelled += 1; } }), { headers: { 'content-type': 'audio/mpeg' } }));
    await flush();
    assert.equal(cancelled, 1);
    assert.equal(app.playback.length, 1);
    assert.equal(app.playback[0].plays, 1);
    assert.equal(app.playback[0].stops, 0);
    assert.deepEqual(app.controller.getState(), before);
    assert.deepEqual(app.speech.getState(), speechBefore);
    assert.equal(app.narrationCalls.length, resetVisitor ? 2 : 1);
  }
});

test('speech transport failure preserves admitted text and source with no narration retry or browser fallback', async t => {
  for (const response of [
    () => Promise.resolve(new Response('PRIVATE-UPSTREAM', { status: 503 })),
    () => Promise.resolve(new Response('not audio', { headers: { 'content-type': 'text/html' } })),
    () => Promise.reject(new Error('PRIVATE-UPSTREAM')),
  ]) {
    const app = setup(t, { speak: response });
    const unit = await reveal(app);
    const admitted = await ask(app, unit);
    const before = app.controller.getState();
    assert.equal(await read(app, unit), false);
    assert.equal(app.speech.getState().phase, 'error');
    assert.equal(app.playback.length, 0);
    assert.equal(app.captures.length, 0);
    assert.equal(app.sockets.length, 0);
    assert.equal(app.narrationCalls.length, 1);
    assert.equal(synthesisCalls(app).length, 1);
    assert.deepEqual(app.controller.getState(), before);
    assert.deepEqual(target(app, unit), { unit, origin: 'model', text: admitted.text });
    assert.doesNotMatch(app.speech.getState().error ?? '', /PRIVATE-UPSTREAM/);
  }
});
