/**
 * New-message alerts, mute and unread counts for pod and club chat rooms,
 * shared by mWeb and the native app (rule 27). Framework-free: each app keeps
 * its own sound, toast and badge; this decides when and what they show.
 */

/** A room the alerts are about. Support chat mutes too, but never pings here. */
export type ChatAlertRoomKind = 'POD' | 'CLUB';

/** The app-wide socket event the server emits to a member who is not in the room. */
export const CHAT_NEW_EVENT = 'chat:new';

/** One `chat:new` frame: enough to ping, show a toast and open the room. */
export interface ChatNewFrame {
  room_kind: ChatAlertRoomKind;
  room_id: string;
  message_id: string;
  /** The pod's title or the club's name. */
  title: string;
  sender_name: string;
  /** The message's text, shortened; empty for a photo or sticker. */
  preview: string;
  /** IMAGE / STICKER / TEXT — so the client words a photo in its own language. */
  type: string;
  /** The reader was @-mentioned (alerts even through a mute). */
  mentioned: boolean;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** A raw socket payload as a frame, or null when it is not one. */
export function parseChatNewFrame(raw: unknown): ChatNewFrame | null {
  if (!raw || typeof raw !== 'object') return null;
  const frame = raw as Record<string, unknown>;
  const kind = frame.room_kind;
  if (kind !== 'POD' && kind !== 'CLUB') return null;
  const roomId = text(frame.room_id);
  const messageId = text(frame.message_id);
  if (!roomId || !messageId) return null;
  return {
    room_kind: kind,
    room_id: roomId,
    message_id: messageId,
    title: text(frame.title),
    sender_name: text(frame.sender_name),
    preview: text(frame.preview),
    type: text(frame.type) || 'TEXT',
    mentioned: frame.mentioned === true,
  };
}

/** The room a screen has open, as both apps describe it. */
export interface OpenChatRoom {
  kind: ChatAlertRoomKind;
  id: string;
}

/** Whether the frame is about the room the reader already has open. */
export const isViewingRoom = (open: OpenChatRoom | null | undefined, frame: ChatNewFrame): boolean =>
  !!open && open.kind === frame.room_kind && open.id === frame.room_id;

/** The room a mWeb path opens (`/chats/:id`, `/chats/club/:id`), or null. */
export function chatRoomFromPath(path: string | null | undefined): OpenChatRoom | null {
  if (!path) return null;
  const club = /^\/chats\/club\/([^/?#]+)/.exec(path);
  if (club?.[1]) return { kind: 'CLUB', id: club[1] };
  const pod = /^\/chats\/([^/?#]+)/.exec(path);
  if (pod?.[1] && pod[1] !== 'club') return { kind: 'POD', id: pod[1] };
  return null;
}

/** A burst of messages makes one ping: no second ping inside this window. */
export const CHAT_PING_WINDOW_MS = 3000;

/** How many message ids the gate remembers, to drop a frame seen twice. */
const SEEN_LIMIT = 200;

/**
 * One gate per app: answers whether a message should make a sound. A message
 * id it has already seen never pings again (one socket can deliver a frame
 * twice across a reconnect), and inside `windowMs` of the last ping nothing
 * pings — the burst collapses into the first beep.
 */
export function createChatPingGate(
  windowMs = CHAT_PING_WINDOW_MS,
  now: () => number = Date.now,
): (messageId: string) => boolean {
  const seen: string[] = [];
  let lastPing = Number.NEGATIVE_INFINITY;
  return (messageId) => {
    if (seen.includes(messageId)) return false;
    seen.push(messageId);
    if (seen.length > SEEN_LIMIT) seen.shift();
    const at = now();
    if (at - lastPing < windowMs) return false;
    lastPing = at;
    return true;
  };
}

/** A busy open room marks itself read at most this often. */
export const CHAT_READ_MARK_EVERY_MS = 2000;

/** The read marker an open room drives (see {@link createChatReadMarker}). */
export interface ChatReadMarker {
  /** Mark read now — when the room opens. */
  now: () => void;
  /** A line arrived while the room is open: mark read soon, at most once per interval. */
  soon: () => void;
  /** The room closed: drop a mark still waiting. */
  cancel: () => void;
}

/**
 * The throttle behind both apps' `useMarkChatRead`: `send` runs at once on
 * open, then a burst of arriving lines collapses into one trailing mark no
 * sooner than `everyMs` after the last.
 */
export function createChatReadMarker(send: () => void, everyMs = CHAT_READ_MARK_EVERY_MS): ChatReadMarker {
  let last = Number.NEGATIVE_INFINITY;
  let pending: ReturnType<typeof setTimeout> | null = null;
  const fire = () => {
    last = Date.now();
    send();
  };
  return {
    now: fire,
    soon: () => {
      if (pending) return;
      const wait = Math.max(0, last + everyMs - Date.now());
      pending = setTimeout(() => {
        pending = null;
        fire();
      }, wait);
    },
    cancel: () => {
      if (pending) clearTimeout(pending);
      pending = null;
    },
  };
}

/** The mute lengths offered at the top of a chat. */
export const CHAT_MUTE_DURATIONS = ['EIGHT_HOURS', 'ONE_WEEK', 'ALWAYS'] as const;
export type ChatMuteDuration = (typeof CHAT_MUTE_DURATIONS)[number];

/** Whether a room's mute is in force now. A mute with no end lasts until undone. */
export function isChatMuted(
  state: { is_muted?: boolean | null; muted_until?: string | null } | null | undefined,
  now = Date.now(),
): boolean {
  if (!state?.is_muted) return false;
  if (!state.muted_until) return true;
  const until = Date.parse(state.muted_until);
  return Number.isNaN(until) || until > now;
}

export type ChatTranslate = (key: string, opts?: { vars?: Record<string, string | number> }) => string;

/**
 * The words for the mute menu, every key written out once (the translation
 * gate reads literal keys only).
 */
export function chatMuteCopy(t: ChatTranslate) {
  return {
    menuLabel: t('mweb.chatRoom.mute.menu'),
    mutedLabel: t('mweb.chatRoom.mute.muted'),
    unmute: t('mweb.chatRoom.mute.unmute'),
    failed: t('mweb.chatRoom.mute.failed'),
    options: {
      EIGHT_HOURS: t('mweb.chatRoom.mute.eightHours'),
      ONE_WEEK: t('mweb.chatRoom.mute.oneWeek'),
      ALWAYS: t('mweb.chatRoom.mute.always'),
    } satisfies Record<ChatMuteDuration, string>,
  };
}

/** An unread count as a badge shows it; nothing at all for zero. */
export function formatUnreadBadge(count: number | null | undefined, max = 99): string {
  if (!count || count <= 0) return '';
  return count > max ? `${max}+` : String(count);
}

/** The quoted line a reply carries, as the server embeds it. */
export interface ChatReplySnippet {
  id: string;
  user_name?: string | null;
  text?: string | null;
  type?: string | null;
  deleted?: boolean | null;
}

/** What a quote shows: the words, or which kind of line it was. */
export type ChatReplyPreview =
  | { kind: 'TEXT'; text: string }
  | { kind: 'IMAGE' }
  | { kind: 'STICKER' }
  | { kind: 'DELETED' };

/** Longest quote shown before it is cut with an ellipsis. */
export const CHAT_REPLY_PREVIEW_MAX = 140;

export function chatReplyPreview(reply: ChatReplySnippet): ChatReplyPreview {
  if (reply.deleted) return { kind: 'DELETED' };
  if (reply.type === 'IMAGE') return { kind: 'IMAGE' };
  if (reply.type === 'STICKER' && !reply.text) return { kind: 'STICKER' };
  const body = (reply.text ?? '').replace(/\s+/g, ' ').trim();
  const cut = body.length > CHAT_REPLY_PREVIEW_MAX ? `${body.slice(0, CHAT_REPLY_PREVIEW_MAX - 1)}…` : body;
  return { kind: 'TEXT', text: cut };
}

/**
 * A quote's words in the reader's language, every key written out once. Both
 * apps' reply strip and bubble quote read this.
 */
export function chatReplyText(reply: ChatReplySnippet, t: ChatTranslate): string {
  const preview = chatReplyPreview(reply);
  if (preview.kind === 'DELETED') return t('mweb.chatRoom.reply.deleted');
  if (preview.kind === 'IMAGE') return t('mweb.chatRoom.image');
  if (preview.kind === 'STICKER') return t('mweb.chatRoom.reply.sticker');
  return preview.text;
}

/** A `chat:new` frame's toast line: "Name: words", a photo named in words. */
export function chatNewToastLine(frame: ChatNewFrame, t: ChatTranslate): string {
  const words = frame.type === 'IMAGE' ? t('mweb.chatRoom.image') : frame.preview;
  return frame.sender_name ? `${frame.sender_name}: ${words}` : words;
}
