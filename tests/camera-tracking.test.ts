import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import {
  createCameraTracking,
  type TrackingDetector,
  type TrackingResources,
  type TrackingUpdate,
} from '../src/room/camera-tracking.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function face(x = 0.5, y = 0.5, span = 0.1) {
  const points = Array.from({ length: 468 }, () => ({ x, y }));
  points[33] = { x: x - span * 0.6, y };
  points[133] = { x: x - span * 0.4, y };
  points[362] = { x: x + span * 0.4, y };
  points[263] = { x: x + span * 0.6, y };
  return points;
}

class FakeTrack extends EventTarget {
  kind = 'video';
  readyState = 'live';
  stops = 0;
  throwsOnStop = false;
  stop() {
    this.stops += 1;
    this.readyState = 'ended';
    if (this.throwsOnStop) throw new Error('stop failed');
  }
}

class FakeStream {
  tracks = [new FakeTrack(), new FakeTrack()];
  getTracks() { return [...this.tracks]; }
  mediaStream() { return this as unknown as MediaStream; }
}

class FakeVideo extends EventTarget {
  currentTime = 0;
  presentedFrames = 0;
  readyState = 2;
  videoWidth = 640;
  videoHeight = 480;
  paused = true;
  ended = false;
  muted = false;
  playsInline = false;
  autoplay = true;
  srcObject: MediaStream | null = null;
  plays = 0;
  pauses = 0;
  throwsOnPause = false;
  playResult = Promise.resolve();
  async play() {
    this.plays += 1;
    await this.playResult;
    this.paused = false;
  }
  pause() {
    this.pauses += 1;
    this.paused = true;
    if (this.throwsOnPause) throw new Error('pause failed');
  }
  element() { return this as unknown as HTMLVideoElement; }
}

class FakeDetector implements TrackingDetector {
  calls: number[] = [];
  closes = 0;
  result = { faceLandmarks: [face()] };
  onDetect = () => {};
  throwsOnClose = false;
  detectForVideo(_video: HTMLVideoElement, timestampMs: number) {
    this.calls.push(timestampMs);
    this.onDetect();
    return this.result;
  }
  close() {
    this.closes += 1;
    if (this.throwsOnClose) throw new Error('close failed');
  }
}

function metadata(mediaTime: number, presentedFrames: number, timestampMs: number): VideoFrameCallbackMetadata {
  return { mediaTime, presentedFrames, width: 640, height: 480, presentationTime: timestampMs, expectedDisplayTime: timestampMs, processingDuration: 0 };
}

function harness() {
  let time = 1000;
  let nextId = 0;
  const frames = new Map<number, VideoFrameRequestCallback>();
  const timers = new Map<number, { callback: () => void; at: number }>();
  const updates: TrackingUpdate[] = [];
  const detectors: FakeDetector[] = [];
  const streams: FakeStream[] = [];
  const videos: FakeVideo[] = [];
  const constraints: MediaStreamConstraints[] = [];
  const waiting: { status: TrackingUpdate['status']; resolve: () => void }[] = [];
  const resources: TrackingResources = {
    async createDetector() { const detector = new FakeDetector(); detectors.push(detector); return detector; },
    async getUserMedia(value) { constraints.push(value); const stream = new FakeStream(); streams.push(stream); return stream.mediaStream(); },
    createVideo() { const video = new FakeVideo(); videos.push(video); return video.element(); },
    now: () => time,
    requestFrame(_video, callback) { const id = ++nextId; frames.set(id, callback); return id; },
    cancelFrame(_video, id) { frames.delete(id); },
    setTimer(callback, delayMs) { const id = ++nextId; timers.set(id, { callback, at: time + delayMs }); return id; },
    clearTimer(id) { timers.delete(id); },
  };
  const tracker = createCameraTracking(update => {
    updates.push(update);
    for (const waiter of waiting.splice(0)) {
      if (waiter.status === update.status) waiter.resolve();
      else waiting.push(waiter);
    }
  }, resources);
  function fireTimers() {
    for (const [id, timer] of [...timers]) {
      if (timer.at > time) continue;
      timers.delete(id);
      timer.callback();
    }
  }
  return {
    tracker, resources, updates, detectors, streams, videos, constraints, frames, timers,
    last() { const update = updates.at(-1); assert.ok(update); return update; },
    waitFor(status: TrackingUpdate['status']) {
      if (updates.some(update => update.status === status)) return Promise.resolve();
      return new Promise<void>(resolve => { waiting.push({ status, resolve }); });
    },
    setTime(value: number) { time = value; },
    advance(ms: number) { time += ms; fireTimers(); },
    frame(ms = 80, mediaAdvance = ms / 1000) {
      time += ms;
      const video = videos.at(-1);
      if (video && !video.paused && mediaAdvance !== 0) {
        video.currentTime += mediaAdvance;
        video.presentedFrames += 1;
        const pending = [...frames];
        frames.clear();
        for (const [, callback] of pending) callback(time, metadata(video.currentTime, video.presentedFrames, time));
      }
      fireTimers();
    },
  };
}

function released(h: ReturnType<typeof harness>) {
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 0);
  for (const stream of h.streams) {
    for (const track of stream.tracks) {
      assert.equal(track.readyState, 'ended');
      assert.equal(getEventListeners(track, 'ended').length, 0);
    }
  }
  for (const video of h.videos) {
    assert.equal(video.srcObject, null);
    assert.equal(video.paused, true);
    assert.equal(getEventListeners(video, 'error').length, 0);
  }
  for (const detector of h.detectors) assert.equal(detector.closes, 1);
  assert.equal(h.tracker.getSample(), null);
}

test('construction is inert; explicit start owns video-only resources without claiming tracking', async () => {
  const h = harness();
  assert.equal(h.detectors.length, 0);
  assert.equal(h.streams.length, 0);
  assert.equal(h.videos.length, 0);
  assert.equal(h.updates.length, 0);
  assert.equal(h.tracker.acquirePrimary(), false);
  await h.tracker.start();
  assert.equal(h.constraints.length, 1);
  assert.equal(h.constraints[0].audio, false);
  assert.ok(h.constraints[0].video);
  assert.deepEqual(h.updates.map(update => update.status), ['loading', 'requesting-permission', 'initializing']);
  assert.equal(h.last().active, true);
  assert.equal(h.last().primaryLocked, false);
  assert.equal(h.tracker.getSample(), null);
  assert.equal(h.videos[0].srcObject, h.streams[0]);
  assert.equal(h.videos[0].muted, true);
  assert.equal(h.videos[0].playsInline, true);
  h.frame();
  assert.equal(h.last().status, 'ready');
  assert.equal(h.last().primaryLocked, false);
  assert.equal(h.tracker.acquirePrimary(), true);
  assert.equal(h.last().status, 'locked');
  assert.equal(h.last().primaryLocked, true);
  h.tracker.stop();
  released(h);
});

test('a fresh sample is a normalized eye midpoint and returned copies cannot corrupt the held sample', async () => {
  const h = harness();
  await h.tracker.start();
  h.frame();
  const sample = h.tracker.getSample();
  assert.ok(sample);
  assert.deepEqual(sample, { point: { x: 0.5, y: 0.5 }, timestampMs: 1080 });
  sample.point.x = 99;
  sample.timestampMs = -1;
  const reported = h.last().sample;
  assert.ok(reported);
  reported.point.y = NaN;
  assert.deepEqual(h.tracker.getSample(), { point: { x: 0.5, y: 0.5 }, timestampMs: 1080 });
  h.tracker.stop();
  released(h);
});

test('inference is throttled and never repeats a decoded video time', async () => {
  const h = harness();
  await h.tracker.start();
  h.frame();
  h.frame(10);
  h.frame(10);
  assert.equal(h.detectors[0].calls.length, 1);
  h.frame(60);
  assert.equal(h.detectors[0].calls.length, 2);
  h.frame(80, 0);
  assert.equal(h.detectors[0].calls.length, 2);
  h.tracker.stop();
  released(h);
});

test('duplicate decoded-frame metadata is never inferred twice', async () => {
  const h = harness();
  await h.tracker.start();
  h.frame();
  const pending = [...h.frames.values()][0];
  h.frames.clear();
  h.setTime(1160);
  pending(1160, metadata(0.08, 1, 1160));
  assert.equal(h.detectors[0].calls.length, 1);
  h.tracker.stop();
  released(h);
});

test('a timestamp-aged decoded frame is rejected before inference', async () => {
  const h = harness();
  await h.tracker.start();
  h.frame();
  const pending = [...h.frames.values()][0];
  h.frames.clear();
  h.setTime(1160);
  pending(900, metadata(0.16, 2, 900));
  assert.equal(h.detectors[0].calls.length, 1);
  assert.equal(h.last().status, 'stale');
  released(h);
});

test('native callback clock representation differences do not interrupt fresh video', async () => {
  const h = harness();
  h.setTime(1302);
  await h.tracker.start();
  h.frame();
  assert.equal(h.tracker.acquirePrimary(), true);
  const pending = [...h.frames.values()][0];
  h.frames.clear();
  h.setTime(1415.3999999761581);
  pending(1415.4, metadata(0.16, 2, 1405.4));
  assert.equal(h.last().status, 'locked');
  assert.equal(h.last().active, true);
  assert.equal(h.frames.size, 1);
  assert.equal(h.detectors[0].calls.length, 1); // The 33.4 ms frame still respects inference throttling.
  h.tracker.stop();
  released(h);
});

test('native sample rounding is normalized before publication and strict subsequent sample reads', async () => {
  for (const source of ['presentation', 'capture']) {
    const h = harness();
    const now = 1415.3999999761581;
    h.setTime(now - 80);
    await h.tracker.start();
    const pending = [...h.frames.values()][0];
    h.frames.clear();
    h.setTime(now);
    const frame = metadata(0.08, 1, source === 'presentation' ? 1415.4 : 1405.4);
    if (source === 'capture') frame.captureTime = 1415.4;
    pending(1415.4, frame);
    assert.equal(h.last().status, 'ready', source);
    assert.equal(h.last().sample?.timestampMs, now, source);
    assert.equal(h.tracker.getSample()?.timestampMs, now, source);
    assert.equal(h.tracker.acquirePrimary(), true, source);
    assert.equal(h.last().sample?.timestampMs, now, source);
    // Internal reads remain strict: a backwards clock is not normalized like incoming native metadata.
    h.setTime(now - 1e-7);
    assert.equal(h.tracker.getSample(), null, source);
    assert.equal(h.last().status, 'stale', source);
    released(h);
  }
});

test('native clock normalization rejects larger future offsets, stale boundaries and invalid timestamps', async () => {
  for (const source of ['callback', 'presentation', 'capture']) {
    for (const timestamp of [1080 + 2e-6, 1081, 880 - 2e-6, -1, NaN, Infinity]) {
      const h = harness();
      await h.tracker.start();
      const pending = [...h.frames.values()][0];
      h.frames.clear();
      h.setTime(1080);
      const frame = metadata(0.08, 1, source === 'presentation' ? timestamp : 1080);
      if (source === 'capture') frame.captureTime = timestamp;
      pending(source === 'callback' ? timestamp : 1080, frame);
      assert.equal(h.last().status, 'stale', `${source}: ${timestamp}`);
      assert.equal(h.last().sample, null);
      assert.equal(h.detectors[0].calls.length, 0);
      released(h);
    }
  }
});

test('normalizing native clocks does not extend the post-inference 200 ms freshness boundary', async () => {
  const h = harness();
  await h.tracker.start();
  h.detectors[0].onDetect = () => h.setTime(1280 + 2e-6);
  h.frame();
  assert.equal(h.last().status, 'stale');
  assert.equal(h.last().sample, null);
  released(h);
});

test('stale capture metadata cannot be disguised by a fresh compositor timestamp', async () => {
  const h = harness();
  await h.tracker.start();
  const pending = [...h.frames.values()][0];
  h.frames.clear();
  h.setTime(1080);
  pending(1080, { ...metadata(0.08, 1, 1080), captureTime: 800 });
  assert.equal(h.detectors[0].calls.length, 0);
  assert.equal(h.last().status, 'stale');
  released(h);
});

test('continuous modest movement keeps the explicitly acquired primary and emits fresh samples', async () => {
  const h = harness();
  await h.tracker.start();
  h.frame();
  h.tracker.acquirePrimary();
  h.detectors[0].result = { faceLandmarks: [face(0.52)] };
  h.frame();
  assert.equal(h.last().status, 'locked');
  assert.equal(h.last().active, true);
  const sample = h.tracker.getSample();
  assert.ok(sample);
  assert.ok(Math.abs(sample.point.x - 0.52) < 1e-9);
  assert.equal(sample.timestampMs, 1160);
  assert.equal(h.detectors[0].closes, 0);
  h.tracker.stop();
  released(h);
});

test('stop during pending permission closes the old detector and every late-arriving track', async () => {
  const h = harness();
  const permission = deferred<MediaStream>();
  h.resources.getUserMedia = () => permission.promise;
  const starting = h.tracker.start();
  await h.waitFor('requesting-permission');
  h.tracker.stop();
  assert.equal(h.detectors[0].closes, 1);
  const count = h.updates.length;
  const stream = new FakeStream();
  stream.tracks[0].throwsOnStop = true;
  permission.resolve(stream.mediaStream());
  await starting;
  assert.ok(stream.tracks.every(track => track.stops === 1));
  assert.equal(h.updates.length, count);
  assert.equal(h.videos.length, 0);
  released(h);
});

test('stop during model creation disposes its late result without ever requesting a camera', async () => {
  const h = harness();
  const model = deferred<TrackingDetector>();
  h.resources.createDetector = () => model.promise;
  const starting = h.tracker.start();
  h.tracker.stop();
  const detector = new FakeDetector();
  model.resolve(detector);
  await starting;
  assert.equal(detector.closes, 1);
  assert.equal(h.constraints.length, 0);
  assert.equal(h.last().status, 'stopped');
  released(h);
});

test('late model rejection cannot overwrite the stopped state', async () => {
  const h = harness();
  const model = deferred<TrackingDetector>();
  h.resources.createDetector = () => model.promise;
  const starting = h.tracker.start();
  h.tracker.stop();
  const count = h.updates.length;
  model.reject(new Error('late loader failure'));
  await starting;
  assert.equal(h.updates.length, count);
  assert.equal(h.last().status, 'stopped');
  released(h);
});

test('stop during pending playback releases capture and re-pauses a late play completion', async () => {
  const h = harness();
  const playback = deferred<void>();
  const video = new FakeVideo();
  video.playResult = playback.promise;
  h.resources.createVideo = () => { h.videos.push(video); return video.element(); };
  const starting = h.tracker.start();
  await h.waitFor('initializing');
  assert.equal(video.plays, 1);
  h.tracker.stop();
  released(h);
  const count = h.updates.length;
  playback.resolve();
  await starting;
  assert.equal(h.updates.length, count);
  assert.equal(video.paused, true);
  assert.equal(video.srcObject, null);
  assert.equal(h.frames.size, 0);
});

test('a new explicit start is not affected by the previous permission completion', async () => {
  const h = harness();
  const oldPermission = deferred<MediaStream>();
  const normalPermission = h.resources.getUserMedia;
  h.resources.getUserMedia = () => oldPermission.promise;
  const first = h.tracker.start();
  await h.waitFor('requesting-permission');
  h.resources.getUserMedia = normalPermission;
  await h.tracker.start();
  h.frame();
  assert.equal(h.last().status, 'ready');
  const currentDetector = h.detectors[1];
  const currentStream = h.streams[0];
  const previousStream = new FakeStream();
  const count = h.updates.length;
  oldPermission.resolve(previousStream.mediaStream());
  await first;
  assert.ok(previousStream.tracks.every(track => track.stops === 1));
  assert.equal(h.detectors[0].closes, 1);
  assert.equal(currentDetector.closes, 0);
  assert.ok(currentStream.tracks.every(track => track.stops === 0));
  assert.equal(h.updates.length, count);
  h.tracker.stop();
  released(h);
});

test('late model completion closes only that model, never a replacement session model', async () => {
  const h = harness();
  const oldModel = deferred<TrackingDetector>();
  const normalCreation = h.resources.createDetector;
  h.resources.createDetector = () => oldModel.promise;
  const first = h.tracker.start();
  h.resources.createDetector = normalCreation;
  await h.tracker.start();
  h.frame();
  const previousDetector = new FakeDetector();
  const count = h.updates.length;
  oldModel.resolve(previousDetector);
  await first;
  assert.equal(previousDetector.closes, 1);
  assert.equal(h.detectors[0].closes, 0);
  assert.equal(h.updates.length, count);
  h.tracker.stop();
  released(h);
});

test('permission denied, missing, busy and unsupported camera failures release the loaded detector', async () => {
  for (const name of ['NotAllowedError', 'NotFoundError', 'NotReadableError', 'NotSupportedError']) {
    const h = harness();
    h.resources.getUserMedia = async () => { throw new DOMException('camera failed', name); };
    await h.tracker.start();
    assert.equal(h.last().status, 'error', name);
    assert.equal(h.last().active, false);
    assert.ok(h.last().message);
    assert.equal(h.detectors[0].closes, 1);
    assert.equal(h.videos.length, 0);
    released(h);
  }
});

test('runtime loading failure never requests a camera and does not retry', async () => {
  const h = harness();
  let calls = 0;
  h.resources.createDetector = async () => { calls += 1; throw new Error('runtime unavailable'); };
  await h.tracker.start();
  assert.equal(h.last().status, 'error');
  assert.equal(h.constraints.length, 0);
  h.advance(20000);
  assert.equal(calls, 1);
  released(h);
});

test('playback rejection and pending-play watchdog release all capture resources', async () => {
  for (const reject of [true, false]) {
    const h = harness();
    const playback = deferred<void>();
    const video = new FakeVideo();
    video.playResult = playback.promise;
    h.resources.createVideo = () => { h.videos.push(video); return video.element(); };
    const starting = h.tracker.start();
    await h.waitFor('initializing');
    if (reject) playback.reject(new DOMException('autoplay failed', 'NotAllowedError'));
    else { h.advance(15000); playback.resolve(); }
    await starting;
    assert.equal(h.last().status, 'error');
    assert.doesNotMatch(h.last().message ?? '', /camera permission was denied/i);
    released(h);
  }
});

test('detector failure, video errors and ended tracks stop every resource', async () => {
  for (const failure of ['detector', 'video', 'track']) {
    const h = harness();
    await h.tracker.start();
    if (failure === 'detector') {
      h.detectors[0].onDetect = () => { throw new Error('detection failed'); };
      h.frame();
    } else if (failure === 'video') h.videos[0].dispatchEvent(new Event('error'));
    else h.streams[0].tracks[0].dispatchEvent(new Event('ended'));
    assert.equal(h.last().status, 'error');
    assert.equal(h.last().active, false);
    released(h);
  }
});

test('empty, ended or unexpected non-video streams cannot reach inference', async () => {
  for (const kind of ['empty', 'ended', 'audio']) {
    const h = harness();
    const stream = new FakeStream();
    if (kind === 'empty') stream.tracks = [];
    else if (kind === 'ended') stream.tracks[0].readyState = 'ended';
    else stream.tracks[0].kind = 'audio';
    h.resources.getUserMedia = async () => { h.streams.push(stream); return stream.mediaStream(); };
    await h.tracker.start();
    assert.equal(h.last().status, 'error');
    assert.equal(h.detectors[0].calls.length, 0);
    released(h);
  }
});

test('repeated stop removes callbacks/listeners once and stale callbacks cannot restart work', async () => {
  const h = harness();
  await h.tracker.start();
  h.frame();
  const frame = [...h.frames.values()][0];
  const timer = [...h.timers.values()][0].callback;
  h.tracker.stop();
  const count = h.updates.length;
  h.tracker.stop();
  h.tracker.stop();
  frame(1200, metadata(0.2, 2, 1200));
  timer();
  h.videos[0].dispatchEvent(new Event('error'));
  h.streams[0].tracks[0].dispatchEvent(new Event('ended'));
  assert.equal(h.updates.length, count);
  assert.equal(h.videos[0].pauses, 1);
  assert.ok(h.streams[0].tracks.every(track => track.stops === 1));
  released(h);
});

test('cleanup continues through throwing track, video and detector releases', async () => {
  const h = harness();
  await h.tracker.start();
  h.streams[0].tracks[0].throwsOnStop = true;
  h.videos[0].throwsOnPause = true;
  h.detectors[0].throwsOnClose = true;
  assert.doesNotThrow(() => h.tracker.stop());
  assert.ok(h.streams[0].tracks.every(track => track.stops === 1));
  assert.equal(h.last().status, 'error');
  assert.match(h.last().message ?? '', /release|cleanup|camera indicator/i);
  released(h);
});

test('before acquisition, zero or multiple faces clear the sample without selecting any viewer', async () => {
  const h = harness();
  await h.tracker.start();
  for (const [faces, status] of [[[], 'no-face'], [[face(), face(0.7)], 'multiple-faces']] as const) {
    h.detectors[0].result = { faceLandmarks: [...faces] };
    h.frame();
    assert.equal(h.last().status, status);
    assert.equal(h.last().active, true);
    assert.equal(h.last().sample, null);
    assert.equal(h.tracker.getSample(), null);
    assert.equal(h.tracker.acquirePrimary(), false);
  }
  h.detectors[0].result = { faceLandmarks: [face()] };
  h.frame();
  assert.equal(h.last().status, 'ready');
  assert.equal(h.tracker.acquirePrimary(), true);
  h.tracker.stop();
  released(h);
});

test('after primary acquisition any missing or additional face stops capture rather than switching viewers', async () => {
  for (const faces of [[], [face(), face(0.7)]]) {
    const h = harness();
    await h.tracker.start();
    h.frame();
    assert.equal(h.tracker.acquirePrimary(), true);
    h.detectors[0].result = { faceLandmarks: faces };
    h.frame();
    assert.equal(h.last().status, faces.length === 0 ? 'no-face' : 'multiple-faces');
    assert.equal(h.last().active, false);
    assert.equal(h.last().primaryLocked, false);
    assert.equal(h.last().sample, null);
    assert.equal(h.tracker.acquirePrimary(), false);
    h.detectors[0].result = { faceLandmarks: [face()] };
    h.frame();
    assert.equal(h.last().active, false);
    released(h);
  }
});

test('invalid or discontinuous landmarks release the acquired primary', async () => {
  const invalid = face();
  invalid[33].x = NaN;
  const outOfRange = face();
  outOfRange[263].y = 1.1;
  for (const points of [invalid, outOfRange, [], face(0.8), face(0.5, 0.5, 0.2), face(0.5, 0.5, 0)]) {
    const h = harness();
    await h.tracker.start();
    h.frame();
    h.tracker.acquirePrimary();
    h.detectors[0].result = { faceLandmarks: [points] };
    h.frame();
    assert.ok(['error', 'stale'].includes(h.last().status));
    assert.equal(h.last().active, false);
    assert.equal(h.last().sample, null);
    released(h);
  }
});

test('inference results that become stale while detection blocks are rejected', async () => {
  const h = harness();
  await h.tracker.start();
  h.detectors[0].onDetect = () => h.setTime(1400);
  h.frame();
  assert.equal(h.last().status, 'stale');
  assert.equal(h.last().sample, null);
  assert.equal(h.tracker.acquirePrimary(), false);
  released(h);
});

test('frozen and paused video expire even when no new inference can occur', async () => {
  for (const paused of [true, false]) {
    const h = harness();
    await h.tracker.start();
    h.frame();
    h.tracker.acquirePrimary();
    h.videos[0].paused = paused;
    h.frame(80, 0);
    h.frame(80, 0);
    h.advance(50);
    assert.equal(h.last().status, 'stale');
    assert.equal(h.last().active, false);
    released(h);
  }
});

test('sample reads reject expired or future timestamps before a delayed watchdog can run', async () => {
  for (const now of [1281, 1000]) {
    const h = harness();
    await h.tracker.start();
    h.frame();
    h.setTime(now);
    assert.equal(h.tracker.getSample(), null);
    assert.equal(h.tracker.acquirePrimary(), false);
    assert.equal(h.last().status, 'stale');
    released(h);
  }
});

test('a backwards video timeline is rejected instead of being reused as a new viewer frame', async () => {
  const h = harness();
  await h.tracker.start();
  h.frame();
  h.tracker.acquirePrimary();
  h.videos[0].currentTime = -0.5;
  h.frame();
  assert.equal(h.last().status, 'stale');
  released(h);
});

test('stop reentered during detection discards its result and does not reschedule work', async () => {
  const h = harness();
  await h.tracker.start();
  h.detectors[0].onDetect = () => h.tracker.stop();
  h.frame();
  assert.equal(h.last().status, 'stopped');
  assert.equal(h.last().sample, null);
  assert.equal(h.last().primaryLocked, false);
  released(h);
});
