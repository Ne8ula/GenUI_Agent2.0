import { validateRoomDescription, type RoomDescription } from './room-description.ts';
import { validateRoomCase, RoomCaseValidationError, type RoomCase } from './room-case.ts';

export type RoomInterpretationResult = {
  version: 2;
  reply: string;
  unsupported: string[];
} & ({ outcome: 'supported' | 'partial'; description: RoomDescription; case: RoomCase }
  | { outcome: 'unsupported'; description: null; case: null });

export type PublicRoomInterpretation = Pick<RoomInterpretationResult, 'reply' | 'outcome' | 'unsupported'>;

export const unsupportedCapabilityMessage = 'Pools and configurable lighting are unsupported. The interpretation contradicted that limit; no replacement was built.';
export class UnsupportedCapabilityError extends Error {
  constructor() { super(unsupportedCapabilityMessage); }
}

export class RoomInterpretationValidationError extends Error {
  readonly reason: 'invalid_envelope' | 'invalid_reply_text' | 'invalid_omissions' | 'outcome_mismatch' | 'invalid_room_schema' | 'unsupported_spatial_claim'
    | RoomCaseValidationError['reason'] | 'case_spoiler';
  constructor(reason: RoomInterpretationValidationError['reason']) {
    super('Invalid room interpretation result.');
    this.reason = reason;
  }
}

const keys = ['version', 'outcome', 'reply', 'unsupported', 'description', 'case'];
// shortcut: conservative English spoiler cues are not semantic secrecy; revisit before broader narration.
const caseSpoiler = /\b(?:(?:candidate|clue|object)[-\s]+\d+|candidates?|circle|square|triangle|linen|wool|silk|culprits?|solutions?|answers?|evidence|proof|guilty|innocent|suspects?|deduc(?:e[ds]?|ing|tions?))\b/i;
const pool = /\bpools?\b/i;
const lighting = /\b(?:lights?|lighting|lamps?|chandeliers?|sconces?|leds?|spotlights?)\b/i;
const supportedSubset = /\b(?:tables?|chairs?|sofas?|shelf|shelves|rooms?|interiors?|library|libraries|kitchens?|bedrooms?|offices?)\b/i;
const operational = /\b(?:ready|display(?:ed|ing)?|reveal(?:ed|ing)?|render(?:ed|ing)?|built|generated|installed|loaded|complete(?:d)?|finished|created|constructed|visible|shown|permissions?|approved|granted|camera|microphone|recording|tracking|charges?|charged|paid|costs?|tokens?|requests?|provider|api)\b/i;

function unsupportedSpatialClaim(reply: string, description: RoomDescription | null): boolean {
  // shortcut: bounded English cues can miss paraphrases or reject benign prose; revisit with a broader grounding contract.
  const placement = description?.doorway.placement;
  // Exempt only the declared doorway phrase in a scan copy, never its surrounding furniture claims or the returned reply.
  const text = placement ? reply.replace(new RegExp(`\\b(?:${placement}\\s+doorway|doorway\\s+(?:(?:is|sits|stands|lies)\\s+)?(?:at|on|in)\\s+(?:the\\s+)?${placement})\\b(?!\\s+of\\b)`, 'gi'), 'doorway') : reply;
  return /\b(?:near|beside|behind|against|between|opposite|next\s+to|corners?|faces?|facing|oriented|turned|rotated|positioned|placed|somewhere)\b/i.test(text)
    || /\b(?:by|at|on|in|to|towards?)\s+(?:(?:the|a|an)\s+)?(?:left|right|center|front|back|rear|walls?|doorways?|tables?|chairs?|sofas?|shelf|shelves)\b/i.test(text)
    || /\b(?:left|right|center)\s+(?:doorway|of)\b/i.test(text);
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && Reflect.ownKeys(value).every(key => {
    const property = Object.getOwnPropertyDescriptor(value, key)!;
    return typeof key === 'string' && property.enumerable && 'value' in property;
  });
}
function plainText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit
    && !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}<>{}\[\]`\\|*_#~=]/u.test(value)
    && !/\b(?:https?:|javascript:|data:|(?:eval|alert|function|import|require)\s*\()/i.test(value)
    && !operational.test(value);
}

export function validateRoomInterpretationResult(input: unknown, suggestion = ''): RoomInterpretationResult {
  const invalid = (reason: RoomInterpretationValidationError['reason']) => new RoomInterpretationValidationError(reason);
  if (!plainRecord(input) || Reflect.ownKeys(input).length !== keys.length || !keys.every(key => Object.hasOwn(input, key))
    || input.version !== 2 || !['supported', 'partial', 'unsupported'].includes(input.outcome as string)) throw invalid('invalid_envelope');
  if (!plainText(input.reply, 600)) throw invalid('invalid_reply_text');
  if (!Array.isArray(input.unsupported)
    || Object.getPrototypeOf(input.unsupported) !== Array.prototype || input.unsupported.length > 8
    || Reflect.ownKeys(input.unsupported).length !== input.unsupported.length + 1) throw invalid('invalid_omissions');
  const unsupported: string[] = [];
  for (let index = 0; index < input.unsupported.length; index += 1) {
    const entry = Object.getOwnPropertyDescriptor(input.unsupported, String(index));
    if (!entry?.enumerable || !('value' in entry) || !plainText(entry.value, 120)) throw invalid('invalid_omissions');
    unsupported.push(entry.value);
  }
  if ((input.outcome === 'supported') !== (unsupported.length === 0)
    || (input.outcome === 'unsupported') !== (input.description === null)
    || (input.description === null) !== (input.case === null)) throw invalid('outcome_mismatch');
  let description: RoomDescription | null;
  try { description = input.description === null ? null : validateRoomDescription(input.description); }
  catch { throw invalid('invalid_room_schema'); }
  if (unsupportedSpatialClaim(input.reply, description)) throw invalid('unsupported_spatial_claim');
  if ([input.reply, ...unsupported].some(text => caseSpoiler.test(text))) throw invalid('case_spoiler');
  let caseData: RoomCase | null = null;
  if (description !== null) {
    try { caseData = validateRoomCase(input.case, description); }
    catch (error) { throw invalid(error instanceof RoomCaseValidationError ? error.reason : 'invalid_case_schema'); }
  }
  // shortcut: lexical capability guard, replace only when a broader semantic contract is approved.
  const wantsPool = pool.test(suggestion);
  const wantsLighting = lighting.test(suggestion);
  if ((wantsPool && !unsupported.some(item => pool.test(item)))
    || (wantsLighting && !unsupported.some(item => lighting.test(item)))
    || ((wantsPool || wantsLighting) && !supportedSubset.test(suggestion) && input.outcome !== 'unsupported')) {
    throw new UnsupportedCapabilityError();
  }
  // Prose semantics remain model-dependent; local room metadata is authoritative.
  const common = { version: 2 as const, reply: input.reply, unsupported };
  if (input.outcome === 'unsupported') return { ...common, outcome: 'unsupported', description: null, case: null };
  return { ...common, outcome: input.outcome as 'supported' | 'partial', description: description!, case: caseData! };
}
