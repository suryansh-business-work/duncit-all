/**
 * Ask Duncit — the framework-free half shared by mWeb (MUI) and the native app
 * (Tamagui): the message model, how streamed socket events fold into it, the
 * localization keys for every server code, and the small rules both screens
 * follow (page context, auto-scroll, which suggestions to show). The two UIs
 * render this state; neither owns its own copy of these rules.
 */

import {
  ACTION_STATUS_KEYS,
  ERROR_KEYS,
  HANDOVER_TEAM_KEYS,
  ROLE_LABEL_KEYS,
  TOOL_STATUS_KEYS,
  UNAVAILABLE_KEYS,
  VOICE_ERROR_KEYS,
  keyFor,
} from './ask-duncit-copy';

/** Socket events the server streams to the asker's own room. */
export const ASK_DUNCIT_SOCKET_EVENTS = {
  start: 'askDuncit:start',
  delta: 'askDuncit:delta',
  tool: 'askDuncit:tool',
  action: 'askDuncit:action',
  done: 'askDuncit:done',
  error: 'askDuncit:error',
} as const;

/** Plain-HTTP voice endpoints, relative to the API base. */
export const ASK_DUNCIT_TRANSCRIBE_PATH = '/ask-duncit/transcribe';
export const ASK_DUNCIT_SPEAK_PATH = '/ask-duncit/speak';

export interface AskDuncitActionView {
  id: string;
  tool: string;
  tool_title: string;
  risk: string;
  args_preview: string;
  status: string;
  error_message: string;
  can_rollback: boolean;
  expires_at: string;
}

export interface AskDuncitToolCallView {
  name: string;
  title: string;
  status: string;
  action_id?: string | null;
}

export interface AskDuncitAttachmentView {
  url: string;
  kind: string;
  name: string;
  mime?: string;
  size?: number;
}

export interface AskDuncitMessageView {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: string;
  attachments: AskDuncitAttachmentView[];
  tool_calls: AskDuncitToolCallView[];
  actions: AskDuncitActionView[];
  knowledge_refs?: Array<{ id: string; title: string }>;
  feedback_rating?: string | null;
  low_confidence?: boolean;
  out_of_context?: boolean;
  error_code?: string | null;
  created_at: string;
}

export interface AskDuncitThreadState {
  conversationId: string | null;
  messages: AskDuncitMessageView[];
  /** The answer currently streaming, if any. */
  streamingId: string | null;
  hasMore: boolean;
}

export const emptyThread = (conversationId: string | null = null): AskDuncitThreadState => ({
  conversationId,
  messages: [],
  streamingId: null,
  hasMore: false,
});

const nowIso = () => new Date().toISOString();

/** Show the question at once, before the server answers. */
export function addOptimisticQuestion(
  state: AskDuncitThreadState,
  tempId: string,
  content: string,
  attachments: AskDuncitAttachmentView[] = []
): AskDuncitThreadState {
  const message: AskDuncitMessageView = { id: tempId, role: 'user', content, status: 'COMPLETE', attachments, tool_calls: [], actions: [], created_at: nowIso() };
  return { ...state, messages: [...state.messages, message] };
}

/** The server accepted the turn: give the question its real id and add the answer placeholder. */
export function acceptTurn(
  state: AskDuncitThreadState,
  tempId: string,
  result: { conversation_id: string; user_message_id: string; message_id: string; status: string }
): AskDuncitThreadState {
  const blocked = result.status === 'BLOCKED';
  const messages = state.messages.map((m) => (m.id === tempId ? { ...m, id: result.user_message_id } : m));
  const answer: AskDuncitMessageView = {
    id: result.message_id,
    role: 'assistant',
    content: '',
    status: blocked ? 'COMPLETE' : 'STREAMING',
    attachments: [],
    tool_calls: [],
    actions: [],
    error_code: blocked ? 'INJECTION_BLOCKED' : null,
    created_at: nowIso(),
  };
  return {
    ...state,
    conversationId: result.conversation_id,
    messages: messages.some((m) => m.id === answer.id) ? messages : [...messages, answer],
    streamingId: blocked ? null : result.message_id,
  };
}

/** The send failed before the server took it: drop the optimistic question. */
export const rejectTurn = (state: AskDuncitThreadState, tempId: string): AskDuncitThreadState => ({
  ...state,
  messages: state.messages.filter((m) => m.id !== tempId),
});

function patch(state: AskDuncitThreadState, id: string, fn: (m: AskDuncitMessageView) => AskDuncitMessageView): AskDuncitThreadState {
  if (!state.messages.some((m) => m.id === id)) return state;
  return { ...state, messages: state.messages.map((m) => (m.id === id ? fn(m) : m)) };
}

export const applyDelta = (state: AskDuncitThreadState, event: { message_id: string; text: string }) =>
  patch(state, event.message_id, (m) => ({ ...m, content: m.content + event.text }));

/** A tool started or finished. A finished one replaces its RUNNING line. */
export function applyToolEvent(state: AskDuncitThreadState, event: { message_id: string; name: string; title?: string; status: string }) {
  return patch(state, event.message_id, (m) => {
    const others = m.tool_calls.filter((c) => !(c.name === event.name && c.status === 'RUNNING'));
    return { ...m, tool_calls: [...others, { name: event.name, title: event.title ?? event.name, status: event.status }] };
  });
}

/** A proposed change appeared or moved on; it lives on whichever message carries it (or the streaming one). */
export function applyActionEvent(state: AskDuncitThreadState, action: AskDuncitActionView): AskDuncitThreadState {
  const owner = state.messages.find((m) => m.actions.some((a) => a.id === action.id)) ?? state.messages.find((m) => m.id === state.streamingId);
  if (!owner) return state;
  return patch(state, owner.id, (m) => {
    const exists = m.actions.some((a) => a.id === action.id);
    return { ...m, actions: exists ? m.actions.map((a) => (a.id === action.id ? action : a)) : [...m.actions, action] };
  });
}

/** The stored message is the truth: replace the streamed copy with it. */
export function applyFinal(state: AskDuncitThreadState, message: AskDuncitMessageView): AskDuncitThreadState {
  const exists = state.messages.some((m) => m.id === message.id);
  return {
    ...state,
    messages: exists ? state.messages.map((m) => (m.id === message.id ? message : m)) : [...state.messages, message],
    streamingId: state.streamingId === message.id ? null : state.streamingId,
  };
}

export function applyFailure(state: AskDuncitThreadState, event: { message_id: string; code?: string | null }) {
  const next = patch(state, event.message_id, (m) => ({ ...m, status: 'FAILED', error_code: event.code ?? 'INTERNAL' }));
  return { ...next, streamingId: next.streamingId === event.message_id ? null : next.streamingId };
}

/** Older messages loaded above; duplicates (already on screen) are skipped. */
export function prependOlder(state: AskDuncitThreadState, older: AskDuncitMessageView[], hasMore: boolean): AskDuncitThreadState {
  const seen = new Set(state.messages.map((m) => m.id));
  return { ...state, messages: [...older.filter((m) => !seen.has(m.id)), ...state.messages], hasMore };
}

/* ------------------------------- small rules ------------------------------- */

/** Within this many pixels of the bottom counts as "reading the latest" — new text keeps scrolling. */
export const NEAR_BOTTOM_PX = 80;

export const isNearBottom = (offsetFromBottom: number, threshold = NEAR_BOTTOM_PX): boolean => offsetFromBottom <= threshold;

export interface AskDuncitPageContext {
  route: string;
  entity_type: string;
  entity_id: string;
}

const ENTITY_ROUTES: ReadonlyArray<{ pattern: RegExp; type: string }> = [
  { pattern: /^\/pod\/([^/?#]+)/, type: 'POD' },
  { pattern: /^\/checkout\/([^/?#]+)/, type: 'POD' },
  { pattern: /^\/clubs?\/([^/?#]+)/, type: 'CLUB' },
  { pattern: /^\/venues?\/([^/?#]+)/, type: 'VENUE' },
  { pattern: /^\/(?:u|hosts)\/([^/?#]+)/, type: 'PROFILE' },
];

/** The entity on screen, from the app path (mWeb routes; native deep links mirror them). */
export function pageContextFromPath(path: string | null | undefined): AskDuncitPageContext {
  /* v8 ignore next -- defensive: split() always returns at least one element */
  const route = (String(path ?? '').split(/[?#]/)[0] ?? '').slice(0, 300);
  for (const { pattern, type } of ENTITY_ROUTES) {
    const match = pattern.exec(route);
    /* v8 ignore next -- defensive: every ENTITY_ROUTES pattern has one capture group, so match[1] exists */
    if (match) return { route, entity_type: type, entity_id: decodeURIComponent(match[1] ?? '') };
  }
  if (route.startsWith('/profile')) return { route, entity_type: 'PROFILE', entity_id: '' };
  if (route.startsWith('/wallet')) return { route, entity_type: 'WALLET', entity_id: '' };
  return { route, entity_type: '', entity_id: '' };
}

/* ---------------------------- localization keys ---------------------------- */

type Translate = (key: string) => string;
type TranslateWithVars = (key: string, options?: { vars?: Record<string, string | number> }) => string;

export const roleLabelKey = (roleKey: string): string => keyFor(ROLE_LABEL_KEYS, roleKey, ROLE_LABEL_KEYS.MEMBER);

export const suggestionText = (s: { label?: string | null; label_key?: string | null }, t: Translate): string =>
  s.label?.trim() || (s.label_key ? t(s.label_key) : '');

/** Fill `{name}` placeholders of a localized alert with its JSON params. */
export function alertText(alert: { label_key: string; params: string }, t: TranslateWithVars): string {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(alert.params || '{}') as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  const vars: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(parsed)) {
    if (typeof value === 'number' || typeof value === 'string') vars[name] = value;
  }
  // The translator fills {name}; anything it left unfilled is filled here.
  return t(alert.label_key, { vars }).replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export const unavailableKey = (reason: string | null | undefined): string => keyFor(UNAVAILABLE_KEYS, reason, UNAVAILABLE_KEYS.DISABLED);

export const errorKey = (code: string | null | undefined): string => keyFor(ERROR_KEYS, code, ERROR_KEYS.INTERNAL);

export const actionStatusKey = (status: string): string => keyFor(ACTION_STATUS_KEYS, status, ACTION_STATUS_KEYS.PENDING);
export const toolStatusKey = (status: string): string => keyFor(TOOL_STATUS_KEYS, status, TOOL_STATUS_KEYS.OK);
export const voiceErrorKey = (code: string): string => keyFor(VOICE_ERROR_KEYS, code, VOICE_ERROR_KEYS.FAILED);

/** Whether the approve/reject buttons apply: pending and not past its expiry. */
export const canDecide = (action: Pick<AskDuncitActionView, 'status' | 'expires_at'>, now = Date.now()): boolean =>
  action.status === 'PENDING' && new Date(action.expires_at).getTime() > now;

let tempCounter = 0;

/** A fresh client id for an optimistic message (unique per session; never sent to the server). */
export function tempMessageId(): string {
  tempCounter += 1;
  return `temp-${Date.now().toString(36)}-${tempCounter}`;
}

/* --------------------------------- handover -------------------------------- */

/** The teams a conversation can be handed to — the server's HandoverTeam enum. */
export const ASK_DUNCIT_HANDOVER_TEAMS = ['SUPPORT', 'ADMIN', 'OPERATIONS'] as const;
export type AskDuncitHandoverTeam = (typeof ASK_DUNCIT_HANDOVER_TEAMS)[number];

/** The longest handover summary the server keeps. */
export const ASK_DUNCIT_HANDOVER_SUMMARY_MAX = 600;

export const isAskDuncitHandoverTeam = (value: unknown): value is AskDuncitHandoverTeam =>
  typeof value === 'string' && (ASK_DUNCIT_HANDOVER_TEAMS as readonly string[]).includes(value);

export const handoverTeamKey = (team: string): string => keyFor(HANDOVER_TEAM_KEYS, team, HANDOVER_TEAM_KEYS.SUPPORT);

/* ---------------------------------- bytes ---------------------------------- */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Bytes → standard base64, with no dependency on `btoa` or Buffer (neither is
 * guaranteed on every React Native engine). The native app writes the
 * read-aloud MP3 to a cache file with it.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    /* v8 ignore next -- defensive: i < bytes.length, so bytes[i] exists */
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    out += B64.charAt((triple >> 18) & 63) + B64.charAt((triple >> 12) & 63);
    out += i + 1 < bytes.length ? B64.charAt((triple >> 6) & 63) : '=';
    out += i + 2 < bytes.length ? B64.charAt(triple & 63) : '=';
  }
  return out;
}
