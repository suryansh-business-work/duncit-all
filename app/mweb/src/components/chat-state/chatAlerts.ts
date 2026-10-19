import { playMessagePing } from '@duncit/ui';
import { CHAT_NEW_EVENT, createChatPingGate, parseChatNewFrame, type ChatNewFrame } from '@duncit/utils';

/**
 * The tab-wide side of chat alerts. The session socket (main.tsx) hands every
 * `chat:new` frame to the page as a DOM event, so whatever is mounted — the
 * app-wide toast, the Chats badge — listens without opening a socket of its own.
 */
const CHAT_NEW_DOM_EVENT = 'duncit:chat-new';
const CHAT_READ_DOM_EVENT = 'duncit:chat-read';

/** One gate for the whole tab: the open room and the app-wide toast share it,
 * so a burst across rooms still makes one ping. */
const shouldPing = createChatPingGate();

/** Pings for a message unless the burst it belongs to already pinged. */
export function pingForMessage(messageId: string): void {
  if (shouldPing(messageId)) playMessagePing();
}

interface SocketLike {
  on(event: string, handler: (payload: unknown) => void): unknown;
}

/** Wires a socket's `chat:new` frames to the page. */
export function forwardChatNew(socket: SocketLike): void {
  socket.on(CHAT_NEW_EVENT, (raw) => {
    const frame = parseChatNewFrame(raw);
    if (frame) globalThis.dispatchEvent(new CustomEvent<ChatNewFrame>(CHAT_NEW_DOM_EVENT, { detail: frame }));
  });
}

/** Listens for `chat:new` frames; returns the unsubscribe. */
export function onChatNew(handler: (frame: ChatNewFrame) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<ChatNewFrame>).detail);
  globalThis.addEventListener(CHAT_NEW_DOM_EVENT, listener);
  return () => globalThis.removeEventListener(CHAT_NEW_DOM_EVENT, listener);
}

/** Says a room was just read, so unread counts refresh. */
export function announceChatRead(): void {
  globalThis.dispatchEvent(new Event(CHAT_READ_DOM_EVENT));
}

/** Listens for rooms being read; returns the unsubscribe. */
export function onChatRead(handler: () => void): () => void {
  globalThis.addEventListener(CHAT_READ_DOM_EVENT, handler);
  return () => globalThis.removeEventListener(CHAT_READ_DOM_EVENT, handler);
}
