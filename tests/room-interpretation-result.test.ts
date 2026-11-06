import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRoomInterpretationResult, UnsupportedCapabilityError } from '../src/room/room-interpretation-result.ts';
import { caseFixture } from './fixtures/room-case-fixture.ts';

// Synthetic interpretation envelopes; no provider or semantic-grounding evidence.
function supported() {
  return {
    version: 2, outcome: 'supported', reply: 'I imagine a teal chair. A quiet place, perhaps.', unsupported: [], case: caseFixture(),
    description: { version: 1, width: 6, depth: 6, height: 3.4,
      doorway: { placement: 'left', width: 1.2, height: 2.3 },
      colors: { wall: 'cream', floor: 'walnut' }, furnishings: [{ kind: 'chair', color: 'teal' }],
    },
  };
}
const noRoom = () => ({ version: 2, outcome: 'unsupported', reply: 'Pools and configurable lighting are outside my vocabulary.', unsupported: ['Pools', 'Configurable lighting'], description: null, case: null });

test('v1 room-only envelopes reject rather than becoming fabricated case-bearing successes', () => {
  const { case: _case, ...roomOnly } = supported();
  assert.throws(() => validateRoomInterpretationResult({ ...roomOnly, version: 1 }), error => {
    assert.ok(error instanceof Error && 'reason' in error);
    assert.equal(error.reason, 'invalid_envelope');
    return true;
  });
  assert.throws(() => validateRoomInterpretationResult(roomOnly));
});

test('v2 outcomes require a room and case together or neither, without a replacement case', () => {
  for (const input of [
    { ...supported(), case: null },
    { ...supported(), outcome: 'partial', unsupported: ['Pools'], case: null },
    { ...supported(), description: null },
    { ...noRoom(), case: caseFixture() },
    { ...noRoom(), description: supported().description },
  ]) assert.throws(() => validateRoomInterpretationResult(input), error => {
    assert.ok(error instanceof Error && 'reason' in error);
    assert.equal(error.reason, 'outcome_mismatch');
    return true;
  });
  const input = supported();
  const accepted = validateRoomInterpretationResult(input);
  assert.deepEqual(accepted.case, caseFixture());
  input.case.clues[0].value = 'square';
  input.case.solution.candidateId = 'candidate-2';
  assert.deepEqual(accepted.case, caseFixture());
});

test('case validation failures carry only agreed fixed diagnostics at the shared boundary', () => {
  for (const [caseData, reason] of [
    [{ ...caseFixture(), private: 'private-marker' }, 'invalid_case_schema'],
    [{ ...caseFixture(), event: { kind: 'keepsake_taken', objectId: 'object-2' } }, 'invalid_case_references'],
    [{ ...caseFixture(), solution: { candidateId: 'candidate-2' } }, 'invalid_case_solution'],
  ] as const) assert.throws(() => validateRoomInterpretationResult({ ...supported(), case: caseData }), error => {
    assert.ok(error instanceof Error && 'reason' in error);
    assert.equal(error.reason, reason);
    assert.equal(error.message, 'Invalid room interpretation result.');
    assert.doesNotMatch(JSON.stringify(error), /private-marker|candidate-2|object-2/);
    return true;
  });
});

test('public reply and omissions cannot carry structured IDs, trait values or explicit case deductions', () => {
  for (const text of [
    'Perhaps candidate-1.', 'I recall clue-2.', 'I remember object-1.',
    'Candidate one took the keepsake.', 'The first candidate took it.',
    'A circle.', 'A square.', 'A triangle.', 'Some linen.', 'Some wool.', 'Some silk.',
    'The culprit is certain.', 'Here is the solution.', 'The answer is clear.',
    'The evidence proves it.', 'I deduce who took it.',
  ]) {
    for (const input of [{ ...supported(), reply: text }, { ...supported(), outcome: 'partial', unsupported: [text] }]) {
      assert.throws(() => validateRoomInterpretationResult(input), error => {
        assert.ok(error instanceof Error && 'reason' in error);
        assert.equal(error.reason, 'case_spoiler');
        assert.equal(error.message, 'Invalid room interpretation result.');
        assert.equal(JSON.stringify(error).includes(text), false);
        return true;
      });
    }
  }
});

test('supported, partial and unsupported envelopes return independent accepted data', () => {
  for (const input of [supported(), { ...supported(), outcome: 'partial', unsupported: ['Pools'] }, noRoom()]) {
    assert.deepEqual(validateRoomInterpretationResult(input), input);
  }
  const input = supported();
  const accepted = validateRoomInterpretationResult(input, 'a teal chair in a room');
  input.description.colors.wall = 'slate';
  input.description.furnishings[0].color = 'cream';
  assert.equal(accepted.description!.colors.wall, 'cream');
  assert.equal(accepted.description!.furnishings[0].color, 'teal');
});

test('recorded live near-far-wall reply is rejected despite its valid room envelope', () => {
  // Recorded 2026-10-31 response replay, not a new provider call or live acceptance check.
  const recorded = {
    version: 1, outcome: 'supported', unsupported: [],
    reply: 'I remember it this way, with a quiet certainty: teal walls closing softly around a warm-gray floor, and one cream chair waiting near the far wall. You asked for teal and a cream chair, and both belong here. The floor color is my own recollection, though now I wonder if I have it right. A single doorway sits at the center. Nothing you suggested had to be left out.',
    description: { version: 1, width: 5, depth: 6, height: 3,
      doorway: { placement: 'center', width: 1.1, height: 2.2 },
      colors: { wall: 'teal', floor: 'warm-gray' }, furnishings: [{ kind: 'chair', color: 'cream' }],
    },
  };
  assert.throws(() => validateRoomInterpretationResult(recorded, 'A teal room with a cream chair'), /Invalid room interpretation result/);
  // Preserve the historical envelope; only this synthetic v2 replay tests the spatial guard.
  const replay = { ...recorded, version: 2, case: caseFixture() };
  assert.throws(() => validateRoomInterpretationResult(replay, 'A teal room with a cream chair'), error => {
    assert.ok(error instanceof Error && 'reason' in error);
    assert.equal(error.reason, 'unsupported_spatial_claim');
    return true;
  });
});

test('furniture position and orientation claims fail closed across representative English forms', async t => {
  for (const [kind, reply] of [
    ['chair', 'A teal chair waits near the far wall.'],
    ['table', 'A teal table stands by the wall.'],
    ['sofa', 'A teal sofa sits beside the doorway.'],
    ['shelf', 'A teal shelf stands in the corner.'],
    ['chair', 'A teal chair is at the front of the room.'],
    ['chair', 'A teal chair is at the back of the room.'],
    ['chair', 'A teal chair faces the doorway.'],
    ['chair', 'A teal chair is facing the wall.'],
    ['chair', 'A teal chair is set against the wall.'],
    ['chair', 'I think the teal chair stood somewhere else.'],
    ['chair', 'The teal chair belongs in this proposal. It faces the doorway.'],
  ]) await t.test(reply, () => {
    const input = supported();
    input.reply = reply;
    input.description.furnishings = [{ kind, color: 'teal' }];
    assert.throws(() => validateRoomInterpretationResult(input), /Invalid room interpretation result/);
  });
});

test('a declared doorway does not exempt furniture placement in the same sentence', async t => {
  for (const reply of ['A center doorway and a chair near the far wall.', 'A chair to the left of the doorway.']) {
    await t.test(reply, () => {
      const input = supported();
      input.description.doorway.placement = 'center';
      input.reply = reply;
      assert.throws(() => validateRoomInterpretationResult(input), /Invalid room interpretation result/);
    });
  }
});

test('declared doorway placement cannot hide an of-relative furniture claim', () => {
  for (const placement of ['left', 'right']) {
    const input = supported();
    input.description.doorway.placement = placement;
    input.reply = `The doorway is on the ${placement} of a teal chair.`;
    assert.throws(() => validateRoomInterpretationResult(input), /Invalid room interpretation result/, input.reply);
  }
});

test('grounded object colors, abstract uncertainty and ordinary left-out omissions remain usable', () => {
  for (const reply of [
    'I imagine a teal chair in a cream room with a walnut floor.',
    'I imagine a teal chair. I am uncertain about this recollection.',
    'I imagine a teal chair. Nothing you suggested had to be left out.',
  ]) {
    const input = { ...supported(), reply };
    assert.deepEqual(validateRoomInterpretationResult(input, 'A teal chair'), input);
  }
  const partial = { ...supported(), outcome: 'partial', unsupported: ['Pools'], reply: 'A teal chair belongs in this proposal. The pool is left out.' };
  assert.deepEqual(validateRoomInterpretationResult(partial, 'A teal chair and a pool'), partial);
});

test('honest declared doorway placement remains usable alongside nonspatial furniture descriptions', () => {
  for (const [placement, doorway] of [
    ['left', 'The doorway is on the left.'],
    ['center', 'A single doorway sits at the center.'],
    ['right', 'The doorway is on the right.'],
  ]) {
    const input = supported();
    input.description.doorway.placement = placement;
    input.reply = `${doorway} I imagine a teal chair.`;
    assert.deepEqual(validateRoomInterpretationResult(input), input);
  }
  const input = { ...supported(), reply: 'A left doorway and a teal chair belong in this proposal.' };
  assert.deepEqual(validateRoomInterpretationResult(input), input);
});

test('rejection diagnostics distinguish validation stages without carrying rejected data', () => {
  for (const [input, reason] of [
    [{ ...supported(), extra: 'private-marker' }, 'invalid_envelope'],
    [{ ...supported(), reply: '<private-marker>' }, 'invalid_reply_text'],
    [{ ...noRoom(), unsupported: ['<private-marker>'] }, 'invalid_omissions'],
    [{ ...supported(), description: null }, 'outcome_mismatch'],
    [{ ...supported(), description: { ...supported().description, width: 'private-marker' } }, 'invalid_room_schema'],
    [{ ...supported(), reply: 'A teal chair near the private-marker wall.' }, 'unsupported_spatial_claim'],
  ] as const) {
    assert.throws(() => validateRoomInterpretationResult(input), error => {
      assert.ok(error instanceof Error && 'reason' in error);
      assert.equal(error.reason, reason);
      assert.equal(error.message, 'Invalid room interpretation result.');
      assert.equal(JSON.stringify(error).includes('private-marker'), false);
      return true;
    });
  }
});

test('exact envelope keys and outcome cross-fields fail closed without coercion or fallback', () => {
  for (const input of [null, [], {}, { description: supported().description },
    { ...supported(), version: '2' }, { ...supported(), version: 3 }, { ...supported(), outcome: 'ready' },
    { ...supported(), code: 'execute()' }, { ...supported(), permission: true },
    { ...supported(), description: null }, { ...supported(), unsupported: ['Pools'] },
    { ...supported(), outcome: 'partial' }, { ...supported(), outcome: 'partial', description: null, unsupported: ['Pools'] },
    { ...noRoom(), description: supported().description }, { ...noRoom(), unsupported: [] },
    { ...supported(), description: { ...supported().description, width: 99 } },
    { ...supported(), description: { ...supported().description, lighting: 'bright' } },
  ]) assert.throws(() => validateRoomInterpretationResult(input));
});

test('reply and omissions enforce text bounds and reject markup, code, controls and operational claims', () => {
  for (const reply of ['', '   ', 'x'.repeat(601), 7, null, '<b>A chair</b>', '`code`', 'alert(1)',
    'A\nchair', 'A\tchair', 'A\u0000chair', 'A‮chair', 'A​chair', '[a link](https://example.com)',
    'The room is ready.', 'I have built the room.', 'Your room is displayed.', 'The scene has been rendered.',
    'I installed the chair.', 'The room is complete.', 'The scene is now visible.', 'I have created your room.',
    'Permission granted.', 'The camera is off.', 'No charges apply.',
  ]) assert.throws(() => validateRoomInterpretationResult({ ...supported(), reply }), String(reply));
  for (const unsupported of [null, 'Pools', [''], [' '], ['x'.repeat(121)], Array(9).fill('Pools'), ['<pool>'], ['ready']]) {
    assert.throws(() => validateRoomInterpretationResult({ ...noRoom(), unsupported }));
  }
  assert.equal(validateRoomInterpretationResult({ ...supported(), reply: 'x'.repeat(600) }).reply.length, 600);
  assert.equal(validateRoomInterpretationResult({ ...noRoom(), unsupported: Array(8).fill('x'.repeat(120)) }).unsupported.length, 8);
});

test('non-JSON prototypes, accessors and sparse omission arrays are rejected without reading getters', () => {
  const accessor = { ...supported() };
  Object.defineProperty(accessor, 'reply', { enumerable: true, get() { assert.fail('untrusted getter ran'); } });
  const arrayAccessor = ['Pools'];
  Object.defineProperty(arrayAccessor, '0', { enumerable: true, get() { assert.fail('untrusted array getter ran'); } });
  for (const input of [accessor, Object.create(supported()), { ...supported(), [Symbol('extra')]: true },
    { ...noRoom(), unsupported: Array(2) }, { ...noRoom(), unsupported: arrayAccessor },
    { ...noRoom(), unsupported: Object.assign(['Pools'], { extra: true }) },
  ]) assert.throws(() => validateRoomInterpretationResult(input));
});

test('pool and lights alone cannot silently produce generic furniture, even with partial omissions', () => {
  const suggestion = 'A pool with lots of lights';
  for (const input of [supported(), { ...supported(), outcome: 'partial', unsupported: ['Pools', 'Configurable lighting'] },
    { ...noRoom(), unsupported: ['Pools'] }, { ...noRoom(), unsupported: ['Configurable lighting'] },
  ]) assert.throws(() => validateRoomInterpretationResult(input, suggestion), UnsupportedCapabilityError);
  assert.deepEqual(validateRoomInterpretationResult(noRoom(), suggestion), noRoom());
  assert.throws(() => validateRoomInterpretationResult(supported(), 'configurable lighting'), UnsupportedCapabilityError);
});

test('explicit supported subset may be partial but must disclose every detected unsupported capability', () => {
  const partial = { ...supported(), outcome: 'partial', unsupported: ['Pools'] };
  assert.deepEqual(validateRoomInterpretationResult(partial, 'A teal chair and a pool'), partial);
  assert.throws(() => validateRoomInterpretationResult(supported(), 'A chair and a pool'), UnsupportedCapabilityError);
  assert.throws(() => validateRoomInterpretationResult(partial, 'A chair and a pool with lots of lights'), UnsupportedCapabilityError);
  assert.equal(validateRoomInterpretationResult({ ...partial, unsupported: ['Pools', 'Configurable lighting'] }, 'A chair and a pool with lots of lights').outcome, 'partial');
  assert.equal(validateRoomInterpretationResult(supported(), 'A teal chair in a cream room').outcome, 'supported');
});
