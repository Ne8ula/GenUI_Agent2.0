import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { SRGBColorSpace, Texture, WebGLRenderer } from 'three';
import type { RoomRenderIdentity } from './room-prop-request.ts';
import { CENTER_VIEWPOINT, createSpatialFixture, setFixtureViewpoint, type Viewpoint } from './spatial-fixture.ts';
import { setCalibratedViewpoint, type ViewpointCalibration } from './calibrated-viewpoint.ts';
import CameraTracking, { type TrackingMode, type VenueFields } from './CameraTracking.tsx';
import { createRoomDisplay } from './room-display.ts';
import type { RoomCompositionState, RoomInstaller } from './room-composition.ts';
import type { RoomPropInstaller } from './room-prop-visual.ts';
import { createRoomInspectionGesture, type RoomSelection } from './room-inspection.ts';
import { constructionLabel, createConstructionMaterials, createConstructionTimeline, drawLiveConstruction, REPLAY_STAGES, STAGE_TEXT, type ConstructionMode, type ConstructionState, type LiveConstructionEvent } from './construction-animation.ts';
import { loadConstructionFixture, type ConstructionFixture } from './construction-fixture.ts';

export type RoomViewInstaller = { install: RoomInstaller; installProp: RoomPropInstaller; paint: (identity: RoomRenderIdentity, image: ImageBitmap) => boolean };
type Props = {
  venueFields: VenueFields;
  onVenueFieldsChange: (fields: VenueFields) => void;
  onStopAll: (reason: string) => void;
  onReady: (install: RoomViewInstaller | null) => void;
  onInspect: (unit: symbol, objectId: string) => void;
  onFailure: (message: string | null) => void;
  displayed: RoomCompositionState['displayed'];
  stopTrackingRef: RefObject<((reason: string) => void) | null>;
  // Real app events for the displayed case; live construction never advances without one.
  construction: { unit: symbol | null; events: readonly LiveConstructionEvent[]; failure: string | null; focusObjectId: string | null };
};
type Timeline = ReturnType<typeof createConstructionTimeline>;

export default function FixtureRoom({ venueFields, onVenueFieldsChange, onStopAll, onReady, onInspect, onFailure, displayed, stopTrackingRef: stopTracking, construction }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const viewpoint = useRef<Viewpoint>({ ...CENTER_VIEWPOINT });
  const moveView = useRef<((next: Viewpoint) => void) | null>(null);
  const trackedView = useRef<((calibration: ViewpointCalibration, offsetMm: Viewpoint) => boolean) | null>(null);
  const recaptureNeutral = useRef<(() => void) | null>(null);
  const trackingMode = useRef<TrackingMode>({ active: false, calibrated: false });
  const drag = useRef<number | null>(null);
  const gesture = useRef(createRoomInspectionGesture());
  const displayedUnit = useRef<symbol | null>(null);
  const pickObject = useRef<((x: number, y: number) => RoomSelection | null) | null>(null);
  const [mode, setMode] = useState<TrackingMode>({ active: false, calibrated: false });
  const [failure, setFailure] = useState<string | null>(null);
  const [cleanupWarning, setCleanupWarning] = useState<string | null>(null);
  const constructionView = useRef<{ mode: ConstructionMode; replay: Timeline | null; fixture: ConstructionFixture | null; live: { unit: symbol; timeline: Timeline } | null; focus: string | null }>(
    { mode: 'live', replay: null, fixture: null, live: null, focus: null });
  const fixtureLoad = useRef<AbortController | null>(null);
  const redraw = useRef<(() => void) | null>(null);
  const [constructionMode, setConstructionMode] = useState<ConstructionMode>('live');
  const [shownConstruction, setShownConstruction] = useState<ConstructionState | null>(null);
  const [replayFixture, setReplayFixture] = useState<{ phase: 'unloaded' | 'loading' | 'ready' | 'failed'; text: string }>({ phase: 'unloaded', text: '' });

  function releaseDrag(element: HTMLDivElement) {
    const pointer = drag.current;
    drag.current = null;
    gesture.current.cancel();
    if (pointer !== null && element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
  }

  const changeTrackingMode = useCallback((next: TrackingMode) => {
    const previous = trackingMode.current;
    if ((previous.active !== next.active || previous.calibrated !== next.calibrated) && viewport.current) releaseDrag(viewport.current);
    trackingMode.current = next;
    setMode(previous => previous.active === next.active && previous.calibrated === next.calibrated ? previous : next);
  }, []);

  const applyTrackedView = useCallback((calibration: ViewpointCalibration, offsetMm: Viewpoint) => {
    return trackedView.current?.(calibration, offsetMm) ?? false;
  }, []);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    let context: WebGL2RenderingContext | null = null;
    let renderer: WebGLRenderer | undefined;
    let fixture: ReturnType<typeof createSpatialFixture> | undefined;
    let display: ReturnType<typeof createRoomDisplay> | undefined;
    let observer: ResizeObserver | undefined;
    let effectAlive = true;
    let disposed = false;
    let offAxis = false;
    let ready = false;
    let size = { width: 0, height: 0, pixelRatio: 0 };
    let frame = 0;
    let reported = '';
    const liveMaterials = createConstructionMaterials(0x9fc3d6, 0xe3a03a);
    const view = constructionView.current;
    const replaying = () => view.mode === 'replay' && view.fixture !== null && view.replay !== null;
    // The live look belongs to the case it was earned by; any other displayed room is drawn as it is.
    const liveState = () => !replaying() && view.live && view.live.unit === displayedUnit.current ? view.live.timeline.state(performance.now()) : null;
    function report(state: ConstructionState | null) {
      const key = state ? `${state.mode}:${state.stage}:${state.done}` : '';
      if (key !== reported && effectAlive) { reported = key; setShownConstruction(state); }
    }

    function warnCleanup() {
      if (effectAlive) setCleanupWarning('Room cleanup failed; some resources may remain allocated. A committed replacement is not rolled back.');
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      onReady(null);
      cancelAnimationFrame(frame);
      redraw.current = null;
      const attempt = (release: () => void) => { try { release(); } catch { warnCleanup(); } };
      attempt(() => stopTracking.current?.('Room rendering stopped. Camera tracking is off.'));
      moveView.current = null;
      trackedView.current = null;
      pickObject.current = null;
      displayedUnit.current = null;
      observer?.disconnect();
      canvas.removeEventListener('webglcontextlost', contextLost);
      attempt(() => releaseDrag(element!));
      attempt(() => display ? display.dispose() : fixture?.dispose());
      if (renderer) {
        attempt(() => renderer!.dispose());
        attempt(() => renderer!.forceContextLoss());
      } else {
        attempt(() => context?.getExtension('WEBGL_lose_context')?.loseContext());
      }
      canvas.remove();
      attempt(() => liveMaterials.dispose());
    }

    function fail(message: string) {
      if (disposed) return;
      cleanup();
      setFailure(message);
      // A discarded StrictMode mount must not fail a reveal waiting for the live mount.
      queueMicrotask(() => { if (effectAlive) onFailure(message); });
    }

    function contextLost(event: Event) {
      event.preventDefault();
      fail('The WebGL context was lost. The room is no longer displayed. The conversation is still available; reload to try the room again.');
    }

    function render() {
      if (disposed || !display) return false;
      try {
        if (replaying()) {
          const state = view.replay!.state(performance.now());
          view.fixture!.show(state.stage!, state.progress);
          view.fixture!.render(renderer!, fixture!.camera);
          report(state);
          return true;
        }
        report(liveState());
        return display.render();
      } catch {
        fail('The room could not be rendered. No room is currently displayed; reload to try again.');
        return false;
      }
    }

    canvas.addEventListener('webglcontextlost', contextLost);
    try {
      setFailure(null);
      setCleanupWarning(null);
      context = canvas.getContext('webgl2', { antialias: true });
      if (!context) throw new Error('WebGL is unavailable.');
      renderer = new WebGLRenderer({ canvas, context, antialias: true });
      fixture = createSpatialFixture();
      display = createRoomDisplay({
        initial: fixture,
        camera: fixture.camera,
        draw: (scene, camera) => {
          const state = liveState();
          if (!state) return renderer!.render(scene, camera);
          const focus = view.focus ? display?.objectFor(view.focus) ?? null : null;
          drawLiveConstruction(scene, state, focus, liveMaterials, () => renderer!.render(scene, camera));
        },
        onCleanupError: warnCleanup,
        onUnavailable: () => fail('The previous room could not be restored. No room is currently displayed; reload to try again.'),
      });
      viewpoint.current = { ...CENTER_VIEWPOINT };
      element.appendChild(canvas);
      // A replay shows fixture content only; nothing in it can be inspected.
      pickObject.current = (x, y) => replaying() ? null : display?.pick(x, y, canvas.getBoundingClientRect()) ?? null;
      const tick = () => {
        frame = 0;
        if (render() && (replaying() || (liveState()?.progress ?? 1) < 1)) frame = requestAnimationFrame(tick);
      };
      redraw.current = () => { if (!disposed && !frame) frame = requestAnimationFrame(tick); };
      moveView.current = next => {
        if (disposed || !fixture || trackingMode.current.active) return;
        // A stopped calibrated view stays held until this deliberate manual action restores the original lens.
        if (offAxis) {
          fixture.camera.near = 0.05;
          fixture.camera.far = 20;
          fixture.camera.fov = 55;
          fixture.camera.zoom = 1;
          fixture.camera.aspect = element.clientWidth / Math.max(1, element.clientHeight);
          fixture.camera.updateProjectionMatrix();
          offAxis = false;
        }
        viewpoint.current = setFixtureViewpoint(fixture.camera, next);
        render();
      };
      trackedView.current = (calibration, offsetMm) => {
        if (disposed || !fixture || !trackingMode.current.active || !setCalibratedViewpoint(fixture.camera, calibration, offsetMm)) return false;
        offAxis = true;
        return render();
      };
      function resize() {
        if (disposed || !renderer || !fixture) return;
        const width = element!.clientWidth;
        const height = element!.clientHeight;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        if (width === size.width && height === size.height && pixelRatio === size.pixelRatio) return;
        if (trackingMode.current.active) stopTracking.current?.('Room viewport changed. Camera stopped; enable again and recalibrate.');
        if (width <= 0 || height <= 0) return;
        try {
          renderer.setPixelRatio(pixelRatio);
          renderer.setSize(width, height, false);
          size = { width, height, pixelRatio };
          if (!offAxis) {
            fixture.camera.aspect = width / height;
            fixture.camera.updateProjectionMatrix();
          }
          if (render() && !ready && display) {
            ready = true;
            onReady({
              install(room, binding, identity) {
                if (disposed || !display) return false;
                releaseDrag(element!);
                const installed = display.install(room, binding, identity);
                if (installed) displayedUnit.current = binding.unit;
                return installed;
              },
              installProp(request, visual, isCurrent) {
                if (disposed || !display) return false;
                releaseDrag(element!);
                return display.installProp(request, visual, isCurrent);
              },
              paint(identity, image) {
                if (disposed || !display) { image.close(); return false; }
                const texture = new Texture(image);
                texture.flipY = false;
                texture.colorSpace = SRGBColorSpace;
                texture.needsUpdate = true;
                texture.addEventListener('dispose', () => image.close());
                if (display.paint(identity, texture)) return true;
                texture.dispose();
                return false;
              },
            });
          }
        } catch {
          fail('The room could not be resized. No room is currently displayed; reload to try again.');
        }
      }
      observer = new ResizeObserver(resize);
      observer.observe(element);
      resize();
    } catch {
      fail('WebGL initialization failed. No room is currently displayed; reload to try again.');
    }
    element.focus({ preventScroll: true });
    return () => { effectAlive = false; cleanup(); };
  }, [onReady, onFailure, stopTracking]);

  const { unit: liveUnit, focusObjectId, failure: liveFailure } = construction;
  const liveEvents = construction.events.join();
  useEffect(() => {
    const view = constructionView.current;
    const now = performance.now();
    if (view.live?.unit !== liveUnit) view.live = liveUnit ? { unit: liveUnit, timeline: createConstructionTimeline('live', now) } : null;
    for (const event of liveEvents ? liveEvents.split(',') as LiveConstructionEvent[] : []) view.live?.timeline.event(event, now);
    view.focus = focusObjectId;
    redraw.current?.();
  }, [liveUnit, liveEvents, focusObjectId]);

  useEffect(() => () => {
    fixtureLoad.current?.abort();
    fixtureLoad.current = null;
    constructionView.current.fixture?.dispose();
    constructionView.current.fixture = null;
  }, []);

  const switchConstructionMode = useCallback((mode: ConstructionMode) => {
    const view = constructionView.current;
    view.mode = mode;
    if (mode === 'live') view.replay = null;
    setConstructionMode(mode);
    redraw.current?.();
  }, []);

  // Start plays once; restart begins a fresh timeline. The fixture loads on first use.
  const playReplay = useCallback((restart: boolean) => {
    const view = constructionView.current;
    switchConstructionMode('replay');
    if (view.fixture) {
      if (restart || !view.replay) view.replay = createConstructionTimeline('replay', performance.now());
      redraw.current?.();
      return;
    }
    if (fixtureLoad.current) return;
    const load = fixtureLoad.current = new AbortController();
    setReplayFixture({ phase: 'loading', text: '' });
    loadConstructionFixture(load.signal).then(loaded => {
      if (fixtureLoad.current !== load) { loaded.dispose(); return; }
      fixtureLoad.current = null;
      view.fixture = loaded;
      setReplayFixture({ phase: 'ready', text: loaded.manifest.label });
      if (view.mode === 'replay') view.replay = createConstructionTimeline('replay', performance.now());
      redraw.current?.();
    }, (error: unknown) => {
      if (fixtureLoad.current !== load) return;
      fixtureLoad.current = null;
      setReplayFixture({ phase: 'failed', text: error instanceof Error ? error.message : 'Unknown loading error.' });
    });
  }, [switchConstructionMode]);

  const skipReplay = useCallback(() => {
    const view = constructionView.current;
    if (view.mode !== 'replay' || !view.replay) return;
    view.replay.skip(performance.now());
    redraw.current?.();
  }, []);

  useEffect(() => {
    function onShortcut(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || failure) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      const action = ({
        m: () => switchConstructionMode(constructionView.current.mode === 'live' ? 'replay' : 'live'),
        p: () => playReplay(false),
        e: skipReplay,
        r: () => playReplay(true),
      } as Record<string, () => void>)[event.key.toLowerCase()];
      if (!action) return;
      event.preventDefault();
      action();
    }
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [failure, playReplay, skipReplay, switchConstructionMode]);

  const replayShown = shownConstruction?.mode === 'replay' ? shownConstruction : null;
  const replayLabel = constructionLabel(replayShown, replayFixture.text);
  const constructionText = constructionMode === 'replay'
    ? replayShown ? replayShown.done ? `Replay finished; holding the final image. Press R to restart. ${replayLabel}`
      : `Replay, stage ${REPLAY_STAGES.indexOf(replayShown.stage!) + 1} of ${REPLAY_STAGES.length}: ${STAGE_TEXT[replayShown.stage!]}. ${replayLabel}`
      : replayFixture.phase === 'loading' ? 'Loading the recorded replay fixture…'
        : replayFixture.phase === 'failed' ? `Replay fixture unavailable: ${replayFixture.text} The real room is still shown.`
          : 'Replay mode. Press P or Start replay to play the recorded fixture. Until then the real room is shown.'
    : shownConstruction?.stage ? `Live: ${STAGE_TEXT[shownConstruction.stage]}, reached on a real app event. Holding until the next event.${liveFailure ? ` ${liveFailure}` : ''}`
      : liveUnit ? `Live: waiting for the room display.${liveFailure ? ` ${liveFailure}` : ''}`
        : 'Live: no composed room is displayed, so nothing is under construction. The room is drawn as it is.';

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') releaseDrag(event.currentTarget);
    if (!moveView.current || event.altKey || event.ctrlKey || event.metaKey) return;
    let x = 0;
    let y = 0;
    switch (event.key) {
      case 'ArrowLeft': x = -0.1; break;
      case 'ArrowRight': x = 0.1; break;
      case 'ArrowUp': y = 0.1; break;
      case 'ArrowDown': y = -0.1; break;
      default: return;
    }
    event.preventDefault();
    if (trackingMode.current.active) return;
    moveView.current({ x: viewpoint.current.x + x, y: viewpoint.current.y + y });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!moveView.current || event.button !== 0 || !event.isPrimary || drag.current !== null) return;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = event.pointerId;
    gesture.current.start(event.pointerId, event.clientX, event.clientY, displayedUnit.current);
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const delta = gesture.current.move(event.pointerId, event.clientX, event.clientY);
    if (!delta || !moveView.current || trackingMode.current.active) return;
    moveView.current({
      x: viewpoint.current.x + delta.x * 0.004,
      y: viewpoint.current.y - delta.y * 0.004,
    });
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag.current !== event.pointerId) return;
    const click = gesture.current.end(event.pointerId, event.clientX, event.clientY);
    releaseDrag(event.currentTarget);
    if (!click) return;
    const selected = pickObject.current?.(click.x, click.y);
    if (selected && selected.unit === click.unit) onInspect(selected.unit, selected.objectId);
  }

  return (
    <section className="fixture-room" aria-labelledby="fixture-room-title">
      <div className="fixture-room-caption" tabIndex={0} role="region" aria-label="Displayed room description">
        <h2 id="fixture-room-title">{failure ? 'Room unavailable' : replayShown ? 'Replay fixture' : displayed ? 'Composed room' : 'Fixed fixture room'}</h2>
        <p id="fixture-room-description">
          {failure ? 'No room is currently displayed.' : replayShown ? `${replayLabel} Shown in place of the current room, which is unchanged; nothing in the replay can be inspected.` : displayed
            ? `Seed ${displayed.seed} · ${displayed.description.width} × ${displayed.description.depth} × ${displayed.description.height} units · ${displayed.description.furnishings.length} furnishings · ${displayed.description.doorway.placement} doorway`
            : 'A doorway, a table and a chair. Not generated from visitor words.'}
        </p>
        {cleanupWarning && <p role="status">{cleanupWarning}</p>}
      </div>
      <div
        className="fixture-viewport"
        ref={viewport}
        tabIndex={0}
        role="region"
        aria-label="Room viewpoint"
        aria-describedby="fixture-room-description fixture-controls-hint fixture-viewpoint-label"
        aria-disabled={Boolean(failure)}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={event => { if (drag.current === event.pointerId) releaseDrag(event.currentTarget); }}
        onLostPointerCapture={event => { if (drag.current === event.pointerId) releaseDrag(event.currentTarget); }}
        onBlur={event => releaseDrag(event.currentTarget)}
      >
        {failure && <p className="fixture-fallback" role="status">{failure}</p>}
        {!failure && replayLabel && <p className="construction-label"><strong>Replay</strong> {replayLabel}</p>}
      </div>
      <CameraTracking
        fields={venueFields}
        onFieldsChange={onVenueFieldsChange}
        viewport={viewport}
        disabled={Boolean(failure)}
        applyView={applyTrackedView}
        onModeChange={changeTrackingMode}
        onStopAll={onStopAll}
        stopRef={stopTracking}
        neutralRef={recaptureNeutral}
      />
      <div className="construction-controls" role="group" aria-label="Construction animation" aria-describedby="construction-keys">
        <div className="construction-modes" role="group" aria-label="Construction animation mode">
          <button type="button" aria-pressed={constructionMode === 'live'} aria-keyshortcuts="M" disabled={Boolean(failure)} onClick={() => switchConstructionMode('live')}>Live</button>
          <button type="button" aria-pressed={constructionMode === 'replay'} aria-keyshortcuts="M" disabled={Boolean(failure)} onClick={() => switchConstructionMode('replay')}>Replay</button>
        </div>
        {/* These buttons never disable themselves when pressed, so keyboard focus stays put. */}
        <button type="button" aria-keyshortcuts={replayShown ? 'R' : 'P'} disabled={Boolean(failure)} onClick={() => playReplay(Boolean(replayShown))}>{replayShown ? 'Restart replay' : 'Start replay'}</button>
        <button type="button" aria-keyshortcuts="E" disabled={!replayShown} onClick={skipReplay}>Skip to end</button>
        <p role="status">{constructionText} <span id="construction-keys">Keys: M mode, P start, E end, R restart.</span></p>
      </div>
      <div className="fixture-controls">
        <p id="fixture-controls-hint">
          {failure ? 'Room controls are unavailable.' : mode.active ? 'Manual movement paused. Stop tracking to use drag or arrow keys.' : 'Drag to shift viewpoint, or focus the view and use arrow keys.'}
          {!failure && displayed && !replayShown && ' Click a furnishing to inspect, or use the Inspect objects list.'}
        </p>
        <button type="button" disabled={Boolean(failure) || (mode.active && !mode.calibrated)} onClick={() => mode.active ? recaptureNeutral.current?.() : moveView.current?.(CENTER_VIEWPOINT)}>
          {mode.active ? 'Recapture neutral' : 'Center view'}
        </button>
      </div>
    </section>
  );
}
