import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { createRoomCompositionController, type ComposedRoom, type RoomCompositionState } from '../src/room/room-composition.ts';
import { createProceduralRoom } from '../src/room/procedural-room.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';

// Proposed additive 4B API; imports stay on existing code so the roster test is a behavioral RED.
type Hypothesis = {
  revision: number;
  candidateId: string;
  clueIds: string[];
  assessment: {
    origin: 'local-rule';
    status: 'insufficient' | 'compatible' | 'contradicted';
    clueIds: string[];
    contradictingClueIds: string[];
  };
};
type HistoryEntry =
  | { kind: 'inspection'; origin: 'visitor'; objectId: string; clueIds: string[] }
  | { kind: 'hypothesis'; origin: 'visitor'; hypothesis: Hypothesis };
type Investigation = {
  unit: symbol;
  candidates: { id: string; badge: string; fabric: string }[];
  hypothesis: Hypothesis | null;
  history: HistoryEntry[];
};
type State = RoomCompositionState & { investigation: Investigation | null };
type Controller = Omit<ReturnType<typeof createRoomCompositionController>, 'getState'> & {
  getState(): State;
  proposeHypothesis(unit: symbol, candidateId: string, clueIds: string[]): boolean;
};

function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
function setup(t: TestContext, options: Parameters<typeof createRoomCompositionController>[0] = {}) {
  const rooms: ComposedRoom[] = [];
  const states: State[] = [];
  // Synthetic endpoint only; the real builder, validation, binding and controller still run.
  const controller = createRoomCompositionController({
    fetch: options.fetch ?? (async () => json(inspectionFixture())),
    build: async (description, seed) => {
      const room = await (options.build ?? createProceduralRoom)(description, seed);
      rooms.push(room);
      return room;
    },
    yieldToBuild: () => Promise.resolve(),
    onStatus: state => { states.push(state as State); },
  }) as Controller;
  t.after(() => { controller.dispose(); rooms.forEach(room => room.dispose()); });
  return { controller, rooms, states };
}
function investigation(controller: Controller) {
  const view = controller.getState().investigation;
  assert.ok(view, 'a successfully revealed case must expose its public investigation');
  return view;
}
function propose(controller: Controller, unit: symbol, candidateId: string, clueIds: string[]) {
  assert.equal(typeof controller.proposeHypothesis, 'function', 'the revealed case must accept bounded visitor hypotheses');
  return controller.proposeHypothesis(unit, candidateId, clueIds);
}
async function reveal(controller: Controller) {
  assert.equal(await controller.compose('  original visitor words  ', 41), true);
  assert.equal(controller.reveal(() => true), true);
  return investigation(controller).unit;
}
function hypothesis(controller: Controller) {
  const value = investigation(controller).hypothesis;
  assert.ok(value, 'an accepted proposal must produce a hypothesis snapshot');
  return value;
}

// Removing the successful-install projection must fail here, after real compose and Reveal.
test('successful Reveal exposes a safe candidate roster separately from the 4A inspection projection', async t => {
  const { controller } = setup(t);
  assert.equal(await controller.compose('four teal chairs', 41), true);
  assert.equal(controller.reveal(() => true), true);
  const state = controller.getState();
  assert.ok(state.investigation, 'successful Reveal must expose a safe public candidate roster');
  assert.deepEqual(state.investigation.candidates, [
    { id: 'candidate-1', badge: 'circle', fabric: 'linen' },
    { id: 'candidate-2', badge: 'square', fabric: 'linen' },
    { id: 'candidate-3', badge: 'circle', fabric: 'wool' },
  ]);
  assert.equal(state.investigation.unit, state.inspection!.unit);
  assert.equal(state.investigation.hypothesis, null);
  assert.deepEqual(state.investigation.history, []);
  assert.doesNotMatch(JSON.stringify(state.investigation), /"solution"|"event"|"case"|"clues"|clue-[1-4]|furnishingIndex/);
  assert.doesNotMatch(JSON.stringify(state.inspection), /candidate|circle|square|linen|wool|clue-[1-4]/);
  assert.deepEqual(state.inspection!.discoveredClues, []);
});

test('authored fixture state and a pending or rejected Reveal never become investigable', async t => {
  const { controller } = setup(t);
  assert.equal(controller.getState().investigation, null);
  assert.equal(propose(controller, Symbol('authored fixture'), 'candidate-1', []), false);
  assert.equal(await controller.compose('four chairs', 41), true);
  assert.equal(controller.getState().investigation, null);
  assert.equal(propose(controller, Symbol('pending case'), 'candidate-1', []), false);
  assert.equal(controller.reveal(() => false), false);
  assert.equal(controller.getState().investigation, null);
});

test('a hypothesis with no discovered evidence is insufficient even when the hidden answer agrees', async t => {
  const { controller } = setup(t);
  const unit = await reveal(controller);
  for (const candidateId of ['candidate-1', 'candidate-2']) {
    assert.equal(propose(controller, unit, candidateId, []), true);
    assert.deepEqual(hypothesis(controller).assessment, {
      origin: 'local-rule', status: 'insufficient', clueIds: [], contradictingClueIds: [],
    });
  }
  assert.doesNotMatch(JSON.stringify(investigation(controller)), /"solution"|clue-[1-4]/);
});

test('undiscovered evidence and the hidden solution cannot influence a hypothesis assessment', async t => {
  const alternate = inspectionFixture();
  alternate.case.clues[1].value = 'wool';
  alternate.case.solution.candidateId = 'candidate-3';
  const first = setup(t).controller;
  const second = setup(t, { fetch: async () => json(alternate) }).controller;
  for (const controller of [first, second]) {
    const unit = await reveal(controller);
    assert.equal(controller.inspect(unit, 'object-1'), true);
    assert.equal(propose(controller, unit, 'candidate-3', ['clue-1']), true);
    assert.deepEqual(hypothesis(controller).assessment, {
      origin: 'local-rule', status: 'compatible', clueIds: ['clue-1', 'clue-3'], contradictingClueIds: [],
    });
    assert.doesNotMatch(JSON.stringify(investigation(controller)), /clue-2|clue-4|"solution"|"event"|"case"/);
  }
  assert.deepEqual(investigation(first).hypothesis, investigation(second).hypothesis);
  assert.deepEqual(investigation(first).history, investigation(second).history);
});

test('all discovered evidence determines contradiction even when the visitor cites only a compatible subset', async t => {
  const { controller } = setup(t);
  const unit = await reveal(controller);
  assert.equal(controller.inspect(unit, 'object-1'), true);
  assert.equal(propose(controller, unit, 'candidate-2', ['clue-1']), true);
  assert.deepEqual(hypothesis(controller).assessment, {
    origin: 'local-rule', status: 'contradicted', clueIds: ['clue-1', 'clue-3'], contradictingClueIds: ['clue-1', 'clue-3'],
  });
  assert.equal(propose(controller, unit, 'candidate-3', ['clue-1']), true);
  const earlier = hypothesis(controller);
  assert.equal(earlier.assessment.status, 'compatible');
  assert.equal(controller.inspect(unit, 'object-2'), true);
  assert.equal(propose(controller, unit, 'candidate-3', ['clue-1']), true);
  assert.deepEqual(hypothesis(controller).clueIds, ['clue-1']);
  assert.deepEqual(hypothesis(controller).assessment, {
    origin: 'local-rule', status: 'contradicted', clueIds: ['clue-1', 'clue-3', 'clue-2', 'clue-4'], contradictingClueIds: ['clue-2'],
  });
  assert.equal(propose(controller, unit, 'candidate-1', ['clue-1', 'clue-2']), true);
  assert.equal(hypothesis(controller).assessment.status, 'compatible', 'even uniquely compatible is not proved or resolved');
  assert.deepEqual(hypothesis(controller).assessment.contradictingClueIds, []);
  assert.equal(earlier.assessment.status, 'compatible', 'later discoveries cannot rewrite an earlier assessment snapshot');
  assert.equal(investigation(controller).history.some(entry => entry.kind === 'hypothesis'
    && entry.hypothesis.revision === earlier.revision
    && entry.hypothesis.assessment.status === 'compatible'), true);
});

test('unknown candidates and unknown, undiscovered or duplicate citations are rejected without history or notifications', async t => {
  const { controller, states } = setup(t);
  const unit = await reveal(controller);
  assert.equal(controller.inspect(unit, 'object-1'), true);
  assert.equal(propose(controller, unit, 'candidate-3', ['clue-1']), true);
  const before = controller.getState();
  const count = states.length;
  const invalid: [string, unknown][] = [
    ['candidate-4', ['clue-1']], ['not-a-candidate', []],
    ['candidate-1', ['clue-9']], ['candidate-1', ['clue-2']],
    ['candidate-1', ['clue-1', 'clue-1']], ['candidate-1', ['clue-1', 'clue-4']],
    ['candidate-1', 'clue-1'], ['candidate-1', null], ['candidate-1', [1]],
  ];
  for (const [candidateId, clueIds] of invalid) {
    assert.equal(propose(controller, unit, candidateId, clueIds as string[]), false);
    assert.deepEqual(controller.getState(), before);
    assert.equal(states.length, count);
  }
});

test('session history records actual inspections and visitor revisions with explicitly local-rule assessment snapshots', async t => {
  const { controller } = setup(t);
  const unit = await reveal(controller);
  assert.deepEqual(investigation(controller).history, []);
  assert.equal(controller.inspect(unit, 'object-1'), true);
  assert.deepEqual(investigation(controller).history, [
    { kind: 'inspection', origin: 'visitor', objectId: 'object-1', clueIds: ['clue-1', 'clue-3'] },
  ]);
  const discovered = investigation(controller).history;
  assert.equal(controller.inspect(unit, 'object-1'), true);
  assert.equal(controller.inspect(unit, 'object-8'), false);
  assert.deepEqual(investigation(controller).history, discovered, 'no-op and rejected inspections cannot invent actions');
  assert.equal(propose(controller, unit, 'candidate-3', ['clue-1']), true);
  const first = hypothesis(controller);
  assert.equal(first.revision, 1);
  assert.equal(first.candidateId, 'candidate-3');
  assert.deepEqual(first.clueIds, ['clue-1']);
  assert.equal(first.assessment.status, 'compatible');
  assert.equal(controller.inspect(unit, 'object-3'), true);
  assert.equal(controller.inspect(unit, 'object-2'), true);
  assert.equal(propose(controller, unit, 'candidate-2', ['clue-2']), true);
  const second = hypothesis(controller);
  assert.equal(second.revision, 2);
  assert.equal(second.candidateId, 'candidate-2');
  assert.deepEqual(second.clueIds, ['clue-2']);
  assert.equal(second.assessment.status, 'contradicted');
  assert.deepEqual(investigation(controller).history, [
    { kind: 'inspection', origin: 'visitor', objectId: 'object-1', clueIds: ['clue-1', 'clue-3'] },
    { kind: 'hypothesis', origin: 'visitor', hypothesis: first },
    { kind: 'inspection', origin: 'visitor', objectId: 'object-3', clueIds: [] },
    { kind: 'inspection', origin: 'visitor', objectId: 'object-2', clueIds: ['clue-2', 'clue-4'] },
    { kind: 'hypothesis', origin: 'visitor', hypothesis: second },
  ]);
  assert.doesNotMatch(JSON.stringify(investigation(controller).history), /"origin":"(?:model|provider|human|EVA)"|live generation/);
});

test('mutable proposal inputs and returned snapshots cannot rewrite history, case truth or original contribution', async t => {
  const fixture = inspectionFixture();
  const original = structuredClone(fixture);
  const { controller, states } = setup(t, { fetch: async () => json(fixture) });
  const unit = await reveal(controller);
  const contribution = controller.getState().displayed;
  assert.equal(controller.inspect(unit, 'object-1'), true);
  const citations = ['clue-1'];
  assert.equal(propose(controller, unit, 'candidate-3', citations), true);
  const expected = investigation(controller);
  citations.push('clue-2');
  for (const view of [investigation(controller), states.at(-1)!.investigation!]) {
    view.candidates[0].badge = 'square';
    view.hypothesis!.candidateId = 'candidate-2';
    view.hypothesis!.clueIds.push('clue-4');
    view.hypothesis!.assessment.status = 'contradicted';
    view.hypothesis!.assessment.clueIds.push('clue-2');
    view.hypothesis!.assessment.contradictingClueIds.push('clue-2');
    const entry = view.history.find(item => item.kind === 'hypothesis')!;
    assert.equal(entry.kind, 'hypothesis');
    if (entry.kind === 'hypothesis') {
      entry.hypothesis.candidateId = 'candidate-2';
      entry.hypothesis.clueIds.push('clue-4');
      entry.hypothesis.assessment.clueIds.push('clue-2');
      entry.hypothesis.assessment.contradictingClueIds.push('clue-2');
    }
    const inspection = view.history[0];
    if (inspection.kind === 'inspection') inspection.clueIds.push('clue-4');
    view.history.length = 0;
  }
  assert.deepEqual(investigation(controller), expected);
  assert.deepEqual(controller.getState().displayed, contribution);
  assert.deepEqual(controller.getState().accepted, contribution);
  assert.equal(contribution!.suggestion, 'original visitor words');
  assert.equal(contribution!.seed, 41);
  assert.deepEqual(contribution!.case, original.case);
  assert.deepEqual(fixture, original);
});

test('pending, cancelled and failed replacements retain investigation and original displayed contribution', async t => {
  for (const failure of ['cancel', 'invalid', 'build', 'false', 'throw', 'binding'] as const) {
    let requests = 0;
    let builds = 0;
    const { controller, rooms } = setup(t, {
      fetch: async () => json(++requests === 2 && failure === 'invalid' ? { ...inspectionFixture(), extra: true } : inspectionFixture()),
      build: (description, seed) => {
        if (++builds === 2 && failure === 'build') throw new Error('synthetic build failure');
        return createProceduralRoom(description, seed);
      },
    });
    const unit = await reveal(controller);
    assert.equal(controller.inspect(unit, 'object-1'), true);
    assert.equal(propose(controller, unit, 'candidate-3', ['clue-1']), true);
    const before = controller.getState();
    assert.equal(await controller.compose('replacement visitor words', 41), !['invalid', 'build'].includes(failure));
    assert.deepEqual(controller.getState().investigation, before.investigation, failure);
    if (failure === 'cancel') assert.equal(controller.stop(), true);
    if (failure === 'binding') rooms[1].scene.getObjectByName('chair-2')!.clear();
    if (['false', 'throw', 'binding'].includes(failure)) {
      assert.equal(controller.reveal(() => {
        if (failure === 'throw') throw new Error('synthetic renderer installation failure');
        return failure === 'binding';
      }), false);
    }
    assert.deepEqual(controller.getState().investigation, before.investigation, failure);
    assert.deepEqual(controller.getState().inspection, before.inspection, failure);
    assert.deepEqual(controller.getState().displayed, before.displayed, failure);
    assert.equal(propose(controller, unit, 'candidate-1', ['clue-3']), true, failure);
  }
});

test('in-flight replacement cancellation and its late response retain new actions on the displayed investigation', async t => {
  const pending = deferred<Response>();
  let requests = 0;
  const { controller } = setup(t, {
    fetch: () => ++requests === 2 ? pending.promise : Promise.resolve(json(inspectionFixture())),
  });
  const unit = await reveal(controller);
  assert.equal(controller.inspect(unit, 'object-1'), true);
  assert.equal(propose(controller, unit, 'candidate-3', ['clue-1']), true);
  const composing = controller.compose('pending replacement', 41);
  assert.equal(controller.getState().status, 'interpreting');
  assert.equal(controller.inspect(unit, 'object-2'), true);
  assert.equal(propose(controller, unit, 'candidate-3', ['clue-1']), true);
  assert.equal(hypothesis(controller).assessment.status, 'contradicted');
  const before = controller.getState();
  assert.equal(controller.stop(), true);
  assert.equal(await composing, false);
  pending.resolve(json(inspectionFixture()));
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  assert.deepEqual(controller.getState().investigation, before.investigation);
  assert.deepEqual(controller.getState().inspection, before.inspection);
  assert.deepEqual(controller.getState().displayed, before.displayed);
  assert.equal(controller.getState().pending, false);
});

test('same-ID and same-seed successful replacement atomically resets investigation and rejects prior-unit actions', async t => {
  const { controller, states } = setup(t);
  const oldUnit = await reveal(controller);
  assert.equal(controller.inspect(oldUnit, 'object-1'), true);
  assert.equal(propose(controller, oldUnit, 'candidate-3', ['clue-1']), true);
  const before = controller.getState();
  assert.equal(await controller.compose('  original visitor words  ', 41), true);
  assert.deepEqual(controller.getState().investigation, before.investigation);
  const notifications = states.length;
  let nextUnit: symbol | undefined;
  assert.equal(controller.reveal((_room, binding) => {
    nextUnit = binding.unit;
    assert.deepEqual(controller.getState().investigation, before.investigation);
    assert.equal(propose(controller, oldUnit, 'candidate-1', ['clue-1']), false, 'installation must reject reentrant old-case actions');
    assert.equal(propose(controller, binding.unit, 'candidate-1', []), false, 'new case is not active before install succeeds');
    return true;
  }), true);
  const after = controller.getState();
  assert.notEqual(nextUnit, oldUnit);
  assert.equal(after.investigation!.unit, nextUnit);
  assert.equal(after.inspection!.unit, nextUnit);
  assert.deepEqual(after.displayed, before.displayed, 'identical payload is still a distinct installation');
  assert.deepEqual(after.inspection!.discoveredClues, []);
  assert.equal(after.inspection!.selectedObjectId, null);
  assert.equal(after.investigation!.hypothesis, null);
  assert.deepEqual(after.investigation!.history, []);
  assert.deepEqual(after.investigation!.candidates, before.investigation!.candidates);
  assert.ok(states.length > notifications);
  for (const state of states.slice(notifications)) {
    assert.equal(state.investigation!.unit, nextUnit);
    assert.equal(state.inspection!.unit, nextUnit);
    assert.equal(state.investigation!.hypothesis, null);
    assert.deepEqual(state.investigation!.history, []);
    assert.deepEqual(state.inspection!.discoveredClues, []);
  }
  const count = states.length;
  assert.equal(propose(controller, oldUnit, 'candidate-1', []), false);
  assert.equal(controller.inspect(oldUnit, 'object-1'), false);
  assert.deepEqual(controller.getState(), after);
  assert.equal(states.length, count);
  assert.equal(propose(controller, nextUnit!, 'candidate-1', []), true);
  assert.equal(hypothesis(controller).revision, 1);
  assert.equal(hypothesis(controller).assessment.status, 'insufficient');
});

test('foreign-unit and disposed controller actions cannot change investigation or append history', async t => {
  const { controller, states } = setup(t);
  const unit = await reveal(controller);
  assert.equal(controller.inspect(unit, 'object-1'), true);
  assert.equal(propose(controller, unit, 'candidate-3', ['clue-1']), true);
  const before = controller.getState();
  assert.equal(propose(controller, Symbol('foreign installation'), 'candidate-1', []), false);
  assert.deepEqual(controller.getState(), before);
  controller.dispose();
  const disposed = controller.getState();
  const count = states.length;
  assert.equal(propose(controller, unit, 'candidate-1', ['clue-1']), false);
  assert.equal(controller.inspect(unit, 'object-2'), false);
  assert.deepEqual(controller.getState(), disposed);
  assert.deepEqual(disposed.investigation, before.investigation);
  assert.equal(states.length, count);
});
