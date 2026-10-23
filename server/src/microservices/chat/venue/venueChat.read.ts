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
