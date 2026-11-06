import '@fontsource/ibm-plex-sans/400.css';
import { WebGLRenderer } from 'three';
import { createConstructionTimeline } from './room/construction-animation.ts';
import { fixtureAlignment, loadConstructionFixture } from './room/construction-fixture.ts';
import { VIEWPOINT_LIMITS, setFixtureViewpoint } from './room/spatial-fixture.ts';

// Replay-only exhibition page: the recorded fixture through its own recorded camera, at the recording's aspect ratio,
// as large as the screen allows (black bars otherwise). Start plays from the beginning; Stop clears the screen.
const stage = document.getElementById('stage')!, label = document.getElementById('label')!;
const startButton = document.getElementById('start') as HTMLButtonElement, stopButton = document.getElementById('stop') as HTMLButtonElement;

async function main() {
  const renderer = new WebGLRenderer({ antialias: true });
  stage.prepend(renderer.domElement);
  const fixture = await loadConstructionFixture(new AbortController().signal);
  label.textContent = fixture.manifest.label;
  // The recorded camera at the screen centre; the cursor moves the eye within the head-tracking limits, as a visitor's head would.
  const view = fixtureAlignment(fixture.manifest.camera).projector;
  addEventListener('pointermove', event => {
    setFixtureViewpoint(view, { x: (event.clientX / innerWidth * 2 - 1) * VIEWPOINT_LIMITS.x, y: (1 - event.clientY / innerHeight * 2) * VIEWPOINT_LIMITS.y });
    if (!frame) draw();
  });
  const aspect = fixture.manifest.camera.width / fixture.manifest.camera.height;
  let timeline: ReturnType<typeof createConstructionTimeline> | null = null;
  let frame = 0;
  const draw = () => {
    if (!timeline) { renderer.setClearColor(0x000000); renderer.clear(); return false; }
    const state = timeline.state(performance.now());
    fixture.show(state.stage!, state.progress);
    fixture.render(renderer, view);
    return !state.done;
  };
  const tick = () => { frame = draw() ? requestAnimationFrame(tick) : 0; };
  const fit = () => {
    const width = Math.floor(Math.min(innerWidth, innerHeight * aspect));
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(width, Math.floor(width / aspect));
    draw();
  };
  startButton.onclick = () => { cancelAnimationFrame(frame); timeline = createConstructionTimeline('replay', performance.now()); tick(); };
  stopButton.onclick = () => { cancelAnimationFrame(frame); frame = 0; timeline = null; draw(); };
  addEventListener('resize', fit);
  fit();
}

main().catch(error => { label.textContent = `Replay fixture unavailable: ${error instanceof Error ? error.message : String(error)}`; });
