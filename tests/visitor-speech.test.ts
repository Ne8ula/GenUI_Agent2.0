import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { createRoomCompositionController, type RoomCompositionState } from '../src/room/room-composition.ts';
import { createRoomDisplay } from '../src/room/room-display.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';

type Narration = { unit: symbol; origin: 'local-script'; text: string };
type State = RoomCompositionState & { narration?: Narration | null };
function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
}
function setup(t: TestContext, fixture = inspectionFixture(), fetch: typeof globalThis.fetch = async () => json(fixture)) {
  const display = createRoomDisplay({ initial: { scene: new Scene(), dispose() {} }, camera: new PerspectiveCamera(), draw() {} });
  const controller = createRoomCompositionController({ fetch, yieldToBuild: () => Promise.resolve() });
  t.after(() => { controller.dispose(); display.dispose(); });
  return { controller, display };
}
function narration(state: State) {
  assert.ok(state.narration, 'revealed cases must expose intentionally public local narration');
  return state.narration;
}
async function reveal(app: ReturnType<typeof setup>) {
  assert.equal(await app.controller.compose('PRIVATE-VISITOR-WORDS', 41), true);
  assert.equal(app.controller.reveal(app.display.install), true);
  return app.controller.getState().investigation!.unit;
}

test('a revealed case with a recorded local statement exposes only intentionally public narration', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-3'), true);
  const state: State = app.controller.getState();
  assert.ok(state.narration, 'successful real Reveal and local action must expose a safe public narration projection');
  assert.deepEqual(Reflect.ownKeys(state.narration).sort(), ['origin', 'text', 'unit']);
  assert.equal(state.narration.origin, 'local-script');
  assert.equal(state.narration.unit, unit);
  assert.match(state.narration.text, /local[ /-]+script/i);
  assert.match(state.narration.text, /not (?:evidence|proof)|cannot prove/i);
  for (const candidate of state.investigation!.candidates) {
    assert.ok(state.narration.text.includes(candidate.id));
    assert.ok(state.narration.text.includes(candidate.badge));
    assert.ok(state.narration.text.includes(candidate.fabric));
  }
  assert.ok(state.narration.text.includes(state.investigation!.statements[0].text));
  assert.doesNotMatch(state.narration.text, /clue-[1-4]|PRIVATE-VISITOR|"solution"|"event"|"description"|"accepted"|"displayed"/);
});

test('narration is absent for authored pending reset and disposed sessions', async t => {
  const app = setup(t);
  assert.equal((app.controller.getState() as State).narration, null);
  assert.equal(await app.controller.compose('four chairs', 41), true);
  assert.equal((app.controller.getState() as State).narration, null);
  assert.equal(app.controller.reveal(app.display.install), true);
  narration(app.controller.getState());
  assert.equal(app.controller.reset(), true);
  assert.equal((app.controller.getState() as State).narration, null);
  await reveal(app);
  app.controller.dispose();
  assert.equal((app.controller.getState() as State).narration, null);
});

test('undiscovered truth cannot influence public narration for otherwise identical visitor actions', async t => {
  const differentTruth = inspectionFixture();
  assert.equal(differentTruth.outcome, 'supported');
  if (differentTruth.outcome !== 'supported') return;
  differentTruth.case.clues[1].value = 'wool';
  differentTruth.case.solution.candidateId = 'candidate-3';
  const first = setup(t);
  const second = setup(t, differentTruth);
  for (const app of [first, second]) {
    const unit = await reveal(app);
    assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-2'), true);
    assert.equal(app.controller.proposeHypothesis(unit, 'candidate-1', []), true);
    assert.equal(app.controller.accuse(unit, 'candidate-1', []), true);
  }
  assert.equal(narration(first.controller.getState()).text, narration(second.controller.getState()).text);
  for (const app of [first, second]) assert.doesNotMatch(narration(app.controller.getState()).text, /clue-[1-4]|The cited fictional discoveries identify/);
});

test('read-aloud contains discovered annotations and actual local actions but only justified resolution', async t => {
  const fixture = inspectionFixture();
  assert.equal(fixture.outcome, 'supported');
  if (fixture.outcome !== 'supported') return;
  fixture.case.clues[1].objectId = 'object-1';
  fixture.case.clues[2].objectId = 'object-2';
  const app = setup(t, fixture);
  const unit = await reveal(app);
  assert.equal(app.controller.inspect(unit, 'object-1'), true);
  assert.equal(app.controller.proposeHypothesis(unit, 'candidate-1', ['clue-1']), true);
  assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-2'), true);
  const statement = app.controller.getState().investigation!.statements[0];
  assert.equal(app.controller.challengeEvaStatement(unit, statement.id, ['clue-1']), true);
  assert.equal(app.controller.accuse(unit, 'candidate-1', ['clue-1']), true);
  const before = app.controller.getState();
  const publicBefore = narration(before);
  for (const clue of before.inspection!.discoveredClues) assert.ok(publicBefore.text.includes(clue.text));
  assert.match(publicBefore.text, /visitor.*hypothesis|hypothesis.*visitor/i);
  assert.match(publicBefore.text, /challenge/i);
  assert.match(publicBefore.text, /local[ -]rule/i);
  assert.equal(before.investigation!.challenges.at(-1)!.assessment.status, 'contradicted');
  assert.ok(publicBefore.text.includes(statement.text));
  assert.match(publicBefore.text, /local[ /-]+script/i);
  assert.match(publicBefore.text, /contradict/i);
  assert.match(publicBefore.text, /not (?:evidence|proof)|cannot prove/i);
  assert.doesNotMatch(publicBefore.text, /clue-3|clue-4|The cited fictional discoveries identify/);
  assert.equal(app.controller.accuse(unit, 'candidate-1', ['clue-1', 'clue-2']), true);
  const resolved = app.controller.getState();
  assert.equal(resolved.investigation!.resolution!.status, 'resolved');
  assert.ok(narration(resolved).text.includes(resolved.investigation!.resolution!.explanation));
  assert.doesNotMatch(narration(resolved).text, /clue-3|clue-4|PRIVATE-VISITOR|"solution"/);
  assert.equal(before.investigation!.resolution!.status, 'insufficient');
  assert.doesNotMatch(publicBefore.text, /The cited fictional discoveries identify/);
});

test('failed and pending replacement retain narration while successful replacement invalidates its unit', async t => {
  let calls = 0;
  const app = setup(t, inspectionFixture(), async () => json(++calls === 2 ? { ...inspectionFixture(), extra: true } : inspectionFixture()));
  const unit = await reveal(app);
  assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-3'), true);
  const before = narration(app.controller.getState());
  assert.equal(await app.controller.compose('invalid replacement', 41), false);
  assert.deepEqual(narration(app.controller.getState()), before);
  assert.equal(await app.controller.compose('pending replacement', 41), true);
  assert.deepEqual(narration(app.controller.getState()), before);
  assert.equal(app.controller.reveal(() => false), false);
  assert.deepEqual(narration(app.controller.getState()), before);
  assert.equal(await app.controller.compose('pending replacement', 41), true);
  assert.equal(app.controller.stop(), true);
  assert.deepEqual(narration(app.controller.getState()), before);
  await reveal(app);
  const current = narration(app.controller.getState());
  assert.notEqual(current.unit, before.unit);
  assert.equal(app.controller.getState().investigation!.statements.length, 0);
  assert.doesNotMatch(current.text, /I suspect candidate-3/);
});

test('bounded detached narration cannot rewrite immutable history or grow with unlimited action history', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  for (let count = 0; count < 80; count += 1) assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-3'), true);
  const before = app.controller.getState();
  const view = narration(before);
  assert.ok(view.text.length > 0 && view.text.length <= 2000);
  assert.ok(view.text.includes(before.investigation!.statements.at(-1)!.text));
  assert.equal(before.investigation!.history.length, 80);
  const original = { ...view };
  view.text = 'Forged public answer';
  view.unit = Symbol('forged');
  assert.deepEqual(narration(app.controller.getState()), original);
  assert.deepEqual(app.controller.getState().investigation, before.investigation);
});
