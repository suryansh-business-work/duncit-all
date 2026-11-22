import { logs } from '@observability/log';
import { getIo, userRoom } from '@realtime/io';
import { ASK_DUNCIT_EVENTS } from '../askDuncit.constants';

/**
 * How a turn reaches the screen: socket.io events to the asker's own room
 * (every device they are signed in on joins it). The mutation that starts a
 * turn returns at once with the message ids; the answer streams after it.
 * A client that missed frames re-reads the message by id — the stored message
 * is always the truth, the stream only makes it feel instant.
 *
 * Plus the in-process registry of running turns, so "Stop" can abort one.
 */

export type AskDuncitEvent = keyof typeof ASK_DUNCIT_EVENTS;

export function emitToUser(userId: string, event: AskDuncitEvent, payload: Record<string, unknown>): void {
  try {
    getIo().to(userRoom(userId)).emit(ASK_DUNCIT_EVENTS[event], payload);
  } catch (error) {
    // Not initialised in tests/CLI. The client still reads the stored message.
    logs.server.debug('askDuncit', 'emit', { error, event });
  }
}

/**
 * Text arrives a few characters at a time; sending a frame per token floods
 * slow phones. Deltas are batched and flushed every `intervalMs`.
 */
export function deltaBatcher(flush: (text: string) => void, intervalMs = 60) {
  let pending = '';
  let timer: NodeJS.Timeout | null = null;
  const send = () => {
    timer = null;
    if (!pending) return;
    const text = pending;
    pending = '';
    flush(text);
  };
  return {
    push(text: string) {
      pending += text;
      timer ??= setTimeout(send, intervalMs);
    },
    end() {
      if (timer) clearTimeout(timer);
      send();
    },
  };
}

const running = new Map<string, { controller: AbortController; userId: string }>();

export const turnRegistry = {
  start(messageId: string, userId: string): AbortController {
    const controller = new AbortController();
    running.set(messageId, { controller, userId });
    return controller;
  },
  finish(messageId: string): void {
    running.delete(messageId);
  },
  /** Only the person who started a turn can stop it. */
  stop(messageId: string, userId: string): boolean {
    const entry = running.get(messageId);
    if (!entry || entry.userId !== userId) return false;
    entry.controller.abort();
    return true;
  },
  isRunning: (messageId: string) => running.has(messageId),
};
