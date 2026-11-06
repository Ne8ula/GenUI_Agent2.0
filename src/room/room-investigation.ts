import { candidateMatchesClue, type RoomCase } from './room-case.ts';
import type { FurnishingPose } from './procedural-room.ts';

export type RoomHypothesis = {
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
export type InvestigationDialogueReply = {
  origin: 'model' | 'local-script'; question: string; text: string;
  kind: 'reflection' | 'suspicion' | 'resolution'; candidateId: string | null; clueIds: string[]; reason: string | null;
};
export type LocalEvaStatement = { id: string; origin: 'local-script'; candidateId: string; text: string };
export type ModelEvaStatement = { id: string; origin: 'model'; candidateId: string; text: string; clueIds: string[] };
export type EvaChallenge = { origin: 'visitor'; statementId: string; clueIds: string[]; assessment: RoomHypothesis['assessment'] };
export type RoomResolution = {
  origin: 'local-rule'; status: 'insufficient' | 'incorrect' | 'resolved';
  candidateId: string; clueIds: string[]; explanation: string;
};
export type RoomInvestigationState = {
  unit: symbol;
  candidates: RoomCase['candidates'];
  hypothesis: RoomHypothesis | null;
  statements: (LocalEvaStatement | ModelEvaStatement)[];
  challenges: EvaChallenge[];
  resolution: RoomResolution | null;
  history: (
    | { kind: 'inspection'; origin: 'visitor'; objectId: string; clueIds: string[] }
    | { kind: 'hypothesis'; origin: 'visitor'; hypothesis: RoomHypothesis }
    | { kind: 'reconstruction-edit'; origin: 'visitor'; revision: number; furnishingIndex: number; before: FurnishingPose; after: FurnishingPose }
    | { kind: 'statement'; origin: 'local-script'; statement: LocalEvaStatement }
    | { kind: 'statement'; origin: 'model'; statement: ModelEvaStatement }
    | { kind: 'challenge'; origin: 'visitor'; challenge: EvaChallenge }
    | { kind: 'accusation'; origin: 'visitor'; result: RoomResolution }
    | { kind: 'question'; origin: 'visitor'; question: string }
    | { kind: 'reply'; origin: 'model' | 'local-script'; reply: InvestigationDialogueReply }
  )[];
};

export function assessRoomHypothesis(candidate: RoomCase['candidates'][number], discoveredClues: RoomCase['clues']): RoomHypothesis['assessment'] {
  const contradictingClueIds = discoveredClues.filter(clue => !candidateMatchesClue(candidate, clue)).map(clue => clue.id);
  return { origin: 'local-rule', status: contradictingClueIds.length ? 'contradicted' : discoveredClues.length ? 'compatible' : 'insufficient',
    clueIds: discoveredClues.map(clue => clue.id), contradictingClueIds };
}

export function assessRoomAccusation(candidates: RoomCase['candidates'], candidate: RoomCase['candidates'][number],
  discoveredClues: RoomCase['clues'], clueIds: string[]): RoomResolution {
  const cited = discoveredClues.filter(clue => clueIds.includes(clue.id));
  let status: RoomResolution['status'] = 'insufficient';
  if (clueIds.length) {
    if (!discoveredClues.every(clue => candidateMatchesClue(candidate, clue))) status = 'incorrect';
    else {
      const consistent = candidates.filter(item => cited.every(clue => candidateMatchesClue(item, clue)));
      if (consistent.length === 1 && consistent[0].id === candidate.id) status = 'resolved';
    }
  }
  const explanation = status === 'incorrect' ? 'This accusation conflicts with discovered evidence. The case remains unresolved.'
    : status === 'insufficient' ? 'The cited discoveries do not identify a single candidate. Inspect and cite more evidence.'
      : `The cited fictional discoveries identify ${candidate.id} as responsible: ${cited.map(clue => `${clue.id}: ${clue.trait} ${clue.relation === 'matches' ? 'matches' : 'differs from'} ${clue.value}.`).join(' ')}`;
  return { origin: 'local-rule', status, candidateId: candidate.id, clueIds: [...clueIds], explanation };
}

export function snapshotHypothesis(value: RoomHypothesis): RoomHypothesis {
  return { ...value, clueIds: [...value.clueIds], assessment: { ...value.assessment,
    clueIds: [...value.assessment.clueIds], contradictingClueIds: [...value.assessment.contradictingClueIds] } };
}

export function snapshotInvestigation(value: RoomInvestigationState): RoomInvestigationState {
  return { unit: value.unit, candidates: value.candidates.map(candidate => ({ ...candidate })),
    hypothesis: value.hypothesis && snapshotHypothesis(value.hypothesis),
    statements: structuredClone(value.statements), challenges: structuredClone(value.challenges),
    resolution: value.resolution && structuredClone(value.resolution), history: structuredClone(value.history) };
}
