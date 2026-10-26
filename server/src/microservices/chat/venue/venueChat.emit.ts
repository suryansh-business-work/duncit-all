import { getIo } from '@realtime/io';
import { venueChatRoomOf } from './venueChat.access';

/** Socket events a thread's members receive (`join_venue_chat` puts them in its room). */
export const VENUE_CHAT_EVENTS = {
  /** A new line, shaped as a PodMessage. */
  line: 'venue_chat_message',
  /** A line changed in place: edited, reacted to, or its counter revised. Carries the whole line. */
  update: 'venue_chat_update',
  /** A line was removed: `{ id, pod_id }`. */
  remove: 'venue_chat_delete',
  /** A member read the thread up to a time (a `VenueChatReadMark` with its `pod_id`). */
  read: 'venue_chat_read',
} as const;

/** Sends an event to everyone with the thread open. Never throws: the change itself is already saved. */
export function emitToThread(podId: string, event: string, payload: unknown) {
  try {
    getIo().to(venueChatRoomOf(podId)).emit(event, payload);
  } catch {
    // Socket server not initialised (scripts, tests). The change still lands on the next read.
  }
}
