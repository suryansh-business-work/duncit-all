import { ChatReadStateModel } from '../rooms/chatState.model';

/**
 * Venue chats keep their read marks in the shared ChatReadState collection,
 * under their own kind (room id = the pod's id). It is deliberately NOT one of
 * `CHAT_ROOM_KINDS`, so the pod/club chat mutations can never be pointed at it.
 */
export const VENUE_CHAT_READ_KIND = 'VENUE';

/** Moves the member's read mark to now — forward only, so a late request never winds it back. */
export async function markVenueChatRead(userId: string, podId: string, now = Date.now()) {
  await ChatReadStateModel.updateOne(
    { user_id: String(userId), room_kind: VENUE_CHAT_READ_KIND, room_id: podId },
    { $max: { last_read_at: new Date(now) } },
    { upsert: true }
  );
}

/** How far each of these members has read the thread; a member who never opened it is left out. */
export async function venueChatReadMarks(podId: string, userIds: readonly string[]): Promise<Map<string, Date>> {
  if (userIds.length === 0) return new Map();
  const rows = await ChatReadStateModel.find({
    user_id: { $in: userIds.map(String) },
    room_kind: VENUE_CHAT_READ_KIND,
    room_id: podId,
  })
    .select('user_id last_read_at')
    .lean<{ user_id: string; last_read_at: Date }[]>();
  return new Map(rows.map((row) => [String(row.user_id), row.last_read_at]));
}

/** Whether any of these members has read the thread up to `at` — they have seen a line written then. */
export async function seenByAny(podId: string, userIds: readonly string[], at: Date): Promise<boolean> {
  const marks = await venueChatReadMarks(podId, userIds);
  return [...marks.values()].some((readAt) => readAt.getTime() >= at.getTime());
}
