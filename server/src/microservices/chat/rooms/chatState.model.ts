import mongoose, { Schema } from 'mongoose';

/**
 * Per-member state of a chat room, kept apart from the messages so a busy
 * room's lines are never rewritten to say who muted or read them.
 *
 * Every row is keyed by (user, room kind, room id). The room id is a pod's or a
 * club's document id, or a support chat session's id.
 */

/** The rooms a member can mute or read. Support chat has its own read marks. */
export const CHAT_ROOM_KINDS = ['POD', 'CLUB', 'SUPPORT'] as const;
export type ChatRoomKind = (typeof CHAT_ROOM_KINDS)[number];

/**
 * One member's mute of one room. `muted_until` null is "Always"; a row whose
 * time has passed is simply ignored, so nothing has to run when a mute ends.
 */
const ChatMuteSchema = new Schema(
  {
    user_id: { type: String, required: true },
    room_kind: { type: String, enum: CHAT_ROOM_KINDS, required: true },
    room_id: { type: String, required: true },
    muted_until: { type: Date, default: null },
  },
  { timestamps: true }
);

// One mute per member per room — muting again moves the end, never adds a row.
ChatMuteSchema.index({ user_id: 1, room_kind: 1, room_id: 1 }, { unique: true });
// "Who in this room is muted" when a message is sent.
ChatMuteSchema.index({ room_kind: 1, room_id: 1 });

export const ChatMuteModel = mongoose.model('ChatMute', ChatMuteSchema);

/** The newest message time a member has seen in a room: unread is what came after. */
const ChatReadStateSchema = new Schema(
  {
    user_id: { type: String, required: true },
    room_kind: { type: String, enum: CHAT_ROOM_KINDS, required: true },
    room_id: { type: String, required: true },
    last_read_at: { type: Date, required: true },
  },
  { timestamps: true }
);

ChatReadStateSchema.index({ user_id: 1, room_kind: 1, room_id: 1 }, { unique: true });

export const ChatReadStateModel = mongoose.model('ChatReadState', ChatReadStateSchema);

/**
 * One row per message that has been pushed. The unique key is the guarantee a
 * message notifies once: a second attempt (a retry, a replayed job) fails the
 * insert and stops. Rows expire after two days — a message is never pushed
 * that late, so there is nothing left to guard.
 */
const ChatNotifyClaimSchema = new Schema({
  key: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 48 },
});

export const ChatNotifyClaimModel = mongoose.model('ChatNotifyClaim', ChatNotifyClaimSchema);

const DUPLICATE_KEY = 11000;

/**
 * Claims the right to notify about `key`. True for the first caller only; a
 * duplicate returns false. Any other database error is thrown so the caller's
 * own error handling logs it rather than pushing twice.
 */
export async function claimChatNotify(key: string): Promise<boolean> {
  try {
    await ChatNotifyClaimModel.create({ key });
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === DUPLICATE_KEY) return false;
    throw error;
  }
}
