import { EventEmitter } from 'node:events';

/**
 * Process-local event bus used to push real-time notification deltas to
 * SSE-connected clients. Subscribers listen on `notify:{userId}` and receive
 * the user's current unread count plus the most recent notification id.
 *
 * NOTE: This is in-process only — for multi-instance deployments swap the
 * emitter for Redis pub/sub.
 */
export const notificationEvents = new EventEmitter();
notificationEvents.setMaxListeners(0);

export type NotifyEvent = {
  user_id: string;
  unread_count: number;
  notification_id?: string | null;
  /**
   * `update` is a row whose LIVE fields changed without a new row being
   * written — a follow request answered or withdrawn, a follow-back state that
   * moved. The inbox re-reads on it exactly as it does on `new`.
   */
  kind: 'new' | 'read' | 'read_all' | 'update';
  at: string;
};

export function emitNotifyForUsers(
  userIds: string[],
  payload: Omit<NotifyEvent, 'user_id' | 'at'>
) {
  const at = new Date().toISOString();
  for (const uid of userIds) {
    notificationEvents.emit(`notify:${uid}`, { user_id: uid, at, ...payload });
  }
}
