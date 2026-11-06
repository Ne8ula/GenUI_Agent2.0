import type { RoomCase } from '../../src/room/room-case.ts';

// Synthetic fictional facts only; no live generation, physical marks or rendered keepsake.
export function caseFixture(): RoomCase {
  return {
    version: 1,
    event: { kind: 'keepsake_taken', objectId: 'object-1' },
    objects: [{ id: 'object-1', furnishingIndex: 0 }],
    candidates: [
      { id: 'candidate-1', badge: 'circle', fabric: 'linen' },
      { id: 'candidate-2', badge: 'square', fabric: 'linen' },
      { id: 'candidate-3', badge: 'circle', fabric: 'wool' },
    ],
    clues: [
      { id: 'clue-1', objectId: 'object-1', trait: 'badge', relation: 'matches', value: 'circle' },
      { id: 'clue-2', objectId: 'object-1', trait: 'fabric', relation: 'matches', value: 'linen' },
    ],
    solution: { candidateId: 'candidate-1' },
  };
}
