import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import { conversationReducer, initialConversationState } from './conversation/conversation.ts';
import { evaPersona, presentReply } from './conversation/fixture.ts';
import FixtureRoom, { type RoomViewInstaller } from './room/FixtureRoom.tsx';
import { EMPTY_VENUE_FIELDS, type VenueFields } from './room/CameraTracking.tsx';
import { createRoomCompositionController, type RoomCompositionState } from './room/room-composition.ts';
import { EMPTY_ROOM_PROPS, type RoomPropRequest, type RoomPropState } from './room/room-prop-request.ts';
import { paintUnsubmittedCodes, readRoomPaintStatus, runRoomPaint } from './room/room-paint-client.ts';
import { readPropGenerationStatus, runPropGeneration, type PropGenerationResult, type PropGenerationStatus, type PropRouteStatus } from './room/prop-generation-client.ts';
import { roomCasePremise } from './room/room-case.ts';
import { investigationNarrationMessages } from './room/investigation-narration.ts';
import { createSpeechController, EMPTY_SPEECH, readSpeechAvailability, type SpeechAvailability, type SpeechState } from './speech/speech.ts';
import { createBrowserSpeechResources } from './speech/browser-speech.ts';

const speechStatusText: Record<SpeechState['phase'], string> = {
  idle: 'Speech stopped. Microphone off.',
  connecting: 'Preparing microphone and speech connection. Permission may be pending; Stop speech cancels.',
  listening: 'Microphone active. Finish dictation to request final text, or Stop speech to discard.',
  committing: 'Microphone off. Awaiting final transcription; your draft is unchanged until it arrives.',
  loading: 'Microphone off. Requesting paid voice synthesis; no new reasoning is requested.',
  speaking: 'Microphone off. Playing provider-synthesized audio.',
  error: 'Speech stopped. Text and manual controls remain available.',
};
const speechAvailabilityText: Record<SpeechAvailability['phase'], string> = {
  unchecked: 'Not checked for this visitor. Choose Check speech status.',
  checking: 'Checking the local speech server…',
  ready: 'Speech server configured. Provider account, voice and logging-disabled entitlement are not verified by this check.',
  disabled: 'Speech is disabled. Text remains available.',
  privacy_unconfirmed: 'Operator confirmation of logging-disabled entitlement is missing.',
  missing_key: 'Dedicated server-side speech key is not configured.',
  missing_voice: 'No valid voice is configured; there is no default voice.',
  busy: 'Speech server is busy. Check again after it finishes.',
  budget_exhausted: 'Shared three-attempt speech allowance exhausted.',
  unreachable: 'Speech status could not be reached or validated.',
};

const statusText = {
  idle: 'Ready for your words',
  thinking: 'Awaiting shared interpretation',
  speaking: 'Presenting accepted text (not audio)',
  interrupted: 'Reply interrupted',
};

type CompositionController = ReturnType<typeof createRoomCompositionController>;
type Installer = RoomViewInstaller;
type Availability = {
  phase: 'unchecked' | 'checking' | 'ready' | 'disabled' | 'missing_key' | 'busy' | 'budget_exhausted' | 'unreachable';
  remaining: number | null;
};
const availabilityText = {
  unchecked: 'Not checked for this visitor. Choose Check status before composing.',
  checking: 'Checking interpreter availability…',
  ready: 'Interpreter available: Opus 5.5. Compose is paid.',
  disabled: 'Room interpretation is not enabled.',
  missing_key: 'Dedicated server-side interpretation key is not configured.',
  busy: 'Interpreter is busy. Check again after it finishes.',
  budget_exhausted: 'Approved interpretation allowance is exhausted.',
  unreachable: 'Interpreter unavailable: status could not be reached or validated.',
};
const compositionText = {
  idle: 'No composition in progress.',
  interpreting: 'Interpreting the selected suggestion… Current room held.',
  building: 'Building the validated room… Current room held.',
  ready: 'New room ready. Reveal it explicitly; current room held.',
  unsupported: 'No supported room was proposed. Nothing built or pending reveal; current room held.',
  cancelled: 'Composition cancelled. Current room held; provider charges may still apply.',
  error: 'Composition failed. No replacement installed.',
};
const journeyText = {
  invite: 'Invite',
  interpret: 'Interpret',
  compose: 'Compose',
  reveal: 'Ready to reveal',
  investigate: 'Investigate / edit / challenge',
  resolve: 'Resolved by local rules',
};
const journeyGuidance = {
  invite: 'Write a suggestion. Send keeps it locally; Compose requests a paid interpretation when the interpreter is available. The fixture is a manual preview, not a generated case.',
  interpret: 'Awaiting a validated interpretation. Stop composition cancels this attempt; no new room is displayed.',
  compose: 'Building the validated proposal locally. You can Stop composition; no new room is displayed yet.',
  reveal: 'Choose Reveal composed room to begin investigating, or Stop composition to discard the pending room.',
  investigate: 'Inspect objects for clues. Propose a hypothesis, edit the reconstruction, or challenge a local/scripted statement. An accusation needs independent discovered evidence.',
  resolve: 'Resolution is recorded from cited evidence. Inspection and edits remain available. Compose requests a replacement case, not a visitor-session reset.',
};
const EMPTY_COMPOSITION: RoomCompositionState = {
  status: 'idle', journey: { stage: 'invite', unit: null, operation: 'idle', pendingReplacement: false },
  props: { ...EMPTY_ROOM_PROPS },
  narration: null, narratorContext: null, dialogue: null, interpretation: null, pending: false, accepted: null, displayed: null, inspection: null, investigation: null, reconstruction: null, error: null, cleanupError: null, disposed: false,
};

async function readAvailability(signal: AbortSignal): Promise<Availability> {
  let response: Response | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let complete = false;
  const cancel = () => { void reader?.cancel().catch(() => {}); };
  try {
    response = await fetch('/api/compose-room', { method: 'GET', credentials: 'same-origin', redirect: 'error', cache: 'no-store', signal });
    signal.throwIfAborted();
    const length = response.headers.get('content-length');
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get('content-type')?.trim() ?? '')
      || !response.body || (length !== null && (!/^\d+$/.test(length) || Number(length) > 4096))) throw new Error('Invalid status.');
    reader = response.body.getReader();
    signal.addEventListener('abort', cancel, { once: true });
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) { complete = true; break; }
      bytes += chunk.value.byteLength;
      if (bytes > 4096 || chunks.length >= 4096) throw new Error('Invalid status.');
      chunks.push(chunk.value);
    }
    if (length !== null && Number(length) !== bytes) throw new Error('Invalid status.');
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    const data: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid status.');
    const value = data as Record<string, unknown>;
    if (Object.keys(value).length !== 4 || !['available', 'reason', 'model', 'remainingRequests'].every(key => Object.hasOwn(value, key))
      || value.model !== 'claude-opus-5-5' || typeof value.remainingRequests !== 'number'
      || !Number.isInteger(value.remainingRequests) || value.remainingRequests < 0 || value.remainingRequests > 3) throw new Error('Invalid status.');
    const remaining = value.remainingRequests;
    if (value.available === true && value.reason === null && response.status === 200 && remaining > 0) return { phase: 'ready', remaining };
    if (value.available === false) {
      switch (value.reason) {
        case 'disabled': case 'missing_key':
          if (response.status === 503) return { phase: value.reason, remaining };
          break;
        case 'busy':
          if (response.status === 409) return { phase: 'busy', remaining };
          break;
        case 'budget_exhausted':
          if (response.status === 429 && remaining === 0) return { phase: 'budget_exhausted', remaining };
      }
    }
    throw new Error('Invalid status.');
  } finally {
    signal.removeEventListener('abort', cancel);
    if (reader) { if (!complete) cancel(); reader.releaseLock(); }
    else if (response) void response.body?.cancel().catch(() => {});
  }
}

const propPhaseText: Record<RoomPropState['phase'], string> = {
  idle: 'No prop generation in progress. Typing does not alter the room.',
  prepared: 'Preparing request…',
  'reference-image': 'Generating paid reference image (OpenAI)…',
  mesh: 'Generating paid 3D model (Meshy)… this may take several minutes.',
  retrieving: 'Retrieving the model and checking its integrity…',
  admitting: 'Checking the model…',
  installing: 'Installing…',
  installed: 'Installed. Appearance only; not a clue or evidence.',
  rejected: 'Request not accepted locally. Nothing was sent.',
  failed: 'Prop work failed. The current visual is unchanged.',
  cancelled: 'Prop work stopped. The current visual is unchanged.',
  stale: 'The room changed; the old prop request was discarded and nothing was installed.',
};
const propRouteText: Record<PropRouteStatus['phase'], string> = {
  ready: 'available', disabled: 'not enabled', spending_unconfirmed: 'spending not confirmed', busy: 'busy',
  budget_exhausted: 'allowance exhausted', unreachable: 'status could not be reached or validated',
};
const propStepText = { image: 'Image', mesh: 'Model', retrieve: 'Retrieval', install: 'Install' };
// Route codes returned before that step's paid submission.
const propUnsubmittedCodes = new Set(['not_found', 'forbidden', 'method', 'content_type', 'invalid_request', 'request_too_large', 'disabled',
  'spending_unconfirmed', 'missing_key', 'busy', 'budget_exhausted', 'duplicate_request', 'reference_not_found', 'reference_mismatch',
  'synthetic_reference', 'invalid_reference']);
function propResultText(result: PropGenerationResult) {
  if (result.outcome === 'installed') return null;
  if (result.outcome === 'stopped') return result.submitted ? 'Stopped locally. The remote job may still finish and charges may still apply. Nothing will be installed.' : null;
  return `${propStepText[result.stage]} step failed: ${result.code}${result.reason ? ` (${result.reason})` : ''}. ${propUnsubmittedCodes.has(result.code) ? 'Nothing new was submitted.' : 'Charges may still apply; no retry was made.'}`;
}

const assessmentText = {
  insufficient: 'Insufficient evidence — no clues discovered.',
  compatible: 'Not contradicted — not proved.',
  contradicted: 'Contradicted by discovered evidence.',
};

const challengeText = { ...assessmentText, insufficient: 'Insufficient evidence — no discovered clues cited.' };
const resolutionText = { insufficient: 'Insufficient evidence', incorrect: 'Incorrect accusation', resolved: 'Resolved from cited evidence' };

function poseText(pose: { x: number; z: number; rotation: number }) {
  return `x ${pose.x.toFixed(3)}, z ${pose.z.toFixed(3)}, ${pose.rotation}°`;
}

function roomMetadata(room: NonNullable<RoomCompositionState['accepted']>) {
  const { description: data, seed } = room;
  return `seed ${seed} · ${data.width} × ${data.depth} × ${data.height} units · ${data.colors.wall} walls / ${data.colors.floor} floor · ${data.doorway.placement} door ${data.doorway.width} × ${data.doorway.height} · ${data.furnishings.length} furnishings${data.furnishings.length ? ` (${data.furnishings.map(item => `${item.color} ${item.kind}`).join(', ')})` : ''}`;
}

export default function App() {
  const [state, dispatch] = useReducer(conversationReducer, initialConversationState);
  const [draft, setDraft] = useState('');
  const [speechState, setSpeechState] = useState<SpeechState>({ ...EMPTY_SPEECH });
  const [speechAvailability, setSpeechAvailability] = useState<SpeechAvailability>({ phase: 'unchecked', remaining: null });
  const [acceptedReply, setAcceptedReply] = useState<string | null>(null);
  const [spokenSource, setSpokenSource] = useState<string | null>(null);
  const speechController = useRef<ReturnType<typeof createSpeechController> | null>(null);
  const speechAvailabilityRequest = useRef<AbortController | null>(null);
  const speechAction = useRef(0);
  const spokenNarrationUnit = useRef<symbol | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [resetRequested, setResetRequested] = useState(false);
  const [venueFields, setVenueFields] = useState<VenueFields>({ ...EMPTY_VENUE_FIELDS });
  const visitorSession = useRef(0);
  const resetRequestedRef = useRef(false);
  const newVisitorButton = useRef<HTMLButtonElement>(null);
  const cancelResetButton = useRef<HTMLButtonElement>(null);
  const [roomRevealed, setRoomRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composition, setComposition] = useState<RoomCompositionState>(EMPTY_COMPOSITION);
  const [hypothesisDraft, setHypothesisDraft] = useState<{ unit: symbol; candidateId: string; clueIds: string[] } | null>(null);
  const [statementSelection, setStatementSelection] = useState<{ unit: symbol; id: string } | null>(null);
  const [dialogueFeedback, setDialogueFeedback] = useState<{ unit: symbol; kind: 'statement' | 'challenge' | 'accusation'; error: string | null } | null>(null);
  const [editDraft, setEditDraft] = useState<{ unit: symbol; revision: number; furnishingIndex: number; x: string; z: string; rotation: string } | null>(null);
  const [editNotice, setEditNotice] = useState<{ unit: symbol; revision: number; text: string } | null>(null);
  const [propDraft, setPropDraft] = useState<{ unit: symbol; objectId: string; text: string } | null>(null);
  const [propStatus, setPropStatus] = useState<PropGenerationStatus | 'unchecked' | 'checking'>('unchecked');
  const [propNotice, setPropNotice] = useState<{ unit: symbol; text: string } | null>(null);
  const propStatusRequest = useRef<AbortController | null>(null);
  const [paintStatus, setPaintStatus] = useState<PropRouteStatus | 'unchecked' | 'checking'>('unchecked');
  const [paint, setPaint] = useState<{ unit: symbol; revision: number; phase: 'painting' | 'painted' | 'ended'; text: string | null; earlier?: boolean } | null>(null);
  const paintStatusRequest = useRef<AbortController | null>(null);
  const paintRun = useRef<AbortController | null>(null);
  const paintedRoom = useRef<{ unit: symbol; revision: number } | null>(null);
  const propRun =useRef<{ request: RoomPropRequest; operation: AbortController } | null>(null);
  const propFocus = useRef<'cancel' | 'input' | null>(null);
  const propInput = useRef<HTMLInputElement>(null);
  const propCancelButton = useRef<HTMLButtonElement>(null);
  const [availability, setAvailability] = useState<Availability>({ phase: 'checking', remaining: null });
  const [submittedSuggestion, setSubmittedSuggestion] = useState<{ source: string; text: string; seed: number } | null>(null);
  const [compositionNotice, setCompositionNotice] = useState<string | null>(null);
  const [viewerFailure, setViewerFailure] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const compositionController = useRef<CompositionController | null>(null);
  const compositionAttempt = useRef<{ reply: AbortController; turnId: number; accepted: boolean } | null>(null);
  const availabilityRequest = useRef<AbortController | null>(null);
  const installer = useRef<Installer | null>(null);
  const revealRequest = useRef<{ controller: CompositionController } | null>(null);
  const stopTracking = useRef<((reason: string) => void) | null>(null);
  const activeReply = useRef<AbortController | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const compositionDetails = useRef<HTMLDivElement>(null);
  const inspectionPanel = useRef<HTMLElement>(null);
  const inspectionResult = useRef<HTMLDivElement>(null);
  const hypothesisResult = useRef<HTMLDivElement>(null);
  const reconstructionResult = useRef<HTMLDivElement>(null);
  const statementResult = useRef<HTMLDivElement>(null);
  const challengeResult = useRef<HTMLDivElement>(null);
  const accusationResult = useRef<HTMLDivElement>(null);
  const questionResult = useRef<HTMLElement>(null);
  const followTranscript = useRef(true);
  const focusNext = useRef<'composer' | 'action' | null>(null);
  const busy = state.status === 'thinking' || state.status === 'speaking';
  const composing = composition.status === 'interpreting' || composition.status === 'building';
  let latestVisitor = '';
  for (let index = state.messages.length - 1; index >= 0; index -= 1) {
    if (state.messages[index].role === 'visitor') { latestVisitor = state.messages[index].text.trim(); break; }
  }
  const selectedSuggestion = draft.trim() || latestVisitor;
  const selectedSource = draft.trim() ? 'Current draft' : latestVisitor ? 'Latest accepted visitor message' : 'No suggestion selected';
  const invalidSuggestion = !selectedSuggestion || selectedSuggestion.length > 2000;

  const refreshAvailability = useCallback(() => {
    if (!compositionController.current) return;
    availabilityRequest.current?.abort();
    const request = new AbortController();
    availabilityRequest.current = request;
    setAvailability({ phase: 'checking', remaining: null });
    const timer = window.setTimeout(() => request.abort(), 5000);
    void readAvailability(request.signal).then(next => {
      if (availabilityRequest.current === request && compositionController.current) setAvailability(next);
    }).catch(() => {
      if (availabilityRequest.current === request && compositionController.current) setAvailability({ phase: 'unreachable', remaining: null });
    }).finally(() => {
      window.clearTimeout(timer);
      if (availabilityRequest.current === request) availabilityRequest.current = null;
    });
  }, []);

  const refreshSpeechAvailability = useCallback(() => {
    if (!speechController.current) return;
    speechAvailabilityRequest.current?.abort();
    const request = new AbortController();
    speechAvailabilityRequest.current = request;
    setSpeechAvailability({ phase: 'checking', remaining: null });
    const timer = window.setTimeout(() => request.abort(), 5000);
    void readSpeechAvailability(request.signal).then(next => {
      if (speechAvailabilityRequest.current === request && speechController.current) setSpeechAvailability(next);
    }).catch(() => {
      if (speechAvailabilityRequest.current === request && speechController.current) setSpeechAvailability({ phase: 'unreachable', remaining: null });
    }).finally(() => {
      window.clearTimeout(timer);
      if (speechAvailabilityRequest.current === request) speechAvailabilityRequest.current = null;
    });
  }, []);

  const stopSpeech = useCallback(() => {
    speechAction.current += 1;
    spokenNarrationUnit.current = null;
    setSpokenSource(null);
    const request = speechAvailabilityRequest.current;
    speechAvailabilityRequest.current = null;
    request?.abort();
    if (request) setSpeechAvailability({ phase: 'unchecked', remaining: null });
    speechController.current?.stop();
  }, []);

  useEffect(() => {
    const controller = createSpeechController({ resources: createBrowserSpeechResources(),
      onStatus: next => {
        if (speechController.current !== controller) return;
        setSpeechState(next);
        if (next.phase === 'idle' || next.phase === 'error') { spokenNarrationUnit.current = null; setSpokenSource(null); }
      },
      onTranscript: text => {
        if (speechController.current !== controller) return;
        setDraft(text);
        composer.current?.focus();
      },
    });
    speechController.current = controller;
    setSpeechState(controller.getState());
    return () => {
      if (speechController.current === controller) speechController.current = null;
      speechAction.current += 1;
      spokenNarrationUnit.current = null;
      const request = speechAvailabilityRequest.current;
      speechAvailabilityRequest.current = null;
      request?.abort();
      controller.dispose();
    };
  }, []);

  function startDictation() {
    const controller = speechController.current;
    if (!controller || speechAvailability.phase !== 'ready' || state.status !== 'idle' || composing || compositionController.current?.getState().dialogue?.pending || resetRequestedRef.current) return;
    stopSpeech();
    const action = speechAction.current;
    const session = visitorSession.current;
    void controller.startListening().then(() => {
      if (speechController.current === controller && speechAction.current === action && visitorSession.current === session) refreshSpeechAvailability();
    });
  }

  function readAloud(kind: 'compose' | 'local-script' | 'investigation') {
    const controller = speechController.current;
    if (!controller || speechAvailability.phase !== 'ready' || compositionController.current?.getState().dialogue?.pending || resetRequestedRef.current) return;
    const narration = compositionController.current?.getState().narration;
    const investigationSpeech = kind === 'investigation' && investigation
      ? currentInvestigationController()?.getInvestigationSpeech(investigation.unit) : null;
    const text = kind === 'compose' ? acceptedReply : kind === 'local-script' ? narration?.text : investigationSpeech?.text;
    if (!text || (kind === 'local-script' && (!viewerReady || viewerFailure))) return;
    stopSpeech();
    spokenNarrationUnit.current = kind === 'local-script' ? narration!.unit : investigationSpeech?.unit ?? null;
    setSpokenSource(kind === 'investigation'
      ? investigationSpeech?.origin === 'model' ? 'Exact admitted model-proposed investigation reply — voice synthesis only, not new reasoning.'
        : 'Exact admitted local/scripted investigation reply — not live model reasoning.'
      : kind === 'local-script' ? 'Local/scripted case summary snapshot — not live model reasoning.' : 'Validated Compose reply — voice synthesis only, not a new interpretation.');
    const action = speechAction.current;
    const session = visitorSession.current;
    void controller.speak(text).then(() => {
      if (speechController.current === controller && speechAction.current === action && visitorSession.current === session) refreshSpeechAvailability();
    });
  }

  useEffect(() => {
    const controller = createRoomCompositionController({ onStatus: next => {
      // Reset, reveal, reconstruction, stop or disposal retired the request: abort its fetches at once.
      const run = propRun.current;
      if (run && !controller.isPropRequestCurrent(run.request)) { propRun.current = null; run.operation.abort(); }
      if (compositionController.current !== controller) return;
      if (spokenNarrationUnit.current && next.narration?.unit !== spokenNarrationUnit.current) stopSpeech();
      setComposition(next);
    } });
    compositionController.current = controller;
    setComposition(controller.getState());
    refreshAvailability();
    return () => {
      if (compositionController.current === controller) compositionController.current = null;
      compositionAttempt.current = null;
      revealRequest.current = null;
      const request = availabilityRequest.current;
      availabilityRequest.current = null;
      request?.abort();
      controller.dispose();
    };
  }, [refreshAvailability, stopSpeech]);

  const stop = useCallback(() => {
    const controller = activeReply.current;
    if (!controller) return;
    activeReply.current = null;
    controller.abort();
    focusNext.current = 'action';
    dispatch({ type: 'stop' });
  }, []);

  const stopComposition = useCallback(() => {
    const attempt = compositionAttempt.current;
    const awaitingReply = attempt !== null && !attempt.accepted;
    if (awaitingReply && activeReply.current === attempt.reply) stop();
    compositionAttempt.current = null;
    revealRequest.current = null;
    setRevealing(false);
    setCompositionNotice(awaitingReply ? 'Shared interpretation cancelled before a reply was accepted. No reply or replacement will arrive for this turn; current room held. Provider charges may still apply.' : null);
    if (compositionController.current?.stop()) refreshAvailability();
  }, [refreshAvailability, stop]);

  const roomReady = useCallback((install: Installer | null) => {
    if (visitorSession.current !== sessionKey) return;
    installer.current = install;
    setViewerReady(install !== null);
    if (!install) { compositionController.current?.cancelPropRequest(); return; }
    setViewerFailure(null);
    const request = revealRequest.current;
    if (!request) return;
    // StrictMode discards its first renderer before this ownership transfer can run.
    queueMicrotask(() => {
      if (installer.current !== install || revealRequest.current !== request || compositionController.current !== request.controller) return;
      revealRequest.current = null;
      setRevealing(false);
      request.controller.reveal(install.install);
    });
  }, [sessionKey]);

  const showInspection = useCallback(() => {
    const scroller = compositionDetails.current;
    const panel = inspectionPanel.current;
    if (!scroller || !panel) return;
    const bounds = scroller.getBoundingClientRect();
    scroller.scrollTop += panel.getBoundingClientRect().top - bounds.top - 4;
    const result = inspectionResult.current;
    if (result) scroller.scrollTop += Math.max(0, result.getBoundingClientRect().bottom - bounds.bottom + 4);
  }, []);

  const inspectObject = useCallback((unit: symbol, objectId: string) => {
    if (installer.current && compositionController.current?.inspect(unit, objectId)) showInspection();
  }, [showInspection]);

  const roomFailed = useCallback((message: string | null) => {
    if (visitorSession.current !== sessionKey) return;
    setViewerFailure(message);
    if (!message) return;
    const request = revealRequest.current;
    revealRequest.current = null;
    setRevealing(false);
    if (request && compositionController.current === request.controller) request.controller.reveal(() => false);
  }, [sessionKey]);

  const refreshPropStatus = useCallback(() => {
    propStatusRequest.current?.abort();
    const request = new AbortController();
    propStatusRequest.current = request;
    setPropStatus('checking');
    const timer = window.setTimeout(() => request.abort(), 5000);
    void readPropGenerationStatus(request.signal).then(next => {
      if (propStatusRequest.current === request) setPropStatus(next);
    }).finally(() => {
      window.clearTimeout(timer);
      if (propStatusRequest.current === request) propStatusRequest.current = null;
    });
  }, []);

  // Local settlement is immediate; a remote job already submitted is not cancelled.
  const cancelPropGeneration = useCallback(() => {
    const run = propRun.current;
    propRun.current = null;
    run?.operation.abort();
    compositionController.current?.cancelPropRequest();
  }, []);

  const refreshPaintStatus = useCallback(() => {
    paintStatusRequest.current?.abort();
    const request = new AbortController();
    paintStatusRequest.current = request;
    setPaintStatus('checking');
    const timer = window.setTimeout(() => request.abort(), 5000);
    void readRoomPaintStatus(request.signal).then(next => {
      if (paintStatusRequest.current === request) setPaintStatus(next);
    }).finally(() => {
      window.clearTimeout(timer);
      if (paintStatusRequest.current === request) paintStatusRequest.current = null;
    });
  }, []);

  // Local settlement only; a submitted remote task is not cancelled.
  const cancelPaint = useCallback(() => {
    const run = paintRun.current;
    paintRun.current = null;
    run?.abort();
  }, []);

  const stopAll = useCallback((reason: string) => {
    cancelPaint();
    cancelPropGeneration();
    stopSpeech();
    stop();
    stopComposition();
    stopTracking.current?.(reason);
  }, [cancelPaint, cancelPropGeneration, stop, stopComposition, stopSpeech]);

  const cancelReset = useCallback(() => {
    resetRequestedRef.current = false;
    setResetRequested(false);
    newVisitorButton.current?.focus();
  }, []);

  function confirmReset() {
    const controller = compositionController.current;
    if (!resetRequestedRef.current || !controller) return;
    const reply = activeReply.current;
    const availabilityCheck = availabilityRequest.current;
    const previousSession = visitorSession.current;
    visitorSession.current += 1;
    activeReply.current = null;
    availabilityRequest.current = null;
    compositionAttempt.current = null;
    revealRequest.current = null;
    reply?.abort();
    availabilityCheck?.abort();
    cancelPropGeneration();
    cancelPaint();
    const propCheck = propStatusRequest.current;
    propStatusRequest.current = null;
    propCheck?.abort();
    const paintCheck = paintStatusRequest.current;
    paintStatusRequest.current = null;
    paintCheck?.abort();
    stopSpeech();
    setSpeechAvailability({ phase: 'unchecked', remaining: null });
    stopTracking.current?.('Visitor reset. Camera stopped; the next visitor must enable and calibrate explicitly.');
    if (!controller.reset()) {
      visitorSession.current = previousSession;
      setRevealing(false);
      dispatch({ type: 'stop' });
      setCompositionNotice('Visitor reset was not accepted. No new visitor started; interrupted work remains stopped. Try again when installation has finished.');
      return;
    }
    installer.current = null;
    stopTracking.current = null;
    resetRequestedRef.current = false;
    followTranscript.current = true;
    focusNext.current = 'composer';
    setSessionKey(visitorSession.current);
    setResetRequested(false);
    setRoomRevealed(false);
    setViewerReady(false);
    setViewerFailure(null);
    setRevealing(false);
    setComposition(controller.getState());
    setDraft('');
    setError(null);
    setHypothesisDraft(null);
    setStatementSelection(null);
    setDialogueFeedback(null);
    setEditDraft(null);
    setEditNotice(null);
    setPropDraft(null);
    setPropStatus('unchecked');
    setPropNotice(null);
    setPaintStatus('unchecked');
    setPaint(null);
    paintedRoom.current = null;
    setSubmittedSuggestion(null);
    setCompositionNotice(null);
    setAvailability({ phase: 'unchecked', remaining: null });
    setAcceptedReply(null);
    dispatch({ type: 'reset' });
  }

  useLayoutEffect(() => {
    if (resetRequested) cancelResetButton.current?.focus();
  }, [resetRequested]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (resetRequestedRef.current) {
          stopSpeech();
          cancelPropGeneration();
          cancelPaint();
          if (compositionController.current?.getState().dialogue?.pending) stopComposition();
          cancelReset();
        }
        else stopAll('Escape stopped tracking, speech, dialogue, reply and composition. Manual view is available.');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      const controller = activeReply.current;
      activeReply.current = null;
      controller?.abort();
    };
  }, [cancelPaint, cancelPropGeneration, cancelReset, stopAll, stopComposition, stopSpeech]);

  useLayoutEffect(() => {
    if (focusNext.current === 'composer') composer.current?.focus();
    if (focusNext.current === 'action') action.current?.focus();
    focusNext.current = null;
  }, [state.status, state.turnId]);

  useEffect(() => {
    const element = transcript.current;
    if (element && followTranscript.current) element.scrollTop = element.scrollHeight;
  }, [state.messages]);

  async function writeReply(text: string, controller: AbortController, turnId: number) {
    try {
      for await (const chunk of presentReply(text, controller.signal)) {
        if (activeReply.current !== controller || controller.signal.aborted) break;
        dispatch({ type: 'chunk', turnId, text: chunk });
      }
      if (activeReply.current === controller && !controller.signal.aborted) {
        if (document.activeElement === action.current) focusNext.current = 'composer';
        dispatch({ type: 'complete', turnId });
      }
    } catch {
      if (activeReply.current === controller && !controller.signal.aborted) {
        setError('Reply presentation stopped unexpectedly. Text already shown is kept; room work is independent.');
        dispatch({ type: 'stop' });
      }
    } finally {
      if (activeReply.current === controller) activeReply.current = null;
    }
  }

  async function composeRoom() {
    stopSpeech();
    const controller = compositionController.current;
    if (!controller || compositionAttempt.current || activeReply.current || viewerFailure) return;
    const text = selectedSuggestion.trim();
    if (!text || text.length > 2000) {
      setCompositionNotice('Choose a nonempty visitor suggestion of at most 2,000 characters. No request sent.');
      return;
    }
    if (availability.phase !== 'ready') return;
    const started = conversationReducer(state, { type: 'compose', text });
    if (started === state) return;
    let seed: number;
    try { seed = crypto.getRandomValues(new Uint32Array(1))[0]; }
    catch { setCompositionNotice('A local room seed could not be chosen. No request sent.'); return; }
    const reply = new AbortController();
    const attempt = { reply, turnId: started.turnId, accepted: false };
    compositionAttempt.current = attempt;
    activeReply.current = reply;
    focusNext.current = 'action';
    followTranscript.current = true;
    setError(null);
    dispatch({ type: 'compose', text });
    setDraft('');
    revealRequest.current = null;
    setRevealing(false);
    setCompositionNotice(null);
    setSubmittedSuggestion({ source: selectedSource, text, seed });
    try {
      await controller.compose(text, seed, result => {
        if (compositionController.current !== controller || compositionAttempt.current !== attempt) return;
        attempt.accepted = true;
        setAcceptedReply(result.reply);
        if (activeReply.current === reply && !reply.signal.aborted) void writeReply(result.reply, reply, attempt.turnId);
      });
    } catch {
      if (compositionController.current === controller && compositionAttempt.current === attempt) setCompositionNotice('Composition could not finish. No automatic retry was made.');
    } finally {
      if (compositionController.current === controller && compositionAttempt.current === attempt) {
        if (!attempt.accepted && activeReply.current === reply) {
          stop();
          setError('No validated reply was accepted. See composition status; no substitute reply was used.');
        }
        compositionAttempt.current = null;
        refreshAvailability();
      }
    }
  }

  function revealComposedRoom() {
    const controller = compositionController.current;
    if (!controller?.getState().pending || viewerFailure || revealRequest.current) return;
    setCompositionNotice(null);
    if (installer.current) controller.reveal(installer.current.install);
    else {
      revealRequest.current = { controller };
      setRevealing(true);
      setRoomRevealed(true);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeReply.current) return;
    const accepted = conversationReducer(state, { type: 'submit', text: draft });
    if (accepted === state) return;
    stopSpeech();
    focusNext.current = 'composer';
    followTranscript.current = true;
    setError(null);
    dispatch({ type: 'submit', text: draft });
    setDraft('');
    composer.current?.focus();
  }

  function resume() {
    focusNext.current = 'composer';
    setError(null);
    dispatch({ type: 'resume' });
  }

  const inspection = viewerReady && !viewerFailure ? composition.inspection : null;
  const selectedObject = inspection?.objects.find(item => item.id === inspection.selectedObjectId);
  const selectedClues = inspection?.discoveredClues.filter(item => item.objectId === selectedObject?.id) ?? [];
  const investigation = inspection ? composition.investigation : null;
  const propDescription = propDraft?.unit === investigation?.unit && propDraft?.objectId === selectedObject?.id ? propDraft?.text ?? '' : '';
  const propPending = ['prepared', 'reference-image', 'mesh', 'retrieving', 'admitting', 'installing'].includes(composition.props.phase);
  const propPanelUnit = inspection && investigation ? investigation.unit : null;
  const propChecked = typeof propStatus === 'object' ? propStatus : null;
  const propRoutesReady = propChecked?.image.phase === 'ready' && propChecked.mesh.phase === 'ready';
  const propRecheckable = !!propChecked && [propChecked.image.phase, propChecked.mesh.phase].some(phase => phase === 'unreachable' || phase === 'busy');
  const canGeneratePropNow = propRoutesReady && !!selectedObject && !!propDescription.trim() && !propPending && !resetRequested
    && composition.props.remainingRequests > 0 && !propRun.current;
  const currentPropNotice = propNotice && propNotice.unit === investigation?.unit ? propNotice.text : null;

  useEffect(() => { if (propPanelUnit) { refreshPropStatus(); refreshPaintStatus(); } }, [propPanelUnit, refreshPropStatus, refreshPaintStatus]);

  useLayoutEffect(() => {
    const target = propFocus.current === 'cancel' ? propCancelButton.current : propFocus.current === 'input' ? propInput.current : null;
    if (target && !target.disabled) { target.focus(); propFocus.current = null; }
  });

  function generateProp() {
    const controller = compositionController.current, view = installer.current;
    const unit = investigation?.unit, revision = reconstruction?.revision;
    if (!controller || !view || !unit || revision === undefined || !selectedObject || !canGeneratePropNow) return;
    setPropNotice(null);
    const request = controller.preparePropRequest(unit, revision, { objectId: selectedObject.id, description: propDescription });
    if (!request) return;
    const run = { request, operation: new AbortController() };
    propRun.current = run;
    propFocus.current = 'cancel';
    const session = visitorSession.current;
    void runPropGeneration({ controller, request, installer: view.installProp, signal: run.operation.signal }).then(result => {
      if (propRun.current === run) propRun.current = null;
      if (compositionController.current !== controller || visitorSession.current !== session) return;
      const text = propResultText(result);
      // A revealed replacement retired a submitted job: tell the new case, or the possible charge goes unmentioned.
      const shown = controller.getState().investigation?.unit;
      if (text && shown && shown !== unit) setPropNotice({ unit: shown, text: `Prop work for the previous room stopped when this room was revealed. ${text}` });
      else setPropNotice(text ? { unit, text } : null);
      const active = document.activeElement;
      if (!active || active === document.body || active === propCancelButton.current) propFocus.current = 'input';
      refreshPropStatus();
    });
  }
  function paintRoom() {
    const view = installer.current, unit = investigation?.unit, layout = reconstruction?.current, revision = reconstruction?.revision;
    if (!view || !unit || !layout || revision === undefined || paintRun.current || resetRequested
      || typeof paintStatus !== 'object' || paintStatus.phase !== 'ready') return;
    const run = new AbortController();
    paintRun.current = run;
    const session = visitorSession.current;
    setPaint({ unit, revision, phase: 'painting', text: null });
    void runRoomPaint(layout, run.signal).then(result => {
      if (paintRun.current === run) paintRun.current = null;
      if (visitorSession.current !== session) { if (result.outcome === 'painted') result.image.close(); return; }
      const shown = compositionController.current?.getState().reconstruction;
      const here = shown ? { unit: shown.unit, revision: shown.revision } : { unit, revision };
      const earlier = paintedRoom.current?.unit === here.unit && paintedRoom.current.revision === here.revision;
      const ended = (text: string) => setPaint({ ...here, phase: 'ended', text, earlier });
      if (result.outcome === 'painted') {
        // Paint only the exact layout it was made from; a changed or replaced room never receives it.
        if (shown?.unit === unit && shown.revision === revision && installer.current) {
          if (installer.current.paint({ unit, revision }, result.image)) {
            paintedRoom.current = { unit, revision };
            setPaint({ unit, revision, phase: 'painted', text: null });
          } else ended('The painting could not be applied. Charges may still apply.');
        } else {
          result.image.close();
          ended('The room changed while painting, so the painting was not applied. Charges may still apply.');
        }
      } else if (result.outcome === 'stopped') {
        ended(result.submitted ? 'Painting stopped locally. The remote task may still finish and charges may still apply. Nothing will be applied.' : 'Painting stopped. Nothing was sent.');
      } else {
        ended(`Painting failed: ${result.code}. ${paintUnsubmittedCodes.has(result.code) ? 'No paint task was submitted.' : 'Charges may still apply; no retry was made.'}`);
      }
      refreshPaintStatus();
    });
  }
  const currentDialogue = investigation ? composition.dialogue : null;
  const invalidQuestion = !draft.trim() || draft.length > 2000 || /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(draft);
  const reconstruction = investigation ? composition.reconstruction : null;
  const currentPaint = paint && paint.unit === investigation?.unit ? paint : null;
  const painting = currentPaint?.phase === 'painting';
  // Live construction follows only real events of the displayed case; a failure is reported, never advanced past.
  const liveProps = investigation && composition.props.request?.owner.unit === investigation.unit ? composition.props : null;
  const propGenerating = !!liveProps && ['reference-image', 'mesh', 'retrieving', 'admitting', 'installing'].includes(liveProps.phase);
  const construction = {
    unit: investigation?.unit ?? null,
    events: investigation ? [
      'interpreted' as const,
      ...propGenerating || liveProps?.phase === 'installed' ? ['prop-generating' as const] : [],
      ...liveProps?.phase === 'installed' ? ['prop-installed' as const] : [],
      ...currentPaint?.phase === 'painted' && currentPaint.revision === reconstruction?.revision ? ['painted' as const] : [],
    ] : [],
    failure: liveProps && ['failed', 'rejected', 'cancelled', 'stale'].includes(liveProps.phase)
      ? `Prop generation ${liveProps.phase}${liveProps.reason ? ` (${liveProps.reason})` : ''}; the stage holds.`
      : currentPaint?.phase === 'ended' ? `Paint not applied: ${currentPaint.text}` : null,
    focusObjectId: propGenerating ? liveProps!.request!.owner.objectId : null,
  };
  const paintChecked = typeof paintStatus === 'object' ? paintStatus : null;
  const canPaint = paintChecked?.phase === 'ready' && !painting && !resetRequested && viewerReady && !!reconstruction;
  const paintText = !currentPaint ? 'Not painted. The room shows its plain model.'
    : currentPaint.phase === 'painting' ? 'Painting this layout with World Labs Atlas… usually under a minute. Stop painting, Stop all and Escape stop local work; a submitted remote task is not cancelled.'
      : currentPaint.phase === 'painted' ? currentPaint.revision === reconstruction?.revision
        ? 'Painted by World Labs Atlas from the centre viewpoint. Appearance only; not a clue or evidence.'
        : 'The layout changed after painting, so the painted look was removed. Paint again to match the new layout.'
        // Any install releases the painting, so what is shown is judged against the current revision, not when the notice was written.
        : `${currentPaint.text}${currentPaint.revision !== reconstruction?.revision ? ' The layout has since changed; no painting is shown.'
          : currentPaint.earlier ? ' The earlier painting is still shown.' : ''}`;
  const furnishingIndex = reconstruction && editDraft?.unit === reconstruction.unit ? editDraft.furnishingIndex : 0;
  const currentFurnishing = reconstruction?.current.furnishings[furnishingIndex];
  const originalFurnishing = reconstruction?.original.furnishings[furnishingIndex];
  const editFields = reconstruction && currentFurnishing ? editDraft?.unit === reconstruction.unit && editDraft.revision === reconstruction.revision
    ? editDraft : { unit: reconstruction.unit, revision: reconstruction.revision, furnishingIndex,
      x: String(currentFurnishing.x), z: String(currentFurnishing.z), rotation: String(currentFurnishing.rotation) } : null;
  const currentEditNotice = editNotice?.unit === reconstruction?.unit && editNotice?.revision === reconstruction?.revision ? editNotice?.text : null;
  const hypothesis = investigation?.hypothesis;
  const candidateId = hypothesisDraft?.unit === investigation?.unit ? hypothesisDraft?.candidateId ?? '' : '';
  const citedClues = hypothesisDraft?.unit === investigation?.unit ? hypothesisDraft?.clueIds ?? [] : [];
  const newerEvidence = hypothesis && inspection?.discoveredClues.some(clue => !hypothesis.assessment.clueIds.includes(clue.id));
  const selectedStatementId = statementSelection?.unit === investigation?.unit ? statementSelection?.id ?? '' : '';
  const selectedStatement = investigation?.statements.find(item => item.id === selectedStatementId);
  const latestStatement = investigation?.statements.at(-1);
  const latestChallenge = investigation?.challenges.at(-1);
  const challengeHasNewEvidence = latestChallenge && latestChallenge.clueIds.length > 0
    && inspection?.discoveredClues.some(clue => !latestChallenge.assessment.clueIds.includes(clue.id));
  const resolution = investigation?.resolution;
  const localFeedback = dialogueFeedback?.unit === investigation?.unit ? dialogueFeedback : null;
  const investigationController = compositionController.current;
  const investigationInstaller = installer.current;
  useLayoutEffect(showInspection, [investigation?.unit, inspection?.selectedObjectId, showInspection]);
  useLayoutEffect(() => {
    const scroller = compositionDetails.current;
    const result = hypothesisResult.current;
    if (!scroller || !result || !hypothesis?.revision) return;
    const bounds = scroller.getBoundingClientRect();
    scroller.scrollTop += Math.max(0, result.getBoundingClientRect().bottom - bounds.bottom + 6);
  }, [investigation?.unit, hypothesis?.revision]);
  useLayoutEffect(() => {
    const scroller = compositionDetails.current;
    const result = reconstructionResult.current;
    if (!scroller || !result || !currentEditNotice) return;
    const bounds = scroller.getBoundingClientRect();
    scroller.scrollTop += Math.max(0, result.getBoundingClientRect().bottom - bounds.bottom + 6);
  }, [editNotice, currentEditNotice]);
  useLayoutEffect(() => {
    const scroller = compositionDetails.current;
    if (!scroller || !dialogueFeedback || dialogueFeedback.unit !== investigation?.unit) return;
    const result = dialogueFeedback.kind === 'statement' ? statementResult.current
      : dialogueFeedback.kind === 'challenge' ? challengeResult.current : accusationResult.current;
    if (!result) return;
    const bounds = scroller.getBoundingClientRect();
    scroller.scrollTop += Math.max(0, result.getBoundingClientRect().bottom - bounds.bottom + 6);
  }, [dialogueFeedback, investigation?.unit]);

  function currentInvestigationController() {
    if (!investigation || !viewerReady || viewerFailure || !investigationInstaller || installer.current !== investigationInstaller
      || !investigationController || compositionController.current !== investigationController) return null;
    const current = investigationController.getState();
    return !current.disposed && current.investigation?.unit === investigation.unit ? investigationController : null;
  }

  useLayoutEffect(() => {
    const scroller = compositionDetails.current;
    const result = questionResult.current;
    if (!scroller || !result || (!currentDialogue?.pending && !currentDialogue?.reply)) return;
    scroller.scrollTop += result.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 4;
  }, [currentDialogue?.unit, currentDialogue?.pending, currentDialogue?.reply?.question, currentDialogue?.reply?.text]);

  function askCurrentCase() {
    const controller = currentInvestigationController();
    if (!controller || !investigation || controller.getState().dialogue?.pending || busy || composing || resetRequestedRef.current) return;
    if (invalidQuestion) { setError('Ask a single-line question of 1–2,000 characters using the current draft.'); return; }
    stopSpeech();
    void controller.askInvestigationQuestion(investigation.unit, draft);
    if (controller.getState().dialogue?.pending) {
      setDraft('');
      setError(null);
      composer.current?.focus();
    } else setError('Question not started. No narration request was sent; check the current case and draft.');
  }

  function requestLocalStatement() {
    const controller = currentInvestigationController();
    if (!controller || !investigation) return;
    const accepted = controller.recordLocalEvaStatement(investigation.unit, candidateId);
    if (accepted) setStatementSelection({ unit: investigation.unit, id: controller.getState().investigation!.statements.at(-1)!.id });
    setDialogueFeedback({ unit: investigation.unit, kind: 'statement', error: accepted ? null : 'No local statement recorded. Choose a current candidate.' });
  }

  function challengeStatement() {
    const controller = currentInvestigationController();
    if (!controller || !investigation) return;
    const accepted = controller.challengeEvaStatement(investigation.unit, selectedStatementId, citedClues);
    setDialogueFeedback({ unit: investigation.unit, kind: 'challenge', error: accepted ? null : 'Challenge not recorded. Choose a statement from this case and only discovered citations.' });
  }

  function accuseCandidate() {
    const controller = currentInvestigationController();
    if (!controller || !investigation || resolution?.status === 'resolved') return;
    const accepted = controller.accuse(investigation.unit, candidateId, citedClues);
    setDialogueFeedback({ unit: investigation.unit, kind: 'accusation', error: accepted ? null : 'No accusation recorded. This case is already resolved, or the candidate or citations are no longer current.' });
  }

  function applyReconstructionEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editFields || !reconstruction || !viewerReady || viewerFailure || !investigationInstaller || installer.current !== investigationInstaller
      || !investigationController || compositionController.current !== investigationController) return;
    const accepted = investigationController.applyReconstructionEdit(editFields.unit, editFields.revision, editFields.furnishingIndex,
      { x: editFields.x.trim() ? Number(editFields.x) : NaN, z: editFields.z.trim() ? Number(editFields.z) : NaN, rotation: Number(editFields.rotation) }, investigationInstaller.install);
    const current = investigationController.getState().reconstruction;
    if (!current || current.unit !== editFields.unit) return;
    setEditNotice({ unit: current.unit, revision: current.revision, text: accepted
      ? `Reconstruction revision ${current.revision} applied. Original reconstruction, case facts and investigation are retained.`
      : 'Edit not applied. The room and investigation are unchanged. Use a different finite position and a quarter-turn, within the room, clear of furnishings and the doorway aisle. A stale edit or unavailable renderer is also rejected.' });
  }

  function recordHypothesis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const controller = currentInvestigationController();
    if (!controller || !investigation) return;
    if (!controller.proposeHypothesis(investigation.unit, candidateId, citedClues)) {
      setCompositionNotice('Hypothesis not recorded. Choose a current candidate and discovered clues.');
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="identity">
          <span className="wordmark">{evaPersona.name}</span>
          <span>A fictional conversation</span>
        </div>
        <p className="fixture-label">EVA proposals via Compose · locally paced presentation</p>
        <div className="session-actions" role="group" aria-label="Visitor session controls">
          <button type="button" onClick={() => stopAll('Stop all requested. Tracking, reply and composition stopped; manual view is available.')}>Stop all</button>
          <button type="button" ref={newVisitorButton} aria-expanded={resetRequested} aria-controls="visitor-reset-confirmation" onClick={() => {
            resetRequestedRef.current = true;
            setResetRequested(true);
            cancelResetButton.current?.focus();
          }}>New visitor</button>
        </div>
      </header>

      <main className="conversation-layout">
        <section className={`invitation${roomRevealed ? ' invitation-revealed' : ''}`} aria-labelledby="invitation-title">
          <h1 id="invitation-title">{evaPersona.invitation}</h1>
          <section className="visitor-journey" aria-labelledby="journey-title">
            <div role="status" aria-live="polite" aria-atomic="true">
              <h2 id="journey-title">Current stage: {viewerFailure ? 'Room display unavailable'
                : composition.journey.unit && !viewerReady ? 'Waiting for room display'
                  : revealing ? 'Preparing reveal' : journeyText[composition.journey.stage]}</h2>
              <p>{viewerFailure ? 'No room is visible. Text remains available; reload to retry the room display.'
                : composition.journey.unit && !viewerReady ? 'Case data is retained, but no room is currently visible. Investigation controls wait for the display.'
                  : revealing ? 'Preparing the display. The new case is not active until installation succeeds.'
                    : journeyGuidance[composition.journey.stage]}</p>
              {composition.journey.unit && (composition.journey.operation !== 'idle' || composition.pending) && <p>
                <strong>Replacement operation:</strong> {composition.journey.operation}.
                {composition.pending ? ' Not installed. Choose Reveal composed room to replace this case, or Stop composition to discard the proposal.'
                  : composition.journey.pendingReplacement ? ' Current case retained. Stop composition cancels the replacement.'
                    : ' Current case retained; no replacement installed.'}
              </p>}
            </div>
          </section>
          {roomRevealed ? <FixtureRoom key={sessionKey} venueFields={venueFields} onVenueFieldsChange={setVenueFields} onStopAll={stopAll} onReady={roomReady} onInspect={inspectObject} onFailure={roomFailed} displayed={composition.displayed} stopTrackingRef={stopTracking} construction={construction} /> : (
            <>
              <p className="character-line">“I remember the room. Not always the same way.”</p>
              <p className="invitation-hint">Begin with a place, a detail, or a possibility. You can interrupt EVA at any time.</p>
              <button className="reveal-room" type="button" onClick={() => setRoomRevealed(true)}>
                Reveal fixture room
              </button>
            </>
          )}
        </section>

        <section className={`conversation-panel${inspection ? ' inspection-active' : ''}${resetRequested ? ' reset-pending' : ''}`} aria-labelledby="conversation-title">
          <div className="conversation-heading">
            <h2 id="conversation-title">Conversation</h2>
            <p className="conversation-status" role="status" aria-live="polite" aria-atomic="true">
              {statusText[state.status]}
            </p>
          </div>

          <div
            className="transcript"
            ref={transcript}
            role="region"
            aria-label="Conversation transcript"
            tabIndex={0}
            onScroll={event => {
              const element = event.currentTarget;
              followTranscript.current = element.scrollHeight - element.scrollTop - element.clientHeight < 64;
            }}
          >
            {state.messages.length === 0 ? (
              <div className="empty-transcript">
                <p>A room starts with a few words.</p>
                <p>Send keeps your suggestion here. Compose requests EVA’s interpretation and reply.</p>
              </div>
            ) : (
              <ol className="messages">
                {state.messages.map(message => (
                  <li className={`message message-${message.role}`} key={`${message.turnId}-${message.role}`}>
                    <p className="message-speaker">
                      {message.role === 'visitor' ? 'You' : `${evaPersona.name} · proposed interpretation`}
                      {message.interrupted && <span className="interrupted-label">Interrupted</span>}
                    </p>
                    <p className="message-text">
                      {message.text || (message.interrupted
                        ? 'Stopped before any reply text appeared.'
                        : 'Awaiting a validated reply from the shared interpretation…')}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <form className="composer" onSubmit={submit}>
            <label htmlFor="suggestion">Your suggestion</label>
            <textarea
              id="suggestion"
              ref={composer}
              rows={2}
              value={draft}
              readOnly={state.status !== 'idle'}
              aria-describedby="composer-hint"
              placeholder="A library with no windows…"
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="composer-controls">
              <p id="composer-hint" role={error ? 'alert' : undefined} tabIndex={error ? 0 : undefined}>
                {error ?? (busy ? 'Stop reply hides further text only; composition continues. Esc stops all.'
                  : state.status === 'interrupted' ? 'Continue to write, or Compose again. Stopped reply text stays stopped.'
                    : investigation ? 'Enter keeps text locally. Ask EVA uses this draft as a case question; Compose requests a room.' : 'Enter sends locally. Compose is paid. Shift + Enter: new line.')}
              </p>
              <button
                ref={action}
                type={state.status === 'idle' ? 'submit' : 'button'}
                disabled={state.status === 'idle' && (!draft.trim() || draft.trim().length > 2000)}
                onClick={busy ? stop : state.status === 'interrupted' ? resume : undefined}
              >
                {busy ? 'Stop reply' : state.status === 'interrupted' ? 'Continue' : 'Send'}
              </button>
            </div>
            {investigation && <div className="speech-controls" role="group" aria-label="Investigation question controls">
              <button type="button" disabled={invalidQuestion || busy || composing || Boolean(currentDialogue?.pending) || resetRequested} aria-describedby="question-policy" onClick={askCurrentCase}>Ask EVA (paid if enabled)</button>
              <button type="button" disabled={!composition.dialogue?.pending} onClick={stopComposition}>Stop question</button>
            </div>}
            <div className="speech-controls" role="group" aria-label="Microphone and speech controls">
              <button type="button" disabled={speechAvailability.phase !== 'ready' || state.status !== 'idle' || composing || Boolean(composition.dialogue?.pending) || resetRequested || speechState.microphone || speechState.phase === 'connecting' || speechState.phase === 'committing'} aria-pressed={speechState.microphone} aria-describedby="speech-policy" onClick={startDictation}>Start microphone (paid)</button>
              <button type="button" disabled={speechState.phase !== 'listening'} onClick={() => speechController.current?.finishListening()}>Finish dictation</button>
              <button type="button" onClick={stopSpeech}>Stop speech</button>
            </div>
            <p id="speech-state" className="speech-state" data-microphone={speechState.microphone ? 'active' : 'off'} role="status" aria-live="polite" aria-atomic="true">
              {speechState.microphone ? 'Microphone active. ' : ''}{speechState.error ?? speechStatusText[speechState.phase]}
            </p>
          </form>

          <section className="composition-panel" aria-label="Room composition">
            <div className="composition-source" id="composition-source">
              <p><strong>{selectedSource}</strong> · {selectedSuggestion.length.toLocaleString()} / 2,000 characters</p>
              <p className="composition-preview" title={selectedSuggestion}>{selectedSuggestion || 'Write a suggestion above, or send one locally to select it later.'}</p>
            </div>
            <div className="composition-actions">
              <button type="button" disabled={busy || composing || revealing || invalidSuggestion || availability.phase !== 'ready' || Boolean(viewerFailure)} aria-describedby="composition-source composition-policy" onClick={() => void composeRoom()}>Compose room</button>
              <button type="button" disabled={!composing && !composition.pending && !revealing} onClick={stopComposition}>Stop composition</button>
              <button type="button" disabled={!composition.pending || revealing || Boolean(viewerFailure)} onClick={revealComposedRoom}>Reveal composed room</button>
            </div>
            <div className="composition-details" ref={compositionDetails} tabIndex={0} role="region" aria-label="Composition status and accepted room data">
              {resetRequested && <div className="reset-confirmation" id="visitor-reset-confirmation" role="group" aria-labelledby="visitor-reset-title" aria-describedby="visitor-reset-consequences">
                <h2 id="visitor-reset-title">Start a new visitor?</h2>
                <p id="visitor-reset-consequences">Clear this visitor’s words, case, discoveries, edits, statements and history. Stop pending interpretation, reply text, microphone, audio playback and camera tracking. Venue measurement fields stay; viewer calibration is discarded. Provider charges cannot be recalled.</p>
                <p>Cancel reset keeps this visitor. Escape also keeps this visitor, but stops speech, pending local prop work and any pending question (including its pending room work). Stop all remains available above.</p>
                <div className="session-actions">
                  <button type="button" ref={cancelResetButton} onClick={cancelReset}>Cancel reset</button>
                  <button type="button" onClick={confirmReset}>Confirm new visitor</button>
                </div>
              </div>}
              <section className="speech-panel" aria-labelledby="speech-title">
                <h3 id="speech-title">Optional paid speech</h3>
                <details className="fine-print"><summary>How paid speech works</summary>
                  <p id="speech-policy">Start microphone sends one utterance to ElevenLabs Scribe v2 Realtime. Final text replaces your editable draft once; it never submits. Interim text is provisional. Finish requests the final transcript; Stop speech or Escape discards unfinished dictation. The 60-second capture limit is local, not a provider cost guarantee.</p>
                  <p>Read-aloud sends only the selected public text snapshot for paid Eleven v3 voice synthesis. It is not new model reasoning. No browser speech service or automatic retry. Operator confirmation does not verify provider retention; live account, voice and hardware behavior remain unverified. Charges cannot be recalled; restarting the server does not renew approval.</p>
                  <p id="investigation-speech-policy">Investigation read-aloud uses the exact admitted reply without extra labels or citations. Asking a new question stops audio; read-aloud is unavailable while the question is pending.</p>
                </details>
                {speechState.interim && <p id="speech-interim"><strong>Provisional, not submitted:</strong> {speechState.interim}</p>}
                <div className="composition-availability">
                  <p>Last speech status check: {speechAvailabilityText[speechAvailability.phase]}{speechAvailability.remaining !== null ? ` Shared server attempts remaining: ${speechAvailability.remaining} / 3.` : ''}</p>
                  <button type="button" disabled={speechAvailability.phase === 'checking'} onClick={refreshSpeechAvailability}>Check speech status</button>
                </div>
                <div className="speech-controls">
                  <button type="button" disabled={!acceptedReply || speechAvailability.phase !== 'ready' || Boolean(composition.dialogue?.pending) || resetRequested} onClick={() => readAloud('compose')}>Read accepted reply (paid)</button>
                  <button type="button" disabled={!investigation || !composition.narration || speechAvailability.phase !== 'ready' || Boolean(composition.dialogue?.pending) || resetRequested} onClick={() => readAloud('local-script')}>Read local summary (paid)</button>
                  <button type="button" id="read-investigation-reply" disabled={!investigation || !currentDialogue?.reply || speechAvailability.phase !== 'ready' || Boolean(currentDialogue?.pending) || resetRequested} aria-describedby="investigation-speech-policy" onClick={() => readAloud('investigation')}>Read investigation reply (paid)</button>
                </div>
                {spokenSource && <p id="spoken-source"><strong>Audio source:</strong> {spokenSource}</p>}
                <details><summary>Public read-aloud text previews</summary>
                  <p><strong>Last validated Compose reply (may be from an earlier attempt):</strong> {acceptedReply ?? 'None accepted.'}</p>
                  <p><strong>Current local/scripted case summary:</strong> {composition.narration?.text ?? 'None; reveal a composed case first.'}</p>
                  <p id="investigation-speech-preview"><strong>Last admitted investigation reply{currentDialogue?.reply ? ` · ${currentDialogue.reply.origin === 'model' ? 'model-proposed' : 'local/scripted fallback'}` : ''}:</strong> <span id="investigation-speech-text">{currentDialogue?.reply?.text ?? 'None admitted for this displayed case.'}</span></p>
                </details>
              </section>
              <p role="status" aria-live="polite" aria-atomic="true">
                {viewerFailure ?? compositionNotice ?? composition.error?.message ?? (revealing ? 'Preparing the room display for your requested reveal…' : composition.status === 'idle' && composition.displayed ? 'Composed room displayed.' : compositionText[composition.status])}
                {composition.pending && composition.status !== 'ready' && !revealing ? ' A previously built room is still pending explicit reveal.' : ''}
              </p>
              {currentDialogue && <section className="room-investigation" ref={questionResult} aria-labelledby="question-title">
                <h3 id="question-title">Ask about this case</h3>
                <details className="fine-print"><summary>How paid questions work</summary>
                  <p id="question-policy">Ask EVA uses the current editable draft as a single-line question, up to 2,000 characters. Dictation only edits that draft; asking is explicit. Only the public roster, discovered annotations and bounded public history are sent. No new room is requested.</p>
                  <p>Narration is off by default. If enabled, each question may spend one of three server attempts. Disabled, unavailable or invalid narration gets a labeled local/scripted fallback. No automatic retry. Stop question also cancels pending room work; charges cannot be recalled.</p>
                </details>
                <div role="status" aria-live="polite" aria-atomic="true">
                  <p>{currentDialogue.pending ? 'Awaiting a validated reply. Any earlier admitted reply below is retained, not a response to the pending question.' : 'No question in progress. Only admitted replies are shown below; a stopped question has no fabricated answer.'}</p>
                  {currentDialogue.reply ? <>
                    <p><strong>Last answered question:</strong> {currentDialogue.reply.question}</p>
                    <p><strong>{currentDialogue.reply.origin === 'model' ? 'EVA · model-proposed narration' : 'Local/scripted EVA · not live model reasoning'}:</strong> {currentDialogue.reply.text}</p>
                    {currentDialogue.reply.origin === 'local-script' && <p><strong>Fallback reason:</strong> {investigationNarrationMessages[currentDialogue.reply.reason as keyof typeof investigationNarrationMessages]}</p>}
                    <p>Cited discoveries: {currentDialogue.reply.clueIds.join(', ') || 'none'}. Narration is not evidence or permission; local rules alone assess challenges and resolve the case.</p>
                  </> : <p>No investigation reply admitted. Type a question above, then choose Ask EVA.</p>}
                </div>
              </section>}
              {inspection && <section className="room-inspection" ref={inspectionPanel} aria-labelledby="inspection-title" aria-describedby="inspection-policy">
                <h3 id="inspection-title">Inspect objects</h3>
                <p id="inspection-policy">Fixed facts within this fictional case: text-only annotations, not rendered props or marks and not observed real-world evidence.</p>
                <ul className="inspection-objects" aria-label="Case-bound furnishings">
                  {inspection.objects.map(object => <li key={object.id}>
                    <button type="button" aria-pressed={object.id === inspection.selectedObjectId} onClick={() => inspectObject(inspection.unit, object.id)}>
                      Inspect {object.label}
                    </button>
                  </li>)}
                </ul>
                <div ref={inspectionResult} role="status" aria-live="polite" aria-atomic="true">
                  {selectedObject ? <>
                    <p><strong>{selectedObject.label}</strong></p>
                    {selectedClues.length ? <ul>{selectedClues.map(clue => <li key={clue.id}>{clue.text}</li>)}</ul>
                      : <p>No attached fictional clues on this object.</p>}
                  </> : <p>Click a furnishing in the room or choose an object above.</p>}
                </div>
                <h3>Discovered clues ({inspection.discoveredClues.length})</h3>
                {inspection.discoveredClues.length ? <ul aria-label="Discovered fictional clues">
                  {inspection.discoveredClues.map(clue => <li key={clue.id}>
                    <strong>{inspection.objects.find(object => object.id === clue.objectId)?.label}:</strong> {clue.text}
                  </li>)}
                </ul> : <p>No clues discovered yet.</p>}
              </section>}
              {inspection && investigation && <section className="room-reconstruction" aria-labelledby="prop-title" aria-describedby="prop-policy">
                <h3 id="prop-title">Object appearance</h3>
                <p id="prop-policy">Paid generation: an OpenAI reference image, then a Meshy 3D model made from it. Each Generate uses up to one image and one model allowance on this server run and one of this case's three local attempts. No automatic retries. Appearance only: the object's facts, clues and history never change.</p>
                <p id="prop-availability">
                  {propStatus === 'unchecked' ? 'Paid generation status not checked yet.' : propStatus === 'checking' ? 'Checking paid generation status…'
                    : `Image (OpenAI): ${propRouteText[propStatus.image.phase]}. Model (Meshy): ${propRouteText[propStatus.mesh.phase]}.`}
                  {' '}Image allowance {propChecked?.image.remaining ?? '?'}/3 · Model allowance {propChecked?.mesh.remaining ?? '?'}/3 (this server run) · Local attempts {composition.props.remainingRequests}/3
                </p>
                <label htmlFor="prop-description">Visual description{selectedObject ? ` · ${selectedObject.label}` : ' · select an object above'}</label>
                <input id="prop-description" ref={propInput} type="text" maxLength={240} value={propDescription} disabled={!selectedObject || propPending || resetRequested}
                  aria-describedby="prop-policy prop-availability prop-state" onChange={event => {
                    if (selectedObject) setPropDraft({ unit: investigation.unit, objectId: selectedObject.id, text: event.target.value });
                  }} />
                <div className="composition-actions">
                  <button type="button" disabled={!canGeneratePropNow} aria-describedby="prop-policy prop-availability" onClick={generateProp}>Generate prop (paid)</button>
                  <button type="button" ref={propCancelButton} disabled={!propPending} onClick={cancelPropGeneration}>Cancel prop work</button>
                  <button type="button" disabled={!propRecheckable || propPending} onClick={refreshPropStatus}>Recheck generation status</button>
                </div>
                <p id="prop-state" role="status" aria-live="polite" aria-atomic="true">
                  Prop state: {propPhaseText[composition.props.phase]}{composition.props.phase === 'rejected' && composition.props.reason ? ` (${composition.props.reason})` : ''}
                  {propPending ? ' The current visual is held until installation succeeds. Cancel prop work, Stop all and Escape stop local work; a submitted remote job is not cancelled.' : ''}
                  {currentPropNotice ? ` ${currentPropNotice}` : ''}
                </p>
              </section>}
              {inspection && investigation && reconstruction && <section className="room-reconstruction" aria-labelledby="paint-title" aria-describedby="paint-availability">
                <h3 id="paint-title">Room look</h3>
                <details className="fine-print"><summary>How paid painting works</summary>
                  <p id="paint-policy">Paint room sends this room’s current layout as a depth map, never visitor words, to World Labs Atlas (atlasChisel). It returns one photographic view from the centre viewpoint, which is laid over the room. Each Paint uses one of three allowances on this server run. The API shows no price before spending; each task may be charged. No automatic retries; stopping does not cancel a submitted remote task. Appearance only: objects, clues and history are unchanged. Away from the centre view, surfaces hidden in the painting show stretched paint, and generated props keep their own look.</p>
                </details>
                <p id="paint-availability">
                  {paintStatus === 'unchecked' ? 'Paint status not checked yet.' : paintStatus === 'checking' ? 'Checking paint status…' : `World Labs: ${propRouteText[paintStatus.phase]}.`}
                  {' '}Paint allowance {paintChecked?.remaining ?? '?'}/3 (this server run)
                </p>
                <div className="composition-actions">
                  <button type="button" disabled={!canPaint} aria-describedby="paint-policy paint-availability" onClick={paintRoom}>Paint room (paid)</button>
                  <button type="button" disabled={!painting} onClick={cancelPaint}>Stop painting</button>
                  <button type="button" disabled={painting || !paintChecked || !['unreachable', 'busy'].includes(paintChecked.phase)} onClick={refreshPaintStatus}>Recheck paint status</button>
                </div>
                <p id="paint-state" role="status" aria-live="polite" aria-atomic="true">{paintText}</p>
              </section>}
              {reconstruction && editFields && currentFurnishing && originalFurnishing && <section className="room-reconstruction" aria-labelledby="reconstruction-title" aria-describedby="reconstruction-policy">
                <h3 id="reconstruction-title">Bounded reconstruction edits</h3>
                <p id="reconstruction-policy">Move or turn existing furnishings only, in room-space units. Apply validates room margins, furnishing clearance and the doorway aisle. Fictional case facts and text-only clues do not move into rendered marks.</p>
                <form onSubmit={applyReconstructionEdit} noValidate>
                  <label htmlFor="reconstruction-furnishing">Existing furnishing</label>
                  <select id="reconstruction-furnishing" value={furnishingIndex} onChange={event => {
                    const index = Number(event.target.value);
                    const item = reconstruction.current.furnishings[index];
                    if (item) setEditDraft({ unit: reconstruction.unit, revision: reconstruction.revision, furnishingIndex: index,
                      x: String(item.x), z: String(item.z), rotation: String(item.rotation) });
                  }}>
                    {reconstruction.current.furnishings.map((item, index) => <option key={index} value={index}>{item.color} {item.kind} {index + 1}</option>)}
                  </select>
                  <p>Accepted original: {poseText(originalFurnishing)}.</p>
                  <p>Current reconstruction · revision {reconstruction.revision}: {poseText(currentFurnishing)}.</p>
                  <div className="reconstruction-fields">
                    <label htmlFor="reconstruction-x">Position x
                      <input id="reconstruction-x" type="number" step="any" min={-reconstruction.current.description.width / 2} max={reconstruction.current.description.width / 2}
                        value={editFields.x} onChange={event => setEditDraft({ ...editFields, x: event.target.value })} />
                    </label>
                    <label htmlFor="reconstruction-z">Position z
                      <input id="reconstruction-z" type="number" step="any" min={3 - reconstruction.current.description.depth} max={2}
                        value={editFields.z} onChange={event => setEditDraft({ ...editFields, z: event.target.value })} />
                    </label>
                    <label htmlFor="reconstruction-rotation">Orientation
                      <select id="reconstruction-rotation" value={editFields.rotation} onChange={event => setEditDraft({ ...editFields, rotation: event.target.value })}>
                        {[0, 90, 180, 270].map(rotation => <option key={rotation} value={rotation}>{rotation}°</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="reconstruction-feedback" ref={reconstructionResult}>
                    <button type="submit">Apply reconstruction edit</button>
                    <p role="status" aria-live="polite" aria-atomic="true">{currentEditNotice ?? 'Typing changes nothing. Apply explicitly; an invalid edit leaves the room and investigation unchanged.'}</p>
                  </div>
                </form>
              </section>}
              {inspection && investigation && <section className="room-investigation" aria-labelledby="investigation-title" aria-describedby="investigation-policy">
                <h3 id="investigation-title">Candidate hypotheses</h3>
                <p id="investigation-policy">Visitor hypotheses are separate from fixed fictional facts. Local rules assess all discovered clues, not just your citations. Not contradicted is not proved. No model call is made.</p>
                <form onSubmit={recordHypothesis}>
                  <fieldset>
                    <legend>Candidate · visitor hypothesis</legend>
                    <div className="investigation-candidates">
                      {investigation.candidates.map(candidate => <label key={candidate.id}>
                        <input type="radio" name="hypothesis-candidate" value={candidate.id} checked={candidateId === candidate.id}
                          onChange={() => setHypothesisDraft({ unit: investigation.unit, candidateId: candidate.id, clueIds: citedClues })} />
                        <span><strong>{candidate.id}</strong><br />{candidate.badge} badge · {candidate.fabric}</span>
                      </label>)}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend>Cite discovered clues</legend>
                    {inspection.discoveredClues.length ? inspection.discoveredClues.map(clue => <label className="investigation-citation" key={clue.id}>
                      <input type="checkbox" name="hypothesis-clue" value={clue.id} checked={citedClues.includes(clue.id)}
                        onChange={event => setHypothesisDraft({ unit: investigation.unit, candidateId,
                          clueIds: event.target.checked ? [...citedClues, clue.id] : citedClues.filter(id => id !== clue.id) })} />
                      <span><strong>{clue.id}:</strong> {clue.text}</span>
                    </label>) : <p>No clues discovered. A proposal now is insufficient, not an answer.</p>}
                  </fieldset>
                  <div className="hypothesis-feedback" ref={hypothesisResult}>
                    <button type="submit" disabled={!candidateId}>{hypothesis ? 'Record hypothesis revision' : 'Record hypothesis'}</button>
                    <div role="status" aria-live="polite" aria-atomic="true">
                      {hypothesis ? <>
                        <p><strong>Visitor revision {hypothesis.revision}: {hypothesis.candidateId}</strong> · cited {hypothesis.clueIds.join(', ') || 'none'}.</p>
                        <p>Local-rule assessment at proposal: <strong>{assessmentText[hypothesis.assessment.status]}</strong></p>
                        <p>Assessed discoveries: {hypothesis.assessment.clueIds.join(', ') || 'none'}.{hypothesis.assessment.contradictingClueIds.length ? ` Conflicts: ${hypothesis.assessment.contradictingClueIds.join(', ')}.` : ''}</p>
                        {newerEvidence && <p className="hypothesis-stale">New evidence discovered since this proposal. Record a revision to assess it; the earlier result is not a current assessment.</p>}
                      </> : <p>No hypothesis recorded. Choosing a candidate alone records nothing.</p>}
                    </div>
                  </div>
                  <section className="investigation-dialogue" aria-labelledby="local-eva-title">
                    <h4 id="local-eva-title">Recorded EVA statements</h4>
                    <p>Admitted model suspicions are recorded automatically with their original citations. The button below instead requests a fixed local/scripted suspicion about the selected candidate. Neither source is a discovery, proof or evidence for itself.</p>
                    <div className="statement-feedback" ref={statementResult}>
                      <button type="button" disabled={!candidateId} onClick={requestLocalStatement}>Request local/scripted EVA statement</button>
                      <div role="status" aria-live="polite" aria-atomic="true">
                        {localFeedback?.kind === 'statement' && localFeedback.error && <p>{localFeedback.error}</p>}
                        {latestStatement ? <>
                          <p><strong>Latest recorded statement · {latestStatement.id} · {latestStatement.origin === 'model' ? 'model-proposed' : 'local/scripted'}:</strong> {latestStatement.text}</p>
                          {latestStatement.origin === 'model' && <p>Original model citations: {latestStatement.clueIds.join(', ') || 'none'}. These remain the original contribution, not a new local assessment.</p>}
                        </> : <p>No statements recorded. Local requests use a fixed script; only admitted model suspicions become model statements.</p>}
                      </div>
                    </div>
                  </section>
                  <section className="investigation-dialogue" aria-labelledby="challenge-title">
                    <h4 id="challenge-title">Challenge a recorded statement</h4>
                    <label htmlFor="challenge-statement">Recorded statement · model or local/scripted</label>
                    <select id="challenge-statement" name="challenge-statement" value={selectedStatementId} disabled={!investigation.statements.length}
                      onChange={event => setStatementSelection({ unit: investigation.unit, id: event.target.value })}>
                      <option value="">Choose a recorded statement</option>
                      {investigation.statements.map(item => <option key={item.id} value={item.id}>{item.id} · {item.origin === 'model' ? 'model' : 'local/scripted'} · {item.candidateId}</option>)}
                    </select>
                    {selectedStatement && <>
                      <p><strong>{selectedStatement.origin === 'model' ? 'Model-proposed statement' : 'Local/scripted statement'}:</strong> {selectedStatement.text}</p>
                      {selectedStatement.origin === 'model' && <p>Original model citations: {selectedStatement.clueIds.join(', ') || 'none'}. Choose discovered clues above for an independent challenge.</p>}
                    </>}
                    <p>Uses the discovered citations checked above: {citedClues.join(', ') || 'none'}. With citations, local rules check all discoveries; a compatible statement is not proof.</p>
                    <div className="challenge-feedback" ref={challengeResult}>
                      <button type="button" disabled={!selectedStatement} onClick={challengeStatement}>Challenge selected statement</button>
                      <div role="status" aria-live="polite" aria-atomic="true">
                        {localFeedback?.kind === 'challenge' && localFeedback.error && <p>{localFeedback.error}</p>}
                        {latestChallenge ? <>
                          <p><strong>Latest recorded challenge · {latestChallenge.statementId}</strong> · visitor cited {latestChallenge.clueIds.join(', ') || 'none'}.</p>
                          <p>Local-rule assessment at challenge: <strong>{challengeText[latestChallenge.assessment.status]}</strong></p>
                          <p>Assessed discoveries: {latestChallenge.assessment.clueIds.join(', ') || 'none'}.{latestChallenge.assessment.contradictingClueIds.length ? ` Conflicts: ${latestChallenge.assessment.contradictingClueIds.join(', ')}.` : ''}</p>
                          {challengeHasNewEvidence && <p className="hypothesis-stale">New evidence discovered since this challenge. Challenge again to assess it; the earlier result is not a current assessment.</p>}
                        </> : <p>No challenge recorded. A statement cannot serve as its own evidence.</p>}
                      </div>
                    </div>
                  </section>
                  <section className="investigation-dialogue" aria-labelledby="resolution-title">
                    <h4 id="resolution-title">Accuse and resolve</h4>
                    <p>Local rules, not EVA, decide resolution. The cited discoveries must independently identify one candidate and all discoveries must agree. A lucky guess is insufficient.</p>
                    <p>Selected accusation: {candidateId || 'no candidate'} · discovered citations: {citedClues.join(', ') || 'none'}.</p>
                    <div className="accusation-feedback" ref={accusationResult}>
                      <button type="button" disabled={!candidateId} aria-disabled={resolution?.status === 'resolved'} onClick={accuseCandidate}>Accuse selected candidate</button>
                      <div role="status" aria-live="polite" aria-atomic="true">
                        {localFeedback?.kind === 'accusation' && localFeedback.error && <p>{localFeedback.error}</p>}
                        {resolution ? <>
                          <p><strong>Local-rule accusation outcome: {resolutionText[resolution.status]}.</strong></p>
                          <p>Visitor accused {resolution.candidateId}; cited {resolution.clueIds.join(', ') || 'none'}.</p>
                          <p>{resolution.explanation}</p>
                          {resolution.status === 'resolved' && <p>Resolution is recorded. Further accusations are disabled; inspection and bounded reconstruction edits remain available.</p>}
                        </> : <p>No accusation recorded. Hypotheses and EVA statements cannot resolve the case.</p>}
                      </div>
                    </div>
                  </section>
                </form>
                <details className="investigation-history">
                  <summary>Session investigation history ({investigation.history.length})</summary>
                  <p>Only actions taken here. Visitor questions, model-proposed replies, local scripts and independent local-rule assessments retain their separate provenance.</p>
                  {investigation.history.length ? <ol>{investigation.history.map((entry, index) => <li key={index}>
                    {entry.kind === 'inspection' ? <>
                      <strong>Visitor · inspection:</strong> {inspection.objects.find(object => object.id === entry.objectId)?.label ?? entry.objectId}.
                      {' '}New discoveries: {entry.clueIds.join(', ') || 'none'}.
                    </> : entry.kind === 'reconstruction-edit' ? <>
                      <strong>Visitor · reconstruction revision {entry.revision}:</strong> furnishing {entry.furnishingIndex + 1}.
                      {' '}{poseText(entry.before)} → {poseText(entry.after)}. Fixed case facts unchanged.
                    </> : entry.kind === 'statement' ? <>
                      <strong>{entry.origin === 'model' ? 'Model-proposed' : 'Local script · requested'} statement {entry.statement.id}:</strong> {entry.statement.text}
                      {entry.origin === 'model' ? <p>Original model citations: {entry.statement.clueIds.join(', ') || 'none'}. Not evidence or proof.</p>
                        : <p>Requested by visitor action, not model participation.</p>}
                    </> : entry.kind === 'challenge' ? <>
                      <strong>Visitor · challenge to {entry.challenge.statementId}:</strong> cited {entry.challenge.clueIds.join(', ') || 'none'}.
                      <p>Local-rule assessment at challenge: {challengeText[entry.challenge.assessment.status]} Assessed: {entry.challenge.assessment.clueIds.join(', ') || 'none'}.
                        {entry.challenge.assessment.contradictingClueIds.length ? ` Conflicts: ${entry.challenge.assessment.contradictingClueIds.join(', ')}.` : ''}</p>
                    </> : entry.kind === 'accusation' ? <>
                      <strong>Visitor · accusation:</strong> {entry.result.candidateId}; cited {entry.result.clueIds.join(', ') || 'none'}.
                      <p>Local-rule outcome: {resolutionText[entry.result.status]}. {entry.result.explanation}</p>
                    </> : entry.kind === 'question' ? <>
                      <strong>Visitor · investigation question:</strong> {entry.question}
                    </> : entry.kind === 'reply' ? <>
                      <strong>{entry.origin === 'model' ? 'Model-proposed narration' : 'Local/scripted fallback'}:</strong> {entry.reply.text}
                      <p>In response to: {entry.reply.question}. Cited discoveries: {entry.reply.clueIds.join(', ') || 'none'}. Not evidence or proof.</p>
                      {entry.origin === 'local-script' && <p>{investigationNarrationMessages[entry.reply.reason as keyof typeof investigationNarrationMessages]}</p>}
                    </> : <>
                      <strong>Visitor · revision {entry.hypothesis.revision}:</strong> {entry.hypothesis.candidateId}; cited {entry.hypothesis.clueIds.join(', ') || 'none'}.
                      <p>Local-rule assessment at proposal: {assessmentText[entry.hypothesis.assessment.status]} Assessed: {entry.hypothesis.assessment.clueIds.join(', ') || 'none'}.
                        {entry.hypothesis.assessment.contradictingClueIds.length ? ` Conflicts: ${entry.hypothesis.assessment.contradictingClueIds.join(', ')}.` : ''}</p>
                    </>}
                  </li>)}</ol> : <p>No investigation actions yet.</p>}
                </details>
              </section>}
              <p><strong>Proposed case:</strong> {composition.pending && composition.accepted
                ? roomCasePremise(composition.accepted.case, composition.accepted.description)
                : 'None pending reveal.'}</p>
              <p><strong>Displayed case:</strong> {viewerFailure ? 'None visible (renderer unavailable).' : !viewerReady ? 'None visible; room display is not ready.'
                : composition.displayed ? roomCasePremise(composition.displayed.case, composition.displayed.description)
                  : 'None; authored fixture only.'}</p>
              {selectedSuggestion.length > 2000 && <p>Suggestion too long. Shorten it before composing; no request will be sent.</p>}
              {composition.cleanupError && <p role="status">{composition.cleanupError}</p>}
              <div className="composition-availability">
                <p>Last status check: {availabilityText[availability.phase]}{availability.remaining !== null ? ` Server attempts remaining: ${availability.remaining} / 3.` : ''}</p>
                <button type="button" disabled={availability.phase === 'checking' || composing} onClick={refreshAvailability}>Check status</button>
              </div>
              {submittedSuggestion && <p title={submittedSuggestion.text}>Last attempt: {submittedSuggestion.source.toLowerCase()}, {submittedSuggestion.text.length} characters, seed {submittedSuggestion.seed}. Input was snapshotted at Compose.</p>}
              {composition.interpretation && <p>Validated interpretation: {composition.interpretation.outcome}. {composition.interpretation.unsupported.length ? `Not included: ${composition.interpretation.unsupported.join('; ')}.` : 'No omissions reported.'} Room facts below come from the accepted plan, not EVA’s prose.</p>}
              {composition.accepted && <p>Last validated data (not necessarily displayed): {roomMetadata(composition.accepted)}</p>}
              <p>{viewerFailure ? 'Displayed: none (renderer unavailable).' : !viewerReady ? roomRevealed ? 'Displayed: none; renderer preparing.' : 'Displayed: none; room not yet revealed.' : composition.displayed ? `Displayed: ${roomMetadata(composition.displayed)}` : 'Displayed: authored fixture; no composed room installed.'}</p>
              <details className="fine-print"><summary>How paid composing works</summary><p id="composition-policy">Send stays local. Compose sends only the selected suggestion for one paid interpretation and reply. Reply pacing is presentation, not provider streaming. Rooms use finite vocabulary and local seeded geometry; pools and configurable lighting are unsupported. No automatic reveal, retry or substitute reply. Stop reply leaves composition running. Stop composition cancels an awaiting shared interpretation and its reply; after acceptance, reply presentation is independent. Tracking stops separately. Charges cannot be recalled; server restart does not renew approval.</p></details>
            </div>
          </section>
        </section>
      </main>

      <footer className="operational-note">
        Compose: validated interpretation · Case replies: labeled model or local/scripted · Speech and narration off by default · No session persistence · Esc stops active work; during reset confirmation it keeps the visitor and stops speech, local prop work and any pending question
      </footer>
    </div>
  );
}
