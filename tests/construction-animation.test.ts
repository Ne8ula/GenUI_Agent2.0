import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { BoxGeometry, EdgesGeometry, LineSegments, PerspectiveCamera } from 'three';
import { CONSTRUCTION_STAGES, LIVE_EVENT_STAGES, REPLAY_STAGES, REPLAY_STAGE_MS, constructionLabel, createConstructionTimeline, growWindow, revealLines } from '../src/room/construction-animation.ts';
import { validateConstructionManifest } from '../src/room/construction-fixture.ts';
import { createPaintMaterial } from '../src/room/room-paint.ts';

const order = (stage: string | null) => stage === null ? -1 : CONSTRUCTION_STAGES.indexOf(stage as never);

test('replay plays every stage forward in about a minute, holds the end, and never steps back', () => {
  const replay = createConstructionTimeline('replay', 1000);
  const seen: string[] = [];
  let previous = -1;
  for (const now of [1000, 5000, 12000, 9000, 25000, 33000, 44000, 2000, 52000, 61000, 61000 + 3_600_000]) {
    const state = replay.state(now);
    assert.ok(order(state.stage) >= previous, `stage went back at ${now}`);
    previous = order(state.stage);
    if (seen.at(-1) !== state.stage) seen.push(state.stage!);
  }
  assert.deepEqual(seen, [...REPLAY_STAGES], "six stages, no live-only step");
  assert.equal(REPLAY_STAGE_MS * REPLAY_STAGES.length, 60_000);
  assert.deepEqual(replay.state(61000), { mode: 'replay', stage: 'final', progress: 1, done: true });
  assert.equal(replay.event('painted', 61000), false);
});

test('skip jumps a replay to its held final image', () => {
  const replay = createConstructionTimeline('replay', 0);
  assert.equal(replay.state(1).stage, 'wire');
  replay.skip(2);
  assert.deepEqual(replay.state(2), { mode: 'replay', stage: 'final', progress: 1, done: true });
  assert.equal(replay.state(3).stage, 'final');
});

test('live never advances without a real event and only moves forward', () => {
  const live = createConstructionTimeline('live', 0);
  for (const now of [0, 10_000, 3_600_000]) assert.equal(live.state(now).stage, null);
  live.skip(10);
  assert.equal(live.state(10).stage, null);
  assert.equal(live.event('interpreted', 100), true);
  assert.equal(live.state(100).stage, 'wire');
  assert.equal(live.state(3_600_000).stage, 'wire', 'idles at its stage between events');
  assert.equal(live.event('painted', 200), true);
  assert.equal(live.event('prop-installed', 300), false, 'an earlier stage cannot follow');
  assert.equal(live.event('interpreted', 300), false);
  assert.equal(live.event('unknown' as never, 300), false);
  assert.equal(live.state(300).stage, 'paint');
  assert.equal(live.state(300).done, false);
  assert.ok(Object.values(LIVE_EVENT_STAGES).every(stage => !['blockout', 'evaLit', 'final'].includes(stage)), 'fixture-only stages are never live');
});

test('the replay label is shown on every replay frame and never on live', () => {
  const replay = createConstructionTimeline('replay', 0);
  const label = 'Replay of a finished room, recorded 2026-11-05. Not live generation.';
  for (let now = 0; now <= 70_000; now += 2_500) assert.equal(constructionLabel(replay.state(now), label), label);
  replay.skip(70_000);
  assert.equal(constructionLabel(replay.state(80_000), label), label, 'still labelled while the end holds');
  const live = createConstructionTimeline('live', 0);
  live.event('interpreted', 0);
  assert.equal(constructionLabel(live.state(0), label), null);
});

test('the fixture manifest keeps assets inside the fixture folder', () => {
  const manifest = {
    id: 'surreal-library', label: 'Surreal library v17',
    camera: { position: [0, 1.6, 3], lookAt: [0, 1.5, 0], fovDeg: 59.2, width: 1280, height: 720, viewOffsetX: -86 },
    room: { width: 8, depth: 10, height: 4 }, shell: 'models/room.glb',
    heroes: [{ id: 'b', name: 'Desk', glb: 'models/desk.glb', order: 2 }, { id: 'a', name: 'Globe', glb: 'models/globe.glb', order: 1 }],
    wire: { lineColor: '#9fc3d6', heroColor: '#e3a03a' },
    stages: { wire: 'stages/wire.png', evaLit: 'stages/eva.png', paint: 'stages/paint.png', final: 'stages/final.png' },
  };
  const valid = validateConstructionManifest(manifest);
  assert.deepEqual(valid.heroes.map(hero => hero.id), ['a', 'b']);
  assert.equal(valid.paintedWalls, false);
  for (const shell of ['../secret.glb', '/models/room.glb', 'https://example.com/room.glb', 'models/../../room.glb', 'models/room.glb?x=1'])
    assert.throws(() => validateConstructionManifest({ ...manifest, shell }));
  assert.throws(() => validateConstructionManifest({ ...manifest, paintedWalls: 'yes' }));
  assert.equal(valid.cleanStages, null);
  assert.equal(valid.heroIds, null);
  assert.equal(valid.architectureStages, null);
  const withClean = { ...manifest, cleanStages: { evaLit: 'eva-clean.png', paint: 'paint-clean.png', final: 'final-clean.png' },
    architectureStages: { evaLit: 'eva-col.png', paint: 'paint-col.png', final: 'final-col.png' }, masks: { hero: 'hero-mask.png', heroIds: 'hero-ids.png' } };
  assert.deepEqual(validateConstructionManifest(withClean).cleanStages, withClean.cleanStages);
  assert.deepEqual(validateConstructionManifest(withClean).architectureStages, withClean.architectureStages);
  assert.equal(validateConstructionManifest(withClean).heroIds, 'hero-ids.png');
  assert.throws(() => validateConstructionManifest({ ...withClean, cleanStages: { ...withClean.cleanStages, final: '../final.png' } }));
  assert.throws(() => validateConstructionManifest({ ...withClean, architectureStages: { ...withClean.architectureStages, paint: '/abs.png' } }));
  assert.throws(() => validateConstructionManifest({ ...withClean, masks: { heroIds: 'https://example.com/ids.png' } }));
  const recorded = validateConstructionManifest(JSON.parse(readFileSync(new URL('../public/fixtures/surreal-library/manifest.json', import.meta.url), 'utf8')));
  assert.equal(recorded.heroes.length, 8);
  assert.equal(recorded.paintedWalls, true);
  assert.ok(recorded.cleanStages && recorded.architectureStages && recorded.heroBehindStages && recorded.heroIds);
  assert.equal(valid.heroBehindStages, null);
  assert.throws(() => validateConstructionManifest({ ...withClean, heroBehindStages: { evaLit: 'a.png', paint: 'b.png', final: '../c.png' } }));
  assert.deepEqual(validateConstructionManifest({ ...withClean, heroBehindStages: { evaLit: 'a.png', paint: 'b.png', final: 'c.png' } }).heroBehindStages, { evaLit: 'a.png', paint: 'b.png', final: 'c.png' });
});

test('objects grow in arrival order, colour following clay, every object complete by the end of the stage', () => {
  const count = 8;
  for (let index = 0; index < count; index++) {
    let previous = { clay: 0, colour: 0 };
    for (let step = 0; step <= 100; step++) {
      const now = growWindow(index, count, step / 100);
      assert.ok(now.clay >= previous.clay && now.colour >= previous.colour, 'fronts only move forward');
      assert.ok(now.colour <= now.clay, 'colour never leads clay');
      previous = now;
    }
    assert.deepEqual(growWindow(index, count, 1), { clay: 1, colour: 1 });
  }
  assert.equal(growWindow(0, count, 0).clay, 0);
  assert.ok(growWindow(0, count, 0.2).clay > 0 && growWindow(count - 1, count, 0.2).clay === 0, 'first object starts before the last');
  assert.ok(growWindow(1, count, 0.2).clay > 0, 'windows overlap: the next object starts before the previous one finishes');
});

test('paint projection is parameterised by camera and defaults to the plain painting', () => {
  const camera = new PerspectiveCamera(59.2, 16 / 9, 0.05, 100);
  camera.position.set(1, 2, 3);
  camera.updateMatrixWorld();
  const material = createPaintMaterial(null as never, camera);
  const expected = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);
  assert.ok(material.uniforms.paintMatrix.value.equals(expected));
  assert.equal(material.uniforms.progress.value, 1);
  assert.equal(material.uniforms.wash.value, 0);
  material.dispose();
});

test('the wireframe draws line by line, finishing one outline before starting the next', () => {
  const lines = [new LineSegments(new EdgesGeometry(new BoxGeometry())), new LineSegments(new EdgesGeometry(new BoxGeometry()))];
  const drawn = () => lines.map(line => line.geometry.drawRange.count / 2);
  revealLines(lines, 0);
  assert.deepEqual(drawn(), [0, 0]);
  revealLines(lines, 0.25);
  assert.deepEqual(drawn(), [6, 0]);
  revealLines(lines, 0.75);
  assert.deepEqual(drawn(), [12, 6]);
  revealLines(lines, 1);
  assert.deepEqual(drawn(), [12, 12]);
});
