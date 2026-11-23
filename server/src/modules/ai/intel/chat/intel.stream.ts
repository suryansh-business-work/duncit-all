import { logs } from '@observability/log';
import { getIo, userRoom } from '@realtime/io';
import { INTEL_EVENTS, type IntelEvent } from '../intel.constants';

/**
 * How a turn reaches the screen: socket.io events to the asker's own room
 * (every tab they are signed in on joins it). The mutation that starts a turn
 * returns at once; the answer streams after it. The stored message is always
 * the truth — a client that missed frames re-reads it.
 *
 * Plus the in-process registry of running turns, so Stop can abort one.
 */

export function emitIntel(userId: string, event: IntelEvent, payload: Record<string, unknown>): void {
  try {
    getIo().to(userRoom(userId)).emit(INTEL_EVENTS[event], payload);
  } catch (error) {
    logs.server.debug('intel', 'emit', { error, event });
  }
}

const running = new Map<string, { controller: AbortController; userId: string }>();

export const intelTurns = {
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
    if (entry?.userId !== userId) return false;
    entry.controller.abort();
    return true;
  },
  isRunning: (messageId: string) => running.has(messageId),
};
