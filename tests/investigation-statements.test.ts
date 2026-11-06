import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { createRoomCompositionController, type RoomCompositionState } from '../src/room/room-composition.ts';
import { createRoomDisplay } from '../src/room/room-display.ts';
import { validateInvestigationNarrationRequest, type InvestigationNarrationReply } from '../src/room/investigation-narration.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';

type ExistingInvestigation = NonNullable<RoomCompositionState['investigation']>;
type ModelStatement = { id: string; origin: 'model'; candidateId: string; text: string; clueIds: string[] };
type Statement = ExistingInvestigation['statements'][number] | ModelStatement;
type History = ExistingInvestigation['history'][number] | { kind: 'statement'; origin: 'model'; statement: ModelStatement };
type State = Omit<RoomCompositionState, 'investigation' | 'narratorContext'> & {
  investigation: (Omit<ExistingInvestigation, 'statements' | 'history'> & { statements: Statement[]; history: History[] }) | null;
  narratorContext: (Omit<NonNullable<RoomCompositionState['narratorContext']>, 'history'> & { history: History[] }) | null;
};
type Controller = Omit<ReturnType<typeof createRoomCompositionController>, 'getState'> & { getState(): State };
type Call = { url: string; init: RequestInit };
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}
function suspicion(candidateId = 'candidate-3'): InvestigationNarrationReply {
  return { version: 1, kind: 'suspicion', reply: `I suspect ${candidateId}. Perhaps.`, candidateId, clueIds: ['clue-3', 'clue-1'] };
}
function reflection(): InvestigationNarrationReply {
  return { version: 1, kind: 'reflection', reply: 'I remain uncertain.', candidateId: null, clueIds: [] };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
function setup(t: TestContext, options: {
  narrate?: (call: Call, count: number) => Promise<Response>;
  compose?: (count: number) => Promise<Response>;
} = {}) {
  const calls: Call[] = [];
  const states: State[] = [];
  let compositions = 0;
  const display = createRoomDisplay({ initial: { scene: new Scene(), dispose() {} }, camera: new PerspectiveCamera(), draw() {} });
  const controller = createRoomCompositionController({
    fetch: (url, init = {}) => {
      if (String(url) === '/api/compose-room') return options.compose?.(++compositions) ?? Promise.resolve(json(inspectionFixture()));
      assert.equal(String(url), '/api/investigation-narration');
      const call = { url: String(url), init };
      calls.push(call);
      return options.narrate?.(call, calls.length) ?? Promise.resolve(json(suspicion()));
    },
    yieldToBuild: () => Promise.resolve(),
    onStatus: state => states.push(state as unknown as State),
  }) as unknown as Controller;
  t.after(() => { controller.dispose(); display.dispose(); });
  return { controller, display, calls, states };
}
async function reveal(app: ReturnType<typeof setup>) {
  assert.equal(await app.controller.compose('PRIVATE-ORIGINAL-SUGGESTION', 41), true);
  assert.equal(app.controller.reveal(app.display.install), true);
  return app.controller.getState().investigation!.unit;
}
function inspect(app: ReturnType<typeof setup>, objectId = 'object-1') {
  assert.equal(app.controller.inspect(app.controller.getState().inspection!.unit, objectId), true);
}
function investigation(app: ReturnType<typeof setup>) { return app.controller.getState().investigation!; }
function modelStatements(app: ReturnType<typeof setup>): ModelStatement[] {
  return investigation(app).statements.filter((statement): statement is ModelStatement => statement.origin === 'model');
}
async function ask(app: ReturnType<typeof setup>, unit: symbol, question = 'What is your tentative reading?') {
  assert.equal(await app.controller.askInvestigationQuestion(unit, question), true);
  const statement = modelStatements(app).at(-1);
  assert.ok(statement, 'an admitted model suspicion must produce a recorded challengeable statement');
  return statement;
}
function expected(id: string, reply = suspicion()): ModelStatement {
  return { id, origin: 'model', candidateId: reply.candidateId!, text: reply.reply, clueIds: [...reply.clueIds] };
}

test('admitted model suspicion after real Reveal records one exact challengeable statement without another request', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  inspect(app);
  const before = app.controller.getState();
  const question = 'Which candidate do you tentatively suspect?';
  assert.equal(await app.controller.askInvestigationQuestion(unit, question), true);
  assert.equal(modelStatements(app).length, 1, 'an admitted model suspicion must create one application-owned challengeable statement');
  const statement = modelStatements(app)[0];
  assert.deepEqual(statement, expected('statement-1'));
  assert.equal(app.calls.length, 1, 'recording the admitted contribution must not request another model answer');
  assert.equal(app.controller.getState().dialogue!.reply!.text, statement.text);
  assert.match(app.controller.getState().narration!.text, /model-proposed statement/i);
  assert.ok(app.controller.getState().narration!.text.includes(statement.text));
  assert.deepEqual(investigation(app).history.slice(-3), [
    { kind: 'question', origin: 'visitor', question },
    { kind: 'reply', origin: 'model', reply: app.controller.getState().dialogue!.reply },
    { kind: 'statement', origin: 'model', statement },
  ]);
  assert.deepEqual(app.controller.getState().inspection, before.inspection);
  assert.deepEqual(app.controller.getState().displayed, before.displayed);
  assert.deepEqual(app.controller.getState().reconstruction, before.reconstruction);
  assert.equal(investigation(app).hypothesis, null);
  assert.equal(investigation(app).resolution, null);
  const admittedStates = app.states.filter(state => state.dialogue?.reply?.question === question);
  assert.ok(admittedStates.length > 0);
  for (const state of admittedStates) {
    assert.deepEqual(state.investigation!.statements, [statement], 'reply and statement admission must be atomic to status observers');
  }
});

test('local examples and generated suspicions share monotonic IDs while retaining distinct provenance and exact wording', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  inspect(app);
  assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-2'), true);
  const first = investigation(app).statements[0];
  assert.deepEqual(first, { id: 'statement-1', origin: 'local-script', candidateId: 'candidate-2', text: 'Local/scripted EVA: I suspect candidate-2.' });
  const second = await ask(app, unit, 'First model question?');
  assert.deepEqual(second, expected('statement-2'));
  assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-1'), true);
  const third = investigation(app).statements[2];
  assert.equal(third.id, 'statement-3');
  assert.equal(third.origin, 'local-script');
  const fourth = await ask(app, unit, 'Repeat the tentative suspicion?');
  assert.deepEqual(fourth, expected('statement-4'));
  assert.equal(second.text, fourth.text, 'equal wording is two actual contributions, not a deduplicated or overwritten record');
  assert.notEqual(second.id, fourth.id);
  assert.equal(new Set(investigation(app).statements.map(statement => statement.id)).size, 4);
  assert.deepEqual(investigation(app).history.filter(entry => entry.kind === 'statement').map(entry => entry.origin), ['local-script', 'model', 'local-script', 'model']);
  assert.equal(app.calls.length, 2);
});

test('generated challenges use every discovered clue and never treat statements or their citations as proof', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  inspect(app);
  const statement = await ask(app, unit);
  const original = investigation(app);
  assert.equal(app.controller.challengeEvaStatement(unit, statement.id, ['clue-1']), true);
  const earlier = investigation(app).challenges.at(-1)!;
  assert.deepEqual(earlier.assessment, { origin: 'local-rule', status: 'compatible', clueIds: ['clue-1', 'clue-3'], contradictingClueIds: [] });
  inspect(app, 'object-2');
  assert.equal(app.controller.challengeEvaStatement(unit, statement.id, ['clue-1']), true);
  const contradicted = investigation(app).challenges.at(-1)!;
  assert.deepEqual(contradicted.assessment, { origin: 'local-rule', status: 'contradicted', clueIds: ['clue-1', 'clue-3', 'clue-2', 'clue-4'], contradictingClueIds: ['clue-2'] });
  assert.deepEqual(investigation(app).statements, original.statements);
  assert.deepEqual(investigation(app).history.slice(0, original.history.length), original.history);
  assert.deepEqual(investigation(app).challenges[0], earlier);
  assert.deepEqual(modelStatements(app)[0].clueIds, ['clue-3', 'clue-1'], 'later discoveries cannot rewrite original model citations');
  assert.equal(app.controller.challengeEvaStatement(unit, statement.id, []), true);
  assert.equal(investigation(app).challenges.at(-1)!.assessment.status, 'insufficient');
  const before = app.controller.getState();
  const notifications = app.states.length;
  for (const clueIds of [[statement.id], ['clue-1', statement.id], ['clue-1', 'clue-1'], ['clue-9']]) {
    assert.equal(app.controller.challengeEvaStatement(unit, statement.id, clueIds), false);
    assert.equal(app.controller.accuse(unit, 'candidate-3', clueIds), false);
  }
  assert.deepEqual(app.controller.getState(), before);
  assert.equal(app.states.length, notifications);
  assert.equal(app.calls.length, 1);
  assert.equal(app.controller.accuse(unit, 'candidate-3', ['clue-1']), true);
  assert.equal(investigation(app).resolution!.status, 'incorrect', 'a narration cannot override independent local resolution rules');
});

test('later model replies and challenges cannot overwrite the earlier contribution or its historical provenance', async t => {
  const app = setup(t, { narrate: (_call, count) => Promise.resolve(json(suspicion(count === 1 ? 'candidate-3' : 'candidate-1'))) });
  const unit = await reveal(app);
  inspect(app);
  const first = await ask(app, unit, 'First reading?');
  const prefix = investigation(app);
  const second = await ask(app, unit, 'A different reading?');
  assert.deepEqual(first, expected('statement-1'));
  assert.deepEqual(second, expected('statement-2', suspicion('candidate-1')));
  assert.deepEqual(investigation(app).statements, [first, second]);
  assert.deepEqual(investigation(app).history.slice(0, prefix.history.length), prefix.history);
  const sent = JSON.parse(String(app.calls[1].init.body));
  assert.deepEqual(sent.context.history, prefix.history);
  assert.deepEqual(validateInvestigationNarrationRequest(sent), sent);
  inspect(app, 'object-2');
  assert.equal(app.controller.challengeEvaStatement(unit, first.id, ['clue-1']), true);
  assert.equal(app.controller.challengeEvaStatement(unit, second.id, ['clue-1']), true);
  assert.deepEqual(investigation(app).challenges.map(challenge => challenge.assessment.status), ['contradicted', 'compatible']);
  assert.deepEqual(investigation(app).statements, [first, second]);
  assert.equal(investigation(app).resolution, null);
});

test('statement arrays nested citations and public history are detached from getter and callback snapshots', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  inspect(app);
  await ask(app, unit);
  const before = app.controller.getState();
  for (const view of [app.controller.getState(), app.states.at(-1)!]) {
    const statement = view.investigation!.statements[0];
    assert.equal(statement.origin, 'model');
    if (statement.origin !== 'model') throw new Error('Expected model provenance.');
    statement.text = 'Forged statement';
    statement.candidateId = 'candidate-1';
    statement.clueIds.push('clue-2');
    for (const entries of [view.investigation!.history, view.narratorContext!.history]) {
      const entry = entries.find(entry => entry.kind === 'statement' && entry.origin === 'model');
      assert.ok(entry && entry.kind === 'statement' && entry.origin === 'model');
      entry.statement.text = 'Forged history';
      entry.statement.clueIds.length = 0;
    }
    view.dialogue!.reply!.clueIds.push('clue-2');
    view.investigation!.statements.length = 0;
  }
  assert.deepEqual(app.controller.getState(), before);
});

test('reflection resolution and scripted fallback do not turn into generated suspicions or consume statement IDs', async t => {
  for (const kind of ['reflection', 'resolution', 'fallback'] as const) {
    const app = setup(t, { narrate: call => {
      if (kind === 'fallback') return Promise.resolve(json({ error: 'disabled' }, 503));
      if (kind === 'reflection') return Promise.resolve(json(reflection()));
      const resolution = JSON.parse(String(call.init.body)).context.resolution;
      assert.equal(resolution.status, 'resolved');
      return Promise.resolve(json({ version: 1, kind: 'resolution', reply: resolution.explanation, candidateId: resolution.candidateId, clueIds: resolution.clueIds }));
    } });
    const unit = await reveal(app);
    inspect(app);
    assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-2'), true);
    if (kind === 'resolution') {
      inspect(app, 'object-2');
      assert.equal(app.controller.accuse(unit, 'candidate-1', ['clue-1', 'clue-2']), true);
      assert.equal(investigation(app).resolution!.status, 'resolved');
    }
    const before = investigation(app);
    assert.equal(await app.controller.askInvestigationQuestion(unit, 'What can you say now?'), true);
    assert.equal(app.controller.getState().dialogue!.reply!.origin, kind === 'fallback' ? 'local-script' : 'model');
    assert.equal(app.controller.getState().dialogue!.reply!.kind, kind === 'resolution' ? 'resolution' : 'reflection');
    assert.deepEqual(investigation(app).statements, before.statements);
    assert.deepEqual(investigation(app).resolution, before.resolution);
    assert.equal(investigation(app).history.filter(entry => entry.kind === 'statement').length, 1);
    assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-3'), true);
    assert.equal(investigation(app).statements.at(-1)!.id, 'statement-2');
    assert.equal(app.calls.length, 1);
  }
});

test('model-supplied IDs origins authority and invalid evidence are rejected before any generated statement admission', async t => {
  for (const proposal of [
    { ...suspicion(), id: 'statement-999' }, { ...suspicion(), origin: 'model' }, { ...suspicion(), origin: 'local-rule' },
    { ...suspicion(), clueIds: ['clue-2'] }, { ...suspicion(), clueIds: ['statement-1'] },
    { ...suspicion(), reply: 'Candidate-3 is proven guilty.' }, { ...suspicion(), candidateId: 'candidate-4' },
  ]) {
    const app = setup(t, { narrate: () => Promise.resolve(json(proposal)) });
    const unit = await reveal(app);
    inspect(app);
    assert.equal(await app.controller.askInvestigationQuestion(unit, 'Is this valid?'), true);
    assert.equal(app.controller.getState().dialogue!.reply!.origin, 'local-script');
    assert.equal(app.controller.getState().dialogue!.reply!.reason, 'invalid_response');
    assert.deepEqual(investigation(app).statements, []);
    assert.equal(investigation(app).history.some(entry => entry.kind === 'statement'), false);
    assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-2'), true);
    assert.equal(investigation(app).statements[0].id, 'statement-1', 'invalid output cannot allocate or alias an application statement ID');
    assert.equal(app.calls.length, 1);
  }
});

test('public model statement history validates strict shape IDs provenance citations and bounded prose without invoking accessors', async t => {
  const app = setup(t);
  const unit = await reveal(app);
  inspect(app);
  assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-2'), true);
  await ask(app, unit);
  const input = { version: 1, question: 'Why was that challenged?', context: app.controller.getState().narratorContext! };
  const result = validateInvestigationNarrationRequest(input);
  assert.deepEqual(result, input);
  assert.doesNotMatch(JSON.stringify(input), /PRIVATE-ORIGINAL|clue-2|clue-4|"solution"|"accepted"|"displayed"/);
  for (const mutate of [
    (value: any) => { value.context.history.at(-1).origin = 'local-script'; },
    (value: any) => { value.context.history.at(-1).statement.origin = 'local-rule'; },
    (value: any) => { value.context.history.at(-1).statement.id = 'statement-0'; },
    (value: any) => { value.context.history.at(-1).statement.id = 'statement-9007199254740992'; },
    (value: any) => { value.context.history.at(-1).statement.candidateId = 'candidate-4'; },
    (value: any) => { value.context.history.at(-1).statement.clueIds = ['clue-2']; },
    (value: any) => { value.context.history.at(-1).statement.clueIds = ['clue-1', 'clue-1']; },
    (value: any) => { value.context.history.at(-1).statement.clueIds = new Array(1); },
    (value: any) => { value.context.history.at(-1).statement.clueIds.extra = 'hidden'; },
    (value: any) => { value.context.history.at(-1).statement.text = 'x'.repeat(601); },
    (value: any) => { value.context.history.at(-1).statement.text = 'The chair is behind the doorway.'; },
    (value: any) => { value.context.history.at(-1).statement.text = 'The microphone is recording.'; },
    (value: any) => { value.context.history.at(-1).statement.text = '<script>alert(1)</script>'; },
    (value: any) => { value.context.history.at(-1).statement.permissions = ['microphone']; },
    (value: any) => { Object.defineProperty(value.context.history.at(-1).statement, 'hidden', { value: true }); },
    (value: any) => { Object.setPrototypeOf(value.context.history.at(-1).statement, { hidden: true }); },
  ]) {
    const changed = structuredClone(input);
    mutate(changed);
    assert.throws(() => validateInvestigationNarrationRequest(changed));
  }
  let reads = 0;
  for (const key of ['origin', 'text', 'clueIds']) {
    const changed = structuredClone(input);
    const entry = changed.context.history.at(-1)!;
    assert.ok(entry.kind === 'statement');
    Object.defineProperty(entry.statement, key, { enumerable: true, get() { reads += 1; return 'forged'; } });
    assert.throws(() => validateInvestigationNarrationRequest(changed));
  }
  assert.equal(reads, 0);
  const current = input.context.history.at(-1)!;
  assert.ok(current.kind === 'statement' && current.origin === 'model');
  current.statement.clueIds.push('clue-2');
  assert.notDeepEqual(result, input, 'validated public history is detached down to model citation arrays');
});

test('pending cancelled and failed replacements retain exact model statements and their contribution history', async t => {
  for (const failure of ['cancel', 'invalid', 'false', 'throw'] as const) {
    const app = setup(t, { compose: count => Promise.resolve(json(count === 2 && failure === 'invalid' ? { invalid: true } : inspectionFixture())) });
    const unit = await reveal(app);
    inspect(app);
    const statement = await ask(app, unit);
    assert.equal(app.controller.challengeEvaStatement(unit, statement.id, ['clue-1']), true);
    const before = investigation(app);
    assert.equal(await app.controller.compose('replacement', 41), failure !== 'invalid');
    assert.deepEqual(investigation(app), before);
    if (failure === 'cancel') assert.equal(app.controller.stop(), true);
    if (failure === 'false' || failure === 'throw') assert.equal(app.controller.reveal(() => { if (failure === 'throw') throw new Error('synthetic installer error'); return false; }), false);
    assert.deepEqual(investigation(app), before);
    assert.equal(app.controller.challengeEvaStatement(unit, statement.id, ['clue-1']), true);
    assert.equal(investigation(app).challenges.at(-1)!.assessment.status, 'compatible');
    assert.deepEqual(investigation(app).statements, before.statements);
    assert.equal(app.calls.length, 1);
  }
});

test('successful replacement and reset clear case records without reusing local or model statement IDs', async t => {
  const app = setup(t);
  let unit = await reveal(app);
  inspect(app);
  const first = await ask(app, unit);
  const oldUnit = unit;
  unit = await reveal(app);
  assert.notEqual(unit, oldUnit);
  assert.deepEqual(investigation(app).statements, []);
  assert.deepEqual(investigation(app).history, []);
  inspect(app);
  const second = await ask(app, unit);
  assert.equal(second.id, 'statement-2');
  assert.equal(app.controller.challengeEvaStatement(unit, first.id, ['clue-1']), false);
  assert.equal(app.controller.challengeEvaStatement(oldUnit, second.id, ['clue-1']), false);
  assert.equal(app.controller.reset(), true);
  assert.equal(app.controller.getState().investigation, null);
  unit = await reveal(app);
  inspect(app);
  assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-2'), true);
  assert.equal(investigation(app).statements[0].id, 'statement-3');
  const fourth = await ask(app, unit);
  assert.equal(fourth.id, 'statement-4');
  const before = app.controller.getState();
  for (const stale of [first.id, second.id]) assert.equal(app.controller.challengeEvaStatement(unit, stale, ['clue-1']), false);
  assert.deepEqual(app.controller.getState(), before);
  assert.equal(app.controller.challengeEvaStatement(unit, fourth.id, ['clue-1']), true);
  const sent = JSON.parse(String(app.calls.at(-1)!.init.body));
  assert.doesNotMatch(JSON.stringify(sent.context), /statement-1|statement-2/);
});

test('cancelled stale replaced reset and disposed replies never create a late generated statement', { timeout: 3000 }, async t => {
  for (const action of ['stop', 'compose', 'reveal', 'reset', 'dispose'] as const) {
    const late = deferred<Response>();
    const app = setup(t, { narrate: (_call, count) => count === 2 ? late.promise : Promise.resolve(json(suspicion())) });
    const unit = await reveal(app);
    inspect(app);
    const first = await ask(app, unit, 'Already admitted?');
    if (action === 'reveal') assert.equal(await app.controller.compose('replacement', 41), true);
    const pending = app.controller.askInvestigationQuestion(unit, 'Cancelled question?');
    assert.equal(app.controller.getState().dialogue!.pending, true);
    if (action === 'compose') assert.equal(await app.controller.compose('replacement', 41), true);
    else if (action === 'reveal') assert.equal(app.controller.reveal(app.display.install), true);
    else app.controller[action]();
    assert.equal(await pending, false);
    assert.equal(app.calls[1].init.signal!.aborted, true);
    const before = app.controller.getState();
    if (action === 'stop' || action === 'compose' || action === 'dispose') assert.deepEqual(before.investigation!.statements, [first]);
    if (action === 'reveal') assert.deepEqual(before.investigation!.statements, []);
    if (action === 'reset') assert.equal(before.investigation, null);
    const notifications = app.states.length;
    late.resolve(json(suspicion('candidate-1')));
    await flush();
    assert.deepEqual(app.controller.getState(), before);
    assert.equal(app.states.length, notifications);
    assert.equal(app.calls.length, 2);
  }
});

test('a citation discovered only after a question was sent cannot create a generated statement from that reply', async t => {
  const late = deferred<Response>();
  const app = setup(t, { narrate: () => late.promise });
  const unit = await reveal(app);
  inspect(app);
  const pending = app.controller.askInvestigationQuestion(unit, 'What can you infer from this snapshot?');
  assert.equal(app.controller.getState().dialogue!.pending, true);
  assert.doesNotMatch(String(app.calls[0].init.body), /clue-2|clue-4/);
  inspect(app, 'object-2');
  late.resolve(json({ ...suspicion(), clueIds: ['clue-2'] }));
  assert.equal(await pending, true);
  assert.equal(app.controller.getState().dialogue!.reply!.origin, 'local-script');
  assert.deepEqual(investigation(app).statements, []);
  assert.equal(investigation(app).history.some(entry => entry.kind === 'statement'), false);
  assert.equal(app.controller.recordLocalEvaStatement(unit, 'candidate-1'), true);
  assert.equal(investigation(app).statements[0].id, 'statement-1');
});
