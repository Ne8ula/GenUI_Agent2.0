import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from 'three';
import { validateRoomCase, bindRoomCaseObjects, roomCasePremise } from '../src/room/room-case.ts';
import { createProceduralRoom } from '../src/room/procedural-room.ts';
import type { RoomDescription } from '../src/room/room-description.ts';
import { caseFixture } from './fixtures/room-case-fixture.ts';

// Synthetic room/case pairs; the real procedural builder is used without a renderer.
function description(): RoomDescription {
  return { version: 1, width: 8, depth: 8, height: 3.4,
    doorway: { placement: 'center', width: 1.2, height: 2.3 },
    colors: { wall: 'cream', floor: 'walnut' },
    furnishings: [{ kind: 'chair', color: 'teal' }, { kind: 'chair', color: 'teal' }],
  };
}
function rejects(input: unknown, reason: string, room = description()) {
  assert.throws(() => validateRoomCase(input, room), error => {
    assert.ok(error instanceof Error && 'reason' in error);
    assert.equal(error.reason, reason);
    assert.doesNotMatch(`${error.message}${JSON.stringify(error)}`, /private-marker/);
    return true;
  });
}

test('case validation independently selects the unique candidate and deeply snapshots fictional truth', () => {
  const input = caseFixture();
  const accepted = validateRoomCase(input, description());
  assert.deepEqual(accepted, input);
  assert.equal(accepted.solution.candidateId, 'candidate-1');
  input.event.objectId = 'object-2';
  input.objects[0].furnishingIndex = 1;
  input.candidates[0].badge = 'triangle';
  input.clues[0].value = 'square';
  input.solution.candidateId = 'candidate-2';
  assert.deepEqual(accepted, caseFixture());
});

test('both matches and differs predicates participate regardless of candidate or clue order', () => {
  const input = caseFixture();
  input.clues[0] = { ...input.clues[0], trait: 'badge', relation: 'differs', value: 'square' };
  input.clues.reverse();
  input.candidates.reverse();
  assert.equal(validateRoomCase(input, description()).solution.candidateId, 'candidate-1');
  input.clues = [
    { id: 'clue-1', objectId: 'object-1', trait: 'badge', relation: 'matches', value: 'circle' },
    { id: 'clue-2', objectId: 'object-1', trait: 'fabric', relation: 'differs', value: 'linen' },
  ];
  input.solution.candidateId = 'candidate-3';
  assert.equal(validateRoomCase(input, description()).solution.candidateId, 'candidate-3');
});

test('zero, multiple, contradictory and falsely declared solutions cannot be made solvable by an answer field', () => {
  const zero = caseFixture();
  zero.clues[0].value = 'triangle';
  const multiple = caseFixture();
  multiple.clues[1] = { ...multiple.clues[1], trait: 'badge', relation: 'matches', value: 'circle' };
  const contradictory = caseFixture();
  contradictory.clues.push({ id: 'clue-3', objectId: 'object-1', trait: 'badge', relation: 'differs', value: 'circle' });
  const wrong = caseFixture();
  wrong.solution.candidateId = 'candidate-2';
  for (const input of [zero, multiple, contradictory, wrong]) rejects(input, 'invalid_case_solution');
  rejects({ ...caseFixture(), solvable: true }, 'invalid_case_schema');
});

test('every case record has exact versioned keys and bounded enum values without coercion', () => {
  const base = caseFixture();
  const invalid: unknown[] = [null, [], {}, { ...base, version: 2 }, { ...base, version: '1' },
    { ...base, narration: 'private-marker' }, { ...base, event: { ...base.event, prose: 'private-marker' } },
    { ...base, event: { kind: 'murder', objectId: 'object-1' } },
    { ...base, event: { kind: 'keepsake_taken' } },
    { ...base, objects: [{ id: 'object-1', furnishingIndex: 0, color: 'teal' }] },
    { ...base, objects: [{ id: 'object-0', furnishingIndex: 0 }] },
    { ...base, objects: [{ id: 'object-9', furnishingIndex: 0 }] },
    { ...base, objects: [{ id: 'object-1', furnishingIndex: '0' }] },
    ...[-1, 0.5, 8, NaN, Infinity].map(furnishingIndex => ({ ...base, objects: [{ id: 'object-1', furnishingIndex }] })),
    { ...base, candidates: [{ ...base.candidates[0], name: 'private-marker' }, ...base.candidates.slice(1)] },
    { ...base, candidates: [{ ...base.candidates[0], id: 'candidate-5' }, ...base.candidates.slice(1)] },
    { ...base, candidates: [{ ...base.candidates[0], badge: 'star' }, ...base.candidates.slice(1)] },
    { ...base, candidates: [{ ...base.candidates[0], fabric: 'cotton' }, ...base.candidates.slice(1)] },
    { ...base, clues: [{ ...base.clues[0], text: 'private-marker' }, base.clues[1]] },
    { ...base, clues: [{ ...base.clues[0], id: 'clue-5' }, base.clues[1]] },
    { ...base, clues: [{ ...base.clues[0], trait: 'color' }, base.clues[1]] },
    { ...base, clues: [{ ...base.clues[0], relation: 'maybe' }, base.clues[1]] },
    { ...base, clues: [{ ...base.clues[0], value: 'linen' }, base.clues[1]] },
    { ...base, clues: [base.clues[0], { ...base.clues[1], value: 'circle' }] },
    { ...base, solution: { candidateId: 'candidate-1', proof: 'private-marker' } },
    { ...base, solution: { candidateId: 'private-marker'.repeat(100) } },
  ];
  for (const key of Object.keys(base)) {
    const missing = { ...base } as Record<string, unknown>;
    delete missing[key];
    invalid.push(missing);
  }
  for (const input of invalid) rejects(input, 'invalid_case_schema');
});

test('case arrays enforce dense plain arrays and inclusive finite cardinalities', () => {
  const base = caseFixture();
  for (const [field, min, max] of [['objects', 1, 8], ['candidates', 2, 4], ['clues', 2, 4]] as const) {
    for (const value of [null, {}, Array(min), [], Array(min - 1).fill(base[field][0]), Array(max + 1).fill(base[field][0]),
      Object.assign([...base[field]], { extra: true }), Object.setPrototypeOf([...base[field]], {})]) {
      rejects({ ...base, [field]: value }, 'invalid_case_schema');
    }
  }
  const room = description();
  room.furnishings = Array.from({ length: 8 }, () => ({ kind: 'chair' as const, color: 'teal' as const }));
  const maximum = caseFixture();
  maximum.objects = Array.from({ length: 8 }, (_, index) => ({ id: `object-${index + 1}` as typeof maximum.objects[number]['id'], furnishingIndex: index }));
  maximum.candidates.push({ id: 'candidate-4', badge: 'triangle', fabric: 'silk' });
  maximum.clues.push(
    { id: 'clue-3', objectId: 'object-8', trait: 'fabric', relation: 'differs', value: 'wool' },
    { id: 'clue-4', objectId: 'object-7', trait: 'badge', relation: 'differs', value: 'triangle' },
  );
  maximum.event.objectId = 'object-8';
  assert.deepEqual(validateRoomCase(maximum, room), maximum);
  const minimum = caseFixture();
  minimum.candidates.pop();
  assert.deepEqual(validateRoomCase(minimum, description()), minimum);
});

test('nested prototypes, symbols, hidden properties and accessors fail without invoking getters', () => {
  let reads = 0;
  const base = caseFixture();
  for (const record of [base, base.event, base.objects[0], base.candidates[0], base.clues[0], base.solution]) {
    const key = Object.keys(record)[0];
    const descriptor = Object.getOwnPropertyDescriptor(record, key)!;
    Object.defineProperty(record, key, { configurable: true, enumerable: true, get() { reads += 1; return descriptor.value; } });
    rejects(base, 'invalid_case_schema');
    Object.defineProperty(record, key, descriptor);
    const prototype = Object.getPrototypeOf(record);
    Object.setPrototypeOf(record, { injected: true });
    rejects(base, 'invalid_case_schema');
    Object.setPrototypeOf(record, prototype);
    Object.defineProperty(record, 'hidden', { configurable: true, value: true });
    rejects(base, 'invalid_case_schema');
    Reflect.deleteProperty(record, 'hidden');
    const symbol = Symbol('private-marker');
    Object.defineProperty(record, symbol, { configurable: true, enumerable: true, value: true });
    rejects(base, 'invalid_case_schema');
    Reflect.deleteProperty(record, symbol);
  }
  for (const array of [base.objects, base.candidates, base.clues]) {
    const descriptor = Object.getOwnPropertyDescriptor(array, '0')!;
    Object.defineProperty(array, '0', { configurable: true, enumerable: true, get() { reads += 1; return descriptor.value; } });
    rejects(base, 'invalid_case_schema');
    Object.defineProperty(array, '0', descriptor);
  }
  assert.equal(reads, 0);
  assert.deepEqual(validateRoomCase(base, description()), caseFixture());
});

test('duplicate identities and every dangling reference reject even when colors and kinds match', () => {
  const base = caseFixture();
  for (const input of [
    { ...base, objects: [...base.objects, { id: 'object-1', furnishingIndex: 1 }] },
    { ...base, objects: [...base.objects, { id: 'object-2', furnishingIndex: 0 }] },
    { ...base, objects: [{ id: 'object-1', furnishingIndex: 2 }] },
    { ...base, event: { ...base.event, objectId: 'object-2' } },
    { ...base, clues: [{ ...base.clues[0], objectId: 'object-2' }, base.clues[1]] },
    { ...base, clues: [base.clues[0], { ...base.clues[1], id: 'clue-1' }] },
    { ...base, candidates: [base.candidates[0], { ...base.candidates[1], id: 'candidate-1' }, base.candidates[2]] },
    { ...base, solution: { candidateId: 'candidate-4' } },
  ]) rejects(input, 'invalid_case_references');
  rejects(base, 'invalid_case_references', { ...description(), furnishings: [] });
});

test('case-scoped identity binds identical chairs by absolute description index, not color or global name', () => {
  const roomDescription = description();
  roomDescription.furnishings.unshift({ kind: 'table', color: 'walnut' });
  const input = caseFixture();
  input.objects = [{ id: 'object-1', furnishingIndex: 2 }, { id: 'object-2', furnishingIndex: 1 }];
  input.clues[1].objectId = 'object-2';
  const room = createProceduralRoom(roomDescription, 4);
  try {
    const root = room.scene.children.find(item => item.name === 'room')!;
    const furniture = root.children.find(item => item.name === 'furnishings')!;
    const decoy = new Group();
    decoy.name = 'chair-3';
    room.scene.add(decoy);
    const before = furniture.children.slice();
    const bound = bindRoomCaseObjects(validateRoomCase(input, roomDescription), roomDescription, room);
    assert.deepEqual([...bound.keys()], ['object-1', 'object-2']);
    assert.equal(bound.get('object-1'), furniture.children[2]);
    assert.equal(bound.get('object-2'), furniture.children[1]);
    assert.notEqual(bound.get('object-1'), bound.get('object-2'));
    assert.notEqual(bound.get('object-1'), decoy);
    assert.deepEqual(furniture.children, before, 'binding must never add a keepsake, clue or furnishing');
  } finally { room.dispose(); }
});

test('final scene binding rejects missing, duplicate, unrendered and mismatched groups without fabricating them', () => {
  type Room = ReturnType<typeof createProceduralRoom>;
  const mutations: [string, (room: Room, root: Group, furnishings: Group) => void][] = [
    ['missing group with global decoy', (room, _root, group) => { const missing = group.children[0]; group.remove(missing); room.scene.add(missing); }],
    ['duplicate group name', (_room, _root, group) => { group.children[1].name = group.children[0].name; }],
    ['extra group', (_room, _root, group) => { group.add(group.children[0].clone()); }],
    ['no mesh descendants', (_room, _root, group) => { group.children[0].clear(); }],
    ['nested instead of direct furnishing', (_room, _root, group) => { const child = group.children[0]; const wrapper = new Group(); wrapper.add(child); group.add(wrapper); }],
    ['duplicate room root', (room, root) => { room.scene.add(root.clone()); }],
    ['duplicate furnishings root', (_room, root, group) => { root.add(group.clone()); }],
    ['wrong described room', room => { room.layout.description.colors.wall = 'slate'; }],
    ['wrong layout kind', room => { room.layout.furnishings[0].kind = 'shelf'; }],
    ['wrong layout count', room => { room.layout.furnishings.pop(); }],
  ];
  for (const [label, mutate] of mutations) {
    const roomDescription = description();
    const room = createProceduralRoom(roomDescription, 4);
    const root = room.scene.children.find(item => item.name === 'room') as Group;
    const furnishings = root.children.find(item => item.name === 'furnishings') as Group;
    try {
      mutate(room, root, furnishings);
      const count = furnishings.children.length;
      assert.throws(() => bindRoomCaseObjects(caseFixture(), roomDescription, room), label);
      assert.equal(furnishings.children.length, count, 'rejection must not repair the scene');
    } finally { room.dispose(); }
  }
});

test('premise is locally derived from the target furnishing, with no answer or rendered-evidence claim', () => {
  const input = caseFixture();
  input.objects[0].furnishingIndex = 1;
  const premise = roomCasePremise(input, description());
  assert.match(premise, /fictional/i);
  assert.match(premise, /keepsake/i);
  assert.match(premise, /chair.*2|2.*chair/i);
  assert.match(premise, /text.only/i);
  assert.match(premise, /not rendered/i);
  assert.doesNotMatch(premise, /candidate-\d|clue-\d|object-\d|circle|square|triangle|linen|wool|silk|culprit|solution|deduc/i);
  const changed = caseFixture();
  changed.objects[0].furnishingIndex = 1;
  changed.clues[0].value = 'square';
  changed.solution.candidateId = 'candidate-2';
  assert.equal(roomCasePremise(changed, description()), premise, 'the premise cannot disclose which candidate satisfies evidence');
});
