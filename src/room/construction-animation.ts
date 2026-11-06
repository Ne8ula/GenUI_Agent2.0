import { EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, ShaderMaterial, type BufferGeometry, type ColorRepresentation, type Material, type Object3D } from 'three';

// One forward order for both modes. Replay plays its six stages (amber arrivals happen inside 'models');
// 'placeholders' is reached only live, while a real prop is generating.
export const CONSTRUCTION_STAGES = ['wire', 'blockout', 'placeholders', 'models', 'evaLit', 'paint', 'final'] as const;
export type ConstructionStage = typeof CONSTRUCTION_STAGES[number];
export const REPLAY_STAGES: readonly ConstructionStage[] = ['wire', 'blockout', 'models', 'evaLit', 'paint', 'final'];
export type ConstructionMode = 'live' | 'replay';
export type ConstructionState = { mode: ConstructionMode; stage: ConstructionStage | null; progress: number; done: boolean };

// Replay: six ten-second stages, about a minute, then the final image holds.
export const REPLAY_STAGE_MS = 10_000;
// Live: how long a stage takes to settle after its real event. It never moves on without one.
export const LIVE_SETTLE_MS = 2_500;
// Real app events and the stage each earns. Blockout, EVA render and final image exist only in the replay fixture.
export const LIVE_EVENT_STAGES = { interpreted: 'wire', 'prop-generating': 'placeholders', 'prop-installed': 'models', painted: 'paint' } as const;
export type LiveConstructionEvent = keyof typeof LIVE_EVENT_STAGES;

export const STAGE_TEXT: Readonly<Record<ConstructionStage, string>> = {
  wire: 'Wireframe', blockout: 'Grey blockout', placeholders: 'Amber placeholders', models: 'Models arriving',
  evaLit: 'EVA render', paint: 'Atlas paint wash', final: 'Final image',
};

// Stages only move forward: replay is driven by its clock alone, live only by events; restart means a new timeline.
export function createConstructionTimeline(mode: ConstructionMode, start: number) {
  let index = -1;
  let since = start;
  let origin = start;
  const advance = (to: number, at: number) => {
    if (to <= index) return false;
    index = to;
    since = at;
    return true;
  };
  return {
    mode,
    state(now: number): ConstructionState {
      if (mode === 'replay') {
        const step = Math.min(REPLAY_STAGES.length - 1, Math.floor(Math.max(0, now - origin) / REPLAY_STAGE_MS));
        advance(CONSTRUCTION_STAGES.indexOf(REPLAY_STAGES[step]), origin + step * REPLAY_STAGE_MS);
      }
      const stage = index < 0 ? null : CONSTRUCTION_STAGES[index];
      const progress = index < 0 ? 0 : Math.min(1, Math.max(0, (now - since) / (mode === 'replay' ? REPLAY_STAGE_MS : LIVE_SETTLE_MS)));
      return { mode, stage, progress, done: mode === 'replay' && stage === 'final' && progress === 1 };
    },
    event(event: LiveConstructionEvent, now: number) {
      return mode === 'live' && Object.hasOwn(LIVE_EVENT_STAGES, event) && advance(CONSTRUCTION_STAGES.indexOf(LIVE_EVENT_STAGES[event]), now);
    },
    skip(now: number) {
      if (mode === 'replay') origin = Math.min(origin, now - REPLAY_STAGE_MS * REPLAY_STAGES.length);
    },
  };
}

// Replay is recorded fixture content; its manifest label stays on screen from the first frame through the held final image.
export function constructionLabel(state: ConstructionState | null, fixtureLabel: string) {
  return state?.mode === 'replay' ? fixtureLabel : null;
}

// Replay models stage: hero `index` of `count` grows in its own window, in arrival order, overlapping the next.
// clay and colour are how far each front has spread over the hero (0..1); colour follows a beat behind clay.
export function growWindow(index: number, count: number, progress: number) {
  const start = count > 1 ? index / (count - 1) * 0.6 : 0;
  const clay = Math.min(1, Math.max(0, (progress - start) / 0.4));
  return { clay, colour: Math.min(1, Math.max(0, (clay - 0.3) / 0.7)) };
}

// Draws the wireframe line by line: segments appear in list order until progress has revealed them all.
export function revealLines(lines: readonly LineSegments[], progress: number) {
  const total = lines.reduce((sum, line) => sum + line.geometry.attributes.position.count / 2, 0);
  let budget = Math.floor(total * Math.min(1, Math.max(0, progress)));
  for (const line of lines) {
    const segments = line.geometry.attributes.position.count / 2;
    line.geometry.setDrawRange(0, Math.min(segments, budget) * 2);
    budget = Math.max(0, budget - segments);
  }
}

const edges = new WeakMap<BufferGeometry, EdgesGeometry>();
// Edge lines are cached per geometry and released with it.
export function edgesOf(geometry: BufferGeometry) {
  let found = edges.get(geometry);
  if (!found) {
    const made = found = new EdgesGeometry(geometry, 30);
    edges.set(geometry, made);
    geometry.addEventListener('dispose', () => made.dispose());
  }
  return found;
}

export function createConstructionMaterials(lineColor: ColorRepresentation, heroColor: ColorRepresentation) {
  const materials = {
    line: new LineBasicMaterial({ color: lineColor, transparent: true }),
    // Surfaces stay invisible but still hide the lines behind them.
    hidden: new MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    amber: new MeshBasicMaterial({ color: heroColor, transparent: true, opacity: 0.3, depthWrite: false }),
    amberLine: new LineBasicMaterial({ color: heroColor }),
    dispose() { materials.line.dispose(); materials.hidden.dispose(); materials.amber.dispose(); materials.amberLine.dispose(); },
  };
  return materials;
}
export type ConstructionMaterials = ReturnType<typeof createConstructionMaterials>;

// Draws a displayed room in its live stage without changing it: looks are swapped in for one draw and restored.
export function drawLiveConstruction(scene: Object3D, state: ConstructionState, focus: Object3D | null, materials: ConstructionMaterials, draw: () => void) {
  if (state.stage === 'paint') {
    scene.traverse(object => {
      const material = object instanceof Mesh ? object.material : null;
      if (material instanceof ShaderMaterial && material.uniforms.paintMap && material.uniforms.wash) {
        material.uniforms.wash.value = 1;
        material.uniforms.progress.value = state.progress;
      }
    });
  }
  if (state.stage !== 'wire' && state.stage !== 'placeholders') return draw();
  const meshes: Mesh[] = [];
  scene.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
  const swaps: [Mesh, Material | Material[]][] = [];
  const lines: LineSegments[] = [];
  try {
    for (const mesh of meshes) {
      swaps.push([mesh, mesh.material]);
      let focused = false;
      for (let node: Object3D | null = mesh; node && focus && !focused; node = node.parent) focused = node === focus;
      const amber = state.stage === 'placeholders' && focused;
      mesh.material = amber ? materials.amber : materials.hidden;
      const line = new LineSegments(edgesOf(mesh.geometry), amber ? materials.amberLine : materials.line);
      mesh.add(line);
      lines.push(line);
    }
    revealLines(lines, state.stage === 'wire' ? state.progress : 1);
    draw();
  } finally {
    for (const line of lines) { line.geometry.setDrawRange(0, Infinity); line.removeFromParent(); }
    for (const [mesh, material] of swaps) mesh.material = material;
  }
}
