export type ConversationStatus = 'idle' | 'thinking' | 'speaking' | 'interrupted';

export type TranscriptMessage = {
  readonly turnId: number;
  readonly role: 'visitor' | 'eva';
  readonly text: string;
  readonly interrupted: boolean;
};

export type ConversationState = {
  readonly status: ConversationStatus;
  readonly turnId: number;
  readonly messages: readonly TranscriptMessage[];
};

export type ConversationEvent =
  | { type: 'submit'; text: string }
  | { type: 'compose'; text: string }
  | { type: 'chunk'; turnId: number; text: string }
  | { type: 'complete'; turnId: number }
  | { type: 'stop' }
  | { type: 'resume' }
  | { type: 'reset' };

export type TextReply = (input: string, signal: AbortSignal) => AsyncIterable<string>;

export const initialConversationState: ConversationState = {
  status: 'idle',
  turnId: 0,
  messages: [],
};

export function conversationReducer(state: ConversationState, event: ConversationEvent): ConversationState {
  const active = state.status === 'thinking' || state.status === 'speaking';
  switch (event.type) {
    case 'reset':
      return { status: 'idle', turnId: state.turnId + 1, messages: [] };
    case 'submit': {
      const text = event.text.trim();
      if (state.status !== 'idle' || !text || text.length > 2000) return state;
      const turnId = state.turnId + 1;
      return { status: 'idle', turnId, messages: [...state.messages, { turnId, role: 'visitor', text, interrupted: false }] };
    }
    case 'compose': {
      const text = event.text.trim();
      if (active || !text || text.length > 2000) return state;
      const turnId = state.turnId + 1;
      const latestVisitor = [...state.messages].reverse().find(message => message.role === 'visitor');
      return {
        status: 'thinking',
        turnId,
        messages: [
          ...state.messages,
          ...(latestVisitor?.text === text ? [] : [{ turnId, role: 'visitor' as const, text, interrupted: false }]),
          { turnId, role: 'eva', text: '', interrupted: false },
        ],
      };
    }
    case 'chunk':
      if (!active || event.turnId !== state.turnId || !event.text) return state;
      return {
        ...state,
        status: 'speaking',
        messages: state.messages.map(message =>
          message.turnId === state.turnId && message.role === 'eva'
            ? { ...message, text: message.text + event.text }
            : message),
      };
    case 'complete':
      if (!active || event.turnId !== state.turnId) return state;
      return { ...state, status: 'idle' };
    case 'stop':
      if (!active) return state;
      return {
        ...state,
        status: 'interrupted',
        messages: state.messages.map(message =>
          message.turnId === state.turnId && message.role === 'eva'
            ? { ...message, interrupted: true }
            : message),
      };
    case 'resume':
      return state.status === 'interrupted' ? { ...state, status: 'idle' } : state;
    default:
      return state;
  }
}
