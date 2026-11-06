import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { createRoomCompositionController, type ComposedRoom, type RoomCompositionState } from '../src/room/room-composition.ts';
import { createProceduralRoom } from '../src/room/procedural-room.ts';
import { createRoomDisplay } from '../src/room/room-display.ts';
import type { RoomHypothesis } from '../src/room/room-investigation.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';

type Statement = { id: string; origin: 'local-script'; candidateId: string; text: string };
type Challenge = { origin: 'visitor'; statementId: string; clueIds: string[]; assessment: RoomHypothesis['assessment'] };
type Resolution = {
  origin: 'local-rule'; status: 'insufficient' | 'incorrect' | 'resolved';
  candidateId: string; clueIds: string[]; explanation: string;
};
type ExistingInvestigation = NonNullable<RoomCompositionState['investigation']>;
type Investigation = Omit<ExistingInvestigation, 'history'> & {
  statements: Statement[];
  challenges: Challenge[];
  resolution: Resolution | null;
  history: (ExistingInvestigation['history'][number]
    | { kind: 'statement'; origin: 'local-script'; statement: Statement }
    | { kind: 'challenge'; origin: 'visitor'; challenge: Challenge }
    | { kind: 'accusation'; origin: 'visitor'; result: Resolution })[];
};
type State = Omit<RoomCompositionState, 'investigation'> & { investigation: Investigation | null };
// Proposed additive API; the behavioral RED uses only existing imports and a successful real Reveal.
type Controller = Omit<ReturnType<typeof createRoomCompositionController>, 'getState'> & {
  getState(): State;
  recordLocalEvaStatement(unit: symbol, candidateId: string): boolean;
  challengeEvaStatement(unit: symbol, statementId: string, clueIds: string[]): boolean;
  accuse(unit: symbol, candidateId: string, clueIds: string[]): boolean;
};
function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
function setup(t: TestContext, options: { fixture?: ReturnType<typeof inspectionFixture>; fetch?: typeof globalThis.fetch } = {}) {
  const fixture = options.fixture ?? inspectionFixture();
  const rooms: ComposedRoom[] = [];
  const states: State[] = [];
  const display = createRoomDisplay({ initial: { scene: new Scene(), dispose() {} }, camera: new PerspectiveCamera(), draw() {} });
  // Synthetic endpoint and injected draw only; real case validation, geometry, binding and ownership run.
  const controller = createRoomCompositionController({
    fetch: options.fetch ?? (async () => json(fixture)),
    build: (description, seed) => { const room = createProceduralRoom(description, seed); rooms.push(room); return room; },
    yieldToBuild: () => Promise.resolve(),
    onStatus: state => { states.push(state as unknown as State); },
  }) as unknown as Controller;
  t.after(() => { controller.dispose(); display.dispose(); rooms.forEach(room => room.dispose()); });
  return { controller, display, states };
}
function investigation(controller: Controller) {
  const view = controller.getState().investigation;
  assert.ok(view);
  return view;
}
async function reveal(app: ReturnType<typeof setup>) {
  assert.equal(await app.controller.compose('original visitor words', 41), true);
  assert.equal(app.controller.reveal(app.display.install), true);
  return investigation(app.controller).unit;
}
function record(controller: Controller, unit: symbol, candidateId: string) {
  assert.equal(typeof controller.recordLocalEvaStatement, 'function', 'explicit local/scripted statement action must exist');
  return controller.recordLocalEvaStatement(unit, candidateId);
}
function challenge(controller: Controller, unit: symbol, statementId: string, clueIds: string[]) {
  assert.equal(typeof controller.challengeEvaStatement, 'function', 'recorded statements must support evidence-bound challenges');
  return controller.challengeEvaStatement(unit, statementId, clueIds);
}
function accuse(controller: Controller, unit: symbol, candidateId: string, clueIds: string[]) {
  assert.equal(typeof controller.accuse, 'function', 'explicit evidence-backed accusation action must exist');
  return controller.accuse(unit, candidateId, clueIds);
}
function statement(controller: Controller, unit: symbol, candidateId = 'candidate-3') {
  assert.equal(record(controller, unit, candidateId), true);
  const value = investigation(controller).statements.at(-1);
  assert.ok(value);
  return value;
}
function lastChallenge(controller: Controller) {
  const value = investigation(controller).challenges.at(-1);
  assert.ok(value);
  return value;
}
function resolution(controller: Controller) {
  const value = investigation(controller).resolution;
  assert.ok(value);
  return value;
}
function inspect(controller: Controller, objectId: string) {
  assert.equal(controller.inspect(controller.getState().inspection!.unit, objectId), true);
}
function turnFurnishing(app: ReturnType<typeof setup>) {
  const current = app.controller.getState().reconstruction!;
  const item = current.current.furnishings[1];
  assert.equal(app.controller.applyReconstructionEdit(current.unit, current.revision, 1,
    { x: item.x, z: item.z, rotation: (item.rotation + 90) % 360 }, app.display.install), true);
}
function uniqueDiscoveryFixture() {
  const fixture = inspectionFixture();
  assert.equal(fixture.outcome, 'supported');
  if (fixture.outcome !== 'supported') throw new Error('Expected a supported synthetic fixture.');
  fixture.case.clues[1].objectId = 'object-1';
  fixture.case.clues[2].objectId = 'object-2';
  return fixture;
}
function assertPrivateFailure(result: Resolution) {
  assert.notEqual(result.status, 'resolved');
  assert.equal(result.origin, 'local-rule');
  assert.ok(result.explanation.length > 0);
  assert.doesNotMatch(result.explanation, /candidate-[1-4]|clue-[1-4]|circle|square|triangle|linen|wool|silk|solution/i);
}

test('successful Reveal exposes empty local statements challenges and resolution without inventing actions', async t => {
  const app = setup(t);
  assert.equal(await app.controller.compose('four teal chairs', 41), true);
  assert.equal(app.controller.reveal(app.display.install), true);
  const view = investigation(app.controller);
  assert.deepEqual(view.statements, [], 'successful Reveal must expose empty recorded local EVA statements');
  assert.deepEqual(view.challenges, []);
  assert.equal(view.resolution, null);
  assert.deepEqual(view.history, []);
  assert.equal(view.hypothesis, null);
  assert.deepEqual(app.controller.getState().inspection!.discoveredClues, []);
});

test('authored fixtures pending cases and rejected Reveals cannot produce statements challenges or accusations', async t => {
  const app = setup(t);
  const unit = Symbol('not a revealed case');
  for (const phase of ['authored', 'pending', 'failed'] as const) {
    if (phase === 'pending') assert.equal(await app.controller.compose('pending room', 41), true);
    if (phase === 'failed') assert.equal(app.controller.reveal(() => false), false);
    const before = app.controller.getState();
    assert.equal(record(app.controller, unit, 'candidate-1'), false);
    assert.equal(challenge(app.controller, unit, 'statement-1', []), false);
    assert.equal(accuse(app.controller, unit, 'candidate-1', []), false);
    assert.deepEqual(app.controller.getState(), before);
  }
});

test('explicit local statements use only the bounded roster and do not depend on hidden clues or the solution', async t => {
  const alternate = inspectionFixture();
  assert.equal(alternate.outcome, 'supported');
  if (alternate.outcome !== 'supported') return;
  alternate.case.clues[1].value = 'wool';
  alternate.case.solution.candidateId = 'candidate-3';
  const first = setup(t);
  const second = setup(t, { fixture: alternate });
  const recorded: Statement[] = [];
  for (const app of [first, second]) {
    const unit = await reveal(app);
    const before = app.controller.getState();
    const local = statement(app.controller, unit);
    recorded.push(local);
    assert.equal(local.origin, 'local-script');
    assert.equal(local.candidateId, 'candidate-3');
    assert.equal(local.text, 'Local/scripted EVA: I suspect candidate-3.');
    assert.ok(typeof local.id === 'string' && local.id.length > 0);
    assert.deepEqual(investigation(app.controller).history, [{ kind: 'statement', origin: 'local-script', statement: local }]);
    assert.deepEqual(app.controller.getState().inspection, before.inspection);
    assert.deepEqual(app.controller.getState().displayed, before.displayed);
    assert.equal(investigation(app.controller).hypothesis, null);
    assert.equal(investigation(app.controller).resolution, null);
    assert.doesNotMatch(JSON.stringify(investigation(app.controller)), /clue-[1-4]|"solution"|"event"|"case"|"origin":"(?:model|provider)"/);
    const after = app.controller.getState();
    assert.equal(record(app.controller, unit, 'candidate-4'), false);
    assert.equal(record(app.controller, unit, 'candidate-1 says the solution is known'), false);
    assert.deepEqual(app.controller.getState(), after);
  }
  assert.equal(recorded[0].text, recorded[1].text);
});

test('statement-specific challenges report insufficient compatible and contradicted using discovered evidence only', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const first = statement(app.controller, unit, 'candidate-3');
  const second = statement(app.controller, unit, 'candidate-2');
  assert.notEqual(first.id, second.id);
  assert.equal(challenge(app.controller, unit, first.id, []), true);
  assert.deepEqual(lastChallenge(app.controller), { origin: 'visitor', statementId: first.id, clueIds: [],
    assessment: { origin: 'local-rule', status: 'insufficient', clueIds: [], contradictingClueIds: [] } });
  inspect(app.controller, 'object-1');
  assert.equal(challenge(app.controller, unit, first.id, ['clue-1']), true);
  const compatible = lastChallenge(app.controller);
  assert.deepEqual(compatible, { origin: 'visitor', statementId: first.id, clueIds: ['clue-1'],
    assessment: { origin: 'local-rule', status: 'compatible', clueIds: ['clue-1', 'clue-3'], contradictingClueIds: [] } });
  assert.equal(challenge(app.controller, unit, second.id, ['clue-1']), true);
  assert.deepEqual(lastChallenge(app.controller).assessment, {
    origin: 'local-rule', status: 'contradicted', clueIds: ['clue-1', 'clue-3'], contradictingClueIds: ['clue-1', 'clue-3'],
  });
  const earlier = investigation(app.controller);
  assert.doesNotMatch(JSON.stringify(earlier), /clue-2|clue-4|"solution"/);
  inspect(app.controller, 'object-2');
  assert.equal(challenge(app.controller, unit, first.id, ['clue-1']), true, 'citing only compatible badge evidence cannot hide discovered fabric conflict');
  assert.deepEqual(lastChallenge(app.controller).assessment, {
    origin: 'local-rule', status: 'contradicted', clueIds: ['clue-1', 'clue-3', 'clue-2', 'clue-4'], contradictingClueIds: ['clue-2'],
  });
  assert.deepEqual(investigation(app.controller).challenges.slice(0, 3), earlier.challenges);
  assert.deepEqual(investigation(app.controller).history.slice(0, earlier.history.length), earlier.history);
  assert.equal(compatible.assessment.status, 'compatible', 'compatibility is an immutable assessment snapshot, not proof');
  assert.equal(challenge(app.controller, unit, first.id, []), true);
  assert.deepEqual(lastChallenge(app.controller).assessment, { origin: 'local-rule', status: 'insufficient', clueIds: [], contradictingClueIds: [] });
  assert.equal(investigation(app.controller).resolution, null);
});

test('unknown undiscovered duplicate and statement-as-evidence references reject before any history mutation', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const local = statement(app.controller, unit);
  inspect(app.controller, 'object-1');
  const before = app.controller.getState();
  const notifications = app.states.length;
  const invalid: unknown[] = [['clue-2'], ['clue-9'], ['clue-1', 'clue-1'], ['clue-1', 'clue-4'], [local.id], ['clue-1', local.id], null, 'clue-1', [1]];
  for (const clueIds of invalid) {
    assert.equal(challenge(app.controller, unit, local.id, clueIds as string[]), false);
    assert.equal(accuse(app.controller, unit, 'candidate-1', clueIds as string[]), false);
    assert.deepEqual(app.controller.getState(), before);
  }
  assert.equal(challenge(app.controller, unit, 'unknown-statement', ['clue-1']), false);
  assert.equal(challenge(app.controller, unit, 'clue-1', ['clue-1']), false);
  assert.equal(accuse(app.controller, unit, 'candidate-4', ['clue-1']), false);
  assert.equal(accuse(app.controller, unit, 'unknown-candidate', []), false);
  assert.deepEqual(app.controller.getState(), before);
  assert.equal(app.states.length, notifications);
});

test('unsupported lucky guesses ambiguous citations and contradicted accusations cannot disclose or resolve the hidden answer', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  for (const candidateId of ['candidate-1', 'candidate-2']) {
    assert.equal(accuse(app.controller, unit, candidateId, []), true);
    assert.equal(resolution(app.controller).status, 'insufficient');
    assertPrivateFailure(resolution(app.controller));
  }
  inspect(app.controller, 'object-1');
  assert.equal(accuse(app.controller, unit, 'candidate-2', ['clue-1']), true);
  const wrong = resolution(app.controller);
  assert.equal(wrong.status, 'incorrect');
  assertPrivateFailure(wrong);
  assert.equal(accuse(app.controller, unit, 'candidate-1', ['clue-1', 'clue-3']), true);
  assert.equal(resolution(app.controller).status, 'insufficient', 'two badge clues still leave candidates 1 and 3 possible');
  assertPrivateFailure(resolution(app.controller));
  assert.doesNotMatch(JSON.stringify(investigation(app.controller)), /clue-2|clue-4|"solution"/);
  inspect(app.controller, 'object-2');
  for (const clues of [[], ['clue-1'], ['clue-1', 'clue-3']]) {
    assert.equal(accuse(app.controller, unit, 'candidate-1', clues), true);
    assert.equal(resolution(app.controller).status, 'insufficient', 'discovery alone cannot support an uncited or still-ambiguous accusation');
    assertPrivateFailure(resolution(app.controller));
  }
  assert.equal(accuse(app.controller, unit, 'candidate-3', ['clue-1']), true);
  assert.equal(resolution(app.controller).status, 'incorrect', 'a compatible cited subset cannot override other discovered contradictions');
  assertPrivateFailure(resolution(app.controller));
  assert.equal(wrong.status, 'incorrect');
  const attempts = investigation(app.controller).history.filter(entry => entry.kind === 'accusation');
  assert.equal(attempts.length, 8);
  assert.equal(attempts.every(entry => entry.origin === 'visitor' && entry.result.origin === 'local-rule'), true);
});

test('a justified accusation independently resolves from cited discoveries without revealing uncited or undiscovered clues', async t => {
  const fixture = uniqueDiscoveryFixture();
  const original = structuredClone(fixture);
  const app = setup(t, { fixture });
  const unit = await reveal(app);
  statement(app.controller, unit, 'candidate-2');
  assert.equal(accuse(app.controller, unit, 'candidate-1', []), true);
  inspect(app.controller, 'object-1');
  assert.deepEqual(app.controller.getState().inspection!.discoveredClues.map(clue => clue.id), ['clue-1', 'clue-2']);
  assert.equal(app.controller.proposeHypothesis(unit, 'candidate-1', ['clue-1']), true);
  const before = app.controller.getState();
  assert.equal(accuse(app.controller, unit, 'candidate-1', ['clue-1', 'clue-2']), true);
  const result = resolution(app.controller);
  assert.equal(result.origin, 'local-rule');
  assert.equal(result.status, 'resolved');
  assert.equal(result.candidateId, 'candidate-1');
  assert.deepEqual(result.clueIds, ['clue-1', 'clue-2']);
  assert.match(result.explanation, /candidate-1/);
  assert.match(result.explanation, /clue-1/);
  assert.match(result.explanation, /clue-2/);
  assert.match(result.explanation, /circle/);
  assert.match(result.explanation, /linen/);
  assert.doesNotMatch(result.explanation, /clue-3|clue-4|square|silk/);
  assert.doesNotMatch(JSON.stringify(investigation(app.controller)), /clue-3|clue-4|"solution"|"case"|"event"/);
  const after = app.controller.getState();
  assert.deepEqual(after.displayed, before.displayed);
  assert.deepEqual(after.accepted, before.accepted);
  assert.deepEqual(after.reconstruction, before.reconstruction);
  assert.deepEqual(after.inspection, before.inspection);
  assert.deepEqual(after.investigation!.hypothesis, before.investigation!.hypothesis);
  assert.deepEqual(after.investigation!.statements, before.investigation!.statements);
  assert.deepEqual(after.investigation!.history.slice(0, -1), before.investigation!.history);
  assert.deepEqual(after.investigation!.history.at(-1), { kind: 'accusation', origin: 'visitor', result });
  assert.deepEqual(fixture, original);
});

test('resolution stays latched without fabricated repeat attempts while later inspections and edits remain available', async t => {
  const app = setup(t, { fixture: uniqueDiscoveryFixture() });
  const unit = await reveal(app);
  inspect(app.controller, 'object-1');
  assert.equal(accuse(app.controller, unit, 'candidate-1', ['clue-1', 'clue-2']), true);
  const before = app.controller.getState();
  const notifications = app.states.length;
  for (const [candidateId, clues] of [['candidate-1', ['clue-1', 'clue-2']], ['candidate-2', ['clue-1']], ['candidate-1', []]] as const) {
    assert.equal(accuse(app.controller, unit, candidateId, [...clues]), false);
    assert.deepEqual(app.controller.getState(), before);
  }
  assert.equal(app.states.length, notifications);
  inspect(app.controller, 'object-2');
  turnFurnishing(app);
  const after = app.controller.getState();
  assert.deepEqual(after.investigation!.resolution, before.investigation!.resolution);
  assert.deepEqual(after.investigation!.history.slice(0, before.investigation!.history.length), before.investigation!.history);
  assert.equal(after.investigation!.history.length, before.investigation!.history.length + 2);
  assert.equal(after.reconstruction!.revision, 1);
  assert.equal(after.investigation!.unit, unit);
  assert.equal(after.inspection!.discoveredClues.length, 4);
  assert.equal(accuse(app.controller, unit, 'candidate-2', ['clue-1']), false);
});

test('statement challenge and accusation inputs and returned history snapshots are isolated and truthfully attributed', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const local = statement(app.controller, unit);
  inspect(app.controller, 'object-1');
  const challengeClues = ['clue-1'];
  const accusationClues = ['clue-1'];
  assert.equal(challenge(app.controller, unit, local.id, challengeClues), true);
  assert.equal(accuse(app.controller, unit, 'candidate-1', accusationClues), true);
  const before = app.controller.getState();
  assert.deepEqual(before.investigation!.history.map(entry => [entry.kind, entry.origin]), [
    ['statement', 'local-script'], ['inspection', 'visitor'], ['challenge', 'visitor'], ['accusation', 'visitor'],
  ]);
  assert.deepEqual(before.investigation!.history[0], { kind: 'statement', origin: 'local-script', statement: local });
  assert.deepEqual(before.investigation!.history[2], { kind: 'challenge', origin: 'visitor', challenge: lastChallenge(app.controller) });
  assert.deepEqual(before.investigation!.history[3], { kind: 'accusation', origin: 'visitor', result: resolution(app.controller) });
  challengeClues.push('clue-2');
  accusationClues.push('clue-2');
  for (const view of [investigation(app.controller), app.states.at(-1)!.investigation!]) {
    view.statements[0].candidateId = 'candidate-1';
    view.statements[0].text = 'fabricated live model answer';
    view.challenges[0].statementId = 'forged';
    view.challenges[0].clueIds.push('clue-2');
    view.challenges[0].assessment.status = 'contradicted';
    view.challenges[0].assessment.clueIds.push('clue-4');
    view.challenges[0].assessment.contradictingClueIds.push('clue-4');
    view.resolution!.status = 'resolved';
    view.resolution!.clueIds.push('clue-4');
    view.resolution!.explanation = 'fabricated resolution';
    for (const entry of view.history) {
      if (entry.kind === 'statement') entry.statement.text = 'fabricated origin';
      if (entry.kind === 'challenge') {
        entry.challenge.clueIds.push('clue-2');
        entry.challenge.assessment.clueIds.push('clue-4');
        entry.challenge.assessment.contradictingClueIds.push('clue-4');
      }
      if (entry.kind === 'accusation') { entry.result.clueIds.push('clue-4'); entry.result.status = 'resolved'; }
    }
    view.history.length = 0;
  }
  assert.deepEqual(app.controller.getState(), before);
});

test('accepted reconstruction edits retain specific statements challenge snapshots and unresolved accusation results', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const local = statement(app.controller, unit);
  inspect(app.controller, 'object-1');
  assert.equal(challenge(app.controller, unit, local.id, ['clue-1']), true);
  assert.equal(accuse(app.controller, unit, 'candidate-1', ['clue-1']), true);
  const before = app.controller.getState();
  turnFurnishing(app);
  const after = app.controller.getState();
  assert.equal(after.investigation!.unit, unit);
  assert.notEqual(after.inspection!.unit, before.inspection!.unit);
  assert.deepEqual(after.investigation!.statements, before.investigation!.statements);
  assert.deepEqual(after.investigation!.challenges, before.investigation!.challenges);
  assert.deepEqual(after.investigation!.resolution, before.investigation!.resolution);
  assert.deepEqual(after.investigation!.history.slice(0, -1), before.investigation!.history);
  assert.equal(after.investigation!.history.at(-1)!.kind, 'reconstruction-edit');
  assert.equal(challenge(app.controller, unit, local.id, ['clue-1']), true);
  assert.equal(lastChallenge(app.controller).assessment.status, 'compatible');
});

test('pending cancelled and rejected replacements retain local statements challenges and accusation history', async t => {
  for (const failure of ['cancel', 'invalid', 'false', 'throw'] as const) {
    let requests = 0;
    const app = setup(t, { fetch: async () => json(++requests === 2 && failure === 'invalid'
      ? { ...inspectionFixture(), extra: true } : inspectionFixture()) });
    const unit = await reveal(app);
    const local = statement(app.controller, unit);
    inspect(app.controller, 'object-1');
    assert.equal(challenge(app.controller, unit, local.id, ['clue-1']), true);
    assert.equal(accuse(app.controller, unit, 'candidate-1', ['clue-1']), true);
    const before = app.controller.getState();
    assert.equal(await app.controller.compose('replacement words', 41), failure !== 'invalid');
    assert.deepEqual(app.controller.getState().investigation, before.investigation);
    if (failure === 'cancel') assert.equal(app.controller.stop(), true);
    if (failure === 'false' || failure === 'throw') assert.equal(app.controller.reveal(() => {
      if (failure === 'throw') throw new Error('synthetic failed installation');
      return false;
    }), false);
    assert.deepEqual(app.controller.getState().investigation, before.investigation);
    assert.deepEqual(app.controller.getState().inspection, before.inspection);
    assert.deepEqual(app.controller.getState().reconstruction, before.reconstruction);
    assert.deepEqual(app.controller.getState().displayed, before.displayed);
  }
});

test('new challenge and accusation actions on the displayed case survive cancelled interpretation and a late response', async t => {
  const pending = deferred<Response>();
  let requests = 0;
  const app = setup(t, { fetch: () => ++requests === 2 ? pending.promise : Promise.resolve(json(inspectionFixture())) });
  const unit = await reveal(app);
  inspect(app.controller, 'object-1');
  const composing = app.controller.compose('pending replacement', 41);
  assert.equal(app.controller.getState().status, 'interpreting');
  const local = statement(app.controller, unit);
  assert.equal(challenge(app.controller, unit, local.id, ['clue-1']), true);
  assert.equal(accuse(app.controller, unit, 'candidate-1', ['clue-1']), true);
  const before = app.controller.getState();
  assert.equal(app.controller.stop(), true);
  assert.equal(await composing, false);
  pending.resolve(json(inspectionFixture()));
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  assert.deepEqual(app.controller.getState().investigation, before.investigation);
  assert.deepEqual(app.controller.getState().inspection, before.inspection);
  assert.deepEqual(app.controller.getState().displayed, before.displayed);
});

test('same-ID same-seed replacement resets resolved state and rejects prior-case statement references even with a current unit', async t => {
  const app = setup(t, { fixture: uniqueDiscoveryFixture() });
  const oldUnit = await reveal(app);
  const oldStatement = statement(app.controller, oldUnit, 'candidate-2');
  inspect(app.controller, 'object-1');
  assert.equal(challenge(app.controller, oldUnit, oldStatement.id, ['clue-1']), true);
  assert.equal(accuse(app.controller, oldUnit, 'candidate-1', ['clue-1', 'clue-2']), true);
  const before = app.controller.getState();
  assert.equal(await app.controller.compose('original visitor words', 41), true);
  const notifications = app.states.length;
  assert.equal(app.controller.reveal(app.display.install), true);
  const after = app.controller.getState();
  const unit = after.investigation!.unit;
  assert.notEqual(unit, oldUnit);
  assert.deepEqual(after.displayed, before.displayed);
  assert.deepEqual(after.investigation!.statements, []);
  assert.deepEqual(after.investigation!.challenges, []);
  assert.equal(after.investigation!.resolution, null);
  assert.deepEqual(after.investigation!.history, []);
  assert.deepEqual(after.inspection!.discoveredClues, []);
  assert.equal(app.states.length, notifications + 1);
  assert.deepEqual(app.states.at(-1), after);
  assert.equal(record(app.controller, oldUnit, 'candidate-1'), false);
  assert.equal(challenge(app.controller, oldUnit, oldStatement.id, []), false);
  assert.equal(accuse(app.controller, oldUnit, 'candidate-1', []), false);
  assert.deepEqual(app.controller.getState(), after);
  const currentStatement = statement(app.controller, unit, 'candidate-2');
  assert.notEqual(currentStatement.id, oldStatement.id, 'statement IDs cannot alias a previous case within this controller');
  const current = app.controller.getState();
  assert.equal(challenge(app.controller, unit, oldStatement.id, []), false);
  assert.deepEqual(app.controller.getState(), current);
  assert.equal(challenge(app.controller, unit, currentStatement.id, []), true);
  assert.equal(accuse(app.controller, unit, 'candidate-1', []), true);
  assert.equal(resolution(app.controller).status, 'insufficient', 'a new case is not latched by the previous success');
});

test('foreign disposed and reconstruction-install reentrant actions cannot create statements challenges or resolutions', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const local = statement(app.controller, unit);
  inspect(app.controller, 'object-1');
  const before = app.controller.getState();
  const foreign = Symbol('foreign case');
  assert.equal(record(app.controller, foreign, 'candidate-1'), false);
  assert.equal(challenge(app.controller, foreign, local.id, ['clue-1']), false);
  assert.equal(accuse(app.controller, foreign, 'candidate-1', ['clue-1']), false);
  assert.deepEqual(app.controller.getState(), before);
  const current = before.reconstruction!;
  const item = current.current.furnishings[1];
  assert.equal(app.controller.applyReconstructionEdit(unit, current.revision, 1,
    { x: item.x, z: item.z, rotation: (item.rotation + 90) % 360 }, (room, binding) => {
      assert.equal(record(app.controller, unit, 'candidate-1'), false);
      assert.equal(challenge(app.controller, unit, local.id, ['clue-1']), false);
      assert.equal(accuse(app.controller, unit, 'candidate-1', ['clue-1']), false);
      assert.deepEqual(app.controller.getState(), before);
      return app.display.install(room, binding);
    }), true);
  app.controller.dispose();
  const disposed = app.controller.getState();
  const notifications = app.states.length;
  assert.equal(record(app.controller, unit, 'candidate-1'), false);
  assert.equal(challenge(app.controller, unit, local.id, ['clue-1']), false);
  assert.equal(accuse(app.controller, unit, 'candidate-1', ['clue-1']), false);
  assert.deepEqual(app.controller.getState(), disposed);
  assert.equal(app.states.length, notifications);
});

test('replacement installation cannot accept old-case or not-yet-committed new-case dialogue actions', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  const local = statement(app.controller, unit);
  inspect(app.controller, 'object-1');
  assert.equal(await app.controller.compose('replacement words', 41), true);
  const before = app.controller.getState();
  assert.equal(app.controller.reveal((room, binding) => {
    for (const target of [unit, binding.unit]) {
      assert.equal(record(app.controller, target, 'candidate-1'), false);
      assert.equal(challenge(app.controller, target, local.id, []), false);
      assert.equal(accuse(app.controller, target, 'candidate-1', []), false);
    }
    // Reveal owns the pending candidate while its installer runs; investigation stays settled.
    assert.deepEqual(app.controller.getState().investigation, before.investigation);
    return app.display.install(room, binding);
  }), true);
  assert.deepEqual(investigation(app.controller).history, []);
  assert.equal(investigation(app.controller).resolution, null);
});
