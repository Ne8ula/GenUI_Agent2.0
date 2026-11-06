import type { RoomCase } from './room-case.ts';
import type { RoomInspectionState } from './room-inspection.ts';
import { assessRoomAccusation, assessRoomHypothesis, type RoomInvestigationState } from './room-investigation.ts';
import { validateFurnishingPose } from './procedural-room.ts';

export type InvestigationNarratorContext = {
  candidates: RoomInvestigationState['candidates'];
  discoveredClues: RoomInspectionState['discoveredClues'];
  history: RoomInvestigationState['history'];
  resolution: RoomInvestigationState['resolution'];
};
export type InvestigationNarrationRequest = { version: 1; question: string; context: InvestigationNarratorContext };
export type InvestigationNarrationReply = {
  version: 1;
  kind: 'reflection' | 'suspicion' | 'resolution';
  reply: string;
  candidateId: string | null;
  clueIds: string[];
};

export const investigationNarrationMessages = {
  disabled: 'Investigation narration is disabled.',
  missing_key: 'The server-side narration key is not configured.',
  busy: 'The narration server is busy.',
  budget_exhausted: 'The three-attempt narration allowance is exhausted.',
  provider_unavailable: 'The narration provider is unavailable.',
  provider_rejected: 'The narration provider rejected this request.',
  narration_refused: 'The provider declined this narration.',
  narration_truncated: 'The narration ended before completion.',
  invalid_provider_response: 'The provider response was invalid or oversized.',
  invalid_narration: 'The proposed narration did not pass validation.',
  invalid_response: 'The narration endpoint returned an invalid or oversized reply.',
  network_error: 'The narration endpoint could not be reached.',
  narration_failed: 'No valid narration was received.',
  timeout: 'Narration timed out locally. Provider charges may still apply.',
} as const;
export const scriptedInvestigationReply = 'Local/scripted EVA: I remain uncertain. Compare the discovered fictional annotations with the public candidates. This is not live model reasoning.';

// Only public investigation inputs enter this projection; the full session history remains untouched.
export function projectInvestigationNarratorContext(investigation: RoomInvestigationState,
  discoveries: RoomInspectionState['discoveredClues']): InvestigationNarratorContext {
  const context: InvestigationNarratorContext = {
    candidates: investigation.candidates.map(candidate => ({ ...candidate })),
    discoveredClues: discoveries.map(clue => ({ ...clue })),
    history: structuredClone(investigation.history.slice(-12)),
    resolution: investigation.resolution?.status === 'resolved' ? structuredClone(investigation.resolution) : null,
  };
  // Long multibyte questions can hit the byte bound before the twelve-entry bound.
  while (context.history.length && new TextEncoder().encode(JSON.stringify(context)).byteLength > 32 * 1024) context.history.shift();
  return context;
}

function invalid(): never { throw new Error('Invalid public investigation narration data.'); }
function record(value: unknown, keys: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && Reflect.ownKeys(value).length === keys.length
    && keys.every(key => {
      const property = Object.getOwnPropertyDescriptor(value, key);
      return property?.enumerable && 'value' in property;
    });
}
function array(value: unknown, min: number, max: number): value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length < min || value.length > max
    || Reflect.ownKeys(value).length !== value.length + 1) return false;
  for (let index = 0; index < value.length; index += 1) {
    const property = Object.getOwnPropertyDescriptor(value, String(index));
    if (!property?.enumerable || !('value' in property)) return false;
  }
  return true;
}
function text(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit && !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value);
}
const objectId = (value: unknown) => typeof value === 'string' && /^object-[1-8]$/.test(value);
const statementId = (value: unknown) => typeof value === 'string' && /^statement-[1-9]\d{0,15}$/.test(value)
  && Number.isSafeInteger(Number(value.slice(10)));
const positiveInteger = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
function references(value: unknown, allowed: string[]): value is string[] {
  return array(value, 0, allowed.length) && value.every(id => typeof id === 'string' && allowed.includes(id))
    && new Set(value).size === value.length;
}
function sameIds(first: string[], second: string[]) {
  return first.length === second.length && first.every(id => second.includes(id));
}
function annotation(value: unknown): RoomCase['clues'][number] {
  if (!record(value, ['id', 'objectId', 'text']) || typeof value.id !== 'string' || !/^clue-[1-4]$/.test(value.id)
    || !objectId(value.objectId) || !text(value.text, 120)) return invalid();
  const match = /^Fictional text-only annotation: (badge|fabric) (matches|differs from) (circle|square|triangle|linen|wool|silk)\.$/.exec(value.text);
  if (!match || (match[1] === 'badge' ? !['circle', 'square', 'triangle'].includes(match[3]) : !['linen', 'wool', 'silk'].includes(match[3]))) return invalid();
  return { id: value.id, objectId: value.objectId, trait: match[1], relation: match[2] === 'matches' ? 'matches' : 'differs', value: match[3] } as RoomCase['clues'][number];
}
function validateContext(input: unknown): InvestigationNarratorContext {
  if (!record(input, ['candidates', 'discoveredClues', 'history', 'resolution']) || !array(input.candidates, 2, 4)
    || !input.candidates.every(candidate => record(candidate, ['id', 'badge', 'fabric'])
      && typeof candidate.id === 'string' && /^candidate-[1-4]$/.test(candidate.id)
      && ['circle', 'square', 'triangle'].includes(candidate.badge as string)
      && ['linen', 'wool', 'silk'].includes(candidate.fabric as string))
    || !array(input.discoveredClues, 0, 4) || !array(input.history, 0, 12)) return invalid();
  const candidates = input.candidates as RoomCase['candidates'];
  const candidateIds = candidates.map(candidate => candidate.id);
  const clues = input.discoveredClues.map(annotation);
  const clueIds = clues.map(clue => clue.id);
  if (new Set(candidateIds).size !== candidateIds.length || new Set(clueIds).size !== clueIds.length) return invalid();
  const candidate = (id: unknown) => candidates.find(item => item.id === id) ?? invalid();
  function assessment(value: unknown, cited: string[], target?: RoomCase['candidates'][number]) {
    if (!record(value, ['origin', 'status', 'clueIds', 'contradictingClueIds']) || value.origin !== 'local-rule'
      || !references(value.clueIds, clueIds) || !references(value.contradictingClueIds, value.clueIds)
      || !cited.every(id => (value.clueIds as string[]).includes(id))) return invalid();
    const status = value.contradictingClueIds.length ? 'contradicted' : value.clueIds.length ? 'compatible' : 'insufficient';
    if (value.status !== status) return invalid();
    if (target) {
      const expected = assessRoomHypothesis(target, (value.clueIds as string[]).map(id => clues.find(clue => clue.id === id)!));
      if (value.status !== expected.status || !sameIds(value.contradictingClueIds, expected.contradictingClueIds)) return invalid();
    }
  }
  function resolution(value: unknown) {
    if (!record(value, ['origin', 'status', 'candidateId', 'clueIds', 'explanation']) || value.origin !== 'local-rule'
      || !references(value.clueIds, clueIds) || !text(value.explanation, 600)) return invalid();
    const target = candidate(value.candidateId);
    const expected = assessRoomAccusation(candidates, target, clues, value.clueIds);
    if (value.status === 'insufficient') {
      // Later discoveries may contradict an earlier insufficient accusation; its snapshot is not rewritten.
      if (expected.status === 'resolved' || value.explanation !== assessRoomAccusation(candidates, target, [], []).explanation) return invalid();
    } else if ((value.status !== 'incorrect' && value.status !== 'resolved') || value.status !== expected.status
      || value.explanation !== expected.explanation) return invalid();
    return value as unknown as NonNullable<RoomInvestigationState['resolution']>;
  }
  const publicResolution = input.resolution === null ? null : resolution(input.resolution);
  if (publicResolution !== null && publicResolution.status !== 'resolved') return invalid();
  const publicContext = { candidates, discoveredClues: input.discoveredClues as RoomInspectionState['discoveredClues'], resolution: publicResolution };
  for (const entry of input.history) {
    if (!entry || typeof entry !== 'object') return invalid();
    const kind = Object.getOwnPropertyDescriptor(entry, 'kind')?.value;
    if (kind === 'inspection') {
      if (!record(entry, ['kind', 'origin', 'objectId', 'clueIds']) || entry.origin !== 'visitor' || !objectId(entry.objectId)
        || !references(entry.clueIds, clues.filter(clue => clue.objectId === entry.objectId).map(clue => clue.id))) return invalid();
    } else if (kind === 'hypothesis') {
      if (!record(entry, ['kind', 'origin', 'hypothesis']) || entry.origin !== 'visitor'
        || !record(entry.hypothesis, ['revision', 'candidateId', 'clueIds', 'assessment']) || !positiveInteger(entry.hypothesis.revision)
        || !references(entry.hypothesis.clueIds, clueIds)) return invalid();
      assessment(entry.hypothesis.assessment, entry.hypothesis.clueIds, candidate(entry.hypothesis.candidateId));
    } else if (kind === 'statement') {
      if (!record(entry, ['kind', 'origin', 'statement'])) return invalid();
      if (entry.origin === 'local-script') {
        if (!record(entry.statement, ['id', 'origin', 'candidateId', 'text']) || entry.statement.origin !== 'local-script'
          || !statementId(entry.statement.id)) return invalid();
        const target = candidate(entry.statement.candidateId);
        if (entry.statement.text !== `Local/scripted EVA: I suspect ${target.id}.`) return invalid();
      } else if (entry.origin === 'model') {
        if (!record(entry.statement, ['id', 'origin', 'candidateId', 'text', 'clueIds']) || entry.statement.origin !== 'model'
          || !statementId(entry.statement.id)) return invalid();
        validateReply({ version: 1, kind: 'suspicion', reply: entry.statement.text,
          candidateId: entry.statement.candidateId, clueIds: entry.statement.clueIds }, publicContext);
      } else return invalid();
    } else if (kind === 'challenge') {
      if (!record(entry, ['kind', 'origin', 'challenge']) || entry.origin !== 'visitor'
        || !record(entry.challenge, ['origin', 'statementId', 'clueIds', 'assessment']) || entry.challenge.origin !== 'visitor'
        || !statementId(entry.challenge.statementId) || !references(entry.challenge.clueIds, clueIds)) return invalid();
      // The challenged statement may precede the bounded history tail; it never becomes a clue.
      assessment(entry.challenge.assessment, entry.challenge.clueIds);
      if (!entry.challenge.clueIds.length && (entry.challenge.assessment as Record<string, unknown>).status !== 'insufficient') return invalid();
    } else if (kind === 'accusation') {
      if (!record(entry, ['kind', 'origin', 'result']) || entry.origin !== 'visitor') return invalid();
      resolution(entry.result);
    } else if (kind === 'reconstruction-edit') {
      if (!record(entry, ['kind', 'origin', 'revision', 'furnishingIndex', 'before', 'after']) || entry.origin !== 'visitor'
        || !positiveInteger(entry.revision) || typeof entry.furnishingIndex !== 'number' || !Number.isInteger(entry.furnishingIndex)
        || entry.furnishingIndex < 0 || entry.furnishingIndex > 7) return invalid();
      validateFurnishingPose(entry.before);
      validateFurnishingPose(entry.after);
    } else if (kind === 'question') {
      if (!record(entry, ['kind', 'origin', 'question']) || entry.origin !== 'visitor' || !text(entry.question, 2000)) return invalid();
    } else if (kind === 'reply') {
      if (!record(entry, ['kind', 'origin', 'reply']) || !record(entry.reply, ['origin', 'question', 'text', 'kind', 'candidateId', 'clueIds', 'reason'])
        || entry.origin !== entry.reply.origin || !text(entry.reply.question, 2000)) return invalid();
      const reply = entry.reply;
      if (entry.origin === 'model') {
        if (reply.reason !== null) return invalid();
        // The public fields are already checked; do not recursively validate this history through the public entry point.
        validateReply({ version: 1, kind: reply.kind, reply: reply.text, candidateId: reply.candidateId, clueIds: reply.clueIds }, publicContext);
      } else if (entry.origin !== 'local-script' || reply.kind !== 'reflection' || reply.text !== scriptedInvestigationReply
        || reply.candidateId !== null || !array(reply.clueIds, 0, 0)
        || typeof reply.reason !== 'string' || !Object.hasOwn(investigationNarrationMessages, reply.reason)) return invalid();
    } else return invalid();
  }
  if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 32 * 1024) return invalid();
  return structuredClone(input) as InvestigationNarratorContext;
}

export function validateInvestigationNarrationRequest(input: unknown): InvestigationNarrationRequest {
  if (!record(input, ['version', 'question', 'context']) || input.version !== 1 || !text(input.question, 2000)) return invalid();
  return { version: 1, question: input.question, context: validateContext(input.context) };
}

const operational = /\b(?:ready|display(?:ed|ing)?|reveal(?:ed|ing)?|render(?:ed|ing)?|built|generated|installed|loaded|complete(?:d)?|finished|created|constructed|visible|shown|permissions?|approved|granted|camera|microphone|recording|tracking|charges?|charged|paid|costs?|tokens?|requests?|provider|api)\b/i;
const spatial = /\b(?:near|beside|behind|against|between|opposite|next\s+to|corners?|faces?|facing|oriented|turned|rotated|positioned|placed|somewhere)\b|\b(?:by|at|on|in|to|towards?)\s+(?:(?:the|a|an)\s+)?(?:left|right|center|front|back|rear|walls?|doorways?|tables?|chairs?|sofas?|shelf|shelves)\b|\b(?:left|right|center)\s+(?:doorway|of)\b/i;

function validateReply(input: unknown, context: Pick<InvestigationNarratorContext, 'candidates' | 'discoveredClues' | 'resolution'>): InvestigationNarrationReply {
  if (!record(input, ['version', 'kind', 'reply', 'candidateId', 'clueIds']) || input.version !== 1
    || !['reflection', 'suspicion', 'resolution'].includes(input.kind as string) || !text(input.reply, 600)
    || !references(input.clueIds, context.discoveredClues.map(clue => clue.id))) return invalid();
  if (input.kind === 'reflection' ? input.candidateId !== null : !context.candidates.some(candidate => candidate.id === input.candidateId)) return invalid();
  // shortcut: conservative English lexical controls cannot prove prose semantics; broaden only with a stronger grounding contract.
  if (/[<>{}\[\]`\\|*_#~=]/u.test(input.reply) || /\b(?:https?:|javascript:|data:|(?:eval|alert|function|import|require)\s*\()/i.test(input.reply)
    || operational.test(input.reply) || spatial.test(input.reply)) return invalid();
  for (const match of input.reply.matchAll(/\b(candidate|clue|object)[-\s]+(\d+)\b/gi)) {
    const kind = match[1].toLowerCase();
    const id = `${kind}-${match[2]}`;
    const allowed = kind === 'candidate' ? context.candidates.map(candidate => candidate.id as string)
      : kind === 'clue' ? context.discoveredClues.map(clue => clue.id) : context.discoveredClues.map(clue => clue.objectId);
    if (!allowed.includes(id) || (kind === 'candidate' && input.candidateId !== null && input.candidateId !== id)) return invalid();
  }
  if (input.kind === 'resolution') {
    if (!context.resolution || input.candidateId !== context.resolution.candidateId || !sameIds(input.clueIds, context.resolution.clueIds)
      || input.reply !== context.resolution.explanation) return invalid();
  } else if (/\b(?:proof|proves?|proven|culprits?|guilty|innocent|solved|resolved|resolution|responsible)\b/i.test(input.reply)) return invalid();
  return { version: 1, kind: input.kind as InvestigationNarrationReply['kind'], reply: input.reply,
    candidateId: input.candidateId as string | null, clueIds: [...input.clueIds] };
}

export function validateInvestigationNarrationReply(input: unknown, publicContext: InvestigationNarratorContext): InvestigationNarrationReply {
  return validateReply(input, validateContext(publicContext));
}
