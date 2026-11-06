import { Group, Mesh, type Object3D, type Scene } from 'three';
import { validateRoomDescription, type RoomDescription } from './room-description.ts';
import type { RoomLayout } from './procedural-room.ts';

type ObjectId = `object-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
type CandidateId = `candidate-${1 | 2 | 3 | 4}`;
type Badge = 'circle' | 'square' | 'triangle';
type Fabric = 'linen' | 'wool' | 'silk';
export type RoomCase = {
  version: 1;
  event: { kind: 'keepsake_taken'; objectId: ObjectId };
  objects: { id: ObjectId; furnishingIndex: number }[];
  candidates: { id: CandidateId; badge: Badge; fabric: Fabric }[];
  clues: ({ id: `clue-${1 | 2 | 3 | 4}`; objectId: ObjectId; relation: 'matches' | 'differs' }
    & ({ trait: 'badge'; value: Badge } | { trait: 'fabric'; value: Fabric }))[];
  solution: { candidateId: CandidateId };
};

export class RoomCaseValidationError extends Error {
  readonly reason: 'invalid_case_schema' | 'invalid_case_references' | 'invalid_case_solution';
  constructor(reason: RoomCaseValidationError['reason']) {
    super('Invalid room case.');
    this.reason = reason;
  }
}

function record(value: unknown, keys: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null)
    && Reflect.ownKeys(value).length === keys.length && keys.every(key => {
      const property = Object.getOwnPropertyDescriptor(value, key);
      return property?.enumerable && 'value' in property;
    });
}
function array(value: unknown, min: number, max: number): value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype
    || value.length < min || value.length > max || Reflect.ownKeys(value).length !== value.length + 1) return false;
  for (let index = 0; index < value.length; index += 1) {
    const property = Object.getOwnPropertyDescriptor(value, String(index));
    if (!property?.enumerable || !('value' in property)) return false;
  }
  return true;
}
const objectId = (value: unknown) => typeof value === 'string' && /^object-[1-8]$/.test(value);
const candidateId = (value: unknown) => typeof value === 'string' && /^candidate-[1-4]$/.test(value);
const badge = (value: unknown) => value === 'circle' || value === 'square' || value === 'triangle';
const fabric = (value: unknown) => value === 'linen' || value === 'wool' || value === 'silk';

export function candidateMatchesClue(candidate: RoomCase['candidates'][number], clue: RoomCase['clues'][number]) {
  return clue.relation === 'matches' ? candidate[clue.trait] === clue.value : candidate[clue.trait] !== clue.value;
}

export function validateRoomCase(input: unknown, description: RoomDescription): RoomCase {
  if (!record(input, ['version', 'event', 'objects', 'candidates', 'clues', 'solution']) || input.version !== 1
    || !record(input.event, ['kind', 'objectId']) || input.event.kind !== 'keepsake_taken' || !objectId(input.event.objectId)
    || !array(input.objects, 1, 8) || !input.objects.every(item => record(item, ['id', 'furnishingIndex'])
      && objectId(item.id) && typeof item.furnishingIndex === 'number' && Number.isInteger(item.furnishingIndex)
      && item.furnishingIndex >= 0 && item.furnishingIndex <= 7)
    || !array(input.candidates, 2, 4) || !input.candidates.every(item => record(item, ['id', 'badge', 'fabric'])
      && candidateId(item.id) && badge(item.badge) && fabric(item.fabric))
    || !array(input.clues, 2, 4) || !input.clues.every(item => record(item, ['id', 'objectId', 'trait', 'relation', 'value'])
      && typeof item.id === 'string' && /^clue-[1-4]$/.test(item.id) && objectId(item.objectId)
      && (item.relation === 'matches' || item.relation === 'differs')
      && (item.trait === 'badge' ? badge(item.value) : item.trait === 'fabric' && fabric(item.value)))
    || !record(input.solution, ['candidateId']) || !candidateId(input.solution.candidateId)) {
    throw new RoomCaseValidationError('invalid_case_schema');
  }
  const data = input as unknown as RoomCase;
  const objects = new Set(data.objects.map(item => item.id));
  const candidates = new Set(data.candidates.map(item => item.id));
  if (objects.size !== data.objects.length || candidates.size !== data.candidates.length
    || new Set(data.objects.map(item => item.furnishingIndex)).size !== data.objects.length
    || new Set(data.clues.map(item => item.id)).size !== data.clues.length
    || data.objects.some(item => item.furnishingIndex >= description.furnishings.length)
    || !objects.has(data.event.objectId) || data.clues.some(item => !objects.has(item.objectId))
    || !candidates.has(data.solution.candidateId)) throw new RoomCaseValidationError('invalid_case_references');
  // The declared answer is checked only after independently enumerating all consistent candidates.
  const consistent = data.candidates.filter(candidate => data.clues.every(clue => candidateMatchesClue(candidate, clue)));
  if (consistent.length !== 1 || consistent[0].id !== data.solution.candidateId) {
    throw new RoomCaseValidationError('invalid_case_solution');
  }
  return { version: 1, event: { ...data.event }, objects: data.objects.map(item => ({ ...item })),
    candidates: data.candidates.map(item => ({ ...item })), clues: data.clues.map(item => ({ ...item })), solution: { ...data.solution } };
}

export function bindRoomCaseObjects(caseData: RoomCase, description: RoomDescription, room: { scene: Scene; layout: RoomLayout }): Map<string, Group> {
  const expected = validateRoomDescription(description);
  const data = validateRoomCase(caseData, expected);
  const invalid = () => new RoomCaseValidationError('invalid_case_references');
  if (JSON.stringify(validateRoomDescription(room.layout.description)) !== JSON.stringify(expected)
    || room.layout.furnishings.length !== expected.furnishings.length) throw invalid();
  function directGroup(parent: Object3D, name: string) {
    const matches = parent.children.filter(child => child.name === name);
    if (matches.length !== 1 || !(matches[0] instanceof Group) || matches[0].parent !== parent) throw invalid();
    return matches[0];
  }
  const furnishings = directGroup(directGroup(room.scene, 'room'), 'furnishings');
  if (furnishings.children.length !== expected.furnishings.length
    || new Set(furnishings.children).size !== furnishings.children.length) throw invalid();
  const groups = expected.furnishings.map((item, index) => {
    const placed = room.layout.furnishings[index];
    if (placed.kind !== item.kind || placed.color !== item.color
      || !Number.isFinite(placed.x) || !Number.isFinite(placed.z) || ![0, 90, 180, 270].includes(placed.rotation)) throw invalid();
    const group = directGroup(furnishings, `${item.kind}-${index + 1}`);
    let mesh = false;
    group.traverse(child => { if (child instanceof Mesh && (child.geometry.getAttribute('position')?.count ?? 0) > 0) mesh = true; });
    if (!mesh) throw invalid();
    return group;
  });
  // These are case-scoped bindings to this build, not durable domain IDs or new scene geometry.
  return new Map(data.objects.map(item => [item.id, groups[item.furnishingIndex]]));
}

export function roomCasePremise(caseData: RoomCase, description: RoomDescription): string {
  const data = validateRoomCase(caseData, description);
  const target = data.objects.find(item => item.id === data.event.objectId)!;
  const furnishing = description.furnishings[target.furnishingIndex];
  return `Fictional case: a keepsake is missing from ${furnishing.kind} ${target.furnishingIndex + 1}. The keepsake and evidence are text-only fictional annotations, not rendered props or marks.`;
}
