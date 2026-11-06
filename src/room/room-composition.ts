import { createProceduralRoom, getFurnishingEnvelope, layoutProceduralRoom, validateFurnishingPose, type RoomLayout } from './procedural-room.ts';
import { EMPTY_ROOM_PROPS, snapshotPropRequest, validatePropRequestInput, type RoomPropRequest, type RoomPropState, type RoomRenderIdentity } from './room-prop-request.ts';
import { stageRoomPropVisual, type RoomPropInstaller, type RoomPropVisual } from './room-prop-visual.ts';
import { validateRoomDescription, type RoomDescription } from './room-description.ts';
import { validateRoomInterpretationResult, UnsupportedCapabilityError, unsupportedCapabilityMessage, type RoomInterpretationResult, type PublicRoomInterpretation } from './room-interpretation-result.ts';
import { bindRoomCaseObjects, validateRoomCase, type RoomCase } from './room-case.ts';
import type { RoomInspectionBinding, RoomInspectionState } from './room-inspection.ts';
import { assessRoomHypothesis, assessRoomAccusation, snapshotHypothesis, snapshotInvestigation, type RoomInvestigationState, type LocalEvaStatement, type ModelEvaStatement, type EvaChallenge, type InvestigationDialogueReply } from './room-investigation.ts';
import { projectInvestigationNarratorContext, validateInvestigationNarrationRequest, validateInvestigationNarrationReply, investigationNarrationMessages, scriptedInvestigationReply, type InvestigationNarrationRequest, type InvestigationNarratorContext } from './investigation-narration.ts';

export type ComposedRoom = ReturnType<typeof createProceduralRoom>;
export type RoomInstaller = (room: ComposedRoom, inspection: RoomInspectionBinding, identity: RoomRenderIdentity) => boolean;
type AcceptedRoom = { description: RoomDescription; case: RoomCase; suggestion: string; seed: number };
export type RoomCompositionState = {
  status: 'idle' | 'interpreting' | 'building' | 'ready' | 'unsupported' | 'cancelled' | 'error';
  journey: {
    stage: 'invite' | 'interpret' | 'compose' | 'reveal' | 'investigate' | 'resolve';
    unit: symbol | null;
    operation: RoomCompositionState['status'];
    pendingReplacement: boolean;
  };
  narration: { unit: symbol; origin: 'local-script'; text: string } | null;
  narratorContext: InvestigationNarratorContext | null;
  dialogue: { unit: symbol; pending: boolean; reply: InvestigationDialogueReply | null } | null;
  interpretation: RoomInterpretationResult | null;
  pending: boolean;
  accepted: AcceptedRoom | null;
  displayed: AcceptedRoom | null;
  inspection: RoomInspectionState | null;
  investigation: RoomInvestigationState | null;
  reconstruction: { unit: symbol; revision: number; original: RoomLayout; current: RoomLayout } | null;
  props: RoomPropState;
  error: { code: keyof typeof messages; message: string } | null;
  cleanupError: string | null;
  disposed: boolean;
};

const messages = {
  invalid_input: 'Enter a nonempty suggestion of at most 2,000 characters and a uint32 seed.',
  network_error: 'The room interpretation endpoint could not be reached.',
  invalid_response: 'The endpoint did not return a valid bounded interpretation and reply.',
  unsupported_capability: unsupportedCapabilityMessage,
  interpretation_failed: 'Room interpretation failed; no replacement was installed.',
  disabled: 'Room interpretation is not enabled.',
  missing_key: 'The dedicated server-side interpretation key is not configured.',
  busy: 'Another room interpretation is already in progress.',
  budget_exhausted: 'The approved interpretation allowance is exhausted.',
  timeout: 'Interpretation timed out locally. Provider charges may still apply.',
  interpretation_refused: 'The provider declined this interpretation.',
  input_token_limit: 'The suggestion exceeds the approved input-token limit.',
  build_failed: 'The interpreted room could not be built safely; the displayed room is unchanged.',
  install_failed: 'The replacement was not installed; the displayed room is unchanged.',
  cleanup_failed: 'Room resource cleanup failed. Some resources may remain allocated.',
} as const;
class CompositionFailure extends Error {
  code: keyof typeof messages;
  constructor(code: keyof typeof messages) { super(messages[code]); this.code = code; }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
    promise.then(value => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) reject(signal.reason);
      else resolve(value);
    }, error => {
      signal.removeEventListener('abort', abort);
      reject(error);
    });
  });
}
function cancelBody(response: Response) {
  void response.body?.cancel().catch(() => {});
}
async function responseJson(response: Response, signal: AbortSignal): Promise<unknown> {
  if (signal.aborted) { cancelBody(response); throw signal.reason; }
  const limit = 16 * 1024;
  const type = response.headers.get('content-type');
  const length = response.headers.get('content-length');
  if (!type || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type.trim()) || !response.body
    || (length !== null && (!/^\d+$/.test(length) || Number(length) > limit))) {
    cancelBody(response);
    throw new CompositionFailure('invalid_response');
  }
  signal.throwIfAborted();
  const reader = response.body.getReader();
  let cancelled = false;
  const cancel = () => { if (!cancelled) { cancelled = true; void reader.cancel().catch(() => {}); } };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let complete = false;
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await abortable(reader.read(), signal);
      if (chunk.done) { complete = true; break; }
      bytes += chunk.value.byteLength;
      if (bytes > limit || chunks.length >= limit) throw new CompositionFailure('invalid_response');
      chunks.push(chunk.value);
    }
    signal.throwIfAborted();
    if (length !== null && Number(length) !== bytes) throw new CompositionFailure('invalid_response');
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    throw error instanceof CompositionFailure ? error : new CompositionFailure('invalid_response');
  } finally {
    signal.removeEventListener('abort', cancel);
    if (!complete) cancel();
    reader.releaseLock();
  }
}
async function interpret(fetch: typeof globalThis.fetch, suggestion: string, signal: AbortSignal) {
  let received: Response | undefined;
  try {
    signal.throwIfAborted();
    const pending = fetch('/api/compose-room', {
      method: 'POST', credentials: 'same-origin', redirect: 'error', cache: 'no-store', signal,
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ suggestion }),
    }).then(response => {
      received = response;
      if (signal.aborted) { cancelBody(response); throw signal.reason; }
      return response;
    });
    const response = await abortable(pending, signal);
    signal.throwIfAborted();
    const data = await responseJson(response, signal);
    signal.throwIfAborted();
    if (!response.ok) {
      const code = record(data) ? data.error : undefined;
      switch (code) {
        case 'disabled': case 'missing_key': case 'busy': case 'budget_exhausted':
        case 'timeout': case 'interpretation_refused': case 'input_token_limit': case 'unsupported_capability':
          throw new CompositionFailure(code);
        default: throw new CompositionFailure('interpretation_failed');
      }
    }
    try { return validateRoomInterpretationResult(data, suggestion); }
    catch (error) { throw new CompositionFailure(error instanceof UnsupportedCapabilityError ? 'unsupported_capability' : 'invalid_response'); }
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    throw error instanceof CompositionFailure ? error : new CompositionFailure('network_error');
  } finally {
    if (received && signal.aborted) cancelBody(received);
  }
}

class NarrationFailure extends Error {
  code: keyof typeof investigationNarrationMessages;
  constructor(code: keyof typeof investigationNarrationMessages) { super(investigationNarrationMessages[code]); this.code = code; }
}
async function narrate(fetch: typeof globalThis.fetch, input: InvestigationNarrationRequest, signal: AbortSignal) {
  let received: Response | undefined;
  try {
    signal.throwIfAborted();
    const pending = fetch('/api/investigation-narration', {
      method: 'POST', credentials: 'same-origin', redirect: 'error', cache: 'no-store', signal,
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
    }).then(response => {
      if (signal.aborted) { cancelBody(response); throw signal.reason; }
      received = response;
      return response;
    });
    const response = await abortable(pending, signal).catch(error => {
      if (received) cancelBody(received);
      throw error;
    });
    const data = await responseJson(response, signal);
    signal.throwIfAborted();
    if (!response.ok) {
      const code = record(data) ? data.error : undefined;
      throw new NarrationFailure(typeof code === 'string' && Object.hasOwn(investigationNarrationMessages, code)
        ? code as keyof typeof investigationNarrationMessages : 'narration_failed');
    }
    try { return validateInvestigationNarrationReply(data, input.context); }
    catch { throw new NarrationFailure('invalid_response'); }
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    throw error instanceof NarrationFailure ? error : new NarrationFailure(error instanceof CompositionFailure ? 'invalid_response' : 'network_error');
  }
}

// This formatter receives public investigation records and discoveries, never the hidden case.
function publicNarration(investigation: RoomInvestigationState, discoveries: RoomInspectionState['discoveredClues']): NonNullable<RoomCompositionState['narration']> {
  const { unit, candidates, hypothesis, resolution } = investigation;
  const statement = investigation.statements.at(-1);
  const challenge = investigation.challenges.at(-1);
  const parts = ['Local/scripted case summary. EVA statements are not evidence or proof. This is not live model reasoning.'];
  if (statement) parts.push(statement.origin === 'model' ? `Model-proposed statement ${statement.id}: ${statement.text}` : statement.text);
  if (resolution) parts.push(`Local-rule accusation outcome: ${resolution.status}. ${resolution.explanation}`);
  parts.push(`Public candidates: ${candidates.map(candidate => `${candidate.id}, ${candidate.badge} badge, ${candidate.fabric}`).join('; ')}.`);
  parts.push(discoveries.length ? `Discovered annotations: ${discoveries.map(clue => `${clue.id}: ${clue.text}`).join(' ')}` : 'No clues discovered.');
  if (hypothesis) parts.push(`Visitor hypothesis: ${hypothesis.candidateId}. Local-rule assessment at proposal: ${hypothesis.assessment.status}; not proof. Cited ${hypothesis.clueIds.join(', ') || 'none'}.`);
  if (challenge) parts.push(`Visitor challenge to ${challenge.statementId}. Local-rule assessment at challenge: ${challenge.assessment.status}; not proof. Cited ${challenge.clueIds.join(', ') || 'none'}.`);
  for (let index = investigation.history.length - 1; index >= 0; index -= 1) {
    const entry = investigation.history[index];
    if (entry.kind === 'reconstruction-edit') {
      parts.push(`Visitor reconstruction revision ${entry.revision}: furnishing ${entry.furnishingIndex + 1}, x ${entry.after.x}, z ${entry.after.z}, rotation ${entry.after.rotation}. Case facts unchanged.`);
      break;
    }
  }
  return { unit, origin: 'local-script', text: parts.join(' ').slice(0, 2000) };
}

type OwnedRoom = { room: ComposedRoom; accepted: AcceptedRoom; released: boolean };

export function createRoomCompositionController(options: {
  onStatus?: (state: RoomCompositionState) => void;
  fetch?: typeof globalThis.fetch;
  build?: (description: RoomDescription, seed: number) => ComposedRoom | Promise<ComposedRoom>;
  yieldToBuild?: () => Promise<void>;
} = {}) {
  const fetch = options.fetch ?? globalThis.fetch;
  const build = options.build ?? createProceduralRoom;
  const yieldToBuild = options.yieldToBuild ?? (() => new Promise<void>(resolve => setTimeout(resolve, 0)));
  let status: RoomCompositionState['status'] = 'idle';
  let error: keyof typeof messages | null = null;
  let cleanupError: string | null = null;
  let interpretation: RoomInterpretationResult | null = null;
  let accepted: AcceptedRoom | null = null;
  let displayed: AcceptedRoom | null = null;
  let inspection: RoomInspectionState | null = null;
  let investigation: RoomInvestigationState | null = null;
  let dialogue: RoomCompositionState['dialogue'] = null;
  let activeQuestion: AbortController | null = null;
  let statementSequence = 0;
  let reconstruction: RoomCompositionState['reconstruction'] = null;
  let props: RoomPropState = { ...EMPTY_ROOM_PROPS };
  let activePropRequest: RoomPropRequest | null = null;
  let activePropInstall: { request: RoomPropRequest; operation: AbortController } | null = null;
  let propGeneration = 0;
  let pending: OwnedRoom | null = null;
  let active: AbortController | null = null;
  let disposed = false;
  let transitioning = false;
  const snapshot = (value: AcceptedRoom | null) => value && ({ description: validateRoomDescription(value.description),
    case: validateRoomCase(value.case, value.description), suggestion: value.suggestion, seed: value.seed });
  const getState = (): RoomCompositionState => ({
    status, interpretation: interpretation && validateRoomInterpretationResult(interpretation),
    journey: {
      stage: investigation ? investigation.resolution?.status === 'resolved' ? 'resolve' : 'investigate'
        : status === 'interpreting' ? 'interpret' : status === 'building' ? 'compose' : pending ? 'reveal' : 'invite',
      unit: investigation?.unit ?? null,
      operation: status,
      pendingReplacement: displayed !== null && (status === 'interpreting' || status === 'building' || pending !== null),
    },
    narration: !disposed && investigation && inspection ? publicNarration(investigation, inspection.discoveredClues) : null,
    narratorContext: !disposed && investigation && inspection ? projectInvestigationNarratorContext(investigation, inspection.discoveredClues) : null,
    dialogue: !disposed && dialogue ? { ...dialogue, reply: dialogue.reply && structuredClone(dialogue.reply) } : null,
    pending: pending !== null, accepted: snapshot(accepted), displayed: snapshot(displayed),
    inspection: inspection && { ...inspection, objects: inspection.objects.map(item => ({ ...item })),
      discoveredClues: inspection.discoveredClues.map(item => ({ ...item })) },
    investigation: investigation && snapshotInvestigation(investigation),
    reconstruction: reconstruction && { ...reconstruction, original: structuredClone(reconstruction.original), current: structuredClone(reconstruction.current) },
    props: { ...props, request: props.request && snapshotPropRequest(props.request) },
    error: error === null ? null : { code: error, message: messages[error] }, cleanupError, disposed,
  });
  let onStatus = options.onStatus;
  const notify = () => onStatus?.(getState());
  const update = (next: RoomCompositionState['status'], failure: keyof typeof messages | null = null) => {
    status = next;
    error = failure;
    notify();
  };
  function release(owned: OwnedRoom) {
    if (owned.released) return true;
    // Mark before disposal: a throwing/reentrant cleanup must never be retried.
    owned.released = true;
    try { owned.room.dispose(); return true; }
    catch { cleanupError = messages.cleanup_failed; return false; }
  }
  function discardPending() {
    const owned = pending;
    pending = null;
    return !owned || release(owned);
  }
  function cancelQuestion() {
    const operation = activeQuestion;
    activeQuestion = null;
    if (dialogue) dialogue = { ...dialogue, pending: false };
    operation?.abort();
  }
  function isPropRequestCurrent(request: unknown): request is RoomPropRequest {
    const owned = activePropRequest;
    return !disposed && !transitioning && owned !== null && request === owned && displayed !== null
      && investigation?.unit === owned.owner.unit && reconstruction?.unit === owned.owner.unit
      && reconstruction.revision === owned.owner.revision && propGeneration === owned.owner.generation
      && displayed.case.objects.some(item => item.id === owned.owner.objectId);
  }
  function rejectPropRequest(reason: NonNullable<RoomPropState['reason']>): null {
    props = { ...props, phase: 'rejected', request: null, reason };
    notify();
    return null;
  }
  function preparePropRequest(unit: symbol, expectedRevision: number, input: unknown): RoomPropRequest | null {
    if (disposed || transitioning || activePropRequest) return null;
    if (!displayed || !investigation || !reconstruction || investigation.unit !== unit
      || reconstruction.unit !== unit || reconstruction.revision !== expectedRevision) return rejectPropRequest('stale_owner');
    if (props.remainingRequests <= 0 || propGeneration === Number.MAX_SAFE_INTEGER) return rejectPropRequest('limit_reached');
    let request: RoomPropRequest | null = null;
    let failure: NonNullable<RoomPropState['reason']> = 'invalid_request';
    transitioning = true;
    try {
      const selected = validatePropRequestInput(input);
      const object = displayed.case.objects.find(item => item.id === selected.objectId);
      if (!object) failure = 'unavailable_object';
      else {
        const envelope = getFurnishingEnvelope(reconstruction.current, object.furnishingIndex);
        const furnishing = reconstruction.current.furnishings[object.furnishingIndex];
        // Only visual is public provider data; local ownership and placement never come from a provider.
        request = Object.freeze({
          owner: Object.freeze({ unit, objectId: object.id, generation: propGeneration + 1, revision: expectedRevision }),
          visual: Object.freeze({ kind: furnishing.kind, color: furnishing.color, description: selected.description }),
          envelope: Object.freeze(envelope),
        });
      }
    } catch { /* Reject malformed input or an invalid envelope without exposing supplied data. */ }
    finally { transitioning = false; }
    if (disposed) return null;
    if (!request) return rejectPropRequest(failure);
    activePropRequest = request;
    propGeneration = request.owner.generation;
    props = { ...props, phase: 'prepared', request, remainingRequests: props.remainingRequests - 1, reason: null };
    notify();
    return isPropRequestCurrent(request) ? request : null;
  }
  function invalidatePropRequest(phase: 'cancelled' | 'stale', reason: NonNullable<RoomPropState['reason']>) {
    if (!activePropRequest) return false;
    const loading = activePropInstall;
    activePropRequest = null;
    activePropInstall = null;
    props = { ...props, phase, reason };
    loading?.operation.abort();
    return true;
  }
  async function installProp(request: RoomPropRequest, bytes: ArrayBuffer, install: RoomPropInstaller, options?: unknown): Promise<boolean> {
    // Only exactly {caseColor: true} is accepted; the colour itself always comes from the exact request.
    let caseColor = false;
    if (options !== undefined) {
      const entry = options && typeof options === 'object' && Object.getPrototypeOf(options) === Object.prototype
        && Reflect.ownKeys(options).length === 1 ? Object.getOwnPropertyDescriptor(options, 'caseColor') : undefined;
      if (!entry?.enumerable || !('value' in entry) || entry.value !== true) return false;
      caseColor = true;
    }
    if (!isPropRequestCurrent(request) || activePropInstall) return false;
    const loading = { request, operation: new AbortController() };
    activePropInstall = loading;
    const current = () => activePropInstall === loading && !loading.operation.signal.aborted && isPropRequestCurrent(request);
    const warnCleanup = () => {
      cleanupError = messages.cleanup_failed;
      if (!disposed) notify();
    };
    let visual: RoomPropVisual | undefined;
    let installed = false;
    let phase: 'admitting' | 'installing' = 'admitting';
    const finish = (success: boolean) => {
      if (!current()) return;
      activePropRequest = null;
      activePropInstall = null;
      props = { ...props, phase: success ? 'installed' : 'failed', reason: success ? null : phase === 'admitting' ? 'admission_failed' : 'install_failed' };
      notify();
    };
    try {
      props = { ...props, phase, reason: null };
      notify();
      if (!current()) return false;
      visual = await stageRoomPropVisual(bytes, request.envelope, loading.operation.signal, warnCleanup,
        caseColor ? request.visual.color : undefined);
      if (!current()) return false;
      phase = 'installing';
      props = { ...props, phase };
      notify();
      if (!current()) return false;
      // The display rechecks authority after its preview draw, before transferring ownership.
      installed = install(request, visual, current) === true;
      finish(installed);
      return installed;
    } catch {
      finish(false);
      return installed;
    } finally {
      if (!installed && visual) { try { visual.dispose(); } catch { warnCleanup(); } }
      if (activePropInstall === loading) activePropInstall = null;
      loading.operation.abort();
    }
  }
  // Client generation stages before installProp: exact current request, strictly forward; 'failed' retires it without refund.
  const generationStages = ['prepared', 'reference-image', 'mesh', 'retrieving'] as const;
  function advancePropRequest(request: RoomPropRequest, next: 'reference-image' | 'mesh' | 'retrieving' | 'failed') {
    if (activePropInstall || !isPropRequestCurrent(request)) return false;
    if (next === 'failed') {
      activePropRequest = null;
      props = { ...props, phase: 'failed', reason: 'generation_failed' };
    } else {
      const from = generationStages.indexOf(props.phase as typeof generationStages[number]);
      const to = generationStages.indexOf(next);
      if (from < 0 || to <= from) return false;
      props = { ...props, phase: next, reason: null };
    }
    notify();
    return true;
  }
  function cancelPropRequest() {
    if (disposed || transitioning || !invalidatePropRequest('cancelled', 'stopped')) return false;
    notify();
    return true;
  }
  function stop() {
    if (transitioning || (!active && !pending && !activeQuestion && !activePropRequest)) return false;
    transitioning = true;
    const composing = active !== null || pending !== null;
    const operation = active;
    active = null;
    invalidatePropRequest('cancelled', 'stopped');
    cancelQuestion();
    operation?.abort();
    const cleaned = discardPending();
    transitioning = false;
    if (composing) update(cleaned ? 'cancelled' : 'error', cleaned ? null : 'cleanup_failed');
    else notify();
    return true;
  }
  function getInvestigationSpeech(unit: symbol) {
    if (disposed || transitioning || activeQuestion || !displayed || !inspection || !investigation || investigation.unit !== unit
      || !dialogue || dialogue.unit !== unit || dialogue.pending || !dialogue.reply) return null;
    return { unit, origin: dialogue.reply.origin, text: dialogue.reply.text };
  }
  async function askInvestigationQuestion(unit: symbol, question: string): Promise<boolean> {
    if (disposed || transitioning || activeQuestion || !displayed || !inspection || !investigation || investigation.unit !== unit || !dialogue) return false;
    let input: InvestigationNarrationRequest;
    try { input = validateInvestigationNarrationRequest({ version: 1, question, context: projectInvestigationNarratorContext(investigation, inspection.discoveredClues) }); }
    catch { return false; }
    const target = investigation;
    const operation = new AbortController();
    const { signal } = operation;
    activeQuestion = operation;
    dialogue = { ...dialogue, pending: true };
    target.history.push({ kind: 'question', origin: 'visitor', question: input.question });
    const current = () => !disposed && activeQuestion === operation && investigation === target && dialogue?.unit === unit;
    const timer = setTimeout(() => operation.abort(new NarrationFailure('timeout')), 30000);
    try {
      notify();
      if (!current() || signal.aborted) return false;
      let reply: InvestigationDialogueReply;
      try {
        const proposed = await narrate(fetch, input, signal);
        if (!current() || signal.aborted) return false;
        reply = { origin: 'model', question: input.question, text: proposed.reply, kind: proposed.kind,
          candidateId: proposed.candidateId, clueIds: [...proposed.clueIds], reason: null };
      } catch (error) {
        if (!current() || (signal.aborted && !(signal.reason instanceof NarrationFailure && signal.reason.code === 'timeout'))) return false;
        reply = { origin: 'local-script', question: input.question, text: scriptedInvestigationReply, kind: 'reflection',
          candidateId: null, clueIds: [], reason: error instanceof NarrationFailure ? error.code : 'narration_failed' };
      }
      activeQuestion = null;
      dialogue = { unit, pending: false, reply };
      target.history.push({ kind: 'reply', origin: reply.origin, reply: structuredClone(reply) });
      if (reply.origin === 'model' && reply.kind === 'suspicion' && reply.candidateId !== null) {
        const statement: ModelEvaStatement = { id: `statement-${++statementSequence}`, origin: 'model', candidateId: reply.candidateId,
          text: reply.text, clueIds: [...reply.clueIds] };
        target.statements.push(statement);
        target.history.push({ kind: 'statement', origin: 'model', statement: structuredClone(statement) });
      }
      notify();
      return true;
    } finally {
      clearTimeout(timer);
      if (activeQuestion === operation) {
        activeQuestion = null;
        if (dialogue?.unit === unit) dialogue = { ...dialogue, pending: false };
      }
      operation.abort();
    }
  }
  async function compose(suggestion: string, seed: number, onInterpretation?: (result: PublicRoomInterpretation) => void): Promise<boolean> {
    if (disposed || active || transitioning) return false;
    if (typeof suggestion !== 'string' || !suggestion.trim() || suggestion.trim().length > 2000
      || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
      update('error', 'invalid_input');
      return false;
    }
    const selected = suggestion.trim();
    const operation = new AbortController();
    const { signal } = operation;
    active = operation;
    transitioning = true;
    try { cancelQuestion(); } finally { transitioning = false; }
    let built: OwnedRoom | undefined;
    const current = () => !disposed && active === operation && !signal.aborted;
    const check = () => { if (!current()) throw new DOMException('Composition cancelled.', 'AbortError'); };
    try {
      if (!discardPending()) throw new CompositionFailure('cleanup_failed');
      check();
      interpretation = null;
      accepted = null;
      update('interpreting');
      check();
      const result = await interpret(fetch, selected, signal);
      check();
      const publicResult = (): PublicRoomInterpretation => ({ reply: result.reply, outcome: result.outcome, unsupported: [...result.unsupported] });
      if (result.outcome === 'unsupported') {
        interpretation = result;
        onInterpretation?.(publicResult());
        check();
        active = null;
        update('unsupported');
        return false;
      }
      const description = result.description;
      const metadata: AcceptedRoom = { description, case: result.case, suggestion: selected, seed };
      update('building');
      check();
      await abortable(yieldToBuild(), signal);
      check();
      const building = Promise.resolve().then(() => {
        check();
        return build(validateRoomDescription(description), seed);
      }).then(room => {
        built = { room, accepted: metadata, released: false };
        if (!current()) {
          if (!release(built)) notify();
          check();
        }
        return built;
      });
      built = await abortable(building, signal);
      check();
      if (built.room.layout.seed !== seed) throw new CompositionFailure('build_failed');
      bindRoomCaseObjects(metadata.case, description, built.room);
      check();
      interpretation = result;
      accepted = metadata;
      onInterpretation?.(publicResult());
      check();
      pending = built;
      active = null;
      update('ready');
      return pending === built;
    } catch (failure) {
      if (current()) {
        active = null;
        update('error', failure instanceof CompositionFailure ? failure.code : status === 'building' ? 'build_failed' : 'network_error');
      }
      return false;
    } finally {
      if (active === operation) active = null;
      // Covers cancellation between build completion and the awaiting continuation.
      if (built && built !== pending && !release(built)) notify();
    }
  }
  function inspect(unit: symbol, objectId: string) {
    if (disposed || transitioning || !displayed || !inspection || inspection.unit !== unit || !investigation
      || !inspection.objects.some(item => item.id === objectId)) return false;
    if (inspection.selectedObjectId === objectId) return true;
    inspection.selectedObjectId = objectId;
    const discovered = new Set(inspection.discoveredClues.map(item => item.id));
    const clueIds: string[] = [];
    for (const clue of displayed.case.clues) {
      if (clue.objectId !== objectId || discovered.has(clue.id)) continue;
      inspection.discoveredClues.push({ id: clue.id, objectId,
        text: `Fictional text-only annotation: ${clue.trait} ${clue.relation === 'matches' ? 'matches' : 'differs from'} ${clue.value}.` });
      clueIds.push(clue.id);
    }
    investigation.history.push({ kind: 'inspection', origin: 'visitor', objectId, clueIds });
    notify();
    return true;
  }
  function discoveredEvidence(input: unknown) {
    if (!displayed || !inspection || !Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype
      || input.length > inspection.discoveredClues.length || Reflect.ownKeys(input).length !== input.length + 1) return null;
    const caseData = displayed.case;
    const discoveredIds = inspection.discoveredClues.map(item => item.id);
    const clueIds: string[] = [];
    for (let index = 0; index < input.length; index += 1) {
      const entry = Object.getOwnPropertyDescriptor(input, String(index));
      if (!entry?.enumerable || !('value' in entry) || typeof entry.value !== 'string'
        || !discoveredIds.includes(entry.value) || clueIds.includes(entry.value)) return null;
      clueIds.push(entry.value);
    }
    return { clueIds, clues: discoveredIds.map(id => caseData.clues.find(clue => clue.id === id)!) };
  }
  function proposeHypothesis(unit: symbol, candidateId: string, clueIds: string[]) {
    if (disposed || transitioning || !displayed || !inspection || !investigation || investigation.unit !== unit) return false;
    const candidate = displayed.case.candidates.find(item => item.id === candidateId);
    const evidence = discoveredEvidence(clueIds);
    if (!candidate || !evidence) return false;
    // Assessment uses every discovery, not just the visitor's selected citations.
    const hypothesis = { revision: (investigation.hypothesis?.revision ?? 0) + 1, candidateId, clueIds: evidence.clueIds,
      assessment: assessRoomHypothesis(candidate, evidence.clues) };
    investigation.hypothesis = hypothesis;
    investigation.history.push({ kind: 'hypothesis', origin: 'visitor', hypothesis: snapshotHypothesis(hypothesis) });
    notify();
    return true;
  }
  function recordLocalEvaStatement(unit: symbol, candidateId: string) {
    if (disposed || transitioning || !displayed || !investigation || investigation.unit !== unit
      || !investigation.candidates.some(candidate => candidate.id === candidateId)) return false;
    const statement: LocalEvaStatement = { id: `statement-${++statementSequence}`, origin: 'local-script', candidateId,
      text: `Local/scripted EVA: I suspect ${candidateId}.` };
    investigation.statements.push(statement);
    investigation.history.push({ kind: 'statement', origin: 'local-script', statement: { ...statement } });
    notify();
    return true;
  }
  function challengeEvaStatement(unit: symbol, statementId: string, clueIds: string[]) {
    if (disposed || transitioning || !displayed || !investigation || investigation.unit !== unit) return false;
    const statement = investigation.statements.find(item => item.id === statementId);
    const candidate = displayed.case.candidates.find(item => item.id === statement?.candidateId);
    const evidence = discoveredEvidence(clueIds);
    if (!statement || !candidate || !evidence) return false;
    const challenge: EvaChallenge = { origin: 'visitor', statementId, clueIds: evidence.clueIds,
      assessment: assessRoomHypothesis(candidate, evidence.clueIds.length ? evidence.clues : []) };
    investigation.challenges.push(challenge);
    investigation.history.push({ kind: 'challenge', origin: 'visitor', challenge: structuredClone(challenge) });
    notify();
    return true;
  }
  function accuse(unit: symbol, candidateId: string, clueIds: string[]) {
    if (disposed || transitioning || !displayed || !investigation || investigation.unit !== unit || investigation.resolution?.status === 'resolved') return false;
    const candidate = displayed.case.candidates.find(item => item.id === candidateId);
    const evidence = discoveredEvidence(clueIds);
    if (!candidate || !evidence) return false;
    const result = assessRoomAccusation(displayed.case.candidates, candidate, evidence.clues, evidence.clueIds);
    investigation.resolution = result;
    investigation.history.push({ kind: 'accusation', origin: 'visitor', result: structuredClone(result) });
    notify();
    return true;
  }
  function applyReconstructionEdit(unit: symbol, expectedRevision: number, furnishingIndex: number, input: unknown,
    install: RoomInstaller) {
    if (disposed || transitioning || !displayed || !inspection || !investigation || !reconstruction
      || reconstruction.unit !== unit || reconstruction.revision !== expectedRevision
      || !Number.isInteger(furnishingIndex) || furnishingIndex < 0 || furnishingIndex >= reconstruction.current.furnishings.length) return false;
    let built: OwnedRoom | undefined;
    transitioning = true;
    try {
      const after = validateFurnishingPose(input);
      const poses = reconstruction.current.furnishings.map(({ x, z, rotation }) => ({ x, z, rotation }));
      const before = poses[furnishingIndex];
      if (before.x === after.x && before.z === after.z && before.rotation === after.rotation) return false;
      poses[furnishingIndex] = after;
      built = { room: createProceduralRoom(displayed.description, displayed.seed, poses), accepted: displayed, released: false };
      const bindings = bindRoomCaseObjects(displayed.case, displayed.description, built.room);
      const bindingUnit = Symbol('edited room bindings');
      const current = structuredClone(built.room.layout);
      const revision = reconstruction.revision + 1;
      if (install(built.room, { unit: bindingUnit, bindings }, { unit: reconstruction.unit, revision }) !== true) return false;
      built.released = true;
      reconstruction = { ...reconstruction, revision, current };
      inspection = { ...inspection, unit: bindingUnit };
      invalidatePropRequest('stale', 'reconstruction_changed');
      investigation.history.push({ kind: 'reconstruction-edit', origin: 'visitor', revision, furnishingIndex, before, after });
    } catch { return false; }
    finally {
      const cleaned = !built || built.released || release(built);
      transitioning = false;
      if (!cleaned) notify();
    }
    notify();
    return true;
  }
  // The installer must retain the old scene on false/throw and own disposal after true.
  function reveal(install: RoomInstaller) {
    if (disposed || transitioning || active || !pending) return false;
    const owned = pending;
    pending = null;
    transitioning = true;
    let installed = false;
    let nextInspection: RoomInspectionState | null = null;
    let nextInvestigation: RoomInvestigationState | null = null;
    let nextReconstruction: RoomCompositionState['reconstruction'] = null;
    let failure: keyof typeof messages | null = null;
    try {
      if (owned.room.layout.seed !== owned.accepted.seed) throw new CompositionFailure('install_failed');
      const bindings = bindRoomCaseObjects(owned.accepted.case, owned.accepted.description, owned.room);
      const unit = Symbol('displayed room case');
      nextInspection = { unit, selectedObjectId: null, discoveredClues: [], objects: owned.accepted.case.objects.map(item => {
        const furnishing = owned.accepted.description.furnishings[item.furnishingIndex];
        return { id: item.id, label: `${furnishing.color} ${furnishing.kind} ${item.furnishingIndex + 1}` };
      }) };
      nextInvestigation = { unit, candidates: owned.accepted.case.candidates.map(candidate => ({ ...candidate })),
        hypothesis: null, statements: [], challenges: [], resolution: null, history: [] };
      const layout = layoutProceduralRoom(owned.accepted.description, owned.accepted.seed,
        owned.room.layout.furnishings.map(({ x, z, rotation }) => ({ x, z, rotation })));
      nextReconstruction = { unit, revision: 0, original: layout, current: structuredClone(layout) };
      installed = install(owned.room, { unit, bindings }, { unit, revision: 0 }) === true;
    }
    catch { /* Failed installation retains controller ownership. */ }
    // Installation is synchronous/atomic; a reentrant stop cannot undo its transfer.
    if (installed) {
      owned.released = true;
      displayed = owned.accepted;
      inspection = nextInspection;
      investigation = nextInvestigation;
      reconstruction = nextReconstruction;
      const loading = activePropInstall;
      activePropRequest = null;
      activePropInstall = null;
      props = { ...EMPTY_ROOM_PROPS };
      loading?.operation.abort();
      dialogue = nextInvestigation ? { unit: nextInvestigation.unit, pending: false, reply: null } : null;
      cancelQuestion();
    } else {
      failure = release(owned) ? 'install_failed' : 'cleanup_failed';
    }
    transitioning = false;
    update(installed ? 'idle' : 'error', failure);
    return installed;
  }
  function reset() {
    if (disposed || transitioning) return false;
    transitioning = true;
    const operation = active;
    const owned = pending;
    const propOperation = activePropInstall;
    activePropInstall = null;
    active = null;
    pending = null;
    interpretation = null;
    accepted = null;
    displayed = null;
    inspection = null;
    investigation = null;
    dialogue = null;
    reconstruction = null;
    activePropRequest = null;
    props = { ...EMPTY_ROOM_PROPS };
    status = 'idle';
    error = null;
    // Clear visitor data before abort/disposal can call back; cleanup warnings remain operational facts.
    try {
      cancelQuestion();
      propOperation?.operation.abort();
      operation?.abort();
      if (owned) release(owned);
    } finally { transitioning = false; }
    notify();
    return true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    invalidatePropRequest('cancelled', 'disposed');
    dialogue = null;
    cancelQuestion();
    try { if (!transitioning && !stop()) notify(); }
    finally { onStatus = undefined; }
  }
  return { compose, stop, reset, reveal, inspect, getInvestigationSpeech, askInvestigationQuestion, proposeHypothesis, recordLocalEvaStatement, challengeEvaStatement, accuse, applyReconstructionEdit, preparePropRequest, isPropRequestCurrent, advancePropRequest, installProp, cancelPropRequest, dispose, getState };
}
