import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  calibrationMatchesGeometry, createViewpointCalibration, mapViewportToDisplay, resetNeutralReference,
  updateTrackedViewpoint, type CalibrationGeometry, type TrackedViewpoint, type ViewpointCalibration,
} from './calibrated-viewpoint.ts';
import { createCameraTracking, type TrackingUpdate } from './camera-tracking.ts';
import type { Viewpoint } from './spatial-fixture.ts';

export type TrackingMode = { active: boolean; calibrated: boolean };
type Measurements = { width: number; height: number; x: number; y: number; distance: number; right: number; up: number };
export type VenueFields = { [Key in keyof Measurements]: string };
type Phase = 'off' | 'neutral' | 'right' | 'up' | 'return' | 'tracking' | 'reset';
export const EMPTY_VENUE_FIELDS: VenueFields = { width: '', height: '', x: '', y: '', distance: '', right: '', up: '' };
const OFF: TrackingUpdate = { status: 'stopped', active: false, primaryLocked: false, sample: null, message: null };
const INPUTS = [
  ['width', 'Display width', 100, 5000], ['height', 'Display height', 100, 5000],
  ['x', 'Neutral eye x (+ right)', undefined, undefined], ['y', 'Neutral eye y (+ up)', undefined, undefined],
  ['distance', 'Eye-to-screen distance', 100, 5000], ['right', 'Measured move right', 10, 300], ['up', 'Measured move up', 10, 300],
] as const;

function readMeasurements(fields: VenueFields): Measurements | null {
  if (Object.values(fields).some(value => !value.trim())) return null;
  const values = {
    width: Number(fields.width), height: Number(fields.height), x: Number(fields.x), y: Number(fields.y),
    distance: Number(fields.distance), right: Number(fields.right), up: Number(fields.up),
  };
  if (!Object.values(values).every(Number.isFinite) || values.width < 100 || values.width > 5000
    || values.height < 100 || values.height > 5000 || values.distance < 100 || values.distance > 5000
    || Math.abs(values.x) > values.width || Math.abs(values.y) > values.height
    || values.right < 10 || values.right > 300 || values.up < 10 || values.up > 300) return null;
  return values;
}

function measuredEye(values: Measurements) {
  return { xMm: values.x, yMm: values.y, distanceMm: values.distance };
}

function fullscreenGeometry(values: Measurements, viewport: HTMLDivElement | null): CalibrationGeometry | null {
  const canvas = viewport?.querySelector('canvas');
  const visual = window.visualViewport;
  if (!canvas || document.fullscreenElement !== document.documentElement || !visual
    || visual.scale !== 1 || visual.offsetLeft !== 0 || visual.offsetTop !== 0
    || visual.pageLeft !== 0 || visual.pageTop !== 0 || window.scrollX !== 0 || window.scrollY !== 0
    || Math.abs(window.innerWidth - screen.width) > 1 || Math.abs(window.innerHeight - screen.height) > 1
    || Math.abs(visual.width - window.innerWidth) > 1 || Math.abs(visual.height - window.innerHeight) > 1
    || document.documentElement.clientWidth !== window.innerWidth || document.documentElement.clientHeight !== window.innerHeight) return null;
  const rect = canvas.getBoundingClientRect();
  const geometry: CalibrationGeometry = {
    displayMm: { width: values.width, height: values.height },
    contentDisplayMm: { x: 0, y: 0, width: values.width, height: values.height },
    contentCss: { width: window.innerWidth, height: window.innerHeight },
    viewportCss: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    screenCss: { x: 0, y: 0, width: screen.width, height: screen.height },
    windowCss: { x: window.screenX, y: window.screenY, width: window.outerWidth, height: window.outerHeight },
    devicePixelRatio: window.devicePixelRatio,
    viewportScale: visual.scale,
  };
  return mapViewportToDisplay(geometry) ? geometry : null;
}

type Props = {
  fields: VenueFields;
  onFieldsChange: (fields: VenueFields) => void;
  viewport: RefObject<HTMLDivElement | null>;
  disabled: boolean;
  applyView: (calibration: ViewpointCalibration, offsetMm: Viewpoint) => boolean;
  onModeChange: (mode: TrackingMode) => void;
  onStopAll: (reason: string) => void;
  stopRef: RefObject<((reason: string) => void) | null>;
  neutralRef: RefObject<(() => void) | null>;
};

export default function CameraTracking({ fields, onFieldsChange, viewport, disabled, applyView, onModeChange, onStopAll, stopRef, neutralRef }: Props) {
  const [runtime, setRuntime] = useState<TrackingUpdate>(OFF);
  const [phase, setPhase] = useState<Phase>('off');
  const [panelOpen, setPanelOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenPending, setFullscreenPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fieldValues = useRef(fields);
  const phaseRef = useRef<Phase>('off');
  const runtimeRef = useRef<TrackingUpdate>(OFF);
  const controller = useRef<ReturnType<typeof createCameraTracking> | null>(null);
  const calibration = useRef<ViewpointCalibration | null>(null);
  const filtered = useRef<TrackedViewpoint | null>(null);
  const captures = useRef<{ neutral?: Viewpoint; right?: Viewpoint }>({});
  const geometryKey = useRef<string | null>(null);
  const geometryCleanup = useRef<(() => void) | null>(null);
  const mounted = useRef(false);
  const setupEpoch = useRef(0);
  const setupButton = useRef<HTMLButtonElement>(null);
  const panelTitle = useRef<HTMLHeadingElement>(null);

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    if (!mounted.current) return;
    setPhase(next);
    onModeChange({ active: runtimeRef.current.active, calibrated: next === 'tracking' });
  }, [onModeChange]);

  const clearCalibration = useCallback(() => {
    geometryCleanup.current?.();
    geometryCleanup.current = null;
    calibration.current = null;
    filtered.current = null;
    captures.current = {};
    geometryKey.current = null;
    phaseRef.current = 'off';
    if (mounted.current) {
      setPhase('off');
      onModeChange({ active: false, calibrated: false });
    }
  }, [onModeChange]);

  const stopTracking = useCallback((reason: string) => {
    setupEpoch.current += 1;
    clearCalibration();
    controller.current?.stop();
    if (mounted.current) { setNotice(reason); setFullscreenPending(false); }
  }, [clearCalibration]);

  const checkGeometry = useCallback(() => {
    if (!runtimeRef.current.active) return true;
    const values = readMeasurements(fieldValues.current);
    const geometry = values && fullscreenGeometry(values, viewport.current);
    if (!values || !geometry || JSON.stringify(geometry) !== geometryKey.current
      || (calibration.current && !calibrationMatchesGeometry(calibration.current, geometry, measuredEye(values)))) {
      stopTracking('Display, viewport or measurements changed. Camera stopped; enable again and recalibrate.');
      return false;
    }
    return true;
  }, [stopTracking, viewport]);

  const prepareNeutralReset = useCallback(() => {
    if (phaseRef.current !== 'tracking' || !calibration.current || !checkGeometry()) return;
    filtered.current = null;
    changePhase('reset');
    setPanelOpen(true);
    setNotice('View held. Return to the same measured neutral mark, then explicitly recapture it.');
  }, [changePhase, checkGeometry]);

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    const tracking = createCameraTracking(next => {
      if (disposed) return;
      runtimeRef.current = next;
      if (!next.active) clearCalibration();
      else if (!checkGeometry()) return;
      if (phaseRef.current === 'tracking' && calibration.current && next.primaryLocked && next.sample) {
        const view = updateTrackedViewpoint(calibration.current, filtered.current, next.sample, performance.now());
        if (!view) { stopTracking('Viewer movement was stale or implausible. View held; enable again and recalibrate.'); return; }
        if (!applyView(calibration.current, view.offsetMm)) { stopTracking('The calibrated view could not be rendered. Camera stopped.'); return; }
        if (runtimeRef.current !== next) return;
        filtered.current = view;
      }
      if (runtimeRef.current !== next) return;
      setRuntime(previous => previous.status === next.status && previous.active === next.active
        && previous.primaryLocked === next.primaryLocked && previous.message === next.message ? previous : { ...next, sample: null });
      onModeChange({ active: next.active, calibrated: phaseRef.current === 'tracking' });
    });
    controller.current = tracking;
    runtimeRef.current = OFF;
    setRuntime(OFF);
    setNotice(null);
    setFullscreenPending(false);
    clearCalibration();
    stopRef.current = stopTracking;
    neutralRef.current = prepareNeutralReset;
    let wasFullscreen = document.fullscreenElement === document.documentElement;
    setFullscreen(wasFullscreen);
    function fullscreenChanged() {
      const isFullscreen = document.fullscreenElement === document.documentElement;
      const exited = wasFullscreen && !isFullscreen;
      wasFullscreen = isFullscreen;
      setFullscreen(isFullscreen);
      if (exited) {
        onStopAll('Fullscreen ended. Tracking, reply and composition stopped; manual view is available.');
      } else checkGeometry();
    }
    function visibilityChanged() {
      if (document.hidden) stopTracking('Page hidden. Camera stopped; it will not restart automatically.');
    }
    function pageHidden() { stopTracking('Page left. Camera stopped.'); }
    document.addEventListener('fullscreenchange', fullscreenChanged);
    document.addEventListener('visibilitychange', visibilityChanged);
    window.addEventListener('pagehide', pageHidden);
    return () => {
      disposed = true;
      mounted.current = false;
      setupEpoch.current += 1;
      clearCalibration();
      tracking.stop();
      if (controller.current === tracking) controller.current = null;
      if (stopRef.current === stopTracking) stopRef.current = null;
      if (neutralRef.current === prepareNeutralReset) neutralRef.current = null;
      document.removeEventListener('fullscreenchange', fullscreenChanged);
      document.removeEventListener('visibilitychange', visibilityChanged);
      window.removeEventListener('pagehide', pageHidden);
    };
  }, [applyView, checkGeometry, clearCalibration, neutralRef, onModeChange, onStopAll, prepareNeutralReset, stopRef, stopTracking]);

  useEffect(() => {
    if (disabled) stopTracking('WebGL room unavailable. Camera tracking is off; conversation remains available.');
  }, [disabled, stopTracking]);

  useEffect(() => {
    if (!runtime.active || !runtimeRef.current.active) return;
    const visual = window.visualViewport;
    const observer = new ResizeObserver(checkGeometry);
    if (viewport.current) observer.observe(viewport.current);
    window.addEventListener('resize', checkGeometry);
    window.addEventListener('scroll', checkGeometry, true);
    visual?.addEventListener('resize', checkGeometry);
    visual?.addEventListener('scroll', checkGeometry);
    // Window/monitor moves do not consistently emit resize events, including during a permission wait.
    const timer = window.setInterval(checkGeometry, 200);
    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      window.clearInterval(timer);
      window.removeEventListener('resize', checkGeometry);
      window.removeEventListener('scroll', checkGeometry, true);
      visual?.removeEventListener('resize', checkGeometry);
      visual?.removeEventListener('scroll', checkGeometry);
    };
    geometryCleanup.current = cleanup;
    return cleanup;
  }, [checkGeometry, runtime.active, viewport]);

  useEffect(() => {
    if (panelOpen) panelTitle.current?.focus({ preventScroll: true });
  }, [panelOpen]);

  function closePanel() {
    setPanelOpen(false);
    setupButton.current?.focus({ preventScroll: true });
  }

  async function enterFullscreen() {
    if (disabled || runtimeRef.current.active) return;
    const epoch = ++setupEpoch.current;
    setFullscreenPending(true);
    setNotice(null);
    try {
      if (!document.fullscreenEnabled) throw new Error('Fullscreen is unavailable.');
      await document.documentElement.requestFullscreen();
      if (!mounted.current || epoch !== setupEpoch.current) {
        if (document.fullscreenElement === document.documentElement) void document.exitFullscreen().catch(() => {});
        return;
      }
      setFullscreen(document.fullscreenElement === document.documentElement);
      setNotice('Fullscreen setup only — camera is still off. Enter your physical measurements.');
    } catch {
      if (mounted.current && epoch === setupEpoch.current) setNotice('Fullscreen was not available or was declined. Camera was not requested; manual view remains available.');
    } finally {
      if (mounted.current && epoch === setupEpoch.current) setFullscreenPending(false);
    }
  }

  function editMeasurement(key: keyof VenueFields, value: string) {
    stopTracking('Measurements changed. Camera is off; complete setup before enabling again.');
    const next = { ...fieldValues.current, [key]: value };
    fieldValues.current = next;
    onFieldsChange(next);
  }

  function enableTracking() {
    if (disabled || runtimeRef.current.active || !controller.current) return;
    const values = readMeasurements(fieldValues.current);
    const geometry = values && fullscreenGeometry(values, viewport.current);
    if (!values || !geometry || document.hidden) {
      setNotice('Camera not requested. Enter valid measurements, use document fullscreen at 100% browser zoom, and keep the whole display unpanned.');
      return;
    }
    clearCalibration();
    geometryKey.current = JSON.stringify(geometry);
    changePhase('neutral');
    setNotice(null);
    void controller.current.start();
  }

  function capture(position: 'neutral' | 'right' | 'up') {
    if (phaseRef.current !== position || !checkGeometry()) return;
    const sample = controller.current?.getSample();
    if (!sample) { setNotice('A fresh, single-viewer sample is needed. No reference was captured.'); return; }
    if (position === 'neutral') {
      if (!controller.current?.acquirePrimary()) return;
      captures.current = { neutral: sample.point };
      changePhase('right');
      setNotice('Primary viewer selected. Move to the measured right mark at the same distance.');
    } else if (position === 'right') {
      captures.current.right = sample.point;
      changePhase('up');
      setNotice('Return to neutral, then move to the measured up mark; keep the same distance.');
    } else {
      const values = readMeasurements(fieldValues.current);
      const geometry = values && fullscreenGeometry(values, viewport.current);
      const { neutral, right } = captures.current;
      if (!values || !geometry || !neutral || !right) { stopTracking('Calibration references are incomplete. Enable again and recalibrate.'); return; }
      const next = createViewpointCalibration({
        geometry, eye: measuredEye(values), neutral,
        horizontal: { point: right, displacementMm: values.right },
        vertical: { point: sample.point, displacementMm: values.up },
      });
      if (!next) { stopTracking('Calibration was rejected. Check measurements and distinct right/up positions, then enable again.'); return; }
      calibration.current = next;
      changePhase('return');
      setNotice('Axes captured; the view has not moved. Return to the marked neutral position before starting.');
    }
  }

  function confirmNeutral() {
    if (!['return', 'reset'].includes(phaseRef.current) || !calibration.current || !checkGeometry()) return;
    const sample = controller.current?.getSample();
    const values = readMeasurements(fieldValues.current);
    if (!sample || !values || !runtimeRef.current.primaryLocked) return;
    const next = resetNeutralReference(calibration.current, sample.point, measuredEye(values));
    const view = next && updateTrackedViewpoint(next, null, sample, performance.now());
    if (!next || !view || !applyView(next, view.offsetMm) || !runtimeRef.current.active) {
      stopTracking('Neutral calibration could not be applied. View held; enable again and recalibrate.');
      return;
    }
    calibration.current = next;
    filtered.current = view;
    changePhase('tracking');
    setNotice(null);
    closePanel();
  }

  const validMeasurements = readMeasurements(fields) !== null;
  const hasSample = runtime.active && (runtime.status === 'ready' || runtime.status === 'locked');
  let status = notice ?? 'Camera off — manual viewpoint.';
  if (runtime.status === 'error' || runtime.status === 'stale' || (!runtime.active && runtime.message)) status = runtime.message ?? 'Tracking stopped. Manual view is available.';
  else if (runtime.active) {
    if (runtime.status === 'loading') status = 'Loading the local tracking model — camera not requested yet.';
    else if (runtime.status === 'requesting-permission') status = 'Waiting for camera permission. Stop tracking cancels this session.';
    else if (runtime.status === 'initializing') status = 'Starting local video — viewpoint tracking is not ready.';
    else if (runtime.status === 'no-face') status = 'Camera on — no face visible; no viewer selected.';
    else if (runtime.status === 'multiple-faces') status = 'Camera on — multiple faces; no viewer selected.';
    else if (phase === 'tracking') status = 'Calibrated fixed-distance x/y tracking — local 2D approximation.';
    else if (phase === 'reset') status = 'Camera on; view held. Return to the neutral mark and recapture it.';
    else if (runtime.status === 'ready') status = 'One viewer visible. Capture neutral to explicitly select them.';
    else status = 'Primary viewer selected — calibration in progress; view held.';
  }

  return (
    <div className="tracking-controls">
      <p className="tracking-status" id="fixture-viewpoint-label" role="status" aria-live="polite" aria-atomic="true">{status}</p>
      <div className="tracking-toolbar">
        <button ref={setupButton} type="button" aria-expanded={panelOpen} aria-controls="camera-tracking-panel" onClick={() => panelOpen ? closePanel() : setPanelOpen(true)}>Tracking setup</button>
        <button type="button" disabled={!runtime.active} onClick={() => stopTracking('Tracking stopped. View held until you drag, use arrows or choose Center view.')}>
          Stop tracking
        </button>
      </div>
      {panelOpen && (
        <section className="tracking-panel" id="camera-tracking-panel" aria-labelledby="camera-tracking-title">
          <div className="tracking-panel-heading">
            <h3 id="camera-tracking-title" ref={panelTitle} tabIndex={-1}>Calibrated webcam viewpoint</h3>
            <button type="button" onClick={closePanel}>Close</button>
          </div>
          <p>Optional, video-only local processing. No microphone, recording, frame uploads or saved calibration. One supervised viewer; not identity recognition. Venue measurement fields stay in this open app across visitor resets; viewer captures do not.</p>
          <p>Fixed-distance x/y approximation only: no live depth, head rotation or metric 3D accuracy. Keep facing the display. Camera mount or viewing-distance changes need complete setup again.</p>
          <button type="button" disabled={disabled || fullscreen || fullscreenPending || runtime.active} onClick={() => void enterFullscreen()}>
            {fullscreen ? 'Document fullscreen is active' : fullscreenPending ? 'Entering fullscreen…' : 'Enter calibration fullscreen (no camera)'}
          </button>
          <p>Use 100% browser zoom. Fullscreen maps the measured display to this page and the actual inner room canvas. Escape or leaving fullscreen stops tracking, reply <strong>and</strong> composition.</p>
          <fieldset>
            <legend>Physical measurements (mm) — all required</legend>
            <p>Measure the lit display, not its bezel. Mark your neutral eye position relative to its center: right/up positive (enter 0 explicitly when centered). Measure perpendicular eye-to-screen distance. Mark separate right and up positions from neutral at that same distance.</p>
            <div className="tracking-measurements">
              {INPUTS.map(([key, label, min, max]) => (
                <label key={key} htmlFor={`tracking-${key}`}>{label} (mm)
                  <input id={`tracking-${key}`} type="number" inputMode="decimal" step="any" min={min} max={max} required value={fields[key]} onChange={event => editMeasurement(key, event.target.value)} />
                </label>
              ))}
            </div>
            {!validMeasurements && <p className="tracking-help">Enter every measurement. Display/distance: 100–5000 mm; right/up moves: 10–300 mm. Eye offsets must stay within ± the measured display size.</p>}
          </fieldset>
          <button type="button" disabled={disabled || !fullscreen || !validMeasurements || runtime.active} onClick={enableTracking}>Enable camera tracking</button>
          <p>Enabling requests video; it does not move the room view. Capture each marked position deliberately. Stop tracking affects only the camera; Stop reply only text; Stop composition cancels pending room work and an awaiting shared interpretation/reply, but accepted reply presentation remains independent.</p>
          <div className="tracking-captures">
            <button type="button" disabled={!hasSample || phase !== 'neutral'} onClick={() => capture('neutral')}>1. Capture neutral / select viewer</button>
            <button type="button" disabled={!hasSample || phase !== 'right'} onClick={() => capture('right')}>2. Capture measured right position</button>
            <button type="button" disabled={!hasSample || phase !== 'up'} onClick={() => capture('up')}>3. Capture measured up position</button>
            <button type="button" disabled={!hasSample || (phase !== 'return' && phase !== 'reset')} onClick={confirmNeutral}>
              {phase === 'reset' ? 'At neutral mark — recapture reference' : '4. At neutral mark — start viewpoint'}
            </button>
          </div>
          <p className="tracking-help">{notice ?? (phase === 'tracking' ? 'Viewpoint tracking is calibrated for these measurements. Use Recapture neutral only at the same marked position.' : 'Move gradually between marks. Losing the primary viewer ends capture and requires a new enable and calibration.')}</p>
        </section>
      )}
    </div>
  );
}
