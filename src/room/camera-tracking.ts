import { MAX_SAMPLE_AGE_MS } from './calibrated-viewpoint.ts';
import type { Viewpoint } from './spatial-fixture.ts';

// Image-space eye midpoint only: the consumer calibrates fixed-distance x/y, never live depth or rotation.
export type TrackingSample = { point: Viewpoint; timestampMs: number };
export type TrackingUpdate = {
  status: 'stopped' | 'loading' | 'requesting-permission' | 'initializing' | 'ready' | 'locked'
    | 'no-face' | 'multiple-faces' | 'stale' | 'error';
  active: boolean;
  primaryLocked: boolean;
  sample: TrackingSample | null;
  message: string | null;
};

export type TrackingDetector = {
  detectForVideo(video: HTMLVideoElement, timestampMs: number): { faceLandmarks: ReadonlyArray<ReadonlyArray<Viewpoint>> };
  close(): void;
};

export type TrackingResources = {
  createDetector(): Promise<TrackingDetector>;
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  createVideo(): HTMLVideoElement;
  now(): number;
  requestFrame(video: HTMLVideoElement, callback: VideoFrameRequestCallback): number;
  cancelFrame(video: HTMLVideoElement, id: number): void;
  setTimer(callback: () => void, delayMs: number): number;
  clearTimer(id: number): void;
};

type Detection = TrackingSample & { eyeSpan: number };
type Session = {
  id: number;
  detector: TrackingDetector | null;
  tracks: MediaStreamTrack[];
  video: HTMLVideoElement | null;
  listeners: (() => void)[];
  frameId: number | null;
  timerId: number | null;
  lastFrameAt: number;
  lastVideoTime: number;
  lastFrameNumber: number;
  lastInferenceAt: number;
  sample: Detection | null;
  primaryLocked: boolean;
};

function browserResources(): TrackingResources {
  return {
    async createDetector() {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const files = await FilesetResolver.forVisionTasks('/tracking/mediapipe/0.10.32');
      return FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: '/tracking/models/face_landmarker-float16-v1.task', delegate: 'CPU' },
        runningMode: 'VIDEO',
        numFaces: 2,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    },
    getUserMedia(constraints) {
      if (!navigator.mediaDevices?.getUserMedia) throw new DOMException('Camera access is unavailable.', 'NotSupportedError');
      return navigator.mediaDevices.getUserMedia(constraints);
    },
    createVideo: () => document.createElement('video'),
    now: () => performance.now(),
    requestFrame(video, callback) {
      if (typeof video.requestVideoFrameCallback !== 'function') throw new DOMException('Decoded-frame callbacks are unavailable.', 'NotSupportedError');
      return video.requestVideoFrameCallback(callback);
    },
    cancelFrame: (video, id) => video.cancelVideoFrameCallback(id),
    setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimer: id => window.clearTimeout(id),
  };
}

function attempt(action: () => void) {
  try { action(); return true; } catch { return false; }
}

function releaseVideo(video: HTMLVideoElement) {
  const paused = attempt(() => video.pause());
  const detached = attempt(() => { video.srcObject = null; });
  return paused && detached;
}

function copySample(sample: TrackingSample | null): TrackingSample | null {
  return sample ? { point: { ...sample.point }, timestampMs: sample.timestampMs } : null;
}

function eyeMidpoint(points: ReadonlyArray<Viewpoint>, timestampMs: number): Detection | null {
  const eyes = [points[33], points[133], points[362], points[263]];
  if (eyes.some(point => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)
    || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1)) return null;
  const [a, b, c, d] = eyes;
  const left = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const right = { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 };
  const eyeSpan = Math.hypot(left.x - right.x, left.y - right.y);
  if (eyeSpan < 0.015 || eyeSpan > 0.6) return null;
  return { point: { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 }, timestampMs, eyeSpan };
}

function failureMessage(error: unknown, cameraRequest = false) {
  const name = error instanceof Error ? error.name : '';
  if (cameraRequest && name === 'NotAllowedError') return 'Camera permission was denied. Manual view remains available.';
  if (cameraRequest && name === 'NotFoundError') return 'No camera is available. Manual view remains available.';
  if (cameraRequest && name === 'NotReadableError') return 'The camera is busy or unavailable. Manual view remains available.';
  if (name === 'NotSupportedError') return 'This browser cannot run local camera tracking. Manual view remains available.';
  return 'Local camera tracking failed. Enable it explicitly to try again; manual view remains available.';
}

// "locked" means continuous single-viewer samples, not a calibrated viewpoint. The caller owns calibration and visibility/unmount stops.
export function createCameraTracking(onUpdate: (update: TrackingUpdate) => void, resources: TrackingResources = browserResources()) {
  let current: Session | null = null;
  let generation = 0;

  function publish(run: Session, status: TrackingUpdate['status'], message: string | null = null) {
    if (current !== run) return;
    onUpdate({ status, active: true, primaryLocked: run.primaryLocked, sample: copySample(run.sample), message });
  }

  function finish(run: Session, status: TrackingUpdate['status'], message: string | null = null) {
    if (current !== run) return;
    current = null;
    run.sample = null;
    run.primaryLocked = false;
    let clean = true;
    const { frameId, timerId, video, detector } = run;
    run.frameId = null;
    run.timerId = null;
    run.video = null;
    run.detector = null;
    if (frameId !== null && video) clean = attempt(() => resources.cancelFrame(video, frameId)) && clean;
    if (timerId !== null) clean = attempt(() => resources.clearTimer(timerId)) && clean;
    for (const remove of run.listeners.splice(0)) clean = attempt(remove) && clean;
    for (const track of run.tracks.splice(0)) clean = attempt(() => track.stop()) && clean;
    if (video) clean = releaseVideo(video) && clean;
    if (detector) clean = attempt(() => detector.close()) && clean;
    if (generation !== run.id) return;
    onUpdate({
      status: clean ? status : 'error', active: false, primaryLocked: false, sample: null,
      message: clean ? message : 'Tracking stopped, but resource cleanup reported a failure. Check the camera indicator before continuing.',
    });
  }

  function listen(run: Session, target: EventTarget, type: string, callback: () => void) {
    target.addEventListener(type, callback);
    run.listeners.push(() => target.removeEventListener(type, callback));
  }

  function normalizeNativeTimestamp(timestampMs: number, nowMs: number) {
    // Native video and performance clocks can differ by sub-nanosecond representation error; never emit a future sample.
    return timestampMs > nowMs && timestampMs - nowMs <= 1e-6 ? nowMs : timestampMs;
  }

  function fresh(timestampMs: number, nowMs: number) {
    return Number.isFinite(timestampMs) && Number.isFinite(nowMs) && timestampMs >= 0
      && nowMs >= timestampMs && nowMs - timestampMs <= MAX_SAMPLE_AGE_MS;
  }

  function watchdog(run: Session) {
    if (current !== run) return;
    run.timerId = null;
    const now = resources.now();
    const timestamp = run.primaryLocked && run.sample ? Math.min(run.lastFrameAt, run.sample.timestampMs) : run.lastFrameAt;
    if (!fresh(timestamp, now)) {
      finish(run, 'stale', 'Video or viewer samples stopped arriving. Enable again and recalibrate explicitly.');
      return;
    }
    run.timerId = resources.setTimer(() => watchdog(run), Math.max(1, MAX_SAMPLE_AGE_MS - (now - timestamp) + 1));
  }

  function schedule(run: Session) {
    if (current === run && run.video) run.frameId = resources.requestFrame(run.video, (timestamp, metadata) => frame(run, timestamp, metadata));
  }

  function frame(run: Session, frameTimestamp: number, metadata: VideoFrameCallbackMetadata) {
    if (current !== run) return;
    run.frameId = null;
    const video = run.video;
    const detector = run.detector;
    if (!video || !detector) return;
    try {
      const now = resources.now();
      const callbackTime = normalizeNativeTimestamp(frameTimestamp, now);
      if (!fresh(run.lastFrameAt, now) || !fresh(callbackTime, now)) {
        finish(run, 'stale', 'Video was interrupted. Enable again and recalibrate explicitly.');
        return;
      }
      if (video.ended) { finish(run, 'error', 'Camera playback ended. Enable explicitly to try again.'); return; }
      if (video.paused || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) { schedule(run); return; }
      const mediaTime = metadata.mediaTime;
      if (!Number.isFinite(mediaTime) || mediaTime < 0 || mediaTime < run.lastVideoTime
        || !Number.isInteger(metadata.presentedFrames) || metadata.presentedFrames < 1 || metadata.presentedFrames < run.lastFrameNumber) {
        finish(run, 'stale', 'Video timing changed. Enable again and recalibrate explicitly.');
        return;
      }
      if (metadata.presentedFrames === run.lastFrameNumber || mediaTime === run.lastVideoTime) { schedule(run); return; }
      const timestampMs = normalizeNativeTimestamp(metadata.captureTime ?? metadata.presentationTime, now);
      if (!fresh(timestampMs, now)) {
        finish(run, 'stale', 'The camera frame is too old or has invalid timing. Enable explicitly to try again.');
        return;
      }
      run.lastFrameNumber = metadata.presentedFrames;
      run.lastVideoTime = mediaTime;
      run.lastFrameAt = callbackTime;
      if (now - run.lastInferenceAt < 1000 / 15) { schedule(run); return; }
      run.lastInferenceAt = now;
      const result = detector.detectForVideo(video, now);
      if (current !== run) return;
      if (!fresh(timestampMs, resources.now())) {
        finish(run, 'stale', 'Local inference could not produce a fresh sample. Enable explicitly to try again.');
        return;
      }
      const faces = result.faceLandmarks;
      if (!Array.isArray(faces)) throw new Error('Invalid face results.');
      if (faces.length !== 1) {
        run.sample = null;
        const status = faces.length === 0 ? 'no-face' : 'multiple-faces';
        if (run.primaryLocked) finish(run, status, 'Primary viewer lost or ambiguous. Enable again and recalibrate explicitly.');
        else publish(run, status, faces.length === 0 ? 'No face is visible.' : 'More than one face is visible; no viewer selected.');
      } else {
        const sample = eyeMidpoint(faces[0], timestampMs);
        if (!sample) { finish(run, 'error', 'Invalid viewer landmarks. Enable again and recalibrate explicitly.'); return; }
        const previous = run.sample;
        // shortcut: continuity cannot identify a same-position substitution; use supervised single-viewer operation when identity matters.
        if (run.primaryLocked && previous && (sample.timestampMs <= previous.timestampMs
          || sample.timestampMs - previous.timestampMs > MAX_SAMPLE_AGE_MS
          || Math.hypot(sample.point.x - previous.point.x, sample.point.y - previous.point.y) > 0.12
          || sample.eyeSpan / previous.eyeSpan < 0.75 || sample.eyeSpan / previous.eyeSpan > 1.25)) {
          finish(run, 'stale', 'Viewer continuity was lost. Enable again and recalibrate explicitly.');
          return;
        }
        run.sample = sample;
        publish(run, run.primaryLocked ? 'locked' : 'ready');
      }
      schedule(run);
    } catch (error) {
      if (current === run) finish(run, 'error', failureMessage(error));
    }
  }

  async function start() {
    // Starting is an explicit replacement; old completions can only release their own captured resources.
    const id = ++generation;
    if (current) finish(current, 'stopped');
    if (id !== generation) return;
    const run: Session = {
      id, detector: null, tracks: [], video: null, listeners: [], frameId: null, timerId: null,
      lastFrameAt: 0, lastVideoTime: -1, lastFrameNumber: -1, lastInferenceAt: -Infinity,
      sample: null, primaryLocked: false,
    };
    current = run;
    let requestingCamera = false;
    try {
      publish(run, 'loading');
      if (current !== run) return;
      const detector = await resources.createDetector();
      if (current !== run) { attempt(() => detector.close()); return; }
      run.detector = detector;
      publish(run, 'requesting-permission');
      if (current !== run) return;
      requestingCamera = true;
      const stream = await resources.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
      requestingCamera = false;
      const tracks = stream.getTracks();
      if (current !== run) {
        for (const track of tracks) attempt(() => track.stop());
        return;
      }
      run.tracks = tracks;
      if (tracks.length === 0 || tracks.some(track => track.kind !== 'video' || track.readyState === 'ended')) throw new Error('No usable video-only stream.');
      for (const track of tracks) listen(run, track, 'ended', () => finish(run, 'error', 'The camera stopped. Enable explicitly to try again.'));
      const video = resources.createVideo();
      if (current !== run) { releaseVideo(video); return; }
      run.video = video;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = false;
      listen(run, video, 'error', () => finish(run, 'error', 'Camera playback failed. Enable explicitly to try again.'));
      video.srcObject = stream;
      run.timerId = resources.setTimer(() => finish(run, 'error', 'Camera playback did not start. Enable explicitly to try again.'), 10000);
      publish(run, 'initializing');
      if (current !== run) return;
      await video.play();
      if (current !== run) { releaseVideo(video); return; }
      resources.clearTimer(run.timerId);
      run.timerId = null;
      run.lastFrameAt = resources.now();
      if (!fresh(run.lastFrameAt, run.lastFrameAt)) throw new Error('Invalid tracking clock.');
      watchdog(run);
      schedule(run);
    } catch (error) {
      if (current === run) finish(run, 'error', failureMessage(error, requestingCamera));
    }
  }

  function getSample(): TrackingSample | null {
    const run = current;
    if (!run?.sample) return null;
    if (!fresh(run.sample.timestampMs, resources.now())) {
      finish(run, 'stale', 'The viewer sample expired. Enable again and recalibrate explicitly.');
      return null;
    }
    return copySample(run.sample);
  }

  return {
    start,
    stop() { if (current) finish(current, 'stopped'); },
    getSample,
    acquirePrimary() {
      const run = current;
      if (!run || !getSample() || current !== run) return false;
      if (!run.primaryLocked) { run.primaryLocked = true; publish(run, 'locked'); }
      return current === run && run.primaryLocked;
    },
  };
}
