import type { RoomInterpretationResult } from '../../src/room/room-interpretation-result.ts';
import { caseFixture } from './room-case-fixture.ts';

// Synthetic local inspection fixture; not live generation or rendered evidence.
export function inspectionFixture(): RoomInterpretationResult {
  const data = caseFixture();
  data.objects = [
    { id: 'object-1', furnishingIndex: 1 },
    { id: 'object-2', furnishingIndex: 0 },
    { id: 'object-3', furnishingIndex: 2 },
  ];
  data.clues[1].objectId = 'object-2';
  data.clues.push(
    { id: 'clue-3', objectId: 'object-1', trait: 'badge', relation: 'differs', value: 'square' },
    { id: 'clue-4', objectId: 'object-2', trait: 'fabric', relation: 'differs', value: 'silk' },
  );
  return {
    version: 2, outcome: 'supported', reply: 'I imagine four teal chairs in a cream room.', unsupported: [],
    description: {
      version: 1, width: 8, depth: 8, height: 3.4,
      doorway: { placement: 'center', width: 1.2, height: 2.3 },
      colors: { wall: 'cream', floor: 'walnut' },
      furnishings: Array.from({ length: 4 }, () => ({ kind: 'chair', color: 'teal' })),
    },
    case: data,
  };
}
